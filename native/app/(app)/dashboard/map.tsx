import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import api from '../../../src/api/api';

const { width, height } = Dimensions.get('window');

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Route {
  id: string;
  safetyScore: number;
  lengthInMeters: number;
  travelTimeInSeconds: number;
  walkabilityScore: number;
  suggestions?: any;
  commentary?: string;
  legs: Array<{
    points: Array<{
      latitude: number;
      longitude: number;
    }>;
  }>;
}

const MapScreen = () => {
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [purpose, setPurpose] = useState('');
  const [routeType, setRouteType] = useState<'safest' | 'fastest' | 'balanced'>('safest');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [savedRouteId, setSavedRouteId] = useState<string | null>(null);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(0);
  const [explorePOIs, setExplorePOIs] = useState<any[]>([]);
  const [showRouteForm, setShowRouteForm] = useState(true);
  const [destinationInput, setDestinationInput] = useState('');
  const [loading, setLoading] = useState(false);

  const mapRef = useRef<MapView>(null);
  const watchIdRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    getCurrentLocation();
    return () => {
      if (watchIdRef.current) {
        watchIdRef.current.remove();
      }
    };
  }, []);

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

  const calculateRoutes = async () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Current location not available');
      return;
    }

    setLoading(true);
    try {
      const requestData: any = {
        origin: {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude
        },
        preferences: {
          routeType,
          purpose: purpose.trim() || undefined
        }
      };

      // Add destination if provided
      if (destination) {
        requestData.destination = {
          lat: destination.latitude,
          lng: destination.longitude
        };
      }

      const response = await api.post('/map/calculate-route', requestData);
      
      if (response.data.explorePOIs) {
        // Exploration mode - no destination provided
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
      Alert.alert('Error', error.response?.data?.error || 'Failed to calculate routes');
    } finally {
      setLoading(false);
    }
  };

  const selectRoute = async (route: Route) => {
    setSelectedRoute(route);
    
    try {
      // Save route to backend
      const response = await api.post('/map/save-route', {
        routeData: route,
        preferences: { purpose, routeType }
      });
      
      setSavedRouteId(response.data.savedRoute._id);
      setDistanceRemaining(route.lengthInMeters);
      
      // Fit map to route
      if (mapRef.current && route.legs.length > 0) {
        const coordinates = route.legs.flatMap(leg => leg.points);
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 250, left: 50 },
        });
      }
    } catch (error: any) {
      console.error('Save route error:', error);
      Alert.alert('Error', 'Failed to save route');
    }
  };

  const startTracking = async () => {
    if (!savedRouteId || !selectedRoute) {
      Alert.alert('Error', 'No route selected');
      return;
    }

    try {
      await api.post('/map/start-tracking', { routeId: savedRouteId });
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

      await api.post('/map/update-progress', {
        routeId: savedRouteId,
        currentLocation: {
          lat: location.latitude,
          lng: location.longitude
        },
        distanceRemaining: distance
      });

      // Check if destination reached
      if (distance < 50) {
        setIsTracking(false);
        if (watchIdRef.current) {
          Location.watchPositionAsync({ accuracy: Location.Accuracy.High }, () => {}).then(watcher => {
            watcher.remove();
          });
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
    setDestinationInput('');
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
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
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            pinColor="blue"
          />
        )}
        
        {destination && (
          <Marker
            coordinate={destination}
            title="Destination"
            pinColor="red"
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
      </MapView>

      {/* Route Planning Form */}
      {showRouteForm && (
        <View style={styles.formContainer}>
          <Text style={styles.title}>Plan Your Safe Walk</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Destination (optional for exploration)"
            value={destinationInput}
            onChangeText={setDestinationInput}
            onSubmitEditing={() => searchLocation(destinationInput)}
          />
          
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
            <TouchableOpacity
              key={index}
              style={[
                styles.routeCard,
                selectedRoute === route && styles.selectedRouteCard
              ]}
              onPress={() => selectRoute(route)}
            >
              <Text style={styles.routeTitle}>Route {index + 1}</Text>
              <Text style={styles.routeInfo}>
                Distance: {(route.lengthInMeters / 1000).toFixed(1)} km
              </Text>
              <Text style={styles.routeInfo}>
                Duration: {Math.round(route.travelTimeInSeconds / 60)} min
              </Text>
              <Text style={styles.routeInfo}>
                Safety Score: {route.safetyScore}/100
              </Text>
              {route.walkabilityScore && (
                <Text style={styles.routeInfo}>
                  Walkability: {route.walkabilityScore}/100
                </Text>
              )}
              {route.commentary && (
                <Text style={styles.commentary}>{route.commentary}</Text>
              )}
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.button} onPress={resetPlanning}>
            <Text style={styles.buttonText}>Plan New Route</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Tracking Controls */}
      {selectedRoute && !isTracking && (
        <View style={styles.trackingContainer}>
          <TouchableOpacity style={styles.startButton} onPress={startTracking}>
            <Text style={styles.buttonText}>Start Navigation</Text>
          </TouchableOpacity>
        </View>
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
  formContainer: {
    position: 'absolute',
    top: 50,
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