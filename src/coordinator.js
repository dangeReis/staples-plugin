import { createOnlineOrderDiscovery } from './modules/orderDiscovery/online.js';
import { createInstoreOrderDiscovery } from './modules/orderDiscovery/instore.js';
import { createChromePrintReceiptGenerator } from './modules/receiptGenerator/chromePrint.js';
import { createTimeBasedScheduler } from './modules/scheduler/timeBasedScheduler.js';
import { createChromeStorageStatusTracker } from './modules/statusTracker/chromeStorage.js';

// Adapters
import { createDOMAdapter } from './adapters/dom.js';
import {
  createChromeDownloadsAdapter,
  createChromeTabsAdapter,
  createChromeDebuggerAdapter,
  createChromeStorageAdapter
} from './adapters/chromeApi.js';

export function createCoordinator({
  // Low-level adapters
  domAdapter = createDOMAdapter(),
  chromeDownloadsAdapter = createChromeDownloadsAdapter(),
  chromeTabsAdapter = createChromeTabsAdapter(),
  chromeDebuggerAdapter = createChromeDebuggerAdapter(),
  chromeStorageAdapter = createChromeStorageAdapter(),
} = {}) {
  // Module instances, injected with their dependencies
  const onlineOrderDiscovery = createOnlineOrderDiscovery({ dom: domAdapter });
  const instoreOrderDiscovery = createInstoreOrderDiscovery({ dom: domAdapter });
  const receiptGenerator = createChromePrintReceiptGenerator({
    tabs: chromeTabsAdapter,
    debugger: chromeDebuggerAdapter,
    downloads: chromeDownloadsAdapter,
  });
  const statusTracker = createChromeStorageStatusTracker({ storage: chromeStorageAdapter });
  const scheduler = createTimeBasedScheduler({ receiptGenerator, statusTracker });

  return {
    // Public API for the coordinator
    async startDownloadProcess(options) {
      // Orchestrate the modules to perform the download process
      // This is a placeholder for the actual logic
      console.log('Starting download process with options:', options);
      const orders = await onlineOrderDiscovery.discover('https://www.staples.com/ptd/myorders');
      console.log('Discovered orders:', orders);
      const schedule = scheduler.schedule(orders, { delayBetweenOrders: 1000 });
      console.log('Scheduled downloads:', schedule);
      await scheduler.start();
      console.log('Download process completed.');
    },

    getStatus() {
      return statusTracker.getStatus();
    },

    onStatusChange(callback) {
      return statusTracker.onChange(callback);
    },
  };
}
