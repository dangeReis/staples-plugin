/**
 * Order primitive type
 * Supports two lifecycle states:
 *   1. Discovered — minimal fields from DOM scraping (id, date, type, detailsUrl)
 *   2. Enriched   — full fields from the orderDetails API response
 *
 * The `enriched` flag is auto-detected: true when items or financials are present.
 *
 * @module primitives/Order
 */

import { isValidOrderItem } from './OrderItem.js';
import { isValidReturnOrder } from './ReturnOrder.js';

/**
 * @typedef {Object} Financials
 * @property {number} merchandiseTotal  - Gross merchandise before discounts
 * @property {number} discountsTotal    - All discounts (coupons + promotions)
 * @property {number} couponsTotal      - Coupon-specific portion of discounts
 * @property {number} shippingTotal     - Shipping & handling fees
 * @property {number} taxesTotal        - Tax total
 * @property {number} grandTotal        - Final charged amount
 */

/**
 * @typedef {Object} StoreInfo
 * @property {string} storeNumber       - e.g. "542"
 * @property {string} addressLine1      - Street address
 * @property {string} city
 * @property {string} state             - Two-letter state code
 * @property {string} zipCode
 */

/**
 * @typedef {Object} Order
 * @property {string}  id                 - Order number (e.g. "POS.542.20250629.4.5137")
 * @property {string}  date               - Order date (ISO string from API or display date from DOM)
 * @property {string}  type               - "online" | "instore"
 * @property {string}  detailsUrl         - URL to the order details page
 * @property {string|null} customerNumber - Rewards / account number
 * @property {string|null} orderUrlKey    - Encrypted key for API calls (tp_sid)
 * @property {string|null} orderType      - API orderType param (e.g. "in-store_instore")
 * @property {string|null} enterpriseCode - e.g. "RetailUS"
 * @property {import('./OrderItem.js').OrderItem[]} items       - Line items (enriched only)
 * @property {import('./ReturnOrder.js').ReturnOrder[]} returns - Return orders (enriched only)
 * @property {Financials|null}  financials    - Order-level financial summary
 * @property {StoreInfo|null}   storeInfo     - Store details (in-store orders)
 * @property {string|null}      transactionBarCode - POS barcode string
 * @property {boolean}          isReturnable  - Whether the order can still be returned
 * @property {boolean}          enriched      - True if populated from API
 */

/**
 * Creates an immutable Order primitive.
 *
 * Minimal call (discovery phase):
 *   createOrder({ id, date, type, detailsUrl })
 *
 * Full call (after API enrichment):
 *   createOrder({ id, date, type, detailsUrl, items, financials, ... })
 *
 * @param {Object} data
 * @returns {Readonly<Order>}
 * @throws {Error} If required fields are missing
 */
export function createOrder({
  id,
  date,
  type,
  detailsUrl,
  customerNumber,
  orderUrlKey,
  orderType,
  enterpriseCode,
  items,
  returns,
  financials,
  storeInfo,
  transactionBarCode,
  isReturnable,
}) {
  // --- Required fields (both discovered and enriched) ---
  if (!id || typeof id !== 'string') {
    throw new Error('Order requires an id string');
  }
  if (!date || typeof date !== 'string') {
    throw new Error('Order requires a date string');
  }
  if (!type || typeof type !== 'string') {
    throw new Error('Order requires a type string');
  }
  if (!detailsUrl || typeof detailsUrl !== 'string') {
    throw new Error('Order requires a detailsUrl string');
  }

  // --- Validate items if provided ---
  const validatedItems = (items || []).map((item, i) => {
    if (!isValidOrderItem(item)) {
      throw new Error(`Order.items[${i}] is not a valid OrderItem`);
    }
    return item; // already frozen by createOrderItem
  });

  // --- Validate returns if provided ---
  const validatedReturns = (returns || []).map((ret, i) => {
    if (!isValidReturnOrder(ret)) {
      throw new Error(`Order.returns[${i}] is not a valid ReturnOrder`);
    }
    return ret; // already frozen by createReturnOrder
  });

  // --- Validate & freeze financials if provided ---
  let frozenFinancials = null;
  if (financials) {
    const requiredNumericFields = [
      'merchandiseTotal', 'discountsTotal', 'couponsTotal',
      'shippingTotal', 'taxesTotal', 'grandTotal',
    ];
    for (const field of requiredNumericFields) {
      if (typeof financials[field] !== 'number') {
        throw new Error(`Order.financials.${field} must be a number`);
      }
    }
    frozenFinancials = Object.freeze({
      merchandiseTotal: financials.merchandiseTotal,
      discountsTotal: financials.discountsTotal,
      couponsTotal: financials.couponsTotal,
      shippingTotal: financials.shippingTotal,
      taxesTotal: financials.taxesTotal,
      grandTotal: financials.grandTotal,
    });
  }

  // --- Validate & freeze storeInfo if provided ---
  let frozenStoreInfo = null;
  if (storeInfo) {
    if (!storeInfo.storeNumber || typeof storeInfo.storeNumber !== 'string') {
      throw new Error('Order.storeInfo.storeNumber must be a non-empty string');
    }
    frozenStoreInfo = Object.freeze({
      storeNumber: storeInfo.storeNumber,
      addressLine1: storeInfo.addressLine1 || '',
      city: storeInfo.city || '',
      state: storeInfo.state || '',
      zipCode: storeInfo.zipCode || '',
    });
  }

  // Auto-detect enriched: has items or financials from API
  const isEnriched = validatedItems.length > 0 || frozenFinancials !== null;

  return Object.freeze({
    id,
    date,
    type,
    detailsUrl,
    customerNumber: customerNumber || null,
    orderUrlKey: orderUrlKey || null,
    orderType: orderType || null,
    enterpriseCode: enterpriseCode || null,
    items: Object.freeze(validatedItems),
    returns: Object.freeze(validatedReturns),
    financials: frozenFinancials,
    storeInfo: frozenStoreInfo,
    transactionBarCode: transactionBarCode || null,
    isReturnable: Boolean(isReturnable),
    enriched: isEnriched,
  });
}

/**
 * Validates if an object is a valid Order (at minimum, discovered-level)
 * @param {*} obj
 * @returns {boolean}
 */
export function isValidOrder(obj) {
  return (
    obj &&
    typeof obj.id === 'string' && obj.id.length > 0 &&
    typeof obj.date === 'string' && obj.date.length > 0 &&
    typeof obj.type === 'string' && obj.type.length > 0 &&
    typeof obj.detailsUrl === 'string' && obj.detailsUrl.length > 0
  );
}
