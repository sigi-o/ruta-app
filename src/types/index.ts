export interface Driver {
  id: string;
  name: string;
  color: string;
  vehicleType?: string;
  phoneNumber?: string;
  notes?: string;
  available?: boolean;
}

export interface DeliveryStop {
  id: string;
  clientName: string;
  address: string;
  deliveryTime: string; // format: 'HH:MM'
  specialInstructions?: string;
  status: 'unassigned' | 'assigned';
  driverId?: string;
  orderNumber?: string;
  contactPhone?: string;
  items?: string[];
  estimatedDuration?: number; // in minutes
  stopType: 'delivery' | 'pickup' | 'butcher' | 'equipment';
}

export interface TimeSlot {
  time: string; // format: 'HH:MM'
  label: string;
}

export interface ScheduleDay {
  date: string;
  drivers: Driver[];
  stops: DeliveryStop[];
  timeSlots: TimeSlot[];
}

export interface ImportedCsvData {
  orderNumber: string;
  clientName: string;
  address: string;
  deliveryTime: string;
  contactPhone?: string;
  items?: string[];
  specialInstructions?: string;
}
