import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { createOnlineOrderDiscovery } from '../../src/modules/orderDiscovery/online.js';
import { createStubOrderDiscovery } from '../stubs/orderDiscovery.stub.js';

describe('OrderDiscovery Swap Integration Test', () => {
  let realOrderDiscovery;
  let stubOrderDiscovery;

  beforeEach(() => {
    const mockDom = {
      querySelectorAll: (selector) => {
        if (selector === '.order-item') {
          return [
            {
              getAttribute: (attr) => {
                if (attr === 'data-order-id') return 'mock-real-1';
                if (attr === 'data-order-date') return '2025-10-17';
                if (attr === 'data-order-details-url') return 'https://www.staples.com/mock-real/1';
                return null;
              }
            },
            {
              getAttribute: (attr) => {
                if (attr === 'data-order-id') return 'mock-real-2';
                if (attr === 'data-order-date') return '2025-10-18';
                if (attr === 'data-order-details-url') return 'https://www.staples.com/mock-real/2';
                return null;
              }
            },
          ];
        }
        return [];
      },
      querySelector: () => null,
      getAttribute: (element, attr) => element.getAttribute(attr),
    };
    realOrderDiscovery = createOnlineOrderDiscovery({ dom: mockDom });
    stubOrderDiscovery = createStubOrderDiscovery();
  });

  test('should be able to swap OrderDiscovery implementations', async () => {
    // Test with real implementation
    const realOrders = await realOrderDiscovery.discover('https://www.staples.com/ptd/myorders');
    expect(realOrders.length).toBeGreaterThan(0);
    expect(realOrders[0].id).toBe('mock-real-1');

    // Test with stub implementation
    const stubOrders = await stubOrderDiscovery.discover('https://www.staples.com/ptd/myorders');
    expect(stubOrders.length).toBe(2);
    expect(stubOrders[0].id).toBe('stub-1');
  });
});
