export const CLERK_PUBLISHABLE_KEY: string = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

// Clerk è DISPONIBILE se la chiave è impostata, ma si ATTIVA solo su richiesta:
//   /?clerk=1  attiva Clerk su questo browser (resta attivo)
//   /?clerk=0  torna al login attuale
// Così gli utenti non ancora importati in Clerk continuano a entrare con il login di sempre,
// mentre tu puoi provare Clerk anche in produzione. Quando tutti gli utenti sono stati importati
// si potrà rendere Clerk il default.
const STORAGE_KEY = 'abordo_clerk';

const resolveEnabled = (): boolean => {
  if (!CLERK_PUBLISHABLE_KEY || typeof window === 'undefined') return false;
  try {
    const flag = new URLSearchParams(window.location.search).get('clerk');
    if (flag === '1') localStorage.setItem(STORAGE_KEY, '1');
    if (flag === '0') localStorage.removeItem(STORAGE_KEY);
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export const CLERK_ENABLED = resolveEnabled();
