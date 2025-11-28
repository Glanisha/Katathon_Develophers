import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Linking
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../src/api/api';

interface Friend {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  privacy?: {
    shareLiveLocation?: boolean;
  };
  latitude?: number;
  longitude?: number;
  currentRoute?: any;
  friendshipId?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

interface FriendRequest {
  _id: string;
  initiatedBy: User;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  friendId: string;
  sender: 'user' | 'friend';
  text: string;
  timestamp: number;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

const { width, height } = Dimensions.get('window');

export default function Friends() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'map' | 'friends' | 'requests' | 'discover'>('map');

  // Data state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsWithLocation, setFriendsWithLocation] = useState<Friend[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);

  // UI state
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const mapRef = useRef<MapView>(null);
  const chatScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getCurrentLocation();
    loadAllData();

    // Refresh locations every 10 seconds
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load chat history when selected friend changes
  useEffect(() => {
    if (selectedFriend) {
      loadChatHistory(selectedFriend._id);
    }
  }, [selectedFriend]);

  const loadAllData = async () => {
    await Promise.all([
      fetchFriends(),
      fetchFriendsWithLocation(),
      fetchIncomingRequests(),
      fetchAllUsers()
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Get location error:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await api.get('/friends/list');
      const friendsData = response.data.friends || [];
      setFriends(friendsData);
    } catch (error) {
      console.error('Fetch friends error:', error);
    }
  };

  const fetchFriendsWithLocation = async () => {
    try {
      const response = await api.get('/friends/with-location');
      const friendsWithLoc = (response.data.friends || []).map((friend: any) => ({
        ...friend,
        // Generate random locations for demo (in production, backend should provide real coords)
        latitude: friend.latitude || 19.0760 + Math.random() * 0.1,
        longitude: friend.longitude || 72.8777 + Math.random() * 0.1,
      }));
      setFriendsWithLocation(friendsWithLoc);
    } catch (error) {
      console.error('Fetch friends with location error:', error);
    }
  };

  const fetchIncomingRequests = async () => {
    try {
      const response = await api.get('/friends/pending-requests');
      setIncomingRequests(response.data.requests || []);
    } catch (error) {
      console.error('Fetch incoming requests error:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await api.get('/friends/all-users');
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error('Fetch all users error:', error);
    }
  };

  const loadChatHistory = async (friendId: string) => {
    try {
      const key = `chat_${friendId}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        setChatHistory(JSON.parse(stored));
      } else {
        setChatHistory([]);
      }
    } catch (error) {
      console.error('Load chat error:', error);
    }
  };

  const saveChatMessage = async (friendId: string, msg: ChatMessage) => {
    try {
      const key = `chat_${friendId}`;
      const updated = [...chatHistory, msg];
      setChatHistory(updated);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error('Save chat error:', error);
    }
  };

  const sendFriendRequest = async (toUserId: string) => {
    try {
      setLoading(true);
      await api.post('/friends/send-request', { toUserId });
      Alert.alert('Success', 'Friend request sent');
      await fetchAllUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      setLoading(true);
      await api.post(`/friends/accept-request/${requestId}`);
      Alert.alert('Success', 'Friend request accepted');
      await fetchIncomingRequests();
      await fetchFriends();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to accept request');
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      setLoading(true);
      await api.post(`/friends/reject-request/${requestId}`);
      Alert.alert('Success', 'Friend request rejected');
      await fetchIncomingRequests();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      setLoading(true);
      await api.post(`/friends/remove/${friendId}`);
      Alert.alert('Removed', 'Friend removed successfully');
      await fetchFriends();
      setSelectedFriend(null);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to remove friend');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedFriend) return;

    const chatMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      friendId: selectedFriend._id,
      sender: 'user',
      text: message,
      timestamp: Date.now(),
    };

    try {
      await saveChatMessage(selectedFriend._id, chatMsg);
      setMessage('');
      // Auto-scroll to bottom
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const callFriend = async () => {
    if (!selectedFriend?.phone) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }

    try {
      await Linking.openURL(`tel:${selectedFriend.phone}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to open phone dialer');
    }
  };

  const handleMarkerPress = (friend: Friend) => {
    setSelectedFriend(friend);
    if (mapRef.current && friend.latitude && friend.longitude) {
      mapRef.current.animateToRegion({
        latitude: friend.latitude,
        longitude: friend.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  // Tab: Map View
  const MapTab = () => (
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
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : {
                latitude: 19.0760,
                longitude: 72.8777,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
        }
      >
        {friendsWithLocation.map((friend, index) => (
          friend.latitude && friend.longitude && (
            <Marker
              key={`friend_${index}`}
              coordinate={{
                latitude: friend.latitude,
                longitude: friend.longitude,
              }}
              title={friend.displayName || friend.name}
              onPress={() => handleMarkerPress(friend)}
              pinColor="#34C759"
            >
              <Callout>
                <View style={styles.calloutContainer}>
                  {friend.avatarUrl && (
                    <Image
                      source={{ uri: friend.avatarUrl }}
                      style={styles.calloutAvatar}
                    />
                  )}
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.calloutName}>{friend.displayName || friend.name}</Text>
                    {friend.bio && <Text style={styles.calloutBio}>{friend.bio}</Text>}
                    <Text style={styles.calloutStatus}>📍 Sharing Location</Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          )
        ))}
      </MapView>

      {selectedFriend && (
        <View style={styles.friendPanel}>
          <View style={styles.friendHeader}>
            {selectedFriend.avatarUrl && (
              <Image source={{ uri: selectedFriend.avatarUrl }} style={styles.friendAvatar} />
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.friendName}>{selectedFriend.displayName || selectedFriend.name}</Text>
              <Text style={styles.friendStatus}>
                {selectedFriend.privacy?.shareLiveLocation ? '📍 Sharing location' : '🔒 Location hidden'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedFriend(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#34C759' }]}
              onPress={() => setMessageModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>💬 Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#007AFF' }]}
              onPress={callFriend}
            >
              <Text style={styles.actionButtonText}>📞 Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
              onPress={() => removeFriend(selectedFriend._id)}
            >
              <Text style={styles.actionButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.friendsListContainer}>
        <Text style={styles.listTitle}>Friends ({friendsWithLocation.length})</Text>
        <FlatList
          data={friendsWithLocation}
          keyExtractor={(item) => item._id}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.friendItem} onPress={() => handleMarkerPress(item)}>
              {item.avatarUrl && (
                <Image source={{ uri: item.avatarUrl }} style={styles.friendItemAvatar} />
              )}
              <Text style={styles.friendItemName} numberOfLines={1}>
                {item.displayName || item.name}
              </Text>
              {item.privacy?.shareLiveLocation && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );

  // Tab: Friends List
  const FriendsTab = () => (
    <FlatList
      data={friends}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <View style={styles.listItem}>
          {item.avatarUrl && <Image source={{ uri: item.avatarUrl }} style={styles.listAvatar} />}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.listName}>{item.displayName || item.name}</Text>
            {item.email && <Text style={styles.listBio}>{item.email}</Text>}
            {item.phone && <Text style={styles.listStatus}>📱 {item.phone}</Text>}
            <Text style={styles.listStatus}>
              {item.privacy?.shareLiveLocation ? '📍 Sharing location' : '🔒 Private'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => removeFriend(item._id)}>
            <Text style={{ color: '#FF3B30', fontWeight: '600' }}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No friends yet. Send a friend request!</Text>}
    />
  );

  // Tab: Friend Requests
  const RequestsTab = () => (
    <FlatList
      data={incomingRequests}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <View style={styles.listItem}>
          {item.initiatedBy.avatarUrl && (
            <Image source={{ uri: item.initiatedBy.avatarUrl }} style={styles.listAvatar} />
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.listName}>{item.initiatedBy.displayName || item.initiatedBy.name}</Text>
            <Text style={styles.listBio}>{item.initiatedBy.email}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => acceptRequest(item._id)}>
              <Text style={{ color: '#34C759', fontWeight: '600', padding: 8 }}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => rejectRequest(item._id)}>
              <Text style={{ color: '#FF3B30', fontWeight: '600', padding: 8 }}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No pending friend requests</Text>}
    />
  );

  // Tab: Discover Users
  const DiscoverTab = () => {
    const friendIds = friends.map(f => f._id);
    const requestUserIds = incomingRequests.map(r => r.initiatedBy._id);
    const availableUsers = allUsers.filter(
      u => !friendIds.includes(u._id) && !requestUserIds.includes(u._id)
    );

    return (
      <FlatList
        data={availableUsers}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            {item.avatarUrl && <Image source={{ uri: item.avatarUrl }} style={styles.listAvatar} />}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.listName}>{item.displayName || item.name}</Text>
              <Text style={styles.listBio}>{item.email}</Text>
              {item.bio && <Text style={styles.listStatus}>{item.bio}</Text>}
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => sendFriendRequest(item._id)}
              disabled={loading}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No more users to discover</Text>}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests {incomingRequests.length > 0 && `(${incomingRequests.length})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>Discover</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'map' && <MapTab />}
      {activeTab === 'friends' && <FriendsTab />}
      {activeTab === 'requests' && <RequestsTab />}
      {activeTab === 'discover' && <DiscoverTab />}

      {/* Message Modal with Chat History */}
      <Modal
        visible={messageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMessageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Chat with {selectedFriend?.displayName || selectedFriend?.name}
              </Text>
              <TouchableOpacity onPress={() => setMessageModalVisible(false)}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#999' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedFriend?.phone && (
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={callFriend}
              >
                <Text style={styles.phoneButtonText}>📱 Call: {selectedFriend.phone}</Text>
              </TouchableOpacity>
            )}

            <ScrollView
              ref={chatScrollRef}
              style={styles.chatHistory}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {chatHistory.length === 0 ? (
                <Text style={styles.emptyChat}>Start a conversation...</Text>
              ) : (
                chatHistory.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.chatBubble,
                      msg.sender === 'user' ? styles.userBubble : styles.friendBubble
                    ]}
                  >
                    <Text style={styles.chatText}>{msg.text}</Text>
                    <Text style={styles.chatTime}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendMessage}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#007AFF',
  },
  map: {
    flex: 1,
  },
  calloutContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 200,
  },
  calloutAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  calloutName: {
    fontWeight: '600',
    fontSize: 14,
  },
  calloutBio: {
    fontSize: 12,
    color: '#666',
  },
  calloutStatus: {
    fontSize: 11,
    color: '#34C759',
    marginTop: 4,
  },
  friendPanel: {
    position: 'absolute',
    bottom: 100,
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  friendName: {
    fontWeight: '700',
    fontSize: 16,
  },
  friendStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    fontSize: 20,
    fontWeight: '700',
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  friendsListContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  listTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  friendItem: {
    alignItems: 'center',
    marginRight: 12,
    paddingHorizontal: 8,
  },
  friendItemAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
  },
  friendItemName: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 60,
  },
  activeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    marginTop: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  listName: {
    fontWeight: '700',
    fontSize: 14,
  },
  listBio: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  listStatus: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    height: '85%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  phoneButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  phoneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  chatHistory: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyChat: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 14,
  },
  chatBubble: {
    marginVertical: 6,
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    marginRight: 0,
  },
  friendBubble: {
    backgroundColor: '#e5e5ea',
    alignSelf: 'flex-start',
    marginLeft: 0,
  },
  chatText: {
    fontSize: 14,
    color: '#000',
  },
  chatTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#34C759',
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});