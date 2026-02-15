// tests/content.test.js
// Unit tests for content.js functions

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Chrome Extension Testing Setup
 *
 * Run tests with: npm test
 * Watch mode: npm test -- --watch
 */

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: jest.fn()
    },
    lastError: null
  },
  tabs: {
    sendMessage: jest.fn()
  }
};

// Mock sessionStorage
global.sessionStorage = {
  data: {},
  getItem: jest.fn(key => global.sessionStorage.data[key] || null),
  setItem: jest.fn((key, value) => { global.sessionStorage.data[key] = value; }),
  removeItem: jest.fn(key => { delete global.sessionStorage.data[key]; }),
  clear: jest.fn(() => { global.sessionStorage.data = {}; })
};

// Mock localStorage
global.localStorage = {
  data: {},
  getItem: jest.fn(key => global.localStorage.data[key] || null),
  setItem: jest.fn((key, value) => { global.localStorage.data[key] = value; }),
  removeItem: jest.fn(key => { delete global.localStorage.data[key]; }),
  clear: jest.fn(() => { global.localStorage.data = {}; })
};

// Mock DOM
document.body.innerHTML = `
  <div id="ph-order-ordernumber-POS.542.20251004.4.23365">
    <a href="https://www.staples.com/ptd/orderdetails?id=123">Transaction Link</a>
  </div>
  <div id="ph-order-ordernumber-POS.542.20251005.5.23366">
    <a href="https://www.staples.com/ptd/orderdetails?id=124">Transaction Link 2</a>
  </div>
`;

// Import functions to test (we'll need to export them from content.js)
// For now, we'll copy the functions here for testing

function formatDateFromString(dateString) {
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  return `${year}-${month}-${day}`;
}

function extractInStoreTransactionData(transactionContainer) {
  try {
    const containerId = transactionContainer.id;
    const transactionNumber = containerId.replace('ph-order-ordernumber-', '');
    const datePart = transactionNumber.split('.')[2];
    const transactionDate = formatDateFromString(datePart);
    const linkElement = transactionContainer.querySelector('a[href*="orderdetails"]');
    const detailsLink = linkElement ? linkElement.href : null;

    if (!transactionNumber || !transactionDate || !detailsLink) {
      return null;
    }

    return { transactionNumber, transactionDate, detailsLink };
  } catch (error) {
    console.error("Error extracting in-store transaction data:", error);
    return null;
  }
}

function detectPageType(url) {
  if (url.includes('/ptd/orderdetails')) {
    return 'orderDetails';
  } else if (url.includes('/ptd/myorders')) {
    return 'orderList';
  }
  return 'unknown';
}

describe('Staples Extension - Date Formatting', () => {
  test('formatDateFromString converts YYYYMMDD to YYYY-MM-DD', () => {
    expect(formatDateFromString('20251004')).toBe('2025-10-04');
    expect(formatDateFromString('20240101')).toBe('2024-01-01');
    expect(formatDateFromString('20231231')).toBe('2023-12-31');
  });

  test('formatDateFromString handles edge cases', () => {
    expect(formatDateFromString('20250229')).toBe('2025-02-29'); // Leap year
    expect(formatDateFromString('19991231')).toBe('1999-12-31'); // Y2K
  });
});

