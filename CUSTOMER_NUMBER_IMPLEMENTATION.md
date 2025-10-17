# Customer Number in Filenames - Implementation Complete

## Summary

Successfully implemented customer number in PDF filenames. Filenames now follow the format:
```
customerNumber-date-orderNumber-method-images.pdf
```

Example:
```
2148476399-2025-10-04-POS.542.20251004.4.23365-print-img.pdf
2148476399-2025-10-05-9932994306-direct.pdf
```

## Changes Made

### 1. content.js

**Added global customer number storage:**
```javascript
// Line 421: Store customer numbers mapped by order/transaction number
const customerNumberMap = new Map();
```

**Extract and store customer numbers from JSON (Line 713-721):**
```javascript
// Store customer numbers for each order
data.orderDetailsList.forEach(order => {
  const customerNumber = order.customerNumber;
  const orderNumber = order.orderNumber;
  if (customerNumber && orderNumber) {
    customerNumberMap.set(orderNumber, customerNumber);
    console.log(`Stored customer number ${customerNumber} for order ${orderNumber}`);
  }
});
```

**Pass customer number for in-store orders (Line 908-917):**
```javascript
// Get customer number from map (may be undefined if not found)
const customerNumber = customerNumberMap.get(transactionNumber);

chrome.runtime.sendMessage({
  message: 'capturePDF',
  url: printUrl,
  transactionNumber: transactionNumber,
  transactionDate: transactionDate,
  customerNumber: customerNumber,  // ← NEW
  printWithImages: printWithImages,
  delay: 0
});
```

**Pass customer number for online orders (Line 953-985):**
```javascript
// Get customer number from map
const customerNumber = customerNumberMap.get(orderNumber);

// For print mode
chrome.runtime.sendMessage({
  ...
  customerNumber: customerNumber,  // ← NEW
  ...
});

// For direct download
const customerPrefix = customerNumber ? `${customerNumber}-` : '';
const filename = `staples/${customerPrefix}${orderDate}-${orderNumber}-direct.pdf`;
```

### 2. background.js

**Accept customer number parameter (Line 120):**
```javascript
const { url, transactionNumber, transactionDate, customerNumber, printWithImages, retries } = request;
```

**Update function signature (Line 138):**
```javascript
async function capturePDFFromUrl(url, transactionNumber, transactionDate, customerNumber, printWithImages = true, retries = 0, senderTabId = null)
```

**Generate filename with customer number (Line 267-270):**
```javascript
const customerPrefix = customerNumber ? `${customerNumber}-` : '';
const imageSuffix = printWithImages ? '-img' : '-noimg';
const methodSuffix = '-print';
const filename = `staples/${customerPrefix}${transactionDate}-${transactionNumber}${methodSuffix}${imageSuffix}.pdf`;
```

## How It Works

1. **Fetch JSON**: When processing a page, `fetchCurrentPageOrderDetails()` fetches order data from the API
2. **Store mapping**: Each order's customer number is stored in a Map with the order number as key
3. **Lookup**: When downloading a receipt, we lookup the customer number from the Map
4. **Generate filename**: Filename is generated with customer number prefix (if available)

## Filename Formats

### In-Store Orders (Print Method)
```
2148476399-2025-10-04-POS.542.20251004.4.23365-print-img.pdf
2148476399-2025-10-04-POS.542.20251004.4.23365-print-noimg.pdf
```

### Online Orders (Direct Download)
```
2148476399-2025-10-05-9932994306-direct.pdf
```

### Online Orders (Print Method)
```
2148476399-2025-10-05-9932994306-print-img.pdf
2148476399-2025-10-05-9932994306-print-noimg.pdf
```

### Fallback (No Customer Number)
If customer number is not available:
```
2025-10-04-POS.542.20251004.4.23365-print-img.pdf
```

## Benefits

✅ **Easy Organization**: Sort and filter PDFs by customer number
✅ **Multi-Account Support**: Manage receipts for multiple Staples accounts
✅ **Quick Identification**: Know which customer's receipt at a glance
✅ **Backward Compatible**: Still works if customer number is missing

## Testing

To test the new format:
1. Reload the extension in Chrome
2. Navigate to Staples orders page
3. Click the extension icon to start processing
4. Check downloaded PDFs in the `staples/` folder
5. Verify filenames include customer number prefix

Expected result:
```
staples/2148476399-2025-10-04-POS.542.20251004.4.23365-print-img.pdf
```

## Next Steps (Future Enhancement)

The foundation is now in place for JSON-based processing:
- Customer numbers are already extracted from JSON
- We have a mapping system in place
- Could process all orders directly from JSON without page navigation
- Would be much faster (no page loads, no delays)

---

**Status**: ✅ COMPLETE
**Files Modified**: content.js, background.js
**Backward Compatible**: Yes (graceful fallback if customer number missing)
**Ready for Testing**: Yes
