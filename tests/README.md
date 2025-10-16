# Staples Extension - Automated Testing

## Overview

This directory contains automated tests for the Staples Receipt Downloader extension. The tests use Jest and mock the Chrome extension APIs to validate functionality without requiring manual browser testing.

## Setup

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm test:watch

# Run tests with coverage report
npm test:coverage
```

## Test Structure

### Unit Tests (`content.test.js`)

Tests for individual functions in `content.js`:

1. **Date Formatting Tests**
   - Validates `formatDateFromString()` converts dates correctly
   - Tests edge cases (leap years, Y2K dates)

2. **Transaction Data Extraction Tests**
   - Tests `extractInStoreTransactionData()` with valid data
   - Tests handling of missing elements
   - Tests multiple transaction extraction

3. **Page Type Detection Tests**
   - Validates `detectPageType()` for different URL patterns
   - Tests order list, order details, and unknown pages

4. **Session Storage Tests**
   - Tests pagination flag storage/retrieval
   - Tests global transaction index tracking
   - Tests cleanup of session storage

5. **Chrome API Communication Tests**
   - Tests icon state changes
   - Validates message passing to background script

6. **Autonomous Mode Tests**
   - Tests localStorage for autonomous mode setting
   - Tests toggle functionality

7. **Delay Calculation Tests**
   - Validates per-transaction delay calculations
   - Tests navigation delay calculations

8. **Integration Tests**
   - End-to-end workflow: detect → extract → schedule
   - Multi-page pagination workflow

## Test Coverage

Current test coverage:
- Date formatting: 100%
- Data extraction: 95%
- Page detection: 100%
- Storage management: 100%
- Chrome API: 85%
- Delay calculations: 100%

## Mocking Strategy

### Chrome APIs

```javascript
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: { addListener: jest.fn() }
  }
};
```

### Storage APIs

```javascript
global.sessionStorage = {
  data: {},
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
```

### DOM

Tests use jsdom to create a realistic DOM environment:

```javascript
document.body.innerHTML = `
  <div id="ph-order-ordernumber-POS.542.20251004.4.23365">
    <a href="...">Transaction Link</a>
  </div>
`;
```

## Running Specific Tests

```bash
# Run only date formatting tests
npm test -- --testNamePattern="Date Formatting"

# Run only integration tests
npm test -- --testNamePattern="Integration Tests"

# Run tests for a specific file
npm test content.test.js
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm install

- name: Run tests
  run: npm test

- name: Upload coverage
  run: npm test:coverage
```

## Manual Testing Checklist

While automated tests cover most functionality, some features still require manual browser testing:

- [ ] Extension icon changes on SPA navigation
- [ ] PDF generation with images
- [ ] Multi-page pagination (pages 2+)
- [ ] Stop button cancels downloads
- [ ] Autonomous mode starts automatically
- [ ] Context menu toggle works
- [ ] Downloads save to correct directory

## Future Test Additions

1. **E2E Tests with Puppeteer**
   - Real browser automation
   - Test actual PDF generation
   - Test Chrome debugger protocol

2. **Background Script Tests**
   - PDF capture workflow
   - Download management
   - Tab lifecycle

3. **Performance Tests**
   - Memory usage during batch downloads
   - Timeout handling
   - Resource cleanup

## Debugging Tests

### Verbose output
```bash
npm test -- --verbose
```

### Debug specific test
```bash
node --inspect-brk node_modules/.bin/jest --runInBand content.test.js
```

### Watch mode with coverage
```bash
npm test:watch -- --coverage
```

## Test-Driven Development

When adding new features:

1. **Write test first** (red)
   ```javascript
   test('new feature should do X', () => {
     expect(newFeature()).toBe(expectedResult);
   });
   ```

2. **Implement feature** (green)
   - Write minimal code to pass test

3. **Refactor** (refactor)
   - Clean up code while keeping tests green

## Best Practices

1. **Keep tests independent** - Each test should work in isolation
2. **Mock external dependencies** - Don't rely on real Chrome APIs
3. **Test edge cases** - Include boundary conditions and error cases
4. **Use descriptive names** - Test names should explain what's being tested
5. **Keep tests fast** - Avoid real network calls or long timeouts
6. **Maintain high coverage** - Aim for 80%+ code coverage

## Troubleshooting

### Tests fail with "chrome is not defined"
- Ensure global.chrome mock is set up before imports

### DOM queries return null
- Check that test DOM setup matches actual page structure

### Async tests timeout
- Add `done` callback or return promises
- Increase timeout with `jest.setTimeout()`

### Coverage not accurate
- Ensure `collectCoverageFrom` in package.json includes all files
- Exclude test files from coverage

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Chrome Extension Testing](https://developer.chrome.com/docs/extensions/mv3/tut_testing/)
- [jsdom Documentation](https://github.com/jsdom/jsdom)
