
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, AlertCircle, CheckCircle2, FileCheck } from "lucide-react";
import { useSchedule } from '@/context/ScheduleContext';
import { useToast } from '@/hooks/use-toast';
import { parseDispatchCsv } from '@/utils/csvParser';
import { ParsedCsvData } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ParsedCsvData | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const { importCsvData } = useSchedule();
  const { errorToast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsVerified(false);
      setCsvData(null);
      setSuccessMessage(null);
      setWarningMessage(null);
    }
  };

  const verifyFile = () => {
    if (!file) return;
    
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsedData = parseDispatchCsv(text);
        
        setCsvData(parsedData);
        
        if (parsedData.deliveries.length > 0) {
          setIsVerified(true);
          setActiveTab("preview");
        } else {
          // Only show error if no deliveries were found
          errorToast({
            title: "CSV Import Error",
            description: "There was an error in your file, stops could not be uploaded.",
          });
          
          if (parsedData.errors.length > 0) {
            setActiveTab("errors");
          }
        }
        
      } catch (error) {
        console.error("Error parsing CSV", error);
        errorToast({
          title: "CSV Import Error",
          description: "There was an error in your file, stops could not be uploaded.",
        });
        setCsvData(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      errorToast({
        title: "CSV Import Error",
        description: "There was an error in your file, stops could not be uploaded.",
      });
      setIsLoading(false);
    };
    
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvData || !isVerified || csvData.deliveries.length === 0) return;
    
    console.log(`Importing ${csvData.deliveries.length} deliveries with date ${csvData.reportDate}`);
    
    importCsvData(csvData.deliveries);
    
    const importedDate = csvData.deliveries[0]?.deliveryDate;
    
    if (importedDate && importedDate !== csvData.reportDate) {
      setWarningMessage(`${csvData.deliveries.length} stops were imported for ${importedDate}. You are currently viewing ${csvData.reportDate}.`);
    } else {
      setSuccessMessage(`${csvData.deliveries.length} stops have been imported successfully.`);
    }
    
    onClose();
    setFile(null);
    setCsvData(null);
    setIsVerified(false);
  };

  const renderDataPreview = () => {
    if (!csvData || csvData.deliveries.length === 0) return null;
    
    const previewRecords = csvData.deliveries.slice(0, 3);
    
    return (
      <div className="mt-2 text-xs">
        <div className="font-semibold mb-1">Data Preview (first 3 records):</div>
        {csvData.reportDate && (
          <div className="text-sm text-blue-600 font-medium mb-2">
            Report Date: {csvData.reportDate}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 border">Business</th>
                <th className="p-2 border">Address</th>
                <th className="p-2 border">Time</th>
                <th className="p-2 border">Client</th>
              </tr>
            </thead>
            <tbody>
              {previewRecords.map((record, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-2 border">{record.businessName}</td>
                  <td className="p-2 border">{record.address}</td>
                  <td className="p-2 border">{record.deliveryTime}</td>
                  <td className="p-2 border">{record.clientName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {csvData.deliveries.length > 3 && (
          <div className="mt-1 text-right text-gray-500">
            ...and {csvData.deliveries.length - 3} more records
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
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
          
          {csvData && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="preview">
                  Data Preview
                </TabsTrigger>
                <TabsTrigger value="errors" disabled={csvData.errors.length === 0}>
                  Errors ({csvData.errors.length})
                </TabsTrigger>
                <TabsTrigger value="warnings" disabled={csvData.warnings.length === 0}>
                  Warnings ({csvData.warnings.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="preview" className="p-1">
                {renderDataPreview()}
              </TabsContent>
              
              <TabsContent value="errors">
                {csvData.errors.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto text-xs p-2 border border-red-200 rounded bg-red-50">
                    <ul className="list-disc pl-4">
                      {csvData.errors.map((error, index) => (
                        <li key={index} className="text-red-600 mb-1">
                          Row {error.row}: {error.message} 
                          {error.field ? ` (Field: ${error.field})` : ''}
                          {error.originalValue ? ` Original: "${error.originalValue}"` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-4 text-center text-green-600 bg-green-50 rounded">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-2" />
                    No errors found
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="warnings">
                {csvData.warnings.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto text-xs p-2 border border-amber-200 rounded bg-amber-50">
                    <ul className="list-disc pl-4">
                      {csvData.warnings.map((warning, index) => (
                        <li key={index} className="text-amber-600 mb-1">
                          Row {warning.row}: {warning.message}
                          {warning.field ? ` (Field: ${warning.field})` : ''}
                          {warning.correctedValue ? ` Corrected to: "${warning.correctedValue}"` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-4 text-center text-green-600 bg-green-50 rounded">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-2" />
                    No warnings found
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
