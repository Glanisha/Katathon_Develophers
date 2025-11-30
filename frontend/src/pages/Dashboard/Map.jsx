import { useState, useEffect, useRef } from "react";
import api from "../../../api";
import { useAuth } from "../../context/AuthContext";

import tt from "@tomtom-international/web-sdk-maps";
import "@tomtom-international/web-sdk-maps/dist/maps.css";

// 🔑 TomTom API key from frontend .env
const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;

// Mapillary walking experience embeds (SV Road)
const mapillaryEmbeds = [
  "https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=523808853473226&x=0.5&y=0.5&style=photo",
  "https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=1240144430506052&x=0.5&y=0.5&style=photo",
  "https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=528738053191765&x=0.49999999999337164&y=0.49999999999979505&style=photo",
  "https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=1095380695299787&x=0.5&y=0.5&style=photo",
  "https://www.mapillary.com/embed?map_style=Mapillary%20light&image_key=2215276745539638&x=0.5000000000000001&y=0.5&style=photo",
  "https://www.mapillary.com/embed?map_style=Mapillary%20light&image_key=2551481258378160&x=0.4999999999999994&y=0.5&style=photo",
  "https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=4029046383993584&x=0.5000000000000063&y=0.5&style=photo",
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
  if (abs < 30) return "Continue straight";
  if (delta > 0 && abs < 135) return "Turn right";
  if (delta < 0 && abs < 135) return "Turn left";
  if (delta >= 135) return "Make a sharp right / U-turn";
  if (delta <= -135) return "Make a sharp left / U-turn";
  return "Continue";
};

// color based on safety score
const getRouteColor = (safetyScore) => {
  if (safetyScore >= 80) return "#22c55e";
  if (safetyScore >= 60) return "#eab308";
  if (safetyScore >= 40) return "#f97316";
  return "#ef4444";
};

// parse "lat,lng" string
const parseLatLng = (value) => {
  const parts = value.split(",");
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0].trim());
  const lng = parseFloat(parts[1].trim());
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
};

// get coordinates array from backend route object (TomTom style)
const getRouteCoordinates = (route) => {
  if (!route || !route.legs) return [];
  const coordinates = [];
  route.legs.forEach((leg) => {
    if (leg.points) {
      leg.points.forEach((point) => {
        coordinates.push([point.longitude, point.latitude]); // [lng, lat]
      });
    }
  });
  return coordinates;
};

// build navigation steps from route geometry
const buildNavigationSteps = (route) => {
  const coords = getRouteCoordinates(route).map(([lng, lat]) => [lat, lng]);

  if (!coords || coords.length < 3) {
    return [
      "Start from your location and follow the highlighted route.",
      "You are almost near your destination.",
    ];
  }

  const steps = [];
  steps.push("Start from your location.");

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
    if (turnText === "Continue straight") {
      steps.push("Continue straight on this road.");
    } else if (turnText.startsWith("Turn left")) {
      steps.push("Turn left at the upcoming intersection.");
    } else if (turnText.startsWith("Turn right")) {
      steps.push("Turn right at the upcoming intersection.");
    } else {
      steps.push("Adjust direction as needed to stay on the route.");
    }
  }

  steps.push("You have reached near your destination.");
  return steps;
};

