import { createOnlineOrderDiscovery } from './modules/orderDiscovery/online.js';
import { createInstoreOrderDiscovery } from './modules/orderDiscovery/instore.js';
import { createOrderDetailsApi } from './modules/orderDetails/api.js';
import { createChromePrintReceiptGenerator } from './modules/receiptGenerator/chromePrint.js';
import { createTimeBasedScheduler } from './modules/scheduler/timeBasedScheduler.js';
import { createChromeStorageStatusTracker } from './modules/statusTracker/chromeStorage.js';

// Adapters
import { createDOMAdapter } from './adapters/dom.js';
import { createFetchAdapter } from './adapters/fetch.js';
import {
  createChromeDownloadsAdapter,
  createChromeTabsAdapter,
  createChromeDebuggerAdapter,
  createChromeStorageAdapter
} from './adapters/chromeApi.js';

export function createCoordinator({
  // Low-level adapters
  domAdapter = createDOMAdapter(),
  fetchAdapter = createFetchAdapter(),
  chromeDownloadsAdapter = createChromeDownloadsAdapter(),
  chromeTabsAdapter = createChromeTabsAdapter(),
  chromeDebuggerAdapter = createChromeDebuggerAdapter(),
  chromeStorageAdapter = createChromeStorageAdapter(),
} = {}) {
  // Module instances, injected with their dependencies
  const onlineOrderDiscovery = createOnlineOrderDiscovery({ dom: domAdapter });
  const instoreOrderDiscovery = createInstoreOrderDiscovery({ dom: domAdapter });
  const orderDetails = createOrderDetailsApi({ fetch: fetchAdapter });
  const receiptGenerator = createChromePrintReceiptGenerator({
    tabs: chromeTabsAdapter,
    debugger: chromeDebuggerAdapter,
    downloads: chromeDownloadsAdapter,
  });
  const statusTracker = createChromeStorageStatusTracker({ storage: chromeStorageAdapter });
  const scheduler = createTimeBasedScheduler({ receiptGenerator, statusTracker });

  /**
   * Enrich discovered orders with full API data.
   * Orders that lack an orderUrlKey are skipped (enrichment not possible).
   * Orders that fail enrichment are kept in their discovered state.
   *
   * @param {import('./primitives/Order.js').Order[]} orders
   * @returns {Promise<import('./primitives/Order.js').Order[]>}
   */
  async function enrichOrders(orders) {
    const results = [];
    for (const order of orders) {
      if (!order.orderUrlKey) {
        // No API key available — keep the discovered-only order
        results.push(order);
        continue;
      }
      try {
        const enriched = await orderDetails.enrich(order);
        results.push(enriched);
      } catch (err) {
        console.warn(`Failed to enrich order ${order.id}: ${err.message}`);
        // Graceful degradation — use the discovered order as-is
        results.push(order);
      }
    }
    return results;
  }

  return {
    // Public API for the coordinator
    async startDownloadProcess(options = {}) {
      const { pageUrl = 'https://www.staples.com/ptd/myorders' } = options;

      // 1. Discover orders from the page DOM
      console.log('Discovering orders...');
      const onlineOrders = await onlineOrderDiscovery.discover(pageUrl);
      const instoreOrders = await instoreOrderDiscovery.discover(pageUrl + '/instore');
      const discoveredOrders = [...onlineOrders, ...instoreOrders];
      console.log(`Discovered ${discoveredOrders.length} orders (${onlineOrders.length} online, ${instoreOrders.length} in-store)`);

      // 2. Enrich with API data (items, returns, financials)
      console.log('Enriching orders with API data...');
      const enrichedOrders = await enrichOrders(discoveredOrders);
      const enrichedCount = enrichedOrders.filter(o => o.enriched).length;
      console.log(`Enriched ${enrichedCount}/${discoveredOrders.length} orders`);

      // 3. Schedule and execute receipt downloads
      const schedule = scheduler.schedule(enrichedOrders, {
        delayBetweenOrders: options.delayBetweenOrders || 1000,
      });
      console.log(`Scheduled ${schedule.total} downloads`);
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
