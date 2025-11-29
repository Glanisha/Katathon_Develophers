import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Friends from "./pages/Friends";


// Dashboard layout and pages
import DashboardLayout, { 
  DashboardHome,  
  Reports, 
  SettingsPage, 
  EmergencyContacts   // ✅ NEW IMPORT
} from './pages/Dashboard/Dashboard';

import MapComponent from './pages/Dashboard/Map';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Dashboard - HOME */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardHome />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Dashboard - MAP */}
          <Route
            path="/dashboard/map"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MapComponent />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Dashboard - FRIENDS */}
          <Route
            path="/dashboard/friends"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Friends />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Dashboard - REPORTS */}
          <Route
            path="/dashboard/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Dashboard - EMERGENCY CONTACTS (NEW) */}
          <Route
            path="/dashboard/emergency"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EmergencyContacts />   {/* ✅ Correct placement */}
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Dashboard - SETTINGS */}
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
