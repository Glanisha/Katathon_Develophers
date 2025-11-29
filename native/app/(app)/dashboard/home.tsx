import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  Modal,
  FlatList,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../src/api/api';
import translationService from '../../../src/services/translation';

export default function DashboardHome() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  // translation state
  const [locale, setLocale] = useState<string>('en');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    loadUser();
    loadLocale();
    loadLeaderboard();
  }, []);

  const loadLocale = async () => {
    try {
      const l = await AsyncStorage.getItem('app_locale');
      if (l) {
        setLocale(l);
        // pre-translate visible strings for the saved locale (if not english)
        if (l !== 'en') await applyTranslations(l);
      }
    } catch (e) {
      // ignore
    }
  };

  const loadUser = async () => {
    try {
      // load cached user first so UI is responsive
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        console.log('Loaded cached user, points:', parsed?.points);
      }

      // try to get freshest profile from backend (token must be set on api client)
      try {
        // try common endpoints; adjust if your backend uses a different route
        const resp = await api.get('/auth/me').catch(() => api.get('/users/me'));
        const fresh = resp?.data?.user ?? resp?.data;
        if (fresh) {
          setUser(fresh);
          await AsyncStorage.setItem('user', JSON.stringify(fresh));
          console.log('Fetched fresh user, points:', fresh?.points);
        }
      } catch (apiErr) {
        console.warn('Could not fetch fresh profile (still using cached):',  apiErr);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadLeaderboard = async () => {
    setStatsLoading(true);
    try {
      const response = await api.get('/map/leaderboard?period=month');
      setLeaderboardData(response.data);
      console.log('Leaderboard data:', response.data);
    } catch (error) {
      console.warn('Failed to load leaderboard:', error);
      setLeaderboardData(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUser();
    await loadLeaderboard();
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

  // Helper to get display values with fallbacks
  const getStatValue = (key: string) => {
    if (statsLoading) return '...';
    if (!leaderboardData?.currentUser) return '0';
    
    switch (key) {
      case 'totalWalks':
        return leaderboardData.currentUser.totalWalks.toString();
      case 'avgSafetyScore':
        return leaderboardData.currentUser.avgSafetyScore > 0 
          ? leaderboardData.currentUser.avgSafetyScore.toString() 
          : '--';
      case 'friendsCount':
        return leaderboardData.friendsCount.toString();
      default:
        return '0';
    }
  };

  const UI_STRINGS: Record<string, string> = {
    welcomeBack: 'Welcome back,',
    userNameFallback: 'User',
    yourPoints: 'Your Points',
    monthlyLeaderboard: 'Monthly Leaderboard',
    youAreRanked: "You're ranked",
    ofFriends: 'of friends',
    walks: 'walks',
    startWalkingTitle: 'Start Walking',
    startWalkingDesc: 'Find the safest route to your destination',
    yourStats: 'Your Stats',
    totalWalks: 'Total Walks',
    safetyScore: 'Avg Safety',
    friends: 'Friends',
    quickLinks: 'Quick Links',
    addFriends: 'Add Friends',
    reportIncident: 'Report Incident',
    locationSharing: 'Location Sharing'
  };

  const applyTranslations = async (targetLang: string) => {
    if (targetLang === 'en') {
      setTranslations({});
      setLocale('en');
      await AsyncStorage.setItem('app_locale', 'en');
      return;
    }
    try {
      setTranslating(true);
      const translated = await translationService.translateStrings(UI_STRINGS, targetLang);
      setTranslations(translated);
      setLocale(targetLang);
      await AsyncStorage.setItem('app_locale', targetLang);
    } catch (e) {
      console.warn('Translation failed', e);
    } finally {
      setTranslating(false);
    }
  };

  const LANGS = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
    { code: 'es', label: 'Español (Spanish)' },
    { code: 'fr', label: 'Français (French)' },
  ];

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
            <Text style={styles.greeting}>{translations.welcomeBack || 'Welcome back,'}</Text>
            <Text style={styles.userName}>{user?.name || (translations.userNameFallback || 'User')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Translate button */}
            <TouchableOpacity style={[styles.profileButton, { marginRight: 8 }]} onPress={() => setLangModalVisible(true)}>
              <Ionicons name="language-outline" size={20} color="#71717a" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
               <Ionicons name="log-out-outline" size={24} color="#71717a" />
            </TouchableOpacity>
          </View>
         </View>

         {/* Points Card - Add This */}
         <View style={styles.pointsCard}>
           <View style={styles.pointsLeft}>
            <Text style={styles.pointsLabel}>{translations.yourPoints || 'Your Points'}</Text>
             <Text style={styles.pointsValue}>{user?.points || 0}</Text>
           </View>
           <View style={styles.pointsRight}>
             <Ionicons name="star" size={40} color="#FFD700" />
           </View>
         </View>

         {/* Monthly Leaderboard Card */}
         {leaderboardData && leaderboardData.leaderboard.length > 0 && (
           <View style={styles.leaderboardCard}>
             <View style={styles.leaderboardHeader}>
               <Text style={styles.leaderboardTitle}>{translations.monthlyLeaderboard || 'Monthly Leaderboard'}</Text>
               <Text style={styles.leaderboardSubtitle}>
                 {translations.youAreRanked || "You're"} #{leaderboardData.currentUser.rank} {translations.ofFriends || 'of'} {'3'}
               </Text>
             </View>
             <View style={styles.leaderboardList}>
               {leaderboardData.leaderboard.slice(0, 3).map((person: any, index: number) => (
                 <View key={person.userId} style={[styles.leaderboardItem, person.isCurrentUser && styles.currentUserItem]}>
                   <View style={[styles.leaderboardRank, person.rank === 1 && styles.firstPlaceRank]}>
                     <Text style={[styles.rankText, person.rank === 1 && styles.firstPlaceText]}>#{person.rank}</Text>
                   </View>
                   <View style={styles.leaderboardInfo}>
                     <Text style={[styles.leaderboardName, person.isCurrentUser && { fontWeight: '700', color: '#007AFF' }]}>
                       {person.isCurrentUser ? 'You' : person.name}
                     </Text>
                     <Text style={styles.leaderboardStats}>
                       {person.totalWalks} {translations.walks || 'walks'} • {person.totalDistanceKm}km
                     </Text>
                   </View>
                   {person.rank === 1 && <Text style={styles.crownEmoji}>👑</Text>}
                   {person.rank === 2 && <Text style={styles.medalEmoji}>🥈</Text>}
                   {person.rank === 3 && <Text style={styles.medalEmoji}>🥉</Text>}
                 </View>
               ))}
             </View>
             
             {/* View All Button */}
             {leaderboardData.leaderboard.length > 3 && (
               <TouchableOpacity style={styles.viewAllButton} onPress={() => {/* Navigate to full leaderboard */}}>
                 <Text style={styles.viewAllText}>View All ({leaderboardData.leaderboard.length})</Text>
                 <Ionicons name="chevron-forward" size={16} color="#007AFF" />
               </TouchableOpacity>
             )}
           </View>
         )}

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
              <Text style={styles.primaryCardTitle}>{translations.startWalkingTitle || 'Start Walking'}</Text>
              <Text style={styles.primaryCardDesc}>{translations.startWalkingDesc || 'Find the safest route to your destination'}</Text>
             </View>
             <Ionicons name="chevron-forward" size={24} color="#ffffff" />
           </TouchableOpacity>
         </View>

         {/* Stats */}
         <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>{translations.yourStats || 'Your Stats'}</Text>
           <View style={styles.statsRow}>
             <View style={styles.statCard}>
               <View style={styles.statIcon}>
                 <Ionicons name="footsteps-outline" size={20} color="#18181b" />
               </View>
               <Text style={styles.statValue}>{getStatValue('totalWalks')}</Text>
              <Text style={styles.statLabel}>{translations.totalWalks || 'Total Walks'}</Text>
             </View>
             <View style={styles.statCard}>
               <View style={styles.statIcon}>
                 <Ionicons name="shield-checkmark-outline" size={20} color="#18181b" />
               </View>
               <Text style={styles.statValue}>{getStatValue('avgSafetyScore')}</Text>
              <Text style={styles.statLabel}>{translations.safetyScore || 'Avg Safety'}</Text>
             </View>
             <View style={styles.statCard}>
               <View style={styles.statIcon}>
                 <Ionicons name="people-outline" size={20} color="#18181b" />
               </View>
               <Text style={styles.statValue}>{getStatValue('friendsCount')}</Text>
              <Text style={styles.statLabel}>{translations.friends || 'Friends'}</Text>
             </View>
           </View>
         </View>

         {/* Quick Links */}
         <View style={styles.quickLinksSection}>
          <Text style={styles.sectionTitle}>{translations.quickLinks || 'Quick Links'}</Text>
           
           <TouchableOpacity 
             style={styles.linkCard}
             onPress={() => router.push('/(app)/dashboard/friends')}
           >
             <View style={styles.linkIcon}>
               <Ionicons name="person-add-outline" size={22} color="#18181b" />
             </View>
             <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>{translations.addFriends || 'Add Friends'}</Text>
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
              <Text style={styles.linkTitle}>{translations.reportIncident || 'Report Incident'}</Text>
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
              <Text style={styles.linkTitle}>{translations.locationSharing || 'Location Sharing'}</Text>
              <Text style={styles.linkDesc}>Manage who can see your location</Text>
             </View>
             <Ionicons name="chevron-forward" size={20} color="#a1a1aa" />
           </TouchableOpacity>
         </View>
       </ScrollView>

      {/* Language picker modal */}
      <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' }}>
          <View style={{ margin: 20, backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Select language</Text>
            {translating && <ActivityIndicator size="small" />}
            <FlatList
              data={LANGS}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <Pressable
                  onPress={async () => {
                    setLangModalVisible(false);
                    await applyTranslations(item.code);
                  }}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}
                >
                  <Text style={{ fontSize: 15 }}>{item.label}</Text>
                </Pressable>
              )}
            />
            <TouchableOpacity onPress={() => { setLangModalVisible(false); }} style={{ marginTop: 12, alignSelf: 'flex-end' }}>
              <Text style={{ color: '#007AFF', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    flex: 1,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#B8860B',
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#B8860B',
  },
  pointsRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  leaderboardHeader: {
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18181b',
    marginBottom: 4,
  },
  leaderboardSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  leaderboardList: {
    gap: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  currentUserItem: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  leaderboardRank: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  firstPlaceRank: {
    backgroundColor: '#fef3c7',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  firstPlaceText: {
    color: '#d97706',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#18181b',
    marginBottom: 2,
  },
  leaderboardStats: {
    fontSize: 12,
    color: '#64748b',
  },
  crownEmoji: {
    fontSize: 18,
  },
  medalEmoji: {
    fontSize: 16,
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
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  viewAllText: {
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 4,
  },
});