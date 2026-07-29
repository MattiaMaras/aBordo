const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateToken, authenticateToken, getAuthCookieOptions, AUTH_COOKIE_NAME } = require('../middleware/auth');
const { validate, registerSchema, loginSchema, profileUpdateSchema } = require('../validation/schemas');

const router = express.Router();

// Serializzazione uniforme dell'utente nelle risposte
const toPublicUser = (row) => ({
  id: row.id,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  ...(row.email_notifications !== undefined ? { emailNotifications: row.email_notifications } : {}),
  createdAt: row.created_at,
});

// Registrazione utente
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Controllo se l'email esiste già
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Email già registrata'
      });
    }

    // Hash della password
    const saltRounds = Number(process.env.BCRYPT_COST || 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Inserimento nuovo utente
    const result = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, created_at`,
      [email, hashedPassword, firstName, lastName]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser.id);

    // Cookie HttpOnly (preferito) + token nel body (fallback per browser che
    // bloccano i cookie cross-site finché frontend e backend sono su domini diversi)
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    res.status(201).json({
      message: 'Utente registrato con successo',
      user: toPublicUser(newUser),
      token
    });

  } catch (error) {
    console.error('Errore nella registrazione:', error);
    res.status(500).json({
      error: 'Errore del server durante la registrazione'
    });
  }
});

// Login utente
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Ricerca utente
    const result = await pool.query(
      'SELECT id, email, password, first_name, last_name, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenziali non valide'
      });
    }

    const user = result.rows[0];

    // Verifica password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Credenziali non valide'
      });
    }

    // Genera token
    const token = generateToken(user.id);

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    res.json({
      message: 'Login effettuato con successo',
      user: toPublicUser(user),
      token
    });

  } catch (error) {
    console.error('Errore nel login:', error);
    res.status(500).json({
      error: 'Errore del server durante il login'
    });
  }
});

// Logout: invalida il cookie di sessione
router.post('/logout', (req, res) => {
  const { maxAge, ...clearOptions } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
  res.json({ message: 'Logout effettuato con successo' });
});

// Ottieni profilo utente (protetto)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT id, email, first_name, last_name, email_notifications, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Utente non trovato'
      });
    }

    res.json({ user: toPublicUser(result.rows[0]) });

  } catch (error) {
    console.error('Errore nel recupero del profilo:', error);
    res.status(500).json({
      error: 'Errore del server'
    });
  }
});

// Aggiorna profilo utente (protetto)
router.put('/profile', authenticateToken, validate(profileUpdateSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, emailNotifications } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, email_notifications = COALESCE($3, email_notifications), updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, first_name, last_name, email_notifications, created_at`,
      [firstName, lastName, emailNotifications ?? null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Utente non trovato'
      });
    }

    res.json({
      message: 'Profilo aggiornato con successo',
      user: toPublicUser(result.rows[0])
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento del profilo:', error);
    res.status(500).json({
      error: 'Errore del server'
    });
  }
});

module.exports = router;
