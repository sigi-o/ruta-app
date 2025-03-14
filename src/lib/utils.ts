import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TimeSlot } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number = 15): TimeSlot[] {
  const timeSlots: TimeSlot[] = [];
  
  const startHour = parseInt(startTime.split(':')[0]);
  const startMinute = parseInt(startTime.split(':')[1]);
  
  const endHour = parseInt(endTime.split(':')[0]);
  const endMinute = parseInt(endTime.split(':')[1]);
  
  console.log(`Generating time slots from ${startTime} to ${endTime} with ${intervalMinutes} minute intervals`);
  
  let currentHour = startHour;
  let currentMinute = startMinute;
  
  while (
    currentHour < endHour || 
    (currentHour === endHour && currentMinute <= endMinute)
  ) {
    const formattedHour = currentHour.toString().padStart(2, '0');
    const formattedMinute = currentMinute.toString().padStart(2, '0');
    
    const timeString = `${formattedHour}:${formattedMinute}`;
    
    // Format for display (12-hour format with AM/PM)
    const displayHour = currentHour % 12 || 12;
    const amPm = currentHour < 12 ? 'AM' : 'PM';
    const displayTime = `${displayHour}:${formattedMinute} ${amPm}`;
    
    timeSlots.push({
      time: timeString,
      label: displayTime,
    });
    
    // Increment time
    currentMinute += intervalMinutes;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute %= 60;
    }
  }
  
  console.log(`Generated ${timeSlots.length} time slots. First: ${timeSlots[0]?.time}, Last: ${timeSlots[timeSlots.length - 1]?.time}`);
  console.log(`First label: ${timeSlots[0]?.label}, Last label: ${timeSlots[timeSlots.length - 1]?.label}`);
  
  return timeSlots;
}

export const getAvatarColorFromName = (name: string): string => {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#6366F1', // Indigo
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#14B8A6', // Teal
    '#F43F5E', // Rose
  ];
  
  // Simple hash function to get a consistent color for a name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const printSchedule = (): void => {
  window.print();
};

export const formatTo12Hour = (time24: string): string => {
  if (!time24 || !time24.includes(':')) return time24;
  
  const [hourStr, minuteStr] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  const displayHour = hour % 12 || 12;
  const amPm = hour < 12 ? 'AM' : 'PM';
  return `${displayHour}:${minuteStr} ${amPm}`;
};
