/**
 * ReceiptGenerator Interface Contract
 *
 * Purpose: Converts an order into a downloadable receipt
 *
 * This interface defines the contract that all ReceiptGenerator implementations
 * must follow. Implementations can use different methods (print, direct download)
 * without changing dependent modules.
 */

/**
 * @typedef {Object} Receipt
 * @property {string} orderId - References Order.id
 * @property {string} filename - Download filename with path (e.g., "staples/12345.pdf")
 * @property {Blob} blob - PDF binary data
 * @property {Date} generatedAt - Timestamp when receipt was generated
 * @property {'print'|'direct'} method - Generation method used
 * @property {boolean} includesImages - Whether images are included in PDF
 */

/**
 * @typedef {Object} GenerateOptions
 * @property {boolean} includeImages - Include images in PDF (default: true)
 * @property {'print'|'direct'} [method] - Preferred generation method
 */

/**
 * ReceiptGenerator Interface
 *
 * @interface ReceiptGenerator
 */
export const ReceiptGeneratorInterface = {
  /**
   * Generate receipt for an order
   *
   * @param {import('./OrderDiscovery.interface.js').Order} order - Order to generate receipt for
   * @param {GenerateOptions} options - Generation options
   * @returns {Promise<Receipt>} Generated receipt
   * @throws {ReceiptGenerationError} If receipt cannot be generated
   *
   * @example
   * const generator = createChromePrintReceiptGenerator({ tabs, debugger, downloads });
   * const receipt = await generator.generate(order, { includeImages: true, method: 'print' });
   * // returns: { orderId: '123', filename: 'staples/...', blob: Blob, ... }
   */
  generate: async (order, options) => {}
};

/**
 * ReceiptGenerationError
 *
 * Thrown when receipt generation fails
 */
export class ReceiptGenerationError extends Error {
  /**
   * @param {string} message - Error description
   * @param {Object} context - Error context
   * @param {string} context.orderId - Order ID that failed
   * @param {string} context.method - Method that was attempted
   * @param {Error} [context.cause] - Underlying error
   */
  constructor(message, { orderId, method, cause } = {}) {
    super(message);
    this.name = 'ReceiptGenerationError';
    this.orderId = orderId;
    this.method = method;
    this.cause = cause;
  }
}
