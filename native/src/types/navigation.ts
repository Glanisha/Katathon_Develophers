// src/types/navigation.ts

// Define your root stack parameters
export type RootStackParamList = {
  Register: undefined;
  Login: undefined;
  Dashboard: { token: string }; 
};