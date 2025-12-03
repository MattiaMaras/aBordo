const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Registrazione utente
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validazione input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Tutti i campi sono obbligatori' 
      });
    }

    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Email non valida' 
      });
    }

    // Validazione password (minimo 8 caratteri)
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'La password deve contenere almeno 8 caratteri' 
      });
    }

    // Controllo se l'email esiste già
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Email già registrata' 
      });
    }

    // Hash della password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Inserimento nuovo utente
    const result = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, first_name, last_name, created_at`,
      [email.toLowerCase(), hashedPassword, firstName, lastName]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser.id);

    res.status(201).json({
      message: 'Utente registrato con successo',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        createdAt: newUser.created_at
      },
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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validazione input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email e password sono obbligatorie' 
      });
    }

    // Ricerca utente
    const result = await pool.query(
      'SELECT id, email, password, first_name, last_name, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
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

    res.json({
      message: 'Login effettuato con successo',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Errore nel login:', error);
    res.status(500).json({ 
      error: 'Errore del server durante il login' 
    });
  }
});

// Ottieni profilo utente (protetto)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Questa route richiede il middleware di autenticazione
    // Verrà aggiunto nel server principale
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

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        emailNotifications: user.email_notifications,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('Errore nel recupero del profilo:', error);
    res.status(500).json({ 
      error: 'Errore del server' 
    });
  }
});

// Aggiorna profilo utente (protetto)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, emailNotifications } = req.body;

    // Validazione input
    if (!firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Nome e cognome sono obbligatori' 
      });
    }

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, email_notifications = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, first_name, last_name, email_notifications, created_at`,
      [firstName, lastName, emailNotifications, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Utente non trovato' 
      });
    }

    const updatedUser = result.rows[0];

    res.json({
      message: 'Profilo aggiornato con successo',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        emailNotifications: updatedUser.email_notifications,
        createdAt: updatedUser.created_at
      }
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento del profilo:', error);
    res.status(500).json({ 
      error: 'Errore del server' 
    });
  }
});

module.exports = router;