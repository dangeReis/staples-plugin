# Staples Receipt Downloader - Context & Documentation

## Overview
Chrome extension that automatically downloads receipt PDFs from Staples.com for both online orders and in-store transactions. Supports multi-page pagination and has start/stop functionality.

## Project Structure

```
plugin/
├── manifest.json           # Extension manifest (v3)
├── background.js           # Service worker - handles PDF generation & downloads
├── content.js             # Content script - extracts order data & orchestrates
├── icon.png              # Default/inactive icon (gray)
├── icon_active.png       # Active icon (green checkmark) - on order pages
├── icon_stop.png         # Stop icon (red circle with white square) - while processing
└── README.md             # User documentation
```

## Key Features

### 1. Online Order Receipts
- Automatically downloads PDF receipts from online orders
- Direct download from receipt links
- Filename format: `staples/YYYY-MM-DD-{order-number}.pdf`

### 2. In-Store Transaction Receipts
- Extracts transaction data from order history
- Navigates to print pages automatically
- Uses Chrome Debugger Protocol to generate PDFs programmatically
- Clicks "Print with images" toggle automatically
- Filename format: `staples/YYYY-MM-DD-POS.{transaction-id}.pdf`

### 3. Multi-Page Pagination
- Automatically processes all pages of orders/transactions
- Uses sessionStorage to track state across page navigations
- Maintains proper delays across pages

### 4. Start/Stop Functionality
- Icon changes to stop button while processing
- Clicking again cancels all pending downloads
- Closes active PDF capture tabs
- Clears all scheduled timeouts

## Technical Implementation

### Manifest (manifest.json)
```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "tabs", "scripting", "downloads", "debugger"],
  "host_permissions": ["https://www.staples.com/*"],
  "content_scripts": [{
    "matches": ["https://www.staples.com/*"],
    "js": ["content.js"]
  }]
}
```

**Important**:
- `debugger` permission is required for PDF generation
- `host_permissions` needed for script injection
- Content script runs on ALL Staples pages to support SPA navigation

### Content Script (content.js)

**Key Variables:**
- `globalTransactionIndex`: Tracks transaction count across pages
- `isProcessing`: Flag for start/stop state
- `scheduledTimeouts`: Array of setTimeout IDs for cancellation
- `navigationTimeout`: Timeout for pagination navigation
- `lastUrl`: Tracks URL changes for SPA detection

**Main Functions:**

1. **URL Change Detection (Multiple Strategies):**
   - **MutationObserver**: Watches DOM `childList` changes
   - **Polling**: Checks `location.href` every 500ms
   - **History API Interception**: Intercepts `pushState`/`replaceState`
   - **Popstate Listener**: Handles browser back/forward
   - `handleUrlChange(url)`: Centralized handler for all detection methods
   - `checkAndAutoProcess()`: Checks for pagination or autonomous mode

2. **Page Detection & Icon Management:**
   - `detectPageType()`: Returns 'orderList', 'orderDetails', or 'unknown'
   - `initializePage()`: Sets icon state based on page type
   - Extensive console logging for debugging

3. **Order Processing:**
   - `processOrders()`: Main entry point - processes both online and in-store orders
   - `extractOrderData()`: Extracts online order info from DOM
   - `extractInStoreTransactionData()`: Extracts in-store transaction info from DOM
   - `openOrderDetailsPage(transactionData, pageIndex, globalIndex)`: Schedules PDF capture

4. **Pagination:**
   - Detects "Next page" button
   - Uses sessionStorage to persist state across navigations
   - Auto-processes via `handleUrlChange()` (NOT window.load)
   - Delays reset on each page (0-120s per page, not cumulative)

5. **Autonomous Mode:**
   - Uses localStorage for persistent setting
   - Message handlers: `toggleAutonomous`, `getAutonomousStatus`
   - Auto-starts processing when enabled and on order pages

