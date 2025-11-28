import { Map, Home, Users, Settings, AlertCircle, PhoneCall } from "lucide-react";
import { useAuth } from '../../context/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '../../components/ui/sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from "react";

import { useState, useEffect } from 'react';
import api from '../../../api';
import MapComponent from './Map';

 
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../components/ui/sidebar";

// -----------------------
// SIDEBAR MENU
// -----------------------
const items = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Map", url: "/dashboard/map", icon: Map },
  { title: "Friends", url: "/dashboard/friends", icon: Users },
  { title: "Emergency Contacts", url: "/dashboard/emergency", icon: PhoneCall },
  { title: "Reports", url: "/dashboard/reports", icon: AlertCircle },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

// -----------------------
// SIDEBAR COMPONENT
// -----------------------
export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>SafeWalk</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <a
                      href={item.url}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.url);
                      }}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>

        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

// -----------------------
// HOME PAGE
// -----------------------
export const DashboardHome = () => {
  const { user } = useAuth();
  const [safetyStats, setSafetyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSafetyStats = async () => {
      try {
        const response = await api.get('/reports/users/me/safety-stats');
        setSafetyStats(response.data);
      } catch (err) {
        console.error('Failed to fetch safety stats:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSafetyStats();
    }
  }, [user]);

  // Determine color based on safety score
  const getSafetyColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const safetyScore = safetyStats?.safetyScore ?? '--';
  const safetyColor = typeof safetyScore === 'number' ? getSafetyColor(safetyScore) : '';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Welcome, {user?.name}!</h2>
      <p className="text-gray-600">Email: {user?.email}</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900">Total Walks</h3>
          <p className="text-3xl font-bold text-blue-600">
            {loading ? '--' : safetyStats?.allTimeSessionCount || 0}
          </p>
          {safetyStats && (
            <p className="text-xs mt-2 text-gray-600">
              {safetyStats.sessionCount} in last 30 days
            </p>
          )}
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-900">Safety Score</h3>
          <p className="text-3xl font-bold text-green-600">--</p>
        <div className={`p-4 rounded-lg ${safetyColor}`}>
          <h3 className="font-semibold">Safety Score (30 days)</h3>
          <p className="text-3xl font-bold">
            {loading ? '--' : safetyScore}
          </p>
          {safetyStats && (
            <p className="text-sm mt-2 opacity-75">
              {safetyStats.routeCount} routes analyzed
            </p>
          )}
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-900">Friends</h3>
          <p className="text-3xl font-bold text-purple-600">{user?.friends?.length || 0}</p>
        </div>
      </div>
      {safetyStats && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="text-sm text-gray-600">Average Route Safety</p>
            <p className="text-2xl font-semibold text-purple-600">
              {safetyStats.averageRouteScore !== null ? safetyStats.averageRouteScore : 'N/A'}
            </p>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <p className="text-sm text-gray-600">Incidents (30 days)</p>
            <p className="text-2xl font-semibold text-red-600">
              {safetyStats.incidentCount}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------
// FRIENDS PAGE
// -----------------------
export const Friends = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-2xl font-bold">Friends</h2>
  </div>
);

// -----------------------
// REPORTS PAGE
// -----------------------
export const Reports = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-2xl font-bold">Reports</h2>
  </div>
);

// -----------------------
// SETTINGS PAGE
// -----------------------
export const SettingsPage = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-2xl font-bold">Settings</h2>
  </div>
);

