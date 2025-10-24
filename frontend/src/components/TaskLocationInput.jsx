import { useEffect, useState, useRef } from 'react';

export default function TaskLocationInput({ value, onSelect, placeholder = 'Indirizzo (opzionale)' }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const q = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${q}`;

    const timeout = setTimeout(() => {
      fetch(url, { signal: controller.signal, headers: { 'Accept-Language': 'it' } })
        .then((r) => r.json())
        .then((data) => {
          setSuggestions(Array.isArray(data) ? data : []);
          setOpen(true);
        })
        .catch(() => {
          // ignore
          setSuggestions([]);
        });
    }, 250); // debounce

    return () => {
      clearTimeout(timeout);
      try {
        controller.abort();
      } catch {
        /* ignore abort errors */
      }
    };
  }, [query]);

  const handleSelect = (item) => {
    const addr = item.display_name;
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setQuery(addr);
    setOpen(false);
    setSuggestions([]);
    if (onSelect) onSelect({ address: addr, latitude: lat, longitude: lon });
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); if (onSelect && !e.target.value) onSelect({ address: '', latitude: null, longitude: null }); }}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ width: '100%' }}
      />

      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute',
          zIndex: 60,
          left: 0,
          right: 0,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          maxHeight: 220,
          overflowY: 'auto',
          listStyle: 'none',
          margin: 0,
          padding: 6,
          borderRadius: 8,
        }}>
          {suggestions.map((s) => (
            <li key={`${s.place_id}`} style={{ padding: 8, cursor: 'pointer' }} onMouseDown={() => handleSelect(s)}>
              <div style={{ fontSize: 13 }}>{s.display_name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
