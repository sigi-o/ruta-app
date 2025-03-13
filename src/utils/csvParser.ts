
import { format, parse } from 'date-fns';
import { ParsedCsvData, CsvParseError, CsvParseWarning, CsvColumn } from '@/types';

// Define possible column mappings with alternative names
const COLUMN_DEFINITIONS: CsvColumn[] = [
  { 
    index: 1, 
    name: 'deliveryTime', 
    required: true,
    alternateNames: ['delivery time', 'time', 'delivery', 'schedule', 'scheduled time']
  },
  { 
    index: 5, 
    name: 'clientName', 
    required: false,
    alternateNames: ['client name', 'customer', 'customer name', 'contact', 'name']
  },
  { 
    index: 6, 
    name: 'businessName', 
    required: true,
    alternateNames: ['business name', 'business', 'company', 'company name', 'organization']
  },
  { 
    index: 10, 
    name: 'address', 
    required: true,
    alternateNames: ['delivery address', 'location', 'street', 'street address']
  },
  { 
    index: 11, 
    name: 'phone', 
    required: false,
    alternateNames: ['phone number', 'contact phone', 'telephone', 'cell', 'mobile']
  },
  { 
    index: 13, 
    name: 'notes', 
    required: false,
    alternateNames: ['special instructions', 'instructions', 'comments', 'additional info']
  },
  {
    index: 0,
    name: 'orderNumber',
    required: false,
    alternateNames: ['order number', 'order id', 'order #', 'id', 'reference']
  }
];

/**
 * Parses a CSV file containing dispatch report data with improved flexibility and error reporting
 * @param fileContent The content of the CSV file as a string
 * @returns Parsed data, including deliveries, errors, and warnings
 */
