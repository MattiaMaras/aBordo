export const CLERK_PUBLISHABLE_KEY: string = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

// Con la chiave impostata l'accesso passa da Clerk PER TUTTI (tutti gli utenti sono stati importati).
// Via di fuga per emergenze: /?clerk=0 riporta questo browser al login interno, /?clerk=1 lo rimette su Clerk.
// Senza chiave (VITE_CLERK_PUBLISHABLE_KEY vuota) l'app usa sempre il login interno.
const STORAGE_KEY = 'abordo_clerk_off';

const resolveEnabled = (): boolean => {
  if (!CLERK_PUBLISHABLE_KEY || typeof window === 'undefined') return false;
  try {
    const flag = new URLSearchParams(window.location.search).get('clerk');
    if (flag === '0') localStorage.setItem(STORAGE_KEY, '1');
    if (flag === '1') localStorage.removeItem(STORAGE_KEY);
    return localStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
};

export const CLERK_ENABLED = resolveEnabled();
