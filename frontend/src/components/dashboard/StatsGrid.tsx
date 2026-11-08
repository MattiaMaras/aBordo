import React from 'react';
import { Car, AlertTriangle, Euro, CalendarClock, ArrowUpRight } from 'lucide-react';
import type { VehicleNotification } from '../../types/vehicle';

interface Summary {
  expired: number;
  critical: number;
  warning: number;
  actionable: VehicleNotification[];
  most: VehicleNotification | null;
}

interface StatsGridProps {
  vehiclesCount: number;
  monthlyCosts: number;
  summary: Summary;
  /** Dati ancora in caricamento: mostra segnaposto invece di zeri ingannevoli */
  pending?: boolean;
  vehicleLabel: (vehicleId: string) => string;
  onDeadlinesClick: () => void;
  onCostsClick: () => void;
}

const eur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Ogni card è un vero pulsante: cliccabile, focalizzabile da tastiera, con risposta al tocco.
const StatCard: React.FC<{
  title: string; icon: React.ElementType; tone: string; onClick: () => void; ariaLabel: string; children: React.ReactNode;
}> = ({ title, icon: Icon, tone, onClick, ariaLabel, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className="group text-left rounded-xl border border-gray-200 bg-surface p-5 shadow-md transition-[transform,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-gray-300 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
  >
    <div className="flex items-start justify-between mb-3">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <ArrowUpRight className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-700" aria-hidden="true" />
    </div>
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    {children}
  </button>
);

export const StatsGrid: React.FC<StatsGridProps> = ({ vehiclesCount, monthlyCosts, summary, pending = false, vehicleLabel, onDeadlinesClick, onCostsClick }) => {
  const total = summary.actionable.length;
  const worst = summary.expired > 0 ? 'text-red-700 bg-red-50' : summary.critical > 0 ? 'text-orange-700 bg-orange-50' : total > 0 ? 'text-yellow-700 bg-yellow-50' : 'text-green-700 bg-green-50';
  const parts = [
    summary.expired > 0 && plural(summary.expired, 'scaduta', 'scadute'),
    summary.critical > 0 && plural(summary.critical, 'urgente', 'urgenti'),
    summary.warning > 0 && plural(summary.warning, 'in scadenza', 'in scadenza'),
  ].filter(Boolean) as string[];
  const most = summary.most;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard title="Veicoli" icon={Car} tone="text-blue-600 bg-blue-50" ariaLabel="Vai ai tuoi veicoli"
        onClick={() => document.getElementById('veicoli')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
        <p className="text-2xl font-semibold text-gray-900 font-mono tabular-nums">{vehiclesCount}</p>
        <p className="text-xs text-gray-500 mt-1">Registrati</p>
      </StatCard>

      <StatCard title="Scadenze da gestire" icon={AlertTriangle} tone={worst} ariaLabel={`Apri le scadenze: ${total} da gestire`} onClick={onDeadlinesClick}>
        <p className="text-2xl font-semibold text-gray-900 font-mono tabular-nums">{pending ? '—' : total}</p>
        <p className="text-xs text-gray-500 mt-1">{pending ? 'Calcolo in corso…' : total === 0 ? 'Tutto in regola' : parts.join(' · ')}</p>
      </StatCard>

      <StatCard title="Più urgente" icon={CalendarClock} tone="text-orange-700 bg-orange-50" ariaLabel="Apri la scadenza più urgente" onClick={onDeadlinesClick}>
        {pending ? (
          <p className="text-base font-semibold text-gray-500">—</p>
        ) : most ? (
          <>
            <p className="text-base font-semibold text-gray-900 truncate">{most.label || most.message}</p>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {vehicleLabel(most.vehicleId)}{' · '}
              {typeof most.kmUntil === 'number'
                ? (most.kmUntil <= 0 ? 'km superati' : `${most.kmUntil.toLocaleString()} km`)
                : (most.daysUntilExpiry < 0 ? `scaduta da ${Math.abs(most.daysUntilExpiry)} g` : most.daysUntilExpiry === 0 ? 'scade oggi' : `${most.daysUntilExpiry} giorni`)}
            </p>
          </>
        ) : (
          <>
            <p className="text-base font-semibold text-gray-900">Nessuna</p>
            <p className="text-xs text-gray-500 mt-1">Niente da fare per ora</p>
          </>
        )}
      </StatCard>

      <StatCard title="Costi del mese" icon={Euro} tone="text-green-700 bg-green-50" ariaLabel="Apri i costi" onClick={onCostsClick}>
        <p className="text-2xl font-semibold text-gray-900 font-mono tabular-nums">{pending ? '—' : eur(monthlyCosts)}</p>
        <p className="text-xs text-gray-500 mt-1">Interventi e pagamenti</p>
      </StatCard>
    </div>
  );
};
