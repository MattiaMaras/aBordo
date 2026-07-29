const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET non impostato nelle variabili d\'ambiente');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const AUTH_COOKIE_NAME = 'abordo_token';

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
  JWT_SECRET
};
