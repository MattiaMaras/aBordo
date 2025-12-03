import React from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { VehicleNotification } from '../../types/vehicle';
import { formatDate } from '../../utils/dateUtils';

interface NotificationCenterProps {
  notifications: VehicleNotification[];
  onViewAll?: () => void;
  onUpdateStatus?: (notificationId: string, status: VehicleNotification['status']) => Promise<{ success: boolean; error?: string }> | void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onViewAll }) => {
  const getNotificationIcon = (status: string) => {
    switch (status) {
      case 'safe':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      insurance: 'Assicurazione',
      tax: 'Bollo auto',
      inspection: 'Revisione',
      service: 'Tagliando',
      maintenance: 'Manutenzione',
    };
    return map[type] || 'Scadenza';
  };
  
/*
  const getMaintenanceDetailLabel = (message?: string) => {
    if (!message) return 'Manutenzione';
    const known = ['Cambio olio', 'Filtri', 'Freni', 'Cambio pneumatici', 'AdBlue', 'Tagliando'];
    for (const k of known) {
      if (message.toLowerCase().includes(k.toLowerCase())) return k;
    }
    const idx = message.indexOf(' in scadenza');
    if (idx > 0) return message.slice(0, idx);
    const idx2 = message.indexOf(' tra ');
    if (idx2 > 0) return message.slice(0, idx2);
    const idx3 = message.indexOf(' scadut');
    if (idx3 > 0) return message.slice(0, idx3);
    return 'Manutenzione';
  }; */

  if (notifications.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Centro Notifiche</h3>
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">Nessuna scadenza imminente!</p>
          <p className="text-sm text-gray-500 mt-2">Tutti i tuoi veicoli sono in regola</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Centro Notifiche
        <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {notifications.length}
        </span>
      </h3>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <div key={notification.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-start space-x-3">
              {getNotificationIcon(notification.status)}
              <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                <span className="mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {getTypeLabel(notification.type)}
                </span>
                {notification.message}
              </p>
              {((notification as any).vehicle) && (
                <p className="text-xs text-gray-500 mt-1">
                  {((notification as any).vehicle.brand)} {((notification as any).vehicle.model)} • {((notification as any).vehicle.plateNumber)}
                </p>
              )}
              {(notification as any).kmUntil !== undefined ? (
                <p className="text-xs text-gray-500 mt-1">
                  Km rimanenti: {(notification as any).kmUntil} km
                </p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mt-1">
                    Scadenza: {formatDate(notification.expiryDate)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Giorni rimanenti: {notification.daysUntilExpiry}</p>
                </>
              )}
              {((notification as any).nextMileage || (notification as any).nextServiceMileage) && (
                <p className="text-xs text-gray-500 mt-1">
                  A {(((notification as any).nextMileage) || ((notification as any).nextServiceMileage))} km
                </p>
              )}
              <div className="mt-2">
                <StatusBadge status={notification.status}>
                  {notification.status === 'expired' ? 'SCADUTA' :
                   notification.status === 'critical' ? 'URGENTE' :
                   notification.status === 'warning' ? 'IN SCADENZA' : 'OK'}
                </StatusBadge>
              </div>
              </div>
            </div>
            {/* Azioni rimosse: la marcatura come "Sicura" è disponibile solo dalla pagina Scadenze */}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Vedi tutte le scadenze →
          </button>
        )}
      </div>
    </Card>
  );
};
