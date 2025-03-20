
import { supabase } from '@/integrations/supabase/client';
import { DeliveryStop } from '@/types';
import { useToast } from '@/hooks/use-toast';

const { errorToast } = useToast();

export const fetchStopsFromDatabase = async (userId: string) => {
  try {
    console.log('Fetching stops from database for user:', userId);
    const { data, error } = await supabase
      .from('delivery_stops')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      throw error;
    }
    
    if (data && data.length > 0) {
      console.log(`Found ${data.length} stops in database`);
      return data.map(dbStop => ({
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
    }
    
    console.log('No stops found in database, using default empty array');
    return [];
  } catch (error) {
    console.error('Error fetching stops:', error);
    errorToast({
      title: "Error Loading Stops",
      description: "Failed to load stops from the database.",
    });
    throw error;
  }
};

export const addStopToDatabase = async (userId: string, stop: Omit<DeliveryStop, 'id' | 'status'>, stopId: string) => {
  try {
    const { error } = await supabase
      .from('delivery_stops')
      .insert({
        id: stopId,
        user_id: userId,
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
        order_id: stop.orderId || null,
      });

    if (error) {
      throw error;
    }

    return stopId;
  } catch (error) {
    console.error('Error adding stop to database:', error);
    errorToast({
      title: "Error Adding Stop",
      description: "Failed to add stop to the database.",
    });
    throw error;
  }
};

export const updateStopInDatabase = async (userId: string, stopId: string, updatedStop: Partial<DeliveryStop>) => {
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
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`Stop ${stopId} updated successfully in database.`);
    return true;
  } catch (error) {
    console.error('Error updating stop in database:', error);
    errorToast({
      title: "Error Updating Stop",
      description: "Failed to update stop in the database.",
    });
    throw error;
  }
};

export const removeStopFromDatabase = async (userId: string, stopId: string) => {
  try {
    const { error } = await supabase
      .from('delivery_stops')
      .delete()
      .eq('id', stopId)
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`Stop ${stopId} removed successfully.`);
    return true;
  } catch (error) {
    console.error('Error removing stop from database:', error);
    errorToast({
      title: "Error Removing Stop",
      description: "Failed to remove stop from the database.",
    });
    throw error;
  }
};

export const assignStopInDatabase = async (userId: string, stopId: string, driverId: string) => {
  try {
    const { error } = await supabase
      .from('delivery_stops')
      .update({
        driver_id: driverId,
        status: 'assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', stopId)
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`Stop ${stopId} assigned to driver ${driverId}.`);
    return true;
  } catch (error) {
    console.error('Error assigning stop in database:', error);
    errorToast({
      title: "Error Assigning Stop",
      description: "Failed to assign stop to driver in the database.",
    });
    throw error;
  }
};

export const unassignStopInDatabase = async (userId: string, stopId: string) => {
  try {
    const { error } = await supabase
      .from('delivery_stops')
      .update({
        driver_id: null,
        status: 'unassigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', stopId)
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`Stop ${stopId} unassigned.`);
    return true;
  } catch (error) {
    console.error('Error unassigning stop in database:', error);
    errorToast({
      title: "Error Unassigning Stop",
      description: "Failed to unassign stop in the database.",
    });
    throw error;
  }
};

export const syncStopsWithDatabase = async (userId: string, stops: DeliveryStop[]) => {
  try {
    const { data: dbStops, error: fetchError } = await supabase
      .from('delivery_stops')
      .select('id')
      .eq('user_id', userId);
    
    if (fetchError) throw fetchError;
    
    const dbStopIds = new Set((dbStops || []).map(d => d.id));
    const currentStops = stops;
    
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
          user_id: userId,
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
        .eq('user_id', userId);
      
      if (updateError) throw updateError;
    }
    
    if (stopsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('delivery_stops')
        .delete()
        .in('id', stopsToDelete)
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;
    }
    
    console.log(`Sync Complete - Added: ${stopsToAdd.length}, Updated: ${stopsToUpdate.length}, Deleted: ${stopsToDelete.length}`);
    return true;
  } catch (error) {
    console.error('Error syncing stops with database:', error);
    errorToast({
      title: "Sync Failed",
      description: "Failed to synchronize stops with the database.",
    });
    throw error;
  }
};
