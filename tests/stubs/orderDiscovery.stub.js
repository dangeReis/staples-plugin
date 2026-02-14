import { OrderDiscoveryInterface, OrderDiscoveryError } from '../../src/modules/orderDiscovery/interface.js';
import { createOrder } from '../../src/primitives/Order.js';

export function createStubOrderDiscovery() {
  return {
    /**
     * @implements {OrderDiscoveryInterface.discover}
     */
    async discover(pageUrl) {
      if (pageUrl.includes('invalid')) {
        throw new OrderDiscoveryError('Invalid URL in stub', { url: pageUrl });
      }
      return [
        createOrder({
          id: 'stub-1',
          date: '2025-01-01',
          type: 'online',
          detailsUrl: 'https://www.staples.com/stub/1',
          orderUrlKey: 'stub-url-key-1',
          orderType: 'online_dotcom',
        }),
        createOrder({
          id: 'stub-2',
          date: '2025-01-02',
          type: 'instore',
          detailsUrl: 'https://www.staples.com/stub/2',
          orderUrlKey: 'stub-url-key-2',
          orderType: 'in-store_instore',
        }),
      ];
    },
  };
}
