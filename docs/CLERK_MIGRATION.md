# Migrazione a Clerk: strategia

## Decisione: restare su Neon, aggiungere solo Clerk
- Neon è già Postgres: il backend Express usa `pg` e non cambia.
- Supabase darebbe Auth, RLS e storage, ma qui l'auth passa a Clerk e il backend filtra già per `user_id`. Migrare il database significherebbe spostare dati in produzione senza nessun beneficio.
- Neon offre branching e ripristino a un punto nel tempo: sono gli strumenti giusti per provare ogni passo senza rischi.

## Stato attuale (da codice)
- `users`: `id SERIAL`, `email` unica, `password` (bcrypt), nome e cognome.
- Tutte le tabelle puntano a `users.id` (`vehicles.user_id`, con `ON DELETE CASCADE`).
- Sessione: JWT firmato da noi, cookie HttpOnly più header Bearer.

## Regola cardine: `users.id` non cambia mai
Veicoli, scadenze e storico restano agganciati allo stesso id. Clerk si collega con una colonna in più (`clerk_id`), e in Clerk si imposta `external_id = users.id`. Il legame è tracciabile da entrambe le parti.

## Mappatura vecchio id e nuovo id
| Dove | Campo | Valore |
|---|---|---|
| DB | `users.id` | invariato |
| DB | `users.clerk_id` (nuovo, unico, nullable) | `user_xxx` di Clerk |
| Clerk | `external_id` | `users.id` come testo |

Nel backend: il token Clerk viene verificato, `sub` = clerk_id, e si carica la riga `users` con quel clerk_id. Il resto del codice continua a usare `req.user.id` com'è oggi.

## Utenti attuali senza perdere l'accesso
Clerk accetta l'importazione dell'hash bcrypt tramite la Backend API (`password_digest` + `password_hasher: bcrypt`). Gli hash di bcryptjs (`$2a$`) sono compatibili: **nessuno deve reimpostare la password**. Lo script è `backend/scripts/clerk-import-users.js`.

Da verificare sull'istanza di sviluppo prima di procedere: che la password importata funzioni al login, e se le email importate risultano verificate (altrimenti Clerk chiederà una verifica al primo accesso).

## Fasi (ognuna reversibile, doppio sistema di accesso fino alla fine)
1. **Preparazione (nessun impatto sugli utenti)**
   - Eseguire `backend/migrations/001_add_clerk_id.sql` (additiva e idempotente, con rollback commentato).
   - Fare un branch Neon da produzione e un backup.
2. **Prova generale su branch Neon e Clerk Development**
   - `node scripts/clerk-import-users.js` (dry-run di default), poi `--apply --limit 5`, poi tutti.
   - Verificare accesso con la vecchia password, conteggi e casi di errore.
3. **Backend a doppia autenticazione**
   - Il middleware accetta il token Clerk oppure il JWT attuale.
   - Gli utenti non ancora migrati non si accorgono di nulla.
4. **Frontend**
   - `ClerkProvider` al posto di `LoginForm`/`RegisterForm`; `apiFetch` invia il token di sessione Clerk.
   - Con Clerk in produzione servono un dominio e le chiavi di produzione: va configurato un dominio proprio per Clerk. Un dominio condiviso tra frontend (Vercel) e backend (Render) risolve anche il problema dei cookie tra domini diversi, già noto.
5. **Importazione in produzione**
   - Dopo un backup: `--apply` sull'istanza di produzione, con report finale e zero errori richiesti.
   - Lazy-link di chi si registra dopo: se un'email esiste già con `clerk_id` nullo, collegare solo dopo la verifica dell'email.
6. **Pulizia (settimane dopo, solo se tutto è stabile)**
   - Rimuovere il JWT interno e i form; rendere `users.password` nullable e poi eliminarla. Questa è l'unica fase non banalmente reversibile: va fatta per ultima, dopo un backup.

## Rischi e contromisure
| Rischio | Contromisura |
|---|---|
| Password importate non funzionanti | Provare su sviluppo prima; tenere attivo il vecchio login finché non è verificato |
| Email duplicate o già presenti in Clerk | Lo script collega l'utente esistente invece di fallire |
| Limiti di velocità dell'API Clerk | Pausa tra le chiamate e gestione dei 429 |
| Errore a metà importazione | Lo script è ripetibile: salta chi ha già un `clerk_id` |
| Perdita di dati | `users.id` non cambia; lo script scrive solo `clerk_id` |

## Cosa serve da te
- Un account Clerk con istanza di sviluppo (`CLERK_SECRET_KEY`).
- Un branch Neon per la prova.
- La decisione sul dominio per l'ambiente di produzione.
