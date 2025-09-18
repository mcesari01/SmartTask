// src/__tests__/SortingFiltering.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import axios from 'axios';
import { vi } from 'vitest';

vi.mock('axios');
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  axios.get.mockReset();
  axios.post?.mockReset?.();
  axios.put?.mockReset?.();
  axios.patch?.mockReset?.();
  axios.delete?.mockReset?.();
  localStorage.setItem('token', 'fake');
  mockNavigate.mockClear();
});

test('renders Ordinamento section with sorting/filtering buttons', async () => {
  axios.get.mockResolvedValueOnce({ data: [] });
  render(<App />);

  expect(await screen.findByText('Ordinamento')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Ordina/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Direzione/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Filtro completamento/i })).toBeInTheDocument();
});

test('clicking sort order button triggers backend call with correct params', async () => {
  axios.get.mockResolvedValue({ data: [] });
  render(<App />);
  await screen.findByText('Ordinamento');

  fireEvent.click(screen.getByRole('button', { name: /Direzione/i }));
  await waitFor(() => {
    expect(axios.get).toHaveBeenLastCalledWith(
      expect.stringContaining('/tasks?'),
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });
});

test('cycling through sortBy options calls backend with correct params', async () => {
  axios.get.mockResolvedValue({ data: [] });
  render(<App />);
  await screen.findByText('Ordinamento');

  const sortBtn = screen.getByRole('button', { name: /Ordina/i });

  fireEvent.click(sortBtn); // insertion → deadline
  fireEvent.click(sortBtn); // deadline → priority

  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/tasks?sort_by=priority'),
      expect.any(Object)
    );
  });
});

test('toggling completion filter cycles through all/completed/active and calls backend', async () => {
  axios.get.mockResolvedValue({ data: [] });
  render(<App />);
  await screen.findByText('Ordinamento');

  const filterBtn = screen.getByRole('button', { name: /Filtro completamento/i });

  fireEvent.click(filterBtn); // all -> completed
  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('completed=true'),
      expect.any(Object)
    );
  });

  fireEvent.click(filterBtn); // completed -> active
  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('completed=false'),
      expect.any(Object)
    );
  });
});

