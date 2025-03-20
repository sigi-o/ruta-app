
import { Driver, DeliveryStop, ScheduleDay } from '@/types';
import { defaultTimeSlots } from './types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

export const today = format(new Date(), 'yyyy-MM-dd');

export const defaultDrivers: Driver[] = [
  { id: uuidv4(), name: 'John Smith', color: '#3B82F6', available: true },
  { id: uuidv4(), name: 'Sarah Johnson', color: '#10B981', available: true },
  { id: uuidv4(), name: 'Michael Chen', color: '#6366F1', available: true },
  { id: uuidv4(), name: 'Jessica Lee', color: '#F59E0B', available: true },
  { id: uuidv4(), name: 'David Kim', color: '#EC4899', available: true },
];

export const defaultStops: DeliveryStop[] = [
  {
    id: uuidv4(),
    businessName: 'Acme Corporation',
    clientName: 'John Doe',
    address: '123 Business Ave',
    deliveryTime: '10:00',
    deliveryDate: today,
    status: 'unassigned',
    orderNumber: 'ORD-001',
    stopType: 'delivery',
  },
  {
    id: uuidv4(),
    businessName: 'TechStart Inc',
    clientName: 'Jane Smith',
    address: '456 Innovation Blvd',
    deliveryTime: '11:30',
    deliveryDate: today,
    status: 'unassigned',
    orderNumber: 'ORD-002',
    stopType: 'delivery',
  },
  {
    id: uuidv4(),
    businessName: 'Downtown Deli',
    clientName: 'Robert Johnson',
    address: '789 Main St',
    deliveryTime: '12:00',
    deliveryDate: today,
    status: 'unassigned',
    orderNumber: 'ORD-003',
    stopType: 'delivery',
  },
  {
    id: uuidv4(),
    businessName: 'City Butcher',
    address: '321 Meat Lane',
    deliveryTime: '08:30',
    deliveryDate: today,
    status: 'unassigned',
    orderNumber: 'ORD-004',
    stopType: 'other',
    specialInstructions: 'Pick up catering meat order'
  },
  {
    id: uuidv4(),
    businessName: 'Party Supply Co',
    address: '555 Event Road',
    deliveryTime: '09:00',
    deliveryDate: today,
    status: 'unassigned',
    orderNumber: 'ORD-005',
    stopType: 'other',
    specialInstructions: 'Pick up 10 chafing dishes and 5 coffee urns'
  }
];

export const emptyScheduleDay: ScheduleDay = {
  date: today,
  drivers: [],
  stops: [],
  timeSlots: defaultTimeSlots,
  driverAvailability: [],
};
