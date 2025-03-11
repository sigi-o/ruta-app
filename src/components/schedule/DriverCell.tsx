
import React from 'react';
import { DeliveryStop, Driver } from '@/types';
import StopItem from './StopItem';

interface DriverCellProps {
  driver: Driver;
  timeSlot: string;
  stops: DeliveryStop[];
  draggingStop: string | null;
  currentDateString: string;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, driverId: string, timeSlot: string) => void;
  onDragStart: (e: React.DragEvent, stopId: string) => void;
  onDragEnd: () => void;
  onStopClick: (stopId: string) => void;
}

const DriverCell: React.FC<DriverCellProps> = ({
  driver,
  timeSlot,
  stops,
  draggingStop,
  currentDateString,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onStopClick
}) => {
  // Temporarily add debugging to verify each driver cell renders for each time slot
  console.log(`Rendering driver cell for ${driver.name} at time slot ${timeSlot}`);

  return (
    <div
      className="driver-cell"
      data-driver-id={driver.id}
      data-time-slot={timeSlot}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, driver.id, timeSlot)}
    >
      {stops.map(stop => (
        <StopItem 
          key={stop.id}
          stop={stop}
          driverColor={driver.color}
          draggingStop={draggingStop}
          currentDateString={currentDateString}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={() => onStopClick(stop.id)}
        />
      ))}
    </div>
  );
};

export default DriverCell;
