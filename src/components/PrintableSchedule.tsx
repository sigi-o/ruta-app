
import React from 'react';
import { DeliveryStop, Driver } from '@/types';
import { format } from 'date-fns';

interface PrintableScheduleProps {
  drivers: Driver[];
  stops: DeliveryStop[];
  selectedDate: string;
}

const PrintableSchedule: React.FC<PrintableScheduleProps> = ({ 
  drivers, 
  stops, 
  selectedDate 
}) => {
  // Get all drivers with their associated stops for the day
  const driversWithStops = drivers
    .filter(driver => driver.available !== false)
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

  // Format the date for display
  let formattedDate = "";
  try {
    const parsedDate = new Date(selectedDate);
    if (!isNaN(parsedDate.getTime())) {
      formattedDate = format(parsedDate, 'EEEE, MMMM d, yyyy');
    } else {
      formattedDate = "Schedule Date";
    }
  } catch (error) {
    formattedDate = "Schedule Date";
  }

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
                      {stop.deliveryTime}
                    </div>
                  </div>
                  
                  <div className="stop-details">
                    <div className="stop-address text-xs mb-1">
                      <strong className="text-gray-700">Address:</strong> {stop.address}
                    </div>
                    
                    <div className="grid grid-cols-1 text-xs">
                      {stop.orderNumber && (
                        <div><strong className="text-gray-700">Order #:</strong> {stop.orderNumber}</div>
                      )}
                      {stop.clientName && stop.businessName && (
                        <div><strong className="text-gray-700">Contact:</strong> {stop.clientName}</div>
                      )}
                      {stop.contactPhone && (
                        <div><strong className="text-gray-700">Phone:</strong> {stop.contactPhone}</div>
                      )}
                      {stop.stopType && stop.stopType !== 'delivery' && (
                        <div><strong className="text-gray-700">Type:</strong> {stop.stopType}</div>
                      )}
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
