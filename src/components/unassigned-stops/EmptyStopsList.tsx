
import React from 'react';
import { Package } from 'lucide-react';

const EmptyStopsList: React.FC = () => {
  return (
    <div className="text-center py-8 text-gray-500">
      <Package className="mx-auto h-10 w-10 opacity-30 mb-2" />
      <p>No unassigned stops</p>
      <p className="text-sm">All stops have been assigned to drivers</p>
    </div>
  );
};

export default EmptyStopsList;
