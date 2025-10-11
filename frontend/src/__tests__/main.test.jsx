// src/__tests__/main.test.jsx
import { vi, test, beforeEach, afterEach } from 'vitest';

// Mock di @react-oauth/google per evitare errori di import
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => children,
}));

// Mock ReactDOM per non montare davvero l’app
vi.mock('react-dom/client', () => {
  return {
    createRoot: () => ({ render: vi.fn() }),
  };
});

beforeEach(() => {
  // prepara il contenitore finto
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
});

afterEach(() => {
  document.body.innerHTML = '';
});

test('main.jsx renders without crashing', async () => {
  await import('../main.jsx');
});