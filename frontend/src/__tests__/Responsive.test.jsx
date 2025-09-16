import { render, screen } from '@testing-library/react';
import App from '../App';
import { vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

describe('Accessibility and responsiveness', () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: [] });
  });

  test('topbar contains title and accessible buttons', async () => {
    render(<App />);
    expect(await screen.findByText(/SmartTask/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Esci/i })).toBeInTheDocument();
  });

  test('form fields are labelled', async () => {
    render(<App />);
    expect(await screen.findByLabelText(/Titolo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrizione/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Scadenza/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Priorità/i)).toBeInTheDocument();
  });
});


