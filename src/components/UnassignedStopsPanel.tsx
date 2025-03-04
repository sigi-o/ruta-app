
import React, { useState } from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import { DeliveryStop } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MapPin, Clock, Package, AlertCircle, Plus, Edit, Trash2, ShoppingBag, Utensils } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

const UnassignedStopsPanel: React.FC = () => {
  const { scheduleDay, addStop, updateStop, removeStop } = useSchedule();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentStop, setCurrentStop] = useState<DeliveryStop | null>(null);
  const [newStop, setNewStop] = useState<Omit<DeliveryStop, 'id' | 'status'>>({
    clientName: '',
    address: '',
    deliveryTime: '12:00',
    stopType: 'delivery',
  });

  const unassignedStops = scheduleDay.stops.filter(stop => stop.status === 'unassigned');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (isEditModalOpen && currentStop) {
      setCurrentStop({ ...currentStop, [name]: value });
    } else {
      setNewStop({ ...newStop, [name]: value });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (isEditModalOpen && currentStop) {
      setCurrentStop({ ...currentStop, [name]: value });
    } else {
      setNewStop({ ...newStop, [name]: value });
    }
  };

  const handleAddStop = () => {
    addStop(newStop);
    setNewStop({
      clientName: '',
      address: '',
      deliveryTime: '12:00',
      stopType: 'delivery',
    });
    setIsAddModalOpen(false);
  };

  const handleEditStop = (stop: DeliveryStop) => {
    setCurrentStop(stop);
    setIsEditModalOpen(true);
  };

  const handleUpdateStop = () => {
    if (currentStop) {
      updateStop(currentStop.id, currentStop);
      setIsEditModalOpen(false);
      setCurrentStop(null);
    }
  };

  const handleDeleteStop = (stopId: string) => {
    removeStop(stopId);
  };

  const handleDragStart = (e: React.DragEvent, stop: DeliveryStop) => {
    e.dataTransfer.setData('text/plain', stop.id);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 header-gradient rounded-t-lg">
        <h2 className="text-lg font-medium">Unassigned Stops</h2>
      </div>
      
      <ScrollArea className="flex-grow px-4 py-2">
        {unassignedStops.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto h-10 w-10 opacity-30 mb-2" />
            <p>No unassigned stops</p>
            <p className="text-sm">All stops have been assigned to drivers</p>
          </div>
        ) : (
          <div className="space-y-3 animate-entrance">
            {unassignedStops.map((stop) => (
              <div
                key={stop.id}
                className="unassigned-stop"
                draggable
                onDragStart={(e) => handleDragStart(e, stop)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{stop.clientName}</div>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {stop.address}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => handleEditStop(stop)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-red-500"
                      onClick={() => handleDeleteStop(stop.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center text-xs font-medium">
                    <Clock className="h-3.5 w-3.5 text-gray-500 mr-1" />
                    {stop.deliveryTime}
                  </div>
                  
                  <div className="flex items-center">
                    <span 
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stop.stopType === 'delivery' ? 'bg-blue-100 text-blue-800' :
                        stop.stopType === 'pickup' ? 'bg-purple-100 text-purple-800' :
                        stop.stopType === 'butcher' ? 'bg-red-100 text-red-800' : 
                        'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {stop.stopType === 'delivery' && <Package className="h-3 w-3 mr-1" />}
                      {stop.stopType === 'pickup' && <ShoppingBag className="h-3 w-3 mr-1" />}
                      {stop.stopType === 'butcher' && <Utensils className="h-3 w-3 mr-1" />}
                      {stop.stopType === 'equipment' && <Package className="h-3 w-3 mr-1" />}
                      <span className="capitalize">{stop.stopType}</span>
                    </span>
                  </div>
                </div>
                
                {stop.specialInstructions && (
                  <div className="mt-2 p-2 bg-amber-50 rounded-sm text-xs text-amber-800 flex items-start">
                    <AlertCircle className="h-3.5 w-3.5 mr-1 mt-0.5 flex-shrink-0" />
                    <span>{stop.specialInstructions}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="p-4 mt-auto border-t">
        <Button
          className="w-full"
          variant="default"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Stop
        </Button>
      </div>

      {/* Add Stop Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Stop</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                name="clientName"
                placeholder="Enter client name"
                value={newStop.clientName}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                placeholder="Enter delivery address"
                value={newStop.address}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryTime">Delivery Time</Label>
                <Select
                  value={newStop.deliveryTime}
                  onValueChange={(value) => handleSelectChange('deliveryTime', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleDay.timeSlots.map((slot) => (
                      <SelectItem key={slot.time} value={slot.time}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stopType">Stop Type</Label>
                <Select
                  value={newStop.stopType}
                  onValueChange={(value) => handleSelectChange('stopType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="butcher">Butcher</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
              <Textarea
                id="specialInstructions"
                name="specialInstructions"
                placeholder="Enter any special instructions"
                value={newStop.specialInstructions || ''}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStop} disabled={!newStop.clientName || !newStop.address}>
              Add Stop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stop Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stop</DialogTitle>
          </DialogHeader>
          {currentStop && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="editClientName"
                  name="clientName"
                  placeholder="Enter client name"
                  value={currentStop.clientName}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="editAddress"
                  name="address"
                  placeholder="Enter delivery address"
                  value={currentStop.address}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryTime">Delivery Time</Label>
                  <Select
                    value={currentStop.deliveryTime}
                    onValueChange={(value) => handleSelectChange('deliveryTime', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleDay.timeSlots.map((slot) => (
                        <SelectItem key={slot.time} value={slot.time}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stopType">Stop Type</Label>
                  <Select
                    value={currentStop.stopType}
                    onValueChange={(value) => handleSelectChange('stopType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="butcher">Butcher</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
                <Textarea
                  id="editSpecialInstructions"
                  name="specialInstructions"
                  placeholder="Enter any special instructions"
                  value={currentStop.specialInstructions || ''}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStop} disabled={!currentStop?.clientName || !currentStop?.address}>
              Update Stop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnassignedStopsPanel;
