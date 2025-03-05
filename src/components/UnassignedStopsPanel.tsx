import React, { useState, useEffect } from 'react';
import { useSchedule, editStopEventChannel } from '@/context/ScheduleContext';
import { DeliveryStop } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { MapPin, Clock, Package, AlertCircle, Plus, Edit, Trash2, ShoppingBag, Shuffle, Phone, GripHorizontal, Copy, Calendar } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const UnassignedStopsPanel: React.FC = () => {
  const { scheduleDay, addStop, updateStop, removeStop, autoAssignStops, isLoading, editStop, duplicateStop, selectedDate } = useSchedule();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentStop, setCurrentStop] = useState<DeliveryStop | null>(null);
  const [draggingStop, setDraggingStop] = useState<string | null>(null);
  const [newStop, setNewStop] = useState<Omit<DeliveryStop, 'id' | 'status'>>({
    businessName: '',
    address: '',
    deliveryTime: '12:00',
    deliveryDate: selectedDate,
    stopType: 'delivery',
  });
  const { toast } = useToast();

  const unassignedStops = scheduleDay.stops.filter(stop => 
    stop.status === 'unassigned' && stop.deliveryDate === selectedDate
  );

  useEffect(() => {
    const handleEditStop = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setCurrentStop(customEvent.detail);
        setIsEditModalOpen(true);
      }
    };

    editStopEventChannel.addEventListener('editStop', handleEditStop);
    
    return () => {
      editStopEventChannel.removeEventListener('editStop', handleEditStop);
    };
  }, []);

  useEffect(() => {
    setNewStop(prev => ({
      ...prev,
      deliveryDate: selectedDate
    }));
  }, [selectedDate]);

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
      businessName: '',
      address: '',
      deliveryTime: '12:00',
      deliveryDate: selectedDate,
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
      
      if (currentStop.deliveryDate !== selectedDate) {
        toast({
          title: "Date Changed",
          description: `This stop will be moved to ${currentStop.deliveryDate}, which is different from the current view.`,
          variant: "destructive"
        });
      }
      
      setIsEditModalOpen(false);
      setCurrentStop(null);
    }
  };

  const handleDeleteStop = (stopId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    removeStop(stopId);
    
    if (isEditModalOpen) {
      setIsEditModalOpen(false);
      setCurrentStop(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, stop: DeliveryStop) => {
    console.log('Drag start in UnassignedStopsPanel:', stop.id);
    
    e.dataTransfer.setData('text/plain', JSON.stringify({
      stopId: stop.id,
      source: 'unassigned'
    }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingStop(stop.id);
    
    const dragImage = document.createElement('div');
    dragImage.className = 'p-2 bg-blue-100 border border-blue-300 rounded shadow-sm';
    dragImage.textContent = stop.businessName;
    document.body.appendChild(dragImage);
    
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 100);
  };

  const handleDragEnd = () => {
    setDraggingStop(null);
  };

  const getStopTypeIcon = (stopType: string) => {
    switch (stopType) {
      case 'delivery':
        return <Package className="h-3 w-3 mr-1" />;
      case 'pickup':
        return <ShoppingBag className="h-3 w-3 mr-1" />;
      case 'other':
      default:
        return <Package className="h-3 w-3 mr-1" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 header-gradient rounded-t-lg flex justify-between items-center">
        <h2 className="text-lg font-medium">Unassigned Stops</h2>
      </div>
      
      <div className="border-b border-blue-100 p-2 bg-blue-50/30">
        <Button 
          onClick={autoAssignStops}
          disabled={isLoading || unassignedStops.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Shuffle className="h-3.5 w-3.5 mr-1.5" /> 
          {isLoading ? 'Assigning...' : 'Auto-Assign All Stops'}
        </Button>
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
                className={`unassigned-stop cursor-grab ${draggingStop === stop.id ? 'opacity-50' : ''}`}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, stop)}
                onDragEnd={handleDragEnd}
                onClick={() => handleEditStop(stop)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{stop.businessName}</div>
                    {stop.clientName && (
                      <div className="text-sm text-gray-600">{stop.clientName}</div>
                    )}
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {stop.address}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      {stop.deliveryDate}
                    </div>
                    {stop.contactPhone && (
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <Phone className="h-3.5 w-3.5 mr-1" />
                        {stop.contactPhone}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <div 
                      className="h-7 w-7 flex items-center justify-center text-gray-400 cursor-grab"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <GripHorizontal className="h-3.5 w-3.5" />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-blue-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateStop(stop.id);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStop(stop);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-red-500"
                      onClick={(e) => handleDeleteStop(stop.id, e)}
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
                        stop.stopType === 'pickup' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {getStopTypeIcon(stop.stopType)}
                      <span className="capitalize">{stop.stopType}</span>
                    </span>
                  </div>
                </div>
                
                {stop.specialInstructions && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-sm text-xs text-blue-800 flex items-start">
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
          className="w-full bg-blue-600 hover:bg-blue-700"
          variant="default"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Stop
        </Button>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-blue-600">Add New Stop</DialogTitle>
            <DialogDescription>
              Add a new stop to the schedule. Required fields are marked with an asterisk (*).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name <span className="text-red-500">*</span></Label>
              <Input
                id="businessName"
                name="businessName"
                placeholder="Enter business name"
                value={newStop.businessName}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name (Optional)</Label>
              <Input
                id="clientName"
                name="clientName"
                placeholder="Enter client name"
                value={newStop.clientName || ''}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
              <Input
                id="address"
                name="address"
                placeholder="Enter delivery address"
                value={newStop.address}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone Number (Optional)</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                placeholder="Enter contact phone number"
                value={newStop.contactPhone || ''}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Delivery Date <span className="text-red-500">*</span></Label>
                <Input
                  id="deliveryDate"
                  name="deliveryDate"
                  type="date"
                  value={newStop.deliveryDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deliveryTime">Delivery Time <span className="text-red-500">*</span></Label>
                <Select
                  value={newStop.deliveryTime}
                  onValueChange={(value) => handleSelectChange('deliveryTime', value)}
                  required
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stopType">Stop Type <span className="text-red-500">*</span></Label>
              <Select
                value={newStop.stopType}
                onValueChange={(value) => handleSelectChange('stopType', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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
            <Button 
              onClick={handleAddStop} 
              disabled={!newStop.businessName || !newStop.address || !newStop.deliveryTime || !newStop.stopType || !newStop.deliveryDate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Stop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-blue-600">Edit Stop</DialogTitle>
            <DialogDescription>
              Update the stop details. Required fields are marked with an asterisk (*).
            </DialogDescription>
          </DialogHeader>
          {currentStop && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name <span className="text-red-500">*</span></Label>
                <Input
                  id="editBusinessName"
                  name="businessName"
                  placeholder="Enter business name"
                  value={currentStop.businessName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name (Optional)</Label>
                <Input
                  id="editClientName"
                  name="clientName"
                  placeholder="Enter client name"
                  value={currentStop.clientName || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                <Input
                  id="editAddress"
                  name="address"
                  placeholder="Enter delivery address"
                  value={currentStop.address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone Number (Optional)</Label>
                <Input
                  id="editContactPhone"
                  name="contactPhone"
                  placeholder="Enter contact phone number"
                  value={currentStop.contactPhone || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editDeliveryDate">Delivery Date <span className="text-red-500">*</span></Label>
                  <Input
                    id="editDeliveryDate"
                    name="deliveryDate"
                    type="date"
                    value={currentStop.deliveryDate}
                    onChange={handleInputChange}
                    required
                  />
                  {currentStop.deliveryDate !== selectedDate && (
                    <p className="text-xs text-yellow-600 mt-1">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      This date differs from the current view date ({selectedDate})
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="deliveryTime">Delivery Time <span className="text-red-500">*</span></Label>
                  <Select
                    value={currentStop.deliveryTime}
                    onValueChange={(value) => handleSelectChange('deliveryTime', value)}
                    required
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stopType">Stop Type <span className="text-red-500">*</span></Label>
                <Select
                  value={currentStop.stopType}
                  onValueChange={(value) => handleSelectChange('stopType', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
          <DialogFooter className="flex justify-between">
            <div className="flex space-x-2">
              <Button 
                variant="destructive"
                onClick={() => handleDeleteStop(currentStop?.id || '')}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  if (currentStop) {
                    duplicateStop(currentStop.id);
                    setIsEditModalOpen(false);
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateStop} 
                disabled={!currentStop?.businessName || !currentStop?.address || !currentStop?.deliveryTime || !currentStop?.stopType || !currentStop?.deliveryDate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Update Stop
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnassignedStopsPanel;
