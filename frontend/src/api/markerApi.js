// frontend/src/api/markerApi.js
import api from '../../api';

const getMarkers = () => api.get('/markers').then((r) => r.data);

const createMarker = (formData) =>
	api.post('/markers', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

export { getMarkers, createMarker };

export default { getMarkers, createMarker };
