-- Fase 1 migrazione Clerk: SOLO additiva e reversibile. Non modifica né cancella dati esistenti.
-- Idempotente: si può eseguire più volte.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_id_key ON users (clerk_id) WHERE clerk_id IS NOT NULL;
COMMIT;

-- Rollback (solo se serve annullare la fase 1):
--   DROP INDEX IF EXISTS users_clerk_id_key;
--   ALTER TABLE users DROP COLUMN IF EXISTS clerk_id;
