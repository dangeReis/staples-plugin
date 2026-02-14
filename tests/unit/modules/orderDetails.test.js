import { describe, it, expect, beforeEach } from '@jest/globals';
import { createRequire } from 'module';
import { createOrderDetailsApi } from '../../../src/modules/orderDetails/api.js';
import { OrderDetailsError } from '../../../src/modules/orderDetails/interface.js';
import { createMockFetchAdapter } from '../../../src/adapters/mocks.js';
import { createOrder } from '../../../src/primitives/Order.js';

const require = createRequire(import.meta.url);
const fixtureData = require('../../stubs/fixtures/orderDetailsResponse.json');

describe('createOrderDetailsApi', () => {
  let mockFetch;
  let api;
  let discoveredOrder;

  beforeEach(() => {
    mockFetch = createMockFetchAdapter({
      'orderdetails': { status: 200, ok: true, data: fixtureData },
    });
    api = createOrderDetailsApi({ fetch: mockFetch });

    discoveredOrder = createOrder({
      id: 'POS.542.20250629.4.5137',
      date: '2025-06-29',
      type: 'instore',
      detailsUrl: 'https://www.staples.com/ptd/orderdetails?tp_sid=abc',
      orderUrlKey: 'test-url-key-123',
      orderType: 'in-store_instore',
    });
  });

  // --- Factory validation ---

  it('throws if fetch adapter is not provided', () => {
    expect(() => createOrderDetailsApi({})).toThrow('requires a fetch adapter');
  });

  // --- Happy path ---

  it('enriches an order with items from the fixture', async () => {
    const enriched = await api.enrich(discoveredOrder);

    expect(enriched.enriched).toBe(true);
    expect(enriched.items.length).toBe(2);
    expect(enriched.items[0].skuNumber).toBe('24608319');
    expect(enriched.items[0].title).toBe('DUNKIN ORIGINAL BL');
    expect(enriched.items[0].unitPrice).toBe(36.99);
    expect(enriched.items[0].lineTotal).toBe(29.99);
    expect(enriched.items[0].couponTotal).toBe(7);
    expect(enriched.items[0].couponDetails.length).toBe(1);
    expect(enriched.items[0].couponDetails[0].chargeName).toBe('Instant Savings #46423');
    expect(enriched.items[0].status).toBe(725);
    expect(enriched.items[0].statusDescription).toBe('Purchased at store');
  });

  it('enriches an order with return orders from the fixture', async () => {
    const enriched = await api.enrich(discoveredOrder);

    expect(enriched.returns.length).toBe(1);
    const ret = enriched.returns[0];
    expect(ret.returnOrderNumber).toBe('POS.522.20250629.1.18628');
    expect(ret.masterOrderNumber).toBe('POS.542.20250629.4.5137');
    expect(ret.returnedDate).toBe('2025-06-29T16:08:16');
    expect(ret.dispositionType).toBe('CSR_CONTACT');
    expect(ret.statusCode).toBe(1400);
    expect(ret.statusDescription).toBe('Return Complete');
    expect(ret.refundTotal).toBe(59.98);
    expect(ret.items.length).toBe(2);
    expect(ret.items[0].skuNumber).toBe('24608319');
  });

  it('enriches an order with financials from the fixture', async () => {
    const enriched = await api.enrich(discoveredOrder);

    expect(enriched.financials).toEqual({
      merchandiseTotal: 73.98,
      discountsTotal: 14,
      couponsTotal: 14,
      shippingTotal: 0,
      taxesTotal: 0,
      grandTotal: 59.98,
    });
  });

  it('enriches an order with storeInfo from the fixture', async () => {
    const enriched = await api.enrich(discoveredOrder);

    expect(enriched.storeInfo).toEqual({
      storeNumber: '542',
      addressLine1: '25 W Central Ave',
      city: 'BERGENFIELD',
      state: 'NJ',
      zipCode: '07621',
    });
  });

  it('enriches an order with transactionBarCode', async () => {
    const enriched = await api.enrich(discoveredOrder);
    expect(enriched.transactionBarCode).toBe('T1131QT11711CKK4AYYTR');
  });

  it('preserves type and detailsUrl from the discovered order', async () => {
    const enriched = await api.enrich(discoveredOrder);
    expect(enriched.type).toBe('instore');
    expect(enriched.detailsUrl).toBe('https://www.staples.com/ptd/orderdetails?tp_sid=abc');
  });

  it('constructs the correct API URL with query params', async () => {
    await api.enrich(discoveredOrder);

    const calls = mockFetch.getCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url).toContain('orderdetails');
    expect(calls[0].url).toContain('enterpriseCode=RetailUS');
    expect(calls[0].url).toContain('orderType=in-store_instore');
    expect(calls[0].url).toContain('tp_sid=test-url-key-123');
    expect(calls[0].url).toContain('pgIntlO=Y');
  });

  // --- Error handling ---

  it('throws OrderDetailsError when order is null', async () => {
    await expect(api.enrich(null)).rejects.toThrow(OrderDetailsError);
  });

  it('throws OrderDetailsError when order has no id', async () => {
    await expect(api.enrich({})).rejects.toThrow(OrderDetailsError);
  });

  it('throws OrderDetailsError when orderUrlKey is missing', async () => {
    const noKeyOrder = createOrder({
      id: 'test-no-key',
      date: '2025-01-01',
      type: 'instore',
      detailsUrl: 'https://www.staples.com/stub/1',
    });
    await expect(api.enrich(noKeyOrder)).rejects.toThrow(OrderDetailsError);
  });

  it('throws OrderDetailsError on HTTP error response', async () => {
    const errorFetch = createMockFetchAdapter({
      'orderdetails': { status: 401, ok: false, data: { error: 'Unauthorized' } },
    });
    const errorApi = createOrderDetailsApi({ fetch: errorFetch });

    await expect(errorApi.enrich(discoveredOrder)).rejects.toThrow(OrderDetailsError);
    try {
      await errorApi.enrich(discoveredOrder);
    } catch (err) {
      expect(err.status).toBe(401);
      expect(err.orderId).toBe('POS.542.20250629.4.5137');
    }
  });

  it('throws OrderDetailsError on malformed response (missing nested data)', async () => {
    const malformedFetch = createMockFetchAdapter({
      'orderdetails': { status: 200, ok: true, data: { ptdOrderDetails: {} } },
    });
    const malformedApi = createOrderDetailsApi({ fetch: malformedFetch });

    await expect(malformedApi.enrich(discoveredOrder)).rejects.toThrow(OrderDetailsError);
  });

  it('throws OrderDetailsError when fetch throws (network failure)', async () => {
    const throwingFetch = {
      get: async () => { throw new Error('Network error'); },
      post: async () => { throw new Error('Network error'); },
    };
    const failApi = createOrderDetailsApi({ fetch: throwingFetch });

    await expect(failApi.enrich(discoveredOrder)).rejects.toThrow(OrderDetailsError);
  });

  // --- Edge cases ---

  it('handles response with empty shipments (no items)', async () => {
    const noItemsData = JSON.parse(JSON.stringify(fixtureData));
    noItemsData.ptdOrderDetails.orderDetails.orderDetails.shipments = [];
    noItemsData.ptdOrderDetails.orderDetails.orderDetails.returnOrders = [];

    const emptyFetch = createMockFetchAdapter({
      'orderdetails': { status: 200, ok: true, data: noItemsData },
    });
    const emptyApi = createOrderDetailsApi({ fetch: emptyFetch });

    const enriched = await emptyApi.enrich(discoveredOrder);
    expect(enriched.items.length).toBe(0);
    expect(enriched.returns.length).toBe(0);
    // Still has financials so enriched is true
    expect(enriched.enriched).toBe(true);
  });

  it('handles response with no returnOrders', async () => {
    const noReturnsData = JSON.parse(JSON.stringify(fixtureData));
    noReturnsData.ptdOrderDetails.orderDetails.orderDetails.returnOrders = [];

    const noReturnsFetch = createMockFetchAdapter({
      'orderdetails': { status: 200, ok: true, data: noReturnsData },
    });
    const noReturnsApi = createOrderDetailsApi({ fetch: noReturnsFetch });

    const enriched = await noReturnsApi.enrich(discoveredOrder);
    expect(enriched.items.length).toBe(2);
    expect(enriched.returns.length).toBe(0);
  });

  it('handles response with no storeNumber (online order)', async () => {
    const onlineData = JSON.parse(JSON.stringify(fixtureData));
    delete onlineData.ptdOrderDetails.orderDetails.orderDetails.storeNumber;
    delete onlineData.ptdOrderDetails.orderDetails.orderDetails.storeAddress;

    const onlineFetch = createMockFetchAdapter({
      'orderdetails': { status: 200, ok: true, data: onlineData },
    });
    const onlineApi = createOrderDetailsApi({ fetch: onlineFetch });

    const enriched = await onlineApi.enrich(discoveredOrder);
    expect(enriched.storeInfo).toBeNull();
  });
});
