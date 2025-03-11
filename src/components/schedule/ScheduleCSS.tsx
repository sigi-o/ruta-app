
import React from 'react';

const ScheduleCSS: React.FC = () => {
  return (
    <style>{`
      .schedule-container {
        display: inline-block;
        min-width: 100%;
        border-top: 1px solid #eaeaea;
        border-left: 1px solid #eaeaea;
        position: relative;
      }
      
      .schedule-header {
        display: inline-flex;
        min-width: max-content;
        background-color: white;
        position: sticky;
        top: 0;
        z-index: 20;
      }
      
      .time-header {
        @apply sticky left-0 bg-white text-xs font-medium text-gray-500 flex items-center justify-center;
        min-width: 80px;
        height: 56px;
        border-right: 1px solid #eaeaea;
        border-bottom: 1px solid #eaeaea;
        z-index: 30;
      }
      
      .driver-header {
        @apply flex items-center justify-center px-3 py-2 font-medium bg-white;
        min-width: 200px;
        height: 56px;
        border-right: 1px solid #eaeaea;
        border-bottom: 1px solid #eaeaea;
        box-sizing: border-box;
        width: 200px;
        z-index: 20;
      }
      
      .schedule-body {
        min-width: max-content;
        display: flex;
        flex-direction: column;
      }
      
      .time-row {
        display: flex;
        min-height: 100px;
        width: 100%;
      }
      
      .time-label {
        min-width: 80px;
        height: 100%;
        border-right: 1px solid #eaeaea;
        border-bottom: 1px solid #eaeaea;
        z-index: 15;
      }
      
      .driver-cells {
        display: flex;
        flex: 1;
      }
      
      .driver-cell {
        @apply p-2 bg-white hover:bg-blue-50/30 transition-colors;
        min-width: 200px;
        width: 200px;
        box-sizing: border-box;
        border-right: 1px solid #eaeaea;
        border-bottom: 1px solid #eaeaea;
      }
      
      .delivery-item {
        @apply p-2 rounded-md shadow-sm text-sm mb-1 cursor-grab active:cursor-grabbing;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        z-index: 1;
      }
      
      .delivery-item:hover {
        transform: translateY(-2px);
        @apply shadow-md;
      }
      
      .delivery-item.dragging {
        @apply shadow-lg z-10;
        transform: scale(1.02);
      }
      
      .unassigned-stop {
        @apply bg-white p-3 rounded-md shadow-sm border border-gray-200 mb-2;
        transition: all 0.2s ease;
      }
      
      .unassigned-stop:hover {
        @apply shadow-md border-blue-300;
      }
    `}</style>
  );
};

export default ScheduleCSS;
