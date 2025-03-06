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
  
  useEffect(() => {
    if (selectedDate) {
      try {
        const parsedDate = new Date(selectedDate);
        if (!isNaN(parsedDate.getTime())) {
          setDate(parsedDate);
          console.log(`Index synchronized with context date: ${selectedDate}`);
        }
      } catch (error) {
        console.error("Error synchronizing with context date:", error);
      }
    }
  }, []);
  
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
    console.log(`Index received new date from ScheduleGrid: ${newDateString}`);
    
    try {
      const parsedDate = new Date(newDateString);
      
      if (isNaN(parsedDate.getTime())) {
        console.error("Received invalid date string:", newDateString);
        return;
      }
      
      setDate(parsedDate);
      
      console.log(`Updating context with date from ScheduleGrid: ${newDateString}`);
      setSelectedDate(newDateString);
    } catch (error) {
      console.error("Error processing date change:", error);
    }
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      setDate(selectedDate);
      
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      console.log(`Calendar selected new date: ${dateString}`);
      
      setSelectedDate(dateString);
    } else {
      console.error("Invalid date selected from calendar");
    }
  };

  useEffect(() => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    console.log("Current date state in Index:", formattedDate);
    
    if (formattedDate !== selectedDate) {
      console.log(`Syncing context date (${selectedDate}) with local state (${formattedDate})`);
      setSelectedDate(formattedDate);
    }
  }, [date, selectedDate, setSelectedDate]);

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
