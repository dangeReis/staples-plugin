/**
 * Receipt primitive type
 * Represents a downloadable receipt document
 * @module primitives/Receipt
 */

/**
 * @typedef {Object} Receipt
 * @property {string} orderId - References Order.id
 * @property {string} filename - Download filename with path
 * @property {Blob} blob - PDF binary data
 * @property {Date} generatedAt - Timestamp when receipt was generated
 * @property {'print'|'direct'} method - Generation method
 * @property {boolean} includesImages - Whether images are included in PDF
 */

/**
 * Creates an immutable Receipt primitive
 *
 * @param {Object} data - Receipt data
 * @param {string} data.orderId - Order ID this receipt belongs to
 * @param {string} data.filename - Download filename (must end with .pdf)
 * @param {Blob} data.blob - PDF blob data
 * @param {Date} data.generatedAt - Generation timestamp
 * @param {'print'|'direct'} data.method - Generation method
 * @param {boolean} data.includesImages - Whether images included
 * @returns {Readonly<Receipt>} Immutable Receipt object
 * @throws {Error} If required fields are missing or invalid
 */
export function createReceipt({ orderId, filename, blob, generatedAt, method, includesImages }) {
  // Validate required fields
  if (!orderId || typeof orderId !== 'string') {
    throw new Error('Receipt.orderId is required and must be a string');
  }

  if (!filename || typeof filename !== 'string') {
    throw new Error('Receipt.filename is required and must be a string');
  }

  if (!filename.endsWith('.pdf')) {
    throw new Error('Receipt.filename must end with ".pdf"');
  }

  if (!blob || !(blob instanceof Blob)) {
    throw new Error('Receipt.blob is required and must be a Blob');
  }

  if (blob.type !== 'application/pdf') {
    throw new Error('Receipt.blob must have type "application/pdf"');
  }

  if (!generatedAt || !(generatedAt instanceof Date)) {
    throw new Error('Receipt.generatedAt is required and must be a Date');
  }

  if (!method || (method !== 'print' && method !== 'direct')) {
    throw new Error('Receipt.method must be "print" or "direct"');
  }

  if (typeof includesImages !== 'boolean') {
    throw new Error('Receipt.includesImages is required and must be a boolean');
  }

  // Create immutable object
  return Object.freeze({
    orderId,
    filename,
    blob,
    generatedAt,
    method,
    includesImages
  });
}

/**
 * Validates if an object is a valid Receipt
 *
 * @param {*} obj - Object to validate
 * @returns {boolean} True if valid Receipt
 */
export function isValidReceipt(obj) {
  return (
    obj &&
    typeof obj.orderId === 'string' &&
    typeof obj.filename === 'string' &&
    obj.filename.endsWith('.pdf') &&
    obj.blob instanceof Blob &&
    obj.blob.type === 'application/pdf' &&
    obj.generatedAt instanceof Date &&
    (obj.method === 'print' || obj.method === 'direct') &&
    typeof obj.includesImages === 'boolean'
  );
}
