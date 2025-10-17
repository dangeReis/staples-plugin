import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createChromeStorageStatusTracker } from '../../../src/modules/statusTracker/chromeStorage.js';
import { StatusTrackingError } from '../../../src/modules/statusTracker/interface.js';

describe('createChromeStorageStatusTracker', () => {
  let storageMock;

  beforeEach(() => {
    storageMock = {
      onChange: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
    };
  });

  it('updates progress information when receiving progress events', () => {
    const tracker = createChromeStorageStatusTracker({ storage: storageMock });

    tracker.update({ type: 'progress', data: { completed: 3 } });

    expect(tracker.getStatus()).toMatchObject({
      progress: {
        transactionsFound: 0,
        scheduled: 0,
        completed: 3,
        failed: 0,
      },
    });
  });

  it('records activity events and trims to the latest 10 entries', () => {
    const tracker = createChromeStorageStatusTracker({ storage: storageMock });

    for (let i = 0; i < 12; i += 1) {
      tracker.update({
        type: 'activity',
        data: {
          type: 'info',
          message: `event-${i}`,
          timestamp: new Date(),
        },
      });
    }

    const { activities } = tracker.getStatus();
    expect(activities).toHaveLength(10);
    expect(activities[0].message).toBe('event-2');
    expect(activities[activities.length - 1].message).toBe('event-11');
  });

  it('throws a StatusTrackingError for unknown event types', () => {
    const tracker = createChromeStorageStatusTracker({ storage: storageMock });

    expect(() => tracker.update({ type: 'unknown', data: {} })).toThrow(StatusTrackingError);
  });

  it('subscribes to storage changes and returns an unsubscribe handler', () => {
    const tracker = createChromeStorageStatusTracker({ storage: storageMock });
    const callback = jest.fn();

    const unsubscribe = tracker.onChange(callback);
    expect(storageMock.onChange.addListener).toHaveBeenCalledTimes(1);

    const listener = storageMock.onChange.addListener.mock.calls[0][0];
    const newStatus = { isProcessing: true };
    listener({ status: { newValue: newStatus } }, 'local');

    expect(callback).toHaveBeenCalledWith(newStatus);

    unsubscribe();
    expect(storageMock.onChange.removeListener).toHaveBeenCalledWith(listener);
  });
});
