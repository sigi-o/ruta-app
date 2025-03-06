
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Driver, DeliveryStop, TimeSlot, ScheduleDay } from '@/types';
import { generateTimeSlots } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useDateSystem } from './DateContext';

interface ScheduleContextType {
  scheduleDay: ScheduleDay;
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  removeDriver: (driverId: string) => void;
  updateDriver: (driverId: string, updatedDriver: Partial<Driver>) => void;
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
}

const defaultTimeSlots = generateTimeSlots('00:00', '23:30', 30);
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
  
  const [scheduleDay, setScheduleDay] = useState<ScheduleDay>(defaultScheduleDay);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const initialLoadComplete = useRef(false);

  useEffect(() => {
    if (!initialLoadComplete.current) {
      loadSavedSchedule();
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
  }, [scheduleDay.stops]);

  const getStopsForDate = (date: string) => {
    return scheduleDay.stops.filter(stop => stop.deliveryDate === date);
  };

  const addDriver = (driver: Omit<Driver, 'id'>) => {
    const newDriver: Driver = {
      ...driver,
      id: `driver-${Date.now()}`,
      available: driver.available !== undefined ? driver.available : true,
    };

    setScheduleDay(prev => ({
      ...prev,
      drivers: [...prev.drivers, newDriver],
    }));

    toast({
      title: "Driver Added",
      description: `${driver.name} has been added to the schedule.`,
    });
  };

  const removeDriver = (driverId: string) => {
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
  };

  const updateDriver = (driverId: string, updatedDriver: Partial<Driver>) => {
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
      getStopsForDate
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
