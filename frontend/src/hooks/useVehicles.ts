import { useState, useEffect, useCallback } from 'react';
import { Vehicle, DashboardStats, VehicleNotification, NotificationStatus } from '../types/vehicle';
import { API_URL, getAuthHeaders, requestWithBackoff } from '../api/client';

// Input type per veicolo, allineato al payload del backend
type VehicleFormInput = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>;

export const useVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [notifications, setNotifications] = useState<VehicleNotification[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    expiringSoon: 0,
    totalMonthlyCosts: 0,
    nextService: 'N/A'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // getAuthHeaders e requestWithBackoff centralizzati in api/client

  // Fetch vehicles from API
  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/vehicles`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Errore nel recupero dei veicoli');
      }

      const data = await response.json();
      const vehiclesArray: Vehicle[] = Array.isArray(data) ? data : (data.vehicles ?? []);
      setVehicles(vehiclesArray);
      setStats(prev => ({ ...prev, totalVehicles: vehiclesArray.length }));
    } catch (error) {
      console.error('Errore nel recupero dei veicoli:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await requestWithBackoff(`${API_URL}/notifications`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Errore nel recupero delle notifiche');
      }

      const data = await response.json();
      const notificationsArray: VehicleNotification[] = Array.isArray(data) ? data : (data.notifications ?? []);
      setNotifications(notificationsArray);
      const expSoon = notificationsArray.filter(n => n.status === 'critical' || n.status === 'warning' || n.status === 'expired').length;
      setStats(prev => ({ ...prev, expiringSoon: expSoon }));
    } catch (error) {
      console.error('Errore nel recupero delle notifiche:', error);
    }
  }, []);

  // Fetch dashboard stats from API
  const fetchStats = useCallback(async () => {
    try {
      const response = await requestWithBackoff(`${API_URL}/notifications/stats/summary`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Errore nel recupero delle statistiche');
      }

      const summary = await response.json();
      setStats(prev => ({
        ...prev,
        expiringSoon: (summary.warningCount ?? 0) + (summary.criticalCount ?? 0) + (summary.expiredCount ?? 0),
      }));
    } catch (error) {
      console.error('Errore nel recupero delle statistiche:', error);
    }
  }, []);

  // Fetch costs summary for current month from API
  const refreshCostsSummary = useCallback(async (start?: string, end?: string) => {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const defaultStart = `${yyyy}-${mm}-01`;
      // Calcola correttamente l'ultimo giorno del mese corrente
      const endDate = new Date(yyyy, now.getMonth() + 1, 0); // day=0 -> ultimo giorno del mese corrente
      const dd = String(endDate.getDate()).padStart(2, '0');
      const defaultEnd = `${yyyy}-${mm}-${dd}`;

      const response = await requestWithBackoff(`${API_URL}/costs/summary?start=${encodeURIComponent(start || defaultStart)}&end=${encodeURIComponent(end || defaultEnd)}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Errore nel recupero riepilogo costi');
      }

      const data = await response.json();
      const total = typeof data.total === 'number' ? data.total : 0;
      setStats(prev => ({ ...prev, totalMonthlyCosts: Number((total as number).toFixed(2)) }));
    } catch (error) {
      console.error('Errore nel riepilogo costi:', error);
    }
  }, []);

  // Add new vehicle
  const addVehicle = async (vehicleData: VehicleFormInput) => {
    try {
      setError(null);

      const response = await fetch(`${API_URL}/vehicles`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(vehicleData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore nell\'aggiunta del veicolo');
      }

      const newVehicle = await response.json();
      setVehicles(prev => [...prev, (newVehicle.vehicle ?? newVehicle) ]);
      
      // Refresh stats and notifications
      await fetchStats();
      await fetchNotifications();
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update vehicle
  const updateVehicle = async (vehicleId: string, vehicleData: Partial<VehicleFormInput>) => {
    try {
      setError(null);

      const response = await fetch(`${API_URL}/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(vehicleData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore nell\'aggiornamento del veicolo');
      }

      const updatedVehicle = await response.json();
      setVehicles(prev => prev.map(v => v.id === vehicleId ? (updatedVehicle.vehicle ?? updatedVehicle) : v));
      
      // Refresh stats and notifications
      await fetchStats();
      await fetchNotifications();
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Delete vehicle
  const deleteVehicle = async (vehicleId: string) => {
    try {
      setError(null);

      const response = await fetch(`${API_URL}/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore nell\'eliminazione del veicolo');
      }

      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      
      // Refresh stats and notifications
      await fetchStats();
      await fetchNotifications();
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update notification status
  const updateNotificationStatus = async (notificationId: string, status: NotificationStatus) => {
    try {
      // Gestione speciale: ID sintetici per manutenzione/tagliando chilometrico
      const isNumericId = /^\d+$/.test(String(notificationId));
      if (!isNumericId && notificationId.startsWith('maintenance')) {
        // Formati possibili: maintenance-km-<vehicleId>-<maintenanceId> oppure maintenance-<vehicleId>-<maintenanceId>
        const parts = notificationId.split('-');
        const maintenanceId = parts[parts.length - 1];
        const vehicleId = parts[parts.length - 2];
        const today = new Date().toISOString().split('T')[0];
        const currentMileage = vehicles.find(v => String(v.id) === String(vehicleId))?.currentMileage ?? undefined;
        const resp = await fetch(`${API_URL}/vehicles/${vehicleId}/maintenances/${maintenanceId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ lastMaintenance: today, lastMileage: currentMileage, clearNextMaintenance: true, clearNextMileage: true }),
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || 'Errore nel registrare la manutenzione come effettuata');
        }
      } else if (!isNumericId && notificationId.startsWith('service-km')) {
        // Formato: service-km-<vehicleId>-<serviceId>
        const parts = notificationId.split('-');
        const serviceId = parts[parts.length - 1];
        const vehicleId = parts[parts.length - 2];
        const today = new Date().toISOString().split('T')[0];
        const currentMileage = vehicles.find(v => String(v.id) === String(vehicleId))?.currentMileage ?? undefined;
        const resp = await fetch(`${API_URL}/vehicles/${vehicleId}/services/${serviceId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ lastServiceDate: today, lastServiceMileage: currentMileage, clearNextServiceMileage: true }),
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.error || 'Errore nel registrare il tagliando come effettuato');
        }
      } else {
        const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          throw new Error('Errore nell\'aggiornamento della notifica');
        }
      }

      // Refresh notifications
      await fetchNotifications();
      return { success: true };
    } catch (error) {
      console.error('Errore nell\'aggiornamento della notifica:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore nell\'eliminazione della notifica');
      }

      // Refresh notifications after delete
      await fetchNotifications();
      return { success: true };
    } catch (error) {
      console.error('Errore nell\'eliminazione della notifica:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Errore sconosciuto' };
    }
  };

  // Filter notifications
  const getFilteredNotifications = (filter: 'all' | 'urgent' | 'read' | 'archived' = 'all') => {
    switch (filter) {
      case 'urgent':
        return notifications.filter(n => n.status === 'critical' || n.status === 'expired' || n.status === 'warning');
      case 'read':
        return [];
      case 'archived':
        return [];
      default:
        return notifications;
    }
  };

  // Helpers per compatibilità con App
  const getNotificationsForVehicle = (vehicleId: string) => {
    return notifications.filter(n => String(n.vehicleId) === String(vehicleId));
  };

  const getUrgentNotificationsCount = () => notifications.filter(n => n.status === 'critical' || n.status === 'warning' || n.status === 'expired').length;

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      // esegui in sequenza per ridurre burst di richieste
      await fetchVehicles();
      await fetchNotifications();
      await fetchStats();
      await refreshCostsSummary();
    };

    fetchInitialData();
  }, [fetchVehicles, fetchNotifications, fetchStats, refreshCostsSummary]);

  return {
    vehicles,
    notifications,
    stats,
    loading,
    error,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateNotificationStatus,
    deleteNotification,
    getFilteredNotifications,
    getNotificationsForVehicle,
    getUrgentNotificationsCount,
    refreshData: fetchVehicles,
    refreshNotifications: fetchNotifications,
    refreshCostsSummary,
  };
};
