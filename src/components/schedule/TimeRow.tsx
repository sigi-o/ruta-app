
import React from 'react';
import { Driver, DeliveryStop, TimeSlot } from '@/types';
import DriverCell from './DriverCell';

interface TimeRowProps {
  timeSlot: TimeSlot;
  availableDrivers: Driver[];
  stopsByDriverAndTime: Record<string, Record<string, DeliveryStop[]>>;
  draggingStop: string | null;
  currentDateString: string;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, driverId: string, timeSlot: string) => void;
  onDragStart: (e: React.DragEvent, stopId: string) => void;
  onDragEnd: () => void;
  onStopClick: (stopId: string) => void;
}

const TimeRow: React.FC<TimeRowProps> = ({
  timeSlot,
  availableDrivers,
  stopsByDriverAndTime,
  draggingStop,
  currentDateString,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onStopClick
}) => {
  return (
    <div className="time-row flex h-[100px]" data-time={timeSlot.time}>
      <div className="time-label sticky left-0 bg-white z-10 min-w-[80px] w-[80px] flex items-center justify-center text-xs font-medium text-gray-500 border-r border-b border-gray-200">
        {timeSlot.label}
      </div>
      
      <div className="driver-cells flex flex-1">
        {availableDrivers.map(driver => (
          <DriverCell
            key={`${driver.id}-${timeSlot.time}`}
            driver={driver}
            timeSlot={timeSlot.time}
            stops={stopsByDriverAndTime[driver.id][timeSlot.time] || []}
            draggingStop={draggingStop}
            currentDateString={currentDateString}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onStopClick={onStopClick}
          />
        ))}
      </div>
    </div>
  );
};

export default TimeRow;
