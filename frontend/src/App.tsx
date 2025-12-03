import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/landing/LandingPage';
import { Header } from './components/layout/Header';
import { StatsGrid } from './components/dashboard/StatsGrid';
import { NotificationCenter } from './components/dashboard/NotificationCenter';
import { HistoryPage } from './components/history/HistoryPage';
import { VehicleCard } from './components/vehicles/VehicleCard';
import { VehicleDetail } from './components/vehicles/VehicleDetail';
import { AddVehicleForm } from './components/vehicles/AddVehicleForm';
import { NotificationModal } from './components/modals/NotificationModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { ProfileModal } from './components/modals/ProfileModal';
import { Button } from './components/common/Button';
import { useVehicles } from './hooks/useVehicles';
import { MaintenanceRecord} from './types/maintenance';
import { useMaintenances } from './hooks/useMaintenances';
import { Vehicle } from './types/vehicle';
import { DeadlinesPage } from './components/deadlines/DeadlinesPage';
import { CostsPage } from './components/costs/CostsPage';
import { Toaster } from 'sonner';
import { normalizeMaintenanceList } from './api/normalizers';

const Dashboard: React.FC = () => {
const { vehicles, notifications, stats, loading, addVehicle, updateVehicle, getNotificationsForVehicle, updateNotificationStatus, refreshNotifications } = useVehicles();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const { maintenances, addMaintenance, updateMaintenance, deleteMaintenance } = useMaintenances(selectedVehicle?.id ?? '');
  const [costsRefreshToken, setCostsRefreshToken] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const showDeadlines = location.pathname === '/deadlines';
  const showCosts = location.pathname === '/costs';
  const showHistory = location.pathname === '/history';

  

  // Stats già calcolate dall'hook useVehicles (expiringSoon e totalMonthlyCosts allineati al backend)

  const handleAddVehicle = (vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => {
    addVehicle(vehicleData);
    setShowAddForm(false);
  };

  const [maintenancesByVehicle, setMaintenancesByVehicle] = useState<Record<string, MaintenanceRecord[]>>({});
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const loadMaintenances = React.useCallback(async () => {
    try {
      const entries = await Promise.all(vehicles.map(async (v) => {
        const resp = await fetch(`${API_URL}/vehicles/${v.id}`, { headers: getAuthHeaders() });
        if (!resp.ok) return [String(v.id), [] as MaintenanceRecord[]] as const;
        const data = await resp.json();
        const maintList = Array.isArray(data.maintenances) ? data.maintenances : [];
        const normalized = normalizeMaintenanceList(maintList, String(v.id));
        return [String(v.id), normalized] as const;
      }));
      const obj: Record<string, MaintenanceRecord[]> = {};
      entries.forEach(([vid, maints]) => { obj[vid] = maints; });
      setMaintenancesByVehicle(obj);
    } catch {
      setMaintenancesByVehicle({});
    }
  }, [vehicles]);

  useEffect(() => {
    if (vehicles.length > 0) loadMaintenances(); else setMaintenancesByVehicle({});
  }, [vehicles, loadMaintenances]);

  const maintenanceUrgents = (() => {
    const labelForMaintenanceType = (t: any) => {
      const map: Record<string, string> = {
        oil: 'Cambio olio',
        filters: 'Filtri',
        brakes: 'Freni',
        tires: 'Cambio pneumatici',
        adblue: 'AdBlue',
        other: 'Manutenzione',
      };
      return map[t] || 'Manutenzione';
    };
    const list: { id: string; vehicleId: string; type: 'maintenance'; status: 'critical'|'warning'; daysUntilExpiry: number; message: string; expiryDate: string }[] = [];
    vehicles.forEach(v => {
      const maints = maintenancesByVehicle[String(v.id)] || [];
      maints.forEach((m: any) => {
        // usa campi normalizzati se presenti
        const nextMileage = typeof m.nextMileage === 'number' ? m.nextMileage : m.next_mileage;
        const nextDue = m.nextDue ?? m.next_maintenance;
        if (typeof nextMileage === 'number' && nextMileage > 0) {
          const current = v.currentMileage ?? 0;
          const kmUntil = nextMileage - current;
          const status = (
            kmUntil <= 0 ? 'expired' :
            kmUntil <= 250 ? 'critical' :
            kmUntil <= 600 ? 'warning' :
            'safe'
          );
          if (status === 'critical' || status === 'warning') {
            const label = (
              m.type === 'other'
                ? (m.title || m.description || labelForMaintenanceType(m.type))
                : labelForMaintenanceType(m.type)
            );
            const msg = kmUntil <= 0 ? `${label} scaduta, superati ${Math.abs(kmUntil)} km` : `${label} tra ${kmUntil} km`;
            list.push({ id: `maintenance-km-${v.id}-${String(m.id ?? '')}`, vehicleId: String(v.id), type: 'maintenance', status, daysUntilExpiry: 999999, message: msg, expiryDate: '', nextMileage, kmUntil, description: m.description } as any);
          }
        } else if (nextDue) {
          const next = nextDue;
          const days = (() => {
            const today = new Date();
            const expiry = new Date(next);
            return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          })();
          const status = days < 0 ? 'expired' : (days <= 7 ? 'critical' : (days <= 30 ? 'warning' : 'safe'));
          if (status === 'critical' || status === 'warning') {
            const label = (
              m.type === 'other'
                ? (m.title || m.description || labelForMaintenanceType(m.type))
                : labelForMaintenanceType(m.type)
            );
            const msg = days < 0 ? `${label} scaduta da ${Math.abs(days)} giorni` : `${label} tra ${days} giorni`;
            list.push({ id: `maintenance-${v.id}-${String(m.id ?? '')}`, vehicleId: String(v.id), type: 'maintenance', status, daysUntilExpiry: days, message: msg, expiryDate: next, description: m.description } as any);
          }
        }
      });
    });
    return list;
  })();

  const priorityNotifications = [...notifications.filter(n => n.type !== 'maintenance'), ...maintenanceUrgents]
    .filter(n => n.status === 'critical' || n.status === 'warning' || n.status === 'expired')
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .slice(0, 10);

  const urgentCount = priorityNotifications.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento A Bordo...</p>
        </div>
      </div>
    );
  }

  if (showDeadlines) {
    const priorityNotifications = [...notifications.filter(n => n.type !== 'maintenance'), ...maintenanceUrgents]
      .filter(n => n.status === 'critical' || n.status === 'warning')
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      .slice(0, 10);

    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          notificationCount={urgentCount}
          onNotificationClick={() => setShowNotificationModal(true)}
          onSettingsClick={() => setShowSettingsModal(true)}
          onProfileClick={() => setShowProfileModal(true)}
          onDeadlinesClick={() => { navigate('/deadlines'); }}
          onCostsClick={() => { navigate('/costs'); }}
          onLogoClick={() => navigate('/')}
          onVehiclesClick={() => { navigate('/'); setSelectedVehicle(null); }}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DeadlinesPage
            notifications={notifications}
            vehicles={vehicles}
            onUpdateNotification={updateNotificationStatus}
            onBack={() => navigate('/')}
          />
        </main>
        {showNotificationModal && (
          <NotificationModal
            notifications={priorityNotifications}
            onClose={() => setShowNotificationModal(false)}
          />
        )}
        {showSettingsModal && (
          <SettingsModal onClose={() => setShowSettingsModal(false)} />
        )}
        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}
      </div>
    );
  }

  if (showCosts) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          notificationCount={urgentCount}
          onNotificationClick={() => setShowNotificationModal(true)}
          onSettingsClick={() => setShowSettingsModal(true)}
          onProfileClick={() => setShowProfileModal(true)}
          onDeadlinesClick={() => { navigate('/deadlines'); }}
          onCostsClick={() => { navigate('/costs'); }}
          onLogoClick={() => navigate('/')}
          onVehiclesClick={() => { navigate('/'); setSelectedVehicle(null); }}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CostsPage vehicles={vehicles} onBack={() => navigate('/')} refreshToken={costsRefreshToken} />
        </main>
        {showNotificationModal && (
          <NotificationModal
            notifications={priorityNotifications}
            onClose={() => setShowNotificationModal(false)}
          />
        )}
        {showSettingsModal && (
          <SettingsModal onClose={() => setShowSettingsModal(false)} />
        )}
        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}
      </div>
    );
  }

  if (showHistory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          notificationCount={urgentCount}
          onNotificationClick={() => setShowNotificationModal(true)}
          onSettingsClick={() => setShowSettingsModal(true)}
          onProfileClick={() => setShowProfileModal(true)}
          onDeadlinesClick={() => { navigate('/deadlines'); }}
          onCostsClick={() => { navigate('/costs'); }}
          onLogoClick={() => navigate('/')}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <HistoryPage vehicles={vehicles} onBack={() => navigate('/')} />
        </main>
        {showNotificationModal && (
          <NotificationModal
            notifications={priorityNotifications}
            onClose={() => setShowNotificationModal(false)}
          />
        )}
        {showSettingsModal && (
          <SettingsModal onClose={() => setShowSettingsModal(false)} />
        )}
        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}
      </div>
    );
  }

  if (selectedVehicle) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          notificationCount={urgentCount}
          onNotificationClick={() => setShowNotificationModal(true)}
          onSettingsClick={() => setShowSettingsModal(true)}
          onProfileClick={() => setShowProfileModal(true)}
          onDeadlinesClick={() => { navigate('/deadlines'); setSelectedVehicle(null); }}
          onCostsClick={() => { navigate('/costs'); setSelectedVehicle(null); }}
          onLogoClick={() => setSelectedVehicle(null)}
          onVehiclesClick={() => { navigate('/'); setSelectedVehicle(null); }}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <VehicleDetail
            vehicle={selectedVehicle}
            notifications={getNotificationsForVehicle(selectedVehicle.id)}
            maintenances={maintenances}
            onBack={() => setSelectedVehicle(null)}
            onAddMaintenance={async (maintenance) => {
              const res = await addMaintenance(maintenance);
              if ((res as any)?.success) {
                await refreshNotifications();
                setCostsRefreshToken(prev => prev + 1);
                await loadMaintenances();
              }
              return res as any;
            }}
            onRefreshNotifications={async () => { await refreshNotifications(); await loadMaintenances(); }}
            onUpdateMaintenance={updateMaintenance}
            onDeleteMaintenance={async (id) => {
              const res = await deleteMaintenance(id);
              if (res && res.success) {
                await refreshNotifications();
                setCostsRefreshToken(prev => prev + 1);
                await loadMaintenances();
              }
              return res as any;
            }}
            onUpdateVehicleMileage={async (newMileage: number) => {
              const res = await updateVehicle(selectedVehicle.id, { currentMileage: newMileage });
              if (res.success) {
                setSelectedVehicle(prev => prev ? { ...prev, currentMileage: newMileage } : prev);
              }
              return res;
            }}
          />
        </main>
        
        {/* Modals */}
        {showNotificationModal && (
          <NotificationModal
            notifications={priorityNotifications}
            onClose={() => setShowNotificationModal(false)}
          />
        )}
        {showSettingsModal && (
          <SettingsModal onClose={() => setShowSettingsModal(false)} />
        )}
        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <Header 
          notificationCount={priorityNotifications.length}
          onNotificationClick={() => setShowNotificationModal(true)}
          onSettingsClick={() => setShowSettingsModal(true)}
          onProfileClick={() => setShowProfileModal(true)}
          onDeadlinesClick={() => navigate('/deadlines')}
          onCostsClick={() => navigate('/costs')}
          onLogoClick={() => { navigate('/'); setSelectedVehicle(null); }}
          onVehiclesClick={() => { navigate('/'); setSelectedVehicle(null); }}
        />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Benvenuto su A Bordo
          </h1>
          <p className="text-lg text-gray-600">
            Gestisci i tuoi veicoli, monitora le scadenze e mantieni tutto sotto controllo
          </p>
        </div>

        {/* Stats Grid */}
        <StatsGrid stats={stats} onDeadlinesClick={() => navigate('/deadlines')} />

        {/* Quick action: History page link */}
        <div className="mt-6 mb-4 flex items-center justify-end">
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Storico interventi e pagamenti →
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Vehicles Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                I Tuoi Veicoli ({vehicles.length})
              </h2>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Veicolo
              </Button>
            </div>

            {vehicles.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <div className="max-w-sm mx-auto">
                  <svg className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun veicolo registrato</h3>
                  <p className="text-gray-500 mb-4">Inizia aggiungendo il tuo primo veicolo per monitorare tutte le scadenze</p>
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi il primo veicolo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    notifications={getNotificationsForVehicle(vehicle.id)}
                    onSelect={setSelectedVehicle}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Notifications Panel */}
          <div className="lg:col-span-1">
          <NotificationCenter
            notifications={priorityNotifications}
            onViewAll={() => navigate('/deadlines')}
          />
          </div>
        </div>
      </main>

      {/* Add Vehicle Modal */}
      {showAddForm && (
        <AddVehicleForm
          onSubmit={handleAddVehicle}
          onCancel={() => setShowAddForm(false)}
        />
      )}
      
      {/* Modals */}
      {showNotificationModal && (
        <NotificationModal
          notifications={priorityNotifications}
          onClose={() => setShowNotificationModal(false)}
        />
      )}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster richColors />
    </AuthProvider>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento A Bordo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LandingPage />;
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/deadlines" element={<Dashboard />} />
      <Route path="/costs" element={<Dashboard />} />
      <Route path="/history" element={<Dashboard />} />
    </Routes>
  );
};

export default App;
