// app/_layout.tsx (The global layout and entry point for routing logic)

import { Stack, Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth, AuthProvider } from '../src/context/AuthContext'; 
import { styles } from '../src/styles/appStyles'; 

// This function wraps the entire app in the AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <LayoutContent />
    </AuthProvider>
  );
}

// This component contains the conditional routing logic
function LayoutContent() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }


  // if (token) {
  //   return <Redirect href="/(app)/dashboard/home" />; 
  // }
  
  // If no token, render the Stack which will default to the unauthenticated screens
  return (
    <Stack 
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#fff',
          headerShown: false, 
      }}
    >
      {/* These screens are the default ones when not authenticated */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
      <Stack.Screen name="login" options={{ title: 'Login' }} />

      {/* The (app) group is handled by its own nested layout or guarded above */}
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
     
    </Stack>
  );
}