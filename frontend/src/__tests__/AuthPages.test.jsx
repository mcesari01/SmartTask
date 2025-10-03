import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';
import Register from '../Register';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { vi } from 'vitest';

vi.mock('axios');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

// Registration

test('successful register navigates to login', async () => {
  axios.post.mockResolvedValueOnce({});
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: '123' } });
  fireEvent.click(screen.getByRole('button', { name: /Registrati/i }));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
});

test('register shows error if API fails', async () => {
  axios.post.mockRejectedValueOnce({ response: { status: 400 } });
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'bad@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: '123' } });
  fireEvent.click(screen.getByRole('button', { name: /Registrati/i }));

  expect(await screen.findByText(/Errore durante la registrazione/i)).toBeInTheDocument();
});

test('toggle theme in register page', () => {
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
  const toggle = screen.getByRole('button', { name: /mode/i });
  fireEvent.click(toggle);
  expect(localStorage.getItem('theme')).toBe('dark');
});

// Login

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

test('successful login stores token and navigates', async () => {
  axios.post.mockResolvedValueOnce({ data: { access_token: 'tok', token_type: 'bearer' } });
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'u@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: '123' } });
  fireEvent.click(screen.getByRole('button', { name: /Accedi/i }));

  await waitFor(() => expect(localStorage.getItem('token')).toBe('tok'));
  expect(mockNavigate).toHaveBeenCalledWith('/');
});

test('login shows generic error on server issue', async () => {
  axios.post.mockRejectedValueOnce({ response: { status: 500 } });
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'u@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'nope' } });
  fireEvent.click(screen.getByRole('button', { name: /Accedi/i }));

  expect(await screen.findByText(/Errore durante il login/i)).toBeInTheDocument();
});

test('toggle theme in login page', () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  const toggle = screen.getByRole('button', { name: /mode/i });
  fireEvent.click(toggle);
  expect(localStorage.getItem('theme')).toBe('dark');
});

// ---------- EXTRA TESTS PER COPRIRE GOOGLE LOGIN/REGISTER ----------

test('login via Google successful', async () => {
  const fakeGoogle = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
  window.google = fakeGoogle;
  axios.post.mockResolvedValueOnce({ data: { access_token: 'gTok' } });

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  const cb = fakeGoogle.accounts.id.initialize.mock.calls[0][0].callback;
  cb({ credential: 'jwt' });

  await waitFor(() => {
    expect(localStorage.getItem('token')).toBe('gTok');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

test('login via Google fails', async () => {
  const fakeGoogle = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
  window.google = fakeGoogle;
  axios.post.mockRejectedValueOnce(new Error('fail'));

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  const cb = fakeGoogle.accounts.id.initialize.mock.calls[0][0].callback;
  cb({ credential: 'bad' });

  await waitFor(() => {
    expect(screen.getByText(/Accesso con Google non riuscito./i)).toBeInTheDocument();
  });
});

test('login via Google ignored if no credential', () => {
  const fakeGoogle = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
  window.google = fakeGoogle;

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  const cb = fakeGoogle.accounts.id.initialize.mock.calls[0][0].callback;
  cb({}); // no credential
  expect(axios.post).not.toHaveBeenCalled();
});

test('register via Google successful', async () => {
  const fakeGoogle = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
  window.google = fakeGoogle;
  axios.post.mockResolvedValueOnce({ data: { access_token: 'regTok' } });

  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

  const cb = fakeGoogle.accounts.id.initialize.mock.calls[0][0].callback;
  cb({ credential: 'jwt' });

  await waitFor(() => {
    expect(localStorage.getItem('token')).toBe('regTok');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

test('register via Google ignored if no credential', () => {
  const fakeGoogle = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
  window.google = fakeGoogle;

  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

  const cb = fakeGoogle.accounts.id.initialize.mock.calls[0][0].callback;
  cb({}); // no credential
  expect(axios.post).not.toHaveBeenCalled();
});

test('register via Google fails silently', async () => {
  const fakeGoogle = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
  window.google = fakeGoogle;
  axios.post.mockRejectedValueOnce(new Error('fail'));

  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

  const cb = fakeGoogle.accounts.id.initialize.mock.calls[0][0].callback;
  cb({ credential: 'bad' });

  // Deve fallire ma senza mostrare messaggi di errore in UI
  await waitFor(() => {
    expect(screen.queryByText(/Errore durante la registrazione/i)).not.toBeInTheDocument();
  });
});

test('login button disabled until both email and password filled', () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  const loginBtn = screen.getByRole('button', { name: /Accedi/i });
  expect(loginBtn).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'u@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pw' } });
  expect(loginBtn).not.toBeDisabled();
});