
import React, { useState, useEffect, useRef } from 'react';
import { ScheduleProvider } from '@/context/ScheduleContext';
import { DateProvider, useDateSystem } from '@/context/DateContext';
import { useAuth } from '@/context/AuthContext';
import DriverPanel from '@/components/DriverPanel';
import ScheduleGrid from '@/components/ScheduleGrid';
import UnassignedStopsPanel from '@/components/UnassignedStopsPanel';
import CsvImportModal from '@/components/CsvImportModal';
import PrintableSchedule from '@/components/PrintableSchedule';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Upload, Printer, LogOut } from 'lucide-react';
import { useSchedule } from '@/context/ScheduleContext';

const ScheduleManager: React.FC = () => {
  const { currentDate, currentDateString, setCurrentDate, isDateValid } = useDateSystem();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintView, setIsPrintView] = useState(false);
  const { autoAssignStops, isLoading, scheduleDay } = useSchedule();
  const printTimeoutRef = useRef<number | null>(null);
  const { signOut, user } = useAuth();
  
  const handlePrint = () => {
    console.log(`Print triggered for date: ${currentDateString}`);
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

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      console.log(`Calendar selected new date: ${format(selectedDate, 'yyyy-MM-dd')}`);
      setCurrentDate(selectedDate);
    }
  };

  if (!isDateValid) {
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
                {format(currentDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="center">
              <Calendar
                mode="single"
                selected={currentDate}
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
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>

          <Button
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <div className="flex-grow flex p-4 gap-4 overflow-hidden print:overflow-visible">
        <div className="w-1/5 bg-white rounded-lg shadow-sm overflow-hidden print:hidden">
          <DriverPanel />
        </div>
        
        <div className="w-3/5 bg-white rounded-lg shadow-sm overflow-hidden">
          <ScheduleGrid />
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
    <DateProvider>
      <ScheduleProvider>
        <ScheduleManager />
      </ScheduleProvider>
    </DateProvider>
  );
};

export default Index;
