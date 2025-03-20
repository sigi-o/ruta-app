
import React from 'react';
import { DeliveryStop, Driver, DriverAvailability } from '@/types';
import { format, parse } from 'date-fns';
import { Package, ShoppingBag, AlertCircle } from 'lucide-react';

interface PrintableScheduleProps {
  drivers: Driver[];
  stops: DeliveryStop[];
  selectedDate: string;
  driverAvailability?: DriverAvailability[];
}

const PrintableSchedule: React.FC<PrintableScheduleProps> = ({ 
  drivers, 
  stops, 
  selectedDate,
  driverAvailability = []
}) => {
  // Helper function to check if a driver is available on the selected date
  const isDriverAvailableOnDate = (driverId: string): boolean => {
    // First check if there's a specific availability record for this date
    const availabilityRecord = driverAvailability.find(
      a => a.driverId === driverId && a.date === selectedDate
    );
    
    if (availabilityRecord) {
      return availabilityRecord.isAvailable;
    }
    
    // If no record exists, fall back to the driver's general availability
    const driver = drivers.find(d => d.id === driverId);
    return driver?.available !== false;
  };

  // Get all drivers with their associated stops for the day
  const driversWithStops = drivers
    .filter(driver => isDriverAvailableOnDate(driver.id))
    .map(driver => {
      const driverStops = stops
        .filter(stop => stop.driverId === driver.id && stop.deliveryDate === selectedDate)
        .sort((a, b) => {
          // Sort by delivery time
          const timeA = a.deliveryTime.split(':').map(Number);
          const timeB = b.deliveryTime.split(':').map(Number);
          
          if (timeA[0] !== timeB[0]) {
            return timeA[0] - timeB[0]; // Sort by hour
          }
          return timeA[1] - timeB[1]; // Sort by minute
        });

      return {
        driver,
        stops: driverStops
      };
    });

  // Format the date for display - Fixed to prevent timezone issues
  let formattedDate = "";
  try {
    // Parse the YYYY-MM-DD string and set it to noon to avoid timezone issues
    if (selectedDate && selectedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Create date parts from the string to ensure we're working with local date
      const [year, month, day] = selectedDate.split('-').map(Number);
      // Create date with local timezone (months are 0-indexed in JS Date)
      const parsedDate = new Date(year, month - 1, day, 12, 0, 0);
      
      if (!isNaN(parsedDate.getTime())) {
        formattedDate = format(parsedDate, 'EEEE, MMMM d, yyyy');
        console.log(`PrintableSchedule: Formatted date ${selectedDate} to ${formattedDate}`);
      } else {
        formattedDate = "Schedule Date";
        console.error(`PrintableSchedule: Invalid date format: ${selectedDate}`);
      }
    } else {
      formattedDate = "Schedule Date";
      console.error(`PrintableSchedule: Invalid date string: ${selectedDate}`);
    }
  } catch (error) {
    formattedDate = "Schedule Date";
    console.error("PrintableSchedule: Error formatting date:", error);
  }
  
  // Format time to 12-hour format
  const formatTo12Hour = (time24: string): string => {
    const [hourStr, minuteStr] = time24.split(':');
    const hour = parseInt(hourStr, 10);
    const displayHour = hour % 12 || 12;
    const amPm = hour < 12 ? 'AM' : 'PM';
    return `${displayHour}:${minuteStr} ${amPm}`;
  };
  
  // Get the appropriate icon for the stop type
  const getStopTypeIcon = (stopType: string) => {
    switch (stopType) {
      case 'delivery':
        return <Package className="h-3 w-3 inline mr-1" />;
      case 'pickup':
        return <ShoppingBag className="h-3 w-3 inline mr-1" />;
      case 'other':
      default:
        return <AlertCircle className="h-3 w-3 inline mr-1" />;
    }
  };

  // Debug information
  console.log(`PrintableSchedule: Found ${driversWithStops.length} available drivers for date ${selectedDate}`);
  driversWithStops.forEach(ds => {
    console.log(`PrintableSchedule: Driver ${ds.driver.name} has ${ds.stops.length} stops`);
  });

  return (
    <div className="print-container p-2 max-w-full">
      {/* Print styles are now handled in the index.css file */}
      
      {driversWithStops.map(({ driver, stops }) => (
        <div key={driver.id} className="driver-schedule print-page mb-4">
          <div className="print-header border-b border-gray-300 pb-2 mb-3">
            <h1 className="text-xl font-bold text-blue-600">Delivery Schedule - {driver.name}</h1>
            <div className="print-date text-sm text-gray-600">{formattedDate}</div>
          </div>

          {stops.length === 0 ? (
            <div className="no-stops p-2 bg-gray-100 rounded-md text-center text-gray-600 text-sm">
              No deliveries scheduled for this driver
            </div>
          ) : (
            <div className="stops-list grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stops.map((stop) => (
                <div key={stop.id} className="stop-item border border-gray-200 rounded-md p-2 bg-white text-sm">
                  <div className="stop-header flex justify-between items-center border-b border-gray-200 pb-1 mb-1">
                    <h3 className="font-semibold text-blue-700">{stop.businessName || stop.clientName}</h3>
                    <div className="stop-time font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                      {formatTo12Hour(stop.deliveryTime)}
                    </div>
                  </div>
                  
                  <div className="stop-details">
                    <div className="stop-address text-xs mb-1">
                      <strong className="text-gray-700">Address:</strong> {stop.address}
                    </div>
                    
                    <div className="grid grid-cols-1 text-xs">
                      {stop.clientName && stop.businessName && (
                        <div><strong className="text-gray-700">Contact:</strong> {stop.clientName}</div>
                      )}
                      {stop.orderId && (
                        <div><strong className="text-gray-700">Order ID:</strong> {stop.orderId}</div>
                      )}
                      {stop.contactPhone && (
                        <div><strong className="text-gray-700">Phone:</strong> {stop.contactPhone}</div>
                      )}
                      <div className="text-xs mt-1">
                        <strong className="text-gray-700">Type:</strong> 
                        <span className="capitalize ml-1">
                          {getStopTypeIcon(stop.stopType)} {stop.stopType}
                        </span>
                      </div>
                      {stop.specialInstructions && (
                        <div><strong className="text-gray-700">Instructions:</strong> {stop.specialInstructions}</div>
                      )}
                      {stop.items && stop.items.length > 0 && (
                        <div>
                          <strong className="text-gray-700">Items:</strong>
                          <div className="items-list pl-3 mt-0.5 space-y-0.5 text-xs">
                            {stop.items.map((item, index) => (
                              <div key={index} className="text-gray-600">• {item}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="print-footer mt-4 pt-1 border-t border-gray-300 text-xs text-gray-500 flex justify-between">
            <div>Printed from Catering Flow Manager</div>
            <div>{formattedDate}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrintableSchedule;
