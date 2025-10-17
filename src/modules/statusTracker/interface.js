/**
 * StatusTracker Interface Contract
 *
 * Purpose: Tracks progress and communicates state
 *
 * This interface defines the contract that all StatusTracker implementations
 * must follow. Implementations can use different storage mechanisms without
 * changing dependent modules.
 */

/**
 * @typedef {Object} Activity
 * @property {'info'|'success'|'error'} type - Event type
 * @property {string} message - Human-readable message
 * @property {Date} timestamp - When event occurred
 */

/**
 * @typedef {Object} Progress
 * @property {number} transactionsFound - Orders found on current page
 * @property {number} scheduled - Downloads scheduled
 * @property {number} completed - Downloads completed
 * @property {number} failed - Downloads failed
 */

/**
 * @typedef {Object} Status
 * @property {boolean} isProcessing - Whether system is currently processing
 * @property {string} currentPage - Page range being processed (e.g., "1-25")
 * @property {Progress} progress - Progress counters
 * @property {Activity[]} activities - Recent activity log (max 10 items)
 */

/**
 * @typedef {Object} StatusEvent
 * @property {'progress'|'activity'|'error'} type - Event type
 * @property {Object} data - Event-specific data
 */

/**
 * StatusTracker Interface
 *
 * @interface StatusTracker
 */
export const StatusTrackerInterface = {
  /**
   * Update status with new event
   *
   * @param {StatusEvent} event - Status event
   * @returns {void}
   * @throws {StatusTrackingError} If update fails
   *
   * @example
   * const tracker = createChromeStorageStatusTracker({ storage });
   * tracker.update({ type: 'progress', data: { completed: 5 } });
   * tracker.update({ type: 'activity', data: { type: 'success', message: 'Downloaded order 123' } });
   */
  update: (event) => {},

  /**
   * Get current status
   *
   * @returns {Status} Current status
   */
  getStatus: () => {},

  /**
   * Subscribe to status changes
   *
   * @param {function(Status): void} callback - Change callback
   * @returns {function(): void} Unsubscribe function
   *
   * @example
   * const unsubscribe = tracker.onChange((status) => {
   *   console.log(`Processing: ${status.isProcessing}`);
   * });
   * // Later: unsubscribe();
   */
  onChange: (callback) => {}
};

/**
 * StatusTrackingError
 *
 * Thrown when status tracking fails
 */
export class StatusTrackingError extends Error {
  /**
   * @param {string} message - Error description
   * @param {Object} context - Error context
   * @param {string} context.operation - Operation that failed
   * @param {Error} [context.cause] - Underlying error
   */
  constructor(message, { operation, cause } = {}) {
    super(message);
    this.name = 'StatusTrackingError';
    this.operation = operation;
    this.cause = cause;
  }
}
