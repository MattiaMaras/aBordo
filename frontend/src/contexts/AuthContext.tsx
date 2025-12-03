import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, LoginCredentials, RegisterData } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

  // Wrapper con backoff per gestire 429 Too Many Requests
  const requestWithBackoff = async (input: RequestInfo, init?: RequestInit, retries = 2, baseDelayMs = 500) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const response = await fetch(input, init);
      if (response.status !== 429) {
        return response;
      }
      const waitMs = baseDelayMs * (attempt + 1);
      await new Promise(res => setTimeout(res, waitMs));
    }
    return fetch(input, init);
  };

  // Check if user is already logged in on mount (initializing only)
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await requestWithBackoff(`${API_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data?.user ?? null);
          } else {
            // Token is invalid or expired
            localStorage.removeItem('token');
            setUser(null);
          }
        } catch (error) {
          console.error('Errore nel controllo autenticazione:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
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

      // Niente backoff sul login: evita retry multipli che generano 429
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

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
      localStorage.setItem('token', data.token);
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

      const response = await requestWithBackoff(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nella registrazione');
      }

      localStorage.setItem('token', data.token);
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
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Non autenticato');

      const response = await requestWithBackoff(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
