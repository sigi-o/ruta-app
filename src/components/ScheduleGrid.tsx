import React, { useState, useEffect } from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import { DeliveryStop, TimeSlot } from '@/types';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, AlertCircle, Package, ShoppingBag, ChevronLeft, ChevronRight, GripHorizontal, Copy } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ScheduleGridProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ selectedDate, onDateChange }) => {
  const { scheduleDay, assignStop, unassignStop, updateStop, removeStop, editStop, duplicateStop } = useSchedule();
  const [draggingStop, setDraggingStop] = useState<string | null>(null);
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent, stopId: string) => {
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
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drop-target');
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drop-target');
  };

  const handleDrop = (e: React.DragEvent, driverId: string, timeSlot: string) => {
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
    
    if (source === 'unassigned') {
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
  };

  const getStopTypeIcon = (stopType: string) => {
    switch (stopType) {
      case 'delivery':
        return <Package className="h-3 w-3" />;
      case 'pickup':
        return <ShoppingBag className="h-3 w-3" />;
      case 'other':
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  const handleStopClick = (stopId: string) => {
    if (expandedStopId === stopId) {
      setExpandedStopId(null);
    } else {
      setExpandedStopId(stopId);
      editStop(stopId);
    }
  };

  const handleDuplicateStop = (e: React.MouseEvent, stopId: string) => {
    e.stopPropagation();
    duplicateStop(stopId);
    toast({
      title: "Stop Duplicated",
      description: "A copy of the stop has been created and added to unassigned stops.",
    });
  };

  const getStopsByDriverAndTime = () => {
    const result: Record<string, Record<string, DeliveryStop[]>> = {};
    
    const availableDrivers = scheduleDay.drivers.filter(driver => driver.available !== false);

    availableDrivers.forEach(driver => {
      result[driver.id] = {};
      scheduleDay.timeSlots.forEach(slot => {
        result[driver.id][slot.time] = [];
      });
    });
    
    scheduleDay.stops.forEach(stop => {
      if (stop.status === 'assigned' && stop.driverId) {
        const driver = scheduleDay.drivers.find(d => d.id === stop.driverId);
        if (driver && driver.available !== false) {
          if (!result[stop.driverId][stop.deliveryTime]) {
            result[stop.driverId][stop.deliveryTime] = [];
          }
          result[stop.driverId][stop.deliveryTime].push(stop);
        }
      }
    });
    
    return result;
  };

  useEffect(() => {
    console.log("ScheduleGrid received date:", selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .drop-target {
        background-color: rgba(59, 130, 246, 0.1);
        box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.5);
      }
      
      .delivery-item, .unassigned-stop {
        transition: transform 0.1s, box-shadow 0.1s;
      }
      
      .delivery-item:hover, .unassigned-stop:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }

      .expanded-stop-actions {
        padding-top: 0.5rem;
        margin-top: 0.5rem;
        border-top: 1px dashed #e5e7eb;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const availableDrivers = scheduleDay.drivers.filter(driver => driver.available !== false);
  const stopsByDriverAndTime = getStopsByDriverAndTime();

  let formattedDate = "";
  try {
    const parsedDate = new Date(selectedDate);
    if (!isNaN(parsedDate.getTime())) {
      formattedDate = format(parsedDate, 'EEEE, MMMM d, yyyy');
    } else {
      formattedDate = "Invalid Date";
      console.error("Invalid date format:", selectedDate);
    }
  } catch (error) {
    formattedDate = "Invalid Date";
    console.error("Error formatting date:", error);
  }

  const goToPreviousDay = () => {
    try {
      const date = new Date(selectedDate);
      if (!isNaN(date.getTime())) {
        const newDate = addDays(date, -1);
        const newDateString = format(newDate, 'yyyy-MM-dd');
        console.log("Going to previous day:", newDateString);
        onDateChange(newDateString);
      } else {
        console.error("Invalid date for previous day navigation:", selectedDate);
      }
    } catch (error) {
      console.error("Error navigating to previous day:", error);
    }
  };

  const goToNextDay = () => {
    try {
      const date = new Date(selectedDate);
      if (!isNaN(date.getTime())) {
        const newDate = addDays(date, 1);
        const newDateString = format(newDate, 'yyyy-MM-dd');
        console.log("Going to next day:", newDateString);
        onDateChange(newDateString);
      } else {
        console.error("Invalid date for next day navigation:", selectedDate);
      }
    } catch (error) {
      console.error("Error navigating to next day:", error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden">
      <div className="card-header flex items-center justify-between p-4">
        <button 
          onClick={goToPreviousDay}
          className="p-1 hover:bg-blue-50 rounded-full text-blue-600"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h2 className="text-lg font-medium">{formattedDate}</h2>
        
        <button 
          onClick={goToNextDay}
          className="p-1 hover:bg-blue-50 rounded-full text-blue-600"
          aria-label="Next day"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-grow overflow-auto">
        <div className="schedule-container overflow-auto">
          <div className="schedule-header sticky top-0 z-10 flex">
            <div className="time-header">
              Time
            </div>
            {availableDrivers.map(driver => (
              <div 
                key={driver.id}
                className="driver-header"
                style={{ borderLeft: `4px solid ${driver.color}` }}
              >
                <div className="driver-avatar mr-2" style={{ backgroundColor: driver.color }}>
                  {driver.name.charAt(0)}
                </div>
                <span>{driver.name}</span>
              </div>
            ))}
          </div>

          <div className="schedule-body">
            {scheduleDay.timeSlots.map(timeSlot => (
              <div key={timeSlot.time} className="time-row">
                <div className="time-label">
                  {timeSlot.label}
                </div>
                
                <div className="driver-cells">
                  {availableDrivers.map(driver => (
                    <div
                      key={`${driver.id}-${timeSlot.time}`}
                      className="driver-cell"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, driver.id, timeSlot.time)}
                    >
                      {stopsByDriverAndTime[driver.id][timeSlot.time]?.map(stop => (
                        <div
                          key={stop.id}
                          className={`delivery-item cursor-pointer ${draggingStop === stop.id ? 'opacity-50' : ''}`}
                          style={{ backgroundColor: `${driver.color}15`, borderLeft: `3px solid ${driver.color}` }}
                          draggable="true"
                          onDragStart={(e) => handleDragStart(e, stop.id)}
                          onDragEnd={() => setDraggingStop(null)}
                          onClick={() => handleStopClick(stop.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="font-medium text-gray-800">{stop.businessName || stop.clientName}</div>
                            <div className="flex items-center text-xs gap-1">
                              <div className="text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {stop.deliveryTime}
                              </div>
                              <div 
                                className="h-6 w-6 flex items-center justify-center text-gray-400 cursor-grab"
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <GripHorizontal className="h-3 w-3" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {stop.address}
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
                                {getStopTypeIcon(stop.stopType)}
                                <span className="ml-1 capitalize">{stop.stopType}</span>
                              </span>
                            </div>
                            
                            {stop.specialInstructions && (
                              <div className="text-blue-500" title={stop.specialInstructions}>
                                <AlertCircle className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGrid;
