// frontend/src/components/AddMarkerModal.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { createMarker } from '../api/markerApi';

export default function AddMarkerModal({ location, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('lat', location.lat);
      formData.append('lng', location.lng);
      if (file) formData.append('image', file);

      // prefer shared API helper when available
      let created;
      try {
        created = await createMarker(formData);
      } catch (e) {
        // fallback to raw axios in case helper fails
        const res = await axios.post('/api/markers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        created = res.data;
      }

      onCreated(created);
      // close modal after creating marker
      onClose();
    } catch (err) {
      console.error('Create marker err', err);
      alert('Failed to create marker');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded shadow-lg max-w-md w-full p-4">
        <h3 className="text-lg font-semibold mb-2">Report Location</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full p-2 border rounded" />
          <textarea placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full p-2 border rounded" />
          <select className="w-full p-2 border rounded" value={category} onChange={(e)=>setCategory(e.target.value)}>
            <option>Suspicious</option>
            <option>Harassment</option>
            <option>Accident</option>
            <option>Danger</option>
            <option>Other</option>
          </select>
          <input type="file" accept="image/*" onChange={(e)=>setFile(e.target.files[0])} />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
            <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded" disabled={loading}>
              {loading ? 'Reporting...' : 'Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
