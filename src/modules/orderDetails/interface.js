/**
 * OrderDetails Interface Contract
 *
 * Purpose: Enriches a discovered Order with full detail data from the API.
 *
 * Takes a basic (discovered) Order that has at least `orderUrlKey` and `orderType`,
 * calls the Staples orderDetails API, and returns a fully enriched Order with
 * items, returns, financials, and storeInfo.
 *
 * Implementations can be swapped without changing dependent modules.
 */

/**
 * OrderDetails Interface
 *
 * @interface OrderDetails
 */
export const OrderDetailsInterface = {
  /**
   * Enrich an order with full detail data from the API.
   *
   * @param {import('../../primitives/Order.js').Order} order
   *   A discovered order with at minimum `orderUrlKey` and `orderType` set.
   * @returns {Promise<import('../../primitives/Order.js').Order>}
   *   An enriched, immutable Order with items, returns, financials, storeInfo populated.
   * @throws {OrderDetailsError} If the API call fails, auth is missing, or parsing fails.
   *
   * @example
   * const details = createOrderDetailsApi({ fetch: fetchAdapter });
   * const enriched = await details.enrich(discoveredOrder);
   * console.log(enriched.items);       // OrderItem[]
   * console.log(enriched.financials);  // { merchandiseTotal, grandTotal, ... }
   * console.log(enriched.enriched);    // true
   */
  enrich: async (order) => {},
};

/**
 * OrderDetailsError
 *
 * Thrown when order detail enrichment fails.
 */
export class OrderDetailsError extends Error {
  /**
   * @param {string} message - Error description
   * @param {Object} context
   * @param {string} [context.orderId] - Which order failed
   * @param {number} [context.status] - HTTP status code (if API responded)
   * @param {Error}  [context.cause]  - Underlying error
   */
  constructor(message, { orderId, status, cause } = {}) {
    super(message);
    this.name = 'OrderDetailsError';
    this.orderId = orderId;
    this.status = status;
    this.cause = cause;
  }
}
