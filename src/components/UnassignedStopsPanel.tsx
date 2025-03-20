import React, { useState, useEffect } from 'react';
import { useSchedule, editStopEventChannel } from '@/context/ScheduleContext';
import { useDateSystem } from '@/context/DateContext';
import { DeliveryStop } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

// Import the new components
import UnassignedStopsHeader from './unassigned-stops/UnassignedStopsHeader';
import UnassignedStopsList from './unassigned-stops/UnassignedStopsList';
import StopFormModal from './unassigned-stops/StopFormModal';

const UnassignedStopsPanel: React.FC = () => {
  const { scheduleDay, addStop, updateStop, removeStop, autoAssignStops, isLoading, editStop, duplicateStop } = useSchedule();
  const { currentDateString } = useDateSystem();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentStop, setCurrentStop] = useState<DeliveryStop | null>(null);
  const [draggingStop, setDraggingStop] = useState<string | null>(null);
  const [newStop, setNewStop] = useState<Omit<DeliveryStop, 'id' | 'status'>>({
    businessName: '',
    address: '',
    deliveryTime: '12:00',
    deliveryDate: currentDateString,
    stopType: 'delivery',
  });
  const { errorToast } = useToast();

  const unassignedStops = scheduleDay.stops.filter(stop => 
    stop.status === 'unassigned' && stop.deliveryDate === currentDateString
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
      deliveryDate: currentDateString
    }));
  }, [currentDateString]);

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

  const handleTimeChange = (time: string) => {
    if (isEditModalOpen && currentStop) {
      setCurrentStop({ ...currentStop, deliveryTime: time });
    } else {
      setNewStop({ ...newStop, deliveryTime: time });
    }
  };

  const handleAddStop = () => {
    addStop(newStop);
    setNewStop({
      businessName: '',
      address: '',
      deliveryTime: '12:00',
      deliveryDate: currentDateString,
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
      
      if (currentStop.deliveryDate !== currentDateString) {
        errorToast({
          title: "Date Changed",
          description: `This stop will be moved to ${currentStop.deliveryDate}, which is different from the current view.`,
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
    
    console.log('Deleting stop with ID:', stopId);
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

  return (
    <div className="h-full flex flex-col">
      <UnassignedStopsHeader 
        title="Unassigned Stops"
        count={unassignedStops.length}
        onAutoAssign={autoAssignStops}
        isLoading={isLoading}
      />
      
      <UnassignedStopsList
        stops={unassignedStops}
        currentDateString={currentDateString}
        draggingStop={draggingStop}
        onDragStart={handleDragStart}
        onDragEnd={() => setDraggingStop(null)}
        onEdit={handleEditStop}
        onDelete={handleDeleteStop}
        onDuplicate={duplicateStop}
        onAddNewStop={() => setIsAddModalOpen(true)}
      />

      <StopFormModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        title="Add New Stop"
        description="Add a new stop to the schedule. Required fields are marked with an asterisk (*)."
        stop={newStop}
        currentDateString={currentDateString}
        isEdit={false}
        onSubmit={handleAddStop}
        onInputChange={handleInputChange}
        onSelectChange={handleSelectChange}
        onTimeChange={handleTimeChange}
      />

      <StopFormModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        title="Edit Stop"
        description="Update the stop details. Required fields are marked with an asterisk (*)."
        stop={currentStop}
        currentDateString={currentDateString}
        isEdit={true}
        onSubmit={handleUpdateStop}
        onDelete={handleDeleteStop}
        onDuplicate={duplicateStop}
        onInputChange={handleInputChange}
        onSelectChange={handleSelectChange}
        onTimeChange={handleTimeChange}
      />
    </div>
  );
};

export default UnassignedStopsPanel;
