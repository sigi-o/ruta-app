
import { DeliveryStop } from '@/types';

export const editStopEventChannel = new EventTarget();

export const triggerEditStop = (stop: DeliveryStop) => {
  editStopEventChannel.dispatchEvent(new CustomEvent('editStop', { detail: stop }));
};

export const listenToEditStop = (callback: (stop: DeliveryStop) => void) => {
  const handleEditStop = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  editStopEventChannel.addEventListener('editStop', handleEditStop);
  
  return () => {
    editStopEventChannel.removeEventListener('editStop', handleEditStop);
  };
};
