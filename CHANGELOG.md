# Changelog

## [Unreleased]

### ✅ Fixed
- **SPA Navigation Detection** - Icon now changes correctly when navigating between pages
  - Implemented 3 parallel detection strategies (MutationObserver, Polling, History API)
  - Added extensive console logging for debugging
  - Works with back/forward navigation

- **Page 2+ Pagination** - Downloads now work on all pages, not just page 1
  - Fixed `window.load` event issue (only fires once in SPAs)
  - Integrated auto-processing into URL change handler
  - Properly maintains transaction index across pages

### ✨ Added
- **Autonomous Download Mode**
  - Right-click extension icon → "Toggle Autonomous Download"
  - Automatically starts downloading when visiting orders page
  - Setting persists across browser sessions
  - Visual indicator in context menu (✓ when enabled)

- **Automated Testing Suite**
  - 19 comprehensive tests using Jest + jsdom
  - Covers date formatting, data extraction, page detection, storage, delays
  - Full integration tests for workflows
  - Run with: `npm test`, `npm test:watch`, `npm run test:coverage`

### 🔧 Changed
- Added `contextMenus` permission to manifest.json
- Removed window.load event listener (replaced with URL change detection)
- Centralized URL change handling in `handleUrlChange()` function
- Added `checkAndAutoProcess()` for pagination and autonomous mode

### 📝 Documentation
- Updated CONTEXT.md with all fixes and new features
- Created comprehensive test documentation in `tests/README.md`
- Added testing checklist (automated + manual)
- Documented all detection strategies and workflows

---

## Summary of Changes

**Files Modified:**
- `content.js` - Major refactor for URL detection and autonomous mode
- `background.js` - Added context menu support
- `manifest.json` - Added contextMenus permission
- `CONTEXT.md` - Comprehensive updates

**Files Created:**
- `tests/content.test.js` - 19 automated tests
- `tests/README.md` - Test documentation
- `package.json` - Jest configuration
- `CHANGELOG.md` - This file

**Lines of Code:**
- Tests: ~450 lines
- Test docs: ~200 lines
- Code changes: ~150 lines modified/added

**Test Results:**
```
Test Suites: 1 passed
Tests:       19 passed
Time:        0.675 s
```

All major issues resolved! 🎉
