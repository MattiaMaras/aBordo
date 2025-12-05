const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Tutte le route dei veicoli richiedono autenticazione
router.use(authenticateToken);

// Ottieni tutti i veicoli dell'utente
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT v.*, 
        COUNT(n.id) as notification_count,
        COUNT(CASE WHEN n.status IN ('warning', 'critical') THEN 1 END) as urgent_notifications
       FROM vehicles v
       LEFT JOIN notifications n ON v.id = n.vehicle_id
       WHERE v.user_id = $1
       GROUP BY v.id
       ORDER BY v.created_at DESC`,
      [userId]
    );

    const vehicles = result.rows.map(vehicle => ({
      id: vehicle.id.toString(),
      plateNumber: vehicle.plate_number,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      currentMileage: vehicle.current_mileage,
      fuelType: vehicle.fuel_type,
      createdAt: vehicle.created_at,
      updatedAt: vehicle.updated_at,
      notificationCount: parseInt(vehicle.notification_count),
      urgentNotifications: parseInt(vehicle.urgent_notifications)
    }));

    res.json({ vehicles });

  } catch (error) {
    console.error('Errore nel recupero veicoli:', error);
    res.status(500).json({ 
      error: 'Errore del server nel recupero dei veicoli' 
    });
  }
});

// Ottieni un veicolo specifico con tutti i dettagli
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;

    // Verifica che il veicolo appartenga all'utente
    const vehicleResult = await pool.query(
      'SELECT * FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicleId, userId]
    );

    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Veicolo non trovato' 
      });
    }

    const vehicle = vehicleResult.rows[0];

    // Recupera tutti i dati correlati
    const [insurances, taxes, inspections, services, maintenances] = await Promise.all([
      pool.query('SELECT * FROM insurances WHERE vehicle_id = $1 ORDER BY created_at DESC', [vehicleId]),
      pool.query('SELECT * FROM car_taxes WHERE vehicle_id = $1 ORDER BY created_at DESC', [vehicleId]),
      pool.query('SELECT * FROM inspections WHERE vehicle_id = $1 ORDER BY created_at DESC', [vehicleId]),
      pool.query('SELECT * FROM services WHERE vehicle_id = $1 ORDER BY created_at DESC', [vehicleId]),
      pool.query('SELECT * FROM maintenances WHERE vehicle_id = $1 ORDER BY created_at DESC', [vehicleId])
    ]);

    const response = {
      vehicle: {
        id: vehicle.id.toString(),
        plateNumber: vehicle.plate_number,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        currentMileage: vehicle.current_mileage,
        fuelType: vehicle.fuel_type,
        createdAt: vehicle.created_at,
        updatedAt: vehicle.updated_at
      },
      insurances: insurances.rows,
      taxes: taxes.rows,
      inspections: inspections.rows,
      services: services.rows,
      maintenances: maintenances.rows
    };

    res.json(response);

  } catch (error) {
    console.error('Errore nel recupero dettagli veicolo:', error);
    res.status(500).json({ 
      error: 'Errore del server' 
    });
  }
});

// Aggiungi un nuovo veicolo
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { plateNumber, brand, model, year, currentMileage, fuelType } = req.body;

    // Validazione input
    if (!plateNumber || !brand || !model || year === undefined || year === null || currentMileage === undefined || currentMileage === null || !fuelType) {
      return res.status(400).json({ 
        error: 'Tutti i campi sono obbligatori' 
      });
    }

    // Validazione campi
    if (year < 1900 || year > new Date().getFullYear() + 1) {
      return res.status(400).json({ 
        error: 'Anno non valido' 
      });
    }

    if (currentMileage < 0) {
      return res.status(400).json({ 
        error: 'Il chilometraggio non può essere negativo' 
      });
    }

    const validFuelTypes = ['gasoline', 'diesel', 'hybrid', 'electric', 'lpg', 'methane'];
    if (!validFuelTypes.includes(fuelType)) {
      return res.status(400).json({ 
        error: 'Tipo di carburante non valido' 
      });
    }

    // Inserimento nuovo veicolo
    const result = await pool.query(
      `INSERT INTO vehicles (user_id, plate_number, brand, model, year, current_mileage, fuel_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, plateNumber.toUpperCase(), brand, model, year, currentMileage, fuelType]
    );

    const newVehicle = result.rows[0];

    res.status(201).json({
      message: 'Veicolo aggiunto con successo',
      vehicle: {
        id: newVehicle.id.toString(),
        plateNumber: newVehicle.plate_number,
        brand: newVehicle.brand,
        model: newVehicle.model,
        year: newVehicle.year,
        currentMileage: newVehicle.current_mileage,
        fuelType: newVehicle.fuel_type,
        createdAt: newVehicle.created_at,
        updatedAt: newVehicle.updated_at
      }
    });

  } catch (error) {
    console.error('Errore nell\'aggiunta veicolo:', error);
    
    if (error.code === '23505') { // Violazione vincolo unique
      return res.status(409).json({ 
        error: 'Veicolo con questa targa già esistente' 
      });
    }
    
    res.status(500).json({ 
      error: 'Errore del server nell\'aggiunta del veicolo' 
    });
  }
});

