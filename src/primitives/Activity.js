/**
 * Activity primitive type
 * Represents a single status event
 * @module primitives/Activity
 */

/**
 * @typedef {Object} Activity
 * @property {'info'|'success'|'error'} type - Event type
 * @property {string} message - Human-readable message
 * @property {Date} timestamp - When event occurred
 */

/**
 * Creates an immutable Activity primitive
 *
 * @param {Object} data - Activity data
 * @param {'info'|'success'|'error'} data.type - Event type
 * @param {string} data.message - Activity message
 * @param {Date} data.timestamp - Event timestamp
 * @returns {Readonly<Activity>} Immutable Activity object
 * @throws {Error} If required fields are missing or invalid
 */
export function createActivity({ type, message, timestamp }) {
  // Validate required fields
  if (!type || (type !== 'info' && type !== 'success' && type !== 'error')) {
    throw new Error('Activity.type must be "info", "success", or "error"');
  }

  if (!message || typeof message !== 'string') {
    throw new Error('Activity.message is required and must be a non-empty string');
  }

  if (!timestamp || !(timestamp instanceof Date)) {
    throw new Error('Activity.timestamp is required and must be a Date');
  }

  // Create immutable object
  return Object.freeze({
    type,
    message,
    timestamp
  });
}

/**
 * Validates if an object is a valid Activity
 *
 * @param {*} obj - Object to validate
 * @returns {boolean} True if valid Activity
 */
export function isValidActivity(obj) {
  return (
    obj &&
    (obj.type === 'info' || obj.type === 'success' || obj.type === 'error') &&
    typeof obj.message === 'string' &&
    obj.message.length > 0 &&
    obj.timestamp instanceof Date
  );
}
