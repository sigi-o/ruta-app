
import React, { useState, useEffect } from 'react';
import { useSchedule } from '@/context/ScheduleContext';
import { useDateSystem } from '@/context/DateContext';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

// Import the extracted components
import DateNavigator from './schedule/DateNavigator';
import ScheduleHeader from './schedule/ScheduleHeader';
import TimeRow from './schedule/TimeRow';
import ScheduleCSS from './schedule/ScheduleCSS';
import { useDragDrop } from './schedule/useDragDrop';

const ScheduleGrid: React.FC = () => {
  const { scheduleDay, editStop } = useSchedule();
  const { currentDate, currentDateString, goToNextDay, goToPreviousDay, isDateValid } = useDateSystem();
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const { toast } = useToast();

  const {
    draggingStop,
    setDraggingStop,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragDrop(currentDateString);

  const handleStopClick = (stopId: string) => {
    if (expandedStopId === stopId) {
      setExpandedStopId(null);
    } else {
      setExpandedStopId(stopId);
      editStop(stopId);
    }
  };

  const getStopsByDriverAndTime = () => {
    const result: Record<string, Record<string, any[]>> = {};
    
    const availableDrivers = scheduleDay.drivers.filter(driver => driver.available !== false);

    availableDrivers.forEach(driver => {
      result[driver.id] = {};
      scheduleDay.timeSlots.forEach(slot => {
        result[driver.id][slot.time] = [];
      });
    });
    
    const stopsForCurrentDate = scheduleDay.stops.filter(stop => stop.deliveryDate === currentDateString);
    
    stopsForCurrentDate.forEach(stop => {
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

  const handlePrevButtonClick = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    goToPreviousDay();
    setTimeout(() => setIsNavigating(false), 300);
  };

  const handleNextButtonClick = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    goToNextDay();
    setTimeout(() => setIsNavigating(false), 300);
  };

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

  useEffect(() => {
    // Debugging logs to verify time slots
    console.log("Available time slots total:", scheduleDay.timeSlots.length);
    console.log("First time slot:", scheduleDay.timeSlots[0]?.time, "Label:", scheduleDay.timeSlots[0]?.label);
    console.log("Last time slot:", scheduleDay.timeSlots[scheduleDay.timeSlots.length - 1]?.time, 
                "Label:", scheduleDay.timeSlots[scheduleDay.timeSlots.length - 1]?.label);
    
    // Log a few time slots to verify the full range
    console.log("Sample time slots:");
    const sampleIndices = [0, 8, 16, 24, 32, 40, 47]; // Sample indices across the range
    sampleIndices.forEach(index => {
      if (scheduleDay.timeSlots[index]) {
        console.log(`Slot ${index}: ${scheduleDay.timeSlots[index].time} - ${scheduleDay.timeSlots[index].label}`);
      }
    });
  }, [scheduleDay.timeSlots]);

  const availableDrivers = scheduleDay.drivers.filter(driver => driver.available !== false);
  const stopsByDriverAndTime = getStopsByDriverAndTime();

  let formattedDate = "";
  try {
    if (isDateValid) {
      formattedDate = format(currentDate, 'EEEE, MMMM d, yyyy');
    } else {
      formattedDate = "Invalid Date";
      console.error("Invalid date format in ScheduleGrid");
    }
  } catch (error) {
    formattedDate = "Invalid Date";
    console.error("Error formatting date:", error);
  }

  if (!isDateValid) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-lg overflow-hidden p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-500 mb-2">Date Synchronization Error</h3>
          <p className="text-gray-600 mb-4">The calendar and schedule grid dates are out of sync. Resolving...</p>
        </div>
      </div>
    );
  }

  // Make sure we're using ALL time slots from the context
  const allTimeSlots = scheduleDay.timeSlots;
  
  return (
    <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden">
      <DateNavigator 
        formattedDate={formattedDate}
        onPrevButtonClick={handlePrevButtonClick}
        onNextButtonClick={handleNextButtonClick}
        isNavigating={isNavigating}
      />

      <div className="flex-grow overflow-auto">
        <div className="schedule-container overflow-auto">
          <ScheduleHeader availableDrivers={availableDrivers} />

          <div className="schedule-body">
            {allTimeSlots.map((timeSlot, index) => (
              <TimeRow
                key={`${timeSlot.time}-${index}`}
                timeSlot={timeSlot}
                availableDrivers={availableDrivers}
                stopsByDriverAndTime={stopsByDriverAndTime}
                draggingStop={draggingStop}
                currentDateString={currentDateString}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onDragEnd={() => setDraggingStop(null)}
                onStopClick={handleStopClick}
              />
            ))}
          </div>
        </div>
      </div>

      <ScheduleCSS />
    </div>
  );
};

export default ScheduleGrid;