// Aggiorna un veicolo
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const { plateNumber, brand, model, year, currentMileage, fuelType } = req.body;

    // Verifica che il veicolo appartenga all'utente
    const existingVehicle = await pool.query(
      'SELECT id, current_mileage FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicleId, userId]
    );

    if (existingVehicle.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Veicolo non trovato' 
      });
    }

    // Validazione campi (solo se forniti)
    if (year !== undefined && (year < 1900 || year > new Date().getFullYear() + 1)) {
      return res.status(400).json({ 
        error: 'Anno non valido' 
      });
    }

    if (typeof currentMileage === 'number' && currentMileage < 0) {
      return res.status(400).json({ 
        error: 'Il chilometraggio non può essere negativo' 
      });
    }

    // Impedisci decremento del chilometraggio (solo incremento o uguale)
    const prevMileage = existingVehicle.rows[0].current_mileage ?? 0;
    if (typeof currentMileage === 'number' && currentMileage < prevMileage) {
      return res.status(400).json({ 
        error: 'Il chilometraggio non può diminuire rispetto al valore attuale' 
      });
    }

    const validFuelTypes = ['gasoline', 'diesel', 'hybrid', 'electric', 'lpg', 'methane'];
    if (fuelType !== undefined && !validFuelTypes.includes(fuelType)) {
      return res.status(400).json({ 
        error: 'Tipo di carburante non valido' 
      });
    }

    const result = await pool.query(
      `UPDATE vehicles 
       SET plate_number = COALESCE($1, plate_number),
           brand = COALESCE($2, brand),
           model = COALESCE($3, model),
           year = COALESCE($4, year),
           current_mileage = COALESCE($5, current_mileage),
           fuel_type = COALESCE($6, fuel_type),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [plateNumber ? plateNumber.toUpperCase() : null, brand || null, model || null, year ?? null, typeof currentMileage === 'number' ? currentMileage : null, fuelType ?? null, vehicleId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Veicolo non trovato' 
      });
    }

    const updatedVehicle = result.rows[0];

    res.json({
      message: 'Veicolo aggiornato con successo',
      vehicle: {
        id: updatedVehicle.id.toString(),
        plateNumber: updatedVehicle.plate_number,
        brand: updatedVehicle.brand,
        model: updatedVehicle.model,
        year: updatedVehicle.year,
        currentMileage: updatedVehicle.current_mileage,
        fuelType: updatedVehicle.fuel_type,
        createdAt: updatedVehicle.created_at,
        updatedAt: updatedVehicle.updated_at
      }
    });

  } catch (error) {
    console.error('Errore nell\'aggiornamento veicolo:', error);
    
    if (error.code === '23505') { // Violazione vincolo unique
      return res.status(409).json({ 
        error: 'Veicolo con questa targa già esistente' 
      });
    }
    
    res.status(500).json({ 
      error: 'Errore del server nell\'aggiornamento del veicolo' 
    });
  }
});

// Elimina un veicolo
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;

    const result = await pool.query(
      'DELETE FROM vehicles WHERE id = $1 AND user_id = $2 RETURNING id',
      [vehicleId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Veicolo non trovato' 
      });
    }

    res.json({
      message: 'Veicolo eliminato con successo'
    });

  } catch (error) {
    console.error('Errore nell\'eliminazione veicolo:', error);
    res.status(500).json({ 
      error: 'Errore del server nell\'eliminazione del veicolo' 
    });
  }
});

// Funzione helper per creare notifiche iniziali
const createInitialNotifications = async (vehicleId) => {
  try {
    const notifications = [
      {
        type: 'insurance',
        status: 'warning',
        days_until_expiry: 30,
        message: 'Assicurazione in scadenza tra 30 giorni',
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'tax',
        status: 'safe',
        days_until_expiry: 90,
        message: 'Bollo auto in scadenza tra 90 giorni',
        expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'service',
        status: 'safe',
        days_until_expiry: 60,
        message: 'Tagliando consigliato tra 60 giorni',
        expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      }
    ];

    for (const notification of notifications) {
      await pool.query(
        `INSERT INTO notifications (vehicle_id, type, status, days_until_expiry, message, expiry_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [vehicleId, notification.type, notification.status, notification.days_until_expiry, notification.message, notification.expiry_date]
      );
    }
  } catch (error) {
    console.error('Errore nella creazione notifiche iniziali:', error);
  }
};

// Helpers per aggiornare le notifiche in base alle scadenze
const computeStatusForExpiryDate = (expiryDate) => {
  // Allinea il calcolo ai valori usati in SQL e nelle email:
  // confronto tra le DATE (a mezzanotte) per evitare off‑by‑one dovuti all'orario corrente.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const days = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  let status = 'safe';
  if (days < 0) status = 'expired';
  else if (days <= 7) status = 'critical';
  else if (days <= 30) status = 'warning';
  return { days_until_expiry: days, status };
};

// Etichette leggibili per tipi di manutenzione dal DB
const labelForMaintenanceType = (dbType) => {
  const map = {
    oil_change: 'Cambio olio',
    filters: 'Filtri',
    brakes: 'Freni',
    tires: 'Cambio pneumatici',
    adblue: 'AdBlue',
    belts: 'Cinghie',
  };
  return map[dbType] || 'Manutenzione';
};

