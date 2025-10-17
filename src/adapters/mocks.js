function createIdGenerator(start = 1) {
  let current = start;
  return () => current++;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createMockChromeDownloadsAdapter() {
  const downloads = new Map();
  const nextId = createIdGenerator(1);

  return Object.freeze({
    async download({ url, filename }) {
      if (!url || !filename) {
        throw new Error('MockChromeDownloadsAdapter.download requires url and filename');
      }

      const id = nextId();
      downloads.set(id, { id, url, filename, state: 'complete' });
      return id;
    },

    async erase() {
      const erasedIds = Array.from(downloads.keys());
      downloads.clear();
      return erasedIds;
    },

    async search() {
      return Array.from(downloads.values()).map((entry) => ({
        id: entry.id,
        url: entry.url,
        filename: entry.filename,
        state: entry.state
      }));
    }
  });
}

export function createMockChromeTabsAdapter() {
  const tabs = new Map();
  const nextTabId = createIdGenerator(1);

  function normalizeTab(tab) {
    return {
      id: tab.id,
      url: tab.url ?? null,
      active: Boolean(tab.active),
      status: tab.status ?? 'complete',
      title: tab.title ?? '',
      windowId: tab.windowId ?? 1
    };
  }

  return Object.freeze({
    async create(createProperties = {}) {
      const id = createProperties.id ?? nextTabId();
      const tab = normalizeTab({ ...createProperties, id });
      tabs.set(id, tab);
      return tab;
    },

    async update(tabId, updateProperties = {}) {
      if (!tabs.has(tabId)) {
        throw new Error(`MockChromeTabsAdapter.update: tab ${tabId} not found`);
      }
      const updated = normalizeTab({ ...tabs.get(tabId), ...updateProperties, id: tabId });
      tabs.set(tabId, updated);
      return deepClone(updated);
    },

    async remove(tabIds) {
      const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
      ids.forEach((id) => tabs.delete(id));
    },

    async sendMessage(tabId, message) {
      if (!tabs.has(tabId)) {
        throw new Error(`MockChromeTabsAdapter.sendMessage: tab ${tabId} not found`);
      }
      return { tabId, message };
    },

    async query(queryInfo = {}) {
      const results = Array.from(tabs.values()).filter((tab) => {
        if (queryInfo.active !== undefined && tab.active !== queryInfo.active) {
          return false;
        }
        if (queryInfo.status && tab.status !== queryInfo.status) {
          return false;
        }
        if (queryInfo.url && tab.url !== queryInfo.url) {
          return false;
        }
        if (queryInfo.windowId && tab.windowId !== queryInfo.windowId) {
          return false;
        }
        return true;
      });
      return deepClone(results);
    }
  });
}

export function createMockChromeDebuggerAdapter() {
  const attachedTargets = new Set();

  function toKey(target) {
    return JSON.stringify(target ?? {});
  }

  return Object.freeze({
    async attach(target) {
      attachedTargets.add(toKey(target));
    },

    async detach(target) {
      attachedTargets.delete(toKey(target));
    },

    async sendCommand(target, method, params = {}) {
      if (!attachedTargets.has(toKey(target))) {
        throw new Error('MockChromeDebuggerAdapter.sendCommand requires attached target');
      }
      return { method, params };
    }
  });
}

export function createMockChromeStorageAdapter(initialState = {}) {
  const areas = {
    local: new Map(Object.entries(initialState.local || {})),
    sync: new Map(Object.entries(initialState.sync || {})),
    session: new Map(Object.entries(initialState.session || {}))
  };

  function getArea(area = 'local') {
    if (!areas[area]) {
      throw new Error(`MockChromeStorageAdapter area "${area}" is not supported`);
    }
    return areas[area];
  }

  return Object.freeze({
    async get(keys, area = 'local') {
      const storage = getArea(area);

      if (keys === undefined) {
        return Object.fromEntries(storage.entries());
      }

      if (typeof keys === 'string') {
        return { [keys]: storage.get(keys) };
      }

      if (Array.isArray(keys)) {
        return keys.reduce((acc, key) => {
          acc[key] = storage.get(key);
          return acc;
        }, {});
      }

      if (typeof keys === 'object' && keys !== null) {
        return Object.keys(keys).reduce((acc, key) => {
          acc[key] = storage.has(key) ? storage.get(key) : keys[key];
          return acc;
        }, {});
      }

      throw new Error('MockChromeStorageAdapter.get received unsupported keys');
    },

    async set(items, area = 'local') {
      if (!items || typeof items !== 'object') {
        throw new Error('MockChromeStorageAdapter.set requires an object');
      }
      const storage = getArea(area);
      Object.entries(items).forEach(([key, value]) => {
        storage.set(key, value);
      });
    },

    async remove(keys, area = 'local') {
      const storage = getArea(area);
      const toRemove = Array.isArray(keys) ? keys : [keys];
      toRemove.forEach((key) => storage.delete(key));
    },

    async clear(area = 'local') {
      const storage = getArea(area);
      storage.clear();
    }
  });
}

export function createMockDOMAdapter(initialElements = {}) {
  const elements = new Map(Object.entries(initialElements));

  const api = {
    querySelector: (selector) => elements.get(selector) ?? null,
    querySelectorAll: (selector) => (elements.has(selector) ? [elements.get(selector)] : []),
    createElement: (tagName, { attributes = {}, textContent } = {}) => {
      const element = { tagName, attributes: { ...attributes }, textContent: textContent ?? '', value: '' };
      return element;
    },
    getText: (element) => element?.textContent ?? '',
    setText: (element, value) => {
      if (element) {
        element.textContent = value;
      }
    },
    getValue: (element) => element?.value,
    setValue: (element, value) => {
      if (element) {
        element.value = value;
      }
    },
    click: () => {},
    waitForSelector: async (selector) => {
      if (!elements.has(selector)) {
        throw new Error(`MockDOMAdapter.waitForSelector could not find selector "${selector}"`);
      }
      return elements.get(selector);
    },
    observeMutations: () => () => {},
    register(selector, element) {
      elements.set(selector, element);
      return element;
    },
    unregister(selector) {
      elements.delete(selector);
    }
  };

  return Object.freeze(api);
}

export const MockChromeDownloadsAdapter = createMockChromeDownloadsAdapter();
export const MockChromeTabsAdapter = createMockChromeTabsAdapter();
export const MockChromeDebuggerAdapter = createMockChromeDebuggerAdapter();
export const MockChromeStorageAdapter = createMockChromeStorageAdapter();
export const MockDOMAdapter = createMockDOMAdapter();
