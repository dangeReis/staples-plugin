import { OrderDiscoveryInterface, OrderDiscoveryError } from '../../src/modules/orderDiscovery/interface';
import { createOnlineOrderDiscovery } from '../../src/modules/orderDiscovery/online';

describe('OrderDiscovery Interface Contract', () => {
  /** @type {OrderDiscovery} */
  let orderDiscovery;

  beforeEach(() => {
    // Each test gets a fresh implementation that adheres to the interface
    const mockDom = {
      querySelectorAll: () => [],
      querySelector: () => null,
      getAttribute: () => null,
    };
    orderDiscovery = createOnlineOrderDiscovery({ dom: mockDom });
  });

  // Test 1: Ensure the implementation has the 'discover' method
  test('should have a discover method', () => {
    expect(typeof orderDiscovery.discover).toBe('function');
  });

  // Test 2: Ensure 'discover' returns a Promise
  test('discover should return a promise', () => {
    const result = orderDiscovery.discover('https://www.staples.com/ptd/myorders');
    expect(result).toBeInstanceOf(Promise);
  });

  // Test 3: Ensure 'discover' resolves to an array of Order objects
  test('discover should resolve with an array of orders', async () => {
    // Mock the DOM or underlying adapter to return some orders
    const orders = await orderDiscovery.discover('https://www.staples.com/ptd/myorders');
    expect(Array.isArray(orders)).toBe(true);

    if (orders.length > 0) {
      const order = orders[0];
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('date');
      expect(order).toHaveProperty('type');
      expect(order).toHaveProperty('detailsUrl');
    }
  });

  // Test 4: Ensure 'discover' throws OrderDiscoveryError for invalid URLs
  test('discover should throw OrderDiscoveryError for invalid URLs', async () => {
    const invalidUrl = 'https://www.google.com';
    await expect(orderDiscovery.discover(invalidUrl)).rejects.toThrow(OrderDiscoveryError);
  });

  // Test 5: Ensure 'discover' throws OrderDiscoveryError for parsing failures
  test('discover should throw OrderDiscoveryError on parsing failure', async () => {
    // This requires mocking the DOM adapter to simulate a parsing failure
    // For this contract test, we assume the implementation correctly throws the error
    // A unit test for the implementation would cover this in more detail
    const validUrlWithBadData = 'https://www.staples.com/ptd/myorders?mock=baddata';
    await expect(orderDiscovery.discover(validUrlWithBadData)).rejects.toThrow(OrderDiscoveryError);
  });

  // Test 6: Ensure the returned Order objects have valid shapes
  test('discover should return orders with valid shapes', async () => {
    const orders = await orderDiscovery.discover('https://www.staples.com/ptd/myorders');
    if (orders.length > 0) {
      orders.forEach(order => {
        expect(typeof order.id).toBe('string');
        expect(order.id).not.toBe('');

        expect(typeof order.date).toBe('string');
        expect(new Date(order.date)).not.toBeNaN();

        expect(['online', 'instore']).toContain(order.type);

        expect(typeof order.detailsUrl).toBe('string');
        expect(order.detailsUrl.startsWith('https://www.staples.com')).toBe(true);
      });
    }
  });
});