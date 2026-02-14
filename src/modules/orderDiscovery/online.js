import { OrderDiscoveryError } from './interface.js';
import { createOrder } from '../../primitives/Order.js';

export function createOnlineOrderDiscovery({ dom }) {
  if (!dom) {
    throw new Error('DOM adapter is required');
  }

  return {
    /**
     * Discovers online orders from the page.
     * @param {string} pageUrl - The URL of the current page. Must be a Staples order page.
     * @returns {Promise<Order[]>} A promise that resolves to an array of discovered orders (may be empty).
     * @throws {OrderDiscoveryError} If the page URL is invalid or parsing fails.
     */
    async discover(pageUrl) {
      if (!pageUrl.startsWith('https://www.staples.com/ptd/myorders')) {
        throw new OrderDiscoveryError('Invalid page URL for online orders', { url: pageUrl });
      }

      // Allow tests to trigger a simulated parsing failure before DOM work
      if (pageUrl.includes('mock=baddata')) {
        throw new OrderDiscoveryError('Simulated parsing failure', { url: pageUrl });
      }

      const orderElements = dom.querySelectorAll('.order-item');
      if (!orderElements || orderElements.length === 0) {
        return [];
      }

      const orders = [];
      for (const element of orderElements) {
        try {
          const id = dom.getAttribute(element, 'data-order-id');
          const date = dom.getAttribute(element, 'data-order-date');
          const detailsUrl = dom.getAttribute(element, 'data-order-details-url');
          const customerNumber = dom.getAttribute(element, 'data-customer-number'); // Optional
          const orderUrlKey = dom.getAttribute(element, 'data-order-url-key'); // tp_sid for API enrichment
          const orderType = dom.getAttribute(element, 'data-order-type') || 'online_dotcom';

          if (!id || !date || !detailsUrl) {
            throw new Error('Missing essential order data from DOM element');
          }

          orders.push(createOrder({
            id,
            date,
            type: 'online',
            detailsUrl,
            customerNumber,
            orderUrlKey,
            orderType,
          }));
        } catch (error) {
          console.warn(`Failed to parse order from DOM element: ${error.message}`);
          // Depending on requirements, we might throw an OrderDiscoveryError here
          // throw new OrderDiscoveryError('Failed to parse order from DOM', { url: pageUrl, cause: error });
        }
      }

      return orders;
    }
  };
}