import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
  const [hasScrolledToSixAM, setHasScrolledToSixAM] = useState(false);
  const { toast } = useToast();
  const scheduleBodyRef = useRef<HTMLDivElement>(null);
  const initialRenderRef = useRef(true);

  const {
    draggingStop,
    setDraggingStop,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragDrop(currentDateString);

  // For debugging the number of time slots being rendered
  useEffect(() => {
    console.log(`Total time slots available: ${scheduleDay.timeSlots.length}`);
    if (scheduleDay.timeSlots.length > 0) {
      console.log(`First time slot: ${scheduleDay.timeSlots[0]?.time} (${scheduleDay.timeSlots[0]?.label})`);
      console.log(`Last time slot: ${scheduleDay.timeSlots[scheduleDay.timeSlots.length - 1]?.time} (${scheduleDay.timeSlots[scheduleDay.timeSlots.length - 1]?.label})`);
    }
  }, [scheduleDay.timeSlots]);
  
  // Improved scroll to 6AM implementation with multiple safeguards
  useEffect(() => {
    // Only attempt to scroll if:
    // 1. We haven't scrolled yet
    // 2. We have a reference to the DOM element
    // 3. We have time slots data
    // 4. It's the initial render or data just became available
    if (!hasScrolledToSixAM && 
        scheduleBodyRef.current && 
        scheduleDay.timeSlots.length > 0) {
      
      // Create a dedicated scroll function
      const scrollToSixAM = () => {
        if (!scheduleBodyRef.current) return;
        
        const sixAMIndex = scheduleDay.timeSlots.findIndex(slot => slot.time === "06:00");
        if (sixAMIndex === -1) {
          console.warn("Could not find 6AM time slot");
          return;
        }
        
        console.log(`Attempting to scroll to 6AM (index: ${sixAMIndex})`);
        
        // Force layout calculation to ensure accurate measurements
        const rowHeight = 42; // Height based on CSS inspection
        const scrollPosition = sixAMIndex * rowHeight;
        
        // Actually perform the scroll
        scheduleBodyRef.current.scrollTop = scrollPosition;
        console.log(`Set scrollTop to ${scrollPosition}px`);
        
        // Verify the scroll position was set
        console.log(`Current scrollTop after setting: ${scheduleBodyRef.current.scrollTop}px`);
        
        // Double-check with a short delay to ensure the scroll worked
        setTimeout(() => {
          if (scheduleBodyRef.current) {
            if (Math.abs(scheduleBodyRef.current.scrollTop - scrollPosition) > 10) {
              console.warn(`Scroll verification failed: expected ${scrollPosition}px, got ${scheduleBodyRef.current.scrollTop}px`);
              // Try one more time with a different approach
              scheduleBodyRef.current.scrollTo({
                top: scrollPosition,
                behavior: 'auto'
              });
              console.log(`Attempted fallback scroll to ${scrollPosition}px`);
            } else {
              console.log(`Scroll verified: at position ${scheduleBodyRef.current.scrollTop}px`);
            }
          }
          
          // Mark as scrolled regardless - we don't want to keep retrying indefinitely
          setHasScrolledToSixAM(true);
        }, 50);
      };
      
      // Use a more substantial delay to ensure DOM is fully ready
      const timeoutId = setTimeout(scrollToSixAM, 500); 
      
      return () => clearTimeout(timeoutId);
    }
  }, [scheduleDay.timeSlots, hasScrolledToSixAM]);
  
  // As a backup method, use useLayoutEffect to scroll when component layout is calculated
  useLayoutEffect(() => {
    if (initialRenderRef.current && 
        !hasScrolledToSixAM && 
        scheduleBodyRef.current && 
        scheduleDay.timeSlots.length > 0) {
      
      const sixAMIndex = scheduleDay.timeSlots.findIndex(slot => slot.time === "06:00");
      if (sixAMIndex !== -1) {
        const rowHeight = 42;
        const scrollPosition = sixAMIndex * rowHeight;
        
        console.log(`Layout Effect: Scrolling to 6AM position (${scrollPosition}px)`);
        scheduleBodyRef.current.scrollTop = scrollPosition;
        
        setHasScrolledToSixAM(true);
        initialRenderRef.current = false;
      }
    }
  }, [scheduleDay.timeSlots, hasScrolledToSixAM]);

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

    // Initialize all time slots for all drivers
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

  return (
    <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden">
      <DateNavigator 
        formattedDate={formattedDate}
        onPrevButtonClick={handlePrevButtonClick}
        onNextButtonClick={handleNextButtonClick}
        isNavigating={isNavigating}
      />

      <div className="flex-grow overflow-auto">
        <div className="schedule-container relative">
          <div className="sticky top-0 z-20 bg-white">
            <ScheduleHeader availableDrivers={availableDrivers} />
          </div>

          <div className="schedule-body" ref={scheduleBodyRef}>
            {scheduleDay.timeSlots.map((timeSlot, index) => (
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
