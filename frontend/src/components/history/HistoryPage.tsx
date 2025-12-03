import React from 'react';
import { Vehicle } from '../../types/vehicle';
import { MaintenanceRecord } from '../../types/maintenance';
import { normalizeMaintenanceList, normalizeServiceList } from '../../api/normalizers';
import { formatDate } from '../../utils/dateUtils';

type Props = {
  vehicles: Vehicle[];
  onBack: () => void;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const HistoryPage: React.FC<Props> = ({ vehicles, onBack }) => {
  const [records, setRecords] = React.useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>('all');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchVehicleHistory = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const all: MaintenanceRecord[] = [];
      for (const v of vehicles) {
        const resp = await fetch(`${API_URL}/vehicles/${v.id}`, { headers: getAuthHeaders() });
        if (!resp.ok) continue;
        const data = await resp.json();
        const vehicleId = String(v.id);

        // Maintenances
        const maintList = Array.isArray(data.maintenances) ? data.maintenances : [];
        const maintNorm = normalizeMaintenanceList(maintList, vehicleId).map(m => ({ ...m, vehicleId }));
        all.push(...maintNorm);

        // Services
        const srvList = Array.isArray(data.services) ? data.services : [];
        const srvNorm = normalizeServiceList(srvList, vehicleId).map(s => ({
          id: String(s.id),
          vehicleId,
          type: 'service',
          title: 'Tagliando',
          description: '',
          date: s.lastServiceDate,
          nextDue: undefined,
          mileage: typeof s.lastServiceMileage === 'number' ? s.lastServiceMileage : undefined,
          nextMileage: typeof s.nextServiceMileage === 'number' ? s.nextServiceMileage : undefined,
          cost: 0,
          location: undefined,
          notes: undefined,
          documents: undefined,
          reminderDays: undefined,
          isRecurring: false,
          intervalType: undefined,
          intervalValue: undefined,
        } as MaintenanceRecord));
        all.push(...srvNorm);

        // Inspections
        const inspList = Array.isArray(data.inspections) ? data.inspections : [];
        const inspMapped = inspList.map((i: any) => ({
          id: String(i.id ?? ''),
          vehicleId,
          type: 'inspection',
          title: 'Revisione',
          description: i.inspection_center ?? '',
          date: i.lastInspectionDate ?? i.last_inspection_date ?? '',
          nextDue: i.nextInspectionDate ?? i.next_inspection_date ?? undefined,
          mileage: undefined,
          nextMileage: undefined,
          cost: typeof i.cost === 'number' ? i.cost : (parseFloat(i.cost ?? '0') || 0),
          location: undefined,
          notes: undefined,
          documents: undefined,
          reminderDays: undefined,
          isRecurring: false,
          intervalType: undefined,
          intervalValue: undefined,
        } as MaintenanceRecord));
        all.push(...inspMapped);

        // Insurances
        const insList = Array.isArray(data.insurances) ? data.insurances : [];
        const insMapped = insList.map((ins: any) => ({
          id: String(ins.id ?? ''),
          vehicleId,
          type: 'insurance',
          title: `Assicurazione ${ins.company ?? ''}`.trim(),
          description: '',
          // Usa la data di pagamento/registrazione se disponibile, altrimenti fallback a scadenza
          date: (
            // pagamento più recente, se esiste uno storico pagamenti
            Array.isArray(ins.paymentHistory) && ins.paymentHistory.length
              ? (ins.paymentHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date)
              : (ins.lastPaymentDate ?? ins.last_payment_date ?? ins.createdAt ?? ins.created_at ?? ins.expiryDate ?? ins.expiry_date ?? '')
          ),
          nextDue: undefined,
          mileage: undefined,
          nextMileage: undefined,
          cost: typeof ins.annualPremium === 'number' ? ins.annualPremium : (parseFloat(ins.annual_premium ?? '0') || 0),
          location: undefined,
          notes: undefined,
          documents: undefined,
          reminderDays: undefined,
          isRecurring: false,
          intervalType: undefined,
          intervalValue: undefined,
        } as MaintenanceRecord));
        all.push(...insMapped);

        // Car taxes
        const taxList = Array.isArray(data.taxes) ? data.taxes : [];
        const taxMapped = taxList.map((t: any) => ({
          id: String(t.id ?? ''),
          vehicleId,
          type: 'tax',
          title: `Bollo ${t.region ?? ''}`.trim(),
          description: '',
          // Usa la data di pagamento/registrazione se disponibile, altrimenti fallback a scadenza
          date: (t.paid_at ?? t.payment_date ?? t.createdAt ?? t.created_at ?? t.expiryDate ?? t.expiry_date ?? ''),
          nextDue: undefined,
          mileage: undefined,
          nextMileage: undefined,
          cost: typeof t.amount === 'number' ? t.amount : (parseFloat(t.amount ?? '0') || 0),
          location: undefined,
          notes: undefined,
          documents: undefined,
          reminderDays: undefined,
          isRecurring: false,
          intervalType: undefined,
          intervalValue: undefined,
        } as MaintenanceRecord));
        all.push(...taxMapped);
      }

      // Sort by date desc (fallback empty dates last)
      const sorted = all.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });
      setRecords(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [vehicles]);

  React.useEffect(() => {
    if (vehicles.length) fetchVehicleHistory(); else setRecords([]);
  }, [vehicles, fetchVehicleHistory]);

  const labelForType = (t: MaintenanceRecord['type']) => {
    const map: Record<MaintenanceRecord['type'], string> = {
      service: 'Tagliando',
      inspection: 'Revisione',
      insurance: 'Assicurazione',
      tax: 'Bollo Auto',
      tires: 'Pneumatici',
      adblue: 'AdBlue',
      oil: 'Cambio Olio',
      filters: 'Filtri',
      brakes: 'Freni',
      other: 'Manutenzione',
    };
    return map[t] || 'Intervento';
  };

  const filteredRecords = records.filter(r => selectedVehicleId === 'all' || String(r.vehicleId) === String(selectedVehicleId));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Storico interventi e pagamenti</h1>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium" onClick={onBack}>
            ← Torna alla Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center gap-4">
          <label className="text-sm text-gray-700">Filtra per veicolo</label>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={selectedVehicleId}
            onChange={e => setSelectedVehicleId(e.target.value)}
          >
            <option value="all">Tutti i veicoli</option>
            {vehicles.map(v => (
              <option key={v.id} value={String(v.id)}>
                {v.plateNumber} {v.brand} {v.model}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-6 text-gray-600">Caricamento storico...</div>
          ) : error ? (
            <div className="p-6 text-red-600">{error}</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-6 text-gray-600">Nessun dato di storico disponibile.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veicolo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chilometraggio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.slice(0, 100).map((rec) => {
                    const v = vehicles.find(v => String(v.id) === String(rec.vehicleId));
                    return (
                      <tr key={`${rec.type}-${rec.id}`}>
                        <td className="px-4 py-2 text-sm text-gray-900">{rec.date ? formatDate(rec.date) : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{v ? `${v.plateNumber} ${v.brand} ${v.model}` : rec.vehicleId}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{labelForType(rec.type)}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{typeof rec.mileage === 'number' ? `${rec.mileage} km` : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{typeof rec.cost === 'number' ? `${rec.cost.toFixed(2)} €` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
