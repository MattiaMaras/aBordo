import { Vehicle, VehicleNotification } from '../types/vehicle';
import { getDaysUntilExpiry, getNotificationStatus } from './dateUtils';

export const getFuelTypeLabel = (fuelType: string): string => {
  const labels = {
    gasoline: 'Benzina',
    diesel: 'Gasolio',
    hybrid: 'Ibrida',
    electric: 'Elettrica',
    lpg: 'GPL',
    methane: 'Metano'
  };
  return labels[fuelType as keyof typeof labels] || fuelType;
};

export const getVehicleDisplayName = (vehicle: Vehicle): string => {
  return `${vehicle.brand} ${vehicle.model} (${vehicle.year})`;
};

export const calculateServiceDue = (currentMileage: number, lastServiceMileage: number, serviceInterval: number): boolean => {
  return (currentMileage - lastServiceMileage) >= serviceInterval;
};

export const generateMockNotifications = (vehicleId: string): VehicleNotification[] => {
  const notifications: VehicleNotification[] = [];
  
  // Mock insurance expiry
  const insuranceExpiry = new Date();
  insuranceExpiry.setDate(insuranceExpiry.getDate() + 15);
  const insuranceDays = getDaysUntilExpiry(insuranceExpiry.toISOString().split('T')[0]);
  
  notifications.push({
    id: `${vehicleId}-insurance`,
    vehicleId,
    type: 'insurance',
    status: getNotificationStatus(insuranceDays),
    daysUntilExpiry: insuranceDays,
    message: `Assicurazione in scadenza tra ${insuranceDays} giorni`,
    expiryDate: insuranceExpiry.toISOString().split('T')[0]
  });
  
  // Mock tax expiry
  const taxExpiry = new Date();
  taxExpiry.setDate(taxExpiry.getDate() + 45);
  const taxDays = getDaysUntilExpiry(taxExpiry.toISOString().split('T')[0]);
  
  notifications.push({
    id: `${vehicleId}-tax`,
    vehicleId,
    type: 'tax',
    status: getNotificationStatus(taxDays),
    daysUntilExpiry: taxDays,
    message: `Bollo auto in scadenza tra ${taxDays} giorni`,
    expiryDate: taxExpiry.toISOString().split('T')[0]
  });
  
  return notifications.filter(n => n.daysUntilExpiry <= 60);
};