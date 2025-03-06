
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateNavigatorProps {
  formattedDate: string;
  onPrevButtonClick: () => void;
  onNextButtonClick: () => void;
  isNavigating: boolean;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ 
  formattedDate, 
  onPrevButtonClick, 
  onNextButtonClick,
  isNavigating
}) => {
  return (
    <div className="card-header flex items-center justify-between p-4">
      <button 
        onClick={onPrevButtonClick}
        className="p-1 hover:bg-blue-50 rounded-full text-blue-600 pointer-events-auto"
        aria-label="Previous day"
        disabled={isNavigating}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      
      <h2 className="text-lg font-medium">{formattedDate}</h2>
      
      <button 
        onClick={onNextButtonClick}
        className="p-1 hover:bg-blue-50 rounded-full text-blue-600 pointer-events-auto"
        aria-label="Next day"
        disabled={isNavigating}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default DateNavigator;
