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
  // Mock all axios.get calls to return appropriate responses
  axios.get.mockImplementation((url) => {
    if (url.includes('/me')) {
      return Promise.resolve({ data: {} });
    }
    if (url.includes('/tasks')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });
  
  render(<App />);

  expect(await screen.findByText('Ordinamento')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Per inserimento/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Filtro completamento/i })).toBeInTheDocument();
});

test('clicking active sort button toggles sort order and triggers backend call', async () => {
  // Mock all axios.get calls to return appropriate responses
  axios.get.mockImplementation((url) => {
    if (url.includes('/me')) {
      return Promise.resolve({ data: {} });
    }
    if (url.includes('/tasks')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });
  
  render(<App />);
  await screen.findByText('Ordinamento');

  // Click the sort dropdown to open it
  const sortDropdown = screen.getByRole('button', { name: /Per inserimento/i });
  fireEvent.click(sortDropdown);
  
  // Click on the same option (Per inserimento) which should toggle sort order
  await waitFor(() => {
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
  
  const insertionMenuItem = screen.getByRole('menuitem', { name: /Per inserimento/i });
  fireEvent.click(insertionMenuItem);
  
  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('sort_order=desc'),
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });
});

test('selecting different sort options calls backend with correct params', async () => {
  // Mock all axios.get calls to return appropriate responses
  axios.get.mockImplementation((url) => {
    if (url.includes('/me')) {
      return Promise.resolve({ data: {} });
    }
    if (url.includes('/tasks')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });
  
  render(<App />);
  await screen.findByText('Ordinamento');

  // Click the sort dropdown to open it
  const sortDropdown = screen.getByRole('button', { name: /Per inserimento/i });
  fireEvent.click(sortDropdown);
  
  // Wait for menu to appear and click on "Per priorità"
  await waitFor(() => {
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
  
  const priorityMenuItem = screen.getByRole('menuitem', { name: /Per priorità/i });
  fireEvent.click(priorityMenuItem);

  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('sort_by=priority'),
      expect.any(Object)
    );
  });
});

test('toggling completion filter cycles through all/completed/active and calls backend', async () => {
  // Mock all axios.get calls to return appropriate responses
  axios.get.mockImplementation((url) => {
    if (url.includes('/me')) {
      return Promise.resolve({ data: {} });
    }
    if (url.includes('/tasks')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });
  
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

