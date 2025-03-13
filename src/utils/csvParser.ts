import { format, parse } from 'date-fns';
import { ParsedCsvData, CsvParseError, CsvParseWarning } from '@/types';

/**
 * Parses a CSV file containing dispatch report data
 * @param fileContent The content of the CSV file as a string
 * @returns Parsed data, including deliveries, errors, and warnings
 */
export function parseDispatchCsv(fileContent: string): ParsedCsvData {
  const lines = fileContent.split('\n');
  
  if (lines.length < 4) {
    return {
      reportDate: null,
      deliveries: [],
      totalRows: 0,
      successfulRows: 0,
      errors: [{
        row: 0,
        message: "CSV file does not contain enough rows. Expected at least 4 rows."
      }],
      warnings: []
    };
  }

  // Extract report date from header (Row 1, Column A)
  const reportDate = extractReportDate(lines[0]);
  
  const deliveries: Record<string, string>[] = [];
  const errors: CsvParseError[] = [];
  const warnings: CsvParseWarning[] = [];
  
  // Process each delivery row (starting at row 4, index 3)
  for (let i = 3; i < lines.length; i++) {
    const lineNumber = i + 1; // For human-readable error reporting
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    try {
      // Parse the CSV line handling quoted values properly
      const values = parseCSVLine(line);
      
      if (values.length < 14) {
        errors.push({
          row: lineNumber,
          message: `Not enough columns. Found ${values.length}, expected at least 14.`
        });
        continue;
      }
      
      // Map columns to fields according to specification
      // B (index 1): Delivery Time
      // F (index 5): Client Name
      // G (index 6): Business Name
      // K (index 10): Address
      // L (index 11): Phone Number
      // N (index 13): Notes
      
      // Process and validate delivery time
      const rawTime = values[1];
      const deliveryTime = convertTimeFormat(rawTime);
      
      if (deliveryTime === '12:00' && rawTime.trim() !== '12:00') {
        warnings.push({
          row: lineNumber,
          field: 'deliveryTime',
          message: 'Delivery time format could not be parsed correctly',
          originalValue: rawTime,
          correctedValue: '12:00'
        });
      }
      
      // Process client name (optional)
      const clientName = cleanString(values[5]);
      
      // Process business name (required)
      let businessName = cleanString(values[6]);
      
      if (!businessName) {
        businessName = "Unnamed Business";
        warnings.push({
          row: lineNumber,
          field: 'businessName',
          message: 'Missing business name',
          correctedValue: businessName
        });
      }
      
      // Process address and phone
      const { address, phone, phoneWarnings } = processAddressAndPhone(values[10], values[11], lineNumber);
      
      // Add any phone processing warnings
      warnings.push(...phoneWarnings);
      
      if (!address) {
        errors.push({
          row: lineNumber,
          field: 'address',
          message: 'Missing required address'
        });
        continue;
      }
      
      // Process notes (optional)
      const notes = cleanString(values[13]);
      
      // Create delivery record
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
      console.error(`Error parsing row ${lineNumber}:`, error);
      errors.push({
        row: lineNumber,
        message: (error as Error).message
      });
    }
  }
  
  return {
    reportDate,
    deliveries,
    totalRows: lines.length - 3, // Exclude header rows
    successfulRows: deliveries.length,
    errors,
    warnings
  };
}

/**
 * Extracts report date from the header line
 * @param headerLine First line of the CSV
 * @returns Formatted date string or null if not found
 */
export function extractReportDate(headerLine: string): string | null {
  // Try exact format first
  const exactDateMatch = headerLine.match(/Dispatch Report - (\d{1,2}\/\d{1,2}\/\d{4})/i);
  
  if (exactDateMatch && exactDateMatch[1]) {
    try {
      // Parse MM/DD/YYYY format
      const dateParts = exactDateMatch[1].split('/');
      const month = parseInt(dateParts[0], 10);
      const day = parseInt(dateParts[1], 10);
      const year = parseInt(dateParts[2], 10);
      
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } catch (e) {
      console.error("Error parsing date from header:", e);
    }
  }
  
  // Try to find any date pattern
  const anyDateMatch = headerLine.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (anyDateMatch && anyDateMatch[1]) {
    try {
      const date = parse(anyDateMatch[1], 'MM/dd/yyyy', new Date());
      return format(date, 'yyyy-MM-dd');
    } catch (e) {
      console.error("Error parsing date from header with alternate method:", e);
    }
  }
  
  // If no date found, return today's date
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Safely parses a CSV line, accounting for quoted values
 * @param line Raw CSV line
 * @returns Array of values from the line
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(currentValue.trim());
      currentValue = '';
    } else {
      // Add character to current field
      currentValue += char;
    }
  }
  
  // Add the last value
  result.push(currentValue.trim());
  
  return result;
}

/**
 * Cleans string values (removes quotes, trims whitespace)
 */
export function cleanString(value: string): string {
  if (!value) return '';
  
  // Remove double quotes at beginning and end
  let cleaned = value.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  
  return cleaned.trim();
}

/**
 * Processes and validates address and phone data
 */
