// frontend/src/components/TomTomMap.jsx
import React, { useEffect, useRef, useState } from 'react';
import tt from '@tomtom-international/web-sdk-maps';
import '@tomtom-international/web-sdk-maps/dist/maps.css';
import { getMarkers } from '../api/markerApi';
import AddMarkerModal from './AddMarkerModal';

export default function TomTomMap({ apiKey }) {
  const mapRef = useRef(null);
  const ttMapRef = useRef(null);
  const [markers, setMarkers] = useState([]);
  const [addingLocation, setAddingLocation] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!apiKey) {
      console.warn('TomTom API key is missing. Set VITE_TOMTOM_API_KEY in frontend/.env or pass apiKey prop to TomTomMap.');
      return;
    }

    ttMapRef.current = tt.map({
      key: apiKey,
      container: mapRef.current,
      zoom: 13,
      center: [77.5946, 12.9716], // change default
    });

    // add navigation control
    ttMapRef.current.addControl(new tt.NavigationControl());

    // show current user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        new tt.Marker({ className: 'user-marker' })
          .setLngLat([lng, lat])
          .addTo(ttMapRef.current);
        ttMapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
      });
    }

    // click to add marker - ensure lngLat is present
    ttMapRef.current.on('click', (e) => {
      const lngLat = e && (e.lngLat || e.point);
      if (!lngLat || typeof lngLat.lng !== 'number' || typeof lngLat.lat !== 'number') return;
      setAddingLocation({ lng: lngLat.lng, lat: lngLat.lat });
      setShowAddModal(true);
    });

    return () => {
      if (ttMapRef.current) ttMapRef.current.remove();
      ttMapRef.current = null;
    };
  }, [mapRef]);

  // load markers
  useEffect(() => {
    loadMarkers();
  }, []);

  function addMarkerToMap(marker) {
    if (!ttMapRef.current) return;

    // ensure numeric coordinates
    const lng = typeof marker.lng === 'number' ? marker.lng : Number(marker.lng);
    const lat = typeof marker.lat === 'number' ? marker.lat : Number(marker.lat);
    if (!isFinite(lng) || !isFinite(lat)) {
      console.warn('Skipping marker with invalid coordinates', marker);
      return;
    }

    const m = new tt.Marker()
      .setLngLat([lng, lat])
      .addTo(ttMapRef.current);

    const html = `
      <div style="width:220px">
        <h3 style="margin:0">${marker.title}</h3>
        <p style="font-size:12px">${marker.description || ''}</p>
        ${marker.imageUrl ? `<img src="${marker.imageUrl}" style="width:100%;height:auto;border-radius:6px" />` : ''}
        <p style="font-size:11px;margin:0;color:#666">${new Date(marker.createdAt).toLocaleString()}</p>
      </div>
    `;
    const popup = new tt.Popup({ offset: 10 }).setHTML(html);
    m.setPopup(popup);
  }

  async function loadMarkers() {
    try {
      // prefer the shared API helper which respects VITE_API base URL
      const res = await getMarkers();

      // getMarkers returns either an array or an object - normalize
      const data = Array.isArray(res) ? res : (res?.markers || []);

      // normalize coordinates (support multiple backend shapes)
      const normalized = (Array.isArray(data) ? data : []).map((m) => {
        let lng = m.lng ?? (m.location && m.location.coordinates && m.location.coordinates[0]);
        let lat = m.lat ?? (m.location && m.location.coordinates && m.location.coordinates[1]);
        // try other common shapes
        if ((lng === undefined || lat === undefined) && m.coordinates) {
          lng = lng ?? m.coordinates.lng ?? m.coordinates.lon ?? m.coordinates.longitude;
          lat = lat ?? m.coordinates.lat ?? m.coordinates.latitude;
        }
        const numericLng = isFinite(Number(lng)) ? Number(lng) : null;
        const numericLat = isFinite(Number(lat)) ? Number(lat) : null;
        return { ...m, lng: numericLng, lat: numericLat };
      });

      setMarkers(normalized);
      normalized.forEach(addMarkerToMap);
    } catch (err) {
      console.error('Load markers error', err);
    }
  }

  // callback when a new marker is created from modal
  async function onMarkerCreated(marker) {
    setShowAddModal(false);
    setAddingLocation(null);
    // add to map immediately
    addMarkerToMap(marker);
    setMarkers((s) => [marker, ...s]);
  }

  // If API key missing, show an inline message in the map area to help devs/users
  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {!apiKey && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="text-center p-4">
            <p className="font-semibold">TomTom API key not configured</p>
            <p className="text-sm text-gray-600">Set VITE_TOMTOM_API_KEY in <code>frontend/.env</code> or pass apiKey prop to <code>TomTomMap</code>.</p>
          </div>
        </div>
      )}
      {showAddModal && addingLocation && (
        <AddMarkerModal
          location={addingLocation}
          onClose={() => { setShowAddModal(false); setAddingLocation(null); }}
          onCreated={onMarkerCreated}
        />
      )}
    </div>
  );
}
