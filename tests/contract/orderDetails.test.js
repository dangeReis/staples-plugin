import { describe, test, expect, beforeEach } from '@jest/globals';
import { OrderDetailsError } from '../../src/modules/orderDetails/interface.js';
import { createStubOrderDetails } from '../stubs/orderDetails.stub.js';
import { createOrder } from '../../src/primitives/Order.js';
import { isValidOrder } from '../../src/primitives/Order.js';
import { isValidOrderItem } from '../../src/primitives/OrderItem.js';
import { isValidReturnOrder } from '../../src/primitives/ReturnOrder.js';

describe('OrderDetails Interface Contract', () => {
  /** @type {{ enrich: Function }} */
  let orderDetails;
  /** @type {import('../../src/primitives/Order.js').Order} */
  let discoveredOrder;

  beforeEach(() => {
    orderDetails = createStubOrderDetails();

    // A minimal discovered order with the fields needed for enrichment
    discoveredOrder = createOrder({
      id: 'POS.542.20250629.4.5137',
      date: '2025-06-29',
      type: 'instore',
      detailsUrl: 'https://www.staples.com/ptd/orderdetails?tp_sid=abc123',
      orderUrlKey: 'U3RNREdzdUtUK0J5NEcvNlBReEltTXhlMEtSbktWRCtOYnk5T0pVM21TL3hpYmV5VUk1b0MvQmI5VGRKUURFZkNEZmRkT1pXZlozdEMzb3ZUVlNBN0lqZz09',
      orderType: 'in-store_instore',
    });
  });

  // Test 1: Interface has enrich method
  test('should have an enrich method', () => {
    expect(typeof orderDetails.enrich).toBe('function');
  });

  // Test 2: enrich returns a Promise
  test('enrich should return a promise', () => {
    const result = orderDetails.enrich(discoveredOrder);
    expect(result).toBeInstanceOf(Promise);
  });

  // Test 3: enrich resolves with an enriched Order
  test('enrich should resolve with an enriched Order', async () => {
    const enriched = await orderDetails.enrich(discoveredOrder);

    expect(isValidOrder(enriched)).toBe(true);
    expect(enriched.enriched).toBe(true);
    expect(enriched.id).toBe('POS.542.20250629.4.5137');
  });

  // Test 4: enriched Order has items array with valid OrderItem shapes
  test('enrich should populate items with valid OrderItem shapes', async () => {
    const enriched = await orderDetails.enrich(discoveredOrder);

    expect(Array.isArray(enriched.items)).toBe(true);
    expect(enriched.items.length).toBeGreaterThan(0);

    enriched.items.forEach(item => {
      expect(isValidOrderItem(item)).toBe(true);
      expect(typeof item.skuNumber).toBe('string');
      expect(typeof item.title).toBe('string');
      expect(typeof item.unitPrice).toBe('number');
      expect(typeof item.lineTotal).toBe('number');
    });
  });

  // Test 5: enriched Order has returns array with valid ReturnOrder shapes
  test('enrich should populate returns with valid ReturnOrder shapes', async () => {
    const enriched = await orderDetails.enrich(discoveredOrder);

    expect(Array.isArray(enriched.returns)).toBe(true);
    expect(enriched.returns.length).toBeGreaterThan(0);

    enriched.returns.forEach(ret => {
      expect(isValidReturnOrder(ret)).toBe(true);
      expect(typeof ret.returnOrderNumber).toBe('string');
      expect(typeof ret.refundTotal).toBe('number');
      expect(Array.isArray(ret.items)).toBe(true);
    });
  });

  // Test 6: enriched Order has financials
  test('enrich should populate financials with numeric totals', async () => {
    const enriched = await orderDetails.enrich(discoveredOrder);

    expect(enriched.financials).not.toBeNull();
    expect(typeof enriched.financials.merchandiseTotal).toBe('number');
    expect(typeof enriched.financials.discountsTotal).toBe('number');
    expect(typeof enriched.financials.grandTotal).toBe('number');
    expect(typeof enriched.financials.taxesTotal).toBe('number');
    expect(typeof enriched.financials.shippingTotal).toBe('number');
    expect(typeof enriched.financials.couponsTotal).toBe('number');
  });

  // Test 7: enrich throws OrderDetailsError for orders missing orderUrlKey
  test('enrich should throw OrderDetailsError when orderUrlKey is missing', async () => {
    const orderWithoutKey = createOrder({
      id: 'NO-KEY-ORDER',
      date: '2025-01-01',
      type: 'instore',
      detailsUrl: 'https://www.staples.com/stub/nokey',
    });

    await expect(orderDetails.enrich(orderWithoutKey)).rejects.toThrow(OrderDetailsError);
  });

  // Test 8: enrich throws OrderDetailsError on API error responses
  test('enrich should throw OrderDetailsError on API error responses', async () => {
    const errorDetails = createStubOrderDetails({
      responseOverrides: {
        'orderdetails': { status: 500, ok: false, data: { error: 'Internal Server Error' } },
      },
    });

    await expect(errorDetails.enrich(discoveredOrder)).rejects.toThrow(OrderDetailsError);
  });

  // Test 9: enriched Order preserves type and detailsUrl from discovered order
  test('enrich should preserve discovered fields (type, detailsUrl)', async () => {
    const enriched = await orderDetails.enrich(discoveredOrder);

    expect(enriched.type).toBe('instore');
    expect(enriched.detailsUrl).toBe('https://www.staples.com/ptd/orderdetails?tp_sid=abc123');
  });

  // Test 10: enriched Order is immutable (Object.freeze)
  test('enrich should return an immutable (frozen) Order', async () => {
    const enriched = await orderDetails.enrich(discoveredOrder);

    expect(Object.isFrozen(enriched)).toBe(true);
    expect(Object.isFrozen(enriched.items)).toBe(true);
    expect(Object.isFrozen(enriched.returns)).toBe(true);
    if (enriched.financials) {
      expect(Object.isFrozen(enriched.financials)).toBe(true);
    }
  });
});
