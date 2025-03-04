
import React, { useState } from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import { Driver } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, User, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
  const { scheduleDay, addDriver, removeDriver } = useSchedule();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDriver, setNewDriver] = useState<Omit<Driver, 'id'>>({
    name: '',
    color: driverColors[0],
    vehicleType: '',
    phoneNumber: '',
    notes: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewDriver(prev => ({ ...prev, [name]: value }));
  };

  const handleColorSelect = (color: string) => {
    setNewDriver(prev => ({ ...prev, color }));
  };

  const handleAddDriver = () => {
    if (newDriver.name.trim()) {
      addDriver(newDriver);
      setNewDriver({
        name: '',
        color: driverColors[Math.floor(Math.random() * driverColors.length)],
        vehicleType: '',
        phoneNumber: '',
        notes: '',
      });
      setIsAddDialogOpen(false);
    }
  };

  const handleRemoveDriver = (driverId: string) => {
    removeDriver(driverId);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 header-gradient rounded-t-lg">
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
              <Card key={driver.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: driver.color }}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="driver-avatar" style={{ backgroundColor: driver.color }}>
                        {driver.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-medium">{driver.name}</h3>
                        {driver.vehicleType && (
                          <p className="text-xs text-gray-500">{driver.vehicleType}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDriver(driver.id)}
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
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
              <Button onClick={handleAddDriver} disabled={!newDriver.name.trim()}>
                Add Driver
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DriverPanel;
