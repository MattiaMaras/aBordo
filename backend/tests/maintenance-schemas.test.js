// Test puri sugli schemi Zod delle manutenzioni: nessun DB richiesto.
const { test, describe } = require('node:test');
const assert = require('node:assert');

const { maintenanceCreateSchema, maintenanceUpdateSchema } = require('../validation/schemas');

describe('maintenanceCreateSchema', () => {
  test('accetta un payload minimo valido', () => {
    const result = maintenanceCreateSchema.safeParse({
      type: 'oil',
      lastMaintenance: '2026-01-15',
    });
    assert.strictEqual(result.success, true);
  });

  test('rifiuta senza lastMaintenance (campo obbligatorio)', () => {
    const result = maintenanceCreateSchema.safeParse({ type: 'oil' });
    assert.strictEqual(result.success, false);
  });

  test('rifiuta una data in formato errato', () => {
    const result = maintenanceCreateSchema.safeParse({
      type: 'oil',
      lastMaintenance: '15/01/2026',
    });
    assert.strictEqual(result.success, false);
  });

  test('rifiuta un chilometraggio negativo', () => {
    const result = maintenanceCreateSchema.safeParse({
      type: 'oil',
      lastMaintenance: '2026-01-15',
      lastMileage: -100,
    });
    assert.strictEqual(result.success, false);
  });

  test('normalizza stringhe vuote di title/description/location/notes a null', () => {
    const result = maintenanceCreateSchema.safeParse({
      type: 'oil',
      lastMaintenance: '2026-01-15',
      title: '  ',
      description: '',
      location: '',
      notes: '',
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.title, null);
    assert.strictEqual(result.data.description, null);
    assert.strictEqual(result.data.location, null);
    assert.strictEqual(result.data.notes, null);
  });

  test('accetta location e notes valorizzati (in precedenza scartati dal backend)', () => {
    const result = maintenanceCreateSchema.safeParse({
      type: 'oil',
      lastMaintenance: '2026-01-15',
      location: 'Officina Rossi',
      notes: 'Controllare anche le pastiglie freno',
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.location, 'Officina Rossi');
    assert.strictEqual(result.data.notes, 'Controllare anche le pastiglie freno');
  });
});

describe('maintenanceUpdateSchema', () => {
  test('accetta un payload vuoto (nessun campo da aggiornare è gestito dalla route)', () => {
    const result = maintenanceUpdateSchema.safeParse({});
    assert.strictEqual(result.success, true);
  });

  test('un campo omesso resta assente nell\'output (undefined = non toccare)', () => {
    const result = maintenanceUpdateSchema.safeParse({ cost: 42.5 });
    assert.strictEqual(result.success, true);
    assert.strictEqual('title' in result.data, false);
    assert.strictEqual(result.data.cost, 42.5);
  });

  test('un campo esplicitamente vuoto diventa null (cancella il valore)', () => {
    const result = maintenanceUpdateSchema.safeParse({ notes: '' });
    assert.strictEqual(result.success, true);
    assert.strictEqual('notes' in result.data, true);
    assert.strictEqual(result.data.notes, null);
  });

  test('accetta i flag clearNextMaintenance/clearNextMileage', () => {
    const result = maintenanceUpdateSchema.safeParse({
      lastMaintenance: '2026-02-01',
      lastMileage: 50000,
      clearNextMaintenance: true,
      clearNextMileage: true,
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.clearNextMaintenance, true);
  });
});
