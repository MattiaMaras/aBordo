import type { MaintenanceRecord } from '../types/maintenance';

// Soglie (km residui) oltre le quali una manutenzione a chilometri diventa urgente.
// L'AdBlue consuma in modo variabile e la spia si accende con poco margine: avvisiamo prima.
export const kmThresholds = (type: MaintenanceRecord['type']): { critical: number; warning: number } =>
  type === 'adblue' ? { critical: 500, warning: 1500 } : { critical: 250, warning: 600 };

export const kmStatus = (type: MaintenanceRecord['type'], kmUntil: number): 'expired' | 'critical' | 'warning' | 'safe' => {
  const t = kmThresholds(type);
  if (kmUntil <= 0) return 'expired';
  if (kmUntil <= t.critical) return 'critical';
  if (kmUntil <= t.warning) return 'warning';
  return 'safe';
};

export const MILEAGE_STALE_DAYS = 30;

// I km sono "vecchi" se non aggiornati da più di N giorni: le scadenze a km non sono più affidabili.
export const daysSince = (iso: string | undefined): number => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};
