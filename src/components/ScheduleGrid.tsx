
import React, { useState } from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import { DeliveryStop, TimeSlot } from '@/types';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, AlertCircle, Package, ShoppingBag, Utensils, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { addDays, format, parseISO } from 'date-fns';

interface ScheduleGridProps {
  selectedDate: string;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ selectedDate }) => {
  const { scheduleDay, assignStop, unassignStop } = useSchedule();
  const [draggingStop, setDraggingStop] = useState<string | null>(null);

  // Filter out unavailable drivers
  const availableDrivers = scheduleDay.drivers.filter(driver => driver.available !== false);

  const handleDragStart = (stopId: string) => {
    setDraggingStop(stopId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, driverId: string, timeSlot: string) => {
    e.preventDefault();
    if (draggingStop) {
      assignStop(draggingStop, driverId);
      // Update the time if it's different
      const stop = scheduleDay.stops.find(s => s.id === draggingStop);
      if (stop && stop.deliveryTime !== timeSlot) {
        // In a real app, you would update the stop's delivery time here
        console.log(`Update stop ${draggingStop} time from ${stop.deliveryTime} to ${timeSlot}`);
      }
      setDraggingStop(null);
    }
  };

  const getStopTypeIcon = (stopType: string) => {
    switch (stopType) {
      case 'delivery':
        return <Package className="h-3 w-3" />;
      case 'pickup':
        return <ShoppingBag className="h-3 w-3" />;
      case 'butcher':
        return <Utensils className="h-3 w-3" />;
      case 'equipment':
        return <Package className="h-3 w-3" />;
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  const getStopsByDriverAndTime = () => {
    const result: Record<string, Record<string, DeliveryStop[]>> = {};
    
    availableDrivers.forEach(driver => {
      result[driver.id] = {};
      scheduleDay.timeSlots.forEach(slot => {
        result[driver.id][slot.time] = [];
      });
    });
    
    scheduleDay.stops.forEach(stop => {
      if (stop.status === 'assigned' && stop.driverId) {
        // Only add the stop if the driver is available
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

  const stopsByDriverAndTime = getStopsByDriverAndTime();

  // Navigation functions
  const goToPreviousDay = () => {
    const date = parseISO(selectedDate);
    const newDate = addDays(date, -1);
    const newDateString = format(newDate, 'yyyy-MM-dd');
    // We'll use window.location to navigate to the new date
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('date', newDateString);
    window.location.search = searchParams.toString();
  };

  const goToNextDay = () => {
    const date = parseISO(selectedDate);
    const newDate = addDays(date, 1);
    const newDateString = format(newDate, 'yyyy-MM-dd');
    // We'll use window.location to navigate to the new date
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('date', newDateString);
    window.location.search = searchParams.toString();
  };

  const formattedDate = format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy');

  return (
    <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden">
      <div className="card-header flex items-center justify-between">
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

      <ScrollArea className="flex-grow">
        <div className="schedule-container">
          {/* Header Row with Driver Names */}
          <div className="sticky top-0 z-10 flex">
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

          {/* Time Slots and Stops */}
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
                      onDrop={(e) => handleDrop(e, driver.id, timeSlot.time)}
                    >
                      {stopsByDriverAndTime[driver.id][timeSlot.time]?.map(stop => (
                        <div
                          key={stop.id}
                          className={`delivery-item ${draggingStop === stop.id ? 'dragging' : ''}`}
                          style={{ backgroundColor: `${driver.color}15`, borderLeft: `3px solid ${driver.color}` }}
                          draggable
                          onDragStart={() => handleDragStart(stop.id)}
                          onDragEnd={() => setDraggingStop(null)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="font-medium text-gray-800">{stop.clientName}</div>
                            <div className="flex items-center text-xs text-gray-500 ml-2">
                              <Clock className="h-3 w-3 mr-1" />
                              {stop.deliveryTime}
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
      </ScrollArea>
    </div>
  );
};

export default ScheduleGrid;
