/**
 * Status primitive type
 * Represents system processing state
 * @module primitives/Status
 */

/**
 * @typedef {Object} StatusProgress
 * @property {number} transactionsFound - Orders found on current page
 * @property {number} scheduled - Downloads scheduled
 * @property {number} completed - Downloads completed
 * @property {number} failed - Downloads failed
 */

/**
 * @typedef {Object} Status
 * @property {boolean} isProcessing - Whether system is currently processing
 * @property {string} currentPage - Page range being processed (e.g., "1-25")
 * @property {StatusProgress} progress - Progress counters
 * @property {Array<import('./Activity.js').Activity>} activities - Recent activity log (max 10)
 */

/**
 * Creates a Status object
 *
 * @param {Object} data - Status data
 * @param {boolean} data.isProcessing - Processing state
 * @param {string} data.currentPage - Current page range
 * @param {StatusProgress} data.progress - Progress counters
 * @param {Array} data.activities - Activity log
 * @returns {Status} Status object
 * @throws {Error} If required fields are missing or invalid
 */
export function createStatus({ isProcessing, currentPage, progress, activities }) {
  // Validate required fields
  if (typeof isProcessing !== 'boolean') {
    throw new Error('Status.isProcessing is required and must be a boolean');
  }

  if (!currentPage || typeof currentPage !== 'string') {
    throw new Error('Status.currentPage is required and must be a string');
  }

  // Validate page format (N-M pattern)
  const pagePattern = /^\d+-\d+$/;
  if (!pagePattern.test(currentPage)) {
    throw new Error('Status.currentPage must match pattern "N-M" (e.g., "1-25")');
  }

  if (!progress || typeof progress !== 'object') {
    throw new Error('Status.progress is required and must be an object');
  }

  // Validate progress counters
  const { transactionsFound, scheduled, completed, failed } = progress;
  if (typeof transactionsFound !== 'number' || transactionsFound < 0) {
    throw new Error('Status.progress.transactionsFound must be a non-negative number');
  }
  if (typeof scheduled !== 'number' || scheduled < 0) {
    throw new Error('Status.progress.scheduled must be a non-negative number');
  }
  if (typeof completed !== 'number' || completed < 0) {
    throw new Error('Status.progress.completed must be a non-negative number');
  }
  if (typeof failed !== 'number' || failed < 0) {
    throw new Error('Status.progress.failed must be a non-negative number');
  }

  if (!Array.isArray(activities)) {
    throw new Error('Status.activities is required and must be an array');
  }

  if (activities.length > 10) {
    throw new Error('Status.activities array must not exceed 10 items');
  }

  // Create status object (mutable for frequent updates)
  return {
    isProcessing,
    currentPage,
    progress: { ...progress },
    activities: [...activities]
  };
}

/**
 * Validates if an object is a valid Status
 *
 * @param {*} obj - Object to validate
 * @returns {boolean} True if valid Status
 */
export function isValidStatus(obj) {
  return (
    obj &&
    typeof obj.isProcessing === 'boolean' &&
    typeof obj.currentPage === 'string' &&
    obj.progress &&
    typeof obj.progress.transactionsFound === 'number' &&
    typeof obj.progress.scheduled === 'number' &&
    typeof obj.progress.completed === 'number' &&
    typeof obj.progress.failed === 'number' &&
    Array.isArray(obj.activities) &&
    obj.activities.length <= 10
  );
}
