import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import ElevenLabsAgent from '../../../components/ElevenLabsAgent';

export default function DashboardLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#18181b',
          tabBarInactiveTintColor: '#a1a1aa',
          headerStyle: { 
            backgroundColor: '#ffffff',
            shadowColor: '#e4e4e7',
            shadowOpacity: 0.3,
            elevation: 1,
          },
          headerTintColor: '#18181b',
          headerTitleStyle: {
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: '#ffffff',
            height: Platform.OS === 'ios' ? 88 : 64,
            paddingBottom: Platform.OS === 'ios' ? 28 : 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: '#e4e4e7',
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="friends"
          options={{
            title: 'Friends',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="alert-circle-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="report"
          options={{
            title: 'Report',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="warning-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {/* ElevenLabs AI Assistant floating button */}
      <ElevenLabsAgent />
    </View>
  );
}