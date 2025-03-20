import { supabase } from '@/integrations/supabase/client';
import { Driver, DriverAvailability } from '@/types';
import { toast } from '@/components/ui/use-toast';

// Export a function to fetch drivers from the database
export const fetchDriversFromDatabase = async (userId: string): Promise<Driver[]> => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching drivers:', error);
      toast({
        title: "Failed to load drivers",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception fetching drivers:', err);
    toast({
      title: "Error loading drivers",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    return [];
  }
};

// Export a function to add a new driver to the database
export const addDriverToDatabase = async (userId: string, driver: Omit<Driver, 'id'>, newDriverId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('drivers')
      .insert([{ id: newDriverId, user_id: userId, ...driver }]);

    if (error) {
      console.error('Error adding driver:', error);
      toast({
        title: "Failed to add driver",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  } catch (err) {
    console.error('Exception adding driver:', err);
    toast({
      title: "Error adding driver",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    throw err;
  }
};

// Export a function to remove a driver from the database
export const removeDriverFromDatabase = async (userId: string, driverId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('drivers')
      .delete()
      .eq('id', driverId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing driver:', error);
      toast({
        title: "Failed to remove driver",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  } catch (err) {
    console.error('Exception removing driver:', err);
    toast({
      title: "Error removing driver",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    throw err;
  }
};

// Export a function to update a driver in the database
export const updateDriverInDatabase = async (userId: string, driverId: string, updatedDriver: Partial<Driver>): Promise<void> => {
  try {
    const { error } = await supabase
      .from('drivers')
      .update(updatedDriver)
      .eq('id', driverId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating driver:', error);
      toast({
        title: "Failed to update driver",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  } catch (err) {
    console.error('Exception updating driver:', err);
    toast({
      title: "Error updating driver",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    throw err;
  }
};

export const syncDriversWithDatabase = async (userId: string, drivers: Driver[]): Promise<void> => {
  try {
    // Fetch existing drivers from the database
    const { data: existingDrivers, error: fetchError } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching existing drivers:', fetchError);
      toast({
        title: "Failed to sync drivers",
        description: fetchError.message,
        variant: "destructive",
      });
      return;
    }

    const existingDriverIds = existingDrivers ? existingDrivers.map(driver => driver.id) : [];

    // Identify drivers to insert and drivers to update
    const driversToInsert = drivers.filter(driver => !existingDriverIds.includes(driver.id));
    const driversToUpdate = drivers.filter(driver => existingDriverIds.includes(driver.id));

    // Insert new drivers
    if (driversToInsert.length > 0) {
      const insertData = driversToInsert.map(driver => ({
        id: driver.id,
        user_id: userId,
        ...driver,
      }));

      const { error: insertError } = await supabase
        .from('drivers')
        .insert(insertData);

      if (insertError) {
        console.error('Error inserting drivers:', insertError);
        toast({
          title: "Failed to insert drivers",
          description: insertError.message,
          variant: "destructive",
        });
      }
    }

    // Update existing drivers
    if (driversToUpdate.length > 0) {
      for (const driver of driversToUpdate) {
        const { error: updateError } = await supabase
          .from('drivers')
          .update({ ...driver })
          .eq('id', driver.id)
          .eq('user_id', userId);

        if (updateError) {
          console.error(`Error updating driver ${driver.id}:`, updateError);
          toast({
            title: "Failed to update driver",
            description: updateError.message,
            variant: "destructive",
          });
        }
      }
    }

    console.log('Drivers synced with database successfully.');
  } catch (error) {
    console.error('Error syncing drivers with database:', error);
    toast({
      title: "Error syncing drivers",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
  }
};

export const fetchDriverAvailabilityForDate = async (
  userId: string,
  date: string
): Promise<DriverAvailability[]> => {
  try {
    const { data, error } = await supabase
      .from('driver_availability')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);

    if (error) {
      console.error('Error fetching driver availability:', error);
      toast({
        title: "Failed to load driver availability",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception fetching driver availability:', err);
    toast({
      title: "Error loading driver availability",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    return [];
  }
};

export const updateDriverAvailabilityInDb = async (
  userId: string,
  driverId: string,
  date: string,
  isAvailable: boolean
): Promise<void> => {
  try {
    // Check if the record already exists
    const { data: existingData, error: selectError } = await supabase
      .from('driver_availability')
      .select('id')
      .eq('user_id', userId)
      .eq('driverId', driverId)
      .eq('date', date);

    if (selectError) {
      console.error('Error checking existing driver availability:', selectError);
      toast({
        title: "Failed to update driver availability",
        description: selectError.message,
        variant: "destructive",
      });
      return;
    }

    if (existingData && existingData.length > 0) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('driver_availability')
        .update({ isAvailable })
        .eq('user_id', userId)
        .eq('driverId', driverId)
        .eq('date', date);

      if (updateError) {
        console.error('Error updating driver availability:', updateError);
        toast({
          title: "Failed to update driver availability",
          description: updateError.message,
          variant: "destructive",
        });
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('driver_availability')
        .insert([{ user_id: userId, driverId, date, isAvailable }]);

      if (insertError) {
        console.error('Error inserting driver availability:', insertError);
        toast({
          title: "Failed to set driver availability",
          description: insertError.message,
          variant: "destructive",
        });
      }
    }
  } catch (err) {
    console.error('Exception updating driver availability:', err);
    toast({
      title: "Error updating driver availability",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
  }
};
