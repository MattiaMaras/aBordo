const express = require('express');
const { pool } = require('../config/database');
const { sendExpiryNotification } = require('../services/emailService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Tutte le route delle notifiche richiedono autenticazione
router.use(authenticateToken);

// Ottieni tutte le notifiche dell'utente
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query; // Filtra per status: safe, warning, critical, expired

    let query = `
      SELECT 
        n.*, 
        v.plate_number, v.brand, v.model,
        (n.expiry_date::date - CURRENT_DATE) AS computed_days,
        CASE 
          WHEN (n.expiry_date::date - CURRENT_DATE) < 0 THEN 'expired'
          WHEN (n.expiry_date::date - CURRENT_DATE) <= 7 THEN 'critical'
          WHEN (n.expiry_date::date - CURRENT_DATE) <= 30 THEN 'warning'
          ELSE 'safe'
        END AS computed_status
      FROM notifications n
      JOIN vehicles v ON n.vehicle_id = v.id
      WHERE v.user_id = $1
    `;
    
    const params = [userId];
    
    if (status && ['safe', 'warning', 'critical', 'expired'].includes(status)) {
      query += ' AND (CASE WHEN (n.expiry_date::date - CURRENT_DATE) < 0 THEN \'' + status + '\' = \'' + status + '\' WHEN (n.expiry_date::date - CURRENT_DATE) <= 7 THEN \'' + status + '\' = \'' + status + '\' WHEN (n.expiry_date::date - CURRENT_DATE) <= 30 THEN \'' + status + '\' = \'' + status + '\' ELSE \'' + status + '\' = \'' + status + '\' END)';
      // Nota: per evitare SQL injection abbiamo già validato status; la condizione è artificiosa per usare computed_status senza una subquery.
    }

    query += ' ORDER BY computed_days ASC, n.created_at DESC';

    const result = await pool.query(query, params);

    let notifications = result.rows.map(notification => ({
      id: notification.id.toString(),
      vehicleId: notification.vehicle_id.toString(),
      type: notification.type,
      status: notification.status === 'safe' ? 'safe' : (notification.computed_status || notification.status),
      daysUntilExpiry: typeof notification.computed_days === 'number' ? notification.computed_days : notification.days_until_expiry,
      message: notification.message,
      expiryDate: notification.expiry_date,
      emailSent: notification.email_sent,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at,
      vehicle: {
        plateNumber: notification.plate_number,
        brand: notification.brand,
        model: notification.model
      }
    }));

    if (status && ['safe', 'warning', 'critical', 'expired'].includes(status)) {
      notifications = notifications.filter(n => n.status === status);
    }

    res.json({ notifications });

  } catch (error) {
    console.error('Errore nel recupero notifiche:', error);
    res.status(500).json({ 
      error: 'Errore del server nel recupero delle notifiche' 
    });
  }
});

