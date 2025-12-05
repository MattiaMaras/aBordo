const nodemailer = require('nodemailer');
const dns = require('dns');
const { promises: dnsPromises } = dns;
let sgMail = null;
try {
  // Carica sendgrid solo se disponibile; verrà utilizzato quando EMAIL_PROVIDER=sendgrid
  sgMail = require('@sendgrid/mail');
} catch (_) {
  // opzionale: non bloccare se non installato
}

// Brevo via API HTTP
let fetchFn = null;
try {
  fetchFn = require('node-fetch');
} catch (_) {
  // opzionale, Node >=18 ha fetch globale
}
const { pool } = require('../config/database');

const getEmailProvider = () => String(process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
const isEmailConfigured = () => {
  const provider = getEmailProvider();
  if (provider === 'sendgrid') {
    return Boolean(process.env.SENDGRID_API_KEY);
  }
  if (provider === 'brevo') {
    return Boolean(process.env.BREVO_API_KEY);
  }
  // default smtp
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: String(process.env.EMAIL_SECURE || 'false') === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Timeout espliciti per diagnosticare problemi di rete più rapidamente
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });
};

// Template email per notifiche scadenze
const createExpiryNotificationEmail = (user, vehicle, notification) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(notification.expiry_date);
  expiry.setHours(0, 0, 0, 0);
  const deltaDays = Math.round((expiry.getTime() - today.getTime()) / 86400000);
  const subject = deltaDays < 0
    ? `⏰ Scadenza scaduta: ${notification.message}`
    : `⚠️ Scadenza imminente: ${notification.message}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚗 A Bordo - Notifica Scadenza</h1>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
        <h2 style="color: #dc2626; margin-bottom: 20px;">⚠️ Scadenza Imminente</h2>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Ciao <strong>${user.first_name},</strong></p>
        
        <p style="margin-bottom: 20px;">ti informiamo che sta per avvicinarsi un'importante scadenza per il tuo veicolo:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #1f2937;">📋 Dettagli Veicolo</h3>
          <p style="margin: 5px 0;"><strong>Targa:</strong> ${vehicle.plate_number}</p>
          <p style="margin: 5px 0;"><strong>Marca/Modello:</strong> ${vehicle.brand} ${vehicle.model}</p>
          <p style="margin: 5px 0;"><strong>Anno:</strong> ${vehicle.year}</p>
        </div>
        
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #dc2626;">📅 Dettagli Scadenza</h3>
          <p style="margin: 5px 0;"><strong>Tipo:</strong> ${getNotificationTypeLabel(notification.type)}</p>
          <p style="margin: 5px 0;"><strong>Descrizione:</strong> ${notification.message}</p>
          <p style="margin: 5px 0;"><strong>Data di scadenza:</strong> ${formatDate(notification.expiry_date)}</p>
          ${deltaDays >= 0
            ? `<p style="margin: 5px 0;"><strong>Giorni rimanenti:</strong> ${deltaDays}</p>`
            : `<p style="margin: 5px 0; color: #b91c1c;"><strong>Scaduto da:</strong> ${Math.abs(deltaDays)} giorni</p>`}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Vai alla Dashboard
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Ricevi questa email perché hai attivato le notifiche per le scadenze dei tuoi veicoli su A Bordo.
          <br>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings" style="color: #3b82f6;">Gestisci le tue preferenze</a>
        </p>
      </div>
    </body>
    </html>
  `;

  return {
    from: `"A Bordo" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject,
    html
  };
};

// Funzioni di utilità
const getNotificationTypeLabel = (type) => {
  const labels = {
    'insurance': 'Assicurazione',
    'tax': 'Bollo Auto',
    'inspection': 'Revisione',
    'service': 'Tagliando',
    'maintenance': 'Manutenzione'
  };
  return labels[type] || type;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Determina lo stadio di invio in base ai giorni
const computeStageFromDays = (deltaDays) => {
  if (deltaDays <= 0) return 'final';
  if (deltaDays <= 7) return 'critical';
  if (deltaDays <= 30) return 'warning';
  return null;
};

// Invia email di notifica con stadio
const sendExpiryNotification = async (user, vehicle, notification, stage) => {
  try {
    const provider = getEmailProvider();
    const mailOptions = createExpiryNotificationEmail(user, vehicle, notification);
    let result;

    if (provider === 'sendgrid') {
      if (!sgMail) throw new Error('SendGrid non installato. Aggiungi @sendgrid/mail alle dipendenze.');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const msg = {
        to: mailOptions.to,
        from: mailOptions.from || process.env.SENDGRID_FROM || process.env.EMAIL_USER,
        subject: mailOptions.subject,
        html: mailOptions.html,
      };
      const [resp] = await sgMail.send(msg);
      result = { messageId: resp.headers['x-message-id'] || 'sendgrid' };
    } else if (provider === 'brevo') {
      const apiKey = process.env.BREVO_API_KEY;
      const sender = process.env.BREVO_SENDER || process.env.EMAIL_USER;
      if (!apiKey) throw new Error('BREVO_API_KEY mancante.');
      const payload = {
        sender: { email: sender },
        to: [{ email: mailOptions.to }],
        subject: mailOptions.subject,
        htmlContent: mailOptions.html,
      };
      const doFetch = global.fetch || fetchFn;
      if (!doFetch) throw new Error('fetch non disponibile. Installa node-fetch o usa Node >=18.');
      const resp = await doFetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Brevo API error: ${resp.status} ${text}`);
      }
      const data = await resp.json();
      result = { messageId: data.messageId || 'brevo' };
    } else {
      const transporter = createTransporter();
      result = await transporter.sendMail(mailOptions);
    }
    
    // Log dell'email inviata
    await pool.query(
      `INSERT INTO email_logs (user_id, notification_id, email_type, recipient_email, status, email_stage) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, notification.id, 'expiry_notification', user.email, 'sent', stage]
    );
    
    // Aggiorna la notifica come email inviata per questo stadio
    await pool.query(
      'UPDATE notifications SET email_sent = true, email_stage = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [notification.id, stage]
    );
    
    console.log(`✅ Email inviata a ${user.email} per notifica ${notification.id}`);
    return result;
  } catch (error) {
    console.error(`❌ Errore nell'invio email a ${user.email}:`, error);
    
    // Log dell'errore
    await pool.query(
      `INSERT INTO email_logs (user_id, notification_id, email_type, recipient_email, status, error_message, email_stage) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, notification.id, 'expiry_notification', user.email, 'failed', error.message, stage]
    );
    
    throw error;
  }
};

// Controlla e invia notifiche per scadenze imminenti
const checkAndSendNotifications = async () => {
  try {
    // Trova tutte le notifiche non ancora inviate per email che stanno per scadere
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
      WHERE u.email_notifications = true
        AND (
          (n.expiry_date::date - CURRENT_DATE) <= 30
        )
        AND NOT (
          n.status = 'safe' AND n.updated_at > n.created_at
        )
      ORDER BY (n.expiry_date::date - CURRENT_DATE) ASC
    `);
    
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
        const stage = computeStageFromDays(deltaDays);

        // Se fuori soglia o stadio già inviato, salta
        if (!stage) continue;
        if (row.notification_email_stage === stage) continue;

        await sendExpiryNotification(user, vehicle, notification, stage);
      } catch (error) {
        console.error(`Errore nell'invio notifica per veicolo ${row.vehicle_id}:`, error);
      }
    }
    
    console.log(`✅ Processate ${result.rows.length} notifiche email`);
  } catch (error) {
    console.error('❌ Errore nel controllo notifiche:', error);
  }
};

