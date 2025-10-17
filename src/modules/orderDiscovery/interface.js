/**
 * OrderDiscovery Interface Contract
 *
 * Purpose: Discovers orders from the current page
 *
 * This interface defines the contract that all OrderDiscovery implementations
 * must follow. Implementations can be swapped without changing dependent modules.
 */

/**
 * @typedef {Object} Order
 * @property {string} id - Unique order identifier
 * @property {string} date - ISO 8601 date string (YYYY-MM-DD)
 * @property {'online'|'instore'} type - Order type
 * @property {string} detailsUrl - URL to order details page
 * @property {string} [customerNumber] - Optional customer account number
 */

/**
 * OrderDiscovery Interface
 *
 * @interface OrderDiscovery
 */
export const OrderDiscoveryInterface = {
  /**
   * Discover orders from page URL
   *
   * @param {string} pageUrl - Current page URL (must be Staples order page)
   * @returns {Promise<Order[]>} Array of discovered orders (may be empty)
   * @throws {OrderDiscoveryError} If page cannot be parsed or URL is invalid
   *
   * @example
   * const discovery = createOnlineOrderDiscovery();
   * const orders = await discovery.discover('https://www.staples.com/ptd/myorders');
   * // returns: [{ id: '123', date: '2025-10-17', type: 'online', detailsUrl: '...' }]
   */
  discover: async (pageUrl) => {}
};

/**
 * OrderDiscoveryError
 *
 * Thrown when order discovery fails
 */
export class OrderDiscoveryError extends Error {
  /**
   * @param {string} message - Error description
   * @param {Object} context - Error context
   * @param {string} context.url - Page URL that failed
   * @param {Error} [context.cause] - Underlying error
   */
  constructor(message, { url, cause } = {}) {
    super(message);
    this.name = 'OrderDiscoveryError';
    this.url = url;
    this.cause = cause;
  }
}
