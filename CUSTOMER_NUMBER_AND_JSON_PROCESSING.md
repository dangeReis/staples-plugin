# Customer Number in Filenames & JSON-Based Processing

## Overview

Two major improvements requested:
1. **Add customer/account number to PDF filenames**
2. **Process orders directly from JSON files (no need to navigate pages)**

## Current State

### Current Filename Format
```
staples/2025-10-04-POS.542.20251004.4.23365-print-img.pdf
staples/2025-10-05-9932994306-direct.pdf
```

### Desired Filename Format
```
staples/2148476399-2025-10-04-POS.542.20251004.4.23365-print-img.pdf
staples/2148476399-2025-10-05-9932994306-direct.pdf
```

Format: `{customerNumber}-{date}-{orderNumber}-{method}-{images}.pdf`

## Challenge

The customer number is available in:
1. **JSON data** - Easy to extract
2. **DOM** - Would need to extract from page

But when we create the PDF filename in `background.js`, we don't have access to the customer number!

## Solution Approach

### Option 1: Pass Customer Number Through (Recommended)
Extract customer number from JSON/DOM and pass it through the entire chain:

```
JSON/DOM → content.js → chrome.runtime.sendMessage → background.js → filename
```

### Option 2: JSON-Based Processing (Better!)
Since we already fetch and save all order data as JSON:
1. User clicks "Process from JSON" button in popup
2. Extension reads the JSON files from the `data/` folder
3. Processes all orders directly from JSON without navigating pages
4. Much faster! No page navigation delays

## Implementation Plan

###Step 1: Add Customer Number to Message
In `content.js`, when sending download requests:

```javascript
// Before
chrome.runtime.sendMessage({
  message: 'capturePDF',
  url: printUrl,
  transactionNumber: transactionNumber,
  transactionDate: transactionDate,
  printWithImages: printWithImages,
  delay: 0
});

// After
chrome.runtime.sendMessage({
  message: 'capturePDF',
  url: printUrl,
  transactionNumber: transactionNumber,
  transactionDate: transactionDate,
  customerNumber: customerNumber,  // ← ADD THIS
  printWithImages: printWithImages,
  delay: 0
});
```

### Step 2: Extract Customer Number from Page
In `content.js`, extract from JSON API response or DOM:

```javascript
// From JSON (already available in fetchCurrentPageOrderDetails)
const customerNumber = order.customerNumber;

// Pass it along with other order data
```

### Step 3: Update Filename Generation
In `background.js`, line 269:

```javascript
// Before
const filename = `staples/${transactionDate}-${transactionNumber}${methodSuffix}${imageSuffix}.pdf`;

// After
const customerPrefix = customerNumber ? `${customerNumber}-` : '';
const filename = `staples/${customerPrefix}${transactionDate}-${transactionNumber}${methodSuffix}${imageSuffix}.pdf`;
```

### Step 4: JSON-Based Processing (Bonus Feature!)
Add new function in `content.js`:

```javascript
async function processOrdersFromJSON() {
  console.log('Processing orders from saved JSON files...');

  // Fetch all JSON files from the API (we already have fetchOrderDetails function)
  const allOrders = await fetchOrderDetails();

  // Process each order
  allOrders.forEach((order, index) => {
    const delay = index * 3000; // 3-second spacing

    setTimeout(() => {
      // Extract order info
      const orderNumber = order.orderNumber;
      const orderDate = formatOrderDate(order.orderDate);
      const customerNumber = order.customerNumber;

      // Determine if it's in-store or online
      if (order.orderChannel === 'INSTORE' || order.orderType === 'POS') {
        // Process as in-store transaction
        processInstoreOrder(order, customerNumber);
      } else {
        // Process as online order
        processOnlineOrder(order, customerNumber);
      }
    }, delay);
  });

  console.log(`Scheduled ${allOrders.length} orders for processing from JSON`);
}
```

## Benefits

### Customer Number in Filename
✅ **Easy Organization**: Sort/filter by customer
✅ **Multi-Account Support**: Manage multiple accounts easily
✅ **Quick Identification**: Know whose receipt at a glance

### JSON-Based Processing
✅ **Much Faster**: No page navigation delays!
✅ **More Reliable**: No SPA navigation issues
✅ **Simpler Code**: Direct processing from data
✅ **Offline Capable**: Can process even if website is slow

## Example Workflow

### Traditional (Current)
1. Navigate to page 1
2. Wait for load
3. Extract orders from DOM
4. Download receipts
5. Navigate to page 2
6. Repeat...

**Time**: ~5-10 seconds per page × 7 pages = **35-70 seconds**

### JSON-Based (New)
1. Click "Process from JSON"
2. Fetch all order data from API (already done during page view)
3. Process all orders in parallel

**Time**: All orders queued immediately = **~10 seconds total**

## Implementation Status

- [ ] Extract customer number from JSON
- [ ] Pass customer number through message chain
- [ ] Update filename generation in background.js
- [ ] Add JSON-based processing function
- [ ] Add UI button for "Process from JSON"
- [ ] Test with multiple accounts
- [ ] Document new workflow

## File Changes Required

1. **content.js**
   - Extract customerNumber from JSON/DOM
   - Pass in all sendMessage calls
   - Add processOrdersFromJSON() function

2. **background.js**
   - Accept customerNumber parameter
   - Update filename generation

3. **popup.html / popup.js**
   - Add "Process from JSON" button
   - Wire up to new message handler

## Testing

Test scenarios:
- [ ] In-store transaction with customer number
- [ ] Online order with customer number
- [ ] Mixed orders from JSON
- [ ] Multiple pages
- [ ] Error handling when customer number missing

---

**Priority**: HIGH - These are major quality-of-life improvements
**Complexity**: MEDIUM - Requires coordinated changes across multiple files
**Impact**: HIGH - Much better user experience and performance
