
import React, { createContext, useContext, useState, useEffect } from 'react';
import { format, parse, isValid } from 'date-fns';

interface DateContextType {
  // Core date state
  currentDate: Date;
  currentDateString: string;
  
  // Date actions
  setCurrentDate: (date: Date) => void;
  goToNextDay: () => void;
  goToPreviousDay: () => void;
  
  // Date validation
  isDateValid: boolean;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const useDateSystem = () => {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error('useDateSystem must be used within a DateProvider');
  }
  return context;
};

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with today's date
  const [currentDate, setCurrentDateState] = useState<Date>(() => {
    const today = new Date();
    // Reset time to midnight for consistency
    today.setHours(0, 0, 0, 0);
    return today;
  });
  
  // Derived state
  const [currentDateString, setCurrentDateString] = useState<string>(
    format(currentDate, 'yyyy-MM-dd')
  );
  
  // Validation state
  const [isDateValid, setIsDateValid] = useState<boolean>(true);
  
  // Whenever the date object changes, update the string representation
  useEffect(() => {
    console.log("DateContext: Date object changed, updating string representation");
    if (!isValid(currentDate)) {
      console.error("DateContext: Invalid date detected");
      setIsDateValid(false);
      return;
    }
    
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    console.log(`DateContext: Setting date string to ${formattedDate}`);
    setCurrentDateString(formattedDate);
    setIsDateValid(true);
  }, [currentDate]);
  
  // Set date with validation
  const setCurrentDate = (date: Date) => {
    console.log(`DateContext: Setting new date: ${format(date, 'yyyy-MM-dd')}`);
    
    if (!isValid(date)) {
      console.error("DateContext: Attempted to set invalid date");
      setIsDateValid(false);
      return;
    }
    
    // Clone and normalize the date to avoid time-related issues
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    setCurrentDateState(normalizedDate);
  };
  
  // Navigate to next day
  const goToNextDay = () => {
    console.log("DateContext: Navigating to next day");
    setCurrentDateState(prevDate => {
      const nextDate = new Date(prevDate);
      nextDate.setDate(nextDate.getDate() + 1);
      return nextDate;
    });
  };
  
  // Navigate to previous day
  const goToPreviousDay = () => {
    console.log("DateContext: Navigating to previous day");
    setCurrentDateState(prevDate => {
      const prevDayDate = new Date(prevDate);
      prevDayDate.setDate(prevDayDate.getDate() - 1);
      return prevDayDate;
    });
  };
  
  return (
    <DateContext.Provider
      value={{
        currentDate,
        currentDateString,
        setCurrentDate,
        goToNextDay,
        goToPreviousDay,
        isDateValid
      }}
    >
      {children}
    </DateContext.Provider>
  );
};
