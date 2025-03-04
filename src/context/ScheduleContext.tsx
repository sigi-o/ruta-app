import React, { createContext, useState, useContext, useEffect } from 'react';
import { Driver, DeliveryStop, TimeSlot, ScheduleDay } from '@/types';
import { generateTimeSlots } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
}

const defaultTimeSlots = generateTimeSlots('07:00', '19:00', 30);

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
    clientName: 'Acme Corporation',
    address: '123 Business Ave',
    deliveryTime: '10:00',
    status: 'unassigned',
    orderNumber: 'ORD-001',
    stopType: 'delivery',
  },
  {
    id: '2',
    clientName: 'TechStart Inc',
    address: '456 Innovation Blvd',
    deliveryTime: '11:30',
    status: 'unassigned',
    orderNumber: 'ORD-002',
    stopType: 'delivery',
  },
  {
    id: '3',
    clientName: 'Downtown Deli',
    address: '789 Main St',
    deliveryTime: '12:00',
    status: 'unassigned',
    orderNumber: 'ORD-003',
    stopType: 'delivery',
  },
  {
    id: '4',
    clientName: 'City Butcher',
    address: '321 Meat Lane',
    deliveryTime: '08:30',
    status: 'unassigned',
    orderNumber: 'ORD-004',
    stopType: 'butcher',
    specialInstructions: 'Pick up catering meat order'
  },
  {
    id: '5',
    clientName: 'Party Supply Co',
    address: '555 Event Road',
    deliveryTime: '09:00',
    status: 'unassigned',
    orderNumber: 'ORD-005',
    stopType: 'equipment',
    specialInstructions: 'Pick up 10 chafing dishes and 5 coffee urns'
  }
];

const defaultScheduleDay: ScheduleDay = {
  date: new Date().toISOString().split('T')[0],
  drivers: defaultDrivers,
  stops: defaultStops,
  timeSlots: defaultTimeSlots,
};

export const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scheduleDay, setScheduleDay] = useState<ScheduleDay>(defaultScheduleDay);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSavedSchedule();
  }, []);

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
    // Unassign all stops assigned to this driver
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
    // If driver is marked as unavailable, unassign their stops
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
    };

    setScheduleDay(prev => ({
      ...prev,
      stops: [...prev.stops, newStop],
    }));
  };

  const updateStop = (stopId: string, updatedStop: Partial<DeliveryStop>) => {
    setScheduleDay(prev => ({
      ...prev,
      stops: prev.stops.map(stop => 
        stop.id === stopId ? { ...stop, ...updatedStop } : stop
      ),
    }));
  };

  const removeStop = (stopId: string) => {
    setScheduleDay(prev => ({
      ...prev,
      stops: prev.stops.filter(stop => stop.id !== stopId),
    }));
  };

  const assignStop = (stopId: string, driverId: string) => {
    setScheduleDay(prev => ({
      ...prev,
      stops: prev.stops.map(stop => 
        stop.id === stopId ? { ...stop, driverId, status: 'assigned' as const } : stop
      ),
    }));
  };

  const unassignStop = (stopId: string) => {
    setScheduleDay(prev => ({
      ...prev,
      stops: prev.stops.map(stop => 
        stop.id === stopId ? { ...stop, driverId: undefined, status: 'unassigned' as const } : stop
      ),
    }));
  };

  const autoAssignStops = () => {
    setIsLoading(true);

    // Simple auto-assignment algorithm based on time slots, but filter out unavailable drivers
    setTimeout(() => {
      setScheduleDay(prev => {
        const unassignedStops = [...prev.stops.filter(stop => stop.status === 'unassigned')];
        
        // Group stops by delivery time
        const stopsByTime: Record<string, DeliveryStop[]> = {};
        
        unassignedStops.forEach(stop => {
          if (!stopsByTime[stop.deliveryTime]) {
            stopsByTime[stop.deliveryTime] = [];
          }
          stopsByTime[stop.deliveryTime].push(stop);
        });
        
        // Get only available drivers
        const availableDriverIds = prev.drivers
          .filter(d => d.available !== false)
          .map(d => d.id);
        
        if (availableDriverIds.length === 0) {
          toast({
            title: "No Available Drivers",
            description: "There are no available drivers to assign stops to.",
            variant: "destructive",
          });
          setIsLoading(false);
          return prev;
        }
        
        // Distribute stops to drivers based on delivery times
        const updatedStops = [...prev.stops];
        
        Object.keys(stopsByTime).sort().forEach((time, timeIndex) => {
          const stopsForTime = stopsByTime[time];
          
          stopsForTime.forEach((stop, index) => {
            // Assign driver in round-robin fashion
            const driverIndex = (timeIndex + index) % availableDriverIds.length;
            const driverId = availableDriverIds[driverIndex];
            
            // Update the stop in the updatedStops array
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
      toast({
        title: "Auto-Assignment Complete",
        description: "Stops have been automatically assigned to available drivers based on delivery times.",
      });
    }, 800); // Simulate processing time
  };

  const saveSchedule = () => {
    try {
      localStorage.setItem('catering-schedule', JSON.stringify(scheduleDay));
      toast({
        title: "Schedule Saved",
        description: "Your schedule has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Error Saving Schedule",
        description: "There was an error saving your schedule. Please try again.",
        variant: "destructive",
      });
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
    
    // Process the CSV data
    setTimeout(() => {
      const newStops: DeliveryStop[] = data.map((row, index) => ({
        id: `import-${Date.now()}-${index}`,
        clientName: row.clientName || row.customer_name || row.client || '',
        address: row.address || row.delivery_address || row.location || '',
        deliveryTime: row.deliveryTime || row.delivery_time || row.time || '12:00',
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
      isLoading
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
