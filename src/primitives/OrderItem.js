/**
 * OrderItem primitive type
 * Represents a single line item in an order or return
 * @module primitives/OrderItem
 */

/**
 * @typedef {Object} CouponDetail
 * @property {string} chargeName - Coupon/promotion name
 * @property {number} chargeAmount - Discount amount
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} skuNumber - Product SKU
 * @property {string} title - Product title/description
 * @property {string} image - Product image URL
 * @property {number} unitPrice - Price per unit before discounts
 * @property {number} qtyOrdered - Quantity ordered
 * @property {number} qtyShipped - Quantity shipped/fulfilled
 * @property {number} lineTotal - Line total after discounts
 * @property {number} couponTotal - Total coupon/discount amount
 * @property {CouponDetail[]} couponDetails - Breakdown of applied coupons
 * @property {number} taxTotal - Tax for this line
 * @property {number} status - Numeric status code
 * @property {string} statusDescription - Human-readable status
 */

/**
 * Creates an immutable OrderItem primitive
 *
 * @param {Object} data - Item data
 * @returns {Readonly<OrderItem>}
 * @throws {Error} If required fields are missing or invalid
 */
export function createOrderItem({
  skuNumber,
  title,
  image,
  unitPrice,
  qtyOrdered,
  qtyShipped,
  lineTotal,
  couponTotal,
  couponDetails,
  taxTotal,
  status,
  statusDescription,
}) {
  if (!skuNumber || typeof skuNumber !== 'string') {
    throw new Error('OrderItem requires a skuNumber string');
  }
  if (!title || typeof title !== 'string') {
    throw new Error('OrderItem requires a title string');
  }
  if (typeof unitPrice !== 'number' || unitPrice < 0) {
    throw new Error('OrderItem requires a non-negative unitPrice');
  }
  if (!Number.isInteger(qtyOrdered) || qtyOrdered < 0) {
    throw new Error('OrderItem requires a non-negative integer qtyOrdered');
  }
  if (!Number.isInteger(qtyShipped) || qtyShipped < 0) {
    throw new Error('OrderItem requires a non-negative integer qtyShipped');
  }
  if (typeof lineTotal !== 'number' || lineTotal < 0) {
    throw new Error('OrderItem requires a non-negative lineTotal');
  }

  const validatedCouponDetails = (couponDetails || []).map((c, i) => {
    if (!c.chargeName || typeof c.chargeAmount !== 'number') {
      throw new Error(`OrderItem.couponDetails[${i}] requires chargeName and chargeAmount`);
    }
    return Object.freeze({ chargeName: c.chargeName, chargeAmount: c.chargeAmount });
  });

  return Object.freeze({
    skuNumber,
    title,
    image: image || '',
    unitPrice,
    qtyOrdered,
    qtyShipped,
    lineTotal,
    couponTotal: couponTotal || 0,
    couponDetails: Object.freeze(validatedCouponDetails),
    taxTotal: taxTotal || 0,
    status: status || 0,
    statusDescription: statusDescription || '',
  });
}

/**
 * Validates if an object is a valid OrderItem
 * @param {*} obj
 * @returns {boolean}
 */
export function isValidOrderItem(obj) {
  return (
    obj &&
    typeof obj.skuNumber === 'string' && obj.skuNumber.length > 0 &&
    typeof obj.title === 'string' && obj.title.length > 0 &&
    typeof obj.unitPrice === 'number' && obj.unitPrice >= 0 &&
    Number.isInteger(obj.qtyOrdered) && obj.qtyOrdered >= 0 &&
    Number.isInteger(obj.qtyShipped) && obj.qtyShipped >= 0 &&
    typeof obj.lineTotal === 'number' && obj.lineTotal >= 0 &&
    Array.isArray(obj.couponDetails)
  );
}
