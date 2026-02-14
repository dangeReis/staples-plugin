import { OrderDiscoveryError } from './interface.js';
import { createOrder } from '../../primitives/Order.js';

export function createInstoreOrderDiscovery({ dom }) {
  if (!dom) {
    throw new Error('DOM adapter is required');
  }

  return {
    /**
     * Discovers in-store orders from the page.
     * @param {string} pageUrl - The URL of the current page. Must be a Staples in-store order page.
     * @returns {Promise<Order[]>} A promise that resolves to an array of discovered orders (may be empty).
     * @throws {OrderDiscoveryError} If the page URL is invalid or parsing fails.
     */
    async discover(pageUrl) {
      if (!pageUrl.startsWith('https://www.staples.com/ptd/myorders/instore')) {
        throw new OrderDiscoveryError('Invalid page URL for in-store orders', { url: pageUrl });
      }

      // Simulate DOM parsing for in-store orders
      const orderElements = dom.querySelectorAll('.instore-order-item'); // Assuming a class name for in-store order items
      if (!orderElements || orderElements.length === 0) {
        return [];
      }

      const orders = [];
      for (const element of orderElements) {
        try {
          const id = dom.getAttribute(element, 'data-instore-order-id');
          const date = dom.getAttribute(element, 'data-instore-order-date');
          const detailsUrl = dom.getAttribute(element, 'data-instore-order-details-url');
          const customerNumber = dom.getAttribute(element, 'data-customer-number'); // Optional
          const orderUrlKey = dom.getAttribute(element, 'data-order-url-key'); // tp_sid for API enrichment
          const orderType = dom.getAttribute(element, 'data-order-type') || 'in-store_instore';

          if (!id || !date || !detailsUrl) {
            throw new Error('Missing essential in-store order data from DOM element');
          }

          orders.push(createOrder({
            id,
            date,
            type: 'instore',
            detailsUrl,
            customerNumber,
            orderUrlKey,
            orderType,
          }));
        } catch (error) {
          console.warn(`Failed to parse in-store order from DOM element: ${error.message}`);
        }
      }

      return orders;
    }
  };
}
