import { describe, test, expect, beforeEach } from '@jest/globals';
import { createRequire } from 'module';
import { createOrderDetailsApi } from '../../src/modules/orderDetails/api.js';
import { createStubOrderDetails } from '../stubs/orderDetails.stub.js';
import { createMockFetchAdapter } from '../../src/adapters/mocks.js';
import { createOrder } from '../../src/primitives/Order.js';
import { isValidOrder } from '../../src/primitives/Order.js';

const require = createRequire(import.meta.url);
const fixtureData = require('../stubs/fixtures/orderDetailsResponse.json');

describe('OrderDetails Swap Integration Test', () => {
  let realOrderDetails;
  let stubOrderDetails;
  let discoveredOrder;

  beforeEach(() => {
    // "Real" implementation — using mock fetch (same fixture data, different code path)
    const mockFetch = createMockFetchAdapter({
      'orderdetails': { status: 200, ok: true, data: fixtureData },
    });
    realOrderDetails = createOrderDetailsApi({ fetch: mockFetch });

    // Stub implementation — thin wrapper, same fixture
    stubOrderDetails = createStubOrderDetails();

    discoveredOrder = createOrder({
      id: 'POS.542.20250629.4.5137',
      date: '2025-06-29',
      type: 'instore',
      detailsUrl: 'https://www.staples.com/ptd/orderdetails?tp_sid=abc',
      orderUrlKey: 'test-url-key-swap',
      orderType: 'in-store_instore',
    });
  });

  test('should be able to swap OrderDetails implementations', async () => {
    // Both implementations should produce equivalent enriched orders
    const realEnriched = await realOrderDetails.enrich(discoveredOrder);
    const stubEnriched = await stubOrderDetails.enrich(discoveredOrder);

    // Both should be valid enriched orders
    expect(isValidOrder(realEnriched)).toBe(true);
    expect(isValidOrder(stubEnriched)).toBe(true);
    expect(realEnriched.enriched).toBe(true);
    expect(stubEnriched.enriched).toBe(true);

    // Same order ID from the fixture
    expect(realEnriched.id).toBe(stubEnriched.id);
    expect(realEnriched.id).toBe('POS.542.20250629.4.5137');

    // Same number of items and returns
    expect(realEnriched.items.length).toBe(stubEnriched.items.length);
    expect(realEnriched.returns.length).toBe(stubEnriched.returns.length);

    // Same financials
    expect(realEnriched.financials.grandTotal).toBe(stubEnriched.financials.grandTotal);
    expect(realEnriched.financials.merchandiseTotal).toBe(stubEnriched.financials.merchandiseTotal);
  });

  test('both implementations preserve discovered order fields', async () => {
    const realEnriched = await realOrderDetails.enrich(discoveredOrder);
    const stubEnriched = await stubOrderDetails.enrich(discoveredOrder);

    // Both should preserve the original type and detailsUrl
    expect(realEnriched.type).toBe('instore');
    expect(stubEnriched.type).toBe('instore');
    expect(realEnriched.detailsUrl).toBe(discoveredOrder.detailsUrl);
    expect(stubEnriched.detailsUrl).toBe(discoveredOrder.detailsUrl);
  });
});
