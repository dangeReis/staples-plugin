/**
 * DownloadScheduler Interface Contract
 *
 * Purpose: Manages timing and queuing of downloads
 *
 * This interface defines the contract that all DownloadScheduler implementations
 * must follow. Implementations can use different scheduling strategies without
 * changing dependent modules.
 */

/**
 * @typedef {Object} DownloadSchedule
 * @property {number} total - Total orders to download
 * @property {import('./OrderDiscovery.interface.js').Order[]} scheduled - Orders scheduled for download
 * @property {Map<string, number>} timing - Map of order ID to delay in milliseconds
 */

/**
 * @typedef {Object} TimingRules
 * @property {number} delayBetweenOrders - Milliseconds between orders (default: 5000)
 * @property {number} maxConcurrent - Max concurrent downloads (default: 1)
 * @property {number} retryAttempts - Number of retry attempts on failure (default: 3)
 */

/**
 * DownloadScheduler Interface
 *
 * @interface DownloadScheduler
 */
export const DownloadSchedulerInterface = {
  /**
   * Schedule orders for download
   *
   * @param {import('./OrderDiscovery.interface.js').Order[]} orders - Orders to download
   * @param {TimingRules} rules - Timing rules
   * @returns {DownloadSchedule} Schedule information
   * @throws {SchedulingError} If scheduling fails
   *
   * @example
   * const scheduler = createTimeBasedScheduler({ receiptGenerator, statusTracker });
   * const schedule = scheduler.schedule(orders, { delayBetweenOrders: 5000, maxConcurrent: 1 });
   */
  schedule: (orders, rules) => {},

  /**
   * Start processing scheduled downloads
   *
   * @returns {Promise<void>} Resolves when all downloads complete or scheduler is stopped
   * @throws {SchedulingError} If processing fails fatally
   */
  start: async () => {},

  /**
   * Stop processing
   * Cancels all pending downloads and stops scheduler
   *
   * @returns {void}
   */
  stop: () => {},

  /**
   * Subscribe to progress updates
   *
   * @param {function(import('./StatusTracker.interface.js').Status): void} callback - Progress callback
   * @returns {function(): void} Unsubscribe function
   *
   * @example
   * const unsubscribe = scheduler.onProgress((status) => {
   *   console.log(`Progress: ${status.progress.completed}/${status.progress.scheduled}`);
   * });
   * // Later: unsubscribe();
   */
  onProgress: (callback) => {}
};

/**
 * SchedulingError
 *
 * Thrown when scheduling fails
 */
export class SchedulingError extends Error {
  /**
   * @param {string} message - Error description
   * @param {Object} context - Error context
   * @param {number} context.ordersCount - Number of orders being scheduled
   * @param {Error} [context.cause] - Underlying error
   */
  constructor(message, { ordersCount, cause } = {}) {
    super(message);
    this.name = 'SchedulingError';
    this.ordersCount = ordersCount;
    this.cause = cause;
  }
}
