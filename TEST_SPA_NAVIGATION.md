# Quick Test: SPA Navigation Detection

## Step-by-Step Test Instructions

### 1. Reload the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Find "Staples Receipt Downloader"
3. Click the **reload/refresh** icon (circular arrow)
4. Confirm it says "Errors: 0" and is enabled

### 2. Open Staples and Console

1. Navigate to: `https://www.staples.com/ptd/myorders`
2. Press **F12** to open Developer Tools
3. Click the **Console** tab
4. Look for this message (confirms extension loaded):
   ```
   === STAPLES EXTENSION CONTENT SCRIPT LOADED ===
   ```

### 3. Test Online Orders Page

**Expected Console Output:**
```
Setting up URL change detection...
All URL detection strategies initialized (including hashchange and DOM-based)
=== HANDLING URL CHANGE ===
URL: https://www.staples.com/ptd/myorders
Is in-store orders: false
Is online orders: true
✓ On order page, sending ACTIVE message
```

**Visual Check:**
- ✅ Extension icon is **colored/active** (not grayed out)
- ✅ You can see online orders on the page

### 4. Navigate to In-Store Orders

**Action:** Click on "In-Store" tab or manually navigate to:
`https://www.staples.com/ptd/myorders/instore`

**Expected Console Output (one or more of these):**
```
*** POLLING DETECTED URL CHANGE ***
Old URL: https://www.staples.com/ptd/myorders
New URL: https://www.staples.com/ptd/myorders/instore

--- OR ---

*** DOM-BASED PAGE TYPE MISMATCH DETECTED ***
Expected URL pattern: /ptd/myorders/instore
Current URL: https://www.staples.com/ptd/myorders
Has in-store transactions: true
Has online orders: false
Forcing handleUrlChange...

--- THEN ---

=== HANDLING URL CHANGE ===
URL: https://www.staples.com/ptd/myorders/instore
Is in-store orders: true
Is online orders: false
✓ On order page, sending ACTIVE message
Active icon message sent successfully
```

**Visual Check:**
- ✅ Extension icon is still **colored/active**
- ✅ You can see in-store transactions on the page
- ✅ Clicking the icon opens the popup and works

### 5. Test Navigation Back

**Action:** Navigate back to online orders:
`https://www.staples.com/ptd/myorders`

**Expected Console Output:**
```
*** POLLING DETECTED URL CHANGE ***
Old URL: https://www.staples.com/ptd/myorders/instore
New URL: https://www.staples.com/ptd/myorders

=== HANDLING URL CHANGE ===
URL: https://www.staples.com/ptd/myorders
Is in-store orders: false
Is online orders: true
✓ On order page, sending ACTIVE message
```

## Success Criteria

✅ **PASS** if you see ANY of these detection messages:
- `*** POLLING DETECTED URL CHANGE ***`
- `*** HISTORY.PUSHSTATE CALLED ***`
- `*** DOM-BASED PAGE TYPE MISMATCH DETECTED ***`
- `*** PAGE TYPE OBSERVER DETECTED URL MISMATCH ***`

✅ **PASS** if:
- Icon stays active on both pages
- Console shows `Is in-store orders: true` on in-store page
- Console shows `Is online orders: true` on online orders page
- Clicking icon works on both pages

❌ **FAIL** if:
- No detection messages appear
- Icon turns gray/inactive
- Console shows errors in red
- Extension doesn't respond to clicks

## Troubleshooting Failed Test

### If navigation is NOT detected:

**1. Check if content script loaded:**
```javascript
// Run in console:
typeof handleUrlChange
// Expected: "function"
```

**2. Manually trigger detection:**
```javascript
// Run in console:
handleUrlChange(location.href)
// Should trigger URL change handling
```

**3. Check for elements:**
```javascript
// On in-store page, run in console:
document.querySelector('[id^="ph-order-ordernumber-POS"]')
// Expected: Should return a DOM element, not null

// On online page, run in console:
document.querySelector('[id^="ph-order-container"]')
// Expected: Should return a DOM element, not null
```

**4. Check observers:**
```javascript
// Run in console:
console.log('Observers initialized:',
  typeof pageTypeObserver !== 'undefined',
  typeof paginationObserver !== 'undefined'
)
// Expected: true, true
```

### If you see errors:

1. Copy the error message
2. Note which page you're on (online or in-store)
3. Check if `content.js` has any syntax errors
4. Try reloading the extension again

## Advanced Debugging

If basic test fails, enable verbose logging:

```javascript
// Run in console to see all polling checks:
setInterval(() => {
  console.log('POLL CHECK - URL:', location.href, 'lastUrl:', lastUrl);
}, 2000);
```

This will log every 2 seconds and show if URL is being checked.

## Expected Results Summary

| Action | Expected Behavior |
|--------|------------------|
| Load online orders | Icon active, console shows detection |
| Navigate to in-store | Detection message appears, icon stays active |
| Navigate back to online | Detection message appears, icon stays active |
| Click icon on either page | Popup opens and functions work |

## Report Results

If test **PASSES**: You're all set! The SPA navigation is working perfectly.

If test **FAILS**: Please provide:
1. Console output (copy all messages)
2. Which step failed
3. Any red error messages
4. Browser version (chrome://version)

---

**Test Duration**: ~2 minutes
**Prerequisites**: Extension installed and Staples account logged in
**Browser**: Chrome/Edge (Chromium-based)
