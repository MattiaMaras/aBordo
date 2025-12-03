import { useState, useEffect, useCallback } from 'react';
import { MaintenanceRecord } from '../types/maintenance';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useMaintenances = (vehicleId: string) => {
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Fetch maintenances for specific vehicle
  const fetchMaintenances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!vehicleId) {
        setMaintenances([]);
        return;
      }

      const response = await fetch(`${API_URL}/vehicles/${vehicleId}`, {
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
    try {
      setError(null);

      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/maintenances`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(mapRecordToDbPayload(maintenanceData)),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore nell\'aggiunta della manutenzione');
      }

      const newMaintenance = await response.json();
      setMaintenances(prev => [...prev, mapDbMaintenanceToRecord(newMaintenance)]);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update maintenance
  const updateMaintenance = async (maintenanceId: string, maintenanceData: Partial<Omit<MaintenanceRecord, 'id'>>) => {
    try {
      setError(null);

      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/maintenances/${maintenanceId}`, {
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
    }
  };

  // Delete maintenance
  const deleteMaintenance = async (maintenanceId: string) => {
    try {
      setError(null);

      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/maintenances/${maintenanceId}`, {
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
      location: undefined,
      notes: undefined,
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