export function processAddressAndPhone(
  addressRaw: string, 
  phoneRaw: string, 
  rowNumber: number
): { 
  address: string, 
  phone: string, 
  phoneWarnings: CsvParseWarning[] 
} {
  const phoneWarnings: CsvParseWarning[] = [];
  let address = cleanString(addressRaw);
  let phone = cleanString(phoneRaw);
  
  // Check if phone field might contain address component
  if (phone && !address.includes(phone) && !isPhoneNumber(phone)) {
    address = `${address}, ${phone}`.trim();
    phone = '';
    
    phoneWarnings.push({
      row: rowNumber,
      field: 'phone',
      message: 'Phone field appears to contain address data, moved to address field',
      originalValue: phoneRaw,
      correctedValue: ''
    });
  }
  
  // Check if address field has a phone number at the end
  const phoneRegex = /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\d{10})$/;
  const phoneMatch = address.match(phoneRegex);
  
  if (phoneMatch && !phone) {
    phone = phoneMatch[0];
    address = address.replace(phoneRegex, '').trim();
    
    // Clean up any trailing commas, spaces or dashes
    address = address.replace(/[,\s-]+$/, '').trim();
    
    phoneWarnings.push({
      row: rowNumber,
      field: 'address',
      message: 'Found phone number in address field, moved to phone field',
      originalValue: addressRaw,
      correctedValue: address
    });
  }
  
  // Process phone numbers
  if (phone) {
    const originalPhone = phone;
    
    // Handle multiple phone format: "P: xxx / M: xxx"
    if (phone.includes('/')) {
      const phoneParts = phone.split('/');
      
      // Just take the first phone number
      phone = phoneParts[0].trim();
      
      phoneWarnings.push({
        row: rowNumber,
        field: 'phone',
        message: 'Multiple phone numbers detected, using only the first one',
        originalValue: originalPhone,
        correctedValue: phone
      });
    }
    
    // Clean phone format
    if (phone.includes(':')) {
      // If contains label like "P:" or "M:"
      const parts = phone.split(':');
      const label = parts[0].trim().slice(-1); // last character of label
      const number = parts[1].trim();
      phone = `${label}:${cleanPhoneNumber(number)}`;
    } else {
      phone = cleanPhoneNumber(phone);
    }
  }
  
  // Clean up the address
  if (address) {
    // Standardize Canadian postal code format (if present)
    address = standardizeCanadianAddress(address);
    
    // Remove trailing punctuation
    address = address.replace(/[.,;]+$/, '').trim();
  }
  
  return { address, phone, phoneWarnings };
}

/**
 * Standardizes Canadian postal codes and addresses
 */
function standardizeCanadianAddress(address: string): string {
  // Canadian postal code pattern: A1A 1A1
  const postalCodeRegex = /([A-Za-z]\d[A-Za-z])\s*(\d[A-Za-z]\d)/g;
  
  // Standardize postal code format with a space
  address = address.replace(postalCodeRegex, (match, p1, p2) => {
    return `${p1.toUpperCase()} ${p2.toUpperCase()}`;
  });
  
  // Check if Toronto address missing ON province
  if (
    address.toLowerCase().includes('toronto') && 
    !address.match(/\b(ON|Ontario)\b/i)
  ) {
    address = `${address}, ON`;
  }
  
  return address;
}

/**
 * Strips non-numeric characters from phone numbers
 */
function cleanPhoneNumber(phone: string): string {
  // Keep only digits, plus signs (for country code), and x/ext for extensions
  const cleaned = phone.replace(/[^\d+x()\s]/g, '');
  
  // Handle extensions
  if (cleaned.toLowerCase().includes('x') || cleaned.toLowerCase().includes('ext')) {
    // Keep extension format
    return cleaned.trim();
  }
  
  // Format as standard 10-digit if possible
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  }
  
  // Return cleaned version
  return cleaned.trim();
}

/**
 * Checks if a string is likely a phone number
 */
export function isPhoneNumber(text: string): boolean {
  // Basic phone number pattern detection
  const phoneRegex = /^(\+\d{1,3}[- ]?)?\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/;
  const altPhoneRegex = /\b(p|m|phone|mobile|cell|fax|f):\s*[\d-()+ ]{10,}/i;
  
  return phoneRegex.test(text) || altPhoneRegex.test(text) || 
         text.replace(/\D/g, '').length >= 10;
}

/**
 * Converts various time formats to application's expected format (HH:MM)
 */
export function convertTimeFormat(timeStr: string): string {
  if (!timeStr) return '';

  let time = cleanString(timeStr);
  
  // Handle empty strings
  if (!time) return '12:00';
  
  // Already in HH:MM format
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    // Add leading zero if needed
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes}`;
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
        let mins = timeNum % 100;
        
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }
    }
    
    // Handle time in seconds or milliseconds since midnight
    if (/^\d+$/.test(time) && parseInt(time, 10) > 2400) {
      const seconds = parseInt(time, 10);
      if (seconds < 86400) { // Seconds in a day
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      } else if (seconds < 86400000) { // Milliseconds in a day
        const hours = Math.floor(seconds / 3600000);
        const mins = Math.floor((seconds % 3600000) / 60000);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }
    }
  } catch (e) {
    console.error("Error parsing time:", e);
  }
  
  // Default fallback time
  return '12:00';
}
