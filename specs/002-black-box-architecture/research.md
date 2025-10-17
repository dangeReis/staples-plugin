# Research: Black Box Architecture Refactoring

**Date**: 2025-10-17
**Feature**: 002-black-box-architecture
**Phase**: 0 - Research & Design Decisions

## Overview

This document captures research findings and design decisions for refactoring the Staples Receipt Downloader from monolithic to black box modular architecture.

---

## Decision 1: Module Interface Pattern

**Decision**: Use JSDoc-annotated JavaScript with explicit interface files

**Rationale**:
- Current codebase is JavaScript; minimal disruption
- JSDoc provides type safety without TypeScript compilation overhead
- Interface files (interface.js) explicitly define contracts
- Enables gradual migration without build system changes
- IDE support for JSDoc is excellent (VS Code, WebStorm)

**Alternatives Considered**:
- **TypeScript**: Rejected because out of scope (spec assumption), requires build changes
- **Plain Comments**: Rejected because not machine-verifiable, no IDE support
- **Flow**: Rejected because less community support, Facebook deprecated

**Example Pattern**:
```javascript
// src/modules/orderDiscovery/interface.js
/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} date
 * @property {'online'|'instore'} type
 * @property {string} detailsUrl
 * @property {string} [customerNumber]
 */

/**
 * Order Discovery Interface
 * Discovers orders from the current page
 *
 * @interface OrderDiscovery
 */
export const OrderDiscoveryInterface = {
  /**
   * Discover orders from page URL
   * @param {string} pageUrl - Current page URL
   * @returns {Promise<Order[]>} Discovered orders
   */
  discover: (pageUrl) => {}
};
```

---

## Decision 2: Primitive Type Design

**Decision**: Immutable value objects with factory functions

**Rationale**:
- Primitives should be simple, predictable data containers
- Object.freeze() ensures immutability at runtime
- Factory functions provide validation and consistent construction
- No class overhead (simpler than ES6 classes for data)
- Easy to serialize/deserialize for storage and messaging

**Alternatives Considered**:
- **ES6 Classes**: Rejected because adds unnecessary complexity (constructors, this binding)
- **Plain Objects**: Rejected because no immutability guarantees
- **Immutable.js**: Rejected because adds dependency, overkill for simple types

**Example Pattern**:
```javascript
// src/primitives/Order.js
/**
 * Creates an immutable Order primitive
 * @param {Object} data
 * @param {string} data.id
 * @param {string} data.date - ISO date string
 * @param {'online'|'instore'} data.type
 * @param {string} data.detailsUrl
 * @param {string} [data.customerNumber]
 * @returns {Readonly<Order>}
 */
export function createOrder({ id, date, type, detailsUrl, customerNumber }) {
  if (!id || !date || !type || !detailsUrl) {
    throw new Error('Order requires id, date, type, and detailsUrl');
  }

  return Object.freeze({
    id,
    date,
    type,
    detailsUrl,
    customerNumber: customerNumber || null
  });
}
```

---

## Decision 3: Chrome API Adapter Strategy

**Decision**: Thin adapter layer with promise-based wrappers

