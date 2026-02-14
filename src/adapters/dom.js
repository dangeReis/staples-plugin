function ensureDocument(documentOverride) {
  const doc = documentOverride ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) {
    throw new Error('DOMAdapter requires a document context');
  }
  return doc;
}

function ensureElement(element, functionName) {
  if (!element) {
    throw new Error(`DOMAdapter.${functionName} requires a DOM element`);
  }
  return element;
}

function toArray(nodeList) {
  return Array.from(nodeList || []);
}

function createWaitForSelector({ doc, selector, root, timeout, interval }) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const searchRoot = root ?? doc;

    const check = () => {
      const element = searchRoot.querySelector(selector);
      if (element) {
        resolve(element);
        return true;
      }

      if (Date.now() - start >= timeout) {
        reject(new Error(`DOMAdapter.waitForSelector timed out waiting for "${selector}"`));
        return true;
      }

      return false;
    };

    if (check()) {
      return;
    }

    const timer = setInterval(() => {
      if (check()) {
        clearInterval(timer);
      }
    }, interval);
  });
}

export function createDOMAdapter({ document: documentOverride } = {}) {
  const doc = ensureDocument(documentOverride);

  const adapter = {
    querySelector(selector, { root } = {}) {
      if (typeof selector !== 'string' || selector.length === 0) {
        throw new Error('DOMAdapter.querySelector requires a selector string');
      }

      const searchRoot = root ?? doc;
      return searchRoot.querySelector(selector);
    },

    querySelectorAll(selector, { root } = {}) {
      if (typeof selector !== 'string' || selector.length === 0) {
        throw new Error('DOMAdapter.querySelectorAll requires a selector string');
      }

      const searchRoot = root ?? doc;
      return toArray(searchRoot.querySelectorAll(selector));
    },

    createElement(tagName, { attributes = {}, textContent } = {}) {
      if (typeof tagName !== 'string' || tagName.length === 0) {
        throw new Error('DOMAdapter.createElement requires a tagName string');
      }

      const element = doc.createElement(tagName);
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });

      if (typeof textContent === 'string') {
        element.textContent = textContent;
      }

      return element;
    },

    getText(element) {
      const target = ensureElement(element, 'getText');
      return (target.textContent || '').trim();
    },

    setText(element, value) {
      const target = ensureElement(element, 'setText');
      target.textContent = value;
    },

    getValue(element) {
      const target = ensureElement(element, 'getValue');
      return target.value;
    },

    setValue(element, value) {
      const target = ensureElement(element, 'setValue');
      target.value = value;
      const event = new Event('input', { bubbles: true });
      target.dispatchEvent(event);
    },

    getAttribute(element, attributeName) {
      const target = ensureElement(element, 'getAttribute');
      if (typeof attributeName !== 'string' || attributeName.length === 0) {
        throw new Error('DOMAdapter.getAttribute requires an attributeName string');
      }
      return target.getAttribute(attributeName);
    },

    click(element) {
      const target = ensureElement(element, 'click');
      target.click();
    },

    waitForSelector(selector, { root, timeout = 5000, interval = 100 } = {}) {
      if (typeof selector !== 'string' || selector.length === 0) {
        throw new Error('DOMAdapter.waitForSelector requires a selector string');
      }

      return createWaitForSelector({
        doc,
        selector,
        root,
        timeout,
        interval
      });
    },

    observeMutations(element, callback, options = { childList: true, subtree: true }) {
      const target = ensureElement(element, 'observeMutations');
      if (typeof callback !== 'function') {
        throw new Error('DOMAdapter.observeMutations requires a callback function');
      }

      if (typeof MutationObserver === 'undefined') {
        throw new Error('MutationObserver is not available in this environment');
      }

      const observer = new MutationObserver((mutationsList) => {
        callback(mutationsList);
      });

      observer.observe(target, options);
      return () => observer.disconnect();
    }
  };

  return Object.freeze(adapter);
}

let defaultDOMAdapter = null;
try {
  defaultDOMAdapter = createDOMAdapter();
} catch (error) {
  defaultDOMAdapter = null;
}

export const DOMAdapter = defaultDOMAdapter;
