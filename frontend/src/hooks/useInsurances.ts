import { useState, useEffect, useCallback } from 'react';
import { Insurance } from '../types/vehicle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useInsurances = (vehicleId: string) => {
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchInsurances = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!vehicleId) {
        setInsurances([]);
        return;
      }

      const response = await fetch(`${API_URL}/vehicles/${vehicleId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Errore nel recupero dei dati del veicolo');
      }

      const vehicleData = await response.json();
      const list = Array.isArray(vehicleData.insurances) ? vehicleData.insurances : [];
      setInsurances(list.map(mapDbToInsurance));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const addInsurance = async (data: Omit<Insurance, 'id' | 'vehicleId' | 'paymentHistory'>) => {
    try {
      setError(null);
      const payload = {
        company: data.company,
        expiryDate: data.expiryDate,
        annualPremium: data.annualPremium,
      };
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/insurances`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Errore nell\'aggiunta assicurazione');
      }
      const created = await response.json();
      setInsurances(prev => [...prev, mapDbToInsurance(created)]);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const updateInsurance = async (insuranceId: string, data: Partial<Omit<Insurance, 'id' | 'vehicleId' | 'paymentHistory'>>) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/insurances/${insuranceId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Errore nell\'aggiornamento assicurazione');
      }
      const updated = await response.json();
      setInsurances(prev => prev.map(i => i.id === insuranceId ? mapDbToInsurance(updated) : i));
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const deleteInsurance = async (insuranceId: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/insurances/${insuranceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Errore nell\'eliminazione assicurazione');
      }
      setInsurances(prev => prev.filter(i => i.id !== insuranceId));
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  useEffect(() => {
    fetchInsurances();
  }, [fetchInsurances]);

  function mapDbToInsurance(db: any): Insurance {
    return {
      id: String(db.id ?? ''),
      vehicleId: String(db.vehicleId ?? vehicleId ?? ''),
      company: db.company ?? '',
      policyNumber: db.policyNumber ?? db.policy_number ?? '',
      expiryDate: db.expiryDate ?? db.expiry_date ?? '',
      annualPremium: typeof db.annualPremium === 'number' ? db.annualPremium : parseFloat(db.annual_premium ?? '0') || 0,
      paymentHistory: Array.isArray(db.paymentHistory) ? db.paymentHistory : [],
    };
  }

  return {
    insurances,
    loading,
    error,
    addInsurance,
    updateInsurance,
    deleteInsurance,
    refreshInsurances: fetchInsurances,
  };
};
