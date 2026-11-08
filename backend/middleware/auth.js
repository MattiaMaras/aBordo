const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { verifyToken: verifyClerkToken, createClerkClient } = require('@clerk/backend');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET non impostato nelle variabili d\'ambiente');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const AUTH_COOKIE_NAME = 'abordo_token';


// ===== Clerk (doppia autenticazione) =====
// Attivo solo se CLERK_SECRET_KEY è impostata: altrimenti il comportamento è identico a prima.
const isClerkEnabled = () => Boolean(process.env.CLERK_SECRET_KEY);
let clerkClient = null;
const getClerk = () => (clerkClient ??= createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }));

// Un token Clerk ha `iss` di Clerk; il nostro JWT interno ha `userId`.
const looksLikeClerkToken = (token) => {
  const payload = jwt.decode(token);
  return Boolean(payload && typeof payload.iss === 'string' && payload.iss.includes('clerk'));
};

// Trova (o collega/crea) la riga `users` per un utente Clerk. users.id non cambia mai.
const resolveClerkUser = async (clerkId) => {
  const byClerk = await pool.query('SELECT id, email, first_name, last_name FROM users WHERE clerk_id = $1', [clerkId]);
  if (byClerk.rows[0]) return byClerk.rows[0];

  const cu = await getClerk().users.getUser(clerkId);
  const primary = cu.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId) || cu.emailAddresses[0];
  if (!primary) return null;
  const email = primary.emailAddress.toLowerCase();

  // Collega un utente esistente SOLO se l'email è verificata (evita il furto di account)
  if (primary.verification?.status === 'verified') {
    const linked = await pool.query(
      'UPDATE users SET clerk_id = $1 WHERE LOWER(email) = $2 AND clerk_id IS NULL RETURNING id, email, first_name, last_name',
      [clerkId, email]
    );
    if (linked.rows[0]) return linked.rows[0];
  }

  // Nuovo utente nato in Clerk: password non utilizzabile (il login passa solo da Clerk)
  const created = await pool.query(
    `INSERT INTO users (email, password, first_name, last_name, clerk_id)
     VALUES ($1, '!clerk-managed', $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, first_name, last_name`,
    [email, cu.firstName || 'Utente', cu.lastName || '-', clerkId]
  );
  return created.rows[0] || null;
};

// Opzioni cookie di sessione:
// - HttpOnly: non leggibile da JavaScript (mitiga furto token via XSS)
// - In produzione frontend e backend sono su domini diversi (vercel.app / onrender.com),
//   quindi serve SameSite=None + Secure; in sviluppo (stesso site localhost) basta Lax.
const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // allineato a JWT_EXPIRES_IN di default
    path: '/',
  };
};

// Middleware per autenticare il token JWT.
// Preferisce il cookie HttpOnly; mantiene il fallback Bearer perché su domini
// separati alcuni browser (Safari) bloccano i cookie third-party.
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const token = req.cookies?.[AUTH_COOKIE_NAME] || bearerToken;

  if (!token) {
    return res.status(401).json({ error: 'Accesso negato: token mancante' });
  }

  try {
    if (isClerkEnabled() && looksLikeClerkToken(token)) {
      const claims = await verifyClerkToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      const user = await resolveClerkUser(claims.sub);
      if (!user) return res.status(401).json({ error: 'Utente non trovato' });
      req.user = user;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Verifica che l'utente esista ancora nel database
    const result = await pool.query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }
};

// Genera un token JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

module.exports = {
  authenticateToken,
  generateToken,
  getAuthCookieOptions,
  AUTH_COOKIE_NAME,
  JWT_SECRET,
  isClerkEnabled
};
