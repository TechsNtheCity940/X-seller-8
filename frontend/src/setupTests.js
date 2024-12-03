require('@testing-library/jest-dom');
const { configure } = require('@testing-library/react');

// Configure testing-library
configure({
  testIdAttribute: 'data-testid',
});

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation(() => ({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
}));
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: jest.fn(),
  registerables: [],
  register: jest.fn(),
}));

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.onopen = null;
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  close() {
    if (this.onclose) {
      this.onclose();
    }
  }
}

global.WebSocket = MockWebSocket;

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
    text: () => Promise.resolve(''),
  })
);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.URL.createObjectURL
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

// Mock console methods but keep them functional for debugging
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn((...args) => originalConsole.log(...args)),
  error: jest.fn((...args) => originalConsole.error(...args)),
  warn: jest.fn((...args) => originalConsole.warn(...args)),
  info: jest.fn((...args) => originalConsole.info(...args)),
}; 