const buildMessageForType = (type, days, subLabel) => {
  switch (type) {
    case 'insurance':
      return days < 0 ? 'Assicurazione scaduta' : `Assicurazione in scadenza tra ${days} giorni`;
    case 'tax':
      return days < 0 ? 'Bollo auto scaduto' : `Bollo auto in scadenza tra ${days} giorni`;
    case 'inspection':
      return days < 0 ? 'Revisione scaduta' : `Revisione in scadenza tra ${days} giorni`;
    case 'maintenance':
      if (subLabel && typeof subLabel === 'string') {
        return days < 0 ? `${subLabel} scaduto` : `${subLabel} in scadenza tra ${days} giorni`;
      }
      return days < 0 ? 'Manutenzione scaduta' : `Manutenzione in scadenza tra ${days} giorni`;
    default:
      return days < 0 ? 'Scadenza superata' : `Scadenza tra ${days} giorni`;
  }
};

const upsertExpiryNotification = async (vehicleId, type, expiryDate, opts = {}) => {
  if (!expiryDate) return; // non creare notifiche senza data
  const { days_until_expiry, status } = computeStatusForExpiryDate(expiryDate);
  const message = buildMessageForType(type, days_until_expiry, opts.maintenanceLabel);

  const sourceType = opts.sourceType || null;
  const sourceId = opts.sourceId || null;

  if (sourceType && sourceId) {
    // upsert per elemento specifico (non aggregato)
    const existing = await pool.query(
      `SELECT id FROM notifications WHERE vehicle_id = $1 AND type = $2 AND source_type = $3 AND source_id = $4 LIMIT 1`,
      [vehicleId, type, sourceType, sourceId]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE notifications SET status = $1, days_until_expiry = $2, message = $3, expiry_date = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
        [status, days_until_expiry, message, expiryDate, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO notifications (vehicle_id, type, source_type, source_id, status, days_until_expiry, message, expiry_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [vehicleId, type, sourceType, sourceId, status, days_until_expiry, message, expiryDate]
      );
    }
  } else {
    // fallback aggregato (solo per notifiche iniziali legacy)
    const existing = await pool.query(
      `SELECT id FROM notifications WHERE vehicle_id = $1 AND type = $2 ORDER BY expiry_date DESC LIMIT 1`,
      [vehicleId, type]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE notifications SET status = $1, days_until_expiry = $2, message = $3, expiry_date = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
        [status, days_until_expiry, message, expiryDate, existing.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO notifications (vehicle_id, type, status, days_until_expiry, message, expiry_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [vehicleId, type, status, days_until_expiry, message, expiryDate]
      );
    }
  }
};

// Ricalcola o elimina la notifica di scadenza dopo un'operazione di DELETE
const recomputeOrDeleteNotification = async (vehicleId, type) => {
  let query;
  switch (type) {
    case 'insurance':
      query = `SELECT MIN(expiry_date) AS expiry_date FROM insurances WHERE vehicle_id = $1`;
      break;
    case 'tax':
      query = `SELECT MIN(expiry_date) AS expiry_date FROM car_taxes WHERE vehicle_id = $1`;
      break;
    case 'inspection':
      query = `SELECT MIN(next_inspection_date) AS expiry_date FROM inspections WHERE vehicle_id = $1`;
      break;
    case 'maintenance':
      // Recupera la manutenzione più vicina con il suo tipo e titolo per un messaggio dettagliato
      query = `SELECT title, type, next_maintenance AS expiry_date FROM maintenances WHERE vehicle_id = $1 ORDER BY next_maintenance ASC LIMIT 1`;
      break;
    default:
      return; // tipo non gestito
  }

  const res = await pool.query(query, [vehicleId]);
  const row = res.rows[0] || null;
  const expiryDate = row?.expiry_date || null;
  if (expiryDate) {
    const maintenanceLabel = type === 'maintenance'
      ? ((row?.title && String(row.title).trim() !== '') ? row.title : (row?.type ? labelForMaintenanceType(row.type) : undefined))
      : undefined;
    await upsertExpiryNotification(vehicleId, type, expiryDate, { maintenanceLabel });
  } else {
    await pool.query(`DELETE FROM notifications WHERE vehicle_id = $1 AND type = $2`, [vehicleId, type]);
  }
};

// Rotte annidate: manutenzioni per veicolo
router.post('/:id/maintenances', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
  const { type, title, lastMaintenance, lastMileage, nextMaintenance, nextMileage, cost, description } = req.body;
    const nextMaintenanceDate = (typeof nextMaintenance === 'string' && nextMaintenance.trim() !== '') ? nextMaintenance : null;
    let costVal = null;
    if (typeof cost === 'number') {
      costVal = Number.isFinite(cost) ? cost : null;
    } else if (cost != null) {
      const parsed = parseFloat(String(cost));
      costVal = Number.isFinite(parsed) ? parsed : null;
    }
    const titleVal = (typeof title === 'string' && title.trim() !== '') ? title.trim() : null;
    const descVal = (typeof description === 'string' && description.trim() !== '') ? description.trim() : null;
    const lastMaintenanceDate = (typeof lastMaintenance === 'string' && lastMaintenance.trim() !== '') ? lastMaintenance : null;

    // Verifica proprietà del veicolo
    const vehicleRes = await pool.query('SELECT id FROM vehicles WHERE id = $1 AND user_id = $2', [vehicleId, userId]);
    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Veicolo non trovato' });
    }

    // Mappa tipi frontend -> DB
    const typeMap = {
      oil: 'oil_change',
      filters: 'filters',
      brakes: 'brakes',
      tires: 'tires',
      adblue: 'adblue'
    };
    const dbType = typeMap[type] || type;

    const validTypes = ['oil_change', 'filters', 'belts', 'brakes', 'tires', 'adblue'];
    if (!validTypes.includes(dbType)) {
      return res.status(400).json({ error: 'Tipo manutenzione non valido' });
    }

    const insertRes = await pool.query(
      `INSERT INTO maintenances (vehicle_id, type, title, last_maintenance, last_mileage, next_maintenance, next_mileage, cost, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        vehicleId,
        dbType,
        titleVal,
        lastMaintenanceDate,
        (typeof lastMileage === 'number' ? lastMileage : null),
        nextMaintenanceDate,
        (typeof nextMileage === 'number' ? nextMileage : null),
        costVal,
        descVal
      ]
    );

    const m = insertRes.rows[0];
    // notifica per questa singola manutenzione
    try {
      const maintenanceLabel = (m.title && String(m.title).trim() !== '') ? m.title : labelForMaintenanceType(m.type);
      await upsertExpiryNotification(vehicleId, 'maintenance', m.next_maintenance, { maintenanceLabel, sourceType: 'maintenance', sourceId: m.id });
    } catch (e) { console.error('Notifica manutenzione (create) non aggiornata:', e); }
    res.status(201).json({
      id: m.id.toString(),
      vehicle_id: m.vehicle_id,
      type: m.type,
      title: m.title,
      last_maintenance: m.last_maintenance,
      last_mileage: m.last_mileage,
      next_maintenance: m.next_maintenance,
      cost: m.cost,
      description: m.description,
      created_at: m.created_at,
      updated_at: m.updated_at
    });
  } catch (error) {
    console.error('Errore nell\'aggiunta manutenzione:', error);
    res.status(500).json({ error: 'Errore del server nell\'aggiunta manutenzione' });
  }
});

router.put('/:id/maintenances/:maintenanceId', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const maintenanceId = req.params.maintenanceId;
  const { type, title, lastMaintenance, lastMileage, nextMaintenance, nextMileage, cost, description, clearNextMaintenance, clearNextMileage } = req.body;
    const nextMaintenanceDate = (typeof nextMaintenance === 'string' && nextMaintenance.trim() !== '') ? nextMaintenance : null;
    const lastMaintenanceDate = (typeof lastMaintenance === 'string' && lastMaintenance.trim() !== '') ? lastMaintenance : null;
    let costVal = undefined;
    if (typeof cost === 'number') {
      costVal = Number.isFinite(cost) ? cost : null;
    } else if (cost != null) {
      const parsed = parseFloat(String(cost));
      costVal = Number.isFinite(parsed) ? parsed : null;
    }
    const titleVal = (typeof title === 'string' && title.trim() !== '') ? title.trim() : null;
    const descVal = (typeof description === 'string' && description.trim() !== '') ? description.trim() : null;

    // Verifica che la manutenzione appartenga al veicolo dell'utente
    const checkRes = await pool.query(
      `SELECT m.id
       FROM maintenances m
       JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.id = $1 AND v.id = $2 AND v.user_id = $3`,
      [maintenanceId, vehicleId, userId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Manutenzione non trovata' });
    }

    let dbType = undefined;
    if (type) {
      const typeMap = { oil: 'oil_change', filters: 'filters', brakes: 'brakes', tires: 'tires', adblue: 'adblue' };
      dbType = typeMap[type] || type;
      const validTypes = ['oil_change', 'filters', 'belts', 'brakes', 'tires', 'adblue'];
      if (!validTypes.includes(dbType)) {
        return res.status(400).json({ error: 'Tipo manutenzione non valido' });
      }
    }

    const updateRes = await pool.query(
      `UPDATE maintenances
       SET type = COALESCE($1, type),
           title = COALESCE($2, title),
           last_maintenance = COALESCE($3, last_maintenance),
           last_mileage = COALESCE($4, last_mileage),
           next_maintenance = CASE WHEN $9 THEN NULL ELSE COALESCE($5, next_maintenance) END,
           next_mileage = CASE WHEN $10 THEN NULL ELSE COALESCE($6, next_mileage) END,
           cost = COALESCE($7, cost),
           description = COALESCE($8, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        dbType || null,
        titleVal || null,
        lastMaintenanceDate || null,
        (typeof lastMileage === 'number' ? lastMileage : null),
        nextMaintenanceDate || null,
        (typeof nextMileage === 'number' ? nextMileage : null),
        costVal ?? null,
        descVal ?? null,
        !!clearNextMaintenance,
        !!clearNextMileage,
        maintenanceId,
      ]
    );

    const m = updateRes.rows[0];
    // aggiorna notifica di manutenzione con la nuova data, includendo etichetta dettagliata
    try {
      if (m.next_maintenance) {
        const maintenanceLabel = (m.title && String(m.title).trim() !== '') ? m.title : labelForMaintenanceType(m.type);
        await upsertExpiryNotification(vehicleId, 'maintenance', m.next_maintenance, { maintenanceLabel, sourceType: 'maintenance', sourceId: m.id });
      } else {
        await pool.query(`DELETE FROM notifications WHERE vehicle_id = $1 AND type = 'maintenance' AND source_type = 'maintenance' AND source_id = $2`, [vehicleId, maintenanceId]);
      }
    } catch (e) { console.error('Notifica manutenzione (update) non aggiornata:', e); }
    res.json({
      id: m.id.toString(),
      vehicle_id: m.vehicle_id,
      type: m.type,
      title: m.title,
      last_maintenance: m.last_maintenance,
      last_mileage: m.last_mileage,
      next_maintenance: m.next_maintenance,
      cost: m.cost,
      description: m.description,
      created_at: m.created_at,
      updated_at: m.updated_at
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento manutenzione:', error);
    res.status(500).json({ error: 'Errore del server nell\'aggiornamento manutenzione' });
  }
});

router.delete('/:id/maintenances/:maintenanceId', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const maintenanceId = req.params.maintenanceId;

    // Verifica proprietà e appartenenza
    const checkRes = await pool.query(
      `SELECT m.id
       FROM maintenances m
       JOIN vehicles v ON m.vehicle_id = v.id
       WHERE m.id = $1 AND v.id = $2 AND v.user_id = $3`,
      [maintenanceId, vehicleId, userId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Manutenzione non trovata' });
    }

    await pool.query('DELETE FROM maintenances WHERE id = $1', [maintenanceId]);
    // elimina la notifica di quella manutenzione specifica
    try { await pool.query(`DELETE FROM notifications WHERE vehicle_id = $1 AND type = 'maintenance' AND source_type = 'maintenance' AND source_id = $2`, [vehicleId, maintenanceId]); } catch (e) { console.error('Notifica manutenzione non aggiornata (delete):', e); }
    res.json({ message: 'Manutenzione eliminata con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione manutenzione:', error);
    res.status(500).json({ error: 'Errore del server nell\'eliminazione manutenzione' });
  }
});

// ===== INSURANCES CRUD =====
router.post('/:id/insurances', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const { company, policyNumber, expiryDate, annualPremium } = req.body;

    const vehicleRes = await pool.query('SELECT id FROM vehicles WHERE id = $1 AND user_id = $2', [vehicleId, userId]);
    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Veicolo non trovato' });
    }

    if (!company || !expiryDate || annualPremium === undefined || annualPremium === null) {
      return res.status(400).json({ error: 'Campi assicurazione obbligatori mancanti' });
    }

    const insertRes = await pool.query(
      `INSERT INTO insurances (vehicle_id, company, policy_number, expiry_date, annual_premium)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [vehicleId, company, policyNumber ?? '', expiryDate, annualPremium]
    );

    const i = insertRes.rows[0];
    // notifica per questa singola assicurazione
    try { await upsertExpiryNotification(vehicleId, 'insurance', i.expiry_date, { sourceType: 'insurance', sourceId: i.id }); } catch (e) { console.error('Notifica assicurazione (create) non aggiornata:', e); }
    res.status(201).json({
      id: i.id.toString(),
      vehicleId: i.vehicle_id.toString(),
      company: i.company,
      policyNumber: i.policy_number,
      expiryDate: i.expiry_date,
      annualPremium: parseFloat(i.annual_premium),
      paymentHistory: []
    });
  } catch (error) {
    console.error('Errore aggiunta assicurazione:', error);
    res.status(500).json({ error: 'Errore del server nell\'aggiunta assicurazione' });
  }
});

router.put('/:id/insurances/:insuranceId', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const insuranceId = req.params.insuranceId;
    const { company, policyNumber, expiryDate, annualPremium } = req.body;

    const checkRes = await pool.query(
      `SELECT i.id FROM insurances i
       JOIN vehicles v ON i.vehicle_id = v.id
       WHERE i.id = $1 AND v.id = $2 AND v.user_id = $3`,
      [insuranceId, vehicleId, userId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Assicurazione non trovata' });
    }

    const updateRes = await pool.query(
      `UPDATE insurances SET 
        company = COALESCE($1, company),
        policy_number = COALESCE($2, policy_number),
        expiry_date = COALESCE($3, expiry_date),
        annual_premium = COALESCE($4, annual_premium),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [company || null, policyNumber || null, expiryDate || null, annualPremium ?? null, insuranceId]
    );

    const i = updateRes.rows[0];
    // aggiorna/elimina notifica assicurazione per elemento
    try {
      if (i.expiry_date) {
        await upsertExpiryNotification(vehicleId, 'insurance', i.expiry_date, { sourceType: 'insurance', sourceId: i.id });
      } else {
        await pool.query(`DELETE FROM notifications WHERE vehicle_id = $1 AND type = 'insurance' AND source_type = 'insurance' AND source_id = $2`, [vehicleId, insuranceId]);
      }
    } catch (e) { console.error('Notifica assicurazione (update) non aggiornata:', e); }
    res.json({
      id: i.id.toString(),
      vehicleId: i.vehicle_id.toString(),
      company: i.company,
      policyNumber: i.policy_number,
      expiryDate: i.expiry_date,
      annualPremium: parseFloat(i.annual_premium),
      paymentHistory: []
    });
  } catch (error) {
    console.error('Errore aggiornamento assicurazione:', error);
    res.status(500).json({ error: 'Errore del server nell\'aggiornamento assicurazione' });
  }
});

