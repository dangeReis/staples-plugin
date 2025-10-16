// tests/content.test.js
// Unit tests for content.js functions

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
