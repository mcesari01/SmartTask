import '@testing-library/jest-dom';
import { vi } from 'vitest';

const global = window;

global.Notification = class {
  static permission = 'granted';
  static requestPermission = vi.fn(() => Promise.resolve('granted'));
  constructor(title, options) {
    this.title = title;
    this.options = options;
  }
};

// Global stubs for browser APIs that jsdom doesn't fully implement
// Provide safe defaults so tests don't throw on alert/createObjectURL/etc.
global.alert = global.alert || vi.fn();

if (!window.URL) window.URL = {};
window.URL.createObjectURL = window.URL.createObjectURL || vi.fn(() => 'blob:fake');
window.URL.revokeObjectURL = window.URL.revokeObjectURL || vi.fn();

// Make document.createElement('a') safe for tests (click should be a no-op)
const _createElement = document.createElement.bind(document);
document.createElement = (tagName, options) => {
  const el = _createElement(tagName, options);
  if (tagName === 'a' && typeof el.click !== 'function') {
    el.click = () => {};
  }
  return el;
};

// Mock react-toastify to avoid async internal updates that can cause act(...) warnings
vi.mock('react-toastify', () => {
  return {
    ToastContainer: () => null,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  };
});

// Filter out noisy React Router future-flag warnings from test output
const _origWarn = console.warn.bind(console);
console.warn = (...args) => {
  const msg = args[0] && String(args[0]);
  if (msg && msg.includes('React Router Future Flag Warning')) return;
  _origWarn(...args);
};