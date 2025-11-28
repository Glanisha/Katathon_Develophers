import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/api/api';

const { width } = Dimensions.get('window');

const INCIDENT_CATEGORIES = [
  { label: 'Select Category', value: '' },
  { label: 'Accident', value: 'accident' },
  { label: 'Riot', value: 'riot' },
  { label: 'Pothole', value: 'pothole' },
  { label: 'Flooding', value: 'flooding' },
  { label: 'Structural Damage', value: 'structural_damage' },
  { label: 'Debris', value: 'debris' },
  { label: 'Other', value: 'other' }
];

export default function Report() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const USE_HARDCODED_LOCATION = true; // set to false to use device location again
  const HARDCODED_LOCATION = { latitude: 19.088, longitude: 72.865 }; // example Mumbai coords (not your place)

  const getCurrentLocation = async () => {
    try {
      if (USE_HARDCODED_LOCATION) {
        setLocation(HARDCODED_LOCATION);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission required for incident reporting');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get location');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const submitReport = async () => {
    if (!title.trim() || !description.trim() || !category || !image || !location) {
      Alert.alert('Error', 'Please fill all fields and take an image');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('location', JSON.stringify(location));
      
      // Append image as binary
      formData.append('image', {
        uri: image,
        type: 'image/jpeg',
        name: 'incident.jpg'
      } as any);

      const response = await api.post('/incidents/report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setPointsEarned(response.data.pointsEarned);
      setSubmitted(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        resetForm();
        setSubmitted(false);
      }, 3000);

    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setImage(null);
    setPointsEarned(0);
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#34C759" />
          <Text style={styles.successTitle}>Report Submitted!</Text>
          <Text style={styles.successSubtitle}>
            Thank you for helping keep our community safe.
          </Text>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>+{pointsEarned} Points</Text>
          </View>
          <Text style={styles.successDesc}>
            Our AI system has analyzed your report and it will be visible on the community map.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Report an Incident</Text>
          <Text style={styles.subtitle}>Help keep our community safe</Text>
        </View>

        {/* Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo</Text>
          {image ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setImage(null)}
              >
                <Ionicons name="close-circle" size={30} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
              <Ionicons name="camera" size={40} color="#007AFF" />
              <Text style={styles.cameraButtonText}>Take Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Incident Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Road accident on Main Street"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Category Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={styles.picker}
            >
              {INCIDENT_CATEGORIES.map(cat => (
                <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe what happened in detail..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Location Section */}
        {location && (
          <View style={styles.section}>
            <Text style={styles.label}>📍 Location</Text>
            <View style={styles.locationBox}>
              <Text style={styles.locationText}>
                Lat: {location.latitude.toFixed(4)}
              </Text>
              <Text style={styles.locationText}>
                Lng: {location.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={submitReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Your report will be analyzed by our AI system and visible to the community. Accurate reports earn you points!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  scrollView: {
    padding: 20
  },
  header: {
    marginBottom: 30,
    marginTop: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#18181b',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18181b',
    marginBottom: 12
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181b',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#fafafa'
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12
  },
  charCount: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 4,
    textAlign: 'right'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 10,
    backgroundColor: '#fafafa',
    overflow: 'hidden'
  },
  picker: {
    height: 50
  },
  cameraButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 10,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff'
  },
  cameraButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden'
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 10
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8
  },
  locationBox: {
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  locationText: {
    fontSize: 12,
    color: '#18181b',
    marginBottom: 4,
    fontFamily: 'monospace'
  },
  submitButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  infoBox: {
    backgroundColor: '#f0f7ff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 30,
    flexDirection: 'row',
    gap: 10
  },
  infoText: {
    fontSize: 13,
    color: '#18181b',
    flex: 1,
    lineHeight: 18
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#18181b',
    marginTop: 16,
    marginBottom: 8
  },
  successSubtitle: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 20
  },
  pointsBadge: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 20
  },
  pointsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  successDesc: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 18
  }
});