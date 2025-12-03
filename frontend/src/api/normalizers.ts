import { Service } from '../types/vehicle';
import { MaintenanceRecord } from '../types/maintenance';

export const normalizeServiceList = (list: any[], vehicleId: string): Service[] => {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((db: any) => ({
    id: String(db.id ?? ''),
    vehicleId: String(db.vehicleId ?? db.vehicle_id ?? vehicleId),
    lastServiceMileage: Number(db.lastServiceMileage ?? db.last_service_mileage ?? 0),
    lastServiceDate: db.lastServiceDate ?? db.last_service_date ?? '',
    serviceInterval: Number(db.serviceInterval ?? db.service_interval ?? 0),
    nextServiceMileage: Number(db.nextServiceMileage ?? db.next_service_mileage ?? 0),
    serviceType: (db.serviceType ?? db.service_type ?? 'regular') as Service['serviceType'],
  }));
};

const toUiMaintenanceType = (dbType: string): MaintenanceRecord['type'] => {
  switch (dbType) {
    case 'oil_change':
      return 'oil';
    case 'filters':
      return 'filters';
    case 'brakes':
      return 'brakes';
    case 'tires':
      return 'tires';
    case 'adblue':
      return 'adblue';
    case 'belts':
      return 'other';
    default:
      return (dbType as MaintenanceRecord['type']) || 'other';
  }
};

export const normalizeMaintenanceList = (list: any[], vehicleId: string): MaintenanceRecord[] => {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((db: any) => ({
    id: String(db.id ?? ''),
    vehicleId: String(db.vehicle_id ?? db.vehicleId ?? vehicleId),
    type: toUiMaintenanceType(db.type ?? 'other'),
    title: db.title ?? 'Manutenzione',
    description: db.description ?? '',
    date: db.last_maintenance ?? db.date ?? new Date().toISOString().split('T')[0],
    nextDue: db.next_maintenance ?? undefined,
    mileage: typeof db.last_mileage === 'number' ? db.last_mileage : (typeof db.mileage === 'number' ? db.mileage : undefined),
    nextMileage: typeof db.next_mileage === 'number' ? db.next_mileage : undefined,
    cost: typeof db.cost === 'number' ? db.cost : (parseFloat(db.cost ?? '0') || 0),
    location: undefined,
    notes: undefined,
    documents: undefined,
    reminderDays: undefined,
    isRecurring: false,
    intervalType: undefined,
    intervalValue: undefined,
  }));
};
