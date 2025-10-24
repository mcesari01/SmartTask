import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TaskMap from '../components/TaskMap';

// Provide a mocked global Leaflet implementation so the component can call it
function makeMockLeaflet() {
  // markers placeholder intentionally omitted — not used in mock
  const L = {
      map: vi.fn(() => ({
      setView: vi.fn().mockReturnThis(),
  eachLayer: vi.fn(),
      remove: vi.fn(),
      addLayer: vi.fn(),
      fitBounds: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    marker: vi.fn(() => ({ bindPopup: vi.fn(), addTo: vi.fn() })),
    featureGroup: vi.fn(() => ({
      getBounds: vi.fn(() => ({
        pad: vi.fn(() => ({})),
      })),
    })),
  };
  return L;
}

describe('TaskMap', () => {
  beforeEach(() => {
    // Ensure window.L is present and mocked
    window.L = makeMockLeaflet();
  });

  afterEach(() => {
    delete window.L;
    vi.restoreAllMocks();
  });

  it('renders the map container and uses Leaflet when tasks contain coords', () => {
    const tasks = [
      { id: 1, title: 'T1', latitude: 45.4643, longitude: 9.1895, address: 'Piazza del Duomo' },
    ];

    render(<TaskMap tasks={tasks} />);

    // The map header should be visible
    expect(screen.getByText(/Mappa task/)).toBeInTheDocument();

    // Leaflet map() should have been called
    expect(window.L.map).toHaveBeenCalled();

    // marker should be created
    expect(window.L.marker).toHaveBeenCalledWith([45.4643, 9.1895]);
  });
});
