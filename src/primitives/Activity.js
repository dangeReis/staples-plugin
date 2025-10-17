export function createActivity({ type, message, timestamp }) {
  if (!type || !message || !timestamp) {
    throw new Error('Activity requires type, message, and timestamp');
  }

  if (!['info', 'success', 'error'].includes(type)) {
    throw new Error('Activity type must be info, success, or error');
  }

  if (!(timestamp instanceof Date)) {
    throw new Error('Activity timestamp must be a Date object');
  }

  return Object.freeze({ type, message, timestamp });
}
