import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, TouchableOpacity, ScrollView, Dimensions, Modal, Image  } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import api from '../../../src/api/api';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');
 
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface PredictiveSafety {
  predictionTimestamp: string;
  now: number;            // 0..100 safety score (higher = safer)
  in30Min: number;
  after22: number;
  timeSeries?: Array<{ offsetMinutes: number; score: number }>;
  explanation?: string;
  rawSignals?: any;
}


interface Route {
  id: string;
  safetyScore: number;
  lengthInMeters: number;
  travelTimeInSeconds: number;
  walkabilityScore: number;
  suggestions?: any;
  commentary?: string;
  predictiveSafety?: PredictiveSafety; // <-- added
  legs: Array<{
    points: Array<{
      latitude: number;
      longitude: number;
    }>;
  }>;
}

const MapScreen = () => {
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  // New: allow manual source or device location as source
  const [useDeviceAsSource, setUseDeviceAsSource] = useState<boolean>(true); // default = device
  const [manualSource, setManualSource] = useState<Coordinates | null>(null);
  const [settingSourceMode, setSettingSourceMode] = useState<boolean>(false); // if true next map tap sets source
  const [purpose, setPurpose] = useState('');
  const [routeType, setRouteType] = useState<'safest' | 'fastest' | 'balanced'>('safest');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [savedRouteId, setSavedRouteId] = useState<string | null>(null);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(0);
  const [explorePOIs, setExplorePOIs] = useState<any[]>([]);
  const [showRouteForm, setShowRouteForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [experienceIndex, setExperienceIndex] = useState(0);
  const [incidents, setIncidents] = useState<any[]>([]);

  const mapRef = useRef<MapView>(null);
  const watchIdRef = useRef<Location.LocationSubscription | null>(null);
  const mapillaryEmbeds = [
    'https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=523808853473226&x=0.5&y=0.5&style=photo',
    'https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=1240144430506052&x=0.5&y=0.5&style=photo',
    'https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=528738053191765&x=0.49999999999337164&y=0.49999999999979505&style=photo',
    'https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=1095380695299787&x=0.5&y=0.5&style=photo',
    'https://www.mapillary.com/embed?map_style=Mapillary%20light&image_key=2215276745539638&x=0.5000000000000001&y=0.5&style=photo',
    'https://www.mapillary.com/embed?map_style=Mapillary%20light&image_key=2551481258378160&x=0.4999999999999994&y=0.5&style=photo',
    'https://www.mapillary.com/embed?map_style=OpenStreetMap&image_key=4029046383993584&x=0.5000000000000063&y=0.5&style=photo'
  ];

  useEffect(() => {
    getCurrentLocation();
    loadIncidents();
    return () => {
      if (watchIdRef.current) {
        watchIdRef.current.remove();
      }
    };
  }, []);

  // Reload incidents every 10 seconds so they stay fresh on the map
  useEffect(() => {
    const interval = setInterval(() => {
      loadIncidents();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadIncidents = async () => {
    try {
      const response = await api.get('/incidents/all');
      console.log('loadIncidents response:', response?.data?.incidents?.length ?? 0);
      const incoming = response.data.incidents || [];
      // normalize location shape and types (defensive)
      const normalized = incoming.map((it: any) => {
        const loc = it.location || {};
        const lat = parseFloat((loc.latitude ?? loc.lat ?? '').toString()) || undefined;
        const lng = parseFloat((loc.longitude ?? loc.lon ?? loc.lng ?? '').toString()) || undefined;
        return { ...it, location: lat != null && lng != null ? { latitude: lat, longitude: lng } : it.location };
      });
      setIncidents(normalized);
    } catch (error) {
      console.error('Load incidents error:', error);
    }
  };

  // Add verification function
  const verifyIncident = async (incidentId: string) => {
    try {
      await api.post(`/incidents/verify/${incidentId}`);
      Alert.alert('Verified', 'Thank you for verifying this incident!');
      await loadIncidents(); // Reload incidents
    } catch (error) {
      console.error('Verify incident error:', error);
      Alert.alert('Error', 'Failed to verify incident');
    }
  };

  // Add this function to get marker color based on severity
  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'fine': return '#34C759'; // Green
      case 'moderate': return '#FF9500'; // Orange
      case 'dangerous': return '#FF3B30'; // Red
      default: return '#007AFF'; // Blue
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(coords);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const searchLocation = async (query: string) => {
    if (!query.trim() || !currentLocation) return;
    
    try {
      // Use TomTom search API through backend
      const response = await fetch(
        `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${process.env.EXPO_PUBLIC_TOMTOM_API_KEY}&lat=${currentLocation.latitude}&lon=${currentLocation.longitude}&limit=5`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const coords = {
          latitude: result.position.lat,
          longitude: result.position.lon,
        };
        setDestination(coords);
        
        if (mapRef.current) {
          mapRef.current.fitToCoordinates([currentLocation, coords], {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          });
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search location');
    }
  };

  // helper to get effective origin (device or manual)
  const getOrigin = (): Coordinates | null => {
    return useDeviceAsSource ? currentLocation : manualSource;
  };
  

  const calculateRoutes = async () => {
    if (!destination) {
      Alert.alert('Error', 'Tap the map to set a destination');
      return;
    }

    const originCoords = getOrigin();
    if (useDeviceAsSource && !currentLocation) {
      Alert.alert('Error', 'Current device location not available. Allow location access or switch to manual source.');
      return;
    }
    if (!originCoords) {
      Alert.alert('Error', 'Source not available. Set source manually or enable device location.');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        origin: {
          lat: originCoords.latitude,
          lng: originCoords.longitude
        },
        destination: {
          lat: destination.latitude,
          lng: destination.longitude
        },
        preferences: {
          routeType,
          purpose: purpose.trim() || undefined
        }
      };

      console.log('Sending route request:', requestData);

      const response = await api.post('/map/calculate-route', requestData);
      
      if (response.data.explorePOIs) {
        setExplorePOIs(response.data.explorePOIs);
        setRoutes([]);
        setShowRouteForm(false);
        Alert.alert('Exploration Mode', response.data.message);
      } else {
        setRoutes(response.data.routes || []);
        setExplorePOIs([]);
        setShowRouteForm(false);
      }
    } catch (error: any) {
      console.error('Route calculation error:', error);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to calculate routes');
    } finally {
      setLoading(false);
    }
  };

  const selectRoute = async (route: Route) => {
    // Set immediately so UI updates
    setSelectedRoute(route);

    try {
      // Try saving route on backend
      const response = await api.post('/map/save-route', {
        routeData: route,
        preferences: { purpose, routeType }
      });

      const savedId = response?.data?.savedRoute?._id;
      if (savedId) {
        setSavedRouteId(savedId);
        console.log('Route saved, id:', savedId);
      } else {
        // Fallback: generate a local id if backend didn't return one
        const fallbackId = `local_${Date.now()}`;
        setSavedRouteId(fallbackId);
        console.warn('Save-route returned no id, using fallback:', fallbackId);
      }

      setDistanceRemaining(route.lengthInMeters || 0);

      // Fit map to route
      if (mapRef.current && route.legs.length > 0) {
        const coordinates = route.legs.flatMap(leg => leg.points);
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 250, left: 50 },
        });
      }
    } catch (error: any) {
      console.error('Save route error:', error?.message || error);
      // Still allow route selection even if backend fails
      const fallbackId = `local_${Date.now()}`;
      setSavedRouteId(fallbackId);
      setDistanceRemaining(route.lengthInMeters || 0);
      
      if (mapRef.current && route.legs.length > 0) {
        const coordinates = route.legs.flatMap(leg => leg.points);
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 250, left: 50 },
        });
      }
    }
  };

  const startTracking = async () => {
    if (!selectedRoute) {
      Alert.alert('Error', 'No route selected');
      return;
    }

    // Only allow tracking if using device as source
    if (!useDeviceAsSource) {
      Alert.alert('Info', 'Tracking only available when using device location as source. View SV Road experience instead.');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Error', 'Current device location not available');
      return;
    }

    try {
      // Attempt backend tracking if we have a saved route id
      if (savedRouteId && !savedRouteId.startsWith('local_')) {
        try {
          await api.post('/map/start-tracking', { routeId: savedRouteId });
        } catch (err) {
          console.warn('Backend start-tracking failed, proceeding with local tracking:');
        }
      }

      setIsTracking(true);

      // Start location tracking
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setCurrentLocation(newLocation);
          updateProgress(newLocation);
        }
      );

      watchIdRef.current = subscription;
    } catch (error: any) {
      console.error('Start tracking error:', error);
      Alert.alert('Error', 'Failed to start tracking');
    }
  };

  const updateProgress = async (location: Coordinates) => {
    if (!savedRouteId || !selectedRoute) return;

    try {
      // Calculate remaining distance (simplified)
      const endPoint = selectedRoute.legs[selectedRoute.legs.length - 1].points.slice(-1)[0];
      const distance = calculateDistance(location, endPoint);
      setDistanceRemaining(Math.max(0, distance));

      // Only update backend if we have a non-local route id
      if (!savedRouteId.startsWith('local_')) {
        await api.post('/map/update-progress', {
          routeId: savedRouteId,
          currentLocation: {
            lat: location.latitude,
            lng: location.longitude
          },
          distanceRemaining: distance
        });
      }

      // Check if destination reached (< 50m away)
      if (distance < 50) {
        setIsTracking(false);
        if (watchIdRef.current) {
          watchIdRef.current.remove();
          watchIdRef.current = null;
        }
        Alert.alert('Congratulations!', 'You have reached your destination!');
      }
    } catch (error) {
      console.error('Update progress error:', error);
    }
  };

  const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const resetPlanning = () => {
    setShowRouteForm(true);
    setRoutes([]);
    setSelectedRoute(null);
    setExplorePOIs([]);
    setDestination(null);
    setPurpose('');
    setIsTracking(false);
    setSavedRouteId(null);
    
    if (watchIdRef.current) {
      watchIdRef.current.remove();
      watchIdRef.current = null;
    }
  };

  const routeCoordinates = selectedRoute ?
    selectedRoute.legs.flatMap(leg => leg.points) : [];
 
  // Determine whether a route is the SV Road (Bandra→Kandivali) route.
  // Simple heuristic: majority of route points fall within an SV Road bounding box.
  const isSVRoadRoute = (route: Route | null): boolean => {
    if (!route || !route.legs || route.legs.length === 0) return false;
    const points = route.legs.flatMap(l => l.points);
    if (points.length === 0) return false;

    // Loose bounding box for SV Road corridor in Mumbai
    const minLat = 19.03;
    const maxLat = 19.22;
    const minLng = 72.80;
    const maxLng = 72.90;

    let insideCount = 0;
    for (const p of points) {
      // safely read both possible key names and avoid TS errors
      const lat = (p as any).latitude ?? (p as any).lat ?? null;
      const lng = (p as any).longitude ?? (p as any).lng ?? null;
      if (lat == null || lng == null) continue;
      if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) insideCount++;
    }

    return insideCount / points.length >= 0.6; // 60% of points inside -> consider SV Road
  };

  // open modal (choose first embed)
  const openExperience = () => {
    setExperienceIndex(0);
    setShowExperienceModal(true);
  };

  // helpers to navigate embeds
  const prevExperience = () => setExperienceIndex(i => Math.max(0, i - 1));
  const nextExperience = () => setExperienceIndex(i => Math.min(mapillaryEmbeds.length - 1, i + 1));

  

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        onPress={(e) => {
          const coord = e.nativeEvent.coordinate;
          if (settingSourceMode) {
            // set manual source and exit setting mode
            setManualSource(coord);
            setUseDeviceAsSource(false);
            setSettingSourceMode(false);
            Alert.alert('Source set', 'Manual source set. You can now plan routes from this location.');
            // fit to show both source/destination if available
            if (mapRef.current && (destination || currentLocation)) {
              const fitCoords = [coord];
              if (destination) fitCoords.push(destination);
              if (currentLocation && useDeviceAsSource) fitCoords.push(currentLocation);
              mapRef.current.fitToCoordinates(fitCoords, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 } });
            }
            return;
          }
          setDestination(coord);
          if (currentLocation && mapRef.current) {
            mapRef.current.fitToCoordinates([currentLocation, coord], {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            });
          }
        }}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={
          currentLocation
            ? {
                ...currentLocation,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : {
                latitude: 37.78825,
                longitude: -122.4324,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
        }
      >
        {/* Source marker: device or manual */}
        {useDeviceAsSource && currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Source (Device)"
            pinColor="blue"
            identifier="source-device"
          />
        )}
        {!useDeviceAsSource && manualSource && (
          <Marker
            coordinate={manualSource}
            title="Source (Manual)"
            pinColor="purple"
            draggable
            onDragEnd={(e) => setManualSource(e.nativeEvent.coordinate)}
          />
        )}
        
        {destination && (
          <Marker
            coordinate={destination}
            title="Destination"
            pinColor="red"
            draggable
            onDragEnd={(e) => {
              const coord = e.nativeEvent.coordinate;
              setDestination(coord);
            }}
          />
        )}

        {/* Exploration POIs */}
        {explorePOIs.map((poi, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: poi.position.lat,
              longitude: poi.position.lon,
            }}
            title={poi.poi?.name || 'Point of Interest'}
            description={poi.address?.freeformAddress}
            pinColor="green"
          />
        ))}

        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007AFF"
            strokeWidth={4}
          />
        )}

        {/* Incident Markers - Heatmap Style */}
        {incidents.map((incident, index) => {
          // defensive: ensure we have numeric coords
          const lat = incident?.location?.latitude ?? incident?.location?.lat;
          const lng = incident?.location?.longitude ?? incident?.location?.lon ?? incident?.location?.lng;
          if (lat == null || lng == null) {
            console.warn('Skipping incident with missing location:', incident);
            return null;
          }
          const coord = { latitude: Number(lat), longitude: Number(lng) };

          return (
          <Marker
            key={incident._id ?? `incident-${index}`}
            coordinate={coord}
            title={incident.title}
            description={incident.description}
            pinColor={getSeverityColor(incident.severity)}
            zIndex={100}
            tracksViewChanges={false}
            onPress={() => setSelectedIncident(incident)}
          >
            {/* keep marker simple; open modal onPress to show full incident card */}
          </Marker>
          );
        })}
      </MapView>

      {/* Incident detail modal (opens when marker pressed) */}
      <Modal
        visible={!!selectedIncident}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedIncident(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          {selectedIncident && (
            <View style={{ width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 10 }}>
              {selectedIncident.imageUrl ? (
                <Image source={{ uri: selectedIncident.imageUrl }} style={{ width: '100%', height: 180, resizeMode: 'cover' }} />
              ) : null}
              <View style={{ padding: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>{selectedIncident.title}</Text>
                <Text style={{ color: '#444', marginBottom: 8 }}>{selectedIncident.description}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, color: '#666' }}>Category: {selectedIncident.category}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: getSeverityColor(selectedIncident.severity) }}>
                    {selectedIncident.severity?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <TouchableOpacity
                    onPress={async () => { await verifyIncident(selectedIncident._id); setSelectedIncident(null); }}
                    style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#34C759', borderRadius: 8 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Verify</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedIncident(null)}
                    style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#ddd', borderRadius: 8 }}
                  >
                    <Text style={{ color: '#333', fontWeight: '700' }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Small helper: destination selection */}
      <View style={styles.destinationHint}>
        <Text style={styles.hintText}>
          {settingSourceMode ? 'Tap map to set source location' : 'Tap the map to set your destination. Drag the red pin to fine-tune.'}
        </Text>

        {/* Toggle source mode */}
        <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity
            style={{ marginRight: 8 }}
            onPress={() => {
              // toggle between using device location and manual source
              if (useDeviceAsSource) {
                // switch to manual: enable setting mode
                setSettingSourceMode(true);
                setUseDeviceAsSource(false);
                Alert.alert('Set source', 'Tap the map to set a manual source location.');
              } else {
                // revert to device location
                setUseDeviceAsSource(true);
                setManualSource(null);
                setSettingSourceMode(false);
                Alert.alert('Using device location as source');
              }
            }}
          >
            <Text style={{ color: '#007AFF', fontWeight: '600' }}>
              {useDeviceAsSource ? 'Set source manually' : 'Use device as source'}
            </Text>
          </TouchableOpacity>
          {!useDeviceAsSource && (
            <TouchableOpacity onPress={() => { setSettingSourceMode(true); Alert.alert('Set source', 'Tap the map to set a manual source location.'); }}>
              <Text style={{ color: '#007AFF' }}>Set source</Text>
            </TouchableOpacity>
          )}
        </View>

        {destination && (
          <TouchableOpacity style={styles.clearButton} onPress={() => setDestination(null)}>
            <Text style={styles.clearText}>Clear destination</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tracking Controls - only show Start Navigation if using device as source */}
      {selectedRoute && !isTracking && useDeviceAsSource && (
        <View style={styles.trackingContainer}>
          <TouchableOpacity style={styles.startButton} onPress={startTracking}>
            <Text style={styles.buttonText}>Start Navigation</Text>
          </TouchableOpacity>

          {/* See Walking Experience button */}
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: '#0066CC', marginTop: 8 }]}
            onPress={() => {
              if (isSVRoadRoute(selectedRoute)) openExperience();
              else Alert.alert('Walking experience', 'Walking experience coming soon for this route.');
            }}
          >
            <Text style={styles.buttonText}>See Walking Experience</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* See Walking Experience button - always show if route selected and NOT using device as source */}
      {selectedRoute && !isTracking && !useDeviceAsSource && (
        <View style={styles.trackingContainer}>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: '#0066CC' }]}
            onPress={() => {
              if (isSVRoadRoute(selectedRoute)) openExperience();
              else Alert.alert('Walking experience', 'Walking experience coming soon for this route.');
            }}
          >
            <Text style={styles.buttonText}>See Walking Experience</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Experience modal - show embed for SV Road, placeholder otherwise */}
      <Modal visible={showExperienceModal} animationType="slide" onRequestClose={() => setShowExperienceModal(false)}>
        <View style={{ flex: 1 }}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: '#fff' }}>
            <TouchableOpacity onPress={() => setShowExperienceModal(false)}>
              <Text style={{ color: '#007AFF', fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
            <Text style={{ fontWeight: '700' }}>Walking Experience</Text>
            <View style={{ width: 48 }} />
          </View>

          {selectedRoute && isSVRoadRoute(selectedRoute) ? (
            // Show Mapillary embeds for SV Road
            <>
              <WebView
                originWhitelist={['*']}
                source={{
                  html: `<html><head><meta name="viewport" content="initial-scale=1.0"/></head><body style="margin:0;padding:0;">` +
                        `<iframe src="${mapillaryEmbeds[experienceIndex]}" style="border:0;width:100%;height:100vh;"></iframe>` +
                        `</body></html>`
                }}
                style={{ flex: 1 }}
                allowsInlineMediaPlayback
              />

              <View style={{ height: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, backgroundColor: '#fff' }}>
                <TouchableOpacity onPress={prevExperience} disabled={experienceIndex === 0}>
                  <Text style={{ color: experienceIndex === 0 ? '#aaa' : '#007AFF', fontWeight: '600' }}>Prev</Text>
                </TouchableOpacity>
                <Text style={{ fontWeight: '600' }}>{experienceIndex + 1} / {mapillaryEmbeds.length}</Text>
                <TouchableOpacity onPress={nextExperience} disabled={experienceIndex === mapillaryEmbeds.length - 1}>
                  <Text style={{ color: experienceIndex === mapillaryEmbeds.length - 1 ? '#aaa' : '#007AFF', fontWeight: '600' }}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Show "coming soon" placeholder for non-SV Road routes
            <WebView
              originWhitelist={['*']}
              source={{
                html: `<html><head><meta name="viewport" content="initial-scale=1.0"/></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;"><div style="text-align:center;font-family:sans-serif;"><h2 style="color:#333;">Walking Experience Coming Soon</h2><p style="color:#666;">Street-level imagery is not yet available for this route.</p></div></body></html>`
              }}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Modal>

      {/* Route Planning Form */}
      {showRouteForm && (
        <View style={styles.formContainer}>
          <Text style={styles.title}>Plan Your Safe Walk</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Purpose (e.g., exercise, shopping, sightseeing)"
            value={purpose}
            onChangeText={setPurpose}
          />
          
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Route Type:</Text>
            <Picker
              selectedValue={routeType}
              onValueChange={setRouteType}
              style={styles.picker}
            >
              <Picker.Item label="Safest" value="safest" />
              <Picker.Item label="Fastest" value="fastest" />
              <Picker.Item label="Balanced" value="balanced" />
            </Picker>
          </View>
          
          <TouchableOpacity
            style={styles.button}
            onPress={calculateRoutes}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Calculating...' : 'Find Routes'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Route Options */}
      {routes.length > 0 && (
        <ScrollView style={styles.routeContainer}>
          <Text style={styles.title}>Route Options</Text>
          {routes.map((route, index) => (
            <View key={index} style={[styles.routeCard, selectedRoute === route && styles.selectedRouteCard]}>
              <TouchableOpacity onPress={() => selectRoute(route)}>
                <Text style={styles.routeTitle}>Route {index + 1}</Text>
                <Text style={styles.routeInfo}>Distance: {(route.lengthInMeters / 1000).toFixed(1)} km</Text>
                <Text style={styles.routeInfo}>Duration: {Math.round(route.travelTimeInSeconds / 60)} min</Text>
                <Text style={styles.routeInfo}>Safety Score: {route.safetyScore}/100</Text>
                {route.walkabilityScore && <Text style={styles.routeInfo}>Walkability: {route.walkabilityScore}/100</Text>}
                
                {/* New: Predictive Safety display */}
                {route.predictiveSafety && (
                  <View style={{ marginTop: 8, padding: 8, backgroundColor: '#fff', borderRadius: 6 }}>
                    <Text style={{ fontWeight: '700' }}>Predictive Safety</Text>
                    <Text>Now: {route.predictiveSafety.now}/100</Text>
                    <Text>In 30 min: {route.predictiveSafety.in30Min}/100</Text>
                    <Text>After 22:00: {route.predictiveSafety.after22}/100</Text>
                    {/* {route.predictiveSafety.explanation && (
                      <Text style={{ color: '#666', marginTop: 6, fontSize: 12 }}>{route.predictiveSafety.explanation}</Text>
                    )} */}
                  </View>
                )}

                {route.commentary && <Text style={styles.commentary}>{route.commentary}</Text>}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.button, { flex: 1, marginRight: 8, backgroundColor: useDeviceAsSource ? '#34C759' : '#AAA' }]}
                  onPress={async () => {
                    await selectRoute(route);
                    if (!useDeviceAsSource) {
                      Alert.alert('Navigation unavailable', 'Switch to "Use device as source" to start navigation.');
                      return;
                    }
                    await startTracking();
                  }}
                  disabled={!useDeviceAsSource}
                >
                  <Text style={styles.buttonText}>Start Navigation</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, { flex: 1, marginLeft: 8, backgroundColor: '#0066CC' }]}
                  onPress={async () => {
                    await selectRoute(route);
                    if (isSVRoadRoute(route)) openExperience();
                    else Alert.alert('Walking experience', 'Walking experience coming soon for this route.');
                  }}
                >
                  <Text style={styles.buttonText}>View Experience</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          <TouchableOpacity style={styles.button} onPress={resetPlanning}>
            <Text style={styles.buttonText}>Plan New Route</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Tracking Info */}
      {isTracking && (
        <View style={styles.trackingInfo}>
          <Text style={styles.trackingText}>
            Distance Remaining: {(distanceRemaining / 1000).toFixed(1)} km
          </Text>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={() => {
              setIsTracking(false);
              if (watchIdRef.current) {
                watchIdRef.current.remove();
                watchIdRef.current = null;
              }
            }}
          >
            <Text style={styles.buttonText}>Stop Navigation</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  destinationHint: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 20,      // raised so it's above the form on Android
    zIndex: 9999,       // ensure it's on top (iOS / general)
  },
  hintText: {
    fontSize: 13,
    color: '#333',
  },
  clearButton: {
    marginTop: 6,
    alignSelf: 'center',
  },
  clearText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  formContainer: {
    position: 'absolute',
    top: 110,           // moved down so it doesn't cover the manual source hint
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,          // keep form below the destinationHint
  },
  routeContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.4,
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  startButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  routeCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRouteCard: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  routeInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  commentary: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#007AFF',
    marginTop: 8,
  },
  trackingContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  trackingInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  trackingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MapScreen;