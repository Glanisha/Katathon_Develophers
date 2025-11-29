import { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../../api';
import { useAuth } from '../../context/AuthContext';

// Fix for default marker icons in React-Leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const currentLocationIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destinationIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const friendIcon = new Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
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

// Component to center map on initial user location
function LocationMarker({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [position, map]);

  return null;
}

// Moving navigation marker that follows the route
function NavigationMarker({ position, isNavigating }) {
  const map = useMap();

  useEffect(() => {
    if (isNavigating && position) {
      map.setView([position.lat, position.lng], 16);
    }
  }, [position, isNavigating, map]);

  if (!position || !isNavigating) return null;

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={currentLocationIcon}
    >
      <Popup>You are here (navigation)</Popup>
    </Marker>
  );
}

// Floating "Re-center" control
function RecenterControl({ currentLocation, navigationPosition, isNavigating }) {
  const map = useMap();

  const handleClick = () => {
    const target = isNavigating ? navigationPosition || currentLocation : currentLocation;
    if (!target) return;
    map.setView([target.lat, target.lng], 16);
  };

  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control m-2">
        <button
          type="button"
          onClick={handleClick}
          className="px-3 py-1 rounded-full bg-white shadow text-xs font-medium hover:bg-gray-100"
        >
          Re-center on me
        </button>
      </div>
    </div>
  );
}

// Mapillary walking experience embeds (SV Road)
const mapillaryEmbeds = [
  'https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=523808853473226&x=0.5&y=0.5&style=photo',
  'https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=1240144430506052&x=0.5&y=0.5&style=photo',
  'https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=528738053191765&x=0.49999999999337164&y=0.49999999999979505&style=photo',
  'https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=1095380695299787&x=0.5&y=0.5&style=photo',
  'https://www.mapillary.com/embed?map_style=Mapillary%20light&image_key=2215276745539638&x=0.5000000000000001&y=0.5&style=photo',
  'https://www.mapillary.com/embed?map_style=Mapillary%20light&image_key=2551481258378160&x=0.4999999999999994&y=0.5&style=photo',
  'https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=4029046383993584&x=0.5000000000000063&y=0.5&style=photo',
];

// Approximate coordinates along SV Road (lat, lng)
const svRoadCoordinates = [
  { lat: 19.0785633, lng: 72.8335936 }, // central SV Road
  { lat: 19.114942, lng: 72.843 },      // Vile Parle stretch
  { lat: 19.202201, lng: 72.850983 },   // Malad stretch
  { lat: 19.2311313, lng: 72.8357263 }, // Borivali stretch
];

// helpers for simple turn-by-turn text
const toRad = (deg) => (deg * Math.PI) / 180;

const computeBearing = (lat1, lon1, lat2, lon2) => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

const describeTurn = (delta) => {
  const abs = Math.abs(delta);
  if (abs < 30) return 'Continue straight';
  if (delta > 0 && abs < 135) return 'Turn right';
  if (delta < 0 && abs < 135) return 'Turn left';
  if (delta >= 135) return 'Make a sharp right / U-turn';
  if (delta <= -135) return 'Make a sharp left / U-turn';
  return 'Continue';
};

