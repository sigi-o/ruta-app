
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, AlertCircle, CheckCircle2, FileCheck, FileWarning } from "lucide-react";
import { useSchedule } from '@/context/ScheduleContext';
import { useToast } from '@/hooks/use-toast';
import { format, parse } from 'date-fns';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParseResult {
  data: any[];
  reportDate: string | null;
  errors: { row: number; message: string }[];
}

const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { importCsvData } = useSchedule();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsVerified(false);
      setParseResult(null);
    }
  };

  const extractReportDate = (headerLine: string): string | null => {
    const dateMatch = headerLine.match(/Dispatch Report - (\d{1,2}\/\d{1,2}\/\d{4})/i);
    
    if (dateMatch && dateMatch[1]) {
      try {
        // Parse the date from MM/DD/YYYY format
        const parsedDate = parse(dateMatch[1], 'MM/dd/yyyy', new Date());
        // Format it as YYYY-MM-DD for our system
        return format(parsedDate, 'yyyy-MM-dd');
      } catch (error) {
        console.error("Error parsing report date:", error);
        return null;
      }
    }
    return null;
  };
  
  // Improved CSV parsing function to handle quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let insideQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    result.push(currentValue);
    
    return result;
  };
  
  // Helper function to clean strings from CSV (remove quotes and trim)
  const cleanString = (str: string): string => {
    if (!str) return '';
    // Remove surrounding quotes and trim whitespace
    return str.replace(/^["']|["']$/g, '').trim();
  };
  
  // Helper function to convert time format from "11:30 am" to "11:30"
  const convertTimeFormat = (timeStr: string): string => {
    if (!timeStr) return '12:00'; // Default time
    
    try {
      // Clean the string first
      const cleanTimeStr = cleanString(timeStr);
      
      // Parse using date-fns (handle "11:30 am" format)
      const parsedTime = parse(cleanTimeStr, 'hh:mm a', new Date());
      if (!isNaN(parsedTime.getTime())) {
        return format(parsedTime, 'HH:mm');
      }
      
      // If simple parsing failed, try more manual approach
      const timeRegex = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
      const match = cleanTimeStr.match(timeRegex);
      
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const period = match[3]?.toLowerCase();
        
        // Convert to 24-hour format
        if (period === 'pm' && hours < 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      
      // Additional handling for "11:30" format without am/pm
      if (cleanTimeStr.match(/^\d{1,2}:\d{2}$/)) {
        return cleanTimeStr.padStart(5, '0');
      }
      
      // Just numbers without separators (e.g. "1130")
      if (cleanTimeStr.match(/^\d{3,4}$/)) {
        let hours = parseInt(cleanTimeStr.substring(0, cleanTimeStr.length - 2));
        const minutes = parseInt(cleanTimeStr.substring(cleanTimeStr.length - 2));
        if (hours > 12) hours = 12;
        if (minutes > 59) minutes = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      
      console.warn("Could not parse time format:", timeStr);
      return '12:00'; // Default time
    } catch (error) {
      console.error("Time parsing error:", error, "for input:", timeStr);
      return '12:00'; // Default time
    }
  };

  // Helper to extract address components and handle suite numbers
  const processAddressAndPhone = (address: string, phone: string): { address: string, phone: string } => {
    // If phone looks like a suite number, append it to address
    if (phone && phone.toLowerCase().includes('suite') || phone.toLowerCase().includes('unit') || 
        phone.match(/^#\d+/) || phone.match(/^\d+[a-z]?$/i)) {
      return {
        address: `${address}${address ? ', ' : ''}${phone}`,
        phone: ''
      };
    }
    
    // Clean up phone number to only include digits, parentheses, hyphens and spaces
    let cleanedPhone = '';
    if (phone) {
      cleanedPhone = phone.replace(/[^\d\s\(\)\-\+\.]/g, '').trim();
      // If the cleaned value is too short, it's probably not a phone number
      if (cleanedPhone.replace(/[^\d]/g, '').length < 7) {
        cleanedPhone = '';
      }
    }
    
    return { address, phone: cleanedPhone };
  };

  const parseDispatchReport = (csvText: string): ParseResult => {
    const lines = csvText.split('\n');
    const result: ParseResult = {
      data: [],
      reportDate: null,
      errors: []
    };
    
    // Try to extract report date from the first line
    if (lines.length > 0) {
      result.reportDate = extractReportDate(lines[0]);
      if (!result.reportDate) {
        console.warn("Could not extract report date from header:", lines[0]);
        // Use today's date as fallback
        result.reportDate = format(new Date(), 'yyyy-MM-dd');
      }
    }
    
    // Skip the header rows (1-3)
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        // Parse the CSV line more robustly to handle quoted fields
        const columns = parseCSVLine(line);
        
        // Check if we have enough columns
        if (columns.length < 14) {
          result.errors.push({ row: i + 1, message: `Insufficient columns (found ${columns.length}, need at least 14)` });
          continue;
        }
        
        // Map columns to our data model
        const deliveryTime = convertTimeFormat(columns[1] || ''); // Column B
        const clientName = cleanString(columns[5] || '');   // Column F
        const businessName = cleanString(columns[6] || ''); // Column G
        const rawAddress = cleanString(columns[10] || '');  // Column K
        const rawContactPhone = cleanString(columns[11] || ''); // Column L
        const specialInstructions = cleanString(columns[13] || ''); // Column N
        
        // Process address and phone intelligently
        const { address, phone } = processAddressAndPhone(rawAddress, rawContactPhone);
        
        // Skip rows without critical data
        if (!businessName && !address) {
          result.errors.push({ row: i + 1, message: "Missing critical data (business name and address both empty)" });
          continue;
        }
        
        // Create the data object
        const deliveryData = {
          businessName: businessName || 'Unknown Business',
          clientName: clientName || '',
          address: address || 'No Address Provided',
          deliveryTime: deliveryTime,
          deliveryDate: result.reportDate,
          contactPhone: phone || '',
          specialInstructions: specialInstructions || '',
          stopType: 'delivery' as const
        };
        
        result.data.push(deliveryData);
      } catch (error) {
        console.error(`Error parsing row ${i + 1}:`, error, "Line:", lines[i]);
        result.errors.push({ row: i + 1, message: `Failed to parse row: ${error}` });
      }
    }
    
    return result;
  };

  const verifyFile = () => {
    if (!file) return;
    
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseDispatchReport(text);
        
        setParseResult(result);
        setIsVerified(result.data.length > 0);
        
        if (result.data.length > 0) {
          console.log("Sample parsed data:", result.data[0]);
          toast({
            title: "CSV Verified",
            description: `${result.data.length} deliveries found in the dispatch report${
              result.reportDate ? ` dated ${result.reportDate}` : ''
            }.${
              result.errors.length > 0 ? ` (${result.errors.length} rows had errors)` : ''
            }`,
          });
        } else {
          toast({
            title: "No Deliveries Found",
            description: "The file didn't contain any valid delivery data.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error parsing CSV", error);
        toast({
          title: "CSV Parse Error",
          description: "The file could not be parsed. Please check the format.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "File Read Error",
        description: "There was an error reading the file.",
        variant: "destructive",
      });
      setIsLoading(false);
    };
    
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parseResult || !isVerified) return;
    
    importCsvData(parseResult.data);
    toast({
      title: "Import Successful",
      description: `${parseResult.data.length} deliveries have been imported to your schedule.`,
    });
    onClose();
    setFile(null);
    setParseResult(null);
    setIsVerified(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-blue-600">Import Dispatch Report</DialogTitle>
          <DialogDescription>
            Upload a CSV dispatch report to import deliveries into the schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label 
              htmlFor="csv-upload" 
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-blue-300"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-2 text-blue-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">Dispatch report CSV files only</p>
              </div>
              <input 
                id="csv-upload" 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleFileChange} 
              />
            </label>
          </div>

          {file && (
            <div className="p-3 bg-blue-50 rounded-md text-sm">
              <div className="flex items-center">
                {isVerified ? (
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mr-2" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-blue-500 mr-2" />
                )}
                <span className="font-medium">{file.name}</span>
              </div>
              {parseResult && (
                <div className="mt-1 text-xs text-gray-600">
                  {parseResult.data.length} deliveries found
                  {parseResult.reportDate && (
                    <span className="ml-1">from {parseResult.reportDate}</span>
                  )}
                </div>
              )}
              {parseResult && parseResult.errors.length > 0 && (
                <div className="mt-1 flex items-center text-xs text-amber-600">
                  <FileWarning className="h-3 w-3 mr-1" />
                  {parseResult.errors.length} rows had parsing errors
                </div>
              )}
            </div>
          )}
          
          {file && !isVerified && (
            <Button 
              onClick={verifyFile} 
              disabled={!file || isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <FileCheck className="h-4 w-4 mr-2" />
              {isLoading ? "Analyzing Report..." : "Analyze Dispatch Report"}
            </Button>
          )}
        </div>

        <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {isVerified && (
            <Button 
              onClick={handleImport} 
              disabled={!isVerified} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Import {parseResult?.data.length} Deliveries
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportModal;