const Map = () => {
  const { user } = useAuth();

  const mapElementRef = useRef(null);
  const mapRef = useRef(null);

  // marker + layer refs
  const currentMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const friendMarkersRef = useRef([]);
  const navMarkerRef = useRef(null);
  const routeLayersRef = useRef([]); // {id, sourceId}

  const [friendsAroundMe, setFriendsAroundMe] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [nearbyFriends, setNearbyFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [routePreference, setRoutePreference] = useState("safest");

  const [manualLocationInput, setManualLocationInput] = useState("");

  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationSteps, setNavigationSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [navigationPath, setNavigationPath] = useState([]); // [{lat,lng}]
  const [navigationPosition, setNavigationPosition] = useState(null);

  const [showWalkingExperience, setShowWalkingExperience] = useState(false);
  const [currentMapillaryIndex, setCurrentMapillaryIndex] = useState(0);

  // get user location
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(coords);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Unable to get your location");
        // fallback
        setCurrentLocation({ lat: 19.076, lng: 72.8777 });
      }
    );
  }, []);

  // init TomTom map once we have location
  useEffect(() => {
    if (!currentLocation || !TOMTOM_API_KEY) return;
    if (mapRef.current) return;

    mapRef.current = tt.map({
      key: TOMTOM_API_KEY,
      container: mapElementRef.current,
      center: [currentLocation.lng, currentLocation.lat],
      zoom: 15,
    });

    // click handler to set destination
    mapRef.current.on("click", (e) => {
      const { lat, lng } = e.lngLat;
      handleMapClick({ lat, lng });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation]);

  // keep backend updated with my live location & fetch friends around me
  useEffect(() => {
    if (!user || !currentLocation) return;

    const updateLocationAndFetchFriends = async () => {
      try {
        await api.post("/map/update-location", {
          coordinates: {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
          },
        });

        const res = await api.post("/map/nearby-friends", {
          coordinates: {
            lat: currentLocation.lat,
            lng: currentLocation.lng,
          },
          radius: 3000,
        });

        setFriendsAroundMe(res.data.friends || []);
      } catch (err) {
        console.error("Friend location error:", err);
      }
    };

    updateLocationAndFetchFriends();
    const interval = setInterval(updateLocationAndFetchFriends, 30000);
    return () => clearInterval(interval);
  }, [user, currentLocation]);

  // update current location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentLocation) return;

    if (!currentMarkerRef.current) {
      currentMarkerRef.current = new tt.Marker({ color: "#2563eb" })
        .setLngLat([currentLocation.lng, currentLocation.lat])
        .setPopup(new tt.Popup().setHTML("<b>Your Location</b>"))
        .addTo(map);
    } else {
      currentMarkerRef.current.setLngLat([
        currentLocation.lng,
        currentLocation.lat,
      ]);
    }
  }, [currentLocation]);

  // update destination marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!destination) {
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      return;
    }

    if (!destMarkerRef.current) {
      destMarkerRef.current = new tt.Marker({ color: "#dc2626" })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new tt.Popup().setHTML("<b>Destination</b>"))
        .addTo(map);
    } else {
      destMarkerRef.current.setLngLat([destination.lng, destination.lat]);
    }
  }, [destination]);

  // friends markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // clear old markers
    friendMarkersRef.current.forEach((m) => m.remove());
    friendMarkersRef.current = [];

    friendsAroundMe.forEach((friend) => {
      if (typeof friend.lat === "number" && typeof friend.lng === "number") {
        const marker = new tt.Marker({ color: "#16a34a" })
          .setLngLat([friend.lng, friend.lat])
          .setPopup(
            new tt.Popup().setHTML(
              `<b>${friend.displayName || friend.name}</b><br/>Nearby friend`
            )
          )
          .addTo(map);
        friendMarkersRef.current.push(marker);
      }
    });
  }, [friendsAroundMe]);

  // navigation moving marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!isNavigating || !navigationPosition) {
      if (navMarkerRef.current) {
        navMarkerRef.current.remove();
        navMarkerRef.current = null;
      }
      return;
    }

    if (!navMarkerRef.current) {
      navMarkerRef.current = new tt.Marker({ color: "#0ea5e9" })
        .setLngLat([navigationPosition.lng, navigationPosition.lat])
        .setPopup(new tt.Popup().setHTML("<b>You are here (navigation)</b>"))
        .addTo(map);
    } else {
      navMarkerRef.current.setLngLat([
        navigationPosition.lng,
        navigationPosition.lat,
      ]);
    }

    map.setCenter([navigationPosition.lng, navigationPosition.lat]);
    map.setZoom(16);
  }, [navigationPosition, isNavigating]);

  // draw routes as layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // remove old layers & sources
    routeLayersRef.current.forEach(({ id, sourceId }) => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    });
    routeLayersRef.current = [];

    routes.forEach((route, index) => {
      const coords = getRouteCoordinates(route);
      if (!coords.length) return;

      const isSelected = selectedRoute === index;
      const isActiveNav = isSelected && isNavigating;

      const baseColor = getRouteColor(route.safetyScore);
      const inactiveColor = "#94a3b8";

      const color =
        isActiveNav || (!isNavigating && isSelected) ? baseColor : inactiveColor;

      const width = isActiveNav ? 8 : isSelected ? 6 : 3;
      const opacity = isActiveNav ? 1 : isSelected ? 0.9 : 0.4;

      const sourceId = `route-source-${index}`;
      const layerId = `route-layer-${index}`;

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: coords,
          },
        },
      });

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": color,
          "line-width": width,
          "line-opacity": opacity,
          "line-dasharray":
            isActiveNav || isSelected ? [1, 0] : [3, 3],
        },
      });

      // click on route to select
      map.on("click", layerId, () => {
        setSelectedRoute(index);
      });

      routeLayersRef.current.push({ id: layerId, sourceId });
    });
  }, [routes, selectedRoute, isNavigating]);

  // SV Road polyline when walking experience enabled
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const layerId = "sv-road-layer";
    const sourceId = "sv-road-source";

    if (!showWalkingExperience) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      return;
    }

    const coords = svRoadCoordinates.map((p) => [p.lng, p.lat]);

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      },
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#a855f7",
        "line-width": 4,
        "line-opacity": 0.9,
      },
    });

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [showWalkingExperience]);

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

  // calculate routes when destination or preference changes
  useEffect(() => {
    if (currentLocation && destination) {
      calculateRoutes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, routePreference]);

  const calculateRoutes = async () => {
    setLoading(true);
    setError("");
    setIsNavigating(false);
    setNavigationSteps([]);
    setCurrentStepIndex(0);
    setNavigationPath([]);
    setNavigationPosition(null);

    try {
      if (
        !currentLocation ||
        typeof currentLocation.lat !== "number" ||
        typeof currentLocation.lng !== "number"
      ) {
        setError(
          "Invalid origin coordinates. Please allow location access or set your location manually."
        );
        setLoading(false);
        return;
      }
      if (
        !destination ||
        typeof destination.lat !== "number" ||
        typeof destination.lng !== "number"
      ) {
        setError(
          "Invalid destination coordinates. Please click on the map to set a destination."
        );
        setLoading(false);
        return;
      }

      const response = await api.post("/map/calculate-route", {
        origin: currentLocation,
        destination: destination,
        preferences: { routeType: routePreference },
      });

      const newRoutes = response.data.routes || [];
      setRoutes(newRoutes);
      if (newRoutes.length > 0) {
        setSelectedRoute(0);
      }

      const friendsResponse = await api.post("/map/nearby-friends", {
        coordinates: {
          lat: destination.lat,
          lng: destination.lng,
        },
        radius: 5000,
      });

      setNearbyFriends(friendsResponse.data.friends || []);
    } catch (err) {
      console.error("Route calculation error:", err);
      setError(err.response?.data?.error || "Failed to calculate route");
    } finally {
      setLoading(false);
    }
  };

  const handleSetManualLocation = () => {
    setError("");
    if (!manualLocationInput.trim()) return;

    const parsed = parseLatLng(manualLocationInput);
    if (!parsed) {
      setError(
        "Invalid manual location. Use format: lat,lng (e.g., 19.0760, 72.8777)"
      );
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

    if (mapRef.current) {
      mapRef.current.setCenter([parsed.lng, parsed.lat]);
      mapRef.current.setZoom(15);
    }
  };

  const handleStartNavigation = () => {
    if (selectedRoute === null || !routes[selectedRoute]) return;
    const route = routes[selectedRoute];

    const steps = buildNavigationSteps(route);
    setNavigationSteps(steps);
    setCurrentStepIndex(0);

    const coords = getRouteCoordinates(route).map(([lng, lat]) => ({
      lat,
      lng,
    }));
    if (!coords.length) return;

    // densify path a bit
    let dense = [];
    if (coords.length < 80) {
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const segments = 3;
        for (let s = 0; s < segments; s++) {
          const t = s / segments;
          dense.push({
            lat: p1.lat + (p2.lat - p1.lat) * t,
            lng: p1.lng + (p2.lng - p1.lng) * t,
          });
        }
      }
      dense.push(coords[coords.length - 1]);
    } else {
      dense = coords;
    }

    setNavigationPath(dense);
    setNavigationPosition(dense[0]);
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

  const handleRecenter = () => {
    if (!mapRef.current || !currentLocation) return;
    const target =
      isNavigating && navigationPosition
        ? navigationPosition
        : currentLocation;
    mapRef.current.setCenter([target.lng, target.lat]);
    mapRef.current.setZoom(16);
  };

  if (!TOMTOM_API_KEY) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-lg text-red-600">
          TomTom API key is not configured. Please set{" "}
          <code>VITE_TOMTOM_API_KEY</code> in your frontend .env file.
        </div>
      </div>
    );
  }

  if (!currentLocation) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-lg">Loading map...</div>
      </div>
    );
  }

  return (
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
            {!destination && "Click on the map to set your destination"}
            {loading && "Calculating routes..."}
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
            Current: {currentLocation.lat.toFixed(4)},{" "}
            {currentLocation.lng.toFixed(4)}
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
                scrollbarWidth: "thin",
                scrollbarColor: "#cbd5e1 #f1f5f9",
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
                          ? "border-green-500 bg-green-50 shadow-md"
                          : isSelected
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">
                          Route {index + 1}
                        </span>
                        <span
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{
                            backgroundColor: getRouteColor(
                              route.safetyScore
                            ),
                          }}
                        >
                          Safety: {Math.round(route.safetyScore)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div>
                          Distance:{" "}
                          {(route.lengthInMeters / 1000).toFixed(2)} km
                        </div>
                        <div>
                          Time:{" "}
                          {Math.round(
                            route.travelTimeInSeconds / 60
                          )}{" "}
                          min
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
                  {navigationSteps[currentStepIndex] ||
                    navigationSteps[0]}
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
                    Step {currentStepIndex + 1} of{" "}
                    {navigationSteps.length}
                  </span>
                  <button
                    onClick={handleNextStep}
                    disabled={
                      currentStepIndex === navigationSteps.length - 1
                    }
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
                  <span>{friend.displayName || friend.name}</span>
                  <button className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
                    Invite
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map container */}
      <div
        className={`relative ${
          showWalkingExperience ? "pointer-events-none opacity-50" : ""
        }`}
        style={{ height: "70vh" }}
      >
        <div
          ref={mapElementRef}
          style={{ height: "100%", width: "100%" }}
        />

        {/* Recenter button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={handleRecenter}
            className="px-3 py-1 rounded-full bg-white shadow text-xs font-medium hover:bg-gray-100"
          >
            Re-center on me
          </button>
        </div>
      </div>

      {/* Mapillary Walking Experience Overlay */}
      {showWalkingExperience && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
          <div className="bg-white w-11/12 md:w-3/4 h-[90vh] rounded-lg shadow-lg flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <h3 className="font-semibold text-lg">Walking Experience</h3>
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
                disabled={
                  currentMapillaryIndex === mapillaryEmbeds.length - 1
                }
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
