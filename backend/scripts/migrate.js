// Esegue la creazione/allineamento dello schema DB e termina.
// Uso: npm run migrate (richiede DATABASE_URL nel .env o nell'ambiente)
require('dotenv').config();

const { pool, createTables } = require('../config/database');

(async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connessione al database riuscita');
    await createTables();
    console.log('✅ Migrazione completata');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migrazione fallita:', error.message);
    try { await pool.end(); } catch { /* ignore */ }
    process.exit(1);
  }
})();
