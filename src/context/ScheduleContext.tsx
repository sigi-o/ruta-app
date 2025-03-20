
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Driver, DeliveryStop, TimeSlot, ScheduleDay, DriverAvailability } from '@/types';
import { generateTimeSlots } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useDateSystem } from './DateContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { v4 as uuidv4 } from 'uuid';

interface ScheduleContextType {
  scheduleDay: ScheduleDay;
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  removeDriver: (driverId: string) => Promise<void>;
  updateDriver: (driverId: string, updatedDriver: Partial<Driver>) => Promise<void>;
  addStop: (stop: Omit<DeliveryStop, 'id' | 'status'>) => void;
  updateStop: (stopId: string, updatedStop: Partial<DeliveryStop>) => void;
  removeStop: (stopId: string) => void;
  assignStop: (stopId: string, driverId: string) => void;
  unassignStop: (stopId: string) => void;
  autoAssignStops: () => void;
  saveSchedule: () => void;
  loadSavedSchedule: () => void;
  importCsvData: (data: any[]) => void;
  isLoading: boolean;
  editStop: (stopId: string) => void;
  duplicateStop: (stopId: string) => void;
  getStopsForDate: (date: string) => DeliveryStop[];
  syncDriversWithDatabase: () => Promise<void>;
  syncStopsWithDatabase: () => Promise<void>;
  updateDriverAvailability: (driverId: string, date: string, isAvailable: boolean) => Promise<void>;
}

const defaultTimeSlots = generateTimeSlots('02:00', '23:30', 15);
const today = format(new Date(), 'yyyy-MM-dd');

const defaultDrivers: Driver[] = [
  { id: uuidv4(), name: 'John Smith', color: '#3B82F6', available: true },
  { id: uuidv4(), name: 'Sarah Johnson', color: '#10B981', available: true },
  { id: uuidv4(), name: 'Michael Chen', color: '#6366F1', available: true },
  { id: uuidv4(), name: 'Jessica Lee', color: '#F59E0B', available: true },
  { id: uuidv4(), name: 'David Kim', color: '#EC4899', available: true },
];

