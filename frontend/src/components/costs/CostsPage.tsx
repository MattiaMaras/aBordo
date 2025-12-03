import React from 'react';
import { Button } from '../common/Button';
import { Vehicle } from '../../types/vehicle';

type CostCategory = 'maintenance' | 'inspection' | 'tax' | 'insurance';

interface CostItem {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  category: CostCategory;
  amount: number;
  date: string;
  description?: string;
}

interface CostsPageProps {
  vehicles: Vehicle[];
  onBack: () => void;
  refreshToken?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const CostsPage: React.FC<CostsPageProps> = ({ vehicles, onBack, refreshToken = 0 }) => {
  const [items, setItems] = React.useState<CostItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState<'month' | 'year' | 'all'>('month');
  const [categoryFilter, setCategoryFilter] = React.useState<CostCategory | 'all'>('all');
  const [vehicleFilter, setVehicleFilter] = React.useState<string>('all');

  // Stato riepilogo costi dal backend (totals = { maintenance, inspections, taxes, insurances })
  const [summary, setSummary] = React.useState<{ total: number; totals: { maintenance: number; inspections: number; taxes: number; insurances: number } } | null>(null);
  const [summaryLoading, setSummaryLoading] = React.useState<boolean>(false);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchAllCosts = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const requests = vehicles.map(async (v) => {
        const res = await fetch(`${API_URL}/vehicles/${v.id}`, { headers: getAuthHeaders() });
        if (!res.ok) { throw new Error('Errore nel recupero dei dettagli veicolo'); }
        const data = await res.json();

        const label = `${v.brand} ${v.model}`;
        const maintenanceItems: CostItem[] = (Array.isArray(data.maintenances) ? data.maintenances : []).map((m: any) => ({
          id: String(m.id ?? ''),
          vehicleId: v.id,
          vehicleLabel: label,
          category: 'maintenance',
          amount: typeof m.cost === 'number' ? m.cost : parseFloat(m.cost ?? '0') || 0,
          date: m.last_maintenance ?? m.lastMaintenance ?? '',
          description: m.description ?? '',
        }));

        const inspectionItems: CostItem[] = (Array.isArray(data.inspections) ? data.inspections : []).map((i: any) => ({
          id: String(i.id ?? ''),
          vehicleId: v.id,
          vehicleLabel: label,
          category: 'inspection',
          amount: typeof i.cost === 'number' ? i.cost : parseFloat(i.cost ?? '0') || 0,
          date: i.last_inspection_date ?? i.lastInspectionDate ?? '',
          description: i.inspection_center ?? i.inspectionCenter ?? '',
        }));

        const taxItems: CostItem[] = (Array.isArray(data.taxes) ? data.taxes : []).map((t: any) => ({
          id: String(t.id ?? ''),
          vehicleId: v.id,
          vehicleLabel: label,
          category: 'tax',
          amount: typeof t.amount === 'number' ? t.amount : parseFloat(t.amount ?? '0') || 0,
          date: t.expiry_date ?? t.expiryDate ?? '',
          description: t.region ?? '',
        }));

        const insuranceItems: CostItem[] = (Array.isArray(data.insurances) ? data.insurances : []).map((i: any) => ({
          id: String(i.id ?? ''),
          vehicleId: v.id,
          vehicleLabel: label,
          category: 'insurance',
          amount: typeof i.annualPremium === 'number' ? i.annualPremium : parseFloat(i.annual_premium ?? '0') || 0,
          date: i.expiry_date ?? i.expiryDate ?? '',
          description: i.company ?? '',
        }));

        return [...maintenanceItems, ...inspectionItems, ...taxItems, ...insuranceItems];
      });

      const results = await Promise.all(requests);
      setItems(results.flat());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [vehicles]);

  React.useEffect(() => { fetchAllCosts(); }, [fetchAllCosts, refreshToken]);

