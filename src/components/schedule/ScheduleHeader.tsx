
import React from 'react';
import { Driver } from '@/types';
import TimeHeader from './TimeHeader';
import DriverHeader from './DriverHeader';

interface ScheduleHeaderProps {
  availableDrivers: Driver[];
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({ availableDrivers }) => {
  return (
    <div className="schedule-header sticky top-0 z-10 flex">
      <TimeHeader />
      {availableDrivers.map(driver => (
        <DriverHeader key={driver.id} driver={driver} />
      ))}
    </div>
  );
};

export default ScheduleHeader;
