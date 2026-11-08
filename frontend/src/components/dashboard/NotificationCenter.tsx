import React from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import type { Vehicle, VehicleNotification } from '../../types/vehicle';
import { formatDate } from '../../utils/dateUtils';

interface NotificationCenterProps {
  notifications: VehicleNotification[];
  vehicles?: Vehicle[];
  pending?: boolean;
  onViewAll?: () => void;
  /** Quante scadenze mostrare nel riquadro; il totale resta quello della campanella */
  limit?: number;
}

const TYPE_LABELS: Record<string, string> = {
  insurance: 'Assicurazione', tax: 'Bollo', inspection: 'Revisione', service: 'Tagliando', maintenance: 'Manutenzione',
};

const STATUS_TEXT = { expired: 'SCADUTA', critical: 'URGENTE', warning: 'IN SCADENZA', safe: 'OK' } as const;

const icon = (status: string) => {
  switch (status) {
    case 'warning': return <Clock className="h-5 w-5 text-yellow-500" aria-hidden="true" />;
    case 'critical': return <AlertCircle className="h-5 w-5 text-orange-500" aria-hidden="true" />;
    case 'expired': return <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />;
    default: return <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />;
  }
};

const when = (n: VehicleNotification) => {
  if (typeof n.kmUntil === 'number') return n.kmUntil <= 0 ? 'Km superati' : `${n.kmUntil.toLocaleString()} km rimanenti`;
  if (n.daysUntilExpiry < 0) return `Scaduta da ${Math.abs(n.daysUntilExpiry)} giorni`;
  if (n.daysUntilExpiry === 0) return 'Scade oggi';
  return `${formatDate(n.expiryDate)} · tra ${n.daysUntilExpiry} giorni`;
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, vehicles = [], onViewAll, limit = 6, pending = false }) => {
  const byId = new Map(vehicles.map((v) => [String(v.id), v]));

  if (pending) {
    return (
      <Card className="p-6" >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Centro Notifiche</h3>
        <p className="text-sm text-gray-500 py-8 text-center" aria-busy="true">Controllo le scadenze…</p>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Centro Notifiche</h3>
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-700">Nessuna scadenza da gestire</p>
          <p className="text-sm text-gray-500 mt-2">Tutti i tuoi veicoli sono in regola</p>
        </div>
      </Card>
    );
  }

  const shown = notifications.slice(0, limit);
  const rest = notifications.length - shown.length;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Centro Notifiche
        <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full font-mono">{notifications.length}</span>
      </h3>

      <ul className="space-y-3">
        {shown.map((n) => {
          const v = byId.get(String(n.vehicleId));
          return (
            <li key={n.id} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
              <span className="mt-0.5">{icon(n.status)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{n.label || TYPE_LABELS[n.type]}</p>
                  <StatusBadge status={n.status}>{STATUS_TEXT[n.status]}</StatusBadge>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{when(n)}</p>
                {v && <p className="text-xs text-gray-500 mt-0.5 truncate">{v.brand} {v.model} · <span className="font-mono">{v.plateNumber}</span></p>}
              </div>
            </li>
          );
        })}
      </ul>

      {onViewAll && (
        <button onClick={onViewAll} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
          {rest > 0 ? `Vedi tutte le ${notifications.length} scadenze` : 'Vedi tutte le scadenze'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </Card>
  );
};
