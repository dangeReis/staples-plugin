# Task 005: Phase 2 - Foundational (Blocking Prerequisites)

**Branch**: 002-black-box-architecture-tasks/task-005-foundational-phase
**Base Branch**: 002-black-box-architecture
**Tasks**: T005-T014 from ../tasks.md

## ⚠️ CRITICAL: Blocking Phase

No user story work can begin until this phase is complete. This provides the core infrastructure.

## Tasks to Implement (All Parallel [P])

### Primitives (Immutable Value Objects):
- [ ] T005 [P] Create Order primitive factory in src/primitives/Order.js with validation and Object.freeze
- [ ] T006 [P] Create Receipt primitive factory in src/primitives/Receipt.js with validation and Object.freeze
- [ ] T007 [P] Create Status primitive factory in src/primitives/Status.js with validation
- [ ] T008 [P] Create Activity primitive factory in src/primitives/Activity.js with validation and Object.freeze

### Chrome API Adapters:
- [ ] T009 [P] Create ChromeDownloadsAdapter in src/adapters/chromeApi.js with promise-based interface
- [ ] T010 [P] Create ChromeTabsAdapter in src/adapters/chromeApi.js with promise-based interface
- [ ] T011 [P] Create ChromeDebuggerAdapter in src/adapters/chromeApi.js with promise-based interface
- [ ] T012 [P] Create ChromeStorageAdapter in src/adapters/chromeApi.js with promise-based interface

### Other Adapters:
- [ ] T013 [P] Create DOMAdapter in src/adapters/dom.js for page element access
- [ ] T014 [P] Create Mock adapters for testing (MockChromeDownloads, MockChromeTabs, etc.) in src/adapters/mocks.js

## Requirements

1. **Primitives** must be immutable (Object.freeze)
2. **Primitives** must have factory functions with validation
3. **Adapters** must provide promise-based interfaces
4. **Mock adapters** must mirror real adapter interfaces
5. Reference research.md for implementation patterns
6. Reference data-model.md for primitive structures
7. All tasks are parallel [P] and can execute simultaneously
8. Update ../tasks.md to mark T005-T014 as [X] when complete

## Implementation Patterns

### Primitive Example:
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

### Adapter Example:
```javascript
// src/adapters/chromeApi.js
export const ChromeDownloadsAdapter = {
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
```

## Success Criteria

- ✅ All 4 primitives created with factory functions and Object.freeze
- ✅ All Chrome API adapters created with promise interfaces
- ✅ DOMAdapter created for page access
- ✅ Mock adapters created mirroring real adapters
- ✅ All primitive factories validate inputs
- ✅ Tasks T005-T014 marked [X] in ../tasks.md

**Checkpoint**: After completion, user story implementation can begin in parallel
