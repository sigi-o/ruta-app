import React, { useState, useEffect, useRef } from 'react';
import { ScheduleProvider } from '@/context/ScheduleContext';
import DriverPanel from '@/components/DriverPanel';
import ScheduleGrid from '@/components/ScheduleGrid';
import UnassignedStopsPanel from '@/components/UnassignedStopsPanel';
import CsvImportModal from '@/components/CsvImportModal';
import PrintableSchedule from '@/components/PrintableSchedule';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Download, Upload, Printer, Save } from 'lucide-react';
import { useSchedule } from '@/context/ScheduleContext';

const ScheduleManager: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintView, setIsPrintView] = useState(false);
  const { autoAssignStops, saveSchedule, isLoading, scheduleDay, setSelectedDate, selectedDate } = useSchedule();
  const printTimeoutRef = useRef<number | null>(null);
  const dateUpdateSourceRef = useRef<'calendar' | 'grid' | 'context' | null>(null);
  const isUpdatingDateRef = useRef<boolean>(false);
  const gridDateRef = useRef<string | null>(null);
  const calendarSyncTimeoutRef = useRef<number | null>(null);
  const syncAttemptCountRef = useRef<number>(0);
  const maxSyncAttempts = 3;
  const [uiLocked, setUiLocked] = useState(false);
  
  const validateDateSync = (dateStr: string) => {
    const calendarDateStr = format(date, 'yyyy-MM-dd');
    console.log(`Validating date sync: Calendar: ${calendarDateStr}, Grid: ${dateStr}`);
    
    if (calendarDateStr !== dateStr) {
      console.log(`Date sync validation failed: Calendar: ${calendarDateStr}, Grid: ${dateStr}`);
      
      syncAttemptCountRef.current += 1;
      console.log(`Sync attempt: ${syncAttemptCountRef.current} of ${maxSyncAttempts}`);
      
      if (syncAttemptCountRef.current > maxSyncAttempts) {
        console.error("Max sync attempts reached, UI will be locked");
        setUiLocked(true);
        // Force a hard reset by reloading both dates
        setTimeout(() => {
          const today = new Date();
          const todayStr = format(today, 'yyyy-MM-dd');
          console.log(`Forcing hard reset to today: ${todayStr}`);
          isUpdatingDateRef.current = true;
          setDate(today);
          setSelectedDate(todayStr);
          gridDateRef.current = todayStr;
          
          setTimeout(() => {
            isUpdatingDateRef.current = false;
            syncAttemptCountRef.current = 0;
            setUiLocked(false);
          }, 500);
        }, 300);
        return false;
      }
      
      // Force sync to ensure consistency
      if (calendarSyncTimeoutRef.current) {
        clearTimeout(calendarSyncTimeoutRef.current);
      }
      
      calendarSyncTimeoutRef.current = window.setTimeout(() => {
        console.log(`Forcing date sync from grid to calendar: ${dateStr}`);
        isUpdatingDateRef.current = true;
        dateUpdateSourceRef.current = 'grid';
        
        try {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            setDate(parsedDate);
            setSelectedDate(dateStr);
          }
        } catch (error) {
          console.error("Error during forced date sync:", error);
        }
        
        calendarSyncTimeoutRef.current = window.setTimeout(() => {
          isUpdatingDateRef.current = false;
        }, 200);
      }, 100);
      
      return false;
    }
    
    // Reset sync count on successful validation
    if (syncAttemptCountRef.current > 0) {
      console.log("Date sync restored, resetting attempt counter");
      syncAttemptCountRef.current = 0;
    }
    
    return true;
  };
  
  useEffect(() => {
    if (selectedDate && !isUpdatingDateRef.current) {
      try {
        const parsedDate = new Date(selectedDate);
        if (!isNaN(parsedDate.getTime())) {
          console.log(`Index: Initial sync with context date: ${selectedDate}`);
          dateUpdateSourceRef.current = 'context';
          setDate(parsedDate);
          gridDateRef.current = selectedDate;
        }
      } catch (error) {
        console.error("Error synchronizing with context date:", error);
      }
    }
    
    return () => {
      if (calendarSyncTimeoutRef.current) {
        clearTimeout(calendarSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (dateUpdateSourceRef.current !== 'context' && selectedDate && !isUpdatingDateRef.current) {
      try {
        const parsedDate = new Date(selectedDate);
        if (!isNaN(parsedDate.getTime()) && format(parsedDate, 'yyyy-MM-dd') !== format(date, 'yyyy-MM-dd')) {
          console.log(`Index: Syncing with context date change: ${selectedDate}`);
          isUpdatingDateRef.current = true;
          dateUpdateSourceRef.current = 'context';
          setDate(parsedDate);
          gridDateRef.current = selectedDate;
          
          setTimeout(() => {
            isUpdatingDateRef.current = false;
          }, 50);
        }
      } catch (error) {
        console.error("Error synchronizing with context date:", error);
      }
    }
  }, [selectedDate]);
  
  const handlePrint = () => {
    console.log("Print triggered, refreshing print view with current data");
    setIsPrintView(false);
    
    setTimeout(() => {
      setIsPrintView(true);
      
      printTimeoutRef.current = window.setTimeout(() => {
        window.print();
        printTimeoutRef.current = window.setTimeout(() => {
          setIsPrintView(false);
        }, 500);
      }, 300);
    }, 50);
  };

  useEffect(() => {
    return () => {
      if (printTimeoutRef.current) {
        clearTimeout(printTimeoutRef.current);
      }
    };
  }, []);

  const getFormattedDateString = () => {
    return format(date, 'yyyy-MM-dd');
  };

  const handleDateChange = (newDateString: string) => {
    console.log(`Index received new date from ScheduleGrid: ${newDateString}. Current source: ${dateUpdateSourceRef.current}`);
    
    if (isUpdatingDateRef.current) {
      console.log("Skipping date update - already updating");
      return;
    }
    
    if (uiLocked) {
      console.log("UI locked, ignoring date change request");
      return;
    }
    
    try {
      isUpdatingDateRef.current = true;
      dateUpdateSourceRef.current = 'grid';
      gridDateRef.current = newDateString;
      
      const parsedDate = new Date(newDateString);
      if (isNaN(parsedDate.getTime())) {
        console.error("Received invalid date string:", newDateString);
        isUpdatingDateRef.current = false;
        return;
      }
      
      setDate(parsedDate);
      
      console.log(`Updating context with date from ScheduleGrid: ${newDateString}`);
      setSelectedDate(newDateString);
      
      setTimeout(() => {
        isUpdatingDateRef.current = false;
      }, 200);
    } catch (error) {
      console.error("Error processing date change:", error);
      isUpdatingDateRef.current = false;
    }
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (isUpdatingDateRef.current) {
      console.log("Skipping calendar update - already updating");
      return;
    }
    
    if (uiLocked) {
      console.log("UI locked, ignoring calendar selection");
      return;
    }
    
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      console.log(`Calendar selected new date`);
      isUpdatingDateRef.current = true;
      dateUpdateSourceRef.current = 'calendar';
      
      setDate(selectedDate);
      
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      console.log(`Calendar selected new date: ${dateString}`);
      setSelectedDate(dateString);
      gridDateRef.current = dateString;
      
      setTimeout(() => {
        isUpdatingDateRef.current = false;
      }, 200);
    } else {
      console.error("Invalid date selected from calendar");
    }
  };

  useEffect(() => {
    if (!isUpdatingDateRef.current && dateUpdateSourceRef.current === 'calendar') {
      const formattedDate = format(date, 'yyyy-MM-dd');
      console.log(`Index: Date changed locally to ${formattedDate}`);
      
      if (formattedDate !== selectedDate) {
        console.log(`Index: Syncing context date (${selectedDate}) with local state (${formattedDate})`);
        setSelectedDate(formattedDate);
        gridDateRef.current = formattedDate;
      }
    }
  }, [date]);

  if (uiLocked) {
    return (
      <div className="flex flex-col h-screen">
        <header className="bg-white p-4 text-blue-600 flex items-center justify-between shadow-sm print:hidden">
          <div>
            <h1 className="text-2xl font-bold">Catering Flow Manager</h1>
            <p className="text-blue-500/80">Streamlined delivery scheduling</p>
          </div>
        </header>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center p-8 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-red-600 mb-4">Date Synchronization Error</h2>
            <p className="text-gray-600 mb-6">
              A critical date synchronization error occurred. The application is resetting to today's date to recover.
            </p>
            <p className="text-gray-500 mb-2">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isPrintView) {
    const currentDateString = getFormattedDateString();
    console.log(`Rendering print view for date: ${currentDateString}`);
    
    return (
      <div className="print-only">
        <PrintableSchedule 
          drivers={scheduleDay.drivers} 
          stops={scheduleDay.stops}
          selectedDate={currentDateString}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white p-4 text-blue-600 flex items-center justify-between shadow-sm print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Catering Flow Manager</h1>
          <p className="text-blue-500/80">Streamlined delivery scheduling</p>
        </div>
        
        <div className="flex-1 flex justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal border-blue-200 text-blue-600 hover:bg-blue-50/50"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleCalendarSelect}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" /> Import CSV
          </Button>
          
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700 font-semibold"
            onClick={saveSchedule}
          >
            <Save className="h-4 w-4 mr-2" /> Save
          </Button>
          
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700 font-semibold"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </header>

      <div className="flex-grow flex p-4 gap-4 overflow-hidden print:overflow-visible">
        <div className="w-1/5 bg-white rounded-lg shadow-sm overflow-hidden print:hidden">
          <DriverPanel />
        </div>
        
        <div className="w-3/5 bg-white rounded-lg shadow-sm overflow-hidden">
          <ScheduleGrid 
            selectedDate={getFormattedDateString()} 
            onDateChange={handleDateChange}
            validateDateSync={validateDateSync}
          />
        </div>
        
        <div className="w-1/5 bg-white rounded-lg shadow-sm overflow-hidden print:hidden">
          <UnassignedStopsPanel />
        </div>
      </div>
      
      {isImportModalOpen && (
        <CsvImportModal 
          isOpen={isImportModalOpen} 
          onClose={() => setIsImportModalOpen(false)} 
        />
      )}
    </div>
  );
};

const Index: React.FC = () => {
  return (
    <ScheduleProvider>
      <ScheduleManager />
    </ScheduleProvider>
  );
};

export default Index;
