
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { DownloadSchedulerInterface, SchedulingError } from '../../src/modules/scheduler/interface';
import { createTimeBasedScheduler } from '../../src/modules/scheduler/timeBasedScheduler';
import { createOrder } from '../../src/primitives/Order';
import { createChromePrintReceiptGenerator } from '../../src/modules/receiptGenerator/chromePrint';
import { createChromeStorageStatusTracker } from '../../src/modules/statusTracker/chromeStorage';

global.Blob = class Blob extends global.Blob {};

describe('DownloadScheduler Interface Contract', () => {
  /** @type {DownloadScheduler} */
  let scheduler;

  // Mock dependencies for the scheduler
  const mockReceiptGenerator = {
    generate: jest.fn(),
  };

  const mockStatusTracker = {
    update: jest.fn(),
    getStatus: jest.fn(),
    onChange: jest.fn(),
  };

  beforeEach(() => {
    scheduler = createTimeBasedScheduler({ 
      receiptGenerator: mockReceiptGenerator, 
      statusTracker: mockStatusTracker 
    });
  });

  // Test 1: Ensure the implementation has all required methods
  test('should have schedule, start, stop, and onProgress methods', () => {
    expect(typeof scheduler.schedule).toBe('function');
    expect(typeof scheduler.start).toBe('function');
    expect(typeof scheduler.stop).toBe('function');
    expect(typeof scheduler.onProgress).toBe('function');
  });

  // Test 2: Ensure 'schedule' returns a valid DownloadSchedule object
  test('schedule should return a valid DownloadSchedule object', () => {
    const orders = [
      createOrder({ id: '1', date: '2025-10-17', type: 'online', detailsUrl: '...' }),
      createOrder({ id: '2', date: '2025-10-18', type: 'online', detailsUrl: '...' }),
    ];
    const rules = { delayBetweenOrders: 100, maxConcurrent: 1, retryAttempts: 2 };

    const schedule = scheduler.schedule(orders, rules);

    expect(schedule).toBeDefined();
    expect(schedule).toHaveProperty('total', orders.length);
    expect(schedule).toHaveProperty('scheduled');
    expect(Array.isArray(schedule.scheduled)).toBe(true);
    expect(schedule.scheduled.length).toBe(orders.length);
    expect(schedule).toHaveProperty('timing');
    expect(schedule.timing).toBeInstanceOf(Map);
  });

  // Test 3: Ensure 'schedule' throws SchedulingError for invalid input
  test('schedule should throw SchedulingError for invalid orders array', () => {
    const rules = { delayBetweenOrders: 100, maxConcurrent: 1 };
    expect(() => scheduler.schedule(null, rules)).toThrow(SchedulingError);
    expect(() => scheduler.schedule([{}], rules)).toThrow(SchedulingError); // Invalid order object
  });

  // Test 4: Ensure 'start' returns a Promise
  test('start should return a promise', () => {
    const result = scheduler.start();
    expect(result).toBeInstanceOf(Promise);
  });

  // Test 5: Ensure 'onProgress' returns an unsubscribe function
  test('onProgress should return an unsubscribe function', () => {
    const callback = jest.fn();
    const unsubscribe = scheduler.onProgress(callback);
    expect(typeof unsubscribe).toBe('function');
  });

  // Test 6: Ensure 'stop' is a function and does not throw
  test('stop should be a function and not throw', () => {
    expect(() => scheduler.stop()).not.toThrow();
  });

  // Test 7: Ensure 'start' eventually resolves when processing is complete
  test('start should resolve when all orders are processed', async () => {
    const orders = [
      createOrder({ id: '3', date: '2025-10-19', type: 'online', detailsUrl: '...' })
    ];
    scheduler.schedule(orders, { delayBetweenOrders: 10, maxConcurrent: 1 });

    // Mock generator to resolve immediately
    mockReceiptGenerator.generate.mockResolvedValue({ orderId: '3', blob: new Blob() });

    // The start promise should resolve once the single order is processed
    await expect(scheduler.start()).resolves.toBeUndefined();
  });
});
