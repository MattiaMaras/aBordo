import React from 'react';
import { Car, Calendar, MapPin, Fuel, AlertTriangle } from 'lucide-react';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { Vehicle, VehicleNotification } from '../../types/vehicle';
import { getFuelTypeLabel } from '../../utils/vehicleUtils';

interface VehicleCardProps {
  vehicle: Vehicle;
  notifications: VehicleNotification[];
  onSelect: (vehicle: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, notifications, onSelect }) => {
  const criticalNotifications = notifications.filter(n => n.status === 'critical' || n.status === 'expired');
  const warningNotifications = notifications.filter(n => n.status === 'warning');
  const visibleNotifications = notifications.filter(n => n.status === 'critical' || n.status === 'warning' || n.status === 'expired');
  
  const getOverallStatus = () => {
    if (criticalNotifications.length > 0) return 'critical';
    if (warningNotifications.length > 0) return 'warning';
    return 'safe';
  };

  return (
    <Card onClick={() => onSelect(vehicle)} className="p-6 relative">
      {visibleNotifications.length > 0 && (
        <div className="absolute top-4 right-4">
          <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            {visibleNotifications.length}
          </div>
        </div>
      )}
      
      <div className="flex items-start space-x-4">
        <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
          <Car className="h-8 w-8 text-blue-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-sm text-gray-500 mb-3">{vehicle.plateNumber}</p>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              Anno: {vehicle.year}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              Km: {vehicle.currentMileage.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Fuel className="h-4 w-4 mr-2" />
              {getFuelTypeLabel(vehicle.fuelType)}
            </div>
          </div>
          
          <div className="mt-4">
            <StatusBadge status={getOverallStatus()}>
              {getOverallStatus() === 'critical' ? 'URGENTE' :
               getOverallStatus() === 'warning' ? 'CONTROLLI IN SCADENZA' :
               'TUTTO OK'}
            </StatusBadge>
          </div>
          
          {visibleNotifications.length > 0 && (
            <div className="mt-3 space-y-1">
              {visibleNotifications.slice(0, 2).map((notification) => (
                <div key={notification.id} className="flex items-center text-xs text-gray-500">
                  <AlertTriangle className="h-3 w-3 mr-1 text-orange-500" />
                  {notification.message}
                </div>
              ))}
              {visibleNotifications.length > 2 && (
                <p className="text-xs text-gray-400">
                  +{visibleNotifications.length - 2} altre notifiche
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
