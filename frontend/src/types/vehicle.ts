export interface Vehicle {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  currentMileage: number;
  fuelType: 'gasoline' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'methane';
  createdAt: string;
  updatedAt: string;
}

export interface Insurance {
  id: string;
  vehicleId: string;
  company: string;
  policyNumber?: string;
  expiryDate: string;
  annualPremium: number;
  paymentHistory: PaymentRecord[];
}

export interface CarTax {
  id: string;
  vehicleId: string;
  expiryDate: string;
  amount: number;
  region: string;
  isPaid: boolean;
}

export interface Inspection {
  id: string;
  vehicleId: string;
  lastInspectionDate: string;
  nextInspectionDate: string;
  inspectionCenter: string;
  cost: number;
}

export interface Service {
  id: string;
  vehicleId: string;
  lastServiceMileage: number;
  lastServiceDate: string;
  serviceInterval: number; // km
  nextServiceMileage: number;
  serviceType: 'regular' | 'major';
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  type: 'oil_change' | 'filters' | 'belts' | 'brakes' | 'tires' | 'adblue';
  lastMaintenance: string;
  nextMaintenance: string;
  cost: number;
  description: string;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  description: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  daysAdvance: number[];
  notificationTypes: string[];
}

export interface DashboardStats {
  totalVehicles: number;
  expiringSoon: number;
  totalMonthlyCosts: number;
  nextService: string;
}

export type NotificationStatus = 'safe' | 'warning' | 'critical' | 'expired';

export interface VehicleNotification {
  id: string;
  vehicleId: string;
  type: 'insurance' | 'tax' | 'inspection' | 'service' | 'maintenance';
  status: NotificationStatus;
  daysUntilExpiry: number;
  message: string;
  expiryDate: string;
  // dettagli opzionali per manutenzioni/interventi
  description?: string;
  // opzionali per scadenze chilometriche
  kmUntil?: number;
  nextMileage?: number;
  // legacy per tagliando
  kmUntilService?: number;
  nextServiceMileage?: number;
}
