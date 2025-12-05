const express = require('express');
const dns = require('dns');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { pool, createTables } = require('./config/database');
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const notificationRoutes = require('./routes/notifications');
const costsRoutes = require('./routes/costs');
const { authenticateToken } = require('./middleware/auth');
const { checkAndSendNotifications, verifyTransporter, isEmailConfigured, getEmailProvider } = require('./services/emailService');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware di sicurezza
app.use(helmet());

// Preferisci IPv4 nelle risoluzioni DNS per evitare timeouts su IPv6
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
    console.log('🌐 DNS result order impostato a ipv4first');
  }
} catch (e) {
  console.log('⚠️ Impossibile impostare DNS result order:', e?.message || e);
}

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Consenti richieste senza origin (es. curl, strumenti server-side)
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV === 'production') {
      // In produzione consenti solo l'origin configurato
      if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }

    // In sviluppo consenti qualsiasi localhost (qualunque porta)
    const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
    if (isLocalhost) {
      return callback(null, true);
    }

    // Consenti anche alcune origini comuni
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.options('/api/*any', cors(corsOptions));
app.options('/health', cors(corsOptions));

// Rate limiting
const isProduction = process.env.NODE_ENV === 'production';

// Limiter principale (produzione)
const mainLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100, // limite di 100 richieste per IP
  message: { error: 'Troppe richieste da questo IP, riprova più tardi.' },
  standardHeaders: true,
  legacyHeaders: false,
});

if (isProduction) {
  // In produzione limitiamo tutte le API
  app.use('/api/', mainLimiter);
} else {
  // In sviluppo: niente rate limit su /api/auth per evitare blocchi di login
  // Applichiamo un limite generoso alle altre route per evitare abusi accidentali
  const devLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 1000, // molto alto per sviluppo
    message: { error: 'Troppe richieste in sviluppo, riprova tra poco.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/vehicles', devLimiter);
  app.use('/api/notifications', devLimiter);
  app.use('/api/costs', devLimiter);
  // Nota: nessun limiter su /api/auth in sviluppo
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/costs', costsRoutes);

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ 
    message: 'This is a protected route',
    user: req.user 
  });
});

// Schedulazione: esegue subito all'avvio e poi ogni giorno alle 08:00 Europe/Rome.
let lastEmailJobDay = null;
const runEmailNotifications = async () => {
  try {
    await checkAndSendNotifications();
    lastEmailJobDay = new Date().toDateString();
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Dati non validi',
      details: err.message 
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      error: 'Non autorizzato' 
    });
  }
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Errore del server' 
      : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route non trovata' 
  });
});

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
        console.log('⏭️  Migrazioni DB saltate all\'avvio (RUN_DB_MIGRATIONS!=true)');
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
      
      // Programma notifiche email se configurate (SMTP o SendGrid)
      if (isEmailConfigured()) {
        const provider = getEmailProvider();
        if (provider === 'smtp') {
          // Verifica SMTP per diagnostica, poi schedula
          verifyTransporter().finally(() => {
            scheduleNotifications();
          });
        } else {
          // Provider API (es. SendGrid): nessuna verifica blocco, schedula direttamente
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
