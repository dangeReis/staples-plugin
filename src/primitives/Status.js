/**
 * Status primitive type
 * Represents system processing state
 * @module primitives/Status
 */

import { isValidActivity } from './Activity.js';

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

const MAX_ACTIVITIES = 10;

/**
 * Creates an immutable Status primitive
 *
 * @param {Object} data - Status data
 * @param {boolean} data.isProcessing - Processing state
 * @param {string} data.currentPage - Current page range
 * @param {StatusProgress} data.progress - Progress counters
 * @param {Array} data.activities - Activity log
 * @returns {Readonly<Status>} Status object
 * @throws {Error} If required fields are missing or invalid
 */
export function createStatus({ isProcessing, currentPage, progress, activities }) {
  if (typeof isProcessing !== 'boolean') {
    throw new Error('Status.isProcessing is required and must be a boolean');
  }

  if (!currentPage || typeof currentPage !== 'string') {
    throw new Error('Status.currentPage is required and must be a string');
  }

  const pagePattern = /^\d+-\d+$/;
  if (!pagePattern.test(currentPage)) {
    throw new Error('Status.currentPage must match pattern "N-M" (e.g., "1-25")');
  }

  if (!progress || typeof progress !== 'object') {
    throw new Error('Status.progress is required and must be an object');
  }

  const {
    transactionsFound,
    scheduled,
    completed,
    failed
  } = progress;

  const counters = {
    transactionsFound,
    scheduled,
    completed,
    failed
  };

  for (const [key, value] of Object.entries(counters)) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Status.progress.${key} must be a non-negative integer`);
    }
  }

  if (!Array.isArray(activities)) {
    throw new Error('Status.activities is required and must be an array');
  }

  if (activities.length > MAX_ACTIVITIES) {
    throw new Error(`Status.activities array must not exceed ${MAX_ACTIVITIES} items`);
  }

  const validatedActivities = activities.map((activity, index) => {
    if (!isValidActivity(activity)) {
      throw new Error(`Status.activities[${index}] must be a valid Activity`);
    }
    return activity;
  });

  const immutableProgress = Object.freeze({
    transactionsFound,
    scheduled,
    completed,
    failed
  });

  const immutableActivities = Object.freeze([...validatedActivities]);

  return Object.freeze({
    isProcessing,
    currentPage,
    progress: immutableProgress,
    activities: immutableActivities
  });
}

/**
 * Validates if an object is a valid Status
 *
 * @param {*} obj - Object to validate
 * @returns {boolean} True if valid Status
 */
export function isValidStatus(obj) {
  if (
    !obj ||
    typeof obj.isProcessing !== 'boolean' ||
    typeof obj.currentPage !== 'string' ||
    !obj.progress ||
    typeof obj.progress !== 'object' ||
    !Array.isArray(obj.activities) ||
    obj.activities.length > MAX_ACTIVITIES
  ) {
    return false;
  }

  const {
    transactionsFound,
    scheduled,
    completed,
    failed
  } = obj.progress;

  if (
    !Number.isInteger(transactionsFound) || transactionsFound < 0 ||
    !Number.isInteger(scheduled) || scheduled < 0 ||
    !Number.isInteger(completed) || completed < 0 ||
    !Number.isInteger(failed) || failed < 0
  ) {
    return false;
  }

  return obj.activities.every(isValidActivity);
}
