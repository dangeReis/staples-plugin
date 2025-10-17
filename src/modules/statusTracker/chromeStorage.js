import { StatusTrackingError } from './interface.js';

export function createChromeStorageStatusTracker({ storage }) {
  if (!storage) {
    throw new Error('Storage adapter is required');
  }

  let status = {
    isProcessing: false,
    currentPage: '1-25',
    progress: { transactionsFound: 0, scheduled: 0, completed: 0, failed: 0 },
    activities: [],
  };

  return {
    update(event) {
      if (!event || !event.type) {
        throw new StatusTrackingError('Invalid event', { operation: 'update' });
      }

      switch (event.type) {
        case 'progress':
          status = {
            ...status,
            progress: { ...status.progress, ...event.data },
          };
          break;
        case 'activity':
          status = {
            ...status,
            activities: [...status.activities, event.data].slice(-10), // Keep last 10 activities
          };
          break;
        case 'error':
          // Handle error event
          break;
        default:
          throw new StatusTrackingError(`Unknown event type: ${event.type}`, { operation: 'update' });
      }
    },
    getStatus() {
      return status;
    },
    onChange(callback) {
      if (storage.onChange) {
        const listener = (changes, areaName) => {
          if (changes.status && changes.status.newValue) {
            callback(changes.status.newValue);
          }
        };
        storage.onChange.addListener(listener);
        return () => {
          storage.onChange.removeListener(listener);
        };
      }
      return () => {};
    }
  };
}
