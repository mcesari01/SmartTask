import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Register from '../Register'
import axios from 'axios'
import { MemoryRouter } from 'react-router-dom'

vi.mock('axios')

describe('Register component', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('successful register navigates to login', async () => {
    axios.post.mockResolvedValueOnce({})
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'x@y.com' } })
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: /Registrati/i }))

    await waitFor(() => expect(axios.post).toHaveBeenCalled())
  })

  test('register error shows message', async () => {
    axios.post.mockRejectedValueOnce(new Error('fail'))
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'x@y.com' } })
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: /Registrati/i }))

    await waitFor(() => expect(screen.getByText(/Errore durante la registrazione/i)).toBeInTheDocument())
  })
})
