import { useEffect, useRef } from 'react';

// Lightweight Leaflet loader + map component using CDN (no npm install required)
export default function TaskMap({ tasks = [], style = { height: 400 }, onClose }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // inject CSS if missing
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-leaflet', '1');
      document.head.appendChild(link);
    }

    // load script if not present
    const existing = window.L;
    let script;
    const init = () => {
      try {
        const L = window.L;
        if (!containerRef.current) return;
        // create map if not exists
        if (!mapRef.current) {
          mapRef.current = L.map(containerRef.current).setView([44.494887, 11.342616], 6);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
          }).addTo(mapRef.current);
        }

        // clear existing layers except tile layer
        mapRef.current.eachLayer((layer) => {
          if (layer && layer.options && layer.options.attribution) return; // keep tile layer
          try { mapRef.current.removeLayer(layer); } catch (e) {}
        });

        const markers = [];
        tasks.forEach((t) => {
          if (!t.latitude || !t.longitude) return;
          const marker = window.L.marker([t.latitude, t.longitude]);
          const popupHtml = `<div style="max-width:200px"><strong>${escapeHtml(t.title)}</strong><div style="font-size:12px">${escapeHtml(t.address || '')}</div></div>`;
          marker.bindPopup(popupHtml);
          marker.addTo(mapRef.current);
          markers.push(marker);
        });

        if (markers.length) {
          const group = window.L.featureGroup(markers);
          mapRef.current.fitBounds(group.getBounds().pad(0.2));
        }
      } catch (e) {
        // ignore
      }
    };

    if (existing) {
      init();
    } else {
      script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = init;
      document.body.appendChild(script);
    }

    return () => {
      // cleanup map instance
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (e) {}
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, [tasks]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Mappa task</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onClose && (
            <button className="btn btn-ghost" onClick={onClose}>Chiudi mappa</button>
          )}
        </div>
      </div>
      <div ref={containerRef} style={{ width: '100%', height: style.height, borderRadius: 8, overflow: 'hidden' }} />
    </div>
  );
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
