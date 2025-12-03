import React from 'react';
import { Calendar, MapPin, Euro, Wrench, CheckCircle, Shield, CreditCard, Circle, Droplets, Fuel, Filter, AlertTriangle, Settings } from 'lucide-react';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { MaintenanceRecord } from '../../types/maintenance';
import { formatDate } from '../../utils/dateUtils';

interface MaintenanceListProps {
  maintenances: MaintenanceRecord[];
  currentMileage?: number;
  onEdit?: (maintenance: MaintenanceRecord) => void;
  onDelete?: (maintenanceId: string) => void;
}

export const MaintenanceList: React.FC<MaintenanceListProps> = ({ 
  maintenances, 
  currentMileage = 0,
  onEdit, 
  onDelete 
}) => {
  const getMaintenanceIcon = (type: string) => {
    switch (type) {
      case 'service': return <Wrench className="h-5 w-5" />;
      case 'inspection': return <CheckCircle className="h-5 w-5" />;
      case 'insurance': return <Shield className="h-5 w-5" />;
      case 'tax': return <CreditCard className="h-5 w-5" />;
      case 'tires': return <Circle className="h-5 w-5" />;
      case 'adblue': return <Droplets className="h-5 w-5" />;
      case 'oil': return <Fuel className="h-5 w-5" />;
      case 'filters': return <Filter className="h-5 w-5" />;
      case 'brakes': return <AlertTriangle className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  const getMaintenanceColor = (type: string) => {
    switch (type) {
      case 'service': return 'text-blue-600 bg-blue-50';
      case 'inspection': return 'text-green-600 bg-green-50';
      case 'insurance': return 'text-purple-600 bg-purple-50';
      case 'tax': return 'text-orange-600 bg-orange-50';
      case 'tires': return 'text-gray-600 bg-gray-50';
      case 'adblue': return 'text-cyan-600 bg-cyan-50';
      case 'oil': return 'text-yellow-600 bg-yellow-50';
      case 'filters': return 'text-indigo-600 bg-indigo-50';
      case 'brakes': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getNextDueStatus = (maintenance: MaintenanceRecord) => {
    if (maintenance.nextDue) {
      const today = new Date();
      const nextDue = new Date(maintenance.nextDue);
      const diffTime = nextDue.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return 'expired';
      if (diffDays <= 7) return 'critical';
      if (diffDays <= 30) return 'warning';
      return 'safe';
    }
    if (typeof maintenance.nextMileage === 'number' && maintenance.nextMileage > 0) {
      const kmUntil = maintenance.nextMileage - (currentMileage ?? 0);
      if (kmUntil <= 0) return 'expired';
      if (kmUntil <= 250) return 'critical';
      if (kmUntil <= 600) return 'warning';
      return 'safe';
    }
    return null;
  };

  if (maintenances.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nessuna manutenzione registrata
        </h3>
        <p className="text-gray-600">
          Inizia a registrare le manutenzioni del tuo veicolo per tenere tutto sotto controllo
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {maintenances.map((maintenance) => {
        const nextDueStatus = getNextDueStatus(maintenance);
        
        return (
          <Card key={maintenance.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${getMaintenanceColor(maintenance.type)}`}>
                  {getMaintenanceIcon(maintenance.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{maintenance.title}</h3>
                  <p className="text-sm text-gray-600">{maintenance.description}</p>
                </div>
              </div>
              
              {nextDueStatus && (
                <StatusBadge status={nextDueStatus}>
                  {nextDueStatus === 'expired' ? 'SCADUTA' :
                   nextDueStatus === 'critical' ? 'URGENTE' :
                   nextDueStatus === 'warning' ? 'IN SCADENZA' : 'OK'}
                </StatusBadge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <div>
                  <p className="font-medium">Data</p>
                  <p>{formatDate(maintenance.date)}</p>
                </div>
              </div>

              {maintenance.mileage && (
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-4 h-4 mr-2 bg-gray-400 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">Km</span>
                  </div>
                  <div>
                    <p className="font-medium">Chilometraggio</p>
                    <p>{maintenance.mileage.toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center text-sm text-gray-600">
                <Euro className="h-4 w-4 mr-2" />
                <div>
                  <p className="font-medium">Costo</p>
                  <p>€{maintenance.cost.toFixed(2)}</p>
                </div>
              </div>

              {maintenance.location && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <div>
                    <p className="font-medium">Luogo</p>
                    <p>{maintenance.location}</p>
                  </div>
                </div>
              )}
            </div>

            {(maintenance.nextDue || (typeof maintenance.nextMileage === 'number' && maintenance.nextMileage > 0)) && (
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Prossima Scadenza</p>
                    {maintenance.nextDue ? (
                      <p className="text-sm text-blue-700">{formatDate(maintenance.nextDue)}</p>
                    ) : (
                      <p className="text-sm text-blue-700">
                        Km rimanenti: {(maintenance.nextMileage! - (currentMileage ?? 0)).toLocaleString()} km
                      </p>
                    )}
                  </div>
                  {typeof maintenance.nextMileage === 'number' && maintenance.nextMileage > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-900">A</p>
                      <p className="text-sm text-blue-700">{maintenance.nextMileage.toLocaleString()} km</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {maintenance.notes && (
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Note</p>
                <p className="text-sm text-gray-600">{maintenance.notes}</p>
              </div>
            )}

            {(onDelete) && (
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                  onClick={() => onEdit?.(maintenance)}
                  className="text-sm text-gray-700 hover:text-gray-900 font-medium"
                >
                  Info
                </button>
                <button
                  onClick={() => onDelete(maintenance.id)}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Elimina
                </button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
