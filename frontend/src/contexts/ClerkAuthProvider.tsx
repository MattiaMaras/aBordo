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

  useEffect(() => {
    setTokenProvider(() => getToken());
    return () => setTokenProvider(null);
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setUser(null); return; }
    let cancelled = false;
    setProfileLoading(true);
    apiFetch(`${API_URL}/auth/profile`, {}, { skipUnauthorizedHandler: true })
      .then(async (res) => {
        if (!res.ok) throw new Error('Profilo non disponibile');
        const data = await res.json();
        if (!cancelled) setUser(data.user);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Errore'); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
