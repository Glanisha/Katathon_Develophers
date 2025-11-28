import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  ActivityIndicator,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../src/api/api';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';

export default function Alerts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [settings, setSettings] = useState({
    sendOnLowBattery: true,
    sendOnAccidentDetected: true,
    sendOnUnsafePath: true,
    allowCalls: false
  });
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadContacts();
    loadSettings();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/emergency-contacts');
      setContacts(resp.data.contacts || []);
    } catch (err) {
      console.warn('Failed to load emergency contacts:', err);
      // fall back to local cache if any
      const cached = await AsyncStorage.getItem('emergency_contacts');
      if (cached) setContacts(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const raw = await AsyncStorage.getItem('alerts_settings');
    if (raw) setSettings(JSON.parse(raw));
  };

  const saveSettings = async (next: any) => {
    setSettings(next);
    await AsyncStorage.setItem('alerts_settings', JSON.stringify(next));
  };

  const addContact = async () => {
    if (!name.trim() || !phone.trim() || !relation.trim()) {
      Alert.alert('Validation', 'Please fill name, phone and relation.');
      return;
    }
    setAdding(true);
    try {
      const resp = await api.post('/emergency-contacts', { name: name.trim(), phone: phone.trim(), relation: relation.trim() });
      const created = resp.data.contact;
      const updated = [created, ...contacts];
      setContacts(updated);
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
      setName(''); setPhone(''); setRelation('');
      setModalVisible(false);
    } catch (err) {
      console.error('Add contact error:', err);
      Alert.alert('Error',  'Failed to add contact');
    } finally {
      setAdding(false);
    }
  };

  const removeContact = async (id: string) => {
    Alert.alert('Confirm', 'Remove this contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/emergency-contacts/${id}`);
            const updated = contacts.filter(c => c._id !== id);
            setContacts(updated);
            await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
          } catch (err) {
            console.error('Remove contact error:', err);
            Alert.alert('Error', 'Failed to remove contact');
          }
        }
      }
    ]);
  };

  // send immediate alert to emergency contacts via backend
  const sendImmediateAlert = async (reason = 'manual') => {
    setLoading(true);
    try {
      // include current location and battery level if available
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }).catch(() => null);
      const batteryLevel = Platform.OS ? await Battery.getBatteryLevelAsync().catch(() => null) : null;

      const payload = {
        reason, // 'manual' | 'battery_low' | 'accident' | 'unsafe_path'
        location: loc ? { latitude: loc.coords.latitude, longitude: loc.coords.longitude } : undefined,
        batteryLevel: batteryLevel != null ? Math.round((batteryLevel as number) * 100) : undefined,
        settings
      };

      await api.post('/emergency/alert', payload);
      Alert.alert('Alert sent', 'Emergency contacts notified');
    } catch (err) {
      console.error('Send alert error:', err);
      Alert.alert('Error',   'Failed to send alert');
    } finally {
      setLoading(false);
    }
  };

  // UI helpers to toggle settings
  const toggleSetting = async (key: keyof typeof settings) => {
    const next = { ...settings, [key]: !settings[key] };
    await saveSettings(next);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Contacts</Text>

      <View style={styles.settings}>
        <Text style={styles.settingsTitle}>Alert triggers</Text>

        <View style={styles.row}>
          <Text>Low battery while navigating</Text>
          <Switch value={settings.sendOnLowBattery} onValueChange={() => toggleSetting('sendOnLowBattery')} />
        </View>

        <View style={styles.row}>
          <Text>Accident / impact detected</Text>
          <Switch value={settings.sendOnAccidentDetected} onValueChange={() => toggleSetting('sendOnAccidentDetected')} />
        </View>

        <View style={styles.row}>
          <Text>Unsafe route warning</Text>
          <Switch value={settings.sendOnUnsafePath} onValueChange={() => toggleSetting('sendOnUnsafePath')} />
        </View>

        <View style={styles.row}>
          <Text>Allow outgoing calls (Twilio)</Text>
          <Switch value={settings.allowCalls} onValueChange={() => toggleSetting('allowCalls')} />
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#FF3B30' }]} onPress={() => sendImmediateAlert('manual')} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Emergency Alert</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, { backgroundColor: '#007AFF' }]} onPress={() => setModalVisible(true)}>
          <Text style={styles.btnText}>Add Contact</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subTitle}>Contacts ({contacts.length})</Text>

      {loading && contacts.length === 0 ? <ActivityIndicator /> : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item._id || item.phone}
          renderItem={({ item }) => (
            <View style={styles.contactRow}>
              <View>
                <Text style={styles.contactName}>{item.name} • {item.relation}</Text>
                <Text style={styles.contactPhone}>{item.phone}</Text>
              </View>
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeContact(item._id)}>
                <Text style={{ color: '#FF3B30' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No emergency contacts yet.</Text>}
        />
      )}

      {/* Add contact modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>
            <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
            <TextInput placeholder="Phone (include country code)" value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />
            <TextInput placeholder="Relation (e.g., spouse, parent)" value={relation} onChangeText={setRelation} style={styles.input} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: 8 }]} onPress={addContact} disabled={adding}>
                {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: '#ccc' }]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.btnText, { color: '#333' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  subTitle: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  settings: { marginBottom: 12, padding: 12, backgroundColor: '#f8f8f8', borderRadius: 8 },
  settingsTitle: { fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center', flex: 1, marginHorizontal: 4, backgroundColor: '#007AFF' },
  btnText: { color: '#fff', fontWeight: '700' },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  contactName: { fontWeight: '700' },
  contactPhone: { color: '#666', marginTop: 4 },
  removeBtn: { justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#999', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontWeight: '700', fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 10 }
});