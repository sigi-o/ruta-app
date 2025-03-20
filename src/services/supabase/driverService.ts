
import { supabase } from '@/integrations/supabase/client';
import { Driver, DriverAvailability } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const { errorToast } = useToast();

export const fetchDriversFromDatabase = async (userId: string) => {
  try {
    console.log('Fetching drivers from database for user:', userId);
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      throw error;
    }
    
    if (data && data.length > 0) {
      console.log(`Found ${data.length} drivers in database`);
      return data.map(dbDriver => ({
        id: dbDriver.id,
        name: dbDriver.name,
        color: dbDriver.color,
        vehicleType: dbDriver.vehicle_type || undefined,
        phoneNumber: dbDriver.phone_number || undefined,
        notes: dbDriver.notes || undefined,
        available: dbDriver.available === null ? true : dbDriver.available,
      }));
    }
    
    console.log('No drivers found in database, using default empty array');
    return [];
  } catch (error) {
    console.error('Error fetching drivers:', error);
    errorToast({
      title: "Error Loading Drivers",
      description: "Failed to load drivers from the database.",
    });
    throw error;
  }
};

export const addDriverToDatabase = async (userId: string, driver: Omit<Driver, 'id'>, driverId: string) => {
  try {
    const { error } = await supabase
      .from('drivers')
      .insert({
        id: driverId,
        user_id: userId,
        name: driver.name,
        color: driver.color,
        vehicle_type: driver.vehicleType || null,
        phone_number: driver.phoneNumber || null,
        notes: driver.notes || null,
        available: driver.available === undefined ? true : driver.available,
      });

    if (error) throw error;
    
    return driverId;
  } catch (error) {
    console.error('Error adding driver to database:', error);
    errorToast({
      title: "Error Adding Driver",
      description: "Failed to add driver to the database.",
    });
    throw error;
  }
};

export const removeDriverFromDatabase = async (userId: string, driverId: string) => {
  try {
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', driverId)
      .eq('user_id', userId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error removing driver from database:', error);
    errorToast({
      title: "Error Removing Driver",
      description: "Failed to remove driver from the database.",
    });
    throw error;
  }
};

export const updateDriverInDatabase = async (userId: string, driverId: string, updatedDriver: Partial<Driver>) => {
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
      .eq('user_id', userId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating driver in database:', error);
    errorToast({
      title: "Error Updating Driver",
      description: "Failed to update driver in the database.",
    });
    throw error;
  }
};

export const syncDriversWithDatabase = async (userId: string, drivers: Driver[]) => {
  try {
    const { data: dbDrivers, error: fetchError } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', userId);
    
    if (fetchError) throw fetchError;
    
    const dbDriverIds = new Set((dbDrivers || []).map(d => d.id));
    
    const driversToAdd = drivers.filter(d => !dbDriverIds.has(d.id));
    const driversToUpdate = drivers.filter(d => dbDriverIds.has(d.id));
    const driversToDelete = Array.from(dbDriverIds).filter(
      id => !drivers.some(d => d.id === id)
    );
    
    if (driversToAdd.length > 0) {
      const { error: insertError } = await supabase
        .from('drivers')
        .insert(driversToAdd.map(driver => ({
          id: driver.id,
          user_id: userId,
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
        .eq('user_id', userId);
      
      if (updateError) throw updateError;
    }
    
    if (driversToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('drivers')
        .delete()
        .in('id', driversToDelete)
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;
    }
    
    console.log(`Sync Complete - Added: ${driversToAdd.length}, Updated: ${driversToUpdate.length}, Deleted: ${driversToDelete.length}`);
    return true;
  } catch (error) {
    console.error('Error syncing drivers with database:', error);
    errorToast({
      title: "Sync Failed",
      description: "Failed to synchronize drivers with the database.",
    });
    throw error;
  }
};

export const fetchDriverAvailabilityForDate = async (userId: string, date: string) => {
  try {
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
      
      return data.map(item => ({
        id: item.id,
        driverId: item.driver_id,
        date: item.date,
        isAvailable: item.is_available
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching driver availability:', error);
    errorToast({
      title: "Error Loading Driver Availability",
      description: "Failed to load driver availability from the database.",
    });
    throw error;
  }
};

export const updateDriverAvailabilityInDb = async (userId: string, driverId: string, date: string, isAvailable: boolean) => {
  try {
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
    
    return true;
  } catch (error) {
    console.error('Error updating driver availability:', error);
    errorToast({
      title: "Error Updating Availability",
      description: "Failed to update driver availability in the database.",
    });
    throw error;
  }
};
