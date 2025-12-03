export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: 'service' | 'inspection' | 'insurance' | 'tax' | 'tires' | 'adblue' | 'oil' | 'filters' | 'brakes' | 'other';
  title: string;
  description: string;
  date: string;
  nextDue?: string;
  mileage?: number;
  nextMileage?: number;
  cost: number;
  location?: string;
  notes?: string;
  documents?: string[];
  reminderDays?: number[];
  isRecurring: boolean;
  intervalType?: 'days' | 'months' | 'kilometers';
  intervalValue?: number;
}

export interface MaintenanceType {
  id: string;
  name: string;
  icon: string;
  color: string;
  defaultInterval?: number;
  defaultIntervalType?: 'days' | 'months' | 'kilometers';
  defaultReminderDays?: number[];
}

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  {
    id: 'service',
    name: 'Tagliando',
    icon: 'Wrench',
    color: 'blue',
    defaultInterval: 15000,
    defaultIntervalType: 'kilometers',
    defaultReminderDays: [30, 14, 7]
  },
  {
    id: 'inspection',
    name: 'Revisione',
    icon: 'CheckCircle',
    color: 'green',
    defaultInterval: 24,
    defaultIntervalType: 'months',
    defaultReminderDays: [60, 30, 14, 7]
  },
  {
    id: 'insurance',
    name: 'Assicurazione',
    icon: 'Shield',
    color: 'purple',
    defaultInterval: 12,
    defaultIntervalType: 'months',
    defaultReminderDays: [60, 30, 14, 7, 1]
  },
  {
    id: 'tax',
    name: 'Bollo Auto',
    icon: 'CreditCard',
    color: 'orange',
    defaultInterval: 12,
    defaultIntervalType: 'months',
    defaultReminderDays: [30, 14, 7, 1]
  },
  {
    id: 'tires',
    name: 'Pneumatici',
    icon: 'Circle',
    color: 'gray',
    defaultInterval: 6,
    defaultIntervalType: 'months',
    defaultReminderDays: [30, 14]
  },
  {
    id: 'adblue',
    name: 'AdBlue',
    icon: 'Droplets',
    color: 'cyan',
    defaultInterval: 5000,
    defaultIntervalType: 'kilometers',
    defaultReminderDays: [7, 3]
  },
  {
    id: 'oil',
    name: 'Cambio Olio',
    icon: 'Fuel',
    color: 'yellow',
    defaultInterval: 10000,
    defaultIntervalType: 'kilometers',
    defaultReminderDays: [14, 7]
  },
  {
    id: 'filters',
    name: 'Filtri',
    icon: 'Filter',
    color: 'indigo',
    defaultInterval: 20000,
    defaultIntervalType: 'kilometers',
    defaultReminderDays: [14, 7]
  },
  {
    id: 'brakes',
    name: 'Freni',
    icon: 'AlertTriangle',
    color: 'red',
    defaultInterval: 30000,
    defaultIntervalType: 'kilometers',
    defaultReminderDays: [30, 14, 7]
  },
  {
    id: 'other',
    name: 'Altro',
    icon: 'Settings',
    color: 'gray',
    defaultReminderDays: [14, 7]
  }
];