// Ottieni notifiche urgenti (warning e critical)
router.get('/urgent', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        n.*, v.plate_number, v.brand, v.model,
        (n.expiry_date::date - CURRENT_DATE) AS computed_days,
        CASE 
          WHEN (n.expiry_date::date - CURRENT_DATE) < 0 THEN 'expired'
          WHEN (n.expiry_date::date - CURRENT_DATE) <= 7 THEN 'critical'
          WHEN (n.expiry_date::date - CURRENT_DATE) <= 30 THEN 'warning'
          ELSE 'safe'
        END AS computed_status
      FROM notifications n
      JOIN vehicles v ON n.vehicle_id = v.id
      WHERE v.user_id = $1 
      ORDER BY computed_days ASC, n.created_at DESC
      LIMIT 100
    `, [userId]);

    const notifications = result.rows.map(notification => ({
      id: notification.id.toString(),
      vehicleId: notification.vehicle_id.toString(),
      type: notification.type,
      status: notification.status === 'safe' ? 'safe' : (notification.computed_status || notification.status),
      daysUntilExpiry: typeof notification.computed_days === 'number' ? notification.computed_days : notification.days_until_expiry,
      message: notification.message,
      expiryDate: notification.expiry_date,
      emailSent: notification.email_sent,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at,
      vehicle: {
        plateNumber: notification.plate_number,
        brand: notification.brand,
        model: notification.model
      }
    }));

    res.json({ notifications });

  } catch (error) {
    console.error('Errore nel recupero notifiche urgenti:', error);
    res.status(500).json({ 
      error: 'Errore del server' 
    });
  }
});

// Ottieni notifiche per un veicolo specifico
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.vehicleId;

    // Verifica che il veicolo appartenga all'utente
    const vehicleCheck = await pool.query(
      'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicleId, userId]
    );

    if (vehicleCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Veicolo non trovato' 
      });
    }

    const result = await pool.query(`
      SELECT 
        n.*, v.plate_number, v.brand, v.model,
        (n.expiry_date::date - CURRENT_DATE) AS computed_days,
        CASE 
          WHEN (n.expiry_date::date - CURRENT_DATE) < 0 THEN 'expired'
          WHEN (n.expiry_date::date - CURRENT_DATE) <= 7 THEN 'critical'
          WHEN (n.expiry_date::date - CURRENT_DATE) <= 30 THEN 'warning'
          ELSE 'safe'
        END AS computed_status
      FROM notifications n
      JOIN vehicles v ON n.vehicle_id = v.id
      WHERE n.vehicle_id = $1 AND v.user_id = $2
      ORDER BY computed_days ASC, n.created_at DESC
    `, [vehicleId, userId]);

    let notifications = result.rows.map(notification => ({
      id: notification.id.toString(),
      vehicleId: notification.vehicle_id.toString(),
      type: notification.type,
      status: notification.status === 'safe' ? 'safe' : (notification.computed_status || notification.status),
      daysUntilExpiry: typeof notification.computed_days === 'number' ? notification.computed_days : notification.days_until_expiry,
      message: notification.message,
      expiryDate: notification.expiry_date,
      emailSent: notification.email_sent,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at,
      vehicle: {
        plateNumber: notification.plate_number,
        brand: notification.brand,
        model: notification.model
      }
    }));

    notifications = notifications.filter(n => n.status === 'warning' || n.status === 'critical');

    res.json({ notifications });

  } catch (error) {
    console.error('Errore nel recupero notifiche veicolo:', error);
    res.status(500).json({ 
      error: 'Errore del server' 
    });
  }
});

// Aggiorna stato notifica (es. segna come letta)
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    const { status, emailSent } = req.body;

    // Verifica che la notifica appartenga all'utente
    const notificationCheck = await pool.query(`
      SELECT n.id 
      FROM notifications n
      JOIN vehicles v ON n.vehicle_id = v.id
      WHERE n.id = $1 AND v.user_id = $2
    `, [notificationId, userId]);

    if (notificationCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Notifica non trovata' 
      });
    }

    // Consenti sempre l'aggiornamento a 'safe': l'utente può segnare la scadenza come effettuata
    // Anche se la data è già passata. Il filtro delle liste gestirà la visibilità.

    // Costruisci query dinamica per aggiornare solo i campi forniti
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (status && ['safe', 'warning', 'critical', 'expired'].includes(status)) {
      updates.push(`status = $${++paramCount}`);
      values.push(status);
    }

    if (typeof emailSent === 'boolean') {
      updates.push(`email_sent = $${++paramCount}`);
      values.push(emailSent);
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        error: 'Nessun campo valido da aggiornare' 
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(notificationId);

    const result = await pool.query(`
      UPDATE notifications 
      SET ${updates.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `, values);

    const updatedNotification = result.rows[0];

    res.json({
      message: 'Notifica aggiornata con successo',
      notification: {
        id: updatedNotification.id.toString(),
        vehicleId: updatedNotification.vehicle_id.toString(),
        type: updatedNotification.type,
        status: updatedNotification.status,
        daysUntilExpiry: updatedNotification.days_until_expiry,
        message: updatedNotification.message,
        expiryDate: updatedNotification.expiry_date,
        emailSent: updatedNotification.email_sent,
        createdAt: updatedNotification.created_at,
        updatedAt: updatedNotification.updated_at
      }
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento notifica:', error);
    res.status(500).json({ 
      error: 'Errore del server' 
    });
  }
});

// Elimina una notifica
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    // Verifica che la notifica appartenga all'utente
    const notificationCheck = await pool.query(`
      SELECT n.id 
      FROM notifications n
      JOIN vehicles v ON n.vehicle_id = v.id
      WHERE n.id = $1 AND v.user_id = $2
    `, [notificationId, userId]);

    if (notificationCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Notifica non trovata' 
      });
    }

    await pool.query('DELETE FROM notifications WHERE id = $1', [notificationId]);

    res.json({
      message: 'Notifica eliminata con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione notifica:', error);
    res.status(500).json({ 
      error: 'Errore del server' 
    });
  }
});

// Ottieni statistiche notifiche per dashboard
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE 
          WHEN (n.expiry_date::date - CURRENT_DATE) < 0 THEN 0
          WHEN (n.expiry_date::date - CURRENT_DATE) <= 7 THEN 0
          WHEN (n.expiry_date::date - CURRENT_DATE) <= 30 THEN 0
          ELSE 1 END) as safe_count,
        COUNT(CASE WHEN (n.expiry_date::date - CURRENT_DATE) <= 30 AND (n.expiry_date::date - CURRENT_DATE) > 7 THEN 1 END) as warning_count,
        COUNT(CASE WHEN (n.expiry_date::date - CURRENT_DATE) <= 7 AND (n.expiry_date::date - CURRENT_DATE) >= 0 THEN 1 END) as critical_count,
        COUNT(CASE WHEN (n.expiry_date::date - CURRENT_DATE) < 0 THEN 1 END) as expired_count,
        COUNT(CASE WHEN (n.expiry_date::date - CURRENT_DATE) <= 7 AND (n.expiry_date::date - CURRENT_DATE) >= 0 AND n.email_sent = false THEN 1 END) as pending_email_count
      FROM notifications n
      JOIN vehicles v ON n.vehicle_id = v.id
      WHERE v.user_id = $1
    `, [userId]);

    const stats = result.rows[0];

    res.json({
      totalNotifications: parseInt(stats.total_notifications),
      safeCount: parseInt(stats.safe_count),
      warningCount: parseInt(stats.warning_count),
      criticalCount: parseInt(stats.critical_count),
      expiredCount: parseInt(stats.expired_count),
      pendingEmailCount: parseInt(stats.pending_email_count)
    });

  } catch (error) {
    console.error('Errore nel recupero statistiche notifiche:', error);
    res.status(500).json({ 
      error: 'Errore del server' 
    });
  }
});

