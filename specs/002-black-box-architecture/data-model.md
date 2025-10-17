# Data Model: Black Box Architecture

**Feature**: 002-black-box-architecture
**Date**: 2025-10-17
**Phase**: 1 - Design & Contracts

## Overview

This document defines the primitive types and module interfaces for the black box architecture. All modules communicate using these primitives.

---

## Primitive Types

### Order

Represents a purchase (online or in-store).

**Fields**:
- `id` (string, required): Unique order identifier (e.g., "123456789" or "POS.542.20251004.4.23365")
- `date` (string, required): ISO 8601 date string (e.g., "2025-10-04")
- `type` (enum, required): Order type - "online" | "instore"
- `detailsUrl` (string, required): URL to order details page
- `customerNumber` (string, optional): Customer account number

**Validation Rules**:
- `id` must not be empty
- `date` must be valid ISO 8601 format (YYYY-MM-DD)
- `type` must be exactly "online" or "instore"
- `detailsUrl` must be valid URL starting with "https://www.staples.com"

**Immutability**: Order objects are frozen (Object.freeze) after creation

**Factory Function**: `createOrder({ id, date, type, detailsUrl, customerNumber })`

---

### Receipt

Represents a downloadable receipt document.

**Fields**:
- `orderId` (string, required): References Order.id
- `filename` (string, required): Download filename with path (e.g., "staples/12345-2025-10-04.pdf")
- `blob` (Blob, required): PDF binary data
- `generatedAt` (Date, required): Timestamp when receipt was generated
- `method` (enum, required): Generation method - "print" | "direct"
- `includesImages` (boolean, required): Whether images are included in PDF

**Validation Rules**:
- `orderId` must match an existing Order
- `filename` must end with ".pdf"
- `blob` must be valid Blob with type "application/pdf"
- `method` must be "print" or "direct"

**Immutability**: Receipt objects are frozen after creation

**Factory Function**: `createReceipt({ orderId, filename, blob, generatedAt, method, includesImages })`

---

### Status

Represents system processing state.

**Fields**:
- `isProcessing` (boolean, required): Whether system is currently processing
- `currentPage` (string, required): Page range being processed (e.g., "1-25" or "26-50")
- `progress` (object, required): Progress counters
  - `transactionsFound` (number): Orders found on current page
  - `scheduled` (number): Downloads scheduled
  - `completed` (number): Downloads completed
  - `failed` (number): Downloads failed
- `activities` (Array<Activity>, required): Recent activity log (max 10 items)

**Validation Rules**:
- `progress` counters must be non-negative integers
- `activities` array max length 10
- `currentPage` format must match "N-M" pattern

**Mutability**: Status is mutable (updated frequently), but updates create new object

**Factory Function**: `createStatus({ isProcessing, currentPage, progress, activities })`

---

### Activity

Represents a single status event.

**Fields**:
- `type` (enum, required): Event type - "info" | "success" | "error"
- `message` (string, required): Human-readable message
- `timestamp` (Date, required): When event occurred

**Validation Rules**:
- `type` must be "info", "success", or "error"
- `message` must not be empty
- `timestamp` must be valid Date

**Immutability**: Activity objects are frozen after creation

**Factory Function**: `createActivity({ type, message, timestamp })`

---

## Module Interfaces

### OrderDiscovery

**Purpose**: Discovers orders from the current page

**Interface**:
```javascript
{
  /**
   * Discover orders from page URL
   * @param {string} pageUrl - Current page URL
   * @returns {Promise<Order[]>} Discovered orders
   */
  discover(pageUrl): Promise<Order[]>
}
```

**Implementations**:
- `OnlineOrderDiscovery`: Discovers online orders from /ptd/myorders
- `InstoreOrderDiscovery`: Discovers in-store transactions from /ptd/myorders/instore

**Dependencies**: DOMAdapter (for reading page content)

**Error Types**: `OrderDiscoveryError`

---

### ReceiptGenerator

**Purpose**: Converts an order into a downloadable receipt

**Interface**:
```javascript
{
  /**
   * Generate receipt for an order
   * @param {Order} order - Order to generate receipt for
   * @param {Object} options - Generation options
   * @param {boolean} options.includeImages - Include images in PDF
   * @param {'print'|'direct'} options.method - Generation method
   * @returns {Promise<Receipt>} Generated receipt
   */
  generate(order, options): Promise<Receipt>
}
```

**Implementations**:
- `ChromePrintReceiptGenerator`: Uses Chrome debugger API to print page to PDF
- `DirectDownloadReceiptGenerator`: Downloads PDF directly from receipt URL

**Dependencies**: ChromeTabsAdapter, ChromeDebuggerAdapter, ChromeDownloadsAdapter

**Error Types**: `ReceiptGenerationError`

---

### DownloadScheduler

**Purpose**: Manages timing and queuing of downloads

