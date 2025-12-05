const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (String(process.env.DB_MOCK || 'false') === 'true') {
  console.log('🔧 Modalità DB mock attiva: le query non saranno persistenti');
  pool = {
    query: async (text, params) => {
      console.log('📝 Query eseguita (mock):', text, params);
      return { rows: [], rowCount: 0 };
    },
    end: async () => {
      console.log('📊 Database pool chiuso (mock)');
    }
  };
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT || 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT || 5000),
    keepAlive: true,
  });
}

const createTables = async () => {
  try {
    // Tabella utenti
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email_notifications BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabella veicoli
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plate_number VARCHAR(20) NOT NULL,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        current_mileage INTEGER NOT NULL,
        fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('gasoline', 'diesel', 'hybrid', 'electric', 'lpg', 'methane')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, plate_number)
      )
    `);

    // Tabella assicurazioni
    await pool.query(`
      CREATE TABLE IF NOT EXISTS insurances (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        company VARCHAR(100) NOT NULL,
        policy_number VARCHAR(100) NOT NULL,
        expiry_date DATE NOT NULL,
        annual_premium DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabella bollo auto
    await pool.query(`
      CREATE TABLE IF NOT EXISTS car_taxes (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        expiry_date DATE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        region VARCHAR(100) NOT NULL,
        is_paid BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabella revisioni
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inspections (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        last_inspection_date DATE NOT NULL,
        next_inspection_date DATE NOT NULL,
        inspection_center VARCHAR(200),
        cost DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabella tagliandi
    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        last_service_mileage INTEGER NOT NULL,
        last_service_date DATE NOT NULL,
        service_interval INTEGER NOT NULL, -- km
        next_service_mileage INTEGER NOT NULL,
        service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('regular', 'major')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabella manutenzioni
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenances (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('oil_change', 'filters', 'belts', 'brakes', 'tires', 'adblue')),
        title VARCHAR(255),
        last_maintenance DATE NOT NULL,
        last_mileage INTEGER,
        next_maintenance DATE,
        next_mileage INTEGER,
        cost DECIMAL(10,2),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Allinea schema se già esistente: consenti NULL su next_maintenance
    try {
      await pool.query(`ALTER TABLE maintenances ALTER COLUMN next_maintenance DROP NOT NULL`);
    } catch (e) {
      // Ignora se già nullable o se l'ALTER non è necessario
    }

    // Aggiungi colonna next_mileage se non esiste
    try {
      await pool.query(`ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS next_mileage INTEGER`);
    } catch (e) {
      // Ignora errori non critici
    }

    // Aggiungi colonna title se non esiste
    try {
      await pool.query(`ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS title VARCHAR(255)`);
    } catch (e) {
      // Ignora errori non critici
    }

    // Aggiungi colonna last_mileage se non esiste
    try {
      await pool.query(`ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS last_mileage INTEGER`);
    } catch (e) {
      // Ignora errori non critici
    }

    // Tabella notifiche
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('insurance', 'tax', 'inspection', 'service', 'maintenance')),
        source_type VARCHAR(50),
        source_id INTEGER,
        status VARCHAR(20) NOT NULL CHECK (status IN ('safe', 'warning', 'critical', 'expired')),
        days_until_expiry INTEGER NOT NULL,
        message TEXT NOT NULL,
        expiry_date DATE NOT NULL,
        email_sent BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Allinea schema notifiche: aggiungi colonne di sorgente se mancanti
    try {
      await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_type VARCHAR(50)`);
    } catch (e) {
      // Ignora errori non critici
    }
    try {
      await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_id INTEGER`);
    } catch (e) {
      // Ignora errori non critici
    }

    // Aggiungi colonna per lo stadio di invio email (warning/critical/final)
    try {
      await pool.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS email_stage VARCHAR(20)`);
    } catch (e) {
      // Ignora errori non critici
    }

    // Tabella email inviate (per tracciare le notifiche email)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
        email_type VARCHAR(50) NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL,
        error_message TEXT
      )
    `);

    // Aggiungi colonna per tracciare lo stadio dell'email inviata
    try {
      await pool.query(`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS email_stage VARCHAR(20)`);
    } catch (e) {
      // Ignora errori non critici
    }

    // Creazione indici per performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_vehicle_id ON notifications(vehicle_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_expiry_date ON notifications(expiry_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_source ON notifications(vehicle_id, type, source_type, source_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

    console.log('✅ Database schema creato con successo!');
  } catch (error) {
    console.error('❌ Errore nella creazione del database schema:', error);
    throw error;
  }
};

module.exports = {
  pool,
  createTables
};
