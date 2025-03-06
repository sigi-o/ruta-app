
import React from 'react';
import { Driver } from '@/types';

interface DriverHeaderProps {
  driver: Driver;
}

const DriverHeader: React.FC<DriverHeaderProps> = ({ driver }) => {
  return (
    <div 
      key={driver.id}
      className="driver-header"
      style={{ borderLeft: `4px solid ${driver.color}` }}
    >
      <div className="driver-avatar mr-2" style={{ backgroundColor: driver.color }}>
        {driver.name.charAt(0)}
      </div>
      <span>{driver.name}</span>
    </div>
  );
};

export default DriverHeader;