module.exports = {
  sendExpiryNotification,
  checkAndSendNotifications,
  createTransporter,
  getEmailProvider,
  isEmailConfigured,
  // Verifica la configurazione SMTP all'avvio per diagnosticare errori (DNS/credenziali/porta)
  verifyTransporter: async () => {
    try {
      const provider = getEmailProvider();
      if (provider === 'sendgrid') {
        if (!sgMail) {
          throw new Error('SendGrid non installato. Aggiungi @sendgrid/mail alle dipendenze.');
        }
        const apiKeyPresent = Boolean(process.env.SENDGRID_API_KEY);
        console.log(`🔧 Email provider=sendgrid apiKeyPresent=${apiKeyPresent} from=${process.env.SENDGRID_FROM || process.env.EMAIL_USER}`);
        if (!apiKeyPresent) throw new Error('SENDGRID_API_KEY mancante');
        console.log('📧 SendGrid pronto (verifica base completata)');
        return;
      } else if (provider === 'brevo') {
        const apiKeyPresent = Boolean(process.env.BREVO_API_KEY);
        console.log(`🔧 Email provider=brevo apiKeyPresent=${apiKeyPresent} from=${process.env.BREVO_SENDER || process.env.EMAIL_USER}`);
        if (!apiKeyPresent) throw new Error('BREVO_API_KEY mancante');
        console.log('📧 Brevo pronto (verifica base completata)');
        return;
      }

      const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
      const port = Number(process.env.EMAIL_PORT || 587);
      const secure = String(process.env.EMAIL_SECURE || 'false') === 'true';

      // Log di configurazione
      console.log(`🔧 SMTP config → host=${host} port=${port} secure=${secure} user=${process.env.EMAIL_USER}`);
      try {
        if (typeof dns.setDefaultResultOrder === 'function') {
          // Mostra l'ordine di risoluzione attuale
          console.log('🌐 DNS result order attivo: ipv4first');
        }
        // Risolvi tutti gli indirizzi (IPv4/IPv6)
        const addrs = await dnsPromises.lookup(host, { all: true });
        console.log(`🧭 DNS lookup ${host} →`, addrs.map(a => `${a.address} (${a.family === 6 ? 'IPv6' : 'IPv4'})`).join(', '));
      } catch (e) {
        console.log('⚠️  Impossibile eseguire DNS lookup:', e?.message || e);
      }

      const transporter = createTransporter();
      await transporter.verify();
      console.log('📧 SMTP transporter verificato: connessione pronta');
    } catch (err) {
      console.error('❌ Verifica SMTP fallita:', err?.message || err);
    }
  }
};
