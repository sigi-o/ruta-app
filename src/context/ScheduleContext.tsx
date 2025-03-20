
// This file is kept to maintain backward compatibility
// It re-exports everything from the new modular files

import { ScheduleProvider } from './schedule/ScheduleContext';
import { useSchedule } from '../hooks/useSchedule';
import { editStopEventChannel } from './schedule/eventChannel';
import { ScheduleContextType } from './schedule/types';

// Re-export everything
export { ScheduleProvider, useSchedule, editStopEventChannel };
export type { ScheduleContextType };
