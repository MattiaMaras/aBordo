import React, { useEffect, useState } from 'react';
import { X, Settings } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL, getAuthHeaders } from '../../api/client';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { user } = useAuth();

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    weeklySummary: true,
  });
  const [profile, setProfile] = useState<{ firstName: string; lastName: string } | null>(
    user ? { firstName: user.firstName, lastName: user.lastName } : null
  );
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [sendingNow, setSendingNow] = useState(false);
  const [sendErrors, setSendErrors] = useState<Array<{ notificationId?: number | string; message?: string }>>([]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/profile`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const p = data?.user;
        if (p) {
          setProfile({ firstName: p.firstName, lastName: p.lastName });
          setPreferences((prev) => ({ ...prev, emailNotifications: Boolean(p.emailNotifications) }));
        }
      } catch {
        // Silenzioso
      }
    };
    loadProfile();
  }, []);

  const handleToggle = async (key: 'emailNotifications' | 'weeklySummary') => {
    const next = !preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: next }));

    if (key === 'emailNotifications') {
      if (!profile) return;
      setSaving(true);
      setStatusMsg(null);
      try {
        const res = await fetch(`${API_URL}/auth/profile`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            firstName: profile.firstName,
            lastName: profile.lastName,
            emailNotifications: next,
          }),
        });
        if (res.ok) {
          setStatusMsg(next ? 'Notifiche email attivate' : 'Notifiche email disattivate');
        } else {
          const data = await res.json().catch(() => ({}));
          setStatusMsg(data?.error || 'Errore nel salvataggio delle impostazioni');
          setPreferences((prev) => ({ ...prev, [key]: !next }));
        }
      } catch (e) {
        setStatusMsg('Errore di rete nel salvataggio impostazioni');
        setPreferences((prev) => ({ ...prev, [key]: !next }));
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Impostazioni</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Notifiche Email</p>
              <p className="text-xs text-gray-500">Ricevi notifiche via email</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.emailNotifications}
              onChange={() => handleToggle('emailNotifications')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text.sm font-medium text-gray-700">Promemoria Settimanali</p>
              <p className="text-xs text-gray-500">Riepilogo settimanale delle scadenze</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.weeklySummary}
              onChange={() => handleToggle('weeklySummary')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          {statusMsg && (
            <p className="text-xs text-gray-600">{statusMsg}</p>
          )}
          {sendErrors && sendErrors.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-xs font-medium text-red-700 mb-1">Dettagli errori invio email:</p>
              <ul className="space-y-1">
                {sendErrors.map((err, idx) => (
                  <li key={idx} className="text-xs text-red-700">
                    {typeof err.notificationId !== 'undefined' ? `Notifica ${String(err.notificationId)}: ` : ''}
                    {err.message || 'Errore sconosciuto'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div>
            <Button
              variant="secondary"
              onClick={async () => {
                setSendingNow(true);
                setStatusMsg(null);
                setSendErrors([]);
                try {
                  const res = await fetch(`${API_URL}/notifications/send-emails`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setStatusMsg(`Email inviate: ${data.sent} / ${data.processed}`);
                    if (Array.isArray(data.errors) && data.errors.length > 0) {
                      setSendErrors(data.errors);
                    }
                  } else {
                    const data = await res.json().catch(() => ({}));
                    setStatusMsg(data?.error || 'Errore nell\'invio email');
                  }
                } catch (e) {
                  setStatusMsg('Errore di rete nell\'invio email');
                } finally {
                  setSendingNow(false);
                }
              }}
              disabled={saving || sendingNow}
            >
              {sendingNow ? 'Invio in corso…' : 'Invia promemoria email ora'}
            </Button>
          </div>
          <Button onClick={onClose} disabled={saving || sendingNow}>Chiudi</Button>
        </div>
      </div>
    </div>
  );
};
