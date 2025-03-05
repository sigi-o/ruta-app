
import React, { useState, useEffect } from 'react';
import { ScheduleProvider } from '@/context/ScheduleContext';
import DriverPanel from '@/components/DriverPanel';
import ScheduleGrid from '@/components/ScheduleGrid';
import UnassignedStopsPanel from '@/components/UnassignedStopsPanel';
import CsvImportModal from '@/components/CsvImportModal';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parse } from 'date-fns';
import { CalendarIcon, Download, Upload, Printer, Save } from 'lucide-react';
import { useSchedule } from '@/context/ScheduleContext';

const ScheduleManager: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { autoAssignStops, saveSchedule, isLoading } = useSchedule();
  
  const handlePrint = () => {
    window.print();
  };

  // Convert date to string format for the grid
  const getFormattedDateString = () => {
    return format(date, 'yyyy-MM-dd');
  };

  // When the grid calls this function, we update the main date state
  const handleDateChange = (newDate: string) => {
    const parsedDate = new Date(newDate);
    setDate(parsedDate);
  };

  // When the calendar calls this function, we update the main date state
  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  useEffect(() => {
    // Add global styles for drag and drop
    const style = document.createElement('style');
    style.textContent = `
      .driver-cell {
        min-height: 40px;
        transition: background-color 0.2s;
        padding: 4px;
      }
      
      .driver-cell.drop-target {
        background-color: rgba(59, 130, 246, 0.1) !important;
        box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.5) !important;
      }
      
      .unassigned-stop {
        background-color: white;
        border: 1px solid #e5e7eb;
        border-left: 3px solid #3b82f6;
        border-radius: 0.375rem;
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        transition: all 0.2s;
      }
      
      .delivery-item {
        border-radius: 0.375rem;
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        transition: all 0.2s;
      }
      
      .schedule-container {
        width: 100%;
      }
      
      .time-header, .driver-header {
        padding: 0.5rem;
        background-color: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
        font-weight: 500;
      }
      
      .time-header {
        min-width: 80px;
        text-align: center;
      }
      
      .driver-header {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .driver-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 500;
      }
      
      .time-row {
        display: flex;
      }
      
      .time-label {
        min-width: 80px;
        padding: 0.5rem;
        background-color: #f9fafb;
        border-right: 1px solid #e5e7eb;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem;
      }
      
      .driver-cells {
        display: flex;
        flex: 1;
      }
      
      .driver-cell {
        flex: 1;
        border-right: 1px solid #e5e7eb;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .dragging {
        opacity: 0.5;
      }
      
      .hidden-stop {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
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
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleCalendarSelect}
                initialFocus
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

      {/* Main Content - 3 Panel Layout */}
      <div className="flex-grow flex p-4 gap-4 overflow-hidden print:overflow-visible">
        {/* Left Panel - Drivers */}
        <div className="w-1/5 bg-white rounded-lg shadow-sm overflow-hidden print:hidden">
          <DriverPanel />
        </div>
        
        {/* Center Panel - Schedule Grid */}
        <div className="w-3/5 bg-white rounded-lg shadow-sm overflow-hidden">
          <ScheduleGrid 
            selectedDate={getFormattedDateString()} 
            onDateChange={handleDateChange}
          />
        </div>
        
        {/* Right Panel - Unassigned Stops */}
        <div className="w-1/5 bg-white rounded-lg shadow-sm overflow-hidden print:hidden">
          <UnassignedStopsPanel />
        </div>
      </div>
      
      {/* Import Modal */}
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