describe('Staples Extension - Transaction Data Extraction', () => {
  beforeEach(() => {
    // Reset DOM before each test
    document.body.innerHTML = `
      <div id="ph-order-ordernumber-POS.542.20251004.4.23365">
        <a href="https://www.staples.com/ptd/orderdetails?id=123">Transaction Link</a>
      </div>
    `;
  });

  test('extractInStoreTransactionData extracts valid transaction data', () => {
    const container = document.getElementById('ph-order-ordernumber-POS.542.20251004.4.23365');
    const data = extractInStoreTransactionData(container);

    expect(data).not.toBeNull();
    expect(data.transactionNumber).toBe('POS.542.20251004.4.23365');
    expect(data.transactionDate).toBe('2025-10-04');
    expect(data.detailsLink).toBe('https://www.staples.com/ptd/orderdetails?id=123');
  });

  test('extractInStoreTransactionData returns null for missing link', () => {
    document.body.innerHTML = `
      <div id="ph-order-ordernumber-POS.542.20251004.4.23365">
        <!-- No link -->
      </div>
    `;

    const container = document.getElementById('ph-order-ordernumber-POS.542.20251004.4.23365');
    const data = extractInStoreTransactionData(container);

    expect(data).toBeNull();
  });

  test('extractInStoreTransactionData handles multiple transactions', () => {
    document.body.innerHTML = `
      <div id="ph-order-ordernumber-POS.542.20251004.4.23365">
        <a href="https://www.staples.com/ptd/orderdetails?id=123">Transaction 1</a>
      </div>
      <div id="ph-order-ordernumber-POS.542.20251005.5.23366">
        <a href="https://www.staples.com/ptd/orderdetails?id=124">Transaction 2</a>
      </div>
    `;

    const containers = document.querySelectorAll('[id^="ph-order-ordernumber-POS"]');
    expect(containers.length).toBe(2);

    const data1 = extractInStoreTransactionData(containers[0]);
    const data2 = extractInStoreTransactionData(containers[1]);

    expect(data1.transactionNumber).toBe('POS.542.20251004.4.23365');
    expect(data2.transactionNumber).toBe('POS.542.20251005.5.23366');
  });
});

describe('Staples Extension - Page Type Detection', () => {
  test('detectPageType identifies order list pages', () => {
    expect(detectPageType('https://www.staples.com/ptd/myorders')).toBe('orderList');
    expect(detectPageType('https://www.staples.com/ptd/myorders?page=2')).toBe('orderList');
  });

  test('detectPageType identifies order details pages', () => {
    expect(detectPageType('https://www.staples.com/ptd/orderdetails?id=123')).toBe('orderDetails');
    expect(detectPageType('https://www.staples.com/ptd/orderdetails?print=true')).toBe('orderDetails');
  });

  test('detectPageType returns unknown for other pages', () => {
    expect(detectPageType('https://www.staples.com/')).toBe('unknown');
    expect(detectPageType('https://www.staples.com/products')).toBe('unknown');
    expect(detectPageType('https://www.staples.com/cart')).toBe('unknown');
  });
});

describe('Staples Extension - Session Storage Management', () => {
  beforeEach(() => {
    global.sessionStorage.clear();
  });

  test('sessionStorage stores and retrieves pagination flag', () => {
    sessionStorage.setItem('autoProcessNextPage', 'true');
    expect(sessionStorage.getItem('autoProcessNextPage')).toBe('true');
  });

  test('sessionStorage stores and retrieves global transaction index', () => {
    sessionStorage.setItem('globalTransactionIndex', '25');
    expect(sessionStorage.getItem('globalTransactionIndex')).toBe('25');
    expect(parseInt(sessionStorage.getItem('globalTransactionIndex'), 10)).toBe(25);
  });

  test('sessionStorage removes flags correctly', () => {
    sessionStorage.setItem('autoProcessNextPage', 'true');
    sessionStorage.setItem('globalTransactionIndex', '25');

    sessionStorage.removeItem('autoProcessNextPage');
    sessionStorage.removeItem('globalTransactionIndex');

    expect(sessionStorage.getItem('autoProcessNextPage')).toBeNull();
    expect(sessionStorage.getItem('globalTransactionIndex')).toBeNull();
  });
});

