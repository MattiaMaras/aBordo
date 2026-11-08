import React, { useMemo, useState } from 'react';
import { Calendar, Filter, Search, ArrowLeft, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { VehicleNotification, Vehicle, NotificationStatus } from '../../types/vehicle';
import { formatDate } from '../../utils/dateUtils';
import { toast } from 'sonner';

interface DeadlinesPageProps {
  /** Lista unificata (stessa di campanella e contatori) */
  deadlines: VehicleNotification[];
  onBack: () => void;
  vehicles?: Vehicle[];
  onUpdateNotification?: (id: string, status: NotificationStatus) => Promise<{ success: boolean; error?: string }>;
}

const typeLabels: Record<VehicleNotification['type'], string> = {
  insurance: 'Assicurazione',
  tax: 'Bollo',
  inspection: 'Revisione',
  service: 'Tagliando',
  maintenance: 'Manutenzione',
};

export const DeadlinesPage: React.FC<DeadlinesPageProps> = ({ deadlines, onBack, vehicles = [], onUpdateNotification }) => {
  const [query, setQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<NotificationStatus[]>([]);
  const [typeFilters, setTypeFilters] = useState<VehicleNotification['type'][]>([]);
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const vehiclesById = useMemo(() => {
    const map: Record<string, Vehicle> = {};
    vehicles.forEach(v => { map[String(v.id)] = v; });
    return map;
  }, [vehicles]);

  const filtered = useMemo(() => {
    // La lista unificata è già ordinata per gravità; qui si applicano solo i filtri.
    let list = deadlines.filter(n => n.status !== 'safe');
    if (statusFilters.length > 0) list = list.filter(n => statusFilters.includes(n.status));
    if (typeFilters.length > 0) list = list.filter(n => typeFilters.includes(n.type));
    if (vehicleFilter !== 'all') list = list.filter(n => String(n.vehicleId) === String(vehicleFilter));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(n => {
        const vehicle = vehiclesById[String(n.vehicleId)];
        const vehicleText = vehicle ? `${vehicle.plateNumber} ${vehicle.brand} ${vehicle.model}`.toLowerCase() : '';
        return n.message.toLowerCase().includes(q) || (n.label ?? '').toLowerCase().includes(q) || typeLabels[n.type].toLowerCase().includes(q) || vehicleText.includes(q);
      });
    }
    return list;
  }, [deadlines, statusFilters, typeFilters, query, vehicleFilter, vehiclesById]);

  const getIconForStatus = (status: string) => {
    switch (status) {
      case 'safe':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-surface border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Scadenze</h1>
            </div>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtri e ricerca */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={() => { setStatusFilters([]); setTypeFilters([]); setVehicleFilter('all'); }}>Tutte</Button>
              <span className="inline-flex items-center text-sm text-gray-500 ml-2"><Filter className="h-4 w-4 mr-1" /> Stati:</span>
              <Button variant={statusFilters.includes('warning') ? 'primary' : 'outline'} onClick={() => setStatusFilters(prev => prev.includes('warning') ? prev.filter(s => s !== 'warning') : [...prev, 'warning'])}>In Scadenza</Button>
              <Button variant={statusFilters.includes('critical') ? 'primary' : 'outline'} onClick={() => setStatusFilters(prev => prev.includes('critical') ? prev.filter(s => s !== 'critical') : [...prev, 'critical'])}>Urgenti</Button>
              <Button variant={statusFilters.includes('expired') ? 'primary' : 'outline'} onClick={() => setStatusFilters(prev => prev.includes('expired') ? prev.filter(s => s !== 'expired') : [...prev, 'expired'])}>Scadute</Button>
              <span className="inline-flex items-center text-sm text-gray-500 ml-2"><Filter className="h-4 w-4 mr-1" /> Tipi:</span>
              <Button variant={typeFilters.includes('insurance') ? 'primary' : 'outline'} onClick={() => setTypeFilters(prev => prev.includes('insurance') ? prev.filter(t => t !== 'insurance') : [...prev, 'insurance'])}>Assicurazione</Button>
              <Button variant={typeFilters.includes('tax') ? 'primary' : 'outline'} onClick={() => setTypeFilters(prev => prev.includes('tax') ? prev.filter(t => t !== 'tax') : [...prev, 'tax'])}>Bollo</Button>
              <Button variant={typeFilters.includes('inspection') ? 'primary' : 'outline'} onClick={() => setTypeFilters(prev => prev.includes('inspection') ? prev.filter(t => t !== 'inspection') : [...prev, 'inspection'])}>Revisione</Button>
              <Button variant={typeFilters.includes('service') ? 'primary' : 'outline'} onClick={() => setTypeFilters(prev => prev.includes('service') ? prev.filter(t => t !== 'service') : [...prev, 'service'])}>Tagliando</Button>
              <Button variant={typeFilters.includes('maintenance') ? 'primary' : 'outline'} onClick={() => setTypeFilters(prev => prev.includes('maintenance') ? prev.filter(t => t !== 'maintenance') : [...prev, 'maintenance'])}>Manutenzione</Button>
              <span className="inline-flex items-center text-sm text-gray-500 ml-2"><Filter className="h-4 w-4 mr-1" /> Veicolo:</span>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="text-sm border rounded-lg px-2 py-1"
              >
                <option value="all">Tutti i veicoli</option>
                {vehicles.map(v => (
                  <option key={v.id} value={String(v.id)}>
                    {v.plateNumber} • {v.brand} {v.model}
                  </option>
                ))}
              </select>

          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per testo, tipo o veicolo..."
              className="pl-9 pr-3 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          
        </div>
        <div className="flex items-center gap-4 flex-wrap mt-3 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            In Scadenza: entro 30 giorni
          </span>
          <span className="inline-flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-500" />
            Urgente: entro 7 giorni
          </span>
          <span className="inline-flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-600" />
            Scaduta: data superata
          </span>
        </div>
        </Card>

        {/* Elenco scadenze */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Elenco scadenze</h2>
            <span className="text-sm text-gray-500">{filtered.length} elementi</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">Nessuna scadenza trovata con i filtri correnti</p>
              <p className="text-sm text-gray-500 mt-1">Modifica i filtri o la ricerca</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {getIconForStatus(n.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {n.label || typeLabels[n.type]}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{n.message}</span>
                      </div>
                      <StatusBadge status={n.status}>
                        {typeof (n as any).kmUntil === 'number'
                          ? ((n as any).kmUntil <= 0 ? 'SCADUTO' : `${(n as any).kmUntil}km`)
                          : (typeof (n as any).kmUntilService === 'number'
                            ? ((n as any).kmUntilService <= 0 ? 'SCADUTO' : `${(n as any).kmUntilService}km`)
                            : (n.daysUntilExpiry < 0 ? 'SCADUTA' : `${n.daysUntilExpiry}g`))
                        }
                      </StatusBadge>
                    </div>
                    {/* descrizione intervento per manutenzione */}
                    {n.type === 'maintenance' && (n as any).description && (
                      <p className="text-xs text-gray-600 mt-1">Descrizione: {(n as any).description}</p>
                    )}
                    {typeof (n as any).kmUntil === 'number' ? (
                      <p className="text-xs text-gray-500 mt-1">Prossima manutenzione: {(n as any).nextMileage} km • Km rimanenti: {Math.max((n as any).kmUntil, 0)} km</p>
                    ) : (typeof (n as any).kmUntilService === 'number' ? (
                      <p className="text-xs text-gray-500 mt-1">Prossimo tagliando: {n.nextServiceMileage} km • Km rimanenti: {Math.max((n as any).kmUntilService, 0)} km</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Scadenza: {formatDate(n.expiryDate)}</p>
                    ))}
                    {vehiclesById[String(n.vehicleId)] && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Veicolo: {vehiclesById[String(n.vehicleId)].plateNumber} • {vehiclesById[String(n.vehicleId)].brand} {vehiclesById[String(n.vehicleId)].model}
                      </p>
                    )}
                  </div>
                  {onUpdateNotification && n.status !== 'safe' && (
                    <div className="ml-2">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          setUpdatingId(n.id);
                          const res = await onUpdateNotification(n.id, 'safe');
                          if (res && res.success) {
                            toast.success('Segnata come effettuata');
                          } else {
                            toast.error(res?.error || 'Operazione non riuscita');
                          }
                          setUpdatingId(null);
                        }}
                        disabled={updatingId === n.id}
                      >
                        {updatingId === n.id ? 'Salvo...' : 'Segna effettuata'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};
