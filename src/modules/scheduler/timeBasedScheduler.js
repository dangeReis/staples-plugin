import { SchedulingError } from '../scheduler/interface.js';

/**
 * @typedef {object} TimeBasedSchedulerDependencies
 * @property {object} receiptGenerator - The receipt generator module.
 * @property {object} statusTracker - The status tracker module.
 */

/**
 * Creates a time-based scheduler.
 * @param {TimeBasedSchedulerDependencies} dependencies - The dependencies for the scheduler.
 * @returns {object} The time-based scheduler instance.
 */
export function createTimeBasedScheduler(dependencies) {
  const { receiptGenerator, statusTracker } = dependencies || {};

  if (!receiptGenerator || typeof receiptGenerator.generate !== 'function') {
    throw new Error('A receiptGenerator with a generate method is required');
  }

  if (!statusTracker || typeof statusTracker.update !== 'function') {
    throw new Error('A statusTracker with an update method is required');
  }

  const progressSubscribers = new Set();

  let scheduledOrders = [];
  let timingRules = {
    delayBetweenOrders: 5000,
    maxConcurrent: 1,
    retryAttempts: 3,
  };
  let timingMap = new Map();
  let isRunning = false;
  let stopRequested = false;
  let processingPromise = null;

  const progressState = {
    scheduled: 0,
    completed: 0,
    failed: 0,
  };

  function notifyProgress() {
    const status = typeof statusTracker.getStatus === 'function'
      ? statusTracker.getStatus()
      : {
          isProcessing: isRunning && !stopRequested,
          progress: { ...progressState },
        };

    progressSubscribers.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error('Progress callback failed', error);
      }
    });
  }

  function buildTimingMap(orders, rules) {
    const map = new Map();
    if (!orders.length) {
      return map;
    }

    for (let index = 0; index < orders.length; index += 1) {
      const order = orders[index];
      const batch = Math.floor(index / rules.maxConcurrent);
      const delay = batch * rules.delayBetweenOrders;
      map.set(order.id, delay);
    }

    return map;
  }

  function validateOrders(orders) {
    if (!Array.isArray(orders) || orders.length === 0) {
      throw new SchedulingError('Orders must be a non-empty array', {
        ordersCount: Array.isArray(orders) ? orders.length : 0,
      });
    }

    orders.forEach((order) => {
      if (!order || typeof order.id !== 'string' || order.id.trim() === '') {
        throw new SchedulingError('Each order must have a valid id', {
          ordersCount: orders.length,
        });
      }
    });
  }

  async function processOrder(order) {
    let attempt = 0;
    while (attempt <= timingRules.retryAttempts) {
      if (stopRequested) {
        return;
      }

      try {
        await receiptGenerator.generate(order, { method: 'print' });
        progressState.completed += 1;
        statusTracker.update({
          type: 'progress',
          data: {
            completed: progressState.completed,
            scheduled: progressState.scheduled,
            failed: progressState.failed,
          },
        });
        statusTracker.update({
          type: 'activity',
          data: {
            type: 'success',
            message: `Downloaded order ${order.id}`,
            timestamp: new Date(),
          },
        });
        notifyProgress();
        return;
      } catch (error) {
        attempt += 1;
        if (attempt > timingRules.retryAttempts) {
          progressState.failed += 1;
          statusTracker.update({
            type: 'progress',
            data: {
              completed: progressState.completed,
              scheduled: progressState.scheduled,
              failed: progressState.failed,
            },
          });
          statusTracker.update({
            type: 'activity',
            data: {
              type: 'error',
              message: `Failed to download order ${order.id}`,
              timestamp: new Date(),
            },
          });
          notifyProgress();
          throw new SchedulingError('Failed to process scheduled orders', {
            ordersCount: progressState.scheduled,
            cause: error,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, timingRules.delayBetweenOrders));
      }
    }
  }

  async function runSchedule() {
    if (!scheduledOrders.length) {
      return;
    }

    const orderedSchedule = scheduledOrders
      .map((order) => ({ order, delay: timingMap.get(order.id) ?? 0 }))
      .sort((a, b) => a.delay - b.delay);

    const startTime = Date.now();

    for (const entry of orderedSchedule) {
      if (stopRequested) {
        break;
      }

      const waitTime = entry.delay - (Date.now() - startTime);
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      if (stopRequested) {
        break;
      }

      await processOrder(entry.order);
    }
  }

  return {
    schedule(orders, rules = {}) {
      validateOrders(orders);

      timingRules = {
        delayBetweenOrders: typeof rules.delayBetweenOrders === 'number' ? rules.delayBetweenOrders : 5000,
        maxConcurrent: typeof rules.maxConcurrent === 'number' && rules.maxConcurrent > 0 ? Math.floor(rules.maxConcurrent) : 1,
        retryAttempts: typeof rules.retryAttempts === 'number' && rules.retryAttempts >= 0
          ? Math.floor(rules.retryAttempts)
          : 3,
      };

      scheduledOrders = [...orders];
      progressState.scheduled = scheduledOrders.length;
      progressState.completed = 0;
      progressState.failed = 0;
      stopRequested = false;
      timingMap = buildTimingMap(scheduledOrders, timingRules);

      statusTracker.update({
        type: 'progress',
        data: {
          scheduled: progressState.scheduled,
          completed: progressState.completed,
          failed: progressState.failed,
        },
      });

      notifyProgress();

      return {
        total: scheduledOrders.length,
        scheduled: [...scheduledOrders],
        timing: new Map(timingMap),
      };
    },

    async start() {
      if (processingPromise) {
        return processingPromise;
      }

      isRunning = true;
      stopRequested = false;

      statusTracker.update({
        type: 'activity',
        data: {
          type: 'info',
          message: 'Download scheduler started',
          timestamp: new Date(),
        },
      });

      notifyProgress();

      processingPromise = (async () => {
        try {
          await runSchedule();
        } finally {
          isRunning = false;
          processingPromise = null;
          notifyProgress();
        }
      })();

      return processingPromise;
    },

    stop() {
      stopRequested = true;
      isRunning = false;
      notifyProgress();
    },

    onProgress(callback) {
      if (typeof callback !== 'function') {
        throw new Error('Progress callback must be a function');
      }

      progressSubscribers.add(callback);

      return () => {
        progressSubscribers.delete(callback);
      };
    },
  };
}