  // Calcolo range in base al periodo
  const getPeriodRange = React.useCallback((): { start: string; end: string } => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    } else {
      startDate = new Date(2000, 0, 1);
      endDate = new Date(2100, 11, 31);
    }
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return { start, end };
  }, [period]);

  // Fetch riepilogo costi
  const fetchCostsSummary = React.useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const { start, end } = getPeriodRange();
      const res = await fetch(`${API_URL}/costs/summary?start=${start}&end=${end}`, { headers: getAuthHeaders() });
      if (!res.ok) { throw new Error('Errore nel recupero del riepilogo costi'); }
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto nel riepilogo costi';
      setSummaryError(msg);
    } finally {
      setSummaryLoading(false);
    }
  }, [getPeriodRange]);

  React.useEffect(() => { fetchCostsSummary(); }, [fetchCostsSummary, refreshToken]);

  const isInPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filtered = items.filter(i => 
    isInPeriod(i.date) &&
    (categoryFilter === 'all' || i.category === categoryFilter) &&
    (vehicleFilter === 'all' || i.vehicleId === vehicleFilter)
  );

  const total = (summary && vehicleFilter === 'all') ? summary.total : filtered.reduce((sum, i) => sum + i.amount, 0);
  const totalsByCategory: Record<CostCategory, number> = (summary && vehicleFilter === 'all') ? {
    maintenance: summary.totals.maintenance || 0,
    inspection: summary.totals.inspections || 0,
    tax: summary.totals.taxes || 0,
    insurance: summary.totals.insurances || 0,
  } : {
    maintenance: filtered.filter(i => i.category === 'maintenance').reduce((s, i) => s + i.amount, 0),
    inspection: filtered.filter(i => i.category === 'inspection').reduce((s, i) => s + i.amount, 0),
    tax: filtered.filter(i => i.category === 'tax').reduce((s, i) => s + i.amount, 0),
    insurance: filtered.filter(i => i.category === 'insurance').reduce((s, i) => s + i.amount, 0),
  };

  const maxCategoryValue = Math.max(...Object.values(totalsByCategory));

  const handleExportCsv = async () => {
    try {
      const { start, end } = getPeriodRange();
      const res = await fetch(`${API_URL}/costs/export?start=${start}&end=${end}`, { headers: getAuthHeaders() });
      if (!res.ok) { throw new Error('Errore nella generazione del CSV'); }
      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `costi_${start}_${end}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto durante export CSV';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Costi</h1>
          <Button onClick={onBack}>Torna alla Dashboard</Button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
              <select className="border border-gray-300 rounded-md px-3 py-2" value={period} onChange={e => setPeriod(e.target.value as any)}>
                <option value="month">Mese corrente</option>
                <option value="year">Anno corrente</option>
                <option value="all">Tutti</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="border border-gray-300 rounded-md px-3 py-2" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)}>
                <option value="all">Tutte</option>
                <option value="maintenance">Manutenzioni</option>
                <option value="inspection">Revisioni</option>
                <option value="tax">Bolli</option>
                <option value="insurance">Assicurazioni</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Veicolo</label>
              <select
                className="border border-gray-300 rounded-md px-3 py-2"
                value={vehicleFilter}
                onChange={e => setVehicleFilter(e.target.value)}
              >
                <option value="all">Tutti i veicoli</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{`${v.brand} ${v.model}`}</option>
                ))}
              </select>
            </div>
            <div className="ml-auto">
              <Button onClick={handleExportCsv}>Esporta CSV</Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento costi...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Totale</p>
                <p className="text-2xl font-bold">€{total.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Manutenzioni</p>
                <p className="text-2xl font-bold">€{totalsByCategory.maintenance.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Revisioni</p>
                <p className="text-2xl font-bold">€{totalsByCategory.inspection.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Bolli</p>
                <p className="text-2xl font-bold">€{totalsByCategory.tax.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
                <p className="text-sm text-gray-500">Assicurazioni</p>
                <p className="text-2xl font-bold">€{totalsByCategory.insurance.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuzione costi per categoria</h2>
              {summaryLoading ? (
                <p className="text-gray-600">Caricamento riepilogo...</p>
              ) : summaryError ? (
                <p className="text-red-600">{summaryError}</p>
              ) : (
                <div className="space-y-4">
                  {([
                    { label: 'Manutenzioni', value: totalsByCategory.maintenance, color: 'bg-blue-500' },
                    { label: 'Revisioni', value: totalsByCategory.inspection, color: 'bg-green-500' },
                    { label: 'Bolli', value: totalsByCategory.tax, color: 'bg-yellow-500' },
                    { label: 'Assicurazioni', value: totalsByCategory.insurance, color: 'bg-purple-500' },
                  ] as { label: string; value: number; color: string }[]).map((bar) => (
                    <div key={bar.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700">{bar.label}</span>
                        <span className="text-sm font-medium text-gray-900">€{bar.value.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded h-3">
                        <div className={`${bar.color} h-3 rounded`} style={{ width: maxCategoryValue ? `${(bar.value / maxCategoryValue) * 100}%` : '0%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veicolo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dettagli</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Nessun costo nel periodo selezionato</td>
                    </tr>
                  ) : (
                    filtered
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((item) => (
                        <tr key={`${item.category}-${item.id}-${item.date}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.vehicleLabel}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.category === 'maintenance' && 'Manutenzione'}
                            {item.category === 'inspection' && 'Revisione'}
                            {item.category === 'tax' && 'Bollo'}
                            {item.category === 'insurance' && 'Assicurazione'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">€{item.amount.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description || '—'}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
