import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

beforeEach(() => {
  axios.get.mockResolvedValue({ data: [] });
  localStorage.clear();
});

test('toggle dark mode and persist', async () => {
  render(<App />);
  const toggle = await screen.findByRole('button', { name: /mode/i });
  expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  fireEvent.click(toggle);
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(localStorage.getItem('theme')).toBe('dark');
});


