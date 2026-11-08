import type { Vehicle, VehicleNotification, NotificationStatus, Service } from '../types/vehicle';
import type { MaintenanceRecord } from '../types/maintenance';
import { getDaysUntilExpiry, getNotificationStatus } from './dateUtils';
import { kmStatus } from './maintenanceUtils';

// UNICA sorgente di verità per le scadenze: campanella, contatore, Centro Notifiche,
// modale e pagina Scadenze leggono tutti da qui, quindi i numeri coincidono sempre.

export const MAINTENANCE_LABELS: Record<string, string> = {
  oil: 'Cambio olio', filters: 'Filtri', brakes: 'Freni', tires: 'Gomme',
  adblue: 'AdBlue', other: 'Manutenzione',
};

const STATUS_RANK: Record<NotificationStatus, number> = { expired: 0, critical: 1, warning: 2, safe: 3 };

export const isActionable = (n: { status: NotificationStatus }) => n.status !== 'safe';

interface Sources {
  vehicles: Vehicle[];
  /** Scadenze a data calcolate dal server (assicurazione, bollo, revisione) */
  notifications: VehicleNotification[];
  maintenancesByVehicle: Record<string, MaintenanceRecord[]>;
  servicesByVehicle: Record<string, Service[]>;
}

export const buildDeadlines = ({ vehicles, notifications, maintenancesByVehicle, servicesByVehicle }: Sources): VehicleNotification[] => {
  const list: VehicleNotification[] = [];

  // Assicurazione, bollo, revisione: dal server. Le manutenzioni le ricalcoliamo qui (data e km).
  notifications
    .filter((n) => n.type !== 'maintenance')
    .forEach((n) => list.push(n));

  vehicles.forEach((v) => {
    const vid = String(v.id);
    const current = v.currentMileage ?? 0;

    (maintenancesByVehicle[vid] ?? []).forEach((m) => {
      const label = m.type === 'other' ? (m.title || m.description || MAINTENANCE_LABELS.other) : (MAINTENANCE_LABELS[m.type] ?? 'Manutenzione');
      if (typeof m.nextMileage === 'number' && m.nextMileage > 0) {
        const kmUntil = m.nextMileage - current;
        list.push({
          id: `maintenance-km-${vid}-${m.id}`, vehicleId: vid, type: 'maintenance', label,
          status: kmStatus(m.type, kmUntil), daysUntilExpiry: kmUntil <= 0 ? -999999 : 999999,
          message: kmUntil <= 0 ? `${label}: superati ${Math.abs(kmUntil).toLocaleString()} km` : `${label} tra ${kmUntil.toLocaleString()} km`,
          expiryDate: '', kmUntil, nextMileage: m.nextMileage, description: m.description,
        });
      } else if (m.nextDue) {
        const days = getDaysUntilExpiry(m.nextDue);
        list.push({
          id: `maintenance-${vid}-${m.id}`, vehicleId: vid, type: 'maintenance', label,
          status: getNotificationStatus(days), daysUntilExpiry: days,
          message: days < 0 ? `${label} scaduta da ${Math.abs(days)} giorni` : `${label} tra ${days} giorni`,
          expiryDate: m.nextDue, description: m.description,
        });
      }
    });

    // Tagliando: solo l'ultimo per veicolo conta (i precedenti sono storico)
    const latest = (servicesByVehicle[vid] ?? [])
      .filter((s) => typeof s.nextServiceMileage === 'number' && s.nextServiceMileage > 0)
      .sort((a, b) => String(b.lastServiceDate).localeCompare(String(a.lastServiceDate)))[0];
    if (latest) {
      const kmUntil = latest.nextServiceMileage - current;
      list.push({
        id: `service-km-${vid}-${latest.id}`, vehicleId: vid, type: 'service', label: 'Tagliando',
        status: kmStatus('service', kmUntil), daysUntilExpiry: kmUntil <= 0 ? -999999 : 999999,
        message: kmUntil <= 0 ? `Tagliando: superati ${Math.abs(kmUntil).toLocaleString()} km` : `Tagliando tra ${kmUntil.toLocaleString()} km`,
        expiryDate: '', kmUntil, nextMileage: latest.nextServiceMileage, nextServiceMileage: latest.nextServiceMileage, kmUntilService: kmUntil,
      });
    }
  });

  // Ordine: prima per gravità (scadute → urgenti → in scadenza → ok), poi per vicinanza
  const closeness = (n: VehicleNotification) => (typeof n.kmUntil === 'number' ? n.kmUntil / 40 : n.daysUntilExpiry);
  return list.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || closeness(a) - closeness(b));
};

export const summarize = (deadlines: VehicleNotification[]) => {
  const actionable = deadlines.filter(isActionable);
  return {
    actionable,
    expired: actionable.filter((d) => d.status === 'expired').length,
    critical: actionable.filter((d) => d.status === 'critical').length,
    warning: actionable.filter((d) => d.status === 'warning').length,
    most: actionable[0] ?? null,
  };
};
