const dns = require('dns');
require('dotenv').config();

const app = require('./app');
const { pool, createTables } = require('./config/database');
const { checkAndSendNotifications, verifyTransporter, isEmailConfigured, getEmailProvider } = require('./services/emailService');
const cron = require('node-cron');

const PORT = process.env.PORT || 3001;

// Preferisci IPv4 nelle risoluzioni DNS per evitare timeouts su IPv6
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
    console.log('🌐 DNS result order impostato a ipv4first');
  }
} catch (e) {
  console.log('⚠️ Impossibile impostare DNS result order:', e?.message || e);
}

// Schedulazione: esegue subito all'avvio e poi ogni giorno alle 08:00 Europe/Rome.
const runEmailNotifications = async () => {
  try {
    await checkAndSendNotifications();
  } catch (err) {
    console.error('❌ Errore job email notifiche:', err);
  }
};

const scheduleNotifications = () => {
  // Esecuzione immediata all'avvio
  runEmailNotifications();
  // Cron giornaliero alle 08:00 ora italiana
  cron.schedule('0 8 * * *', async () => {
    await runEmailNotifications();
  }, { timezone: 'Europe/Rome' });
  console.log('📅 Job email schedulato: 08:00 Europe/Rome (cron)');
};

// Avvio del server
const startServer = async () => {
  try {
    // Test connessione database (solo se PostgreSQL è disponibile)
    try {
      await pool.query('SELECT NOW()');
      console.log('✅ Database connesso con successo');

      // Crea tabelle se non esistono
      if (String(process.env.RUN_DB_MIGRATIONS || 'false') === 'true') {
        await createTables();
      } else {
        console.log('⏭️  Migrazioni DB saltate all\'avvio (RUN_DB_MIGRATIONS!=true, usa "npm run migrate")');
      }
    } catch (dbError) {
      console.log('⚠️  Database non disponibile, uso modalità test');
      console.log('📝 Le API funzioneranno ma i dati non saranno persistenti');
    }

    // Avvia server
    app.listen(PORT, () => {
      console.log(`🚀 Server avviato su porta ${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

      // Programma notifiche email se configurate (SMTP o SendGrid/Brevo)
      if (isEmailConfigured()) {
        const provider = getEmailProvider();
        if (provider === 'smtp') {
          // Verifica SMTP per diagnostica, poi schedula
          verifyTransporter().finally(() => {
            scheduleNotifications();
          });
        } else {
          // Provider API (es. SendGrid): nessuna verifica bloccante, schedula direttamente
          verifyTransporter();
          scheduleNotifications();
        }
      } else {
        console.log('📧 Notifiche email non configurate');
      }
    });

  } catch (error) {
    console.error('❌ Errore durante l\'avvio del server:', error);
    process.exit(1);
  }
};

// Gestione chiusura graceful
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM ricevuto, chiusura graceful...');
  pool.end(() => {
    console.log('📊 Database pool chiuso');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT ricevuto, chiusura graceful...');
  pool.end(() => {
    console.log('📊 Database pool chiuso');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = app;
