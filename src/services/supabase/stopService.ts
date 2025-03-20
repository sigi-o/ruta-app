import { supabase } from '@/integrations/supabase/client';
import { DeliveryStop } from '@/types';
import { toast } from '@/components/ui/use-toast';

export const fetchStopsFromDatabase = async (userId: string): Promise<DeliveryStop[]> => {
  try {
    const { data, error } = await supabase
      .from('stops')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching stops:', error);
      toast({
        title: "Failed to load stops",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Exception fetching stops:', err);
    toast({
      title: "Error loading stops",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    return [];
  }
};

export const addStopToDatabase = async (userId: string, stop: Omit<DeliveryStop, 'id' | 'status'>, stopId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('stops')
      .insert([{ 
        id: stopId, 
        user_id: userId, 
        ...stop 
      }]);

    if (error) {
      console.error('Error adding stop:', error);
      toast({
        title: "Failed to add stop",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  } catch (err) {
    console.error('Exception adding stop:', err);
    toast({
      title: "Error adding stop",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    throw err;
  }
};

export const updateStopInDatabase = async (userId: string, stopId: string, updatedStop: Partial<DeliveryStop>): Promise<void> => {
  try {
    const { error } = await supabase
      .from('stops')
      .update(updatedStop)
      .eq('id', stopId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating stop:', error);
      toast({
        title: "Failed to update stop",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  } catch (err) {
    console.error('Exception updating stop:', err);
    toast({
      title: "Error updating stop",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    throw err;
  }
};

export const removeStopFromDatabase = async (userId: string, stopId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('stops')
      .delete()
      .eq('id', stopId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing stop:', error);
      toast({
        title: "Failed to remove stop",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  } catch (err) {
    console.error('Exception removing stop:', err);
    toast({
      title: "Error removing stop",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    throw err;
  }
};

export const assignStopInDatabase = async (userId: string, stopId: string, driverId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('stops')
      .update({ driverId: driverId, status: 'assigned' })
      .eq('id', stopId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error assigning stop:', error);
      toast({
        title: "Failed to assign stop",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  } catch (err) {
    console.error('Exception assigning stop:', err);
    toast({
      title: "Error assigning stop",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    throw err;
  }
};

export const unassignStopInDatabase = async (userId: string, stopId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('stops')
      .update({ driverId: null, status: 'unassigned' })
      .eq('id', stopId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error unassigning stop:', error);
      toast({
        title: "Failed to unassign stop",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  } catch (err) {
    console.error('Exception unassigning stop:', err);
    toast({
      title: "Error unassigning stop",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    throw err;
  }
};

export const syncStopsWithDatabase = async (userId: string, stops: DeliveryStop[]): Promise<void> => {
  try {
    // Fetch existing stops from the database
    const { data: existingStops, error: fetchError } = await supabase
      .from('stops')
      .select('id')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching existing stops:', fetchError);
      toast({
        title: "Failed to sync stops",
        description: fetchError.message,
        variant: "destructive",
      });
      return;
    }

    const existingStopIds = existingStops ? existingStops.map(stop => stop.id) : [];

    // Identify stops to update and stops to insert
    const stopsToUpdate = stops.filter(stop => existingStopIds.includes(stop.id));
    const stopsToInsert = stops.filter(stop => !existingStopIds.includes(stop.id));

    // Perform updates
    for (const stop of stopsToUpdate) {
      const { error: updateError } = await supabase
        .from('stops')
        .update({ ...stop, user_id: userId })
        .eq('id', stop.id);

      if (updateError) {
        console.error(`Error updating stop ${stop.id}:`, updateError);
        toast({
          title: `Failed to update stop ${stop.businessName}`,
          description: updateError.message,
          variant: "destructive",
        });
      }
    }

    // Perform inserts
    for (const stop of stopsToInsert) {
      const { error: insertError } = await supabase
        .from('stops')
        .insert([{ ...stop, user_id: userId }]);

      if (insertError) {
        console.error(`Error inserting stop ${stop.id}:`, insertError);
        toast({
          title: `Failed to insert stop ${stop.businessName}`,
          description: insertError.message,
          variant: "destructive",
        });
      }
    }

    // Identify stops to delete (stops that exist in the database but not in the provided stops array)
    const stopsToDelete = existingStopIds.filter(stopId => !stops.find(stop => stop.id === stopId));

    // Perform deletes
    for (const stopId of stopsToDelete) {
      const { error: deleteError } = await supabase
        .from('stops')
        .delete()
        .eq('id', stopId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error(`Error deleting stop ${stopId}:`, deleteError);
        toast({
          title: `Failed to delete stop ${stopId}`,
          description: deleteError.message,
          variant: "destructive",
        });
      }
    }

    console.log('Stops synced with database successfully.');

  } catch (error) {
    console.error('Error syncing stops with database:', error);
    toast({
      title: "Error syncing stops",
      description: "An unexpected error occurred during sync",
      variant: "destructive",
    });
  }
};