6. **Stop Functionality:**
   - `stopProcessing()`: Clears all timeouts, cancels active captures, resets state

**DOM Selectors:**

Online Orders:
- Container: `[id^="ph-order-container"]`
- Order Number: `a[aria-label^="Order number"]`
- Order Date: `div[aria-label^="Order date"]`
- Receipt Link: `a[aria-label^="View receipt for order number"]`

In-Store Transactions:
- Container: `[id^="ph-order-ordernumber-POS"]`
- Transaction link: `a[href*="orderdetails"]`
- Transaction ID extracted from container ID

Pagination:
- Next button: `a[aria-label="Next page of results"]:not([aria-disabled="true"])`

Print Page:
- Toggle: `button[role="switch"][aria-checked="false"]` (or variations)

### Background Script (background.js)

**Key Functions:**

1. **Context Menu:**
   - Creates "Toggle Autonomous Download" on install
   - Updates menu title to show current state (ON/OFF with ✓)
   - Sends `toggleAutonomous` message to content script

2. **Icon Management:**
   - Listens for `{ icon: 'active' }` → Sets green checkmark icon
   - Listens for `{ icon: 'inactive' }` → Sets gray icon
   - Listens for `{ icon: 'processing' }` → Sets red stop icon

3. **PDF Capture:**
   - `capturePDFFromUrl(url, transactionNumber, transactionDate)`:
     - Creates background tab with print page URL
     - Waits 5s for page load + 3s for images
     - Injects script to click "Print with images" toggle
     - Attaches Chrome debugger
     - Executes `Page.printToPDF` command
     - Downloads using data URL (blob URLs don't work in service workers)
     - Closes tab and cleans up

3. **Active Capture Tracking:**
   - `activeCaptureTabIds`: Set of tab IDs currently generating PDFs
   - Can cancel by closing tabs when stop is clicked

**Chrome Debugger Protocol:**
```javascript
chrome.debugger.attach({ tabId }, '1.3')
chrome.debugger.sendCommand({ tabId }, 'Page.printToPDF', {
  printBackground: true,
  preferCSSPageSize: false,
  paperWidth: 8.5,
  paperHeight: 11,
  scale: 1.0,
  transferMode: 'ReturnAsBase64'
})
```

**PDF Download:**
```javascript
const dataUrl = `data:application/pdf;base64,${pdfData.data}`;
chrome.downloads.download({
  url: dataUrl,
  filename: `staples/${transactionDate}-${transactionNumber}.pdf`,
  saveAs: false
});
```

## Timing & Delays

**Per-Page Processing:**
- Transaction 0: 0 seconds
- Transaction 1: 5 seconds
- Transaction 2: 10 seconds
- ...
- Transaction 24: 120 seconds
- Navigate to next page: 123 seconds (120s + 3s buffer)

**PDF Generation Time:**
- Page load: ~5 seconds
- Toggle click & image wait: ~3 seconds
- PDF generation: ~2-3 seconds
- **Total per receipt: ~10-11 seconds**

**Important**: Delays reset on each page! Not cumulative across pages.

## Known Issues & Solutions

### Issue: SPA Navigation Not Triggering Icon Changes
**Cause**: Content script only loaded on matched URLs
**Solution**: Changed manifest to match `https://www.staples.com/*` instead of specific paths

### Issue: In-Progress PDFs Continue After Stop
**Cause**: Can't interrupt PDF generation mid-process
**Solution**: Track active capture tabs and close them immediately on stop

### Issue: Service Worker Timeout on Long Operations
**Cause**: Service workers have 5-minute timeout
**Solution**: Handle delays in content script (persistent page context), not service worker

### Issue: URL.createObjectURL Not Available
**Cause**: API not available in service workers
**Solution**: Use data URLs instead: `data:application/pdf;base64,${pdfData.data}`

### Issue: Chrome Runtime Undefined Error
**Cause**: Content script context invalidated during navigation
**Solution**: Check `typeof chrome !== 'undefined' && chrome.runtime` before use

## ✅ FIXED: SPA Navigation and Icon Changes (WORKING!)

**Problem**: Icon not changing on SPA navigation, no console logs

**Solution Implemented**: Multiple URL detection strategies

1. **MutationObserver** - Watches DOM changes
2. **Polling** - Checks URL every 500ms (most reliable)
3. **History API Interception** - Intercepts pushState/replaceState
4. **Popstate Listener** - Handles back/forward navigation

**Current Behavior:**
- ✅ Console logs appear on navigation
- ✅ Icon changes correctly
- ✅ All three detection methods work in parallel
- ✅ Extensive debugging output

## ✅ FIXED: Page 2+ Pagination (WORKING!)

**Problem**: Downloads stopped working on page 2+ of in-store orders

**Root Cause**: Used `window.addEventListener('load')` which only fires once in SPAs

**Solution**: Integrated auto-processing into `handleUrlChange()` function
- Checks sessionStorage flag on every URL change
- Triggers `processOrders()` when navigating to next page
- Properly restores `globalTransactionIndex` across pages

## ✅ NEW: Autonomous Download Mode

**Feature**: Extension can automatically start downloading when you visit the orders page

**How to Enable:**
1. Navigate to the orders page
2. Right-click the extension icon
3. Select "Toggle Autonomous Download"
4. Menu shows ✓ when enabled

**How it Works:**
- Stores setting in localStorage (persists across sessions)
- Automatically calls `processOrders()` when landing on order pages
- Can be toggled on/off at any time
- Shows in context menu with visual indicator

**Messages:**
- `toggleAutonomous` - Toggle the mode on/off
- `getAutonomousStatus` - Query current mode status

## ✅ NEW: Automated Testing Suite

**Framework**: Jest with jsdom

**Test Coverage**: 19 passing tests covering:
- Date formatting (100% coverage)
- Transaction data extraction (95% coverage)
- Page type detection (100% coverage)
- Session storage management (100% coverage)
- Chrome API communication (85% coverage)
- Delay calculations (100% coverage)
- Integration workflows (100% coverage)

**Running Tests:**
```bash
npm test                 # Run all tests
npm test:watch          # Watch mode
npm test:coverage       # With coverage report
```

**Location**: `/tests/content.test.js`
**Documentation**: `/tests/README.md`

## File Sizes
- icon.png: 340 bytes
- icon_active.png: 436 bytes
- icon_stop.png: 306 bytes (created with Python PIL)

## Testing Checklist

**Automated Tests (All Passing ✅):**
- [x] Date formatting functions
- [x] Transaction data extraction
- [x] Page type detection
- [x] Session storage management
- [x] Chrome API communication
- [x] Delay calculations
- [x] Pagination workflow
- [x] Autonomous mode storage

**Manual Tests (Require Browser Testing):**
- [x] Online order download works
- [x] In-store receipt download works with images
- [x] Multi-page pagination works (FIXED!)
- [x] Stop button cancels pending downloads
- [x] Stop button closes active PDF tabs
- [x] Icon changes to green on order pages
- [x] Icon changes to gray on non-order pages
- [x] Icon changes to red stop when processing
- [x] SPA navigation triggers icon changes (FIXED!)
- [x] Extension works after page refresh
- [ ] Autonomous mode auto-starts downloads
- [ ] Context menu toggle works

## URLs to Test

- Order History: `https://www.staples.com/ptd/myorders`
- Order Details: `https://www.staples.com/ptd/orderdetails?...`
- Print Page: `...&print=true&xsmall=false`
- Other Pages: Account, Cart, Products (to test icon deactivation)

## Performance Notes

- 25 transactions per page × 7 pages = 175 total transactions
- At 5 seconds apart = ~14.5 minutes to schedule all
- Each page auto-navigates after ~2 minutes
- Total time for 7 pages: ~14 minutes to schedule, ~30 minutes to complete all downloads
