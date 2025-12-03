import { useState, useEffect, useCallback } from 'react';
import { Inspection } from '../types/vehicle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useInspections = (vehicleId: string) => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!vehicleId) { setInspections([]); return; }

      const response = await fetch(`${API_URL}/vehicles/${vehicleId}`, { headers: getAuthHeaders() });
      if (!response.ok) { throw new Error('Errore nel recupero dei dati del veicolo'); }

      const vehicleData = await response.json();
      const list = Array.isArray(vehicleData.inspections) ? vehicleData.inspections : [];
      setInspections(list.map(mapDbToInspection));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally { setLoading(false); }
  }, [vehicleId]);

  const addInspection = async (data: Omit<Inspection, 'id' | 'vehicleId'>) => {
    try {
      setError(null);
      const payload = {
        lastInspectionDate: data.lastInspectionDate,
        nextInspectionDate: data.nextInspectionDate,
        inspectionCenter: data.inspectionCenter,
        cost: data.cost,
      };
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/inspections`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload)
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Errore nell\'aggiunta revisione'); }
      const created = await response.json();
      setInspections(prev => [...prev, mapDbToInspection(created)]);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'; setError(msg); return { success: false, error: msg };
    }
  };

  const updateInspection = async (inspectionId: string, data: Partial<Omit<Inspection, 'id' | 'vehicleId'>>) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/inspections/${inspectionId}`, {
        method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data)
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Errore nell\'aggiornamento revisione'); }
      const updated = await response.json();
      setInspections(prev => prev.map(i => i.id === inspectionId ? mapDbToInspection(updated) : i));
      return { success: true };
    } catch (err) { const msg = err instanceof Error ? err.message : 'Errore sconosciuto'; setError(msg); return { success: false, error: msg }; }
  };

  const deleteInspection = async (inspectionId: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/inspections/${inspectionId}`, {
        method: 'DELETE', headers: getAuthHeaders()
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Errore nell\'eliminazione revisione'); }
      setInspections(prev => prev.filter(i => i.id !== inspectionId));
      return { success: true };
    } catch (err) { const msg = err instanceof Error ? err.message : 'Errore sconosciuto'; setError(msg); return { success: false, error: msg }; }
  };

  useEffect(() => { fetchInspections(); }, [fetchInspections]);

  function mapDbToInspection(db: any): Inspection {
    return {
      id: String(db.id ?? ''),
      vehicleId: String(db.vehicleId ?? vehicleId ?? ''),
      lastInspectionDate: db.lastInspectionDate ?? db.last_inspection_date ?? '',
      nextInspectionDate: db.nextInspectionDate ?? db.next_inspection_date ?? '',
      inspectionCenter: db.inspectionCenter ?? db.inspection_center ?? '',
      cost: typeof db.cost === 'number' ? db.cost : parseFloat(db.cost ?? '0') || 0,
    };
  }

  return { inspections, loading, error, addInspection, updateInspection, deleteInspection, refreshInspections: fetchInspections };
};