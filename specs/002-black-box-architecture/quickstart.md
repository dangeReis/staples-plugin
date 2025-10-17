# Quickstart: Black Box Architecture Implementation

**Feature**: 002-black-box-architecture
**Date**: 2025-10-17

## Quick Reference

### Implementation Order
1. **Primitives** (Order, Receipt, Status, Activity) → `src/primitives/`
2. **Adapters** (Chrome APIs, DOM) → `src/adapters/`
3. **Modules** (OrderDiscovery, StatusTracker, ReceiptGenerator, Scheduler) → `src/modules/`
4. **Coordinator** (Wire modules together) → `src/coordinator.js`
5. **Entry Points** (Refactor content.js, background.js, popup.js)

### TDD Workflow (Per Module)
1. Write interface contract test → tests/contract/
2. Watch test FAIL (red)
3. Implement minimum to pass (green)
4. Refactor while keeping tests green
5. Add unit tests → tests/unit/

---

## Step-by-Step Implementation

### Step 1: Create Primitives (Week 1)

```bash
# Create directory
mkdir -p src/primitives

# Create Order primitive
cat > src/primitives/Order.js << 'EOF'
export function createOrder({ id, date, type, detailsUrl, customerNumber }) {
  if (!id || !date || !type || !detailsUrl) {
    throw new Error('Order requires id, date, type, and detailsUrl');
  }
  return Object.freeze({ id, date, type, detailsUrl, customerNumber: customerNumber || null });
}
EOF

# Test it
node -e "const { createOrder } = require('./src/primitives/Order.js'); console.log(createOrder({id:'123', date:'2025-10-17', type:'online', detailsUrl:'https://staples.com/order/123'}))"
```

**Repeat for**: Receipt.js, Status.js, Activity.js

---

### Step 2: Create Adapters (Week 1)

```bash
# Create directory
mkdir -p src/adapters

# Create Chrome Downloads Adapter
cat > src/adapters/chromeApi.js << 'EOF'
export const ChromeDownloads = {
  async download({ url, filename }) {
    return new Promise((resolve, reject) => {
      chrome.downloads.download({ url, filename, saveAs: false }, (downloadId) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(downloadId);
      });
    });
  }
};

// Mock for testing
export const MockChromeDownloads = {
  async download({ url, filename }) {
    return Math.floor(Math.random() * 10000);
  }
};
EOF
```

**Adapters to create**: chromeApi.js (tabs, debugger, downloads, storage), dom.js

---

### Step 3: Create Modules with TDD (Week 2-3)

#### Example: StatusTracker

```bash
# 1. Write contract test FIRST
cat > tests/contract/statusTracker.test.js << 'EOF'
import { StatusTrackerInterface } from '../../specs/002-black-box-architecture/contracts/StatusTracker.interface.js';
import { createChromeStorageStatusTracker } from '../../src/modules/statusTracker/chromeStorage.js';

describe('StatusTracker Contract', () => {
  test('implements update method', () => {
    const tracker = createChromeStorageStatusTracker({ storage: {} });
    expect(typeof tracker.update).toBe('function');
  });

  test('implements getStatus method', () => {
    const tracker = createChromeStorageStatusTracker({ storage: {} });
    expect(typeof tracker.getStatus).toBe('function');
  });
});
EOF

# 2. Watch test FAIL
npm test -- statusTracker.test.js

# 3. Implement minimum
mkdir -p src/modules/statusTracker
cat > src/modules/statusTracker/interface.js << 'EOF'
export { StatusTrackerInterface } from '../../../specs/002-black-box-architecture/contracts/StatusTracker.interface.js';
EOF

cat > src/modules/statusTracker/chromeStorage.js << 'EOF'
export function createChromeStorageStatusTracker({ storage }) {
  let currentStatus = { isProcessing: false, currentPage: '0', progress: {}, activities: [] };

  return {
    update(event) { /* implement */ },
    getStatus() { return currentStatus; },
    onChange(callback) { return () => {}; }
  };
}
EOF

# 4. Test should now PASS
npm test -- statusTracker.test.js
```

