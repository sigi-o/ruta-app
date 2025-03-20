
import { useContext } from 'react';
import { ScheduleContext } from '@/context/schedule/ScheduleContext';
import { ScheduleContextType } from '@/context/schedule/types';

export const useSchedule = (): ScheduleContextType => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};