// Invia email per notifiche imminenti dell'utente (trigger manuale)
router.post('/send-emails', async (req, res) => {
  try {
    const userId = req.user.id;

    // Recupera notifiche imminenti non ancora inviate via email per l'utente corrente
    const result = await pool.query(`
      SELECT 
        n.id AS notification_id,
        n.type AS notification_type,
        n.status AS notification_status,
        n.days_until_expiry AS notification_days_until_expiry,
        n.message AS notification_message,
        n.expiry_date AS notification_expiry_date,
        n.email_sent AS notification_email_sent,
        n.email_stage AS notification_email_stage,
        v.id AS vehicle_id,
        v.plate_number, v.brand, v.model, v.year,
        u.id AS user_id,
        u.email, u.first_name, u.last_name, u.email_notifications
      FROM notifications n
      JOIN vehicles v ON n.vehicle_id = v.id
      JOIN users u ON v.user_id = u.id
      WHERE v.user_id = $1
        AND u.email_notifications = true
        AND (
          (n.expiry_date::date - CURRENT_DATE) <= 30
        )
        AND NOT (
          n.status = 'safe' AND n.updated_at > n.created_at
        )
      ORDER BY (n.expiry_date::date - CURRENT_DATE) ASC
    `, [userId]);

    let sentCount = 0;
    const errors = [];

    for (const row of result.rows) {
      try {
        const user = {
          id: row.user_id,
          email: row.email,
          first_name: row.first_name,
          last_name: row.last_name
        };
        const vehicle = {
          id: row.vehicle_id,
          plate_number: row.plate_number,
          brand: row.brand,
          model: row.model,
          year: row.year
        };
        const notification = {
          id: row.notification_id,
          type: row.notification_type,
          status: row.notification_status,
          days_until_expiry: row.notification_days_until_expiry,
          message: row.notification_message,
          expiry_date: row.notification_expiry_date,
          email_sent: row.notification_email_sent
        };

        // Calcola giorni e stadio corrente
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(notification.expiry_date);
        expiry.setHours(0, 0, 0, 0);
        const deltaDays = Math.round((expiry.getTime() - today.getTime()) / 86400000);
        const stage = (deltaDays <= 0) ? 'final' : (deltaDays <= 7) ? 'critical' : (deltaDays <= 30) ? 'warning' : null;

        if (!stage) continue;
        if (row.notification_email_stage === stage) continue;

        await sendExpiryNotification(user, vehicle, notification, stage);
        sentCount++;
      } catch (err) {
        errors.push({ notificationId: row.notification_id, message: err?.message || String(err) });
      }
    }

    res.json({
      message: 'Invio email notifiche completato',
      processed: result.rows.length,
      sent: sentCount,
      errors
    });
  } catch (error) {
    console.error('Errore nell\'invio email notifiche:', error);
    res.status(500).json({ error: 'Errore del server nell\'invio email' });
  }
});

module.exports = router;
