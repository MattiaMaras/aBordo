const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET non impostato nelle variabili d\'ambiente');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Middleware per autenticare il token JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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
    console.error('Errore nella verifica del token:', error);
    return res.status(403).json({ error: 'Token non valido' });
  }
};

// Genera un token JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

module.exports = {
  authenticateToken,
  generateToken,
  JWT_SECRET
};