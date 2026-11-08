// Importa gli utenti esistenti in Clerk MANTENENDO la loro password (hash bcrypt) e salva
// il clerk_id in users.clerk_id. Nessun utente deve reimpostare la password.
//
// Sicuro per costruzione:
//  - DRY-RUN di default: senza --apply non chiama Clerk e non scrive nel DB
//  - non cancella e non modifica mai id, veicoli o scadenze: scrive solo users.clerk_id
//  - idempotente: salta chi ha già un clerk_id; se l'email esiste già in Clerk, collega l'utente esistente
//  - usa external_id = users.id, così il legame è tracciabile da entrambe le parti
//
// Uso:  node scripts/clerk-import-users.js [--apply] [--limit 10] [--email utente@esempio.it]
// Richiede CLERK_SECRET_KEY (usa PRIMA l'istanza di sviluppo Clerk e un branch Neon).
require('dotenv').config();
const { pool } = require('../config/database');

const APPLY = process.argv.includes('--apply');
const limitIdx = process.argv.indexOf('--limit');
const LIMIT = limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : null;
const emailIdx = process.argv.indexOf('--email');
const ONLY_EMAIL = emailIdx > -1 ? process.argv[emailIdx + 1].toLowerCase() : null;
const CLERK = 'https://api.clerk.com/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clerk = async (method, path, body) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${CLERK}${path}`, {
      method,
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) { await sleep((Number(res.headers.get('retry-after')) || 2) * 1000); continue; }
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }
  throw new Error('Rate limit Clerk persistente');
};

(async () => {
  if (APPLY && !process.env.CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY mancante');
  const { rows } = await pool.query(
    `SELECT id, email, password, first_name, last_name FROM users WHERE clerk_id IS NULL ${ONLY_EMAIL ? 'AND LOWER(email) = $1' : ''} ORDER BY id ${LIMIT ? `LIMIT ${LIMIT | 0}` : ''}`,
    ONLY_EMAIL ? [ONLY_EMAIL] : []
  );
  const total = (await pool.query('SELECT COUNT(*)::int c FROM users')).rows[0].c;
  console.log(`${APPLY ? 'APPLY' : 'DRY-RUN'}: ${rows.length} utenti da importare su ${total} totali`);

  const report = { created: 0, linked: 0, failed: [] };
  for (const u of rows) {
    if (!APPLY) { console.log(`  [dry] id=${u.id} ${u.email}`); continue; }
    const payload = {
      external_id: String(u.id),
      email_address: [u.email],
      first_name: u.first_name,
      last_name: u.last_name,
      password_digest: u.password,
      password_hasher: 'bcrypt',
      skip_password_checks: true, // gli hash esistenti non vanno rivalidati contro le regole di Clerk
    };
    let r = await clerk('POST', '/users', payload);
    if (r.status === 200) report.created++;
    else if (r.status === 422 && r.data.errors?.[0]?.code === 'form_identifier_exists') {
      const found = await clerk('GET', `/users?email_address=${encodeURIComponent(u.email)}`);
      const existing = Array.isArray(found.data) ? found.data[0] : null;
      if (!existing) { report.failed.push({ id: u.id, reason: 'email esistente ma utente non trovato' }); continue; }
      r = { status: 200, data: existing }; report.linked++;
    } else { report.failed.push({ id: u.id, status: r.status, reason: r.data.errors?.[0]?.code || 'errore' }); continue; }
    await pool.query('UPDATE users SET clerk_id = $1 WHERE id = $2 AND clerk_id IS NULL', [r.data.id, u.id]);
    await sleep(120); // resta sotto i limiti di rate di Clerk
  }
  if (APPLY) console.log(JSON.stringify(report, null, 1));
  await pool.end();
  process.exit(report.failed.length ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(1); });