describe('Staples Extension - Chrome Runtime Communication', () => {
  beforeEach(() => {
    chrome.runtime.sendMessage.mockClear();
  });

  test('chrome.runtime.sendMessage is called for icon changes', async () => {
    await chrome.runtime.sendMessage({ icon: 'active' });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ icon: 'active' });
  });

  test('chrome.runtime.sendMessage handles multiple icon states', async () => {
    await chrome.runtime.sendMessage({ icon: 'active' });
    await chrome.runtime.sendMessage({ icon: 'processing' });
    await chrome.runtime.sendMessage({ icon: 'inactive' });

    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3);
  });
});

describe('Staples Extension - Autonomous Mode', () => {
  beforeEach(() => {
    global.localStorage.clear();
  });

  test('localStorage stores autonomous mode setting', () => {
    localStorage.setItem('staplesAutonomousMode', 'true');
    expect(localStorage.getItem('staplesAutonomousMode')).toBe('true');
  });

  test('autonomous mode can be toggled', () => {
    localStorage.setItem('staplesAutonomousMode', 'false');
    const currentMode = localStorage.getItem('staplesAutonomousMode') === 'true';
    const newMode = !currentMode;

    localStorage.setItem('staplesAutonomousMode', newMode.toString());
    expect(localStorage.getItem('staplesAutonomousMode')).toBe('true');
  });
});

describe('Staples Extension - Delay Calculations', () => {
  test('calculates correct delays per page', () => {
    const calculateDelay = (pageIndex) => pageIndex * 5000;

    expect(calculateDelay(0)).toBe(0);      // First transaction: 0s
    expect(calculateDelay(1)).toBe(5000);   // Second: 5s
    expect(calculateDelay(2)).toBe(10000);  // Third: 10s
    expect(calculateDelay(24)).toBe(120000); // 25th: 120s (2 minutes)
  });

  test('calculates navigation delay correctly', () => {
    const calculateNavigationDelay = (numTransactions) => {
      return ((numTransactions - 1) * 5000) + 3000;
    };

    expect(calculateNavigationDelay(25)).toBe(123000); // 24*5s + 3s buffer
    expect(calculateNavigationDelay(10)).toBe(48000);  // 9*5s + 3s buffer
    expect(calculateNavigationDelay(1)).toBe(3000);    // 0*5s + 3s buffer
  });
});

describe('Staples Extension - Integration Tests', () => {
  test('full workflow: detect page -> extract data -> schedule download', () => {
    // Setup: Order list page with transactions
    const url = 'https://www.staples.com/ptd/myorders';
    const pageType = detectPageType(url);

    expect(pageType).toBe('orderList');

    // Find and extract transactions
    document.body.innerHTML = `
      <div id="ph-order-ordernumber-POS.542.20251004.4.23365">
        <a href="https://www.staples.com/ptd/orderdetails?id=123">Transaction 1</a>
      </div>
      <div id="ph-order-ordernumber-POS.542.20251005.5.23366">
        <a href="https://www.staples.com/ptd/orderdetails?id=124">Transaction 2</a>
      </div>
    `;

    const transactions = document.querySelectorAll('[id^="ph-order-ordernumber-POS"]');
    expect(transactions.length).toBe(2);

    const allData = Array.from(transactions).map(extractInStoreTransactionData);
    expect(allData.length).toBe(2);
    expect(allData[0].transactionNumber).toBe('POS.542.20251004.4.23365');
    expect(allData[1].transactionNumber).toBe('POS.542.20251005.5.23366');
  });

  test('pagination workflow: process page -> navigate -> continue on next page', () => {
    // Simulate page 1 processing
    sessionStorage.setItem('autoProcessNextPage', 'true');
    sessionStorage.setItem('globalTransactionIndex', '25');

    // Check flags are set
    expect(sessionStorage.getItem('autoProcessNextPage')).toBe('true');
    expect(sessionStorage.getItem('globalTransactionIndex')).toBe('25');

    // Simulate navigation to page 2
    const shouldAutoProcess = sessionStorage.getItem('autoProcessNextPage') === 'true';
    expect(shouldAutoProcess).toBe(true);

    const savedIndex = parseInt(sessionStorage.getItem('globalTransactionIndex'), 10);
    expect(savedIndex).toBe(25);

    // Clean up flags after processing
    sessionStorage.removeItem('autoProcessNextPage');
    sessionStorage.removeItem('globalTransactionIndex');

    expect(sessionStorage.getItem('autoProcessNextPage')).toBeNull();
    expect(sessionStorage.getItem('globalTransactionIndex')).toBeNull();
  });
});

