
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, AlertCircle, CheckCircle2, FileCheck, Info } from "lucide-react";
import { useSchedule } from '@/context/ScheduleContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedCsvData {
  reportDate: string | null;
  deliveries: Record<string, string>[];
  totalRows: number;
  successfulRows: number;
  errors: { row: number; message: string }[];
}

const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ParsedCsvData | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { importCsvData } = useSchedule();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsVerified(false);
      setCsvData(null);
    }
  };

  // Utility function to safely parse CSV lines with quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    result.push(currentValue.trim());
    
    return result;
  };

  // Clean string values (remove quotes, trim whitespace)
  const cleanString = (value: string): string => {
    if (!value) return '';
    
    // Remove double quotes at beginning and end
    let cleaned = value.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    
    return cleaned.trim();
  };

  // Convert various time formats to application's expected format (HH:MM)
  const convertTimeFormat = (timeStr: string): string => {
    if (!timeStr) return '';

    let time = cleanString(timeStr);
    
    // Handle empty strings
    if (!time) return '12:00';
    
    // Already in HH:MM format
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return time;
    }
    
    try {
      // Handle formats like "1:30 PM" or "1:30PM"
      const pmMatch = time.match(/(\d+):(\d+)\s*[pP][mM]/);
      const amMatch = time.match(/(\d+):(\d+)\s*[aA][mM]/);
      
      if (pmMatch) {
        let hours = parseInt(pmMatch[1], 10);
        const mins = parseInt(pmMatch[2], 10);
        
        if (hours < 12) hours += 12;
        
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      } else if (amMatch) {
        let hours = parseInt(amMatch[1], 10);
        const mins = parseInt(amMatch[2], 10);
        
        if (hours === 12) hours = 0;
        
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }
      
      // Handle numeric time (like 1430 for 2:30 PM)
      if (/^\d+$/.test(time)) {
        let timeNum = parseInt(time, 10);
        
        if (timeNum >= 0 && timeNum < 2400) {
          let hours = Math.floor(timeNum / 100);
          let minutes = timeNum % 100;
          
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
      
      // Handle time in seconds or milliseconds since midnight
      if (/^\d+$/.test(time) && parseInt(time, 10) > 2400) {
        const seconds = parseInt(time, 10);
        if (seconds < 86400) { // Seconds in a day
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else if (seconds < 86400000) { // Milliseconds in a day
          const hours = Math.floor(seconds / 3600000);
          const minutes = Math.floor((seconds % 3600000) / 60000);
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
      }
    } catch (e) {
      console.error("Error parsing time:", e);
    }
    
    // Default fallback time
    return '12:00';
  };

  // Process address and phone data to correctly separate them
  const processAddressAndPhone = (addressRaw: string, phoneRaw: string): { address: string, phone: string } => {
    let address = cleanString(addressRaw);
    let phone = cleanString(phoneRaw);
    
    // Check if phone field might actually contain an address component
    if (phone && !address.includes(phone) && !isPhoneNumber(phone)) {
      address = `${address}, ${phone}`.trim();
      phone = '';
    }
    
    // Check if address field has a phone number at the end
    const phoneRegex = /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\d{10})$/;
    const phoneMatch = address.match(phoneRegex);
    
    if (phoneMatch && !phone) {
      phone = phoneMatch[0];
      address = address.replace(phoneRegex, '').trim();
      // Clean up any trailing commas, spaces or dashes
      address = address.replace(/[,\s-]+$/, '').trim();
    }
    
    return { address, phone };
  };

  // Helper to check if a string is likely a phone number
  const isPhoneNumber = (text: string): boolean => {
    // Basic phone number pattern detection
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/;
    return phoneRegex.test(text);
  };

  // Extract report date from header
  const extractReportDate = (headerLine: string): string | null => {
    const dateMatch = headerLine.match(/Dispatch Report - (\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (dateMatch && dateMatch[1]) {
      try {
        // Parse and format the date to ensure consistent format
        const parts = dateMatch[1].split('/');
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      } catch (e) {
        console.error("Error parsing date:", e);
      }
    }
    
    // If no date found, return today's date
    return format(new Date(), 'yyyy-MM-dd');
  };

  const verifyFile = () => {
    if (!file) return;
    
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        if (lines.length < 4) {
          throw new Error("CSV file does not contain enough rows. Expected at least 4 rows.");
        }
        
        // Extract report date from first line (Column A)
        const reportDate = extractReportDate(lines[0]);
        
        // Start parsing from row 4 (index 3)
        const deliveries: Record<string, string>[] = [];
        const errors: { row: number; message: string }[] = [];
        
        for (let i = 3; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          try {
            // Parse the CSV line handling quoted values properly
            const values = parseCSVLine(line);
            
            if (values.length < 14) {
              throw new Error(`Row ${i + 1}: Not enough columns`);
            }
            
            // Map to expected columns:
            // B (index 1): Delivery Time
            // F (index 5): Client Name
            // G (index 6): Business Name
            // K (index 10): Address
            // L (index 11): Phone Number
            // N (index 13): Notes
            
            const deliveryTime = convertTimeFormat(values[1]);
            const clientName = cleanString(values[5]);
            const businessName = cleanString(values[6]) || "Unnamed Business";
            
            // Process address and phone number
            const { address, phone } = processAddressAndPhone(values[10], values[11]);
            const notes = cleanString(values[13]);
            
            if (!address) {
              throw new Error(`Row ${i + 1}: Missing required address`);
            }
            
            deliveries.push({
              businessName,
              clientName,
              address,
              contactPhone: phone,
              deliveryTime,
              deliveryDate: reportDate || format(new Date(), 'yyyy-MM-dd'),
              specialInstructions: notes,
              stopType: 'delivery'
            });
          } catch (error) {
            console.error(`Error parsing row ${i + 1}:`, error);
            errors.push({ row: i + 1, message: (error as Error).message });
          }
        }
        
        setCsvData({
          reportDate,
          deliveries,
          totalRows: lines.length - 3, // Exclude header rows
          successfulRows: deliveries.length,
          errors
        });
        
        setIsVerified(deliveries.length > 0);
        
        if (errors.length > 0) {
          toast({
            title: "CSV Verification Warning",
            description: `${deliveries.length} records found, with ${errors.length} errors.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "CSV Verified",
            description: `${deliveries.length} records found in the CSV file.`,
          });
        }
      } catch (error) {
        console.error("Error parsing CSV", error);
        toast({
          title: "CSV Parse Error",
          description: (error as Error).message || "The file could not be parsed. Please check the format.",
          variant: "destructive",
        });
        setCsvData(null);
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
    if (!csvData || !isVerified || csvData.deliveries.length === 0) return;
    
    importCsvData(csvData.deliveries);
    onClose();
    setFile(null);
    setCsvData(null);
    setIsVerified(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-blue-600">Import Dispatch Report</DialogTitle>
          <DialogDescription>
            Upload a dispatch report CSV file with delivery information to import into the schedule.
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
                <p className="text-xs text-gray-500">CSV files only</p>
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
              {csvData && (
                <div className="mt-1 text-xs text-gray-600">
                  {csvData.successfulRows} of {csvData.totalRows} records processed successfully
                  {csvData.reportDate && (
                    <div className="mt-1">
                      <span className="font-medium">Report Date:</span> {csvData.reportDate}
                    </div>
                  )}
                  {csvData.errors.length > 0 && (
                    <div className="mt-2 text-red-500">
                      <Info className="h-3 w-3 inline mr-1" />
                      {csvData.errors.length} error{csvData.errors.length > 1 ? 's' : ''} found
                    </div>
                  )}
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
              {isLoading ? "Verifying..." : "Verify CSV"}
            </Button>
          )}
          
          {csvData && csvData.errors.length > 0 && (
            <div className="max-h-32 overflow-y-auto text-xs p-2 border border-red-200 rounded bg-red-50">
              <p className="font-medium text-red-600 mb-1">Errors:</p>
              <ul className="list-disc pl-4">
                {csvData.errors.slice(0, 5).map((error, index) => (
                  <li key={index} className="text-red-600">
                    Row {error.row}: {error.message}
                  </li>
                ))}
                {csvData.errors.length > 5 && (
                  <li className="text-red-600 font-medium">
                    ...and {csvData.errors.length - 5} more errors
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {isVerified && (
            <Button 
              onClick={handleImport} 
              disabled={!isVerified || (csvData?.deliveries.length === 0)} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Import {csvData?.deliveries.length} Deliveries
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportModal;
