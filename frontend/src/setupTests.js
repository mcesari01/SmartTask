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