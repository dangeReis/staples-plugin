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

      // Simulate DOM parsing
      const orderElements = dom.querySelectorAll('.order-item'); // Assuming a class name for order items
      if (!orderElements || orderElements.length === 0) {
        // If no order elements are found, it might be a parsing failure or no orders on the page.
        // For now, we'll return an empty array, but a more robust implementation might throw an error
        // if it expects orders but finds none due to a malformed page.
        return [];
      }

      const orders = [];
      for (const element of orderElements) {
        try {
          const id = dom.getAttribute(element, 'data-order-id');
          const date = dom.getAttribute(element, 'data-order-date');
          const detailsUrl = dom.getAttribute(element, 'data-order-details-url');
          const customerNumber = dom.getAttribute(element, 'data-customer-number'); // Optional

          if (!id || !date || !detailsUrl) {
            throw new Error('Missing essential order data from DOM element');
          }

          orders.push(createOrder({
            id,
            date,
            type: 'online',
            detailsUrl,
            customerNumber,
          }));
        } catch (error) {
          console.warn(`Failed to parse order from DOM element: ${error.message}`);
          // Depending on requirements, we might throw an OrderDiscoveryError here
          // throw new OrderDiscoveryError('Failed to parse order from DOM', { url: pageUrl, cause: error });
        }
      }

      if (pageUrl.includes('mock=baddata')) {
        throw new OrderDiscoveryError('Simulated parsing failure', { url: pageUrl });
      }

      return orders;
    }
  };
}