export function parseDispatchCsv(fileContent: string): ParsedCsvData {
  const lines = fileContent.trim().split(/\r?\n/);
  
  if (lines.length < 4) {
    return {
      reportDate: null,
      deliveries: [],
      totalRows: 0,
      successfulRows: 0,
      errors: [{
        row: 0,
        message: "CSV file does not contain enough rows. Expected at least 4 rows including headers."
      }],
      warnings: []
    };
  }

  // Extract report date from header (Row 1, Column A)
  const reportDate = extractReportDate(lines[0]);
  
  const deliveries: Record<string, string>[] = [];
  const errors: CsvParseError[] = [];
  const warnings: CsvParseWarning[] = [];
  
  // Attempt to detect column headers (commonly in row 3, index 2)
  const columnMap = detectColumnHeaders(lines, errors);
  
  // Process each delivery row (starting at row 4, index 3)
  const startRow = columnMap ? 3 : 3; // If we found headers, start after them
  
  for (let i = startRow; i < lines.length; i++) {
    const lineNumber = i + 1; // For human-readable error reporting
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    try {
      // Parse the CSV line handling quoted values properly
      const values = parseCSVLine(line);
      
      if (values.length < 5) { // Minimum number of columns needed
        errors.push({
          row: lineNumber,
          message: `Not enough columns. Found ${values.length}, expected at least 5.`
        });
        continue;
      }
      
      // Extract data using either detected column map or default indices
      let businessName = '';
      let clientName = '';
      let address = '';
      let phone = '';
      let deliveryTime = '';
      let notes = '';
      let orderNumber = '';
      
      let rowWarnings: CsvParseWarning[] = [];
      
      if (columnMap) {
        // Use detected column headers
        businessName = extractField('businessName', values, columnMap, lineNumber, rowWarnings);
        clientName = extractField('clientName', values, columnMap, lineNumber, rowWarnings);
        address = extractField('address', values, columnMap, lineNumber, rowWarnings);
        phone = extractField('phone', values, columnMap, lineNumber, rowWarnings);
        deliveryTime = extractField('deliveryTime', values, columnMap, lineNumber, rowWarnings);
        notes = extractField('notes', values, columnMap, lineNumber, rowWarnings);
        orderNumber = extractField('orderNumber', values, columnMap, lineNumber, rowWarnings);
      } else {
        // Fall back to default column indices
        businessName = cleanString(values[6] || '');
        clientName = cleanString(values[5] || '');
        address = cleanString(values[10] || '');
        phone = cleanString(values[11] || '');
        deliveryTime = cleanString(values[1] || '');
        notes = cleanString(values[13] || '');
        orderNumber = cleanString(values[0] || '');
      }
      
      // Validate required fields
      const missingFields: string[] = [];
      
      if (!businessName) {
        // Try to recover business name from client name if possible
        if (clientName) {
          businessName = clientName;
          rowWarnings.push({
            row: lineNumber,
            field: 'businessName',
            message: 'Missing business name, using client name as fallback',
            correctedValue: clientName
          });
        } else {
          missingFields.push('business name');
          businessName = "Unnamed Business";
        }
      }
      
      if (!address) {
        missingFields.push('address');
      }
      
      if (!deliveryTime) {
        missingFields.push('delivery time');
        deliveryTime = '12:00';
        rowWarnings.push({
          row: lineNumber,
          field: 'deliveryTime',
          message: 'Missing delivery time, using default (12:00)',
          correctedValue: '12:00'
        });
      }
      
      if (missingFields.length > 0) {
        errors.push({
          row: lineNumber,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
        
        // Only skip if address is missing - we can recover from other missing fields
        if (missingFields.includes('address')) {
          continue;
        }
      }
      
      // Process delivery time
      const parsedTime = convertTimeFormat(deliveryTime);
      
      if (parsedTime !== deliveryTime) {
        rowWarnings.push({
          row: lineNumber,
          field: 'deliveryTime',
          message: 'Delivery time format converted to 24-hour format',
          originalValue: deliveryTime,
          correctedValue: parsedTime
        });
      }
      
      // Process address and phone
      const { addressProcessed, phoneProcessed, addressWarnings } = processAddressAndPhone(address, phone, lineNumber);
      rowWarnings.push(...addressWarnings);
      
      // Add all warnings from this row
      warnings.push(...rowWarnings);
      
      // Create delivery record
      deliveries.push({
        businessName,
        clientName,
        address: addressProcessed,
        contactPhone: phoneProcessed,
        deliveryTime: parsedTime,
        deliveryDate: reportDate || format(new Date(), 'yyyy-MM-dd'),
        specialInstructions: notes,
        orderNumber,
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
    totalRows: lines.length - startRow,
    successfulRows: deliveries.length,
    errors,
    warnings,
    columnMap
  };
}

/**
 * Extracts a field value using column mapping
 */
function extractField(
  fieldName: string, 
  values: string[], 
  columnMap: Record<string, number>, 
  lineNumber: number,
  warnings: CsvParseWarning[]
): string {
  const index = columnMap[fieldName];
  
  if (index !== undefined && index < values.length) {
    return cleanString(values[index]);
  }
  
  // Try to find by scanning all columns for likely matches
  if (fieldName === 'businessName' || fieldName === 'clientName') {
    for (let i = 0; i < values.length; i++) {
      const value = cleanString(values[i]);
      // Look for values that appear to be company or organization names
      if (
        value && 
        (value.includes(' Inc') || 
         value.includes(' LLC') || 
         value.includes(' Ltd') || 
         value.includes(' Co.') ||
         value.includes(' Company') ||
         /^[A-Z][\w\s&'-]+$/.test(value)) // Capitalized multi-word name pattern
      ) {
        warnings.push({
          row: lineNumber,
          field: fieldName,
          message: `Used column ${i+1} for ${fieldName} based on content analysis`,
          correctedValue: value
        });
        return value;
      }
    }
  }
  
  if (fieldName === 'address') {
    for (let i = 0; i < values.length; i++) {
      const value = cleanString(values[i]);
      // Look for values that appear to be addresses
      if (
        value && 
        (
          /\d+\s+[A-Za-z]+/.test(value) || // Has number followed by street
          value.includes('Street') ||
          value.includes('Road') ||
          value.includes('Ave') ||
          value.includes('Lane') ||
          value.includes('Drive') ||
          value.includes('St.')
        )
      ) {
        warnings.push({
          row: lineNumber,
          field: fieldName,
          message: `Used column ${i+1} for ${fieldName} based on content analysis`,
          correctedValue: value
        });
        return value;
      }
    }
  }
  
  if (fieldName === 'phone') {
    for (let i = 0; i < values.length; i++) {
      const value = cleanString(values[i]);
      // Look for values that appear to be phone numbers
      if (value && isPhoneNumber(value)) {
        warnings.push({
          row: lineNumber,
          field: fieldName,
          message: `Used column ${i+1} for ${fieldName} based on content analysis`,
          correctedValue: value
        });
        return value;
      }
    }
  }
  
  if (fieldName === 'deliveryTime') {
    for (let i = 0; i < values.length; i++) {
      const value = cleanString(values[i]);
      // Look for values that appear to be times
      if (
        value && 
        (
          /^\d{1,2}:\d{2}/.test(value) || // HH:MM format
          /^\d{1,2}(am|pm|AM|PM)/.test(value) || // HAM/PM format
          /^\d{1,2}\s+(am|pm|AM|PM)/.test(value) // H AM/PM format
        )
      ) {
        warnings.push({
          row: lineNumber,
          field: fieldName,
          message: `Used column ${i+1} for ${fieldName} based on content analysis`,
          correctedValue: value
        });
        return value;
      }
    }
  }
  
  // Return empty string if not found
  return '';
}

/**
 * Attempts to detect column headers in the CSV file
 */
function detectColumnHeaders(lines: string[], errors: CsvParseError[]): Record<string, number> | null {
  const columnMap: Record<string, number> = {};
  
  // Check rows 1-3 for possible headers
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const headers = parseCSVLine(line);
      let foundHeaders = false;
      
      // Look for known header names
      COLUMN_DEFINITIONS.forEach(column => {
        const possibleNames = [column.name, ...column.alternateNames];
        
        for (let j = 0; j < headers.length; j++) {
          const headerText = headers[j].toLowerCase().trim();
          
          for (const name of possibleNames) {
            if (headerText === name || headerText.includes(name)) {
              columnMap[column.name] = j;
              foundHeaders = true;
              break;
            }
          }
        }
      });
      
      if (foundHeaders && Object.keys(columnMap).length >= 3) {
        console.log("Detected column headers:", columnMap);
        return columnMap;
      }
    } catch (error) {
      errors.push({
        row: i + 1,
        message: `Error processing potential header row: ${(error as Error).message}`
      });
    }
  }
  
  // If headers not detected, fall back to default column mapping
  console.log("Headers not detected, using default column mapping");
  return null;
}

/**
 * Extracts report date from the header line with improved fallbacks
 * @param headerLine First line of the CSV
 * @returns Formatted date string or today's date if not found
 */
export function extractReportDate(headerLine: string): string | null {
  // Try multiple date patterns
  const datePatterns = [
    /Dispatch Report - (\d{1,2}\/\d{1,2}\/\d{4})/i,
    /Dispatch Report for (\d{1,2}\/\d{1,2}\/\d{4})/i,
    /Report - (\d{1,2}\/\d{1,2}\/\d{4})/i,
    /Report Date: (\d{1,2}\/\d{1,2}\/\d{4})/i,
    /Date: (\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})/,  // Just find any date
    /(\d{4}-\d{2}-\d{2})/,        // ISO format
    /(\d{1,2}-\d{1,2}-\d{4})/     // DD-MM-YYYY
  ];
  
  for (const pattern of datePatterns) {
    const match = headerLine.match(pattern);
    if (match && match[1]) {
      try {
        // Handle different date formats
        if (match[1].includes('-')) {
          // Check if it's ISO format (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}$/.test(match[1])) {
            return match[1]; // Already in desired format
          }
          
          // Assume DD-MM-YYYY
          const [day, month, year] = match[1].split('-');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Handle MM/DD/YYYY format
        const dateParts = match[1].split('/');
        const month = parseInt(dateParts[0], 10);
        const day = parseInt(dateParts[1], 10);
        const year = parseInt(dateParts[2], 10);
        
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      } catch (e) {
        console.error("Error parsing date from header:", e);
      }
    }
  }
  
  // Look for date keywords
  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const monthPattern = new RegExp(`(${monthNames.join('|')})[\\s,]+([0-3]?\\d)(?:st|nd|rd|th)?[\\s,]+(\\d{4})`, 'i');
  
  const monthMatch = headerLine.match(monthPattern);
  if (monthMatch) {
    try {
      const monthName = monthMatch[1].toLowerCase();
      const day = parseInt(monthMatch[2], 10);
      const year = parseInt(monthMatch[3], 10);
      const month = monthNames.indexOf(monthName) + 1;
      
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } catch (e) {
      console.error("Error parsing date from text:", e);
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
  // Enhanced CSV parser that handles quoted fields, escaped quotes, and various delimiters
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  let i = 0;
  
  // Auto-detect delimiter (comma, tab, or semicolon)
  let delimiter = ',';
  const commaCount = (line.match(/,/g) || []).length;
  const tabCount = (line.match(/\t/g) || []).length;
  const semicolonCount = (line.match(/;/g) || []).length;
  
  if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  } else if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ';';
  }
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i+1 < line.length && line[i+1] === '"') {
        // Escaped quote inside quoted field
        currentValue += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(currentValue.trim());
      currentValue = '';
    } else {
      // Add character to current field
      currentValue += char;
    }
    
    i++;
  }
  
  // Add the last value
  result.push(currentValue.trim());
  
  return result;
}

/**
 * Cleans string values (removes quotes, trims whitespace)
 */
export function cleanString(value: string): string {
  if (value === undefined || value === null) return '';
  
  // Remove double quotes at beginning and end
  let cleaned = value.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  
  // Remove non-breaking spaces and other invisible characters
  cleaned = cleaned.replace(/\u00A0/g, ' ');
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned.trim();
}

/**
 * Processes and validates address and phone data with improved heuristics
 */
export function processAddressAndPhone(
  addressRaw: string, 
  phoneRaw: string, 
  rowNumber: number
): { 
  addressProcessed: string, 
  phoneProcessed: string, 
  addressWarnings: CsvParseWarning[] 
} {
  const addressWarnings: CsvParseWarning[] = [];
  let addressProcessed = cleanString(addressRaw);
  let phoneProcessed = cleanString(phoneRaw);
  
  // Check if phone field might contain address component
  if (phoneProcessed && !addressProcessed.includes(phoneProcessed) && !isPhoneNumber(phoneProcessed)) {
    if (addressProcessed) {
      addressProcessed = `${addressProcessed}, ${phoneProcessed}`.trim();
    } else {
      addressProcessed = phoneProcessed;
    }
    
    addressWarnings.push({
      row: rowNumber,
      field: 'phone',
      message: 'Phone field appears to contain address data, moved to address field',
      originalValue: phoneRaw,
      correctedValue: ''
    });
    
    phoneProcessed = '';
  }
  
  // Check if address field has a phone number at the end
  const phoneRegex = /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\d{10})$/;
  const phoneMatch = addressProcessed.match(phoneRegex);
  
  if (phoneMatch && !phoneProcessed) {
    phoneProcessed = phoneMatch[0];
    addressProcessed = addressProcessed.replace(phoneRegex, '').trim();
    
    // Clean up any trailing commas, spaces or dashes
    addressProcessed = addressProcessed.replace(/[,\s-]+$/, '').trim();
    
    addressWarnings.push({
      row: rowNumber,
      field: 'address',
      message: 'Found phone number in address field, moved to phone field',
      originalValue: addressRaw,
      correctedValue: addressProcessed
    });
  }
  
  // Process phone numbers
  if (phoneProcessed) {
    const originalPhone = phoneProcessed;
    
    // Handle multiple phone format: "P: xxx / M: xxx"
    if (phoneProcessed.includes('/')) {
      const phoneParts = phoneProcessed.split('/');
      
      // Just take the first phone number
      phoneProcessed = phoneParts[0].trim();
      
      addressWarnings.push({
        row: rowNumber,
        field: 'phone',
        message: 'Multiple phone numbers detected, using only the first one',
        originalValue: originalPhone,
        correctedValue: phoneProcessed
      });
    }
    
    // Clean phone format
    if (phoneProcessed.includes(':')) {
      // If contains label like "P:" or "M:"
      const parts = phoneProcessed.split(':');
      const label = parts[0].trim().slice(-1); // last character of label
      const number = parts[1].trim();
      phoneProcessed = `${label}:${cleanPhoneNumber(number)}`;
    } else {
      phoneProcessed = cleanPhoneNumber(phoneProcessed);
    }
  }
  
  // Clean up the address
  if (addressProcessed) {
    // Standardize Canadian postal code format (if present)
    addressProcessed = standardizeCanadianAddress(addressProcessed);
    
    // Remove trailing punctuation
    addressProcessed = addressProcessed.replace(/[.,;]+$/, '').trim();
    
    // Check for missing apartment/unit numbers but with pound sign or hash
    if (addressProcessed.includes('#')) {
      // Ensure proper spacing around the # symbol
      addressProcessed = addressProcessed.replace(/(\d+)#(\d+)/g, '$1 #$2');
      addressProcessed = addressProcessed.replace(/#(\d+)/g, '# $1');
    }
  }
  
  return { addressProcessed, phoneProcessed, addressWarnings };
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
  
  // Check for common city names without province
  const canadianCities = [
    { city: 'toronto', province: 'ON' },
    { city: 'montreal', province: 'QC' },
    { city: 'vancouver', province: 'BC' },
    { city: 'calgary', province: 'AB' },
    { city: 'edmonton', province: 'AB' },
    { city: 'ottawa', province: 'ON' },
    { city: 'winnipeg', province: 'MB' },
    { city: 'halifax', province: 'NS' },
    { city: 'quebec city', province: 'QC' },
    { city: 'hamilton', province: 'ON' }
  ];
  
  for (const { city, province } of canadianCities) {
    if (
      address.toLowerCase().includes(city) && 
      !address.match(new RegExp(`\\b(${province})\\b`, 'i'))
    ) {
      address = `${address}, ${province}`;
      break;
    }
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
  } else if (digits.length === 11 && digits[0] === '1') {
    // Handle US/Canada numbers with country code
    return `(${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
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
 * with improved format detection
 */
export function convertTimeFormat(timeStr: string): string {
  if (!timeStr) return '12:00';

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
    // Handle formats like "1:30 PM" or "1:30PM" or "1:30p"
    const pmMatch = time.match(/(\d+):(\d+)\s*([pP][mM]?)/);
    const amMatch = time.match(/(\d+):(\d+)\s*([aA][mM]?)/);
    
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
    
    // Handle format like "1PM" or "2AM" without minutes
    const pmHourMatch = time.match(/(\d+)\s*([pP][mM]?)/);
    const amHourMatch = time.match(/(\d+)\s*([aA][mM]?)/);
    
    if (pmHourMatch) {
      let hours = parseInt(pmHourMatch[1], 10);
      if (hours < 12) hours += 12;
      return `${hours.toString().padStart(2, '0')}:00`;
    } else if (amHourMatch) {
      let hours = parseInt(amHourMatch[1], 10);
      if (hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:00`;
    }
    
    // Handle numeric time (like 1430 for 2:30 PM)
    if (/^\d+$/.test(time)) {
      let timeNum = parseInt(time, 10);
      
      if (timeNum >= 0 && timeNum < 2400) {
        let hours = Math.floor(timeNum / 100);
        let mins = timeNum % 100;
        
        if (mins >= 60) {
          hours += Math.floor(mins / 60);
          mins = mins % 60;
        }
        
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
    
    // Handle "Hour.Minutes" format (European)
    const dotFormat = time.match(/(\d+)\.(\d+)/);
    if (dotFormat) {
      const hours = parseInt(dotFormat[1], 10);
      const mins = parseInt(dotFormat[2], 10);
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
  } catch (e) {
    console.error("Error parsing time:", e);
  }
  
  // Default fallback time
  return '12:00';
}
