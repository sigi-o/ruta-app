
import { useState, useCallback } from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import { useToast } from '@/hooks/use-toast';

export const useDragDrop = (currentDateString: string) => {
  const [draggingStop, setDraggingStop] = useState<string | null>(null);
  const { scheduleDay, assignStop, unassignStop, updateStop } = useSchedule();
  const { toast } = useToast();

  const handleDragStart = useCallback((e: React.DragEvent, stopId: string) => {
    console.log('Drag start in ScheduleGrid:', stopId);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      stopId: stopId,
      source: 'schedule'
    }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingStop(stopId);

    const stop = scheduleDay.stops.find(s => s.id === stopId);
    if (stop) {
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
    }
  }, [scheduleDay.stops]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drop-target');
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drop-target');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, driverId: string, timeSlot: string) => {
    e.preventDefault();
    console.log('Drop in ScheduleGrid:', driverId, timeSlot);
    
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drop-target');
    
    let stopId = '';
    let source = '';
    
    try {
      const dataTransfer = JSON.parse(e.dataTransfer.getData('text/plain'));
      stopId = dataTransfer.stopId;
      source = dataTransfer.source;
      console.log('Parsed data transfer:', dataTransfer);
    } catch (error) {
      console.error('Error parsing drag data:', error);
      return;
    }
    
    if (!stopId) return;
    
    const stop = scheduleDay.stops.find(s => s.id === stopId);
    if (!stop) return;
    
    // Valid time check - ensure the time slot exists and is in 15-minute increments
    const validTimeSlot = scheduleDay.timeSlots.some(slot => slot.time === timeSlot);
    if (!validTimeSlot) {
      console.error(`Invalid time slot: ${timeSlot}`);
      toast({
        title: "Invalid Time Slot",
        description: `Cannot assign to time ${timeSlot} as it's not a valid 15-minute time slot.`,
        variant: "destructive"
      });
      return;
    }
    
    if (source === 'unassigned') {
      if (stop.deliveryDate !== currentDateString) {
        updateStop(stopId, {
          deliveryDate: currentDateString,
          deliveryTime: timeSlot,
          status: 'assigned',
          driverId
        });
        
        toast({
          title: "Date Updated",
          description: `${stop.businessName} date changed from ${stop.deliveryDate} to ${currentDateString}`,
        });
      } else {
        assignStop(stopId, driverId);
        updateStop(stopId, { 
          deliveryTime: timeSlot,
          status: 'assigned'
        });
        
        toast({
          title: "Stop Assigned",
          description: `${stop.businessName} assigned to ${scheduleDay.drivers.find(d => d.id === driverId)?.name}`,
        });
      }
    } 
    else if (source === 'schedule') {
      if (stop.driverId !== driverId || stop.deliveryTime !== timeSlot) {
        if (stop.driverId !== driverId) {
          assignStop(stopId, driverId);
        }
        
        if (stop.deliveryTime !== timeSlot) {
          updateStop(stopId, { 
            deliveryTime: timeSlot
          });
          
          toast({
            title: "Time Updated",
            description: `${stop.businessName} moved to ${timeSlot}`,
          });
        } else {
          toast({
            title: "Stop Reassigned",
            description: `${stop.businessName} reassigned to ${scheduleDay.drivers.find(d => d.id === driverId)?.name}`,
          });
        }
      }
    }
    
    setDraggingStop(null);
  }, [scheduleDay.stops, scheduleDay.drivers, scheduleDay.timeSlots, currentDateString, assignStop, unassignStop, updateStop, toast]);

  return {
    draggingStop,
    setDraggingStop,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
};
