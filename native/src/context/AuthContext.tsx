// src/context/AuthContext.tsx

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
// 💡 Replaced Expo SecureStore with standard AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage'; 

// Key used to store the token in AsyncStorage
const TOKEN_KEY = 'userAccessToken'; 

// ------------------------------------
// 1. Define Types (No change)
// ------------------------------------
interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  signIn: (newToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ------------------------------------
// 2. Create Context (No change)
// ------------------------------------
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook for consuming the context (No change)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ------------------------------------
// 3. Auth Provider Component (Updated Storage Methods)
// ------------------------------------
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load the token from AsyncStorage on app startup
  useEffect(() => {
    const loadToken = async () => {
      try {
        // 🔑 Use AsyncStorage.getItem
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(storedToken);
      } catch (e) {
        console.error("Failed to load token from AsyncStorage", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  // Function to handle login
  const signIn = async (newToken: string) => {
    setToken(newToken);
    // 🔑 Use AsyncStorage.setItem
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
  };

  // Function to handle logout
  const signOut = async () => {
    setToken(null);
    // 🔑 Use AsyncStorage.removeItem
    await AsyncStorage.removeItem(TOKEN_KEY);
  };

  const value = {
    token,
    isLoading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};