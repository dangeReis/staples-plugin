import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createTimeBasedScheduler } from '../../../src/modules/scheduler/timeBasedScheduler.js';
import { SchedulingError } from '../../../src/modules/scheduler/interface.js';

describe('createTimeBasedScheduler', () => {
  let receiptGenerator;
  let statusTracker;

  beforeEach(() => {
    receiptGenerator = {
      generate: jest.fn().mockResolvedValue(undefined),
    };
    statusTracker = {
      update: jest.fn(),
    };
    jest.useRealTimers();
  });

  it('builds a schedule with per-order timing offsets', () => {
    const scheduler = createTimeBasedScheduler({ receiptGenerator, statusTracker });
    const orders = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const rules = { delayBetweenOrders: 250 };

    const schedule = scheduler.schedule(orders, rules);

    expect(schedule.total).toBe(3);
    expect(schedule.scheduled).toEqual(orders);
    expect(schedule.timing).toBeInstanceOf(Map);
    expect(Array.from(schedule.timing.entries())).toEqual([
      ['1', 0],
      ['2', 250],
      ['3', 500],
    ]);
  });

  it('throws a SchedulingError when orders are invalid', () => {
    const scheduler = createTimeBasedScheduler({ receiptGenerator, statusTracker });

    expect(() => scheduler.schedule([{ noId: true }], {})).toThrow(SchedulingError);
  });

  it('processes each order sequentially when started', async () => {
    jest.useFakeTimers();
    const scheduler = createTimeBasedScheduler({ receiptGenerator, statusTracker });
    const orders = [{ id: 'one' }, { id: 'two' }];
    scheduler.schedule(orders, { delayBetweenOrders: 100 });

    const startPromise = scheduler.start();

    await jest.advanceTimersByTimeAsync(200);
    await startPromise;

    expect(receiptGenerator.generate).toHaveBeenCalledTimes(2);
    expect(receiptGenerator.generate).toHaveBeenNthCalledWith(1, orders[0], {});
    expect(receiptGenerator.generate).toHaveBeenNthCalledWith(2, orders[1], {});
    expect(statusTracker.update).toHaveBeenCalledTimes(2);
    expect(statusTracker.update).toHaveBeenCalledWith({ type: 'progress', data: { completed: 1 } });
  });

  it('provides an unsubscribe function for progress listeners', () => {
    const scheduler = createTimeBasedScheduler({ receiptGenerator, statusTracker });
    const callback = jest.fn();

    const unsubscribe = scheduler.onProgress(callback);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
    // Should not throw when called multiple times
    expect(() => unsubscribe()).not.toThrow();
  });
});
