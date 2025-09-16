import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';
import Register from '../Register';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { vi } from 'vitest';

vi.mock('axios');

test('login shows error on wrong credentials', async () => {
  axios.post.mockRejectedValueOnce({ response: { status: 401 } });
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'u@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'nope' } });
  fireEvent.click(screen.getByRole('button', { name: /Accedi/i }));
  expect(await screen.findByText(/Email o password errati|Errore durante il login/i)).toBeInTheDocument();
});

test('register calls API on success', async () => {
  axios.post.mockResolvedValueOnce({});
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret' } });
  fireEvent.click(screen.getByRole('button', { name: /Registrati/i }));
  await waitFor(() => {
    expect(axios.post).toHaveBeenCalled();
  });
});


