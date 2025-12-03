import { useState, useEffect, useCallback } from 'react';
import { CarTax } from '../types/vehicle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useCarTaxes = (vehicleId: string) => {
  const [taxes, setTaxes] = useState<CarTax[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchTaxes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!vehicleId) {
        setTaxes([]);
        return;
      }

      const response = await fetch(`${API_URL}/vehicles/${vehicleId}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Errore nel recupero dei dati del veicolo');
      }
      const vehicleData = await response.json();
      const list = Array.isArray(vehicleData.taxes) ? vehicleData.taxes : [];
      setTaxes(list.map(mapDbToTax));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const addTax = async (data: Omit<CarTax, 'id' | 'vehicleId'>) => {
    try {
      setError(null);
      const payload = {
        expiryDate: data.expiryDate,
        amount: data.amount,
        region: data.region,
        isPaid: (data as Partial<CarTax>).isPaid ?? true,
      };
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/taxes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Errore nell\'aggiunta bollo');
      }
      const created = await response.json();
      setTaxes(prev => [...prev, mapDbToTax(created)]);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const updateTax = async (taxId: string, data: Partial<Omit<CarTax, 'id' | 'vehicleId'>>) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/taxes/${taxId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Errore nell\'aggiornamento bollo');
      }
      const updated = await response.json();
      setTaxes(prev => prev.map(t => t.id === taxId ? mapDbToTax(updated) : t));
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const deleteTax = async (taxId: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/taxes/${taxId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Errore nell\'eliminazione bollo');
      }
      setTaxes(prev => prev.filter(t => t.id !== taxId));
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  function mapDbToTax(db: any): CarTax {
    return {
      id: String(db.id ?? ''),
      vehicleId: String(db.vehicleId ?? vehicleId ?? ''),
      expiryDate: db.expiryDate ?? db.expiry_date ?? '',
      amount: typeof db.amount === 'number' ? db.amount : parseFloat(db.amount ?? '0') || 0,
      region: db.region ?? '',
      isPaid: !!(db.isPaid ?? db.is_paid ?? false),
    };
  }

  return {
    taxes,
    loading,
    error,
    addTax,
    updateTax,
    deleteTax,
    refreshTaxes: fetchTaxes,
  };
};
