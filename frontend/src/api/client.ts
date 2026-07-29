// Client API centralizzato: base URL, credenziali cookie, fallback Bearer,
// backoff su 429 e gestione globale delle sessioni scadute (401).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TOKEN_KEY = 'token';

// Il token nel localStorage resta come fallback: in produzione frontend (vercel.app)
// e backend (onrender.com) sono su domini diversi e alcuni browser (Safari) bloccano
// i cookie third-party. Il backend imposta comunque un cookie HttpOnly che, dove
// accettato, è la fonte di autenticazione preferita.
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

// Handler globale invocato quando il server risponde 401 (sessione scaduta):
// registrato dall'AuthProvider per fare logout e tornare alla landing.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

export interface ApiFetchOptions {
  retries?: number;
  baseDelayMs?: number;
  // Da usare per login/register/check iniziale, dove un 401 è un esito atteso
  // e non deve scatenare il logout globale.
  skipUnauthorizedHandler?: boolean;
}

export const apiFetch = async (
  input: RequestInfo,
  init: RequestInit = {},
  options: ApiFetchOptions = {}
): Promise<Response> => {
  const { retries = 2, baseDelayMs = 500, skipUnauthorizedHandler = false } = options;

  const mergedInit: RequestInit = {
    ...init,
    credentials: 'include',
    headers: {
      ...getAuthHeaders(),
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  };

  let response = await fetch(input, mergedInit);
  for (let attempt = 0; attempt < retries && response.status === 429; attempt++) {
    const waitMs = baseDelayMs * (attempt + 1);
    await new Promise((res) => setTimeout(res, waitMs));
    response = await fetch(input, mergedInit);
  }

  if (response.status === 401 && !skipUnauthorizedHandler) {
    clearToken();
    onUnauthorized?.();
  }

  return response;
};

// Deprecato: alias mantenuto per compatibilità, usa apiFetch nelle nuove chiamate.
export const requestWithBackoff = apiFetch;
