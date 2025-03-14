
import React from 'react';
import { DeliveryStop } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import UnassignedStopCard from './UnassignedStopCard';
import EmptyStopsList from './EmptyStopsList';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UnassignedStopsListProps {
  stops: DeliveryStop[];
  currentDateString: string;
  draggingStop: string | null;
  onDragStart: (e: React.DragEvent, stop: DeliveryStop) => void;
  onDragEnd: () => void;
  onEdit: (stop: DeliveryStop) => void;
  onDelete: (stopId: string, e?: React.MouseEvent) => void;
  onDuplicate: (stopId: string) => void;
  onAddNewStop: () => void;
}

const UnassignedStopsList: React.FC<UnassignedStopsListProps> = ({
  stops,
  currentDateString,
  draggingStop,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onDuplicate,
  onAddNewStop
}) => {
  return (
    <>
      <ScrollArea className="flex-grow px-4 py-2">
        {stops.length === 0 ? (
          <EmptyStopsList />
        ) : (
          <div className="space-y-3 animate-entrance">
            {stops.map((stop) => (
              <UnassignedStopCard
                key={stop.id}
                stop={stop}
                currentDateString={currentDateString}
                draggingStop={draggingStop}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
              />
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="p-4 mt-auto border-t">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700"
          variant="default"
          onClick={onAddNewStop}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Stop
        </Button>
      </div>
    </>
  );
};

export default UnassignedStopsList;
