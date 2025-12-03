import React from 'react';
import { Car, Bell, Settings, User, Calendar, CreditCard, List } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  notificationCount: number;
  onNotificationClick?: () => void;
  onSettingsClick?: () => void;
  onProfileClick?: () => void;
  onDeadlinesClick?: () => void;
  onCostsClick?: () => void;
  onLogoClick?: () => void;
  onVehiclesClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  notificationCount, 
  onNotificationClick,
  onSettingsClick,
  onProfileClick,
  onDeadlinesClick,
  onCostsClick,
  onLogoClick,
  onVehiclesClick,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button onClick={onLogoClick} className="flex items-center space-x-3 group">
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">A Bordo</h1>
              <p className="text-xs text-gray-500">Gestione Veicoli Completa</p>
            </div>
          </button>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={onVehiclesClick}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Veicoli"
              aria-label="Veicoli"
            >
              <div className="flex items-center gap-2">
                <List className="h-5 w-5" />
                <span className="hidden sm:inline text-sm">Veicoli</span>
              </div>
            </button>
            <button 
              onClick={onDeadlinesClick}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Scadenze"
              aria-label="Scadenze"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span className="hidden sm:inline text-sm">Scadenze</span>
              </div>
            </button>
            <button 
              onClick={onCostsClick}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Costi"
              aria-label="Costi"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <span className="hidden sm:inline text-sm">Costi</span>
              </div>
            </button>
            <button 
              onClick={onNotificationClick}
              className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Notifiche"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
            
            <button 
              onClick={onSettingsClick}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              title="Impostazioni"
            >
              <Settings className="h-5 w-5" />
            </button>
            
            <div className="relative group">
              <button 
                onClick={onProfileClick}
                className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Profilo"
              >
                <User className="h-5 w-5" />
                <span className="text-sm font-medium">{user?.firstName}</span>
              </button>
              
              {/* Dropdown menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="px-4 py-2 text-sm text-gray-700 border-b">
                  <div className="font-medium">{user?.firstName} {user?.lastName}</div>
                  <div className="text-gray-500">{user?.email}</div>
                </div>
                <button 
                  onClick={onProfileClick}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Il mio profilo
                </button>
                {/* Impostazioni rimosse dal dropdown per semplificazione */}
                <button 
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t"
                >
                  Esci
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
