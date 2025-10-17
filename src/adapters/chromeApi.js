const DEFAULT_DOWNLOAD_OPTIONS = { saveAs: false };

function ensureChrome(chromeOverride) {
  const chromeInstance = chromeOverride ?? globalThis.chrome;
  if (!chromeInstance) {
    throw new Error('Chrome API is not available');
  }
  return chromeInstance;
}

function createCallbackHandler({ chromeInstance, resolve, reject, transform }) {
  return (...args) => {
    const runtime = chromeInstance.runtime;
    if (runtime && runtime.lastError) {
      reject(new Error(runtime.lastError.message));
      return;
    }

    if (typeof transform === 'function') {
      try {
        resolve(transform(...args));
      } catch (error) {
        reject(error);
      }
    } else {
      resolve(args[0]);
    }
  };
}

function validateDownloadOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('ChromeDownloadsAdapter.download requires an options object');
  }

  const { url, filename } = options;
  if (!url || typeof url !== 'string') {
    throw new Error('ChromeDownloadsAdapter.download requires a url string');
  }

  if (!filename || typeof filename !== 'string') {
    throw new Error('ChromeDownloadsAdapter.download requires a filename string');
  }
}

function createDownloadsAdapter(chromeOverride) {
  const adapter = {
    async download({ url, filename, saveAs = DEFAULT_DOWNLOAD_OPTIONS.saveAs } = {}) {
      const chromeInstance = ensureChrome(chromeOverride);
      const downloadsApi = chromeInstance.downloads;
      if (!downloadsApi || typeof downloadsApi.download !== 'function') {
        throw new Error('chrome.downloads.download API is not available');
      }

      validateDownloadOptions({ url, filename });

      return new Promise((resolve, reject) => {
        downloadsApi.download({ url, filename, saveAs }, createCallbackHandler({
          chromeInstance,
          resolve,
          reject
        }));
      });
    },

    async erase(query = {}) {
      const chromeInstance = ensureChrome(chromeOverride);
      const downloadsApi = chromeInstance.downloads;
      if (!downloadsApi || typeof downloadsApi.erase !== 'function') {
        throw new Error('chrome.downloads.erase API is not available');
      }

      return new Promise((resolve, reject) => {
        downloadsApi.erase(query, createCallbackHandler({
          chromeInstance,
          resolve,
          reject,
          transform: (erasedIds) => erasedIds
        }));
      });
    },

    async search(query = {}) {
      const chromeInstance = ensureChrome(chromeOverride);
      const downloadsApi = chromeInstance.downloads;
      if (!downloadsApi || typeof downloadsApi.search !== 'function') {
        throw new Error('chrome.downloads.search API is not available');
      }

      return new Promise((resolve, reject) => {
        downloadsApi.search(query, createCallbackHandler({
          chromeInstance,
          resolve,
          reject,
          transform: (results) => results
        }));
      });
    }
  };

  return Object.freeze(adapter);
}

function createTabsAdapter(chromeOverride) {
  const adapter = {
    async create(createProperties) {
      const chromeInstance = ensureChrome(chromeOverride);
      const tabsApi = chromeInstance.tabs;
      if (!tabsApi || typeof tabsApi.create !== 'function') {
        throw new Error('chrome.tabs.create API is not available');
      }

      return new Promise((resolve, reject) => {
        tabsApi.create(createProperties, createCallbackHandler({
          chromeInstance,
          resolve,
          reject
        }));
      });
    },

    async update(tabId, updateProperties) {
      if (typeof tabId !== 'number') {
        throw new Error('ChromeTabsAdapter.update requires a numeric tabId');
      }

      const chromeInstance = ensureChrome(chromeOverride);
      const tabsApi = chromeInstance.tabs;
      if (!tabsApi || typeof tabsApi.update !== 'function') {
        throw new Error('chrome.tabs.update API is not available');
      }

      return new Promise((resolve, reject) => {
        tabsApi.update(tabId, updateProperties, createCallbackHandler({
          chromeInstance,
          resolve,
          reject
        }));
      });
    },

    async remove(tabIds) {
      const chromeInstance = ensureChrome(chromeOverride);
      const tabsApi = chromeInstance.tabs;
      if (!tabsApi || typeof tabsApi.remove !== 'function') {
        throw new Error('chrome.tabs.remove API is not available');
      }

      return new Promise((resolve, reject) => {
        tabsApi.remove(tabIds, createCallbackHandler({
          chromeInstance,
          resolve,
          reject,
          transform: () => undefined
        }));
      });
    },

    async sendMessage(tabId, message, options) {
      if (typeof tabId !== 'number') {
        throw new Error('ChromeTabsAdapter.sendMessage requires a numeric tabId');
      }

      const chromeInstance = ensureChrome(chromeOverride);
      const tabsApi = chromeInstance.tabs;
      if (!tabsApi || typeof tabsApi.sendMessage !== 'function') {
        throw new Error('chrome.tabs.sendMessage API is not available');
      }

      return new Promise((resolve, reject) => {
        tabsApi.sendMessage(tabId, message, options, createCallbackHandler({
          chromeInstance,
          resolve,
          reject
        }));
      });
    },

    async query(queryInfo) {
      const chromeInstance = ensureChrome(chromeOverride);
      const tabsApi = chromeInstance.tabs;
      if (!tabsApi || typeof tabsApi.query !== 'function') {
        throw new Error('chrome.tabs.query API is not available');
      }

      return new Promise((resolve, reject) => {
        tabsApi.query(queryInfo, createCallbackHandler({
          chromeInstance,
          resolve,
          reject
        }));
      });
    }
  };

  return Object.freeze(adapter);
}

