import { useState, useEffect, useCallback } from 'react';
import { Service } from '../types/vehicle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useServices = (vehicleId: string) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!vehicleId) { setServices([]); return; }

      const response = await fetch(`${API_URL}/vehicles/${vehicleId}`, { headers: getAuthHeaders() });
      if (!response.ok) { throw new Error('Errore nel recupero dei dati del veicolo'); }
      const vehicleData = await response.json();
      const list = Array.isArray(vehicleData.services) ? vehicleData.services : [];
      setServices(list.map(mapDbToService));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally { setLoading(false); }
  }, [vehicleId]);

  const addService = async (data: Omit<Service, 'id' | 'vehicleId'>) => {
    try {
      setError(null);
      const payload = {
        lastServiceMileage: data.lastServiceMileage,
        lastServiceDate: data.lastServiceDate,
        serviceInterval: data.serviceInterval,
        nextServiceMileage: data.nextServiceMileage,
        serviceType: data.serviceType,
      };
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/services`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload)
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Errore nell\'aggiunta tagliando'); }
      const created = await response.json();
      setServices(prev => [...prev, mapDbToService(created)]);
      return { success: true };
    } catch (err) { const msg = err instanceof Error ? err.message : 'Errore sconosciuto'; setError(msg); return { success: false, error: msg }; }
  };

  const updateService = async (serviceId: string, data: Partial<Omit<Service, 'id' | 'vehicleId'>>) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/services/${serviceId}`, {
        method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data)
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Errore nell\'aggiornamento tagliando'); }
      const updated = await response.json();
      setServices(prev => prev.map(s => s.id === serviceId ? mapDbToService(updated) : s));
      return { success: true };
    } catch (err) { const msg = err instanceof Error ? err.message : 'Errore sconosciuto'; setError(msg); return { success: false, error: msg }; }
  };

  const deleteService = async (serviceId: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/services/${serviceId}`, {
        method: 'DELETE', headers: getAuthHeaders()
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Errore nell\'eliminazione tagliando'); }
      setServices(prev => prev.filter(s => s.id !== serviceId));
      return { success: true };
    } catch (err) { const msg = err instanceof Error ? err.message : 'Errore sconosciuto'; setError(msg); return { success: false, error: msg }; }
  };

  useEffect(() => { fetchServices(); }, [fetchServices]);

  function mapDbToService(db: any): Service {
    return {
      id: String(db.id ?? ''),
      vehicleId: String(db.vehicleId ?? vehicleId ?? ''),
      lastServiceMileage: Number(db.lastServiceMileage ?? db.last_service_mileage ?? 0),
      lastServiceDate: db.lastServiceDate ?? db.last_service_date ?? '',
      serviceInterval: Number(db.serviceInterval ?? db.service_interval ?? 0),
      nextServiceMileage: Number(db.nextServiceMileage ?? db.next_service_mileage ?? 0),
      serviceType: (db.serviceType ?? db.service_type ?? 'regular') as Service['serviceType'],
    };
  }

  return { services, loading, error, addService, updateService, deleteService, refreshServices: fetchServices };
};