router.delete('/:id/insurances/:insuranceId', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const insuranceId = req.params.insuranceId;

    const checkRes = await pool.query(
      `SELECT i.id FROM insurances i
       JOIN vehicles v ON i.vehicle_id = v.id
       WHERE i.id = $1 AND v.id = $2 AND v.user_id = $3`,
      [insuranceId, vehicleId, userId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Assicurazione non trovata' });
    }

    await pool.query('DELETE FROM insurances WHERE id = $1', [insuranceId]);
    try { await pool.query(`DELETE FROM notifications WHERE vehicle_id = $1 AND type = 'insurance' AND source_type = 'insurance' AND source_id = $2`, [vehicleId, insuranceId]); } catch (e) { console.error('Notifica assicurazione non aggiornata (delete):', e); }
    res.json({ message: 'Assicurazione eliminata con successo' });
  } catch (error) {
    console.error('Errore eliminazione assicurazione:', error);
    res.status(500).json({ error: 'Errore del server nell\'eliminazione assicurazione' });
  }
});

// ===== CAR TAXES CRUD =====
router.post('/:id/taxes', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const { expiryDate, amount, region, isPaid } = req.body;

    const vehicleRes = await pool.query('SELECT id FROM vehicles WHERE id = $1 AND user_id = $2', [vehicleId, userId]);
    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Veicolo non trovato' });
    }

    if (!expiryDate || amount === undefined || amount === null || !region) {
      return res.status(400).json({ error: 'Campi bollo auto obbligatori mancanti' });
    }

    const insertRes = await pool.query(
      `INSERT INTO car_taxes (vehicle_id, expiry_date, amount, region, is_paid)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [vehicleId, expiryDate, amount, region, !!isPaid]
    );

    const t = insertRes.rows[0];
    // aggiorna notifica bollo
    try { await upsertExpiryNotification(vehicleId, 'tax', t.expiry_date); } catch (e) { console.error('Notifica bollo (create) non aggiornata:', e); }
    res.status(201).json({
      id: t.id.toString(),
      vehicleId: t.vehicle_id.toString(),
      expiryDate: t.expiry_date,
      amount: parseFloat(t.amount),
      region: t.region,
      isPaid: t.is_paid
    });
  } catch (error) {
    console.error('Errore aggiunta bollo auto:', error);
    res.status(500).json({ error: 'Errore del server nell\'aggiunta bollo auto' });
  }
});

router.put('/:id/taxes/:taxId', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const taxId = req.params.taxId;
    const { expiryDate, amount, region, isPaid } = req.body;

    const checkRes = await pool.query(
      `SELECT c.id FROM car_taxes c
       JOIN vehicles v ON c.vehicle_id = v.id
       WHERE c.id = $1 AND v.id = $2 AND v.user_id = $3`,
      [taxId, vehicleId, userId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Bollo auto non trovato' });
    }

    const updateRes = await pool.query(
      `UPDATE car_taxes SET 
        expiry_date = COALESCE($1, expiry_date),
        amount = COALESCE($2, amount),
        region = COALESCE($3, region),
        is_paid = COALESCE($4, is_paid),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [expiryDate || null, amount ?? null, region || null, typeof isPaid === 'boolean' ? isPaid : null, taxId]
    );

    const t = updateRes.rows[0];
    // aggiorna/elimina notifica bollo per elemento
    try {
      if (t.expiry_date) {
        await upsertExpiryNotification(vehicleId, 'tax', t.expiry_date, { sourceType: 'tax', sourceId: t.id });
      } else {
        await pool.query(`DELETE FROM notifications WHERE vehicle_id = $1 AND type = 'tax' AND source_type = 'tax' AND source_id = $2`, [vehicleId, taxId]);
      }
    } catch (e) { console.error('Notifica bollo (update) non aggiornata:', e); }
    res.json({
      id: t.id.toString(),
      vehicleId: t.vehicle_id.toString(),
      expiryDate: t.expiry_date,
      amount: parseFloat(t.amount),
      region: t.region,
      isPaid: t.is_paid
    });
  } catch (error) {
    console.error('Errore aggiornamento bollo auto:', error);
    res.status(500).json({ error: 'Errore del server nell\'aggiornamento bollo auto' });
  }
});

