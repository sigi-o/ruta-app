
import React from 'react';

const TimeHeader: React.FC = () => {
  return (
    <div className="time-header sticky left-0 bg-white z-30 min-w-[80px] w-[80px] flex items-center justify-center p-2 text-xs font-bold text-gray-700 border-r border-b border-gray-200">
      <div>Time</div>
    </div>
  );
};

export default TimeHeader;
