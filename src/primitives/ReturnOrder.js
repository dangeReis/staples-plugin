/**
 * ReturnOrder primitive type
 * Represents a return against a parent order
 * @module primitives/ReturnOrder
 */

import { isValidOrderItem } from './OrderItem.js';

/**
 * @typedef {Object} ReturnOrder
 * @property {string} returnOrderNumber - Return order identifier (e.g., "POS.522.20250629.1.18628")
 * @property {string} masterOrderNumber - Parent order this return is against
 * @property {string} returnedDate - ISO date string when return was initiated
 * @property {string} dispositionType - Return method (e.g., "CSR_CONTACT", "RETURN_LABEL", "PICKUP")
 * @property {number} statusCode - Numeric status (e.g., 1400 = Return Complete)
 * @property {string} statusDescription - Human-readable status
 * @property {number} merchandiseTotal - Gross merchandise value of returned items
 * @property {number} couponTotal - Coupon adjustments on returned items
 * @property {number} shippingRefund - Shipping portion of refund
 * @property {number} taxRefund - Tax portion of refund
 * @property {number} refundTotal - Net refund amount (grandTotal)
 * @property {import('./OrderItem.js').OrderItem[]} items - Returned line items
 * @property {string|null} orderUrlKey - Encrypted key to fetch return details
 */

/**
 * Creates an immutable ReturnOrder primitive
 *
 * @param {Object} data - Return data
 * @returns {Readonly<ReturnOrder>}
 * @throws {Error} If required fields are missing or invalid
 */
export function createReturnOrder({
  returnOrderNumber,
  masterOrderNumber,
  returnedDate,
  dispositionType,
  statusCode,
  statusDescription,
  merchandiseTotal,
  couponTotal,
  shippingRefund,
  taxRefund,
  refundTotal,
  items,
  orderUrlKey,
}) {
  if (!returnOrderNumber || typeof returnOrderNumber !== 'string') {
    throw new Error('ReturnOrder requires a returnOrderNumber string');
  }
  if (!masterOrderNumber || typeof masterOrderNumber !== 'string') {
    throw new Error('ReturnOrder requires a masterOrderNumber string');
  }
  if (!returnedDate || typeof returnedDate !== 'string') {
    throw new Error('ReturnOrder requires a returnedDate string');
  }
  if (typeof refundTotal !== 'number' || refundTotal < 0) {
    throw new Error('ReturnOrder requires a non-negative refundTotal');
  }
  if (!Array.isArray(items)) {
    throw new Error('ReturnOrder requires an items array');
  }

  const validatedItems = items.map((item, i) => {
    if (!isValidOrderItem(item)) {
      throw new Error(`ReturnOrder.items[${i}] is not a valid OrderItem`);
    }
    return item;
  });

  return Object.freeze({
    returnOrderNumber,
    masterOrderNumber,
    returnedDate,
    dispositionType: dispositionType || 'UNKNOWN',
    statusCode: statusCode || 0,
    statusDescription: statusDescription || '',
    merchandiseTotal: merchandiseTotal || 0,
    couponTotal: couponTotal || 0,
    shippingRefund: shippingRefund || 0,
    taxRefund: taxRefund || 0,
    refundTotal,
    items: Object.freeze(validatedItems),
    orderUrlKey: orderUrlKey || null,
  });
}

/**
 * Validates if an object is a valid ReturnOrder
 * @param {*} obj
 * @returns {boolean}
 */
export function isValidReturnOrder(obj) {
  return (
    obj &&
    typeof obj.returnOrderNumber === 'string' && obj.returnOrderNumber.length > 0 &&
    typeof obj.masterOrderNumber === 'string' && obj.masterOrderNumber.length > 0 &&
    typeof obj.returnedDate === 'string' && obj.returnedDate.length > 0 &&
    typeof obj.refundTotal === 'number' && obj.refundTotal >= 0 &&
    Array.isArray(obj.items) &&
    obj.items.every(isValidOrderItem)
  );
}
