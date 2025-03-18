import React, { useState, useEffect } from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import { Driver } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, User, Phone, UserX, PaintBucket, UserCheck, Pencil, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

const driverColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#84CC16', // Lime
  '#0EA5E9', // Sky
];

const DriverPanel: React.FC = () => {
  const { scheduleDay, addDriver, removeDriver, updateDriver, syncDriversWithDatabase } = useSchedule();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [allDriversAvailable, setAllDriversAvailable] = useState(true);
  
  const [newDriver, setNewDriver] = useState<Omit<Driver, 'id'>>({
    name: '',
    color: driverColors[0],
    vehicleType: '',
    phoneNumber: '',
    notes: '',
    available: true,
  });

  useEffect(() => {
    if (scheduleDay.drivers.length > 0) {
      const allAvailable = scheduleDay.drivers.every(driver => driver.available !== false);
      setAllDriversAvailable(allAvailable);
    }
  }, [scheduleDay.drivers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewDriver(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedDriver) return;
    
    const { name, value } = e.target;
    setSelectedDriver(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleColorSelect = (color: string) => {
    setNewDriver(prev => ({ ...prev, color }));
  };

  const handleEditColorSelect = (color: string) => {
    setSelectedDriver(prev => prev ? { ...prev, color } : null);
  };

  const handleAddDriver = async () => {
    if (newDriver.name.trim() && user) {
      try {
        addDriver(newDriver);
        setNewDriver({
          name: '',
          color: driverColors[Math.floor(Math.random() * driverColors.length)],
          vehicleType: '',
          phoneNumber: '',
          notes: '',
          available: true,
        });
        setIsAddDialogOpen(false);
      } catch (error) {
        console.error('Error adding driver:', error);
        toast({
          title: "Error",
          description: "Failed to add driver. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveDriver = async (driverId: string) => {
    try {
      await removeDriver(driverId);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error removing driver:', error);
      toast({
        title: "Error",
        description: "Failed to remove driver. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditDriver = async () => {
    if (selectedDriver && selectedDriver.name.trim()) {
      try {
        await updateDriver(selectedDriver.id, selectedDriver);
        setIsEditDialogOpen(false);
        setSelectedDriver(null);
      } catch (error) {
        console.error('Error updating driver:', error);
        toast({
          title: "Error",
          description: "Failed to update driver. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDriverCardClick = (driver: Driver) => {
    setSelectedDriver({...driver});
    setIsEditDialogOpen(true);
  };

  const toggleDriverAvailability = () => {
    if (selectedDriver) {
      const updatedDriver = { 
        ...selectedDriver, 
        available: !selectedDriver.available 
      };
      setSelectedDriver(updatedDriver);
    }
  };

  const handleSyncDrivers = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to sync drivers.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSyncing(true);
    try {
      await syncDriversWithDatabase();
      toast({
        title: "Sync Complete",
        description: "Drivers have been synchronized with the database.",
      });
    } catch (error) {
      console.error('Error syncing drivers:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize drivers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleAllDriversAvailability = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to update drivers.",
        variant: "destructive",
      });
      return;
    }

    const newAvailabilityState = !allDriversAvailable;
    setAllDriversAvailable(newAvailabilityState);
    
    try {
      setIsSyncing(true);
      
      const updatePromises = scheduleDay.drivers.map(driver => 
        updateDriver(driver.id, { ...driver, available: newAvailabilityState })
      );
      
      await Promise.all(updatePromises);
      
      toast({
        title: newAvailabilityState ? "All Drivers Available" : "All Drivers Unavailable",
        description: `Successfully marked all drivers as ${newAvailabilityState ? 'available' : 'unavailable'}.`,
      });
    } catch (error) {
      console.error('Error updating drivers availability:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update drivers availability. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 header-gradient rounded-t-lg flex justify-between items-center">
        <h2 className="text-lg font-medium">Drivers</h2>
      </div>
      
      <div className="p-4 flex-grow overflow-y-auto">
        {scheduleDay.drivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="mx-auto h-10 w-10 opacity-30 mb-2" />
            <p>No drivers available</p>
            <p className="text-sm">Add drivers to start scheduling</p>
          </div>
        ) : (
          <div className="space-y-3 animate-entrance">
            {scheduleDay.drivers.map((driver) => (
              <Card 
                key={driver.id} 
                className={`overflow-hidden border-l-4 transition-all cursor-pointer hover:shadow-md ${!driver.available ? 'opacity-60' : ''}`} 
                style={{ borderLeftColor: driver.color }}
                onClick={() => handleDriverCardClick(driver)}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="driver-avatar relative" style={{ backgroundColor: driver.color }}>
                        {driver.name.charAt(0)}
                        {!driver.available && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/30 rounded-full">
                            <UserX className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium flex items-center gap-1">
                          {driver.name}
                          {!driver.available && <span className="text-xs text-gray-500">(Unavailable)</span>}
                        </h3>
                        {driver.vehicleType && (
                          <p className="text-xs text-gray-500">{driver.vehicleType}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-blue-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDriverCardClick(driver);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {driver.phoneNumber && (
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <Phone className="h-3 w-3 mr-1" />
                      {driver.phoneNumber}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-4 border-t">
        <div className="flex items-center justify-between mb-4 pb-2 border-b">
          <div className="flex items-center">
            <Label htmlFor="all-drivers-availability" className="mr-2">
              {allDriversAvailable ? "All Drivers Available" : "All Drivers Unavailable"}
            </Label>
            <Switch 
              id="all-drivers-availability"
              checked={allDriversAvailable}
              onCheckedChange={toggleAllDriversAvailability}
              disabled={isSyncing || !user || scheduleDay.drivers.length === 0}
            />
          </div>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="default">
              <Plus className="h-4 w-4 mr-2" /> Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Driver</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Driver Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter driver name"
                  value={newDriver.name}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type (Optional)</Label>
                <Input
                  id="vehicleType"
                  name="vehicleType"
                  placeholder="e.g. Van, Truck, Car"
                  value={newDriver.vehicleType}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder="(555) 123-4567"
                  value={newDriver.phoneNumber}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Driver Color</Label>
                <div className="flex flex-wrap gap-2">
                  {driverColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-6 h-6 rounded-full ${
                        newDriver.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorSelect(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDriver} disabled={!newDriver.name.trim() || !user}>
                Add Driver
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedDriver(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Driver</DialogTitle>
            </DialogHeader>
            {selectedDriver && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Driver Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    placeholder="Enter driver name"
                    value={selectedDriver.name}
                    onChange={handleEditInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-vehicleType">Vehicle Type (Optional)</Label>
                  <Input
                    id="edit-vehicleType"
                    name="vehicleType"
                    placeholder="e.g. Van, Truck, Car"
                    value={selectedDriver.vehicleType || ''}
                    onChange={handleEditInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-phoneNumber">Phone Number (Optional)</Label>
                  <Input
                    id="edit-phoneNumber"
                    name="phoneNumber"
                    placeholder="(555) 123-4567"
                    value={selectedDriver.phoneNumber || ''}
                    onChange={handleEditInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Driver Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {driverColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-6 h-6 rounded-full ${
                          selectedDriver.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleEditColorSelect(color)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    variant={selectedDriver.available ? "outline" : "default"}
                    className={`${!selectedDriver.available ? "bg-green-600 hover:bg-green-700" : ""}`}
                    onClick={toggleDriverAvailability}
                  >
                    {selectedDriver.available ? (
                      <>
                        <UserX className="h-4 w-4 mr-2" /> 
                        Mark as Unavailable
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-2" /> 
                        Mark as Available
                      </>
                    )}
                  </Button>
                </div>

              </div>
            )}
            <DialogFooter className="flex justify-between items-center">
              <Button 
                variant="destructive" 
                onClick={() => selectedDriver && handleRemoveDriver(selectedDriver.id)}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditDriver} disabled={!selectedDriver?.name.trim() || !user}>
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DriverPanel;
