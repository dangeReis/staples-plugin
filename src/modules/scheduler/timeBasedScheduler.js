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
  const defaultTimingRules = {
    delayBetweenOrders: 5000,
    maxConcurrent: 1,
    retryAttempts: 3,
    initialDelay: 0,
    perOrderOffsets: null,
    getOrderDelay: null,
    getOrderOffset: null,
    minimumDelay: 0,
  };

  let timingRules = { ...defaultTimingRules };
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

  function normalizeTimingRules(rules = {}) {
    const sanitized = { ...defaultTimingRules };

    const normalizeNumber = (value, { min = null, defaultValue = 0, integer = false } = {}) => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return defaultValue;
      }

      const normalized = integer ? Math.trunc(value) : value;
      if (min !== null && normalized < min) {
        return defaultValue;
      }

      return normalized;
    };

    sanitized.delayBetweenOrders = normalizeNumber(rules.delayBetweenOrders, {
      min: 0,
      defaultValue: defaultTimingRules.delayBetweenOrders,
    });

    sanitized.maxConcurrent = normalizeNumber(rules.maxConcurrent, {
      min: 1,
      defaultValue: defaultTimingRules.maxConcurrent,
      integer: true,
    }) || defaultTimingRules.maxConcurrent;

    sanitized.retryAttempts = normalizeNumber(rules.retryAttempts, {
      min: 0,
      defaultValue: defaultTimingRules.retryAttempts,
      integer: true,
    });

    sanitized.initialDelay = normalizeNumber(rules.initialDelay, {
      min: 0,
      defaultValue: defaultTimingRules.initialDelay,
    });

    sanitized.minimumDelay = normalizeNumber(rules.minimumDelay, {
      min: 0,
      defaultValue: defaultTimingRules.minimumDelay,
    });

    const offsetSources = [
      rules.perOrderOffsets,
      rules.orderOffsets,
      rules.timingOffsets,
      rules.perOrderTimingOffsets,
    ];

    let offsetsMap = null;
    for (const source of offsetSources) {
      if (!source) {
        continue;
      }

      if (source instanceof Map) {
        offsetsMap = source;
        break;
      }

      if (typeof source === 'object') {
        offsetsMap = new Map(Object.entries(source));
        break;
      }
    }

    sanitized.perOrderOffsets = offsetsMap;

    const delayResolvers = [rules.getOrderDelay, rules.calculateDelay];
    sanitized.getOrderDelay = delayResolvers.find((resolver) => typeof resolver === 'function') || null;

    const offsetResolvers = [rules.getOrderOffset, rules.getTimingOffset, rules.computeOrderOffset];
    sanitized.getOrderOffset = offsetResolvers.find((resolver) => typeof resolver === 'function') || null;

    return sanitized;
  }

  function resolveOverride(baseDelay, override, { defaultMode = 'offset' } = {}) {
    if (override == null) {
      return null;
    }

    const coerceNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

    if (typeof override === 'number') {
      const value = coerceNumber(override);
      if (value == null) {
        return null;
      }
      return defaultMode === 'absolute' ? value : baseDelay + value;
    }

    if (typeof override === 'object') {
      const absolute = coerceNumber(override.absolute ?? override.delay ?? override.value);
      if (absolute != null) {
        return absolute;
      }

      const offset = coerceNumber(override.offset ?? override.delta ?? override.increment);
      if (offset != null) {
        return baseDelay + offset;
      }
    }

    return null;
  }

  function buildTimingMap(orders, rules) {
    const map = new Map();
    if (!orders.length) {
      return map;
    }

    for (let index = 0; index < orders.length; index += 1) {
      const order = orders[index];
      const batch = Math.floor(index / rules.maxConcurrent);
      const baseDelay = rules.initialDelay + batch * rules.delayBetweenOrders;

      const context = { order, index, baseDelay, rules };

      let resolvedDelay = null;

      if (rules.getOrderDelay) {
        resolvedDelay = resolveOverride(baseDelay, rules.getOrderDelay(context), { defaultMode: 'absolute' });
      }

      if (resolvedDelay == null && rules.getOrderOffset) {
        resolvedDelay = resolveOverride(baseDelay, rules.getOrderOffset(context), { defaultMode: 'offset' });
      }

      if (resolvedDelay == null && rules.perOrderOffsets && rules.perOrderOffsets.has(order.id)) {
        resolvedDelay = resolveOverride(baseDelay, rules.perOrderOffsets.get(order.id), { defaultMode: 'offset' });
      }

      const timingData = order && typeof order.timing === 'object' ? order.timing : null;
      if (resolvedDelay == null && timingData) {
        if (typeof timingData.delay === 'number' || typeof timingData.absolute === 'number') {
          resolvedDelay = resolveOverride(baseDelay, timingData.delay ?? timingData.absolute, { defaultMode: 'absolute' });
        }

        if (resolvedDelay == null && (typeof timingData.offset === 'number' || typeof timingData.offsetMs === 'number')) {
          resolvedDelay = resolveOverride(baseDelay, timingData.offset ?? timingData.offsetMs, { defaultMode: 'offset' });
        }
      }

      if (resolvedDelay == null && typeof order.delay === 'number') {
        resolvedDelay = resolveOverride(baseDelay, order.delay, { defaultMode: 'absolute' });
      }

      if (resolvedDelay == null && typeof order.offset === 'number') {
        resolvedDelay = resolveOverride(baseDelay, order.offset, { defaultMode: 'offset' });
      }

      const finalDelay = resolvedDelay != null ? resolvedDelay : baseDelay;
      const sanitizedDelay = Math.max(rules.minimumDelay, Math.max(0, Math.round(finalDelay)));

      map.set(order.id, sanitizedDelay);
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

      timingRules = normalizeTimingRules(rules);

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
