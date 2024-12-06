import '@testing-library/jest-dom'
import 'jest-canvas-mock';

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver;

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  clear() {
    this.store = {};
  },
  removeItem(key) {
    delete this.store[key];
  }
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});
