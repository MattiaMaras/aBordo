import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { AuthContext } from './AuthContext';
import type { AuthContextType, User } from '../types/auth';
import { API_URL, apiFetch, setTokenProvider } from '../api/client';

// Stesso contratto di AuthProvider, ma l'identità arriva da Clerk. Il profilo (id interno,
// nome, email) resta quello del nostro database: la prima chiamata a /auth/profile collega
// (o crea) la riga `users` corrispondente all'utente Clerk.
export const ClerkAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const [user, setUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0); // incrementato da «Riprova»

  useEffect(() => {
    setTokenProvider(() => getToken());
    return () => setTokenProvider(null);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setUser(null); return; }
    let cancelled = false;
    setProfileLoading(true);
    setError(null);
    apiFetch(`${API_URL}/auth/profile`, {}, { skipUnauthorizedHandler: true })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Il server ha risposto con errore ${res.status}`);
        const data = await res.json();
        if (!cancelled) setUser(data.user);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Errore'); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, attempt]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const res = await apiFetch(`${API_URL}/auth/profile`, { method: 'PUT', body: JSON.stringify(updates) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || 'Errore nell\'aggiornamento del profilo' };
    setUser(data.user);
    return { success: true };
  }, []);

  const unsupported = useCallback(async () => ({ success: false, error: 'Accesso gestito da Clerk' }), []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    initializing: !isLoaded || (isSignedIn === true && !user && !error) || profileLoading && !user,
    loading: false,
    error,
    login: unsupported,
    register: unsupported,
    logout: () => { void signOut(); setUser(null); },
    updateProfile,
  }), [user, isLoaded, isSignedIn, profileLoading, error, unsupported, signOut, updateProfile]);

  // Clerk ti ha autenticato ma il nostro server non carica il profilo: lo diciamo chiaramente
  // invece di rimandarti al form di accesso (che spingerebbe a ripetere i tentativi).
  if (isLoaded && isSignedIn && !user && error && !profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" role="alert">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-surface p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Accesso riuscito, ma qualcosa non va</h1>
          <p className="text-gray-600 mb-1">Non riesco a caricare il tuo profilo.</p>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium" style={{ color: '#0A0C10' }}>Riprova</button>
            <button type="button" onClick={() => { void signOut(); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Esci</button>
          </div>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