router.delete('/:id/taxes/:taxId', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const taxId = req.params.taxId;

    const checkRes = await pool.query(
      `SELECT c.id FROM car_taxes c
       JOIN vehicles v ON c.vehicle_id = v.id
       WHERE c.id = $1 AND v.id = $2 AND v.user_id = $3`,
      [taxId, vehicleId, userId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Bollo auto non trovato' });
    }

    await pool.query('DELETE FROM car_taxes WHERE id = $1', [taxId]);
    try { await pool.query(`DELETE FROM notifications WHERE vehicle_id = $1 AND type = 'tax' AND source_type = 'tax' AND source_id = $2`, [vehicleId, taxId]); } catch (e) { console.error('Notifica bollo non aggiornata (delete):', e); }
    res.json({ message: 'Bollo auto eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione bollo auto:', error);
    res.status(500).json({ error: 'Errore del server nell\'eliminazione bollo auto' });
  }
});

// ===== INSPECTIONS CRUD =====
router.post('/:id/inspections', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const { lastInspectionDate, nextInspectionDate, inspectionCenter, cost } = req.body;

    const vehicleRes = await pool.query('SELECT id FROM vehicles WHERE id = $1 AND user_id = $2', [vehicleId, userId]);
    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Veicolo non trovato' });
    }

    if (!lastInspectionDate || !nextInspectionDate) {
      return res.status(400).json({ error: 'Date revisione obbligatorie mancanti' });
    }

    const insertRes = await pool.query(
      `INSERT INTO inspections (vehicle_id, last_inspection_date, next_inspection_date, inspection_center, cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [vehicleId, lastInspectionDate, nextInspectionDate, inspectionCenter || null, cost ?? null]
    );

    const ins = insertRes.rows[0];
    // notifica per questa singola revisione
    try { await upsertExpiryNotification(vehicleId, 'inspection', ins.next_inspection_date, { sourceType: 'inspection', sourceId: ins.id }); } catch (e) { console.error('Notifica revisione (create) non aggiornata:', e); }
    res.status(201).json({
      id: ins.id.toString(),
      vehicleId: ins.vehicle_id.toString(),
      lastInspectionDate: ins.last_inspection_date,
      nextInspectionDate: ins.next_inspection_date,
      inspectionCenter: ins.inspection_center,
      cost: ins.cost !== null ? parseFloat(ins.cost) : 0
    });
  } catch (error) {
    console.error('Errore aggiunta revisione:', error);
    res.status(500).json({ error: 'Errore del server nell\'aggiunta revisione' });
  }
});

router.put('/:id/inspections/:inspectionId', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const inspectionId = req.params.inspectionId;
    const { lastInspectionDate, nextInspectionDate, inspectionCenter, cost } = req.body;

    const checkRes = await pool.query(
      `SELECT i.id FROM inspections i
       JOIN vehicles v ON i.vehicle_id = v.id
       WHERE i.id = $1 AND v.id = $2 AND v.user_id = $3`,
      [inspectionId, vehicleId, userId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Revisione non trovata' });
    }

    const updateRes = await pool.query(
      `UPDATE inspections SET 
        last_inspection_date = COALESCE($1, last_inspection_date),
        next_inspection_date = COALESCE($2, next_inspection_date),
        inspection_center = COALESCE($3, inspection_center),
        cost = COALESCE($4, cost),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [lastInspectionDate || null, nextInspectionDate || null, inspectionCenter || null, cost ?? null, inspectionId]
    );

    const ins = updateRes.rows[0];
    // aggiorna/elimina notifica revisione per elemento
    try {
      if (ins.next_inspection_date) {
        await upsertExpiryNotification(vehicleId, 'inspection', ins.next_inspection_date, { sourceType: 'inspection', sourceId: ins.id });
      } else {
        await pool.query(`DELETE FROM notifications WHERE vehicle_id = $1 AND type = 'inspection' AND source_type = 'inspection' AND source_id = $2`, [vehicleId, inspectionId]);
      }
    } catch (e) { console.error('Notifica revisione (update) non aggiornata:', e); }
    res.json({
      id: ins.id.toString(),
      vehicleId: ins.vehicle_id.toString(),
      lastInspectionDate: ins.last_inspection_date,
      nextInspectionDate: ins.next_inspection_date,
      inspectionCenter: ins.inspection_center,
      cost: ins.cost !== null ? parseFloat(ins.cost) : 0
    });
  } catch (error) {
    console.error('Errore aggiornamento revisione:', error);
    res.status(500).json({ error: 'Errore del server nell\'aggiornamento revisione' });
  }
});

