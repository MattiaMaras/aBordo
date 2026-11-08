const { test, describe } = require('node:test');
const assert = require('node:assert');
const { onboardingSchema } = require('../validation/schemas');

const valid = () => ({
  vehicle: { plateNumber: 'AB123CD', brand: 'Fiat', model: 'Panda', year: 2020, currentMileage: 50000, fuelType: 'gasoline' },
  insurance: { company: 'Allianz', expiryDate: '2027-03-01' },
  tax: { region: 'Lombardia', expiryDate: '2027-01-31' },
  inspection: { lastInspectionDate: '2025-05-10' },
  service: { lastServiceDate: '2026-01-10', lastServiceMileage: 45000 },
  tires: { lastDate: '2026-04-01' },
  filters: { lastDate: '2025-11-01' },
});

describe('onboardingSchema', () => {
  test('accetta il payload completo minimo', () => {
    assert.strictEqual(onboardingSchema.safeParse(valid()).success, true);
  });

  for (const key of ['insurance', 'tax', 'inspection', 'service', 'tires', 'filters']) {
    test(`rifiuta se manca "${key}" (dato obbligatorio)`, () => {
      const p = valid();
      delete p[key];
      assert.strictEqual(onboardingSchema.safeParse(p).success, false);
    });
  }

  test('rifiuta tagliando con km superiori ai km attuali', () => {
    const p = valid();
    p.service.lastServiceMileage = 60000;
    const r = onboardingSchema.safeParse(p);
    assert.strictEqual(r.success, false);
    assert.match(r.error.issues[0].message, /km/i);
  });

  test('rifiuta date in formato errato', () => {
    const p = valid();
    p.tax.expiryDate = '31/01/2027';
    assert.strictEqual(onboardingSchema.safeParse(p).success, false);
  });

  test('accetta gli extra facoltativi', () => {
    const p = valid();
    p.extras = { oilChange: { lastDate: '2026-02-01', lastMileage: 46000 }, belts: { lastDate: '2022-06-01' } };
    assert.strictEqual(onboardingSchema.safeParse(p).success, true);
  });
});
