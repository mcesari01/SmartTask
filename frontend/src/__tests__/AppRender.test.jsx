import { render, screen } from '@testing-library/react';
import App from '../App';
import axios from 'axios';
import { vi } from 'vitest';

vi.mock('axios');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

test('renders SmartTask Dashboard title', async () => {
  axios.get.mockResolvedValue({ data: [] });
  render(<App />);
  expect(await screen.findByText(/SmartTask Dashboard/i)).toBeInTheDocument();
});
