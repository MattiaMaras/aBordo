const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const notificationRoutes = require('./routes/notifications');
const costsRoutes = require('./routes/costs');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Dietro reverse proxy (Render/Vercel) serve trust proxy per avere il vero IP
// nel rate limiting; senza, tutti i client condividono l'IP del proxy.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware di sicurezza
app.use(helmet());

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

// Limiter severo per le route di autenticazione: mitiga brute force su login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 20,
  message: { error: 'Troppi tentativi di accesso, riprova più tardi.' },
  standardHeaders: true,
  legacyHeaders: false,
});

if (isProduction) {
  // In produzione limitiamo tutte le API
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
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

// Body parsing: l'API accetta solo piccoli payload JSON, 10mb esponeva a DoS
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

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

module.exports = app;