function createDebuggerAdapter(chromeOverride) {
  const adapter = {
    async attach(target, requiredVersion = '1.3') {
      const chromeInstance = ensureChrome(chromeOverride);
      const debuggerApi = chromeInstance.debugger;
      if (!debuggerApi || typeof debuggerApi.attach !== 'function') {
        throw new Error('chrome.debugger.attach API is not available');
      }

      return new Promise((resolve, reject) => {
        debuggerApi.attach(target, requiredVersion, createCallbackHandler({
          chromeInstance,
          resolve,
          reject,
          transform: () => undefined
        }));
      });
    },

    async detach(target) {
      const chromeInstance = ensureChrome(chromeOverride);
      const debuggerApi = chromeInstance.debugger;
      if (!debuggerApi || typeof debuggerApi.detach !== 'function') {
        throw new Error('chrome.debugger.detach API is not available');
      }

      return new Promise((resolve, reject) => {
        debuggerApi.detach(target, createCallbackHandler({
          chromeInstance,
          resolve,
          reject,
          transform: () => undefined
        }));
      });
    },

    async sendCommand(target, method, commandParams = {}) {
      if (!method || typeof method !== 'string') {
        throw new Error('ChromeDebuggerAdapter.sendCommand requires a method string');
      }

      const chromeInstance = ensureChrome(chromeOverride);
      const debuggerApi = chromeInstance.debugger;
      if (!debuggerApi || typeof debuggerApi.sendCommand !== 'function') {
        throw new Error('chrome.debugger.sendCommand API is not available');
      }

      return new Promise((resolve, reject) => {
        debuggerApi.sendCommand(target, method, commandParams, createCallbackHandler({
          chromeInstance,
          resolve,
          reject
        }));
      });
    }
  };

  return Object.freeze(adapter);
}

function createStorageAdapter(chromeOverride) {
  const adapter = {
    async get(keys, area = 'local') {
      const chromeInstance = ensureChrome(chromeOverride);
      const storageArea = resolveStorageArea({ chromeInstance, area });
      return new Promise((resolve, reject) => {
        storageArea.get(keys, createCallbackHandler({
          chromeInstance,
          resolve,
          reject
        }));
      });
    },

    async set(items, area = 'local') {
      const chromeInstance = ensureChrome(chromeOverride);
      const storageArea = resolveStorageArea({ chromeInstance, area });
      return new Promise((resolve, reject) => {
        storageArea.set(items, createCallbackHandler({
          chromeInstance,
          resolve,
          reject,
          transform: () => undefined
        }));
      });
    },

    async remove(keys, area = 'local') {
      const chromeInstance = ensureChrome(chromeOverride);
      const storageArea = resolveStorageArea({ chromeInstance, area });
      return new Promise((resolve, reject) => {
        storageArea.remove(keys, createCallbackHandler({
          chromeInstance,
          resolve,
          reject,
          transform: () => undefined
        }));
      });
    },

    async clear(area = 'local') {
      const chromeInstance = ensureChrome(chromeOverride);
      const storageArea = resolveStorageArea({ chromeInstance, area });
      return new Promise((resolve, reject) => {
        storageArea.clear(createCallbackHandler({
          chromeInstance,
          resolve,
          reject,
          transform: () => undefined
        }));
      });
    }
  };

  return Object.freeze(adapter);
}

function resolveStorageArea({ chromeInstance, area }) {
  const storageApi = chromeInstance.storage;
  if (!storageApi) {
    throw new Error('chrome.storage API is not available');
  }

  const storageArea = storageApi[area];
  if (!storageArea) {
    throw new Error(`chrome.storage.${area} API is not available`);
  }

  return storageArea;
}

export function createChromeDownloadsAdapter(chromeOverride) {
  return createDownloadsAdapter(chromeOverride);
}

export function createChromeTabsAdapter(chromeOverride) {
  return createTabsAdapter(chromeOverride);
}

export function createChromeDebuggerAdapter(chromeOverride) {
  return createDebuggerAdapter(chromeOverride);
}

export function createChromeStorageAdapter(chromeOverride) {
  return createStorageAdapter(chromeOverride);
}

export const ChromeDownloadsAdapter = createChromeDownloadsAdapter();
export const ChromeTabsAdapter = createChromeTabsAdapter();
export const ChromeDebuggerAdapter = createChromeDebuggerAdapter();
export const ChromeStorageAdapter = createChromeStorageAdapter();
