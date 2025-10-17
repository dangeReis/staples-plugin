import { jest, beforeEach } from '@jest/globals';

// Test setup for Jest
// Mocks global Chrome API for testing

global.chrome = {
  downloads: {
    download: jest.fn(),
    onChanged: {
      addListener: jest.fn()
    }
  },
  tabs: {
    create: jest.fn(),
    remove: jest.fn(),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    query: jest.fn()
  },
  debugger: {
    attach: jest.fn(),
    detach: jest.fn(),
    sendCommand: jest.fn(),
    onEvent: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    lastError: null,
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  }
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  global.chrome.runtime.lastError = null;
});