
import { format } from 'date-fns';
import { ParsedCsvData, CsvParseError, CsvParseWarning, CsvParseDuplicate } from '@/types';

/**
 * Parses a CSV file containing dispatch report data using fixed column positions
 * @param fileContent The content of the CSV file as a string
 * @param existingOrderIds Array of order IDs that already exist in the system
 * @returns Parsed data, including deliveries, errors, warnings, and duplicates
 */
export function parseDispatchCsv(fileContent: string, existingOrderIds: string[] = []): ParsedCsvData {
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
      warnings: [],
      duplicates: []
    };
  }

  // Extract report date from row 1, column A (first cell)
  const reportDate = extractReportDate(lines[0]);
  console.log("Extracted report date:", reportDate);
  
  const deliveries: Record<string, string>[] = [];
  const errors: CsvParseError[] = [];
  const warnings: CsvParseWarning[] = [];
  const duplicates: CsvParseDuplicate[] = [];
  
  // Convert all existing order IDs to lowercase for case-insensitive comparison
  const normalizedExistingOrderIds = existingOrderIds.map(id => 
    id ? id.toLowerCase().trim() : ''
  ).filter(id => id !== '');
  
  // Fixed column mapping as per requirements
  // Using zero-based indexing for array access
  const columnMap = {
    deliveryTime: 1,  // Column B
    clientName: 5,    // Column F
    businessName: 6,  // Column G
    orderId: 7,       // Column H (Order ID field)
    address: 10,      // Column K
    phone: 11,        // Column L
    notes: 13,        // Column N
    orderNumber: 0    // Column A (if available)
  };
  
  // Process each delivery row (starting at row 4, index 3)
  for (let i = 3; i < lines.length; i++) {
    const lineNumber = i + 1; // For human-readable error reporting
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    try {
      // Parse the CSV line handling quoted values properly
      const values = parseCSVLine(line);
      
      // Check if we have enough columns for the essential fields
      // We need at least enough columns to reach the highest index we're interested in
      const requiredColumnCount = Math.max(
        columnMap.address, 
        columnMap.deliveryTime
      ) + 1;
      
      if (values.length < requiredColumnCount) {
        errors.push({
          row: lineNumber,
          message: `Not enough columns for essential data. Found ${values.length}, need at least ${requiredColumnCount} to reach all required fields.`
        });
        continue;
      }
      
      // Extract data using fixed column positions
      // Use optional chaining to prevent errors if columns are missing
      const businessName = values.length > columnMap.businessName ? cleanString(values[columnMap.businessName] || '') : '';
      const clientName = values.length > columnMap.clientName ? cleanString(values[columnMap.clientName] || '') : '';
      const address = values.length > columnMap.address ? cleanString(values[columnMap.address] || '') : '';
      const phone = values.length > columnMap.phone ? cleanString(values[columnMap.phone] || '') : '';
      const deliveryTime = values.length > columnMap.deliveryTime ? cleanString(values[columnMap.deliveryTime] || '') : '';
      const notes = values.length > columnMap.notes ? cleanString(values[columnMap.notes] || '') : '';
      const orderNumber = values.length > columnMap.orderNumber ? cleanString(values[columnMap.orderNumber] || '') : '';
      const orderId = values.length > columnMap.orderId ? cleanString(values[columnMap.orderId] || '') : '';
      
      // Check for duplicate Order ID
      const normalizedOrderId = orderId ? orderId.toLowerCase().trim() : '';
      
      if (normalizedOrderId && normalizedExistingOrderIds.includes(normalizedOrderId)) {
        duplicates.push({
          row: lineNumber,
          message: `Order ID already exists in the system`,
          field: 'orderId',
          value: orderId,
          orderId: normalizedOrderId
        });
        continue; // Skip this row
      }
      
      // Validate required fields
      const missingFields: string[] = [];
      
      // Remove businessName from required fields check
      if (!address) {
        missingFields.push('address');
      }
      
      if (!deliveryTime) {
        missingFields.push('delivery time');
      }
      
      if (missingFields.length > 0) {
        errors.push({
          row: lineNumber,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
        
        // Skip rows with missing required fields
        if (missingFields.includes('address') || 
            missingFields.includes('delivery time')) {
          continue;
        }
      }
      
      // Process delivery time
      const parsedTime = convertTimeFormat(deliveryTime);
      
      // Create delivery record
      deliveries.push({
        businessName,
        clientName,
        address,
        contactPhone: phone,
        deliveryTime: parsedTime,
        deliveryDate: reportDate || format(new Date(), 'yyyy-MM-dd'),
        specialInstructions: notes,
        orderNumber,
        orderId, // Add the Order ID to the delivery record
        stopType: 'delivery'
      });
      
      // Add this Order ID to our list of existing IDs to catch duplicates within the same file
      if (normalizedOrderId) {
        normalizedExistingOrderIds.push(normalizedOrderId);
      }
      
    } catch (error) {
      console.error(`Error parsing row ${lineNumber}:`, error);
      errors.push({
        row: lineNumber,
        message: (error as Error).message
      });
    }
  }
  
  console.log(`Successfully parsed ${deliveries.length} deliveries from ${lines.length - 3} rows`);
  console.log(`Skipped ${duplicates.length} duplicate entries based on Order ID`);
  
  return {
    reportDate,
    deliveries,
    totalRows: lines.length - 3,
    successfulRows: deliveries.length,
    errors,
    warnings,
    duplicates,
    columnMap
  };
}

/**
 * Extracts report date from the first row, first column
 * @param headerLine First line of the CSV
 * @returns Formatted date string or today's date if not found
 */
export function extractReportDate(headerLine: string): string | null {
  try {
    // Parse the first cell which should contain the date
    const firstCell = parseCSVLine(headerLine)[0] || '';
    
    // Try to extract a date from the cell content
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,      // MM/DD/YYYY
      /(\d{1,2}-\d{1,2}-\d{4})/,         // MM-DD-YYYY
      /(\d{4}-\d{1,2}-\d{1,2})/          // YYYY-MM-DD
    ];
    
    for (const pattern of datePatterns) {
      const match = firstCell.match(pattern);
      if (match && match[1]) {
        // If we found a date, convert it to YYYY-MM-DD format
        if (match[1].includes('/')) {
          const [month, day, year] = match[1].split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else if (match[1].includes('-')) {
          // Check if it's already YYYY-MM-DD
          if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(match[1])) {
            const [year, month, day] = match[1].split('-');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            // Assume MM-DD-YYYY
            const [month, day, year] = match[1].split('-');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }
      }
    }
    
    // If no date found in standard format, look for month names
    const monthNames = ["january", "february", "march", "april", "may", "june", 
                         "july", "august", "september", "october", "november", "december"];
    const monthPattern = new RegExp(`(${monthNames.join('|')})[\\s,]+([0-3]?\\d)(?:st|nd|rd|th)?[\\s,]+(\\d{4})`, 'i');
    
    const monthMatch = firstCell.match(monthPattern);
    if (monthMatch) {
      const monthName = monthMatch[1].toLowerCase();
      const day = parseInt(monthMatch[2], 10);
      const year = parseInt(monthMatch[3], 10);
      const month = monthNames.indexOf(monthName) + 1;
      
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  } catch (error) {
    console.error("Error extracting report date:", error);
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
 * Converts various time formats to application's expected format (HH:MM)
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
  } catch (e) {
    console.error("Error parsing time:", e);
  }
  
  // Default fallback time
  return '12:00';
}
