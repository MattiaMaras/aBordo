import { useState, useEffect, useCallback, useRef } from 'react';
import { MaintenanceRecord } from '../types/maintenance';
import { API_URL, apiFetch, getAuthHeaders } from '../api/client';


export const useMaintenances = (vehicleId: string) => {
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guardie anti-doppio-submit: evitano che un doppio click o un doppio invio
  // del form (oltre alla protezione già presente sul bottone) generino due
  // richieste POST/PUT in parallelo per la stessa manutenzione.
  const addInFlight = useRef(false);
  const updateInFlight = useRef<Set<string>>(new Set());

  // Fetch maintenances for specific vehicle
  const fetchMaintenances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!vehicleId) {
        setMaintenances([]);
        return;
      }

      const response = await apiFetch(`${API_URL}/vehicles/${vehicleId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Errore nel recupero dei dati del veicolo');
      }

      const vehicleData = await response.json();
      const list = Array.isArray(vehicleData.maintenances) ? vehicleData.maintenances : [];
      setMaintenances(list.map(mapDbMaintenanceToRecord));
    } catch (error) {
      console.error('Errore nel recupero delle manutenzioni:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  // Add new maintenance
  const addMaintenance = async (maintenanceData: Omit<MaintenanceRecord, 'id'>) => {
    if (addInFlight.current) {
      return { success: false, error: 'Salvataggio già in corso' };
    }
    addInFlight.current = true;
    try {
      setError(null);

      const response = await apiFetch(`${API_URL}/vehicles/${vehicleId}/maintenances`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(mapRecordToDbPayload(maintenanceData)),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Errore nell\'aggiunta della manutenzione');
      }

      const newMaintenance = mapDbMaintenanceToRecord(payload);
      setMaintenances(prev => {
        // Se il backend ha deduplicato (stessa manutenzione già salvata pochi
        // secondi prima), evita di aggiungerla due volte anche lato client.
        if (prev.some(m => m.id === newMaintenance.id)) return prev;
        return [...prev, newMaintenance];
      });

      return { success: true, deduped: Boolean(payload.deduped) };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      addInFlight.current = false;
    }
  };

  // Update maintenance
  const updateMaintenance = async (maintenanceId: string, maintenanceData: Partial<Omit<MaintenanceRecord, 'id'>>) => {
    if (updateInFlight.current.has(maintenanceId)) {
      return { success: false, error: 'Aggiornamento già in corso' };
    }
    updateInFlight.current.add(maintenanceId);
    try {
      setError(null);

      const response = await apiFetch(`${API_URL}/vehicles/${vehicleId}/maintenances/${maintenanceId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(mapRecordToDbPayload(maintenanceData as Omit<MaintenanceRecord, 'id'>)),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore nell\'aggiornamento della manutenzione');
      }

      const updatedMaintenance = await response.json();
      setMaintenances(prev => prev.map(m => m.id === maintenanceId ? mapDbMaintenanceToRecord(updatedMaintenance) : m));

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      updateInFlight.current.delete(maintenanceId);
    }
  };

  // Delete maintenance
  const deleteMaintenance = async (maintenanceId: string) => {
    try {
      setError(null);

      const response = await apiFetch(`${API_URL}/vehicles/${vehicleId}/maintenances/${maintenanceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore nell\'eliminazione della manutenzione');
      }

      setMaintenances(prev => prev.filter(m => m.id !== maintenanceId));

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Fetch maintenances on mount and when vehicleId changes
  useEffect(() => {
    fetchMaintenances();
  }, [fetchMaintenances]);

  // Helpers: map DB payloads to UI MaintenanceRecord and vice versa
  function toUiType(dbType: string): MaintenanceRecord['type'] {
    switch (dbType) {
      case 'oil_change': return 'oil';
      case 'filters': return 'filters';
      case 'brakes': return 'brakes';
      case 'tires': return 'tires';
      case 'adblue': return 'adblue';
      case 'belts': return 'other';
      default: return (dbType as MaintenanceRecord['type']) || 'other';
    }
  }

  function mapDbMaintenanceToRecord(db: any): MaintenanceRecord {
    return {
      id: String(db.id ?? ''),
      vehicleId: String(db.vehicle_id ?? vehicleId ?? ''),
      type: toUiType(db.type ?? 'other'),
      title: db.title ?? 'Manutenzione',
      description: db.description ?? '',
      date: db.last_maintenance ?? db.date ?? new Date().toISOString().split('T')[0],
      nextDue: db.next_maintenance ?? undefined,
      mileage: typeof db.last_mileage === 'number' ? db.last_mileage : (typeof db.mileage === 'number' ? db.mileage : undefined),
      nextMileage: typeof db.next_mileage === 'number' ? db.next_mileage : undefined,
      cost: typeof db.cost === 'number' ? db.cost : (parseFloat(db.cost ?? '0') || 0),
      location: db.location ?? undefined,
      notes: db.notes ?? undefined,
      documents: undefined,
      reminderDays: undefined,
      isRecurring: false,
      intervalType: undefined,
      intervalValue: undefined,
    };
  }

  function toDbType(uiType: MaintenanceRecord['type']): string {
    switch (uiType) {
      case 'oil': return 'oil_change';
      case 'filters': return 'filters';
      case 'brakes': return 'brakes';
      case 'tires': return 'tires';
      case 'adblue': return 'adblue';
      case 'other': return 'belts';
      default: return uiType;
    }
  }

  function mapRecordToDbPayload(rec: Omit<MaintenanceRecord, 'id'>) {
    return {
      type: toDbType(rec.type),
      title: (rec.title && rec.title.trim().length > 0) ? rec.title.trim() : null,
      lastMaintenance: rec.date,
      lastMileage: typeof rec.mileage === 'number' ? rec.mileage : null,
      nextMaintenance: rec.nextDue ? rec.nextDue : null,
      nextMileage: typeof rec.nextMileage === 'number' ? rec.nextMileage : null,
      cost: typeof rec.cost === 'number' ? rec.cost : (parseFloat(String(rec.cost)) || 0),
      // La descrizione resta separata dal titolo; non facciamo fallback
      description: (rec.description && rec.description.trim().length > 0)
        ? rec.description.trim()
        : null,
      location: (rec.location && rec.location.trim().length > 0) ? rec.location.trim() : null,
      notes: (rec.notes && rec.notes.trim().length > 0) ? rec.notes.trim() : null,
    };
  }

  return {
    maintenances,
    loading,
    error,
    addMaintenance,
    updateMaintenance,
    deleteMaintenance,
    refreshMaintenances: fetchMaintenances,
  };
};