const Map = () => {
  const { user } = useAuth();

  const [friendsAroundMe, setFriendsAroundMe] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [nearbyFriends, setNearbyFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [routePreference, setRoutePreference] = useState('safest');

  // manual location input
  const [manualLocationInput, setManualLocationInput] = useState('');

  // navigation + walking experience state
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // navigation path + moving marker position
  const [navigationPath, setNavigationPath] = useState([]); // [{lat,lng}]
  const [navigationPosition, setNavigationPosition] = useState(null);

  const [showWalkingExperience, setShowWalkingExperience] = useState(false);
  const [currentMapillaryIndex, setCurrentMapillaryIndex] = useState(0);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(coords);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError('Unable to get your location');
          // fallback
          setCurrentLocation({ lat: 37.7749, lng: -122.4194 });
        }
      );
    }
  }, []);

  // keep backend updated with my live location & fetch friends around me
  useEffect(() => {
    if (!user || !currentLocation) return;

    const updateLocationAndFetchFriends = async () => {
      try {
        await api.post('/map/update-location', {
          coordinates: {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
          },
        });

        const res = await api.post('/map/nearby-friends', {
          coordinates: {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
          },
          radius: 3000, // 3 km
        });

        setFriendsAroundMe(res.data.friends || []);
      } catch (err) {
        console.error('Friend location error:', err);
      }
    };

    updateLocationAndFetchFriends();
    const interval = setInterval(updateLocationAndFetchFriends, 30000);
    return () => clearInterval(interval);
  }, [user, currentLocation]);

  // Handle map click for destination
  const handleMapClick = (latlng) => {
    setDestination({ lat: latlng.lat, lng: latlng.lng });
    setRoutes([]);
    setSelectedRoute(null);
    setNearbyFriends([]);
    setIsNavigating(false);
    setNavigationSteps([]);
    setCurrentStepIndex(0);
    setNavigationPath([]);
    setNavigationPosition(null);
  };

  // Calculate routes when destination or preference changes
  useEffect(() => {
    if (currentLocation && destination) {
      calculateRoutes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, routePreference]);

  const calculateRoutes = async () => {
    setLoading(true);
    setError('');
    setIsNavigating(false);
    setNavigationSteps([]);
    setCurrentStepIndex(0);
    setNavigationPath([]);
    setNavigationPosition(null);

    try {
      if (
        !currentLocation ||
        typeof currentLocation.lat !== 'number' ||
        typeof currentLocation.lng !== 'number'
      ) {
        setError(
          'Invalid origin coordinates. Please allow location access or set your location manually.'
        );
        setLoading(false);
        return;
      }
      if (
        !destination ||
        typeof destination.lat !== 'number' ||
        typeof destination.lng !== 'number'
      ) {
        setError('Invalid destination coordinates. Please click on the map to set a destination.');
        setLoading(false);
        return;
      }

      const response = await api.post('/map/calculate-route', {
        origin: currentLocation,
        destination: destination,
        preferences: { routeType: routePreference },
      });

      const newRoutes = response.data.routes || [];
      setRoutes(newRoutes);
      if (newRoutes.length > 0) {
        setSelectedRoute(0);
      }

      const friendsResponse = await api.post('/map/nearby-friends', {
        coordinates: {
          lat: destination.lat,
          lng: destination.lng,
        },
        radius: 5000,
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
    route.legs.forEach((leg) => {
      if (leg.points) {
        leg.points.forEach((point) => {
          coordinates.push([point.latitude, point.longitude]);
        });
      }
    });
    return coordinates;
  };

  // Build navigation steps from route geometry
  const buildNavigationSteps = (route) => {
    const coords = getRouteCoordinates(route);
    if (!coords || coords.length < 3) {
      return [
        'Start from your location and follow the highlighted route.',
        'You are almost near your destination.',
      ];
    }

    const steps = [];
    steps.push('Start from your location.');

    // sample points to avoid too many instructions
    const sampleCount = 15;
    const stepSize = Math.max(2, Math.floor(coords.length / sampleCount));
    const sampled = [];
    for (let i = 0; i < coords.length; i += stepSize) {
      sampled.push(coords[i]);
    }
    if (sampled[sampled.length - 1] !== coords[coords.length - 1]) {
      sampled.push(coords[coords.length - 1]);
    }

    for (let i = 1; i < sampled.length - 1; i++) {
      const [lat1, lng1] = sampled[i - 1];
      const [lat2, lng2] = sampled[i];
      const [lat3, lng3] = sampled[i + 1];

      const b1 = computeBearing(lat1, lng1, lat2, lng2);
      const b2 = computeBearing(lat2, lng2, lat3, lng3);

      let delta = b2 - b1;
      delta = ((delta + 540) % 360) - 180;

      const turnText = describeTurn(delta);
      if (turnText === 'Continue straight') {
        steps.push('Continue straight on this road.');
      } else if (turnText.startsWith('Turn left')) {
        steps.push('Turn left at the upcoming intersection.');
      } else if (turnText.startsWith('Turn right')) {
        steps.push('Turn right at the upcoming intersection.');
      } else {
        steps.push('Adjust direction as needed to stay on the route.');
      }
    }

    steps.push('You have reached near your destination.');
    return steps;
  };

  // color based on safety score
  const getRouteColor = (safetyScore) => {
    if (safetyScore >= 80) return '#22c55e';
    if (safetyScore >= 60) return '#eab308';
    if (safetyScore >= 40) return '#f97316';
    return '#ef4444';
  };

  // parse "lat,lng" string
  const parseLatLng = (value) => {
    const parts = value.split(',');
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  };

  // handle manual current location set
  const handleSetManualLocation = () => {
    setError('');
    if (!manualLocationInput.trim()) return;

    const parsed = parseLatLng(manualLocationInput);
    if (!parsed) {
      setError('Invalid manual location. Use format: lat,lng (e.g., 19.0760, 72.8777)');
      return;
    }

    setCurrentLocation(parsed);
    setRoutes([]);
    setSelectedRoute(null);
    setNearbyFriends([]);
    setIsNavigating(false);
    setNavigationSteps([]);
    setCurrentStepIndex(0);
    setNavigationPath([]);
    setNavigationPosition(null);
  };

  // navigation handlers
  const handleStartNavigation = () => {
    if (selectedRoute === null || !routes[selectedRoute]) return;
    const route = routes[selectedRoute];

    const steps = buildNavigationSteps(route);
    setNavigationSteps(steps);
    setCurrentStepIndex(0);

    let coords = getRouteCoordinates(route);
    if (!coords || coords.length === 0) return;

    // simple densify for smoother animation
    if (coords.length < 80) {
      const dense = [];
      for (let i = 0; i < coords.length - 1; i++) {
        const [lat1, lng1] = coords[i];
        const [lat2, lng2] = coords[i + 1];
        const segments = 3; // add 2 midpoints
        for (let s = 0; s < segments; s++) {
          const t = s / segments;
          dense.push([
            lat1 + (lat2 - lat1) * t,
            lng1 + (lng2 - lng1) * t,
          ]);
        }
      }
      dense.push(coords[coords.length - 1]);
      coords = dense;
    }

    const path = coords.map(([lat, lng]) => ({ lat, lng }));
    setNavigationPath(path);
    setNavigationPosition(path[0]);
    setIsNavigating(true);
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setNavigationSteps([]);
    setCurrentStepIndex(0);
    setNavigationPath([]);
    setNavigationPosition(null);
  };

  const handleNextStep = () => {
    setCurrentStepIndex((prev) =>
      prev < navigationSteps.length - 1 ? prev + 1 : prev
    );
  };

  const handlePrevStep = () => {
    setCurrentStepIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  // walking experience handlers
  const handleViewWalkingExperience = () => {
    setShowWalkingExperience(true);
    setCurrentMapillaryIndex(0);
  };

  const handleExitWalkingExperience = () => {
    setShowWalkingExperience(false);
  };

  const handleNextMapillary = () => {
    setCurrentMapillaryIndex((prev) =>
      prev < mapillaryEmbeds.length - 1 ? prev + 1 : prev
    );
  };

  const handlePrevMapillary = () => {
    setCurrentMapillaryIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  // Simulate user moving along the navigation path
  useEffect(() => {
    if (!isNavigating || navigationPath.length === 0) return;

    let index = 0;
    const totalPoints = navigationPath.length;

    setNavigationPosition(navigationPath[0]);

    const intervalId = setInterval(() => {
      index += 1;
      if (index >= totalPoints) {
        setNavigationPosition(navigationPath[totalPoints - 1]);
        clearInterval(intervalId);
        setIsNavigating(false);
        return;
      }

      setNavigationPosition(navigationPath[index]);

      // auto-update step index according to progress
      if (navigationSteps.length > 0) {
        const progress = index / (totalPoints - 1);
        const newStepIndex = Math.min(
          navigationSteps.length - 1,
          Math.floor(progress * navigationSteps.length)
        );
        setCurrentStepIndex(newStepIndex);
      }
    }, 400); // 0.4s

    return () => clearInterval(intervalId);
  }, [isNavigating, navigationPath, navigationSteps.length]);

  if (!currentLocation) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-lg">Loading map...</div>
      </div>
    );
  }

  return (
    // page-wide scroll
    <div className="flex flex-col min-h-screen overflow-y-auto bg-gray-50">
      {/* Controls */}
      <div className="bg-white p-4 md:p-6 shadow-md z-10 relative">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route Preference
            </label>
            <select
              value={routePreference}
              onChange={(e) => setRoutePreference(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
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
                setIsNavigating(false);
                setNavigationSteps([]);
                setCurrentStepIndex(0);
                setNavigationPath([]);
                setNavigationPosition(null);
              }}
              className="bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600"
            >
              Clear Destination
            </button>
          )}

          <div className="flex-1 text-xs md:text-sm text-gray-600">
            {!destination && 'Click on the map to set your destination'}
            {loading && 'Calculating routes...'}
            {error && <span className="text-red-500 ml-2">{error}</span>}
          </div>
        </div>

        {/* manual location input */}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Set my location manually (lat,lng)
            </label>
            <input
              type="text"
              value={manualLocationInput}
              onChange={(e) => setManualLocationInput(e.target.value)}
              placeholder="e.g., 19.0760, 72.8777"
              className="border border-gray-300 rounded-md px-3 py-1 text-sm w-64"
            />
          </div>
          <button
            onClick={handleSetManualLocation}
            className="px-4 py-2 rounded bg-gray-900 text-white text-sm hover:bg-black"
          >
            Update Location
          </button>
          <span className="text-xs text-gray-500">
            Current: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
          </span>
        </div>

        {/* Route Options with Scrollbar */}
        {routes.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium text-gray-700 mb-2">
              Available Routes:
            </h3>
            <div
              className="max-h-64 overflow-y-auto pr-2"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f1f5f9',
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {routes.map((route, index) => {
                  const isSelected = selectedRoute === index;
                  const isActiveNav = isSelected && isNavigating;

                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedRoute(index)}
                      className={`p-3 border-2 rounded cursor-pointer transition-all text-sm ${
                        isActiveNav
                          ? 'border-green-500 bg-green-50 shadow-md'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">Route {index + 1}</span>
                        <span
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{
                            backgroundColor: getRouteColor(route.safetyScore),
                          }}
                        >
                          Safety: {Math.round(route.safetyScore)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div>
                          Distance:{' '}
                          {(route.lengthInMeters / 1000).toFixed(2)} km
                        </div>
                        <div>
                          Time:{' '}
                          {Math.round(route.travelTimeInSeconds / 60)} min
                        </div>
                      </div>
                      {isActiveNav && (
                        <div className="mt-1 text-[11px] text-green-700 font-medium">
                          Navigation active
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* navigation + walking experience buttons */}
            {selectedRoute !== null && (
              <div className="mt-3 flex flex-wrap gap-2">
                {!isNavigating ? (
                  <button
                    onClick={handleStartNavigation}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    Start Navigating
                  </button>
                ) : (
                  <button
                    onClick={handleStopNavigation}
                    className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
                  >
                    Stop Navigation
                  </button>
                )}

                <button
                  onClick={handleViewWalkingExperience}
                  className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-black"
                >
                  View Walking Experience
                </button>
              </div>
            )}

            {/* Turn-by-turn style instructions */}
            {isNavigating && navigationSteps.length > 0 && (
              <div className="mt-3 p-3 border rounded bg-blue-50 text-sm">
                <div className="font-semibold mb-1">Navigation</div>
                <div className="mb-2">
                  {navigationSteps[currentStepIndex] || navigationSteps[0]}
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <button
                    onClick={handlePrevStep}
                    disabled={currentStepIndex === 0}
                    className="px-2 py-1 rounded border disabled:opacity-50"
                  >
                    ◀ Previous
                  </button>
                  <span>
                    Step {currentStepIndex + 1} of {navigationSteps.length}
                  </span>
                  <button
                    onClick={handleNextStep}
                    disabled={currentStepIndex === navigationSteps.length - 1}
                    className="px-2 py-1 rounded border disabled:opacity-50"
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nearby Friends relative to destination */}
        {nearbyFriends.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium text-gray-700 mb-2">
              Friends Near Destination:
            </h3>
            <div className="flex flex-wrap gap-2">
              {nearbyFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-2 text-sm"
                >
                  {friend.avatarUrl && (
                    <img
                      src={friend.avatarUrl}
                      alt={friend.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span>
                    {friend.displayName || friend.name}
                  </span>
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
      <div
        className={`relative ${
          showWalkingExperience ? 'pointer-events-none opacity-50' : ''
        }`}
        style={{ height: '70vh' }}
      >
        <MapContainer
          center={[currentLocation.lat, currentLocation.lng]}
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
              position={[currentLocation.lat, currentLocation.lng]}
              icon={currentLocationIcon}
            >
              <Popup>Your Location</Popup>
            </Marker>
          )}

          {/* Friends Around Me Markers */}
          {friendsAroundMe.map((friend) =>
            typeof friend.lat === 'number' &&
            typeof friend.lng === 'number' ? (
              <Marker
                key={friend.id}
                position={[friend.lat, friend.lng]}
                icon={friendIcon}
              >
                <Popup>
                  <strong>{friend.displayName || friend.name}</strong>
                  <br />
                  Nearby friend
                </Popup>
              </Marker>
            ) : null
          )}

          {/* Destination Marker */}
          {destination && (
            <Marker
              position={[destination.lat, destination.lng]}
              icon={destinationIcon}
            >
              <Popup>Destination</Popup>
            </Marker>
          )}

          {/* Route Polylines with highlighting logic */}
          {routes.map((route, index) => {
            const coordinates = getRouteCoordinates(route);
            if (coordinates.length === 0) return null;

            const isSelected = selectedRoute === index;
            const isActiveNav = isSelected && isNavigating;

            const baseColor = getRouteColor(route.safetyScore);
            const inactiveColor = '#94a3b8'; // grey

            // if navigating: only active route in color, rest grey
            // if not navigating: selected route in color, rest grey
            const color =
              isActiveNav || (!isNavigating && isSelected)
                ? baseColor
                : inactiveColor;

            const weight = isActiveNav
              ? 8
              : isSelected
              ? 6
              : 3;

            const opacity = isActiveNav
              ? 1
              : isSelected
              ? 0.9
              : 0.4;

            const dashArray =
              isActiveNav || isSelected ? 'none' : '6, 8';

            return (
              <Polyline
                key={index}
                positions={coordinates}
                color={color}
                weight={weight}
                opacity={opacity}
                dashArray={dashArray}
                lineCap="round"
                lineJoin="round"
                className="cursor-pointer"
                eventHandlers={{
                  click: () => setSelectedRoute(index),
                }}
              />
            );
          })}

          {/* SV Road Polyline during walking experience */}
          {showWalkingExperience && (
            <Polyline
              positions={svRoadCoordinates.map((p) => [p.lat, p.lng])}
              color="purple"
              weight={4}
              opacity={0.9}
            />
          )}

          {/* Moving navigation marker */}
          <NavigationMarker
            position={navigationPosition}
            isNavigating={isNavigating}
          />

          {/* Re-center button */}
          <RecenterControl
            currentLocation={currentLocation}
            navigationPosition={navigationPosition}
            isNavigating={isNavigating}
          />
        </MapContainer>
      </div>

      {/* Mapillary Walking Experience Overlay */}
      {showWalkingExperience && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
          <div className="bg-white w-11/12 md:w-3/4 h-[90vh] rounded-lg shadow-lg flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h3 className="font-semibold text-lg">
                Walking Experience
              </h3>
              <button
                onClick={handleExitWalkingExperience}
                className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                Exit Experience ✕
              </button>
            </div>

            <div className="flex-1">
              <iframe
                key={currentMapillaryIndex}
                src={mapillaryEmbeds[currentMapillaryIndex]}
                title="Mapillary walking view"
                className="w-full h-full border-0"
                allowFullScreen
              />
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-t text-sm">
              <button
                onClick={handlePrevMapillary}
                disabled={currentMapillaryIndex === 0}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                ◀ Previous
              </button>
              <span>
                {currentMapillaryIndex + 1} / {mapillaryEmbeds.length}
              </span>
              <button
                onClick={handleNextMapillary}
                disabled={currentMapillaryIndex === mapillaryEmbeds.length - 1}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
