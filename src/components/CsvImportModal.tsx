
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, AlertCircle, CheckCircle2, FileCheck } from "lucide-react";
import { useSchedule } from '@/context/ScheduleContext';
import { useToast } from '@/hooks/use-toast';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[] | null>(null);
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

  const verifyFile = () => {
    if (!file) return;
    
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        
        // Parse CSV
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',').map(value => value.trim());
          const entry: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            entry[header] = values[index] || '';
          });
          
          data.push(entry);
        }
        
        setCsvData(data);
        setIsVerified(true);
        toast({
          title: "CSV Verified",
          description: `${data.length} records found in the CSV file.`,
        });
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
    if (!csvData || !isVerified) return;
    
    importCsvData(csvData);
    onClose();
    setFile(null);
    setCsvData(null);
    setIsVerified(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-blue-600">Import Stops from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing delivery information to import into the schedule.
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
                  {csvData.length} records found
                </div>
              )}
            </div>
          )}
          
          {file && !isVerified && (
            <Button 
              onClick={verifyFile} 
              disabled={!file || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileCheck className="h-4 w-4 mr-2" />
              {isLoading ? "Verifying..." : "Verify CSV"}
            </Button>
          )}
        </div>

        <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {isVerified && (
            <Button onClick={handleImport} disabled={!isVerified} className="bg-blue-600 hover:bg-blue-700 text-white">
              Import Data
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportModal;