/**
 * Regression test for the combined JSON merge in content.js.
 *
 * Bug fixed in commit c480cb2:
 *   - returnOrders from inner orderDetails were silently dropped
 *   - line-item shipments (detail.shipments) were silently dropped
 *
 * This test replicates the merge logic (content.js ~lines 1046-1095) and runs
 * it against the real fixture data to verify that returnOrders and
 * orderShipments are preserved in the enriched output.
 */

// Replicate the merge logic from content.js fetchOrderDetailsWithExtras()
// lines 1046-1095. This is a faithful copy — if content.js changes, this
// function must be updated to match.
function mergeOrderWithDetail(order, extraDetail) {
  const enriched = { ...order };
  if (extraDetail && extraDetail.orderDetails) {
    const detail = extraDetail.orderDetails;
    enriched._detail = {
      billToAddress: detail.billToAddress || null,
      payments: detail.payments || [],
      merchandiseTotal: detail.merchandiseTotal,
      discountsTotal: detail.discountsTotal,
      couponsTotal: detail.couponsTotal,
      pointsRedeemedValue: detail.pointsRedeemedValue,
      shippingAndHandlingFeeTotal: detail.shippingAndHandlingFeeTotal,
      shippingAndDeliveryFeeTotal: detail.shippingAndDeliveryFeeTotal,
      baseShippingCharge: detail.baseShippingCharge,
      expeditedCharge: detail.expeditedCharge,
      handlingCharge: detail.handlingCharge,
      taxesTotal: detail.taxesTotal,
      grandTotal: detail.grandTotal,
      ecoFeeCharge: detail.ecoFeeCharge,
      furnitureServicesFee: detail.furnitureServicesFee,
      minimumOrderFee: detail.minimumOrderFee,
      largeOrderDiscount: detail.largeOrderDiscount,
      otherDiscounts: detail.otherDiscounts,
      channel: detail.channel,
      method: detail.method,
      isFutureOrder: detail.isFutureOrder,
      isReturnable: detail.isReturnable,
      isCancellable: detail.isCancellable,
    };

    // Include line-item shipments from inner orderDetails (has SKUs, prices, quantities)
    if (detail.shipments && detail.shipments.length > 0) {
      enriched._detail.orderShipments = detail.shipments;
    }

    // Include return orders from inner orderDetails
    if (detail.returnOrders && detail.returnOrders.length > 0) {
      enriched._detail.returnOrders = detail.returnOrders;
    }

    // Include shipping addresses from addressGroupMap
    if (extraDetail.addressGroupMap) {
      enriched._detail.shippingAddresses = extraDetail.addressGroupMap;
    }

    // Include shipment-level details (tracking, delivery dates) from outer map
    if (extraDetail.shipToNShipmentsMap) {
      enriched._detail.shipments = extraDetail.shipToNShipmentsMap;
    }
  }
  return enriched;
}

