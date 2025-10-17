import { SchedulingError } from './interface.js';

export function createTimeBasedScheduler({ receiptGenerator, statusTracker }) {
  if (!receiptGenerator || !statusTracker) {
    throw new Error('Receipt generator and status tracker are required');
  }

  let orders = [];
  let rules = {};
  let progressCallback = () => {};

  return {
    schedule(newOrders, newRules) {
      if (!newOrders || !Array.isArray(newOrders) || newOrders.some(o => !o.id)) {
        throw new SchedulingError('Invalid orders array', { ordersCount: newOrders ? newOrders.length : 0 });
      }
      orders = newOrders;
      rules = newRules;
      const timing = new Map(orders.map((order, i) => [order.id, i * (rules.delayBetweenOrders || 0)]));
      return {
        total: orders.length,
        scheduled: orders,
        timing,
      };
    },
    async start() {
      for (const order of orders) {
        await new Promise(resolve => setTimeout(resolve, rules.delayBetweenOrders || 0));
        await receiptGenerator.generate(order, {});
        statusTracker.update({ type: 'progress', data: { completed: 1 } });
      }
    },
    stop() {
      // Mock implementation
    },
    onProgress(callback) {
      progressCallback = callback;
      return () => {
        progressCallback = () => {};
      };
    }
  };
}
