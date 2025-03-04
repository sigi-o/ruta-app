
import React, { useState } from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import { DeliveryStop, TimeSlot } from '@/types';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, AlertCircle, Package, ShoppingBag, Utensils } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScheduleGridProps {
  selectedDate: string;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ selectedDate }) => {
  const { scheduleDay, assignStop, unassignStop } = useSchedule();
  const [draggingStop, setDraggingStop] = useState<string | null>(null);

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

  // Group stops by driver and time
  const getStopsByDriverAndTime = () => {
    const result: Record<string, Record<string, DeliveryStop[]>> = {};
    
    scheduleDay.drivers.forEach(driver => {
      result[driver.id] = {};
      scheduleDay.timeSlots.forEach(slot => {
        result[driver.id][slot.time] = [];
      });
    });
    
    scheduleDay.stops.forEach(stop => {
      if (stop.status === 'assigned' && stop.driverId) {
        if (!result[stop.driverId][stop.deliveryTime]) {
          result[stop.driverId][stop.deliveryTime] = [];
        }
        result[stop.driverId][stop.deliveryTime].push(stop);
      }
    });
    
    return result;
  };

  const stopsByDriverAndTime = getStopsByDriverAndTime();

  return (
    <div className="h-full flex flex-col bg-gray-50 rounded-lg overflow-hidden">
      <div className="p-4 header-gradient">
        <h2 className="text-lg font-medium">Schedule View - {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
      </div>

      <ScrollArea className="flex-grow">
        <div className="schedule-grid min-w-max">
          {/* Header Row with Driver Names */}
          <div className="sticky top-0 z-10 bg-white">
            <div className="h-14 flex">
              <div className="time-label border-b border-r flex items-center justify-center">
                Time
              </div>
              {scheduleDay.drivers.map(driver => (
                <div 
                  key={driver.id}
                  className="border-b px-3 py-2 flex items-center justify-center font-medium bg-white"
                  style={{ 
                    minWidth: '200px',
                    borderLeft: `4px solid ${driver.color}`
                  }}
                >
                  <div className="driver-avatar mr-2" style={{ backgroundColor: driver.color }}>
                    {driver.name.charAt(0)}
                  </div>
                  <span>{driver.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Time Slots and Stops */}
          {scheduleDay.timeSlots.map(timeSlot => (
            <div key={timeSlot.time} className="flex time-slot">
              <div className="time-label border-r flex items-center justify-center">
                {timeSlot.label}
              </div>
              
              {scheduleDay.drivers.map(driver => (
                <div
                  key={`${driver.id}-${timeSlot.time}`}
                  className="border-b border-r p-2 bg-white/50 hover:bg-blue-50/30 transition-colors"
                  style={{ minWidth: '200px' }}
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
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {getStopTypeIcon(stop.stopType)}
                            <span className="ml-1 capitalize">{stop.stopType}</span>
                          </span>
                        </div>
                        
                        {stop.specialInstructions && (
                          <div className="text-amber-500" title={stop.specialInstructions}>
                            <AlertCircle className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScheduleGrid;
