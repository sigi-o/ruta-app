import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Driver, DeliveryStop, TimeSlot, ScheduleDay } from '@/types';
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
};

export const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const editStopEventChannel = new EventTarget();

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentDateString } = useDateSystem();
  const { user } = useAuth();
  
  const [scheduleDay, setScheduleDay] = useState<ScheduleDay>(emptyScheduleDay);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
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

  const fetchStopsFromDatabase = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('delivery_stops')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
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
        }));
        
        setScheduleDay(prev => ({
          ...prev,
          stops: stops,
        }));
      }
    } catch (error) {
      console.error('Error fetching stops:', error);
      toast({
        title: "Error Loading Stops",
        description: "Failed to load stops from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDriversFromDatabase = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
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
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast({
        title: "Error Loading Drivers",
        description: "Failed to load drivers from the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncStopsWithDatabase = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to sync with the database.",
        variant: "destructive",
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
      
      toast({
        title: "Sync Complete",
        description: `Added: ${stopsToAdd.length}, Updated: ${stopsToUpdate.length}, Deleted: ${stopsToDelete.length}`,
      });
      
    } catch (error) {
      console.error('Error syncing stops with database:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize stops with the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncDriversWithDatabase = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to sync with the database.",
        variant: "destructive",
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
      
      toast({
        title: "Sync Complete",
        description: `Added: ${driversToAdd.length}, Updated: ${driversToUpdate.length}, Deleted: ${driversToDelete.length}`,
      });
      
    } catch (error) {
      console.error('Error syncing drivers with database:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize drivers with the database.",
        variant: "destructive",
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
      toast({
        title: "Authentication Required",
        description: "You must be logged in to add drivers.",
        variant: "destructive",
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

      toast({
        title: "Driver Added",
        description: `${driver.name} has been added to the schedule.`,
      });
    } catch (error) {
      console.error('Error adding driver to database:', error);
      toast({
        title: "Error Adding Driver",
        description: "Failed to add driver to the database.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeDriver = async (driverId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to remove drivers.",
        variant: "destructive",
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

      toast({
        title: "Driver Removed",
        description: "Driver has been removed and their stops unassigned.",
      });
    } catch (error) {
      console.error('Error removing driver from database:', error);
      toast({
        title: "Error Removing Driver",
        description: "Failed to remove driver from the database.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateDriver = async (driverId: string, updatedDriver: Partial<Driver>) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to update drivers.",
        variant: "destructive",
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
          updatedStops = prev.stops.map(stop => 
            stop.driverId === driverId ? { ...stop, driverId: undefined, status: 'unassigned' as const } : stop
          );
          
          toast({
            title: "Driver Marked Unavailable",
            description: "All stops assigned to this driver have been unassigned.",
          });
        }

        return {
          ...prev,
          drivers: prev.drivers.map(driver => 
            driver.id === driverId ? { ...driver, ...updatedDriver } : driver
          ),
          stops: updatedStops,
        };
      });

      toast({
        title: "Driver Updated",
        description: "Driver information has been updated.",
      });
    } catch (error) {
      console.error('Error updating driver in database:', error);
      toast({
        title: "Error Updating Driver",
        description: "Failed to update driver in the database.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const addStop = async (stop: Omit<DeliveryStop, 'id' | 'status'>) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to add stops.",
        variant: "destructive",
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
        });

      if (error) {
        throw error;
      }

      setScheduleDay(prev => ({
        ...prev,
        stops: [...prev.stops, newStop],
      }));

      if (newStop.deliveryDate !== currentDateString) {
        toast({
          title: "Different Delivery Date",
          description: `This stop is scheduled for ${newStop.deliveryDate}, not the currently selected date (${currentDateString}).`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Stop Added",
          description: `${stop.businessName} has been added to the schedule.`,
        });
      }
    } catch (error) {
      console.error('Error adding stop to database:', error);
      toast({
        title: "Error Adding Stop",
        description: "Failed to add stop to the database.",
        variant: "destructive",
      });
    }
  };

  const updateStop = async (stopId: string, updatedStop: Partial<DeliveryStop>) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to update stops.",
        variant: "destructive",
      });
      return;
    }

    setScheduleDay(prev => {
      const originalStop = prev.stops.find(s => s.id === stopId);
      const isDateChanging = updatedStop.deliveryDate && originalStop?.deliveryDate !== updatedStop.deliveryDate;
      
      const updatedStops = prev.stops.map(stop => 
        stop.id === stopId ? { ...stop, ...updatedStop } : stop
      );
      
      if (isDateChanging && updatedStop.deliveryDate !== currentDateString) {
        setTimeout(() => {
          toast({
            title: "Date Changed",
            description: `Stop date changed to ${updatedStop.deliveryDate}, which differs from current view (${currentDateString}).`,
            variant: "destructive",
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
      
      updatedFields.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('delivery_stops')
        .update(updatedFields)
        .eq('id', stopId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating stop in database:', error);
      toast({
        title: "Database Update Failed",
        description: "The stop was updated locally but failed to update in the database.",
        variant: "destructive",
      });
    }
  };

  const removeStop = async (stopId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to remove stops.",
        variant: "destructive",
      });
      return;
    }
    
    setScheduleDay(prev => ({
      ...prev,
      stops: prev.stops.filter(stop => stop.id !== stopId),
    }));
    
    try {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stopId);
      
      if (!isValidUUID) {
        console.error('Invalid UUID format for stopId:', stopId);
        toast({
          title: "Error Removing Stop",
          description: "The stop could not be removed from the database due to an invalid ID format.",
          variant: "destructive",
        });
        return;
      }
      
      const { error } = await supabase
        .from('delivery_stops')
        .delete()
        .eq('id', stopId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Database error when deleting stop:', error);
        throw error;
      }
      
      toast({
        title: "Stop Removed",
        description: "The stop has been removed from the schedule.",
      });
    } catch (error) {
      console.error('Error removing stop from database:', error);
      toast({
        title: "Database Removal Failed",
        description: "The stop was removed locally but failed to delete from the database.",
        variant: "destructive",
      });
    }
  };

  const assignStop = async (stopId: string, driverId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to assign stops.",
        variant: "destructive",
      });
      return;
    }

    setScheduleDay(prev => ({
      ...prev,
      stops: prev.stops.map(stop => 
        stop.id === stopId 
          ? { 
              ...stop, 
              driverId, 
              status: 'assigned' as const 
            } 
          : stop
      ),
    }));

    try {
      const { error } = await supabase
        .from('delivery_stops')
        .update({
          driver_id: driverId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', stopId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error assigning stop in database:', error);
      toast({
        title: "Database Update Failed",
        description: "The stop was assigned locally but failed to update in the database.",
        variant: "destructive",
      });
    }
  };

  const unassignStop = async (stopId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to unassign stops.",
        variant: "destructive",
      });
      return;
    }

    setScheduleDay(prev => ({
      ...prev,
      stops: prev.stops.map(stop => 
        stop.id === stopId 
          ? { 
              ...stop, 
              driverId: undefined, 
              status: 'unassigned' as const 
            } 
          : stop
      ),
    }));

    try {
      const { error } = await supabase
        .from('delivery_stops')
        .update({
          driver_id: null,
          status: 'unassigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', stopId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error unassigning stop in database:', error);
      toast({
        title: "Database Update Failed",
        description: "The stop was unassigned locally but failed to update in the database.",
        variant: "destructive",
      });
    }
  };

  const autoAssignStops = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to auto-assign stops.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setScheduleDay(prev => {
        const unassignedStops = [...prev.stops.filter(stop => stop.status === 'unassigned')];
        
        const stopsByTime: Record<string, DeliveryStop[]> = {};
        
        unassignedStops.forEach(stop => {
          if (!stopsByTime[stop.deliveryTime]) {
            stopsByTime[stop.deliveryTime] = [];
          }
          stopsByTime[stop.deliveryTime].push(stop);
        });
        
        const availableDriverIds = prev.drivers
          .filter(d => d.available !== false)
          .map(d => d.id);
        
        if (availableDriverIds.length === 0) {
          setTimeout(() => {
            toast({
              title: "No Available Drivers",
              description: "There are no available drivers to assign stops to.",
              variant: "destructive",
            });
          }, 0);
          
          return prev;
        }
        
        const updatedStops = [...prev.stops];
        
        const sortedTimeSlots = Object.keys(stopsByTime).sort();
        
        const driverLoads: Record<string, number> = {};
        availableDriverIds.forEach(id => {
          driverLoads[id] = 0;
        });
        
        sortedTimeSlots.forEach((time) => {
          const stopsForTime = stopsByTime[time];
          
          stopsForTime.forEach((stop) => {
            const driverId = Object.entries(driverLoads)
              .sort((a, b) => a[1] - b[1])[0][0];
            
            const foundIndex = updatedStops.findIndex(s => s.id === stop.id);
            if (foundIndex !== -1) {
              updatedStops[foundIndex] = {
                ...updatedStops[foundIndex],
                driverId,
                status: 'assigned' as const
              };
              
              driverLoads[driverId]++;
            }
          });
        });
        
        return {
          ...prev,
          stops: updatedStops
        };
      });
      
      setIsLoading(false);
      
      scheduleDay.stops.forEach(async (stop) => {
        if (stop.status === 'assigned' && stop.driverId) {
          try {
            await supabase
              .from('delivery_stops')
              .update({
                driver_id: stop.driverId,
                status: 'assigned',
                updated_at: new Date().toISOString()
              })
              .eq('id', stop.id)
              .eq('user_id', user.id);
          } catch (error) {
            console.error('Error updating stop assignment in database:', error);
          }
        }
      });
      
      setTimeout(() => {
        toast({
          title: "Auto-Assignment Complete",
          description: "Stops have been automatically assigned to available drivers based on delivery times.",
        });
      }, 0);
      
    }, 800);
  };

  const saveSchedule = () => {
    try {
      localStorage.setItem('catering-schedule', JSON.stringify(scheduleDay));
      
      setTimeout(() => {
        toast({
          title: "Schedule Saved",
          description: "Your schedule has been saved successfully to local storage.",
        });
      }, 0);
    } catch (error) {
      console.error('Error saving schedule:', error);
      
      setTimeout(() => {
        toast({
          title: "Error Saving Schedule",
          description: "There was an error saving your schedule. Please try again.",
          variant: "destructive",
        });
      }, 0);
    }
  };

  const loadSavedSchedule = () => {
    try {
      const savedSchedule = localStorage.getItem('catering-schedule');
      if (savedSchedule) {
        setScheduleDay(JSON.parse(savedSchedule));
      }
    } catch (error) {
      console.error('Error loading saved schedule:', error);
    }
  };

  const importCsvData = async (data: any[]) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to import data.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const newStops: DeliveryStop[] = data.map((row) => {
        const newStopId = uuidv4();
        
        const businessName = row.businessName || row.business_name || row.company || 'Unknown Business';
        const address = row.address || row.delivery_address || row.location || 'No Address Provided';
        let deliveryTime = row.deliveryTime || row.delivery_time || row.time || '12:00';
        if (!deliveryTime.match(/^\d{1,2}:\d{2}$/)) {
          try {
            const [hours, minutes] = deliveryTime.split(':').map(Number);
            deliveryTime = `${String(hours).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`;
          } catch (error) {
            console.warn(`Invalid time format: ${deliveryTime}, using default`);
            deliveryTime = '12:00';
          }
        }
        
        let deliveryDate = row.deliveryDate || row.delivery_date || row.date || currentDateString;
        if (!deliveryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          try {
            const date = new Date(deliveryDate);
            if (!isNaN(date.getTime())) {
              deliveryDate = format(date, 'yyyy-MM-dd');
            } else {
              deliveryDate = currentDateString;
            }
          } catch (error) {
            console.warn(`Invalid date format: ${deliveryDate}, using current date`);
            deliveryDate = currentDateString;
          }
        }
        
        return {
          id: newStopId,
          businessName,
          clientName: row.clientName || row.customer_name || row.client || '',
          address,
          deliveryTime,
          deliveryDate,
          status: 'unassigned' as const,
          orderNumber: row.orderNumber || row.order_number || row.order_id || '',
          contactPhone: row.contactPhone || row.phone || row.contact || '',
          specialInstructions: row.specialInstructions || row.instructions || row.notes || '',
          stopType: 'delivery' as const
        };
      });
      
      const dbStops = newStops.map(stop => ({
        id: stop.id,
        user_id: user.id,
        business_name: stop.businessName,
        client_name: stop.clientName || null,
        address: stop.address,
        delivery_time: stop.deliveryTime,
        delivery_date: stop.deliveryDate,
        special_instructions: stop.specialInstructions || null,
        status: 'unassigned',
        driver_id: null,
        order_number: stop.orderNumber || null,
        contact_phone: stop.contactPhone || null,
        stop_type: stop.stopType,
      }));
      
      const batchSize = 50;
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < dbStops.length; i += batchSize) {
        const batch = dbStops.slice(i, i + batchSize);
        
        const { error, data } = await supabase
          .from('delivery_stops')
          .insert(batch)
          .select();
        
        if (error) {
          console.error('Error batch inserting stops:', error);
          errorCount += batch.length;
        } else {
          successCount += data?.length || 0;
        }
      }
      
      setScheduleDay(prev => ({
        ...prev,
        stops: [...prev.stops, ...newStops],
      }));
      
      if (errorCount > 0) {
        toast({
          title: "Partial Import Completed",
          description: `${successCount} stops imported successfully. ${errorCount} stops failed to save to the database.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "CSV Import Complete",
          description: `${newStops.length} stops have been imported and saved to the database.`,
        });
      }
    } catch (error) {
      console.error('Error importing CSV data:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import CSV data. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const editStop = (stopId: string) => {
    const stop = scheduleDay.stops.find(s => s.id === stopId);
    if (stop) {
      editStopEventChannel.dispatchEvent(new CustomEvent('editStop', { detail: stop }));
    }
  };

  const duplicateStop = async (stopId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to duplicate stops.",
        variant: "destructive",
      });
      return;
    }
    
    const stopToDuplicate = scheduleDay.stops.find(stop => stop.id === stopId);
    
    if (!stopToDuplicate) {
      return;
    }
    
    const newStopId = uuidv4();
    
    const duplicatedStop: DeliveryStop = {
      ...stopToDuplicate,
      id: newStopId,
      status: 'unassigned',
      driverId: undefined,
      orderNumber: stopToDuplicate.orderNumber ? `${stopToDuplicate.orderNumber}-copy` : undefined,
    };
    
    try {
      const { error } = await supabase
        .from('delivery_stops')
        .insert({
          id: newStopId,
          user_id: user.id,
          business_name: stopToDuplicate.businessName,
          client_name: stopToDuplicate.clientName || null,
          address: stopToDuplicate.address,
          delivery_time: stopToDuplicate.deliveryTime,
          delivery_date: stopToDuplicate.deliveryDate,
          special_instructions: stopToDuplicate.specialInstructions || null,
          status: 'unassigned',
          driver_id: null,
          order_number: duplicatedStop.orderNumber || null,
          contact_phone: stopToDuplicate.contactPhone || null,
          stop_type: stopToDuplicate.stopType,
        });

      if (error) throw error;
      
      setScheduleDay(prev => ({
        ...prev,
        stops: [...prev.stops, duplicatedStop],
      }));
      
      toast({
        title: "Stop Duplicated",
        description: "A copy of the stop has been created and added to unassigned stops.",
      });
    } catch (error) {
      console.error('Error duplicating stop in database:', error);
      toast({
        title: "Database Duplication Failed",
        description: "Failed to duplicate the stop in the database.",
        variant: "destructive",
      });
    }
  };

  return (
    <ScheduleContext.Provider value={{
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
      syncStopsWithDatabase
    }}>
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};

export { editStopEventChannel };
