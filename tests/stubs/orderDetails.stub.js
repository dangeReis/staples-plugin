/**
 * Stub implementation of the OrderDetails interface.
 *
 * Uses the mock fetch adapter with the fixture data to simulate
 * enriching orders without hitting the real Staples API.
 *
 * The stub matches the behaviour of createOrderDetailsApi:
 * - Takes a discovered order with orderUrlKey
 * - Returns an enriched order with items, returns, financials
 * - Throws OrderDetailsError on missing orderUrlKey or bad responses
 *
 * This stub is used for contract tests and swap integration tests.
 */
import { createRequire } from 'module';
import { createOrderDetailsApi } from '../../src/modules/orderDetails/api.js';
import { createMockFetchAdapter } from '../../src/adapters/mocks.js';

const require = createRequire(import.meta.url);
const fixtureData = require('./fixtures/orderDetailsResponse.json');

/**
 * Creates a stub OrderDetails backed by fixture data.
 *
 * @param {Object} [options]
 * @param {Object} [options.responseOverrides] - URL-pattern-matched overrides for the mock fetch
 * @returns {{ enrich: Function, _fetch: Object }} The stub + exposed fetch for test assertions
 */
export function createStubOrderDetails({ responseOverrides = {} } = {}) {
  const defaultResponses = {
    // Any URL containing 'orderdetails' gets the fixture response
    'orderdetails': { status: 200, ok: true, data: fixtureData },
    ...responseOverrides,
  };

  const mockFetch = createMockFetchAdapter(defaultResponses);

  // Reuse the real API implementation — just swap in mock fetch
  const api = createOrderDetailsApi({ fetch: mockFetch });

  return {
    enrich: api.enrich,
    /** Exposed for test assertions on API calls */
    _fetch: mockFetch,
  };
}
