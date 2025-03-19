
import React from 'react';
import { DeliveryStop } from '@/types';
import { MapPin, Clock, AlertCircle, Package, ShoppingBag, GripHorizontal, Copy, Edit, Trash2, Calendar, Phone, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTo12Hour } from '@/lib/utils';

interface UnassignedStopCardProps {
  stop: DeliveryStop;
  currentDateString: string;
  draggingStop: string | null;
  onDragStart: (e: React.DragEvent, stop: DeliveryStop) => void;
  onDragEnd: () => void;
  onEdit: (stop: DeliveryStop) => void;
  onDelete: (stopId: string, e?: React.MouseEvent) => void;
  onDuplicate: (stopId: string) => void;
}

const UnassignedStopCard: React.FC<UnassignedStopCardProps> = ({
  stop,
  currentDateString,
  draggingStop,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onDuplicate
}) => {
  
  const getStopTypeIcon = (stopType: string) => {
    switch (stopType) {
      case 'delivery':
        return <Package className="h-3 w-3 mr-1" />;
      case 'pickup':
        return <ShoppingBag className="h-3 w-3 mr-1" />;
      case 'other':
      default:
        return <Package className="h-3 w-3 mr-1" />;
    }
  };

  return (
    <div
      key={stop.id}
      className={`unassigned-stop cursor-grab ${draggingStop === stop.id ? 'opacity-50' : ''}`}
      draggable="true"
      onDragStart={(e) => onDragStart(e, stop)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(stop)}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">{stop.businessName}</div>
          {stop.clientName && (
            <div className="text-sm text-gray-600">{stop.clientName}</div>
          )}
          {stop.orderId && (
            <div className="text-sm text-gray-600 flex items-center">
              <Hash className="h-3.5 w-3.5 mr-1" />
              Order ID: {stop.orderId}
            </div>
          )}
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <MapPin className="h-3.5 w-3.5 mr-1" />
            {stop.address}
          </div>
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            {stop.deliveryDate}
          </div>
          {stop.contactPhone && (
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Phone className="h-3.5 w-3.5 mr-1" />
              {stop.contactPhone}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <div 
            className="h-7 w-7 flex items-center justify-center text-gray-400 cursor-grab"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripHorizontal className="h-3.5 w-3.5" />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-blue-500"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(stop.id);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(stop);
            }}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-red-500"
            onClick={(e) => onDelete(stop.id, e)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-3">
        <div className="flex items-center text-xs font-medium">
          <Clock className="h-3.5 w-3.5 text-gray-500 mr-1" />
          {formatTo12Hour(stop.deliveryTime)}
        </div>
        
        <div className="flex items-center">
          <span 
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              stop.stopType === 'delivery' ? 'bg-blue-100 text-blue-800' :
              stop.stopType === 'pickup' ? 'bg-indigo-100 text-indigo-800' :
              'bg-gray-100 text-gray-800'
            }`}
          >
            {getStopTypeIcon(stop.stopType)}
            <span className="capitalize">{stop.stopType}</span>
          </span>
        </div>
      </div>
      
      {stop.specialInstructions && (
        <div className="mt-2 p-2 bg-blue-50 rounded-sm text-xs text-blue-800 flex items-start">
          <AlertCircle className="h-3.5 w-3.5 mr-1 mt-0.5 flex-shrink-0" />
          <span>{stop.specialInstructions}</span>
        </div>
      )}
    </div>
  );
};

export default UnassignedStopCard;
