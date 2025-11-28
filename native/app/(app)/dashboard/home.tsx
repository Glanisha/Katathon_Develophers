import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../src/api/api';

export default function DashboardHome() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUser();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#71717a" />
          </TouchableOpacity>
        </View>

        {/* Points Card - Add This */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsLeft}>
            <Text style={styles.pointsLabel}>Your Points</Text>
            <Text style={styles.pointsValue}>{user?.points || 0}</Text>
          </View>
          <View style={styles.pointsRight}>
            <Ionicons name="star" size={40} color="#FFD700" />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.primaryCard}
            onPress={() => router.push('/(app)/dashboard/map')}
            activeOpacity={0.8}
          >
            <View style={styles.primaryCardIcon}>
              <Ionicons name="navigate-outline" size={32} color="#ffffff" />
            </View>
            <View style={styles.primaryCardContent}>
              <Text style={styles.primaryCardTitle}>Start Walking</Text>
              <Text style={styles.primaryCardDesc}>Find the safest route to your destination</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="footsteps-outline" size={20} color="#18181b" />
              </View>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Total Walks</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#18181b" />
              </View>
              <Text style={styles.statValue}>--</Text>
              <Text style={styles.statLabel}>Safety Score</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="people-outline" size={20} color="#18181b" />
              </View>
              <Text style={styles.statValue}>{user?.friends?.length || 0}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
          </View>
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinksSection}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          
          <TouchableOpacity 
            style={styles.linkCard}
            onPress={() => router.push('/(app)/dashboard/friends')}
          >
            <View style={styles.linkIcon}>
              <Ionicons name="person-add-outline" size={22} color="#18181b" />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Add Friends</Text>
              <Text style={styles.linkDesc}>Connect with people you trust</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#a1a1aa" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkCard}
            onPress={() => router.push('/(app)/dashboard/report')}
          >
            <View style={styles.linkIcon}>
              <Ionicons name="alert-circle-outline" size={22} color="#18181b" />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Report Incident</Text>
              <Text style={styles.linkDesc}>Help keep community safe</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#a1a1aa" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkCard}
            onPress={() => router.push('/(app)/dashboard/friends')}
          >
            <View style={styles.linkIcon}>
              <Ionicons name="location-outline" size={22} color="#18181b" />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Location Sharing</Text>
              <Text style={styles.linkDesc}>Manage who can see your location</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#a1a1aa" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 14,
    color: '#71717a',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#18181b',
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  pointsCard: {
    backgroundColor: '#FFD70033',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FFD700'
  },
  pointsLeft: {
    flex: 1
  },
  pointsLabel: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 4
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFD700'
  },
  pointsRight: {
    marginLeft: 16
  },
  quickActions: {
    marginBottom: 32,
  },
  primaryCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  primaryCardContent: {
    flex: 1,
  },
  primaryCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  primaryCardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18181b',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#18181b',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#71717a',
  },
  quickLinksSection: {
    marginBottom: 24,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#18181b',
    marginBottom: 2,
  },
  linkDesc: {
    fontSize: 13,
    color: '#71717a',
  },
});