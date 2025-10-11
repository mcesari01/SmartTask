import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Login from '../Login'
import axios from 'axios'
import { MemoryRouter } from 'react-router-dom'

vi.mock('axios')

describe('Login component', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('successful login stores token and navigates', async () => {
    axios.post.mockResolvedValueOnce({ data: { access_token: 'tok' } })
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: /Accedi/i }))

    await waitFor(() => expect(localStorage.getItem('token')).toBe('tok'))
  })

  test('login error shows message', async () => {
    axios.post.mockRejectedValueOnce({ response: { status: 401 } })
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: /Accedi/i }))

    await waitFor(() => expect(screen.getByText(/Email o password errati/i)).toBeInTheDocument())
  })
})
