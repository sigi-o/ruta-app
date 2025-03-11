
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
    <div key={timeSlot.time} className="time-row" data-time={timeSlot.time}>
      <div className="time-label">
        {timeSlot.label}
      </div>
      
      <div className="driver-cells">
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
