
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
  businessName?: string;  // Changed from required to optional
  clientName?: string;   // Already optional
  address: string;
  deliveryTime: string; // format: 'HH:MM'
  deliveryDate: string; // format: 'YYYY-MM-DD'
  specialInstructions?: string;
  status: 'unassigned' | 'assigned';
  driverId?: string;
  orderNumber?: string;
  contactPhone?: string;
  items?: string[];
  estimatedDuration?: number; // in minutes
  stopType: 'delivery' | 'pickup' | 'other';
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

export interface ParsedCsvData {
  reportDate: string | null;
  deliveries: Record<string, string>[];
  totalRows: number;
  successfulRows: number;
  errors: CsvParseError[];
  warnings: CsvParseWarning[];
  columnMap?: Record<string, number>;
}

export interface CsvParseError {
  row: number;
  message: string;
  field?: string;
  originalValue?: string;
}

export interface CsvParseWarning {
  row: number;
  message: string;
  field?: string;
  originalValue?: string;
  correctedValue?: string;
}

export interface CsvColumn {
  index: number;
  name: string;
  required: boolean;
  alternateNames: string[];
}
