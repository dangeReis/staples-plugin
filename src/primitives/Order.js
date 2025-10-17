/**
 * Order primitive type
 * Represents a purchase (online or in-store)
 * @module primitives/Order
 */

/**
 * @typedef {Object} Order
 * @property {string} id - Unique order identifier
 * @property {string} date - ISO 8601 date string (YYYY-MM-DD)
 * @property {'online'|'instore'} type - Order type
 * @property {string} detailsUrl - URL to order details page
 * @property {string|null} customerNumber - Customer account number (optional)
 */

/**
 * Creates an immutable Order primitive
 *
 * @param {Object} data - Order data
 * @param {string} data.id - Order ID
 * @param {string} data.date - ISO date string
 * @param {'online'|'instore'} data.type - Order type
 * @param {string} data.detailsUrl - Details URL
 * @param {string} [data.customerNumber] - Customer number (optional)
 * @returns {Readonly<Order>} Immutable Order object
 * @throws {Error} If required fields are missing or invalid
 */
export function createOrder({ id, date, type, detailsUrl, customerNumber }) {
  // Validate required fields
  if (!id || typeof id !== 'string') {
    throw new Error('Order.id is required and must be a string');
  }

  if (!date || typeof date !== 'string') {
    throw new Error('Order.date is required and must be a string');
  }

  // Validate ISO date format (YYYY-MM-DD)
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDatePattern.test(date)) {
    throw new Error('Order.date must be in ISO 8601 format (YYYY-MM-DD)');
  }

  if (!type || (type !== 'online' && type !== 'instore')) {
    throw new Error('Order.type must be "online" or "instore"');
  }

  if (!detailsUrl || typeof detailsUrl !== 'string') {
    throw new Error('Order.detailsUrl is required and must be a string');
  }

  // Validate URL format
  if (!detailsUrl.startsWith('https://www.staples.com')) {
    throw new Error('Order.detailsUrl must start with "https://www.staples.com"');
  }

  // Create immutable object
  return Object.freeze({
    id,
    date,
    type,
    detailsUrl,
    customerNumber: customerNumber || null
  });
}

/**
 * Validates if an object is a valid Order
 *
 * @param {*} obj - Object to validate
 * @returns {boolean} True if valid Order
 */
export function isValidOrder(obj) {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.date === 'string' &&
    (obj.type === 'online' || obj.type === 'instore') &&
    typeof obj.detailsUrl === 'string' &&
    obj.detailsUrl.startsWith('https://www.staples.com')
  );
}
