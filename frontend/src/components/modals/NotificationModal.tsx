import React from 'react';
import { X, Bell, CheckCircle, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { VehicleNotification } from '../../types/vehicle';
import { formatDate } from '../../utils/dateUtils';
import { StatusBadge } from '../common/StatusBadge';

interface NotificationModalProps {
  notifications: VehicleNotification[];
  onClose: () => void;
  onUpdateStatus?: (notificationId: string, status: VehicleNotification['status']) => Promise<{ success: boolean; error?: string }> | void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ notifications, onClose}) => {
  const getNotificationIcon = (status: string) => {
    switch (status) {
      case 'safe':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Bell className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Centro Notifiche
              {notifications.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {notifications.length}
                </span>
              )}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Tutto sotto controllo!
              </h3>
              <p className="text-gray-600">
                Non hai notifiche urgenti al momento. Tutti i tuoi veicoli sono in regola.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-start space-x-4">
                    {getNotificationIcon(notification.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">
                          {notification.message}
                        </h4>
                        <StatusBadge status={notification.status}>
                          {notification.status === 'expired' ? 'SCADUTA' :
                           notification.status === 'critical' ? 'URGENTE' :
                           notification.status === 'warning' ? 'IN SCADENZA' : 'OK'}
                        </StatusBadge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Scadenza: {formatDate(notification.expiryDate)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {notification.daysUntilExpiry < 0 
                          ? `Scaduta da ${Math.abs(notification.daysUntilExpiry)} giorni`
                          : `Scade tra ${notification.daysUntilExpiry} giorni`
                        }
                      </p>
                    </div>
                  </div>
                  {/* Azioni rimosse: la marcatura come "Sicura" è disponibile solo dalla pagina Scadenze */}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Ricevi notifiche automatiche via email e app
            </p>
            <button 
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
