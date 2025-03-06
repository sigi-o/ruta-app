
import React from 'react';
import { DeliveryStop } from '@/types';
import { MapPin, Clock, AlertCircle, Package, ShoppingBag, GripHorizontal, Calendar } from 'lucide-react';

interface StopItemProps {
  stop: DeliveryStop;
  driverColor: string;
  draggingStop: string | null;
  currentDateString: string;
  onDragStart: (e: React.DragEvent, stopId: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

const StopItem: React.FC<StopItemProps> = ({
  stop,
  driverColor,
  draggingStop,
  currentDateString,
  onDragStart,
  onDragEnd,
  onClick
}) => {
  const formatTo12Hour = (time24: string): string => {
    const [hourStr, minuteStr] = time24.split(':');
    const hour = parseInt(hourStr, 10);
    const displayHour = hour % 12 || 12;
    const amPm = hour < 12 ? 'AM' : 'PM';
    return `${displayHour}:${minuteStr} ${amPm}`;
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

  return (
    <div
      className={`delivery-item cursor-pointer ${draggingStop === stop.id ? 'opacity-50' : ''} ${
        stop.deliveryDate !== currentDateString ? 'border-2 border-yellow-500' : ''
      }`}
      style={{ backgroundColor: `${driverColor}15`, borderLeft: `3px solid ${driverColor}` }}
      draggable="true"
      onDragStart={(e) => onDragStart(e, stop.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="font-medium text-gray-800">{stop.businessName || stop.clientName}</div>
        <div className="flex items-center text-xs gap-1">
          <div className="text-gray-500">
            <Clock className="h-3 w-3 inline mr-1" />
            {formatTo12Hour(stop.deliveryTime)}
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

      <div className="flex items-center text-xs text-gray-500 mt-1">
        <Calendar className="h-3 w-3 mr-1" />
        {stop.deliveryDate}
        {stop.deliveryDate !== currentDateString && (
          <span className="ml-1 text-yellow-600 font-medium">
            (Different date!)
          </span>
        )}
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
  );
};

export default StopItem;
