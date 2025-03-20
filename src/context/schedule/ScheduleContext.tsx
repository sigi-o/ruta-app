
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Driver, DeliveryStop, ScheduleDay } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useDateSystem } from '../DateContext';
import { useAuth } from '../AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { ScheduleContextType } from './types';
import { defaultDrivers, defaultStops, emptyScheduleDay } from './constants';
import { editStopEventChannel } from './eventChannel';
import { 
  fetchDriversFromDatabase, 
  addDriverToDatabase, 
  removeDriverFromDatabase, 
  updateDriverInDatabase, 
  syncDriversWithDatabase,
  fetchDriverAvailabilityForDate,
  updateDriverAvailabilityInDb
} from '@/services/supabase/driverService';
import {
  fetchStopsFromDatabase,
  addStopToDatabase,
  updateStopInDatabase,
  removeStopFromDatabase,
  assignStopInDatabase,
  unassignStopInDatabase,
  syncStopsWithDatabase
} from '@/services/supabase/stopService';

export const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

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
            date: format(new Date(), 'yyyy-MM-dd'),
            drivers: defaultDrivers,
            stops: defaultStops,
            timeSlots: emptyScheduleDay.timeSlots,
            driverAvailability: [],
          });
        }
      }
      
      initialLoadComplete.current = true;
    }
  }, [user, scheduleDay]);

  useEffect(() => {
    if (user !== null && !dataFetchedFromDb.current) {
      setScheduleDay({
        ...emptyScheduleDay,
        date: currentDateString,
      });
      
      fetchData();
      dataFetchedFromDb.current = true;
    } else if (user === null) {
      dataFetchedFromDb.current = false;
    }
  }, [user, currentDateString]);

  useEffect(() => {
    if (user && currentDateString) {
      fetchAvailabilityData();
    }
  }, [user, currentDateString]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [drivers, stops] = await Promise.all([
        fetchDriversFromDatabase(user.id),
        fetchStopsFromDatabase(user.id)
      ]);
      
      setScheduleDay(prev => ({
        ...prev,
        drivers,
        stops
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailabilityData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const driverAvailability = await fetchDriverAvailabilityForDate(user.id, currentDateString);
      
      setScheduleDay(prev => ({
        ...prev,
        driverAvailability
      }));
    } catch (error) {
      console.error('Error fetching availability data:', error);
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
      
      await updateDriverAvailabilityInDb(user.id, driverId, date, isAvailable);
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const syncDriversWithDb = async () => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to sync with the database.",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      await syncDriversWithDatabase(user.id, scheduleDay.drivers);
    } catch (error) {
      console.error('Error syncing drivers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncStopsWithDb = async () => {
    if (!user) {
      errorToast({
        title: "Authentication Required",
        description: "You must be logged in to sync with the database.",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      await syncStopsWithDatabase(user.id, scheduleDay.stops);
    } catch (error) {
      console.error('Error syncing stops:', error);
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
      await addDriverToDatabase(user.id, driver, newDriverId);

      setScheduleDay(prev => ({
        ...prev,
        drivers: [...prev.drivers, newDriver],
      }));

      console.log(`Driver ${driver.name} has been added to the schedule.`);
    } catch (error) {
      console.error('Error adding driver:', error);
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
      await removeDriverFromDatabase(user.id, driverId);

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
      console.error('Error removing driver:', error);
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
      await updateDriverInDatabase(user.id, driverId, updatedDriver);

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
      console.error('Error updating driver:', error);
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
      await addStopToDatabase(user.id, stop, newStopId);

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
      console.error('Error adding stop:', error);
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
      await updateStopInDatabase(user.id, stopId, updatedStop);
      console.log(`Stop ${stopId} updated successfully.`);
    } catch (error) {
      console.error('Error updating stop:', error);
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
      await removeStopFromDatabase(user.id, stopId);

      setScheduleDay(prev => ({
        ...prev,
        stops: prev.stops.filter(s => s.id !== stopId),
      }));

      console.log(`Stop ${stopId} removed successfully.`);
    } catch (error) {
      console.error('Error removing stop:', error);
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
      await assignStopInDatabase(user.id, stopId, driverId);
      console.log(`Stop ${stopId} assigned to driver ${driverId}.`);
    } catch (error) {
      console.error('Error assigning stop:', error);
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
      await unassignStopInDatabase(user.id, stopId);
      console.log(`Stop ${stopId} unassigned.`);
    } catch (error) {
      console.error('Error unassigning stop:', error);
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
        syncDriversWithDatabase: syncDriversWithDb,
        syncStopsWithDatabase: syncStopsWithDb,
        updateDriverAvailability,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};
