import { render } from '@testing-library/react';
import App from '../App';
import { vi } from 'vitest';
import axios from 'axios';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('axios');

beforeEach(() => {
  axios.get.mockReset();
  localStorage.clear();
  mockNavigate.mockClear();
});

test('redirects to /login if token is missing', async () => {
  axios.get.mockResolvedValue({ data: [] }); // non dovrebbe chiamare fetch
  render(<App />);
  await new Promise((r) => setTimeout(r, 0));
  expect(mockNavigate).toHaveBeenCalledWith('/login');
});