**Interface**:
```javascript
{
  /**
   * Schedule orders for download
   * @param {Order[]} orders - Orders to download
   * @param {Object} rules - Timing rules
   * @param {number} rules.delayBetweenOrders - Milliseconds between orders
   * @param {number} rules.maxConcurrent - Max concurrent downloads
   * @returns {DownloadSchedule} Schedule information
   */
  schedule(orders, rules): DownloadSchedule,

  /**
   * Start processing scheduled downloads
   * @returns {Promise<void>}
   */
  start(): Promise<void>,

  /**
   * Stop processing
   * @returns {void}
   */
  stop(): void,

  /**
   * Subscribe to progress updates
   * @param {function(Status): void} callback - Progress callback
   * @returns {function(): void} Unsubscribe function
   */
  onProgress(callback): () => void
}
```

**DownloadSchedule Type**:
```javascript
{
  total: number,
  scheduled: Order[],
  timing: Map<Order, number> // Order -> delay in ms
}
```

**Implementations**:
- `TimeBasedScheduler`: Simple time-based delay scheduling

**Dependencies**: ReceiptGenerator, StatusTracker

**Error Types**: `SchedulingError`

---

### StatusTracker

**Purpose**: Tracks progress and communicates state

**Interface**:
```javascript
{
  /**
   * Update status with new event
   * @param {Object} event - Status event
   * @param {string} event.type - 'progress' | 'activity' | 'error'
   * @param {Object} event.data - Event-specific data
   * @returns {void}
   */
  update(event): void,

  /**
   * Get current status
   * @returns {Status} Current status
   */
  getStatus(): Status,

  /**
   * Subscribe to status changes
   * @param {function(Status): void} callback - Change callback
   * @returns {function(): void} Unsubscribe function
   */
  onChange(callback): () => void
}
```

**Implementations**:
- `ChromeStorageStatusTracker`: Persists status to chrome.storage

**Dependencies**: ChromeStorageAdapter, ChromeRuntimeAdapter (for messaging)

**Error Types**: `StatusTrackingError`

---

## Adapter Interfaces

### ChromeTabsAdapter

```javascript
{
  create(options: { url: string, active: boolean }): Promise<Tab>,
  remove(tabId: number): Promise<void>,
  onUpdated(callback: (tabId, changeInfo, tab) => void): () => void
}
```

### ChromeDebuggerAdapter

```javascript
{
  attach(target: { tabId: number }, version: string): Promise<void>,
  detach(target: { tabId: number }): Promise<void>,
  sendCommand(target: { tabId: number }, method: string, params: object): Promise<any>
}
```

### ChromeDownloadsAdapter

```javascript
{
  download(options: { url: string, filename: string, saveAs: boolean }): Promise<number>
}
```

### ChromeStorageAdapter

```javascript
{
  get(keys: string[]): Promise<object>,
  set(items: object): Promise<void>
}
```

### DOMAdapter

```javascript
{
  querySelectorAll(selector: string): Element[],
  querySelector(selector: string): Element | null,
  getAttribute(element: Element, name: string): string | null
}
```

---

## Relationships

```
OrderDiscovery ---uses---> DOMAdapter
                |
                v
             Order[]
                |
                v
DownloadScheduler ---uses---> ReceiptGenerator ---uses---> ChromeTabsAdapter
       |                              |                        ChromeDebuggerAdapter
       |                              |                        ChromeDownloadsAdapter
       v                              v
StatusTracker <-------updates----- Receipt
       |
       v
   ChromeStorageAdapter
```

**Data Flow**:
1. OrderDiscovery uses DOMAdapter to extract Order primitives from page
2. DownloadScheduler receives Orders and schedules generation
3. ReceiptGenerator converts Orders to Receipts using Chrome adapters
4. StatusTracker receives updates and persists via ChromeStorageAdapter
5. All modules communicate only through primitives (Order, Receipt, Status, Activity)

---

## State Transitions

### Order Lifecycle
1. **Created**: OrderDiscovery extracts from DOM → Order primitive
2. **Scheduled**: DownloadScheduler queues Order
3. **Processing**: ReceiptGenerator opens tab and captures PDF
4. **Complete**: Receipt generated and downloaded
5. **Failed**: Error occurred, tracked in Status

### Status Lifecycle
1. **Idle**: isProcessing=false, no activity
2. **Processing**: isProcessing=true, downloads in progress
3. **Paused**: User stopped processing
4. **Complete**: All orders processed
5. **Error**: Fatal error occurred, manual intervention needed

---

## Validation Summary

All primitives have:
- ✅ Factory functions with validation
- ✅ Immutability (Object.freeze for value objects)
- ✅ Clear field types and constraints
- ✅ Serialization support (JSON.stringify compatible)

All module interfaces have:
- ✅ Single clear purpose (one sentence description)
- ✅ Input/output types defined
- ✅ Dependencies explicit
- ✅ Error types documented
