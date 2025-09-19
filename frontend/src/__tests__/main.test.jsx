// src/__tests__/main.test.jsx
import { vi } from 'vitest';

// mock ReactDOM per non montare davvero l’app
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