// -----------------------
// EMERGENCY CONTACTS PAGE
// -----------------------
export const EmergencyContacts = () => {
  const { user } = useAuth();
  const userId = user?._id;
  const BACKEND_URL = "http://localhost:5000";

  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", relation: "" });

  // -----------------------
  // Fetch contacts
  // -----------------------
  async function fetchContacts() {
    if (!userId) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/emergency/${userId}`);
      const text = await res.text();
      let data = [];
      try {
        data = text ? JSON.parse(text) : [];
      } catch {
        console.log("Non-JSON response:", text);
      }
      setContacts(data);
    } catch (err) {
      console.log("Fetch contacts error:", err);
      setContacts([]);
    }
  }

  useEffect(() => {
    fetchContacts();
  }, [userId]);

  // -----------------------
  // Add contact
  // -----------------------
  async function addContact(e) {
    e.preventDefault();
    if (!userId) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/emergency/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...form }),
      });

      const text = await res.text();
      if (text) JSON.parse(text);

      setForm({ name: "", phone: "", relation: "" });
      fetchContacts();
    } catch (err) {
      console.log("Add contact error:", err);
    }
  }

  // -----------------------
  // Delete contact
  // -----------------------
  async function deleteContact(id) {
    try {
      await fetch(`${BACKEND_URL}/api/emergency/${id}`, { method: "DELETE" });
      fetchContacts();
    } catch (err) {
      console.log("Delete contact error:", err);
    }
  }

  // -----------------------
  // SOS button
  // -----------------------
  async function sendSOS() {
    if (!userId) return alert("User not logged in");
export const Friends = () => <div className="bg-white rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Friends</h2></div>;
export const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('weekly');
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return;
      setLoading(true);
      setError('');
      try {
        if (activeTab === 'weekly') {
          const response = await api.get('/reports/users/me/weekly');
          setWeeklyReport(response.data);
        } else {
          const response = await api.get('/reports/users/me/daily');
          setDailyReport(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError('Failed to load report. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, activeTab]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Activity Reports</h2>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`pb-3 px-4 font-medium border-b-2 transition ${
            activeTab === 'weekly'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Weekly Activity
        </button>
        <button
          onClick={() => setActiveTab('daily')}
          className={`pb-3 px-4 font-medium border-b-2 transition ${
            activeTab === 'daily'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Daily Activity
        </button>
      </div>

      {/* Loading & Error States */}
      {loading && <div className="text-center py-8 text-gray-600">Loading report...</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Weekly Report */}
      {activeTab === 'weekly' && weeklyReport && !loading && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-3xl font-bold text-blue-600">{weeklyReport.totalSessions || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Duration</p>
              <p className="text-3xl font-bold text-green-600">
                {Math.round((weeklyReport.totalDurationSeconds || 0) / 3600)}h
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Distance</p>
              <p className="text-3xl font-bold text-purple-600">
                {((weeklyReport.totalDistanceMeters || 0) / 1000).toFixed(1)} km
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Avg Safety Score</p>
              <p className="text-3xl font-bold text-orange-600">
                {weeklyReport.avgSafetyScore ? Math.round(weeklyReport.avgSafetyScore) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Top Places */}
          {weeklyReport.topPlaces && weeklyReport.topPlaces.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Most Visited Places</h3>
              <div className="space-y-2">
                {weeklyReport.topPlaces.slice(0, 5).map((place, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-gray-700">
                      {idx + 1}. {place.name || `Location (${place.lat?.toFixed(3)}, ${place.lng?.toFixed(3)})`}
                    </span>
                    <span className="text-sm text-gray-600">{place.count} visits</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sessions Breakdown */}
          {weeklyReport.sessions && weeklyReport.sessions.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Session Breakdown</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {weeklyReport.sessions.map((session, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">
                          {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          Duration: {Math.round(session.durationSeconds / 60)} min | Distance: {(session.distanceMeters / 1000).toFixed(2)} km
                        </p>
                      </div>
                      {session.safetyScore && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Safety: {Math.round(session.safetyScore)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Report */}
      {activeTab === 'daily' && dailyReport && !loading && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Today's Sessions</p>
              <p className="text-3xl font-bold text-blue-600">{dailyReport.totalSessions || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Today's Duration</p>
              <p className="text-3xl font-bold text-green-600">
                {Math.round((dailyReport.totalDurationSeconds || 0) / 60)} min
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Today's Distance</p>
              <p className="text-3xl font-bold text-purple-600">
                {((dailyReport.totalDistanceMeters || 0) / 1000).toFixed(2)} km
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Avg Safety Score</p>
              <p className="text-3xl font-bold text-orange-600">
                {dailyReport.avgSafetyScore ? Math.round(dailyReport.avgSafetyScore) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Top Places */}
          {dailyReport.topPlaces && dailyReport.topPlaces.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Today's Visited Places</h3>
              <div className="space-y-2">
                {dailyReport.topPlaces.map((place, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-gray-700">
                      {idx + 1}. {place.name || `Location (${place.lat?.toFixed(3)}, ${place.lng?.toFixed(3)})`}
                    </span>
                    <span className="text-sm text-gray-600">{place.count} visits</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sessions Breakdown */}
          {dailyReport.sessions && dailyReport.sessions.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Today's Sessions</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dailyReport.sessions.map((session, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">
                          {new Date(session.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          Duration: {Math.round(session.durationSeconds / 60)} min | Distance: {(session.distanceMeters / 1000).toFixed(2)} km
                        </p>
                      </div>
                      {session.safetyScore && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Safety: {Math.round(session.safetyScore)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dailyReport.totalSessions === 0 && (
            <div className="text-center py-8 text-gray-600">
              No walks recorded today. Start your first walk to see activity!
            </div>
          )}
        </div>
      )}

      {!loading && !weeklyReport && !dailyReport && (
        <div className="text-center py-8 text-gray-600">
          No data available yet. Start your first walk to see reports!
        </div>
      )}
    </div>
  );
};
export const SettingsPage = () => <div className="bg-white rounded-lg shadow p-6"><h2 className="text-2xl font-bold">Settings</h2></div>;

    let message = "I need help!";
    let location = null;

    if (navigator.geolocation) {
      try {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              resolve();
            },
            () => resolve() // send without location if denied
          );
        });
      } catch (err) {
        console.log("Error getting location:", err);
      }
    }

    if (location) {
      const mapsLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
      message += `\nMy location: ${mapsLink}`;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/alert/send-to-friends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message }),
      });

      const text = await res.text();
      if (text) JSON.parse(text);

      alert("SOS sent to all emergency contacts!");
    } catch (err) {
      console.log("Error sending SOS:", err);
      alert("Failed to send SOS");
    }
  }

  // -----------------------
  // Render
  // -----------------------
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Emergency Contacts</h2>

      {/* SOS BUTTON */}
      <button
        className="bg-red-600 text-white px-4 py-2 rounded mb-4"
        onClick={sendSOS}
      >
        🚨 SOS
      </button>

      {/* ADD CONTACT FORM */}
      <form onSubmit={addContact} className="space-y-3 mb-6">
        <input
          required
          placeholder="Name"
          className="w-full border p-2 rounded"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          placeholder="Phone"
          className="w-full border p-2 rounded"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          required
          placeholder="Relation"
          className="w-full border p-2 rounded"
          value={form.relation}
          onChange={(e) => setForm({ ...form, relation: e.target.value })}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Add Contact
        </button>
      </form>

      {/* CONTACT LIST */}
      <div className="space-y-3">
        {contacts.map((c) => (
          <div key={c._id} className="p-3 border rounded flex justify-between items-center">
            <div>
              <p><strong>{c.name}</strong></p>
              <p>📞 {c.phone}</p>
              <p>Relation: {c.relation}</p>
            </div>
            <button
              className="bg-red-600 text-white px-3 py-1 rounded"
              onClick={() => deleteContact(c._id)}
            >
              Delete
            </button>
          </div>
        ))}

        {contacts.length === 0 && (
          <p className="text-gray-500">No emergency contacts added yet.</p>
        )}
      </div>
    </div>
  );
};

// -----------------------
// DASHBOARD LAYOUT
// -----------------------
const Dashboard = ({ children }) => {
  const { logout } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <div className="flex flex-1 items-center justify-between">
              <h1 className="text-xl font-semibold">SafeWalk Dashboard</h1>
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </header>
          <div className="flex-1 flex flex-col p-4">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