**Rationale**:
- Chrome APIs have inconsistent callback/promise patterns
- Adapter normalizes to promises for consistency
- Isolation allows mocking for tests
- Single file per API category (downloads, storage, tabs, debugger)
- Minimal abstraction (don't hide Chrome semantics, just normalize interface)

**Alternatives Considered**:
- **Full Abstraction Layer**: Rejected because hides too much, harder to debug
- **Direct Usage**: Rejected because prevents testing, couples modules to Chrome
- **webextension-polyfill**: Rejected because adds dependency, we only need subset

**Example Pattern**:
```javascript
// src/adapters/chromeApi.js
export const ChromeDownloads = {
  /**
   * Download a file
   * @param {Object} options
   * @param {string} options.url
   * @param {string} options.filename
   * @returns {Promise<number>} Download ID
   */
  async download({ url, filename }) {
    return new Promise((resolve, reject) => {
      chrome.downloads.download({ url, filename, saveAs: false }, (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(downloadId);
        }
      });
    });
  }
};

// Mock for testing
export const MockChromeDownloads = {
  async download({ url, filename }) {
    return Math.floor(Math.random() * 10000); // Mock download ID
  }
};
```

---

## Decision 4: Module Communication Pattern

**Decision**: Dependency injection with coordinator pattern

**Rationale**:
- Modules receive dependencies through function parameters (DI)
- Coordinator orchestrates module interactions
- No global state or singletons
- Explicit dependencies make testing trivial (pass mocks)
- Modules don't know about each other, only interfaces

**Alternatives Considered**:
- **Event Bus**: Rejected because implicit dependencies, harder to trace
- **Service Locator**: Rejected because hidden dependencies, anti-pattern
- **Global Singletons**: Rejected because prevents parallel tests, hidden state

**Example Pattern**:
```javascript
// src/coordinator.js
import { createOrderDiscovery } from './modules/orderDiscovery/online.js';
import { createReceiptGenerator } from './modules/receiptGenerator/chromePrint.js';
import { ChromeDownloads, ChromeTabs } from './adapters/chromeApi.js';

export function createCoordinator({ downloads = ChromeDownloads, tabs = ChromeTabs } = {}) {
  const orderDiscovery = createOrderDiscovery();
  const receiptGenerator = createReceiptGenerator({ downloads, tabs });

  return {
    async processPage(pageUrl) {
      const orders = await orderDiscovery.discover(pageUrl);
      const receipts = await Promise.all(
        orders.map(order => receiptGenerator.generate(order, { includeImages: true }))
      );
      return receipts;
    }
  };
}

// Testing
const mockCoordinator = createCoordinator({
  downloads: MockChromeDownloads,
  tabs: MockChromeTabs
});
```

---

## Decision 5: Test Strategy

**Decision**: Three-tier testing (Contract → Unit → Integration)

**Rationale**:
- **Contract tests** verify interface compliance (module follows its interface)
- **Unit tests** verify module behavior with mocked dependencies
- **Integration tests** verify module interactions with real adapters
- Fast feedback loop (contract/unit tests run without browser)
- Constitution requires all three (TDD principle)

**Test Execution Order**:
1. Contract tests (verify interfaces match implementations)
2. Unit tests (verify module logic with mocks)
3. Integration tests (verify end-to-end with Chrome APIs)

**Example Pattern**:
```javascript
// tests/contract/orderDiscovery.test.js
import { OrderDiscoveryInterface } from '../../src/modules/orderDiscovery/interface.js';
import { createOrderDiscovery } from '../../src/modules/orderDiscovery/online.js';

describe('OrderDiscovery Contract', () => {
  test('implements discover method', () => {
    const discovery = createOrderDiscovery();
    expect(typeof discovery.discover).toBe('function');
  });

  test('discover returns Promise<Order[]>', async () => {
    const discovery = createOrderDiscovery();
    const result = await discovery.discover('https://staples.com/ptd/myorders');
    expect(Array.isArray(result)).toBe(true);
    result.forEach(order => {
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('date');
      expect(order).toHaveProperty('type');
    });
  });
});
```

---

## Decision 6: Migration Strategy

**Decision**: Incremental module extraction with feature flags

**Rationale**:
- Preserve existing code during migration (no big bang rewrite)
- Extract one module at a time, test, validate
- Feature flag controls old vs new implementation
- Gradual migration reduces risk
- Can rollback individual modules if issues arise

**Migration Phases**:
1. Extract primitives (Order, Receipt, Status, Activity)
2. Extract adapters (Chrome API wrappers)
3. Extract StatusTracker (simplest module, least dependencies)
4. Extract OrderDiscovery (online, then instore)
5. Extract ReceiptGenerator
6. Extract DownloadScheduler
7. Wire up coordinator
8. Remove old code when new code proven

**Feature Flag Pattern**:
```javascript
// content.js (during migration)
const USE_NEW_ARCHITECTURE = localStorage.getItem('useNewArchitecture') === 'true';

if (USE_NEW_ARCHITECTURE) {
  import('./src/coordinator.js').then(({ createCoordinator }) => {
    const coordinator = createCoordinator();
    // Use new architecture
  });
} else {
  // Old monolithic code
  processOrders();
}
```

---

## Decision 7: Error Handling Strategy

**Decision**: Explicit error objects with error boundaries

**Rationale**:
- Each module defines its own error types
- Coordinator wraps module calls in try-catch (error boundary)
- Errors include context (which module, what operation, input data)
- Status tracker receives all errors for logging/UI display
- No silent failures

**Example Pattern**:
```javascript
// src/modules/orderDiscovery/errors.js
export class OrderDiscoveryError extends Error {
  constructor(message, { url, cause } = {}) {
    super(message);
    this.name = 'OrderDiscoveryError';
    this.url = url;
    this.cause = cause;
  }
}

// Usage in coordinator
try {
  const orders = await orderDiscovery.discover(pageUrl);
} catch (error) {
  if (error instanceof OrderDiscoveryError) {
    statusTracker.reportError({ type: 'discovery', message: error.message, url: error.url });
  }
  throw error; // Re-throw for higher-level handling
}
```

---

## Decision 8: Module Size Enforcement

**Decision**: ESLint rule + pre-commit hook

**Rationale**:
- Automated enforcement prevents module bloat
- ESLint max-lines rule set to 500 (hard limit)
- Warning at 200 lines (soft limit)
- Pre-commit hook fails on violations
- Forces developers to split modules before they grow too large

**Configuration**:
```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'max-lines': ['error', {
      max: 500,
      skipBlankLines: true,
      skipComments: true
    }],
    'max-lines-per-function': ['warn', {
      max: 50,
      skipBlankLines: true,
      skipComments: true
    }]
  }
};
```

---

## Summary

All research decisions are finalized and support the black box architecture goals:

✅ **Interface Pattern**: JSDoc with explicit interface files
✅ **Primitives**: Immutable value objects with factory functions
✅ **Adapters**: Thin promise-based Chrome API wrappers
✅ **Communication**: Dependency injection with coordinator
✅ **Testing**: Three-tier (contract/unit/integration)
✅ **Migration**: Incremental with feature flags
✅ **Errors**: Explicit error types with boundaries
✅ **Size**: Automated enforcement via ESLint

No NEEDS CLARIFICATION items remain. Ready for Phase 1 (Design & Contracts).
