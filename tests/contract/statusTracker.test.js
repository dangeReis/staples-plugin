
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { StatusTrackerInterface, StatusTrackingError } from '../../src/modules/statusTracker/interface';
import { createChromeStorageStatusTracker } from '../../src/modules/statusTracker/chromeStorage';
import { createActivity } from '../../src/primitives/Activity';

describe('StatusTracker Interface Contract', () => {
  /** @type {StatusTracker} */
  let statusTracker;

  // Mock dependencies for the tracker
  const mockStorage = {
    get: jest.fn(),
    set: jest.fn(),
    onChange: { addListener: jest.fn(), removeListener: jest.fn() },
  };

  beforeEach(() => {
    statusTracker = createChromeStorageStatusTracker({ storage: mockStorage });
  });

  // Test 1: Ensure the implementation has all required methods
  test('should have update, getStatus, and onChange methods', () => {
    expect(typeof statusTracker.update).toBe('function');
    expect(typeof statusTracker.getStatus).toBe('function');
    expect(typeof statusTracker.onChange).toBe('function');
  });

  // Test 2: Ensure 'getStatus' returns a valid Status object
  test('getStatus should return a valid Status object', () => {
    // Mock storage to return a default status
    const defaultStatus = {
      isProcessing: false,
      currentPage: '1-25',
      progress: { transactionsFound: 0, scheduled: 0, completed: 0, failed: 0 },
      activities: [],
    };
    mockStorage.get.mockResolvedValue({ status: defaultStatus });

    const status = statusTracker.getStatus();

    expect(status).toBeDefined();
    expect(status).toHaveProperty('isProcessing');
    expect(status).toHaveProperty('currentPage');
    expect(status).toHaveProperty('progress');
    expect(status).toHaveProperty('activities');
    expect(typeof status.isProcessing).toBe('boolean');
    expect(typeof status.currentPage).toBe('string');
    expect(typeof status.progress).toBe('object');
    expect(Array.isArray(status.activities)).toBe(true);
  });

  // Test 3: Ensure 'onChange' returns an unsubscribe function
  test('onChange should return an unsubscribe function', () => {
    const callback = jest.fn();
    const unsubscribe = statusTracker.onChange(callback);
    expect(typeof unsubscribe).toBe('function');
  });

  // Test 4: Ensure 'update' does not throw for valid events
  test('update should not throw for valid events', () => {
    const progressEvent = { type: 'progress', data: { completed: 1 } };
    const activityEvent = { type: 'activity', data: createActivity({ type: 'info', message: 'Test', timestamp: new Date() }) };
    
    expect(() => statusTracker.update(progressEvent)).not.toThrow();
    expect(() => statusTracker.update(activityEvent)).not.toThrow();
  });

  // Test 5: Ensure 'update' throws StatusTrackingError for invalid events
  test('update should throw StatusTrackingError for invalid events', () => {
    const invalidEvent = { type: 'invalid-type', data: {} };
    expect(() => statusTracker.update(invalidEvent)).toThrow(StatusTrackingError);
    expect(() => statusTracker.update(null)).toThrow(StatusTrackingError);
  });

  // Test 6: Ensure 'onChange' callback is invoked on status change
  test('onChange callback should be fired on status change', () => {
    const callback = jest.fn();
    statusTracker.onChange(callback);

    // Simulate a change from the underlying storage
    const storageCallback = mockStorage.onChange.addListener.mock.calls[0][0];
    const newStatus = { ...statusTracker.getStatus(), isProcessing: true };
    storageCallback({ status: { newValue: newStatus } });

    expect(callback).toHaveBeenCalledWith(newStatus);
  });
});
