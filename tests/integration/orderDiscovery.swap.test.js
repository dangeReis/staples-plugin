import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { createOnlineOrderDiscovery } from '../../src/modules/orderDiscovery/online.js';
import { createStubOrderDiscovery } from '../stubs/orderDiscovery.stub.js';

describe('OrderDiscovery Swap Integration Test', () => {
  let realOrderDiscovery;
  let stubOrderDiscovery;

  beforeEach(() => {
    const mockDom = {
      querySelectorAll: () => [],
      querySelector: () => null,
      getAttribute: () => null,
    };
    realOrderDiscovery = createOnlineOrderDiscovery({ dom: mockDom });
    stubOrderDiscovery = createStubOrderDiscovery();
  });

  test('should be able to swap OrderDiscovery implementations', async () => {
    // Test with real implementation
    const realOrders = await realOrderDiscovery.discover('https://www.staples.com/ptd/myorders');
    expect(realOrders.length).toBeGreaterThan(0);
    expect(realOrders[0].id).toBe('12345');

    // Test with stub implementation
    const stubOrders = await stubOrderDiscovery.discover('https://www.staples.com/ptd/myorders');
    expect(stubOrders.length).toBe(2);
    expect(stubOrders[0].id).toBe('stub-1');
  });
});
