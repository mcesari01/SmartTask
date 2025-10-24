import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TaskLocationInput from '../components/TaskLocationInput';

describe('TaskLocationInput', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows suggestions and calls onSelect when clicking suggestion', async () => {
    const fakeRes = [
      { place_id: 1, display_name: 'Piazza del Duomo, Milano', lat: '45.4643', lon: '9.1895' },
    ];

    // mock fetch on the window object used by the component
    window.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(fakeRes) })
    );

    const onSelect = vi.fn();
    render(<TaskLocationInput value="" onSelect={onSelect} />);

    const input = screen.getByPlaceholderText(/Indirizzo/i);

    // simulate typing
    fireEvent.change(input, { target: { value: 'Duomo' } });

    // Wait for debounce (250ms) + fetch promise resolution
  await waitFor(() => expect(window.fetch).toHaveBeenCalled(), { timeout: 1000 });

    // Suggestions should render
    const suggestion = await screen.findByText(/Piazza del Duomo/i);
    expect(suggestion).toBeInTheDocument();

    // Click suggestion (onMouseDown is used in the component)
    fireEvent.mouseDown(suggestion.parentElement);

    // onSelect should be called with parsed lat/lon
    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(onSelect.mock.calls[0][0]).toMatchObject({
      address: 'Piazza del Duomo, Milano',
      latitude: 45.4643,
      longitude: 9.1895,
    });
  });

  it('clears suggestions when input emptied and calls onSelect with empty values', async () => {
    const onSelect = vi.fn();
    render(<TaskLocationInput value="" onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(/Indirizzo/i);

    fireEvent.change(input, { target: { value: 'Test' } });
    // now clear
    fireEvent.change(input, { target: { value: '' } });

    // onSelect should be called with empty address
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({ address: '', latitude: null, longitude: null }));
  });
});
