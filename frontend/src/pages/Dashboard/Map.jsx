import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../../api';
import { useAuth } from '../../context/AuthContext';

// Fix for default marker icons in React-Leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const currentLocationIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destinationIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const friendIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map click events
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Component to center map on user location
function LocationMarker({ position }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [position, map]);

  return null;
}

const Map = () => {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [nearbyFriends, setNearbyFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [routePreference, setRoutePreference] = useState('safest');

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          setCurrentLocation(coords);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your location');
          // Default to a location (e.g., San Francisco)
          setCurrentLocation({ lat: 37.7749, lon: -122.4194 });
        }
      );
    }
  }, []);

  // Handle map click for destination
  const handleMapClick = (latlng) => {
    setDestination({ lat: latlng.lat, lon: latlng.lng });
    setRoutes([]);
    setSelectedRoute(null);
  };

  // Calculate routes when destination is set
  useEffect(() => {
    if (currentLocation && destination) {
      calculateRoutes();
    }
  }, [currentLocation, destination, routePreference]);

  const calculateRoutes = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/map/calculate-route', {
        origin: currentLocation,
        destination: destination,
        preferences: { routeType: routePreference }
      });

      setRoutes(response.data.routes || []);
      if (response.data.routes && response.data.routes.length > 0) {
        setSelectedRoute(0);
      }

      // Fetch nearby friends
      const friendsResponse = await api.post('/map/nearby-friends', {
        coordinates: [destination.lon, destination.lat],
        radius: 5000
      });

      setNearbyFriends(friendsResponse.data.friends || []);
    } catch (err) {
      console.error('Route calculation error:', err);
      setError(err.response?.data?.error || 'Failed to calculate route');
    } finally {
      setLoading(false);
    }
  };

  // Get route polyline coordinates
  const getRouteCoordinates = (route) => {
    if (!route || !route.legs) return [];
    
    const coordinates = [];
    route.legs.forEach(leg => {
      if (leg.points) {
        leg.points.forEach(point => {
          coordinates.push([point.latitude, point.longitude]);
        });
      }
    });
    return coordinates;
  };

  // Get color based on safety score
  const getRouteColor = (safetyScore) => {
    if (safetyScore >= 80) return '#22c55e'; // green
    if (safetyScore >= 60) return '#eab308'; // yellow
    if (safetyScore >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  if (!currentLocation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="bg-white p-4 shadow-md z-10">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route Preference
            </label>
            <select
              value={routePreference}
              onChange={(e) => setRoutePreference(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="safest">Safest Route</option>
              <option value="fastest">Fastest Route</option>
              <option value="balanced">Balanced</option>
            </select>
          </div>

          {destination && (
            <button
              onClick={() => {
                setDestination(null);
                setRoutes([]);
                setSelectedRoute(null);
                setNearbyFriends([]);
              }}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Clear Destination
            </button>
          )}

          <div className="flex-1 text-sm text-gray-600">
            {!destination && 'Click on the map to set your destination'}
            {loading && 'Calculating routes...'}
            {error && <span className="text-red-500">{error}</span>}
          </div>
        </div>

        {/* Route Options */}
        {routes.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium text-gray-700 mb-2">Available Routes:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {routes.map((route, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedRoute(index)}
                  className={`p-3 border-2 rounded cursor-pointer ${
                    selectedRoute === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Route {index + 1}</span>
                    <span
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: getRouteColor(route.safetyScore) }}
                    >
                      Safety: {Math.round(route.safetyScore)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Distance: {(route.lengthInMeters / 1000).toFixed(2)} km</div>
                    <div>Time: {Math.round(route.travelTimeInSeconds / 60)} min</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Friends */}
        {nearbyFriends.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium text-gray-700 mb-2">Friends Nearby:</h3>
            <div className="flex flex-wrap gap-2">
              {nearbyFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-2"
                >
                  {friend.avatarUrl && (
                    <img
                      src={friend.avatarUrl}
                      alt={friend.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-sm">{friend.displayName}</span>
                  <button className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
                    Invite
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[currentLocation.lat, currentLocation.lon]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler onMapClick={handleMapClick} />
          <LocationMarker position={currentLocation} />

          {/* Current Location Marker */}
          {currentLocation && (
            <Marker
              position={[currentLocation.lat, currentLocation.lon]}
              icon={currentLocationIcon}
            >
              <Popup>Your Location</Popup>
            </Marker>
          )}

          {/* Destination Marker */}
          {destination && (
            <Marker
              position={[destination.lat, destination.lon]}
              icon={destinationIcon}
            >
              <Popup>Destination</Popup>
            </Marker>
          )}

          {/* Route Polylines */}
          {routes.map((route, index) => {
            const coordinates = getRouteCoordinates(route);
            const isSelected = selectedRoute === index;
            
            return coordinates.length > 0 ? (
              <Polyline
                key={index}
                positions={coordinates}
                color={getRouteColor(route.safetyScore)}
                weight={isSelected ? 5 : 3}
                opacity={isSelected ? 1 : 0.5}
              />
            ) : null;
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default Map;