const defaultStops: DeliveryStop[] = [
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

const emptyScheduleDay: ScheduleDay = {
  date: today,
  drivers: [],
  stops: [],
  timeSlots: defaultTimeSlots,
  driverAvailability: [],
};

export const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const editStopEventChannel = new EventTarget();

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentDateString } = useDateSystem();
  const { user } = useAuth();
  
  const [scheduleDay, setScheduleDay] = useState<ScheduleDay>(emptyScheduleDay);
  const [isLoading, setIsLoading] = useState(false);
  const { errorToast } = useToast();
  const initialLoadComplete = useRef(false);
  const dataFetchedFromDb = useRef(false);

  useEffect(() => {
    if (!initialLoadComplete.current) {
      if (!user) {
        loadSavedSchedule();
        
        if (scheduleDay.drivers.length === 0 && scheduleDay.stops.length === 0) {
          setScheduleDay({
            date: today,
            drivers: defaultDrivers,
            stops: defaultStops,
            timeSlots: defaultTimeSlots,
            driverAvailability: [],
          });
        }
      }
      
      initialLoadComplete.current = true;
    }
    
    const handleEditStopEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.stopId) {
        const stop = scheduleDay.stops.find(s => s.id === customEvent.detail.stopId);
        if (stop) {
          editStopEventChannel.dispatchEvent(new CustomEvent('editStop', { detail: stop }));
        }
      }
    };
    
    window.addEventListener('editStop', handleEditStopEvent);
    
    return () => {
      window.removeEventListener('editStop', handleEditStopEvent);
    };
  }, [user, scheduleDay]);

  useEffect(() => {
    if (user !== null && !dataFetchedFromDb.current) {
      setScheduleDay({
        ...emptyScheduleDay,
        date: currentDateString,
      });
      
      fetchDriversFromDatabase();
      fetchStopsFromDatabase();
      dataFetchedFromDb.current = true;
    } else if (user === null) {
      dataFetchedFromDb.current = false;
    }
  }, [user, currentDateString]);

  useEffect(() => {
    if (user && currentDateString) {
      fetchDriverAvailabilityForDate(currentDateString);
    }
  }, [user, currentDateString]);

  const fetchDriverAvailabilityForDate = async (date: string) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log(`Fetching driver availability for date: ${date}`);
      
      const { data, error } = await supabase
        .from('driver_availability')
        .select('id, driver_id, date, is_available')
        .eq('date', date);
      
      if (error) {
        throw error;
      }
      
      if (data) {
        console.log(`Found ${data.length} driver availability records for date ${date}`);
        
        const availability: DriverAvailability[] = data.map(item => ({
          id: item.id,
          driverId: item.driver_id,
          date: item.date,
          isAvailable: item.is_available
        }));
        
        setScheduleDay(prev => ({
          ...prev,
          driverAvailability: availability,
        }));
      }
    } catch (error) {
      console.error('Error fetching driver availability:', error);
      errorToast({
        title: "Error Loading Driver Availability",
        description: "Failed to load driver availability from the database.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateDriverAvailability = async (driverId: string, date: string, isAvailable: boolean) => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to update driver availability.",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`Updating availability for driver ${driverId} on ${date} to ${isAvailable}`);
      
      const { data: existingData, error: checkError } = await supabase
        .from('driver_availability')
        .select('id')
        .eq('driver_id', driverId)
        .eq('date', date)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      let result;
      
      if (existingData) {
        result = await supabase
          .from('driver_availability')
          .update({
            is_available: isAvailable,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id);
      } else {
        result = await supabase
          .from('driver_availability')
          .insert({
            driver_id: driverId,
            date: date,
            is_available: isAvailable
          });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      setScheduleDay(prev => {
        const updatedAvailability = [...prev.driverAvailability];
        const existingIndex = updatedAvailability.findIndex(
          a => a.driverId === driverId && a.date === date
        );
        
        if (existingIndex !== -1) {
          updatedAvailability[existingIndex].isAvailable = isAvailable;
        } else {
          updatedAvailability.push({
            id: uuidv4(),
            driverId,
            date,
            isAvailable
          });
        }
        
        return {
          ...prev,
          driverAvailability: updatedAvailability
        };
      });
      
      if (!isAvailable) {
        const stopsToUnassign = scheduleDay.stops.filter(
          stop => stop.driverId === driverId && stop.deliveryDate === date
        );
        
        if (stopsToUnassign.length > 0) {
          for (const stop of stopsToUnassign) {
            await unassignStop(stop.id);
          }
          
          console.log(`${stopsToUnassign.length} stops were unassigned because the driver is now unavailable for this date.`);
        }
      }
      
      console.log(`Driver availability for ${date} has been updated.`);
      
    } catch (error) {
      console.error('Error updating driver availability:', error);
      errorToast({
        title: "Error Updating Availability",
        description: "Failed to update driver availability in the database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStopsFromDatabase = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log('Fetching stops from database for user:', user.id);
      const { data, error } = await supabase
        .from('delivery_stops')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log(`Found ${data.length} stops in database`);
        const stops: DeliveryStop[] = data.map(dbStop => ({
          id: dbStop.id,
          businessName: dbStop.business_name,
          clientName: dbStop.client_name || undefined,
          address: dbStop.address,
          deliveryTime: dbStop.delivery_time,
          deliveryDate: dbStop.delivery_date,
          specialInstructions: dbStop.special_instructions || undefined,
          status: dbStop.status as 'unassigned' | 'assigned',
          driverId: dbStop.driver_id || undefined,
          orderNumber: dbStop.order_number || undefined,
          contactPhone: dbStop.contact_phone || undefined,
          stopType: dbStop.stop_type as 'delivery' | 'pickup' | 'other',
          orderId: dbStop.order_id || undefined,
        }));
        
        setScheduleDay(prev => ({
          ...prev,
          stops: stops,
        }));
      } else {
        console.log('No stops found in database, using default empty array');
      }
    } catch (error) {
      console.error('Error fetching stops:', error);
      errorToast({
        title: "Error Loading Stops",
        description: "Failed to load stops from the database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDriversFromDatabase = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log('Fetching drivers from database for user:', user.id);
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log(`Found ${data.length} drivers in database`);
        const drivers: Driver[] = data.map(dbDriver => ({
          id: dbDriver.id,
          name: dbDriver.name,
          color: dbDriver.color,
          vehicleType: dbDriver.vehicle_type || undefined,
          phoneNumber: dbDriver.phone_number || undefined,
          notes: dbDriver.notes || undefined,
          available: dbDriver.available === null ? true : dbDriver.available,
        }));
        
        setScheduleDay(prev => ({
          ...prev,
          drivers: drivers,
        }));
      } else {
        console.log('No drivers found in database, using default empty array');
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      errorToast({
        title: "Error Loading Drivers",
        description: "Failed to load drivers from the database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncStopsWithDatabase = async () => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to sync with the database.",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data: dbStops, error: fetchError } = await supabase
        .from('delivery_stops')
        .select('id')
        .eq('user_id', user.id);
      
      if (fetchError) throw fetchError;
      
      const dbStopIds = new Set((dbStops || []).map(d => d.id));
      const currentStops = scheduleDay.stops;
      
      const stopsToAdd = currentStops.filter(s => !dbStopIds.has(s.id));
      const stopsToUpdate = currentStops.filter(s => dbStopIds.has(s.id));
      const stopsToDelete = Array.from(dbStopIds).filter(
        id => !currentStops.some(s => s.id === id)
      );
      
      if (stopsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('delivery_stops')
          .insert(stopsToAdd.map(stop => ({
            id: stop.id,
            user_id: user.id,
            business_name: stop.businessName,
            client_name: stop.clientName || null,
            address: stop.address,
            delivery_time: stop.deliveryTime,
            delivery_date: stop.deliveryDate,
            special_instructions: stop.specialInstructions || null,
            status: stop.status,
            driver_id: stop.driverId || null,
            order_number: stop.orderNumber || null,
            contact_phone: stop.contactPhone || null,
            stop_type: stop.stopType,
            order_id: stop.orderId || null,
          })));
        
        if (insertError) throw insertError;
      }
      
      for (const stop of stopsToUpdate) {
        const { error: updateError } = await supabase
          .from('delivery_stops')
          .update({
            business_name: stop.businessName,
            client_name: stop.clientName || null,
            address: stop.address,
            delivery_time: stop.deliveryTime,
            delivery_date: stop.deliveryDate,
            special_instructions: stop.specialInstructions || null,
            status: stop.status,
            driver_id: stop.driverId || null,
            order_number: stop.orderNumber || null,
            contact_phone: stop.contactPhone || null,
            stop_type: stop.stopType,
            order_id: stop.orderId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', stop.id)
          .eq('user_id', user.id);
        
        if (updateError) throw updateError;
      }
      
      if (stopsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('delivery_stops')
          .delete()
          .in('id', stopsToDelete)
          .eq('user_id', user.id);
        
        if (deleteError) throw deleteError;
      }
      
      console.log(`Sync Complete - Added: ${stopsToAdd.length}, Updated: ${stopsToUpdate.length}, Deleted: ${stopsToDelete.length}`);
      
    } catch (error) {
      console.error('Error syncing stops with database:', error);
      errorToast({
        title: "Sync Failed",
        description: "Failed to synchronize stops with the database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncDriversWithDatabase = async () => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to sync with the database.",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data: dbDrivers, error: fetchError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id);
      
      if (fetchError) throw fetchError;
      
      const dbDriverIds = new Set((dbDrivers || []).map(d => d.id));
      const currentDrivers = scheduleDay.drivers;
      
      const driversToAdd = currentDrivers.filter(d => !dbDriverIds.has(d.id));
      const driversToUpdate = currentDrivers.filter(d => dbDriverIds.has(d.id));
      const driversToDelete = Array.from(dbDriverIds).filter(
        id => !currentDrivers.some(d => d.id === id)
      );
      
      if (driversToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('drivers')
          .insert(driversToAdd.map(driver => ({
            id: driver.id,
            user_id: user.id,
            name: driver.name,
            color: driver.color,
            vehicle_type: driver.vehicleType || null,
            phone_number: driver.phoneNumber || null,
            notes: driver.notes || null,
            available: driver.available === undefined ? true : driver.available,
          })));
        
        if (insertError) throw insertError;
      }
      
      for (const driver of driversToUpdate) {
        const { error: updateError } = await supabase
          .from('drivers')
          .update({
            name: driver.name,
            color: driver.color,
            vehicle_type: driver.vehicleType || null,
            phone_number: driver.phoneNumber || null,
            notes: driver.notes || null,
            available: driver.available === undefined ? true : driver.available,
            updated_at: new Date().toISOString(),
          })
          .eq('id', driver.id)
          .eq('user_id', user.id);
        
        if (updateError) throw updateError;
      }
      
      if (driversToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('drivers')
          .delete()
          .in('id', driversToDelete)
          .eq('user_id', user.id);
        
        if (deleteError) throw deleteError;
      }
      
      console.log(`Sync Complete - Added: ${driversToAdd.length}, Updated: ${driversToUpdate.length}, Deleted: ${driversToDelete.length}`);
      
    } catch (error) {
      console.error('Error syncing drivers with database:', error);
      errorToast({
        title: "Sync Failed",
        description: "Failed to synchronize drivers with the database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStopsForDate = (date: string) => {
    return scheduleDay.stops.filter(stop => stop.deliveryDate === date);
  };

  const addDriver = async (driver: Omit<Driver, 'id'>) => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to add drivers.",
      });
      return;
    }

    const newDriverId = uuidv4();
    
    const newDriver: Driver = {
      ...driver,
      id: newDriverId,
      available: driver.available !== undefined ? driver.available : true,
    };

    try {
      const { error } = await supabase
        .from('drivers')
        .insert({
          id: newDriverId,
          user_id: user.id,
          name: driver.name,
          color: driver.color,
          vehicle_type: driver.vehicleType || null,
          phone_number: driver.phoneNumber || null,
          notes: driver.notes || null,
          available: driver.available === undefined ? true : driver.available,
        });

      if (error) throw error;

      setScheduleDay(prev => ({
        ...prev,
        drivers: [...prev.drivers, newDriver],
      }));

      console.log(`Driver ${driver.name} has been added to the schedule.`);
    } catch (error) {
      console.error('Error adding driver to database:', error);
      errorToast({
        title: "Error Adding Driver",
        description: "Failed to add driver to the database.",
      });
      throw error;
    }
  };

  const removeDriver = async (driverId: string) => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to remove drivers.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driverId)
        .eq('user_id', user.id);

      if (error) throw error;

      setScheduleDay(prev => {
        const updatedStops = prev.stops.map(stop => 
          stop.driverId === driverId ? { ...stop, driverId: undefined, status: 'unassigned' as const } : stop
        );

        return {
          ...prev,
          drivers: prev.drivers.filter(d => d.id !== driverId),
          stops: updatedStops,
        };
      });

      console.log("Driver has been removed and their stops unassigned.");
    } catch (error) {
      console.error('Error removing driver from database:', error);
      errorToast({
        title: "Error Removing Driver",
        description: "Failed to remove driver from the database.",
      });
      throw error;
    }
  };

  const updateDriver = async (driverId: string, updatedDriver: Partial<Driver>) => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to update drivers.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          name: updatedDriver.name,
          color: updatedDriver.color,
          vehicle_type: updatedDriver.vehicleType || null,
          phone_number: updatedDriver.phoneNumber || null,
          notes: updatedDriver.notes || null,
          available: updatedDriver.available === undefined ? true : updatedDriver.available,
          updated_at: new Date().toISOString(),
        })
        .eq('id', driverId)
        .eq('user_id', user.id);

      if (error) throw error;

      setScheduleDay(prev => {
        let updatedStops = [...prev.stops];
        
        if (updatedDriver.available === false) {
          updateDriverAvailability(driverId, currentDateString, false);
          
          updatedStops = prev.stops.map(stop => 
            stop.driverId === driverId && stop.deliveryDate === currentDateString 
              ? { ...stop, driverId: undefined, status: 'unassigned' as const } 
              : stop
          );
          
          console.log(`All stops for today (${currentDateString}) assigned to this driver have been unassigned.`);
        }

        return {
          ...prev,
          drivers: prev.drivers.map(driver => 
            driver.id === driverId ? { ...driver, ...updatedDriver } : driver
          ),
          stops: updatedStops,
        };
      });

      console.log("Driver information has been updated.");
    } catch (error) {
      console.error('Error updating driver in database:', error);
      errorToast({
        title: "Error Updating Driver",
        description: "Failed to update driver in the database.",
      });
      throw error;
    }
  };

  const addStop = async (stop: Omit<DeliveryStop, 'id' | 'status'>) => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to add stops.",
      });
      return;
    }

    const newStopId = uuidv4();
    
    const newStop: DeliveryStop = {
      ...stop,
      id: newStopId,
      status: 'unassigned',
      deliveryDate: stop.deliveryDate || currentDateString,
    };

    try {
      const { error } = await supabase
        .from('delivery_stops')
        .insert({
          id: newStopId,
          user_id: user.id,
          business_name: stop.businessName,
          client_name: stop.clientName || null,
          address: stop.address,
          delivery_time: stop.deliveryTime,
          delivery_date: stop.deliveryDate || currentDateString,
          special_instructions: stop.specialInstructions || null,
          status: 'unassigned',
          driver_id: null,
          order_number: stop.orderNumber || null,
          contact_phone: stop.contactPhone || null,
          stop_type: stop.stopType,
          order_id: stop.orderId || null,
        });

      if (error) {
        throw error;
      }

      setScheduleDay(prev => ({
        ...prev,
        stops: [...prev.stops, newStop],
      }));

      if (newStop.deliveryDate !== currentDateString) {
        errorToast({
          title: "Different Delivery Date",
          description: `This stop is scheduled for ${newStop.deliveryDate}, not the currently selected date (${currentDateString}).`,
        });
      } else {
        console.log(`${stop.businessName} has been added to the schedule.`);
      }
    } catch (error) {
      console.error('Error adding stop to database:', error);
      errorToast({
        title: "Error Adding Stop",
        description: "Failed to add stop to the database.",
      });
    }
  };

  const updateStop = async (stopId: string, updatedStop: Partial<DeliveryStop>) => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to update stops.",
      });
      return;
    }

    console.log(`Updating stop ${stopId} with data:`, updatedStop);
    
    setScheduleDay(prev => {
      const originalStop = prev.stops.find(s => s.id === stopId);
      const isDateChanging = updatedStop.deliveryDate && originalStop?.deliveryDate !== updatedStop.deliveryDate;
      
      const updatedStops = prev.stops.map(stop => 
        stop.id === stopId ? { ...stop, ...updatedStop } : stop
      );
      
      if (isDateChanging && updatedStop.deliveryDate !== currentDateString) {
        setTimeout(() => {
          errorToast({
            title: "Date Changed",
            description: `Stop date changed to ${updatedStop.deliveryDate}, which differs from current view (${currentDateString}).`,
          });
        }, 0);
      }
      
      return {
        ...prev,
        stops: updatedStops,
      };
    });

    try {
      const updatedFields: any = {};
      
      if (updatedStop.businessName) updatedFields.business_name = updatedStop.businessName;
      if (updatedStop.clientName !== undefined) updatedFields.client_name = updatedStop.clientName || null;
      if (updatedStop.address) updatedFields.address = updatedStop.address;
      if (updatedStop.deliveryTime) updatedFields.delivery_time = updatedStop.deliveryTime;
      if (updatedStop.deliveryDate) updatedFields.delivery_date = updatedStop.deliveryDate;
      if (updatedStop.specialInstructions !== undefined) updatedFields.special_instructions = updatedStop.specialInstructions || null;
      if (updatedStop.status) updatedFields.status = updatedStop.status;
      if (updatedStop.driverId !== undefined) updatedFields.driver_id = updatedStop.driverId || null;
      if (updatedStop.orderNumber !== undefined) updatedFields.order_number = updatedStop.orderNumber || null;
      if (updatedStop.contactPhone !== undefined) updatedFields.contact_phone = updatedStop.contactPhone || null;
      if (updatedStop.stopType) updatedFields.stop_type = updatedStop.stopType;
      if (updatedStop.orderId !== undefined) updatedFields.order_id = updatedStop.orderId || null;
      
      updatedFields.updated_at = new Date().toISOString();

      console.log(`Updating stop in database: ${stopId} with fields:`, updatedFields);
      const { error } = await supabase
        .from('delivery_stops')
        .update(updatedFields)
        .eq('id', stopId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log(`Stop ${stopId} updated successfully in database.`);
    } catch (error) {
      console.error('Error updating stop in database:', error);
      errorToast({
        title: "Error Updating Stop",
        description: "Failed to update stop in the database.",
      });
    }
  };

  const removeStop = async (stopId: string) => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to remove stops.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('delivery_stops')
        .delete()
        .eq('id', stopId)
        .eq('user_id', user.id);

      if (error) throw error;

      setScheduleDay(prev => ({
        ...prev,
        stops: prev.stops.filter(s => s.id !== stopId),
      }));

      console.log(`Stop ${stopId} removed successfully.`);
    } catch (error) {
      console.error('Error removing stop from database:', error);
      errorToast({
        title: "Error Removing Stop",
        description: "Failed to remove stop from the database.",
      });
    }
  };

  const assignStop = async (stopId: string, driverId: string) => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to assign stops to drivers.",
      });
      return;
    }

    // Get the stop to determine its date
    const stop = scheduleDay.stops.find(s => s.id === stopId);
    if (!stop) {
      console.error(`Stop ${stopId} not found in schedule.`);
      return;
    }

    // Check if the driver is available for the stop's date
    const driverAvailabilityRecord = scheduleDay.driverAvailability.find(
      a => a.driverId === driverId && a.date === stop.deliveryDate
    );
    
    if (driverAvailabilityRecord && !driverAvailabilityRecord.isAvailable) {
      errorToast({
        title: "Driver Unavailable",
        description: `This driver is marked as unavailable on ${stop.deliveryDate}.`,
      });
      return;
    }

    setScheduleDay(prev => ({
      ...prev,
      stops: prev.stops.map(s => 
        s.id === stopId ? { ...s, driverId, status: 'assigned' as const } : s
      ),
    }));

    try {
      const { error } = await supabase
        .from('delivery_stops')
        .update({
          driver_id: driverId,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', stopId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log(`Stop ${stopId} assigned to driver ${driverId}.`);
    } catch (error) {
      console.error('Error assigning stop in database:', error);
      errorToast({
        title: "Error Assigning Stop",
        description: "Failed to assign stop to driver in the database.",
      });
    }
  };

  const unassignStop = async (stopId: string) => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to unassign stops.",
      });
      return;
    }

    setScheduleDay(prev => ({
      ...prev,
      stops: prev.stops.map(s => 
        s.id === stopId ? { ...s, driverId: undefined, status: 'unassigned' as const } : s
      ),
    }));

    try {
      const { error } = await supabase
        .from('delivery_stops')
        .update({
          driver_id: null,
          status: 'unassigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', stopId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log(`Stop ${stopId} unassigned.`);
    } catch (error) {
      console.error('Error unassigning stop in database:', error);
      errorToast({
        title: "Error Unassigning Stop",
        description: "Failed to unassign stop in the database.",
      });
    }
  };

  const autoAssignStops = async () => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to auto-assign stops.",
      });
      return;
    }

    // Get only stops for current date
    const currentDateStops = scheduleDay.stops.filter(stop => 
      stop.status === 'unassigned' && stop.deliveryDate === currentDateString
    );
    
    if (currentDateStops.length === 0) {
      console.log("No unassigned stops found for the current date to auto-assign.");
      return;
    }

    // Get only available drivers for current date
    const availableDrivers = scheduleDay.drivers.filter(driver => {
      const availabilityRecord = scheduleDay.driverAvailability.find(
        a => a.driverId === driver.id && a.date === currentDateString
      );
      return availabilityRecord ? availabilityRecord.isAvailable : true;
    });

    if (availableDrivers.length === 0) {
      errorToast({
        title: "No Available Drivers",
        description: "There are no available drivers for the current date.",
      });
      return;
    }

    // Sort stops by delivery time
    const sortedStops = [...currentDateStops].sort((a, b) => {
      return a.deliveryTime.localeCompare(b.deliveryTime);
    });

    // Distribute stops among available drivers
    for (let i = 0; i < sortedStops.length; i++) {
      const driverIndex = i % availableDrivers.length;
      const stop = sortedStops[i];
      const driver = availableDrivers[driverIndex];
      
      await assignStop(stop.id, driver.id);
    }

    console.log(`Auto-assigned ${sortedStops.length} stops to ${availableDrivers.length} drivers.`);
  };

  const saveSchedule = () => {
    try {
      localStorage.setItem('schedule', JSON.stringify(scheduleDay));
      console.log("Schedule saved to local storage.");
    } catch (error) {
      console.error('Error saving schedule to local storage:', error);
      errorToast({
        title: "Error Saving Schedule",
        description: "Failed to save schedule to local storage.",
      });
    }
  };

  const loadSavedSchedule = () => {
    try {
      const savedSchedule = localStorage.getItem('schedule');
      if (savedSchedule) {
        const parsed = JSON.parse(savedSchedule) as ScheduleDay;
        setScheduleDay(parsed);
        console.log("Schedule loaded from local storage.");
      }
    } catch (error) {
      console.error('Error loading schedule from local storage:', error);
      errorToast({
        title: "Error Loading Schedule",
        description: "Failed to load schedule from local storage.",
      });
    }
  };

  const importCsvData = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      errorToast({
        title: "Import Failed",
        description: "No valid data found in the CSV file.",
      });
      return;
    }
    
    try {
      const newStops: Omit<DeliveryStop, 'id' | 'status'>[] = data.map(row => {
        return {
          businessName: row.businessName || row.business_name || "",
          clientName: row.clientName || row.client_name || "",
          address: row.address || "",
          deliveryTime: row.deliveryTime || row.delivery_time || "12:00",
          deliveryDate: row.deliveryDate || row.delivery_date || currentDateString,
          orderNumber: row.orderNumber || row.order_number || "",
          contactPhone: row.contactPhone || row.contact_phone || "",
          specialInstructions: row.specialInstructions || row.special_instructions || "",
          stopType: row.stopType || row.stop_type || "delivery",
        };
      });
      
      if (newStops.length > 0) {
        // Add stops one by one
        newStops.forEach(stop => {
          addStop(stop);
        });
        
        console.log(`Imported ${newStops.length} stops from CSV.`);
        
        if (newStops.some(s => s.deliveryDate !== currentDateString)) {
          errorToast({
            title: "Mixed Dates",
            description: "Some imported stops have different dates than your current view.",
          });
        }
      }
    } catch (error) {
      console.error('Error importing CSV data:', error);
      errorToast({
        title: "CSV Import Failed",
        description: "Failed to process the CSV data.",
      });
    }
  };

  const duplicateStop = (stopId: string) => {
    const stopToDuplicate = scheduleDay.stops.find(s => s.id === stopId);
    if (!stopToDuplicate) return;
    
    const duplicatedStop: Omit<DeliveryStop, 'id' | 'status'> = {
      businessName: stopToDuplicate.businessName,
      clientName: stopToDuplicate.clientName,
      address: stopToDuplicate.address,
      deliveryTime: stopToDuplicate.deliveryTime,
      deliveryDate: stopToDuplicate.deliveryDate,
      specialInstructions: stopToDuplicate.specialInstructions,
      orderNumber: `${stopToDuplicate.orderNumber || ''} (Copy)`,
      contactPhone: stopToDuplicate.contactPhone,
      stopType: stopToDuplicate.stopType,
      orderId: stopToDuplicate.orderId,
    };
    
    addStop(duplicatedStop);
    console.log(`Stop duplicated: ${stopToDuplicate.businessName}`);
  };

  const editStop = (stopId: string) => {
    const stop = scheduleDay.stops.find(s => s.id === stopId);
    if (stop) {
      editStopEventChannel.dispatchEvent(new CustomEvent('editStop', { detail: stop }));
    }
  };

  return (
    <ScheduleContext.Provider
      value={{
        scheduleDay,
        addDriver,
        removeDriver,
        updateDriver,
        addStop,
        updateStop,
        removeStop,
        assignStop,
        unassignStop,
        autoAssignStops,
        saveSchedule,
        loadSavedSchedule,
        importCsvData,
        isLoading,
        editStop,
        duplicateStop,
        getStopsForDate,
        syncDriversWithDatabase,
        syncStopsWithDatabase,
        updateDriverAvailability,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = (): ScheduleContextType => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};
