
import React from 'react';
import { Button } from '@/components/ui/button';
import { Shuffle } from 'lucide-react';

interface UnassignedStopsHeaderProps {
  title: string;
  count: number;
  onAutoAssign: () => void;
  isLoading: boolean;
}

const UnassignedStopsHeader: React.FC<UnassignedStopsHeaderProps> = ({ 
  title, 
  count, 
  onAutoAssign, 
  isLoading 
}) => {
  return (
    <>
      <div className="p-3 header-gradient rounded-t-lg flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-lg font-medium">{title}</h2>
          <div className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {count}
          </div>
        </div>
      </div>
      
      <div className="border-b border-blue-100 p-2 bg-blue-50/30">
        <Button 
          onClick={onAutoAssign}
          disabled={isLoading || count === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Shuffle className="h-3.5 w-3.5 mr-1.5" /> 
          {isLoading ? 'Assigning...' : 'Auto-Assign All Stops'}
        </Button>
      </div>
    </>
  );
};

export default UnassignedStopsHeader;
