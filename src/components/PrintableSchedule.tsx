
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
    <div className="print-container">
      {driversWithStops.map(({ driver, stops }) => (
        <div key={driver.id} className="driver-schedule print-page">
          <div className="print-header">
            <h1>Delivery Schedule - {driver.name}</h1>
            <div className="print-date">{formattedDate}</div>
          </div>

          {stops.length === 0 ? (
            <div className="no-stops">No deliveries scheduled for this driver</div>
          ) : (
            <div className="stops-list">
              {stops.map((stop) => (
                <div key={stop.id} className="stop-item">
                  <div className="stop-header">
                    <h3>{stop.businessName || stop.clientName}</h3>
                    <div className="stop-time">{stop.deliveryTime}</div>
                  </div>
                  
                  <div className="stop-address">
                    <strong>Address:</strong> {stop.address}
                  </div>
                  
                  <div className="stop-details">
                    <ul>
                      {stop.orderNumber && (
                        <li><strong>Order #:</strong> {stop.orderNumber}</li>
                      )}
                      {stop.clientName && stop.businessName && (
                        <li><strong>Contact:</strong> {stop.clientName}</li>
                      )}
                      {stop.contactPhone && (
                        <li><strong>Phone:</strong> {stop.contactPhone}</li>
                      )}
                      {stop.stopType && stop.stopType !== 'delivery' && (
                        <li><strong>Type:</strong> {stop.stopType}</li>
                      )}
                      {stop.specialInstructions && (
                        <li><strong>Instructions:</strong> {stop.specialInstructions}</li>
                      )}
                      {stop.items && stop.items.length > 0 && (
                        <li>
                          <strong>Items:</strong>
                          <ul className="items-list">
                            {stop.items.map((item, index) => (
                              <li key={index}>{item}</li>
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
          
          <div className="print-footer">
            <div>Printed from Catering Flow Manager</div>
            <div>{formattedDate}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrintableSchedule;