describe('Staples Extension - Combined JSON Merge (Regression)', () => {
  // Load the real fixture once for all tests
  const fixture = JSON.parse(
    readFileSync(resolve(__dirname, 'stubs/fixtures/orderDetailsResponse.json'), 'utf8')
  );
  const extraDetail = fixture.ptdOrderDetails.orderDetails; // middle level
  const baseOrder = { orderNumber: 'POS.542.20250629.4.5137', orderDate: '2025-06-29' };

  test('returnOrders are preserved in enriched output (regression: c480cb2)', () => {
    const result = mergeOrderWithDetail(baseOrder, extraDetail);
    expect(result._detail).toBeDefined();
    expect(result._detail.returnOrders).toBeDefined();
    expect(result._detail.returnOrders.length).toBeGreaterThan(0);
    expect(result._detail.returnOrders[0].returnOrderNumber).toBe('POS.522.20250629.1.18628');
  });

  test('orderShipments (line-item shipments) are preserved in enriched output (regression: c480cb2)', () => {
    const result = mergeOrderWithDetail(baseOrder, extraDetail);
    expect(result._detail).toBeDefined();
    expect(result._detail.orderShipments).toBeDefined();
    expect(result._detail.orderShipments.length).toBeGreaterThan(0);
  });

  test('outer shipToNShipmentsMap does not clobber inner orderShipments', () => {
    const result = mergeOrderWithDetail(baseOrder, extraDetail);

    // Both should coexist: orderShipments = inner detail.shipments (SKUs/prices)
    // shipments = outer shipToNShipmentsMap (tracking/delivery)
    if (extraDetail.shipToNShipmentsMap) {
      expect(result._detail.shipments).toBeDefined();
    }
    // They should be different objects if both exist
    if (result._detail.shipments && result._detail.orderShipments) {
      expect(result._detail.shipments).not.toBe(result._detail.orderShipments);
    }
  });

  test('handles missing returnOrders gracefully (no key added)', () => {
    const noReturns = {
      orderDetails: {
        ...extraDetail.orderDetails,
        returnOrders: undefined
      }
    };
    const result = mergeOrderWithDetail(baseOrder, noReturns);
    expect(result._detail).toBeDefined();
    expect(result._detail.returnOrders).toBeUndefined();
  });

  test('handles empty returnOrders array (no key added)', () => {
    const emptyReturns = {
      orderDetails: {
        ...extraDetail.orderDetails,
        returnOrders: []
      }
    };
    const result = mergeOrderWithDetail(baseOrder, emptyReturns);
    expect(result._detail).toBeDefined();
    expect(result._detail.returnOrders).toBeUndefined();
  });

  test('return order financial details are preserved', () => {
    const result = mergeOrderWithDetail(baseOrder, extraDetail);
    const returnOrder = result._detail.returnOrders[0];
    // Verify financial fields from fixture survive the merge
    expect(returnOrder).toHaveProperty('returnOrderNumber');
    expect(returnOrder).toHaveProperty('returnShipments');
  });

  test('original order fields are retained after merge', () => {
    const result = mergeOrderWithDetail(baseOrder, extraDetail);
    expect(result.orderNumber).toBe('POS.542.20250629.4.5137');
    expect(result.orderDate).toBe('2025-06-29');
  });
});

describe('Staples Extension - Source Guard (content.js merge block)', () => {
  const contentSrc = readFileSync(resolve(__dirname, '..', 'content.js'), 'utf8');

  test('content.js assigns enriched._detail.returnOrders from detail.returnOrders', () => {
    expect(contentSrc).toMatch(/enriched\._detail\.returnOrders\s*=\s*detail\.returnOrders/);
  });

  test('content.js assigns enriched._detail.orderShipments from detail.shipments', () => {
    expect(contentSrc).toMatch(/enriched\._detail\.orderShipments\s*=\s*detail\.shipments/);
  });

  test('content.js guards returnOrders with length > 0 check', () => {
    expect(contentSrc).toMatch(/detail\.returnOrders\s*&&\s*detail\.returnOrders\.length\s*>\s*0/);
  });

  test('content.js guards shipments with length > 0 check', () => {
    expect(contentSrc).toMatch(/detail\.shipments\s*&&\s*detail\.shipments\.length\s*>\s*0/);
  });

  test('content.js assigns outer shipToNShipmentsMap to enriched._detail.shipments', () => {
    expect(contentSrc).toMatch(/enriched\._detail\.shipments\s*=\s*extraDetail\.shipToNShipmentsMap/);
  });
});
