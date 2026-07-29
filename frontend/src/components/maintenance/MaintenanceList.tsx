import React, { useMemo, useState } from 'react';
import {
  Calendar, MapPin, Euro, Wrench, CheckCircle, Shield, CreditCard, Circle,
  Droplets, Fuel, Filter as FilterIcon, AlertTriangle, Settings,
  Search, Pencil, Trash2, Check, X, Plus, ListX
} from 'lucide-react';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { MaintenanceRecord } from '../../types/maintenance';
import { formatDate } from '../../utils/dateUtils';

type UrgencyStatus = 'expired' | 'critical' | 'warning' | 'safe' | null;

interface MaintenanceListProps {
  maintenances: MaintenanceRecord[];
  currentMileage?: number;
  onEdit?: (maintenance: MaintenanceRecord) => void;
  onDelete?: (maintenanceId: string) => Promise<{ success: boolean; error?: string }> | void;
  onAddNew?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  service: 'Tagliando',
  inspection: 'Revisione',
  insurance: 'Assicurazione',
  tax: 'Bollo Auto',
  tires: 'Pneumatici',
  adblue: 'AdBlue',
  oil: 'Cambio Olio',
  filters: 'Filtri',
  brakes: 'Freni',
  other: 'Altro',
};

const STATUS_LABELS: Record<Exclude<UrgencyStatus, null>, string> = {
  expired: 'SCADUTA',
  critical: 'URGENTE',
  warning: 'IN SCADENZA',
  safe: 'OK',
};

const getMaintenanceIcon = (type: string) => {
  switch (type) {
    case 'service': return <Wrench className="h-5 w-5" />;
    case 'inspection': return <CheckCircle className="h-5 w-5" />;
    case 'insurance': return <Shield className="h-5 w-5" />;
    case 'tax': return <CreditCard className="h-5 w-5" />;
    case 'tires': return <Circle className="h-5 w-5" />;
    case 'adblue': return <Droplets className="h-5 w-5" />;
    case 'oil': return <Fuel className="h-5 w-5" />;
    case 'filters': return <FilterIcon className="h-5 w-5" />;
    case 'brakes': return <AlertTriangle className="h-5 w-5" />;
    default: return <Settings className="h-5 w-5" />;
  }
};

