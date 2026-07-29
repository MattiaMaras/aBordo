// Test di validazione e autorizzazione delle API.
// Girano con DB mock (nessun database richiesto): coprono i percorsi di
// validazione input e i controlli di autenticazione, non la persistenza.
process.env.DB_MOCK = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const app = require('../app');

describe('Health check', () => {
  test('GET /health risponde 200 con status OK', async () => {
    const res = await request(app).get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'OK');
  });
});

describe('Validazione registrazione', () => {
  test('rifiuta email non valida', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'non-una-email', password: 'password123', firstName: 'Mario', lastName: 'Rossi' });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /email/i);
  });

  test('rifiuta password corta', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'mario@example.com', password: 'corta', firstName: 'Mario', lastName: 'Rossi' });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /password/i);
  });

  test('rifiuta password oltre 72 caratteri (limite bcrypt)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'mario@example.com', password: 'x'.repeat(73), firstName: 'Mario', lastName: 'Rossi' });
    assert.strictEqual(res.status, 400);
  });

  test('rifiuta campi mancanti', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'mario@example.com' });
    assert.strictEqual(res.status, 400);
  });

  test('rifiuta nome oltre 100 caratteri', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'mario@example.com', password: 'password123', firstName: 'x'.repeat(101), lastName: 'Rossi' });
    assert.strictEqual(res.status, 400);
  });
});

describe('Validazione login', () => {
  test('rifiuta payload vuoto', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    assert.strictEqual(res.status, 400);
  });

  test('credenziali inesistenti restituiscono 401 generico', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nessuno@example.com', password: 'password123' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Credenziali non valide');
  });
});

describe('Broken access control: route protette', () => {
  const protectedRoutes = [
    ['get', '/api/vehicles'],
    ['post', '/api/vehicles'],
    ['get', '/api/vehicles/1'],
    ['delete', '/api/vehicles/1'],
    ['get', '/api/vehicles/maintenances/all'],
    ['get', '/api/notifications'],
    ['get', '/api/costs/summary?start=2026-01-01&end=2026-01-31'],
    ['get', '/api/auth/profile'],
    ['put', '/api/auth/profile'],
  ];

  for (const [method, path] of protectedRoutes) {
    test(`${method.toUpperCase()} ${path} senza token risponde 401`, async () => {
      const res = await request(app)[method](path);
      assert.strictEqual(res.status, 401);
    });
  }

  test('token JWT non valido risponde 401', async () => {
    const res = await request(app)
      .get('/api/vehicles')
      .set('Authorization', 'Bearer token-falso');
    assert.strictEqual(res.status, 401);
  });
});

describe('Logout', () => {
  test('POST /api/auth/logout azzera il cookie di sessione', async () => {
    const res = await request(app).post('/api/auth/logout');
    assert.strictEqual(res.status, 200);
    const setCookie = res.headers['set-cookie']?.join(';') ?? '';
    assert.match(setCookie, /abordo_token=;/);
  });
});

describe('Route inesistenti', () => {
  test('risponde 404 JSON', async () => {
    const res = await request(app).get('/api/rotta-che-non-esiste');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error, 'Route non trovata');
  });
});