**Modules to create** (in order):
1. StatusTracker (simplest, no dependencies)
2. OrderDiscovery (depends on DOMAdapter)
3. ReceiptGenerator (depends on Chrome adapters)
4. DownloadScheduler (depends on ReceiptGenerator, StatusTracker)

---

### Step 4: Create Coordinator (Week 3)

```javascript
// src/coordinator.js
import { createOrderDiscovery } from './modules/orderDiscovery/online.js';
import { createReceiptGenerator } from './modules/receiptGenerator/chromePrint.js';
import { createDownloadScheduler } from './modules/scheduler/timeBasedScheduler.js';
import { createStatusTracker } from './modules/statusTracker/chromeStorage.js';

export function createCoordinator({ adapters } = {}) {
  const statusTracker = createStatusTracker({ storage: adapters.storage });
  const orderDiscovery = createOrderDiscovery({ dom: adapters.dom });
  const receiptGenerator = createReceiptGenerator({
    tabs: adapters.tabs,
    debugger: adapters.debugger,
    downloads: adapters.downloads
  });
  const scheduler = createDownloadScheduler({ receiptGenerator, statusTracker });

  return {
    async processPage(pageUrl) {
      const orders = await orderDiscovery.discover(pageUrl);
      const schedule = scheduler.schedule(orders, { delayBetweenOrders: 5000 });
      await scheduler.start();
      return statusTracker.getStatus();
    }
  };
}
```

---

### Step 5: Refactor Entry Points (Week 4)

```javascript
// content.js (refactored)
import { createCoordinator } from './src/coordinator.js';
import { ChromeTabs, ChromeDebugger, ChromeDownloads, ChromeStorage } from './src/adapters/chromeApi.js';
import { DOMAdapter } from './src/adapters/dom.js';

const coordinator = createCoordinator({
  adapters: {
    tabs: ChromeTabs,
    debugger: ChromeDebugger,
    downloads: ChromeDownloads,
    storage: ChromeStorage,
    dom: DOMAdapter
  }
});

// Replace old processOrders() with:
async function processOrders() {
  const status = await coordinator.processPage(location.href);
  console.log('Processing complete:', status);
}
```

---

## Testing Commands

```bash
# Run contract tests (verify interfaces)
npm test -- tests/contract/

# Run unit tests (verify module logic)
npm test -- tests/unit/

# Run integration tests (verify module interactions)
npm test -- tests/integration/

# Run all tests
npm test

# Check module sizes
find src/modules -name "*.js" -exec wc -l {} \; | awk '{if ($1 > 500) print "⚠️  "$2" exceeds 500 lines ("$1")"; else if ($1 > 200) print "ℹ️  "$2" over 200 lines ("$1")"; else print "✅ "$2" ("$1" lines)"}'
```

---

## Validation Checklist

After each module:
- [ ] Contract test passes
- [ ] Unit tests pass
- [ ] Module under 500 lines (ideally under 200)
- [ ] Interface documented with JSDoc
- [ ] Dependencies injected (not hardcoded)
- [ ] Error types defined
- [ ] Can be tested with mocks

After full implementation:
- [ ] All constitution gates pass
- [ ] Existing functionality preserved
- [ ] Test suite completes in under 5 seconds
- [ ] No circular dependencies
- [ ] Primitives used consistently

---

## Common Issues

**Problem**: Tests require Chrome runtime
**Solution**: Use mock adapters in tests (MockChromeDownloads, etc.)

**Problem**: Module exceeds 500 lines
**Solution**: Split into sub-modules (e.g., online.js + instore.js for OrderDiscovery)

**Problem**: Circular dependency detected
**Solution**: Extract shared logic to primitives or new module

**Problem**: Can't test module in isolation
**Solution**: Dependencies not injected - refactor to use DI pattern

---

## Next Steps

After implementation complete:
1. Run `/speckit.tasks` to generate task list
2. Execute tasks following TDD workflow
3. Validate against constitution after each phase
4. Deploy incrementally with feature flags
