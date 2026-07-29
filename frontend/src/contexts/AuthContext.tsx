import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, LoginCredentials, RegisterData } from '../types/auth';
import { API_URL, apiFetch, setToken, clearToken, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [registerInProgress, setRegisterInProgress] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Sessione scaduta (401 su qualunque chiamata): torna allo stato non autenticato
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Check if user is already logged in on mount (initializing only)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Cookie HttpOnly o token salvato: apiFetch li invia entrambi.
        // skipUnauthorizedHandler: un 401 qui è solo "non loggato", non un errore.
        const response = await apiFetch(`${API_URL}/auth/profile`, {}, { skipUnauthorizedHandler: true });

        if (response.ok) {
          const data = await response.json();
          setUser(data?.user ?? null);
        } else {
          clearToken();
          setUser(null);
        }
      } catch (error) {
        console.error('Errore nel controllo autenticazione:', error);
        setUser(null);
      }
      setInitializing(false);
    };

    checkAuth();
  }, []);

  // Tick del countdown di cooldown (per 429)
  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining <= 0) {
        setCooldownUntil(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const login = async (credentials: LoginCredentials) => {
    try {
      if (loginInProgress) {
        return { success: false, error: 'Login già in corso' };
      }
      setLoginInProgress(true);
      setError(null);
      setLoading(true);

      // Niente retry sul login (retries: 0): evita tentativi multipli che generano 429
      const response = await apiFetch(`${API_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify(credentials),
      }, { retries: 0, skipUnauthorizedHandler: true });

      const isJson = response.headers.get('content-type')?.includes('application/json');
      let data: any = null;
      try {
        data = isJson ? await response.json() : await response.text();
      } catch {
        data = null;
      }
      const getErrorMessage = (): string | undefined => {
        if (!data) return undefined;
        if (typeof data === 'string') return data;
        if (typeof data === 'object') return (data.error || data.message);
        return undefined;
      };

      if (response.status === 429) {
        const retryHeader = response.headers.get('Retry-After');
        const retrySec = retryHeader ? parseInt(retryHeader, 10) : 30;
        const until = Date.now() + (Number.isFinite(retrySec) ? retrySec : 30) * 1000;
        setCooldownUntil(until);
        setCooldownSeconds(Number.isFinite(retrySec) ? retrySec : 30);
        const detailed = getErrorMessage() || `Troppe richieste. Attendi ${Number.isFinite(retrySec) ? retrySec : 30} secondi e riprova.`;
        setError(detailed);
        return { success: false, error: detailed };
      }

      if (!response.ok) {
        const msg = getErrorMessage() || 'Credenziali non valide';
        setError(msg);
        return { success: false, error: msg };
      }

      if (!isJson || typeof data !== 'object' || !data.token || !data.user) {
        setError('Risposta non valida dal server');
        return { success: false, error: 'Risposta non valida dal server' };
      }
      // Il backend imposta anche un cookie HttpOnly; il token salvato resta
      // come fallback per i browser che bloccano i cookie cross-site.
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore nel login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      setLoginInProgress(false);
    }
  };

  const register = async (credentials: RegisterData) => {
    try {
      if (registerInProgress) {
        return { success: false, error: 'Registrazione già in corso' };
      }
      setRegisterInProgress(true);
      setError(null);
      setLoading(true);

      const response = await apiFetch(`${API_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(credentials),
      }, { skipUnauthorizedHandler: true });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nella registrazione');
      }

      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore nella registrazione';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      setRegisterInProgress(false);
    }
  };

  const logout = () => {
    // Invalida il cookie HttpOnly lato server; best-effort, lo stato locale
    // viene comunque azzerato subito.
    apiFetch(`${API_URL}/auth/logout`, { method: 'POST' }, { skipUnauthorizedHandler: true })
      .catch(() => undefined);
    clearToken();
    setUser(null);
    setError(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      const response = await apiFetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nell\'aggiornamento del profilo');
      }

      setUser(data.user);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore nell\'aggiornamento del profilo';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    initializing,
    login,
    register,
    logout,
    loading,
    error,
    updateProfile,
    cooldownSeconds,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
