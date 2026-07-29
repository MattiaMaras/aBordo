# A Bordo - Gestione Veicoli

Un'applicazione web completa per la gestione dei veicoli con notifiche automatiche per scadenze e manutenzioni.

## Caratteristiche

- 🚗 Gestione completa dei veicoli
- 📧 Notifiche email automatiche per scadenze
- 📊 Dashboard con statistiche
- 🔐 Autenticazione JWT sicura
- 📱 Interfaccia responsive
- 🔔 Sistema di notifiche in tempo reale
- 🔧 Gestione manutenzioni

## Requisiti

- Node.js (v16 o superiore)
- PostgreSQL (v12 o superiore)
- NPM o Yarn

## Installazione

### 1. Clona il repository
```bash
git clone https://github.com/tuo-username/a-bordo.git
cd a-bordo
```

### 2. Installa le dipendenze

Backend:
```bash
cd backend
npm install
```

Frontend:
```bash
cd ../frontend
npm install
```

### 3. Configura il database PostgreSQL

Crea un database PostgreSQL:
```sql
CREATE DATABASE abordo_db;
CREATE USER abordo_user WITH PASSWORD 'abordo_password';
GRANT ALL PRIVILEGES ON DATABASE abordo_db TO abordo_user;
```

### 4. Configura le variabili d'ambiente

#### Backend (.env)
Copia il file `.env.example` in `.env` e configura:
```bash
cd backend
cp .env.example .env
```

Modifica le variabili nel file `.env`:
```
DATABASE_URL=postgresql://abordo_user:abordo_password@localhost:5432/abordo_db
JWT_SECRET=your-super-secret-jwt-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

#### Frontend (.env)
Copia il file `.env.example` in `.env`:
```bash
cd frontend
cp .env.example .env
```

### 5. Avvia l'applicazione

Backend:
```bash
cd backend
npm run dev
```

Frontend (in un nuovo terminale):
```bash
cd frontend
npm run dev
```

L'applicazione sarà disponibile su:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Configurazione Email (Gmail)

Per le notifiche email automatiche:

1. Vai su https://myaccount.google.com/
2. Abilita l'"Autenticazione a due fattori"
3. Genera una "Password per app" specifica
4. Usa questa password nel file `.env` come `EMAIL_PASS`

## Deployment

### Backend su Render (Gratuito)

1. Crea un account su https://render.com
2. Crea un "Web Service" collegando il tuo repository
3. Configura:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment Variables: copia tutte le variabili dal tuo `.env`

### Database PostgreSQL su Render

1. Crea un "PostgreSQL" database su Render
2. Copia l'URL di connessione nel `DATABASE_URL`

### Frontend su Vercel (Gratuito)

1. Crea un account su https://vercel.com
2. Importa il progetto frontend
3. Configura la variabile d'ambiente:
   - `VITE_API_URL`: l'URL del tuo backend su Render

## Sicurezza

- Password hashate con bcrypt (costo configurabile con `BCRYPT_COST`)
- Sessione con cookie HttpOnly + fallback token Bearer (per browser che bloccano i cookie cross-site)
- JWT con scadenza configurabile
- Rate limiting sulle API, con limite severo dedicato a login/registrazione
- CORS ristretto al solo `FRONTEND_URL` in produzione
- Helmet.js per sicurezza HTTP headers
- Validazione input con Zod su tutte le route
- Escaping HTML nelle email e protezione formula-injection nell'export CSV

Nota deploy: finché frontend (Vercel) e backend (Render) sono su domini diversi,
Safari blocca il cookie di sessione third-party e l'app usa il fallback Bearer.
Con un dominio custom condiviso (es. `app.tuodominio.it` + `api.tuodominio.it`)
il cookie HttpOnly diventa la modalità principale.

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrazione utente
- `POST /api/auth/login` - Login utente
- `GET /api/auth/profile` - Profilo utente (richiede auth)
- `PUT /api/auth/profile` - Aggiorna profilo (richiede auth)

### Veicoli
- `GET /api/vehicles` - Lista veicoli (richiede auth)
- `POST /api/vehicles` - Aggiungi veicolo (richiede auth)
- `GET /api/vehicles/:id` - Dettagli veicolo (richiede auth)
- `PUT /api/vehicles/:id` - Aggiorna veicolo (richiede auth)
- `DELETE /api/vehicles/:id` - Elimina veicolo (richiede auth)

### Notifiche
- `GET /api/notifications` - Lista notifiche (richiede auth)
- `GET /api/notifications/stats` - Statistiche dashboard (richiede auth)
- `PUT /api/notifications/:id` - Aggiorna notifica (richiede auth)

## Sviluppo

### Backend
```bash
cd backend
npm run dev        # Avvia in modalità sviluppo
npm test           # Esegui test (node:test + supertest, nessun DB richiesto)
npm run migrate    # Crea/allinea lo schema del database (richiede DATABASE_URL)
```

### Frontend
```bash
cd frontend
npm run dev        # Avvia in modalità sviluppo
npm run build      # Build per produzione
npm run preview    # Anteprima build di produzione
```

## Supporto

Per problemi o domande, apri una issue su GitHub.

## Licenza

Questo progetto è open source e disponibile per uso personale.