import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExportModal from '../ExportModal'
import axios from 'axios'

vi.mock('axios')

describe('ExportModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  test('renders null when closed', () => {
    const { container } = render(<ExportModal isOpen={false} onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  test('export success triggers download and onClose', async () => {
    localStorage.setItem('token', 'tok')
    const blob = new Blob(['a'], { type: 'text/csv' })
    axios.get.mockResolvedValueOnce({ data: blob })
  // Stub URL.createObjectURL and revokeObjectURL
  const oldCreate = window.URL.createObjectURL
  const oldRevoke = window.URL.revokeObjectURL
  window.URL.createObjectURL = vi.fn(() => 'blob:fake')
  window.URL.revokeObjectURL = vi.fn()
    // Spy on appendChild/remove
    const appended = []
    const oldAppend = document.body.appendChild
    document.body.appendChild = (el) => { appended.push(el); return el }
    // ensure link.click doesn't try to navigate
    const oldCreateElement = document.createElement.bind(document)
    document.createElement = (tag) => {
      const el = oldCreateElement(tag)
      if (tag === 'a') {
        el.click = () => {}
      }
      return el
    }

    const onClose = vi.fn()
    const { container } = render(<ExportModal isOpen={true} onClose={onClose} />)

    // select csv (first export-option)
    const csvBtn = container.querySelector('.export-option')
    expect(csvBtn).toBeTruthy()
  fireEvent.click(csvBtn)
  const downloadBtn = container.querySelectorAll('.modal-footer .btn')[1]
  expect(downloadBtn).toBeTruthy()
  fireEvent.click(downloadBtn)

    await waitFor(() => expect(onClose).toHaveBeenCalled())

  // restore
  window.URL.createObjectURL = oldCreate
  window.URL.revokeObjectURL = oldRevoke
    document.body.appendChild = oldAppend
    document.createElement = oldCreateElement
  })

  test('export error shows alert', async () => {
    localStorage.setItem('token', 'tok')
    axios.get.mockRejectedValueOnce(new Error('Server error'))
  window.alert = vi.fn()
    const { container: container2 } = render(<ExportModal isOpen={true} onClose={() => {}} />)
    const csvBtn2 = container2.querySelector('.export-option')
  expect(csvBtn2).toBeTruthy()
  fireEvent.click(csvBtn2)
  // wait for state update so the download button becomes enabled
  await waitFor(() => {
    const btn = container2.querySelector('.modal-footer .btn')
    expect(btn).toBeTruthy()
    expect(btn).not.toBeDisabled()
  })
  // wait until download button (second .btn) is enabled
  await waitFor(() => {
    const btns = container2.querySelectorAll('.modal-footer .btn')
    expect(btns.length).toBeGreaterThan(1)
    expect(btns[1]).not.toBeDisabled()
  })
  const downloadBtn2 = container2.querySelectorAll('.modal-footer .btn')[1]
  fireEvent.click(downloadBtn2)
  // ensure the export attempt happened
  await waitFor(() => expect(axios.get).toHaveBeenCalled())
  await waitFor(() => expect(window.alert).toHaveBeenCalled())
  })
})
