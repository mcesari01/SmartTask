import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import axios from 'axios';
import { vi } from 'vitest';

vi.mock('axios');
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  axios.get.mockReset();
  axios.post.mockReset();
  axios.put.mockReset();
  axios.delete.mockReset();
  localStorage.clear();
  mockNavigate.mockClear();
});

test('fetches and displays tasks', async () => {
  axios.get.mockResolvedValueOnce({ data: [{ id: 1, title: 'Task di prova', description: 'Desc', deadline: new Date().toISOString(), priority: 'High' }] });
  render(<App />);
  expect(await screen.findByText(/Task di prova/i)).toBeInTheDocument();
  expect(screen.getByText(/Desc/i)).toBeInTheDocument();
});

test('creates a new task', async () => {
  axios.get.mockResolvedValue({ data: [] });
  axios.post.mockResolvedValue({});
  render(<App />);
  await screen.findByText(/SmartTask Dashboard/i);

  fireEvent.change(screen.getByPlaceholderText(/Titolo task/i), {
    target: { value: 'Nuovo Task' },
  });
  fireEvent.change(screen.getByPlaceholderText(/Descrizione/i), {
    target: { value: 'Descrizione nuova' },
  });
  const deadline = new Date().toISOString().slice(0, 16);
  fireEvent.change(screen.getByTestId('deadline-input'), {
    target: { value: deadline },
  });
  fireEvent.click(screen.getByText(/Aggiungi Task/i));

  await waitFor(() => {
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8000/tasks',
      expect.objectContaining({
        title: 'Nuovo Task',
        description: 'Descrizione nuova',
        deadline: expect.any(String),
        priority: 'Medium',
      }),
      expect.any(Object)
    );
  });
});

test('updates an existing task', async () => {
  const existing = { id: 3, title: 'Task iniziale', description: 'Desc iniziale', deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), priority: 'Medium' };
  axios.get.mockResolvedValueOnce({ data: [existing] });
  axios.get.mockResolvedValue({ data: [] });
  axios.put.mockResolvedValue({});

  render(<App />);
  await screen.findByText(/Task iniziale/i);

  fireEvent.click(screen.getByText(/Modifica/i));
  fireEvent.change(screen.getByPlaceholderText(/Titolo task/i), { target: { value: 'Task modificato' } });
  fireEvent.change(screen.getByPlaceholderText(/Descrizione/i), { target: { value: 'Nuova descrizione' } });
  const newDeadline = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 16);
  fireEvent.change(screen.getByTestId('deadline-input'), { target: { value: newDeadline } });

  fireEvent.click(screen.getByText(/Salva Modifiche/i));

  await waitFor(() => {
    expect(axios.put).toHaveBeenCalledWith(
      'http://localhost:8000/tasks/3',
      expect.objectContaining({ title: 'Task modificato', description: 'Nuova descrizione', deadline: expect.any(String), priority: 'Medium' }),
      expect.any(Object)
    );
  });
});

test('deletes a task', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  axios.get.mockResolvedValueOnce({ data: [{ id: 2, title: 'Da eliminare', description: 'Desc del task', deadline: new Date().toISOString(), priority: 'Low' }] });
  axios.get.mockResolvedValueOnce({ data: [] });
  axios.delete.mockResolvedValue({ data: { detail: 'Task deleted' } });

  render(<App />);
  await screen.findByText(/Da eliminare/i);
  fireEvent.click(screen.getByRole('button', { name: /Elimina/i }));

  await waitFor(() => {
    expect(axios.delete).toHaveBeenCalledWith('http://localhost:8000/tasks/2', expect.any(Object));
  });
  await waitFor(() => {
    expect(screen.queryByText(/Da eliminare/i)).not.toBeInTheDocument();
  });
});