const getMaintenanceColor = (type: string) => {
  switch (type) {
    case 'service': return 'text-blue-600 bg-blue-50';
    case 'inspection': return 'text-green-600 bg-green-50';
    case 'insurance': return 'text-purple-600 bg-purple-50';
    case 'tax': return 'text-orange-600 bg-orange-50';
    case 'tires': return 'text-gray-600 bg-gray-50';
    case 'adblue': return 'text-cyan-600 bg-cyan-50';
    case 'oil': return 'text-yellow-600 bg-yellow-50';
    case 'filters': return 'text-indigo-600 bg-indigo-50';
    case 'brakes': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

const getNextDueStatus = (maintenance: MaintenanceRecord, currentMileage: number): UrgencyStatus => {
  if (maintenance.nextDue) {
    const today = new Date();
    const nextDue = new Date(maintenance.nextDue);
    const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'expired';
    if (diffDays <= 7) return 'critical';
    if (diffDays <= 30) return 'warning';
    return 'safe';
  }
  if (typeof maintenance.nextMileage === 'number' && maintenance.nextMileage > 0) {
    const kmUntil = maintenance.nextMileage - currentMileage;
    if (kmUntil <= 0) return 'expired';
    if (kmUntil <= 250) return 'critical';
    if (kmUntil <= 600) return 'warning';
    return 'safe';
  }
  return null;
};

const priorityRank = (status: UrgencyStatus): number => {
  switch (status) {
    case 'expired': return 0;
    case 'critical': return 1;
    case 'warning': return 2;
    case 'safe': return 3;
    default: return 4;
  }
};

type StatusFilter = 'all' | 'expired' | 'critical' | 'warning' | 'safe' | 'none';

export const MaintenanceList: React.FC<MaintenanceListProps> = ({
  maintenances,
  currentMileage = 0,
  onEdit,
  onDelete,
  onAddNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MaintenanceRecord['type']>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const typesPresent = useMemo(() => {
    const set = new Set(maintenances.map(m => m.type));
    return Array.from(set);
  }, [maintenances]);

  const enriched = useMemo(() => (
    maintenances.map(m => ({ record: m, status: getNextDueStatus(m, currentMileage) }))
  ), [maintenances, currentMileage]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enriched
      .filter(({ record, status }) => {
        if (typeFilter !== 'all' && record.type !== typeFilter) return false;
        if (statusFilter !== 'all') {
          if (statusFilter === 'none' ? status !== null : status !== statusFilter) return false;
        }
        if (q) {
          const haystack = `${record.title} ${record.description ?? ''} ${record.location ?? ''}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const rankDiff = priorityRank(a.status) - priorityRank(b.status);
        if (rankDiff !== 0) return rankDiff;
        if (a.status && b.status && a.record.nextDue && b.record.nextDue) {
          return a.record.nextDue.localeCompare(b.record.nextDue);
        }
        // Nessuna scadenza confrontabile: interventi più recenti prima
        return b.record.date.localeCompare(a.record.date);
      });
  }, [enriched, searchQuery, typeFilter, statusFilter]);

  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  const handleDeleteClick = (id: string) => {
    setConfirmingDeleteId(id);
  };

  const handleConfirmDelete = async (id: string) => {
    if (!onDelete) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
      setConfirmingDeleteId(null);
    }
  };

  // Nessuna manutenzione registrata: empty state con invito ad aggiungere la prima
  if (maintenances.length === 0) {
    return (
      <Card className="p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <Wrench className="h-8 w-8 text-blue-500" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nessuna manutenzione registrata
        </h3>
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">
          Inizia a registrare le manutenzioni del tuo veicolo per tenere sotto controllo interventi, costi e prossime scadenze.
        </p>
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Aggiungi Prima Manutenzione
          </button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra di ricerca e filtri */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per titolo, descrizione o officina..."
            aria-label="Cerca manutenzioni"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          aria-label="Filtra per tipo"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Tutti i tipi</option>
          {typesPresent.map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t] || 'Manutenzione'}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filtra per stato"
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Tutti gli stati</option>
          <option value="expired">Scadute</option>
          <option value="critical">Urgenti</option>
          <option value="warning">In scadenza</option>
          <option value="safe">OK</option>
          <option value="none">Senza scadenza</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <ListX className="h-10 w-10 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-700 font-medium mb-1">Nessun risultato</p>
          <p className="text-sm text-gray-500 mb-4">Nessuna manutenzione corrisponde ai filtri selezionati.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Reimposta filtri
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ record: maintenance, status: nextDueStatus }) => {
            const isConfirming = confirmingDeleteId === maintenance.id;
            const isDeleting = deletingId === maintenance.id;
            return (
              <Card key={maintenance.id} className="p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 p-2.5 rounded-lg ${getMaintenanceColor(maintenance.type)}`}>
                    {getMaintenanceIcon(maintenance.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{maintenance.title}</h3>
                        {maintenance.description && (
                          <p className="text-sm text-gray-600 line-clamp-1">{maintenance.description}</p>
                        )}
                      </div>
                      {nextDueStatus && (
                        <StatusBadge status={nextDueStatus}>
                          {STATUS_LABELS[nextDueStatus]}
                        </StatusBadge>
                      )}
                    </div>

                    {/* Riepilogo compatto: data, km, costo, luogo */}
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        {formatDate(maintenance.date)}
                      </span>
                      {typeof maintenance.mileage === 'number' && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-gray-400 border border-gray-300 rounded px-1">KM</span>
                          {maintenance.mileage.toLocaleString()}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Euro className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        {maintenance.cost.toFixed(2)}
                      </span>
                      {maintenance.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-gray-400" aria-hidden="true" />
                          {maintenance.location}
                        </span>
                      )}
                    </div>

                    {(maintenance.nextDue || (typeof maintenance.nextMileage === 'number' && maintenance.nextMileage > 0)) && (
                      <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 text-blue-800 text-xs font-medium px-2.5 py-1.5 rounded-md">
                        <span>Prossima scadenza:</span>
                        {maintenance.nextDue ? (
                          <span>{formatDate(maintenance.nextDue)}</span>
                        ) : (
                          <span>
                            {maintenance.nextMileage!.toLocaleString()} km
                            {' '}({Math.max(0, maintenance.nextMileage! - currentMileage).toLocaleString()} km rimanenti)
                          </span>
                        )}
                      </div>
                    )}

                    {maintenance.notes && (
                      <p className="mt-2 text-xs text-gray-500 italic">Nota: {maintenance.notes}</p>
                    )}
                  </div>

                  {/* Azioni rapide */}
                  <div className="shrink-0 flex items-start gap-1">
                    {isConfirming ? (
                      <div className="flex items-center gap-1" role="group" aria-label="Conferma eliminazione">
                        <span className="text-xs text-red-700 font-medium mr-1 hidden sm:inline">Eliminare?</span>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(maintenance.id)}
                          disabled={isDeleting}
                          aria-label="Conferma eliminazione"
                          className="p-1.5 rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={isDeleting}
                          aria-label="Annulla eliminazione"
                          className="p-1.5 rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(maintenance)}
                            aria-label={`Modifica ${maintenance.title}`}
                            title="Modifica"
                            className="p-1.5 rounded-md text-gray-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(maintenance.id)}
                            aria-label={`Elimina ${maintenance.title}`}
                            title="Elimina"
                            className="p-1.5 rounded-md text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
