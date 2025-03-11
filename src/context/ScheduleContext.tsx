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
}

const defaultTimeSlots = generateTimeSlots('02:00', '23:30', 30);
const today = format(new Date(), 'yyyy-MM-dd');

const defaultDrivers: Driver[] = [
  { id: '1', name: 'John Smith', color: '#3B82F6', available: true },
  { id: '2', name: 'Sarah Johnson', color: '#10B981', available: true },
  { id: '3', name: 'Michael Chen', color: '#6366F1', available: true },
  { id: '4', name: 'Jessica Lee', color: '#F59E0B', available: true },
  { id: '5', name: 'David Kim', color: '#EC4899', available: true },
];

const defaultStops: DeliveryStop[] = [
  {
    id: '1',
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
    id: '2',
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
    id: '3',
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
    id: '4',
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
    id: '5',
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

const defaultScheduleDay: ScheduleDay = {
  date: today,
  drivers: defaultDrivers,
  stops: defaultStops,
  timeSlots: defaultTimeSlots,
};

export const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const editStopEventChannel = new EventTarget();

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentDateString } = useDateSystem();
  const { user } = useAuth();
  
  const [scheduleDay, setScheduleDay] = useState<ScheduleDay>(defaultScheduleDay);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const initialLoadComplete = useRef(false);

  useEffect(() => {
    if (!initialLoadComplete.current) {
      loadSavedSchedule();
      initialLoadComplete.current = true;
      
      if (user) {
        fetchDriversFromDatabase();
      }
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
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDriversFromDatabase();
    }
  }, [user]);

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
        
        toast({
          title: "Drivers Loaded",
          description: `${drivers.length} drivers loaded from database.`,
        });
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

  const addStop = (stop: Omit<DeliveryStop, 'id' | 'status'>) => {
    const newStop: DeliveryStop = {
      ...stop,
      id: `stop-${Date.now()}`,
      status: 'unassigned',
      deliveryDate: stop.deliveryDate || currentDateString,
    };

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
    }
  };

  const updateStop = (stopId: string, updatedStop: Partial<DeliveryStop>) => {
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
  };

  const removeStop = (stopId: string) => {
    setScheduleDay(prev => ({
      ...prev,
      stops: prev.stops.filter(stop => stop.id !== stopId),
    }));
    
    toast({
      title: "Stop Removed",
      description: "The stop has been removed from the schedule.",
    });
  };

  const assignStop = (stopId: string, driverId: string) => {
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
  };

  const unassignStop = (stopId: string) => {
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
  };

  const autoAssignStops = () => {
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
        
        Object.keys(stopsByTime).sort().forEach((time, timeIndex) => {
          const stopsForTime = stopsByTime[time];
          
          stopsForTime.forEach((stop, index) => {
            const driverIndex = (timeIndex + index) % availableDriverIds.length;
            const driverId = availableDriverIds[driverIndex];
            
            const foundIndex = updatedStops.findIndex(s => s.id === stop.id);
            if (foundIndex !== -1) {
              updatedStops[foundIndex] = {
                ...updatedStops[foundIndex],
                driverId,
                status: 'assigned' as const
              };
            }
          });
        });
        
        return {
          ...prev,
          stops: updatedStops
        };
      });
      
      setIsLoading(false);
      
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
          description: "Your schedule has been saved successfully.",
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

  const importCsvData = (data: any[]) => {
    setIsLoading(true);
    
    setTimeout(() => {
      const newStops: DeliveryStop[] = data.map((row, index) => ({
        id: `import-${Date.now()}-${index}`,
        businessName: row.businessName || row.business_name || row.company || '',
        clientName: row.clientName || row.customer_name || row.client || '',
        address: row.address || row.delivery_address || row.location || '',
        deliveryTime: row.deliveryTime || row.delivery_time || row.time || '12:00',
        deliveryDate: row.deliveryDate || row.delivery_date || row.date || currentDateString,
        status: 'unassigned' as const,
        orderNumber: row.orderNumber || row.order_number || row.order_id || `ORD-${index + 100}`,
        contactPhone: row.contactPhone || row.phone || row.contact || '',
        specialInstructions: row.specialInstructions || row.instructions || row.notes || '',
        items: row.items ? (typeof row.items === 'string' ? [row.items] : row.items) : [],
        stopType: 'delivery' as const
      }));
      
      setScheduleDay(prev => ({
        ...prev,
        stops: [...prev.stops, ...newStops],
      }));
      
      setIsLoading(false);
      toast({
        title: "CSV Import Complete",
        description: `${newStops.length} stops have been imported.`,
      });
    }, 1000);
  };

  const editStop = (stopId: string) => {
    const stop = scheduleDay.stops.find(s => s.id === stopId);
    if (stop) {
      editStopEventChannel.dispatchEvent(new CustomEvent('editStop', { detail: stop }));
    }
  };

  const duplicateStop = (stopId: string) => {
    setScheduleDay(prev => {
      const stopToDuplicate = prev.stops.find(stop => stop.id === stopId);
      
      if (!stopToDuplicate) {
        return prev;
      }
      
      const duplicatedStop: DeliveryStop = {
        ...stopToDuplicate,
        id: `stop-${Date.now()}`,
        status: 'unassigned',
        driverId: undefined,
        orderNumber: stopToDuplicate.orderNumber ? `${stopToDuplicate.orderNumber}-copy` : undefined,
      };
      
      return {
        ...prev,
        stops: [...prev.stops, duplicatedStop],
      };
    });
    
    toast({
      title: "Stop Duplicated",
      description: "A copy of the stop has been created and added to unassigned stops.",
    });
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
      syncDriversWithDatabase
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
