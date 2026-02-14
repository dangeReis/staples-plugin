/**
 * Fetch adapter — wraps the global fetch() for Staples API calls.
 *
 * Rides the user's browser session via `credentials: "include"` so that
 * cookie-based auth works without managing tokens ourselves.
 *
 * @module adapters/fetch
 */

/**
 * Creates a fetch adapter configured for Staples API calls.
 *
 * @param {Object} [options]
 * @param {typeof globalThis.fetch} [options.fetchFn] - Override for testing (defaults to global fetch)
 * @returns {Readonly<{ get: Function, post: Function }>}
 */
export function createFetchAdapter({ fetchFn } = {}) {
  const doFetch = fetchFn ?? (typeof fetch !== 'undefined' ? fetch : null);
  if (!doFetch) {
    throw new Error('FetchAdapter requires a fetch implementation (browser or polyfill)');
  }

  const DEFAULT_HEADERS = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  /**
   * @param {string} url
   * @param {Object} [options]
   * @param {Record<string, string>} [options.headers] - Extra headers to merge
   * @param {number} [options.timeout] - Abort after N ms (default: 15000)
   * @returns {Promise<{ status: number, ok: boolean, data: any }>}
   */
  async function get(url, { headers = {}, timeout = 15000 } = {}) {
    if (!url || typeof url !== 'string') {
      throw new Error('FetchAdapter.get requires a URL string');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await doFetch(url, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: { ...DEFAULT_HEADERS, ...headers },
        signal: controller.signal,
      });

      const data = await response.json();
      return { status: response.status, ok: response.ok, data };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`FetchAdapter.get timed out after ${timeout}ms: ${url}`);
      }
      throw new Error(`FetchAdapter.get failed: ${error.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * @param {string} url
   * @param {any} body - Will be JSON.stringified
   * @param {Object} [options]
   * @param {Record<string, string>} [options.headers]
   * @param {number} [options.timeout]
   * @returns {Promise<{ status: number, ok: boolean, data: any }>}
   */
  async function post(url, body, { headers = {}, timeout = 15000 } = {}) {
    if (!url || typeof url !== 'string') {
      throw new Error('FetchAdapter.post requires a URL string');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await doFetch(url, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: { ...DEFAULT_HEADERS, ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await response.json();
      return { status: response.status, ok: response.ok, data };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`FetchAdapter.post timed out after ${timeout}ms: ${url}`);
      }
      throw new Error(`FetchAdapter.post failed: ${error.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({ get, post });
}
