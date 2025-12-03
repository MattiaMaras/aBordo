const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Tutte le route dei costi richiedono autenticazione
router.use(authenticateToken);

// Riepilogo costi per periodo (start/end inclusivi) aggregati per categoria
// Query params: start=YYYY-MM-DD, end=YYYY-MM-DD
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Parametri start e end sono obbligatori' });
    }

    // Somme per categoria su tutti i veicoli dell'utente
    const maintenanceRes = await pool.query(`
      SELECT COALESCE(SUM(m.cost), 0) AS total
      FROM maintenances m
      JOIN vehicles v ON m.vehicle_id = v.id
      WHERE v.user_id = $1 AND m.last_maintenance BETWEEN $2 AND $3
    `, [userId, start, end]);

    const inspectionRes = await pool.query(`
      SELECT COALESCE(SUM(i.cost), 0) AS total
      FROM inspections i
      JOIN vehicles v ON i.vehicle_id = v.id
      WHERE v.user_id = $1 AND i.last_inspection_date BETWEEN $2 AND $3
    `, [userId, start, end]);

    const taxRes = await pool.query(`
      SELECT COALESCE(SUM(c.amount), 0) AS total
      FROM car_taxes c
      JOIN vehicles v ON c.vehicle_id = v.id
      WHERE v.user_id = $1 AND c.expiry_date BETWEEN $2 AND $3
    `, [userId, start, end]);

    const insuranceRes = await pool.query(`
      SELECT COALESCE(SUM(ins.annual_premium), 0) AS total
      FROM insurances ins
      JOIN vehicles v ON ins.vehicle_id = v.id
      WHERE v.user_id = $1 AND ins.expiry_date BETWEEN $2 AND $3
    `, [userId, start, end]);

    const totals = {
      maintenance: parseFloat(maintenanceRes.rows[0].total || 0),
      inspections: parseFloat(inspectionRes.rows[0].total || 0),
      taxes: parseFloat(taxRes.rows[0].total || 0),
      insurances: parseFloat(insuranceRes.rows[0].total || 0),
    };

    res.json({
      period: { start, end },
      totals,
      total: totals.maintenance + totals.inspections + totals.taxes + totals.insurances,
    });
  } catch (error) {
    console.error('Errore nel riepilogo costi:', error);
    res.status(500).json({ error: 'Errore del server nel riepilogo costi' });
  }
});

// Esportazione CSV di tutti i costi nel periodo
router.get('/export', async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Parametri start e end sono obbligatori' });
    }

    // Recupera plate/brand/model per join uniforme
    const rows = [];

    // Manutenzioni
    const maint = await pool.query(`
      SELECT v.plate_number, v.brand, v.model, m.last_maintenance AS date, m.description, m.cost
      FROM maintenances m
      JOIN vehicles v ON m.vehicle_id = v.id
      WHERE v.user_id = $1 AND m.last_maintenance BETWEEN $2 AND $3
      ORDER BY date ASC
    `, [userId, start, end]);
    maint.rows.forEach(r => rows.push({ category: 'Maintenance', ...r }));

    // Revisioni
    const insp = await pool.query(`
      SELECT v.plate_number, v.brand, v.model, i.last_inspection_date AS date, i.inspection_center AS description, i.cost
      FROM inspections i
      JOIN vehicles v ON i.vehicle_id = v.id
      WHERE v.user_id = $1 AND i.last_inspection_date BETWEEN $2 AND $3
      ORDER BY date ASC
    `, [userId, start, end]);
    insp.rows.forEach(r => rows.push({ category: 'Inspection', ...r }));

    // Bolli
    const taxes = await pool.query(`
      SELECT v.plate_number, v.brand, v.model, c.expiry_date AS date, c.region AS description, c.amount AS cost
      FROM car_taxes c
      JOIN vehicles v ON c.vehicle_id = v.id
      WHERE v.user_id = $1 AND c.expiry_date BETWEEN $2 AND $3
      ORDER BY date ASC
    `, [userId, start, end]);
    taxes.rows.forEach(r => rows.push({ category: 'CarTax', ...r }));

    // Assicurazioni (premio annuo)
    const ins = await pool.query(`
      SELECT v.plate_number, v.brand, v.model, i.expiry_date AS date, i.company AS description, i.annual_premium AS cost
      FROM insurances i
      JOIN vehicles v ON i.vehicle_id = v.id
      WHERE v.user_id = $1 AND i.expiry_date BETWEEN $2 AND $3
      ORDER BY date ASC
    `, [userId, start, end]);
    ins.rows.forEach(r => rows.push({ category: 'Insurance', ...r }));

    // Costruisci CSV
    const header = ['Category', 'PlateNumber', 'Brand', 'Model', 'Date', 'Description', 'Amount'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const line = [
        r.category,
        r.plate_number,
        r.brand,
        r.model,
        r.date?.toISOString().split('T')[0] || '',
        (r.description || '').toString().replace(/\n|\r|,/g, ' '),
        parseFloat(r.cost || 0).toFixed(2)
      ].join(',');
      lines.push(line);
    }

    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="costs_${start}_to_${end}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Errore nell\'export CSV costi:', error);
    res.status(500).json({ error: 'Errore del server nell\'export CSV' });
  }
});

module.exports = router;