router.delete('/:id/inspections/:inspectionId', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const inspectionId = req.params.inspectionId;

    const checkRes = await pool.query(
      `SELECT i.id FROM inspections i
       JOIN vehicles v ON i.vehicle_id = v.id
       WHERE i.id = $1 AND v.id = $2 AND v.user_id = $3`,
      [inspectionId, vehicleId, userId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Revisione non trovata' });
    }

    await pool.query('DELETE FROM inspections WHERE id = $1', [inspectionId]);
    try { await pool.query(`DELETE FROM notifications WHERE vehicle_id = $1 AND type = 'inspection' AND source_type = 'inspection' AND source_id = $2`, [vehicleId, inspectionId]); } catch (e) { console.error('Notifica revisione non aggiornata (delete):', e); }
    res.json({ message: 'Revisione eliminata con successo' });
  } catch (error) {
    console.error('Errore eliminazione revisione:', error);
    res.status(500).json({ error: 'Errore del server nell\'eliminazione revisione' });
  }
});

// ===== SERVICES (TAGLIANDI) CRUD =====
router.post('/:id/services', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const { lastServiceMileage, lastServiceDate, serviceInterval, nextServiceMileage, serviceType } = req.body;

    const vehicleRes = await pool.query('SELECT id FROM vehicles WHERE id = $1 AND user_id = $2', [vehicleId, userId]);
    if (vehicleRes.rows.length === 0) {
      return res.status(404).json({ error: 'Veicolo non trovato' });
    }

    if (lastServiceMileage === undefined || lastServiceMileage === null || !lastServiceDate || serviceInterval === undefined || serviceInterval === null || nextServiceMileage === undefined || nextServiceMileage === null || !serviceType) {
      return res.status(400).json({ error: 'Campi tagliando obbligatori mancanti' });
    }

    const validServiceTypes = ['regular', 'major'];
    if (!validServiceTypes.includes(serviceType)) {
      return res.status(400).json({ error: 'Tipo tagliando non valido' });
    }

    // Recupera chilometraggio corrente del veicolo per validazioni
    const vRes = await pool.query('SELECT current_mileage FROM vehicles WHERE id = $1 AND user_id = $2', [vehicleId, userId]);
    const currentMileage = vRes.rows[0]?.current_mileage ?? 0;

    // Validazioni chilometraggio tagliando
    if (typeof nextServiceMileage === 'number' && nextServiceMileage < currentMileage) {
      return res.status(400).json({ error: 'Il prossimo tagliando deve essere maggiore o uguale al chilometraggio attuale del veicolo' });
    }
    if (typeof lastServiceMileage === 'number') {
      if (lastServiceMileage < 0) {
        return res.status(400).json({ error: 'I chilometri dell\'ultimo tagliando non possono essere negativi' });
      }
      if (typeof nextServiceMileage === 'number' && lastServiceMileage > nextServiceMileage) {
        return res.status(400).json({ error: 'I chilometri dell\'ultimo tagliando non possono superare quelli del prossimo' });
      }
    }

    const insertRes = await pool.query(
      `INSERT INTO services (vehicle_id, last_service_mileage, last_service_date, service_interval, next_service_mileage, service_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [vehicleId, lastServiceMileage, lastServiceDate, serviceInterval, nextServiceMileage, serviceType]
    );

    const s = insertRes.rows[0];
    res.status(201).json({
      id: s.id.toString(),
      vehicleId: s.vehicle_id.toString(),
      lastServiceMileage: s.last_service_mileage,
      lastServiceDate: s.last_service_date,
      serviceInterval: s.service_interval,
      nextServiceMileage: s.next_service_mileage,
      serviceType: s.service_type
    });
  } catch (error) {
    console.error('Errore aggiunta tagliando:', error);
    res.status(500).json({ error: 'Errore del server nell\'aggiunta tagliando' });
  }
});

router.put('/:id/services/:serviceId', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const serviceId = req.params.serviceId;
    const { lastServiceMileage, lastServiceDate, serviceInterval, nextServiceMileage, serviceType, clearNextServiceMileage } = req.body;

    const checkRes = await pool.query(
      `SELECT s.id FROM services s
       JOIN vehicles v ON s.vehicle_id = v.id
       WHERE s.id = $1 AND v.id = $2 AND v.user_id = $3`,
      [serviceId, vehicleId, userId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tagliando non trovato' });
    }

    // Recupera chilometraggio corrente del veicolo per validazioni
    const vRes = await pool.query('SELECT current_mileage FROM vehicles WHERE id = $1 AND user_id = $2', [vehicleId, userId]);
    const currentMileage = vRes.rows[0]?.current_mileage ?? 0;

    // Validazioni chilometraggio tagliando
    if (typeof nextServiceMileage === 'number' && nextServiceMileage < currentMileage) {
      return res.status(400).json({ error: 'Il prossimo tagliando deve essere maggiore o uguale al chilometraggio attuale del veicolo' });
    }
    if (typeof lastServiceMileage === 'number') {
      if (lastServiceMileage < 0) {
        return res.status(400).json({ error: 'I chilometri dell\'ultimo tagliando non possono essere negativi' });
      }
      if (typeof nextServiceMileage === 'number' && lastServiceMileage > nextServiceMileage) {
        return res.status(400).json({ error: 'I chilometri dell\'ultimo tagliando non possono superare quelli del prossimo' });
      }
    }

    const updateRes = await pool.query(
      `UPDATE services SET 
        last_service_mileage = COALESCE($1, last_service_mileage),
        last_service_date = COALESCE($2, last_service_date),
        service_interval = COALESCE($3, service_interval),
        next_service_mileage = CASE WHEN $7 THEN NULL ELSE COALESCE($4, next_service_mileage) END,
        service_type = COALESCE($5, service_type),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [lastServiceMileage ?? null, lastServiceDate || null, serviceInterval ?? null, nextServiceMileage ?? null, serviceType || null, serviceId, !!clearNextServiceMileage]
    );

    const s = updateRes.rows[0];
    res.json({
      id: s.id.toString(),
      vehicleId: s.vehicle_id.toString(),
      lastServiceMileage: s.last_service_mileage,
      lastServiceDate: s.last_service_date,
      serviceInterval: s.service_interval,
      nextServiceMileage: s.next_service_mileage,
      serviceType: s.service_type
    });
  } catch (error) {
    console.error('Errore aggiornamento tagliando:', error);
    res.status(500).json({ error: 'Errore del server nell\'aggiornamento tagliando' });
  }
});

router.delete('/:id/services/:serviceId', async (req, res) => {
  try {
    const userId = req.user.id;
    const vehicleId = req.params.id;
    const serviceId = req.params.serviceId;

    const checkRes = await pool.query(
      `SELECT s.id FROM services s
       JOIN vehicles v ON s.vehicle_id = v.id
       WHERE s.id = $1 AND v.id = $2 AND v.user_id = $3`,
      [serviceId, vehicleId, userId]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tagliando non trovato' });
    }

    await pool.query('DELETE FROM services WHERE id = $1', [serviceId]);
    res.json({ message: 'Tagliando eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione tagliando:', error);
    res.status(500).json({ error: 'Errore del server nell\'eliminazione tagliando' });
  }
});

module.exports = router;
