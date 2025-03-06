
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
    <div className="print-container p-4">
      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 0.5cm;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-container {
            width: 100%;
            max-width: 100%;
            padding: 0 !important;
          }
          
          .driver-schedule {
            page-break-after: always;
            padding: 1cm 0.5cm;
          }
          
          .driver-schedule:last-child {
            page-break-after: avoid;
          }
          
          .print-header {
            margin-bottom: 1cm;
          }
          
          .stop-item {
            page-break-inside: avoid;
            margin-bottom: 0.8cm;
          }
          
          .print-footer {
            margin-top: 1cm;
          }
        }
      `}</style>
      
      {driversWithStops.map(({ driver, stops }) => (
        <div key={driver.id} className="driver-schedule print-page mb-8">
          <div className="print-header border-b border-gray-300 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-blue-600">Delivery Schedule - {driver.name}</h1>
            <div className="print-date text-gray-600">{formattedDate}</div>
          </div>

          {stops.length === 0 ? (
            <div className="no-stops p-4 bg-gray-100 rounded-md text-center text-gray-600">
              No deliveries scheduled for this driver
            </div>
          ) : (
            <div className="stops-list space-y-6">
              {stops.map((stop) => (
                <div key={stop.id} className="stop-item border border-gray-200 rounded-md p-4 bg-white shadow-sm">
                  <div className="stop-header flex justify-between items-center border-b border-gray-200 pb-2 mb-3">
                    <h3 className="text-lg font-semibold text-blue-700">{stop.businessName || stop.clientName}</h3>
                    <div className="stop-time font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      {stop.deliveryTime}
                    </div>
                  </div>
                  
                  <div className="stop-address mb-3">
                    <strong className="text-gray-700">Address:</strong> {stop.address}
                  </div>
                  
                  <div className="stop-details">
                    <ul className="space-y-2">
                      {stop.orderNumber && (
                        <li><strong className="text-gray-700">Order #:</strong> {stop.orderNumber}</li>
                      )}
                      {stop.clientName && stop.businessName && (
                        <li><strong className="text-gray-700">Contact:</strong> {stop.clientName}</li>
                      )}
                      {stop.contactPhone && (
                        <li><strong className="text-gray-700">Phone:</strong> {stop.contactPhone}</li>
                      )}
                      {stop.stopType && stop.stopType !== 'delivery' && (
                        <li><strong className="text-gray-700">Type:</strong> {stop.stopType}</li>
                      )}
                      {stop.specialInstructions && (
                        <li><strong className="text-gray-700">Instructions:</strong> {stop.specialInstructions}</li>
                      )}
                      {stop.items && stop.items.length > 0 && (
                        <li>
                          <strong className="text-gray-700">Items:</strong>
                          <ul className="items-list pl-6 mt-1 space-y-1 list-disc">
                            {stop.items.map((item, index) => (
                              <li key={index} className="text-gray-600">{item}</li>
                            ))}
                          </ul>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="print-footer mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500 flex justify-between">
            <div>Printed from Catering Flow Manager</div>
            <div>{formattedDate}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrintableSchedule;
