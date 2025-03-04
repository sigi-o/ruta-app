
import React, { useState } from 'react';
import { ScheduleProvider } from '@/context/ScheduleContext';
import DriverPanel from '@/components/DriverPanel';
import ScheduleGrid from '@/components/ScheduleGrid';
import UnassignedStopsPanel from '@/components/UnassignedStopsPanel';
import CsvImportModal from '@/components/CsvImportModal';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Download, Upload, Printer, Shuffle, Save } from 'lucide-react';
import { useSchedule } from '@/context/ScheduleContext';

const ScheduleManager: React.FC = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { autoAssignStops, saveSchedule, isLoading } = useSchedule();
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-blue-600 p-4 text-white flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Catering Flow Manager</h1>
          <p className="text-white/80">Streamlined delivery scheduling</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal bg-white/10 hover:bg-white/20 border-white/20 text-white"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20 hover:text-white"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" /> Import CSV
            </Button>
            
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20 hover:text-white"
              onClick={saveSchedule}
            >
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
            
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20 hover:text-white"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
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
          <ScheduleGrid selectedDate={date.toISOString().split('T')[0]} />
        </div>
        
        {/* Right Panel - Unassigned Stops */}
        <div className="w-1/5 bg-white rounded-lg shadow-sm overflow-hidden print:hidden">
          <UnassignedStopsPanel />
        </div>
      </div>
      
      {/* Remove the bottom action bar */}
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
