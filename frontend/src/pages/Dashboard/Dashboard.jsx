import { Map, Home, Users, Settings, AlertCircle, PhoneCall } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "../../components/ui/sidebar";
import { useNavigate, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";
import api from "../../../api";
import { createMarker } from '../../api/markerApi';
import MapComponent from "./Map";
import TomTomMap from "../../components/TomTomMap";

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
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
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
        const response = await api.get("/reports/users/me/safety-stats");
        setSafetyStats(response.data);
      } catch (err) {
        console.error("Failed to fetch safety stats:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSafetyStats();
    }
  }, [user]);

  const getSafetyColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    if (score >= 40) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const safetyScore = safetyStats?.safetyScore ?? "--";
  const safetyColor =
    typeof safetyScore === "number" ? getSafetyColor(safetyScore) : "bg-green-50 text-green-600";

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Welcome, {user?.name}!</h2>
      <p className="text-gray-600">Email: {user?.email}</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900">Total Walks</h3>
          <p className="text-3xl font-bold text-blue-600">
            {loading ? "--" : safetyStats?.allTimeSessionCount || 0}
          </p>
          {safetyStats && (
            <p className="text-xs mt-2 text-gray-600">
              {safetyStats.sessionCount} in last 30 days
            </p>
          )}
        </div>

        <div className={`p-4 rounded-lg ${safetyColor}`}>
          <h3 className="font-semibold">Safety Score (30 days)</h3>
          <p className="text-3xl font-bold">
            {loading ? "--" : safetyScore}
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
              {safetyStats.averageRouteScore !== null
                ? safetyStats.averageRouteScore
                : "N/A"}
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
export const Reports = () => {
  const { user } = useAuth();
  const [reportTitle, setReportTitle] = useState('');
  const [reportCategory, setReportCategory] = useState('Other');
  const [reportDescription, setReportDescription] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [reportLocation, setReportLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [activeTab, setActiveTab] = useState("weekly");
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        if (activeTab === "weekly") {
          const response = await api.get("/reports/users/me/weekly");
          setWeeklyReport(response.data);
        } else {
          const response = await api.get("/reports/users/me/daily");
          setDailyReport(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch report:", err);
        setError("Failed to load report. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, activeTab]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Activity Reports</h2>

      {/* Report submission form + Community Reports Map (TomTom) */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold">Report an Incident</h3>
          <p className="text-sm text-gray-600 mb-3">Share a photo and details to help others stay safe.</p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Photo</label>
              <input type="file" accept="image/*" onChange={(e)=>setReportFile(e.target.files[0])} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Incident Title</label>
              <input value={reportTitle} onChange={(e)=>setReportTitle(e.target.value)} placeholder="eg. Suspicious person" className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={reportCategory} onChange={(e)=>setReportCategory(e.target.value)} className="w-full p-2 border rounded">
                <option>Suspicious</option>
                <option>Harassment</option>
                <option>Accident</option>
                <option>Danger</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={reportDescription} onChange={(e)=>setReportDescription(e.target.value)} rows={4} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-700">{reportLocation ? `${reportLocation.lat.toFixed(5)}, ${reportLocation.lng.toFixed(5)}` : 'No location set'}</div>
                <button type="button" onClick={async ()=>{
                  if (!navigator.geolocation) return alert('Geolocation not supported');
                  navigator.geolocation.getCurrentPosition((pos)=>{
                    setReportLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  }, ()=>alert('Unable to get location'))
                }} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Use current location</button>
              </div>
            </div>

            <div className="flex justify-end">
              <button disabled={submitting} onClick={async()=>{
                if (!reportTitle) return alert('Title required');
                if (!reportLocation) return alert('Please set location');
                setSubmitting(true); setSubmitMessage('');
                try {
                  const formData = new FormData();
                  formData.append('title', reportTitle);
                  formData.append('description', reportDescription);
                  formData.append('category', reportCategory);
                  formData.append('lat', reportLocation.lat);
                  formData.append('lng', reportLocation.lng);
                  if (reportFile) formData.append('image', reportFile);

                  // use backend marker API
                  const res = await createMarker(formData);
                  setSubmitMessage('Report submitted');
                  // reset form
                  setReportTitle(''); setReportCategory('Other'); setReportDescription(''); setReportFile(null);
                } catch (err) {
                  console.error('Submit report err', err);
                  setSubmitMessage('Failed to submit');
                } finally { setSubmitting(false); }
              }} className="px-4 py-2 bg-green-600 text-white rounded">{submitting ? 'Submitting...' : 'Submit'}</button>
            </div>

            {submitMessage && <div className="text-sm text-gray-700">{submitMessage}</div>}
          </div>
        </div>

        <div className="col-span-2 bg-white p-2 rounded-lg border">
          <h3 className="text-lg font-medium mb-2">Community Reports Map</h3>
          <div className="w-full h-96 rounded-lg overflow-hidden border">
            <TomTomMap apiKey={import.meta.env.VITE_TOMTOM_API_KEY} />
          </div>
        </div>
      </div>

      {/* Weekly/Daily activity sections removed per user request */}
    </div>
  );
};

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

  // Fetch contacts
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

  // Add contact
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

  // Delete contact
  async function deleteContact(id) {
    try {
      await fetch(`${BACKEND_URL}/api/emergency/${id}`, { method: "DELETE" });
      fetchContacts();
    } catch (err) {
      console.log("Delete contact error:", err);
    }
  }

  // SOS button
  async function sendSOS() {
    if (!userId) {
      alert("User not logged in");
      return;
    }

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
            () => resolve()
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Emergency Contacts</h2>

      <button
        className="bg-red-600 text-white px-4 py-2 rounded mb-4"
        onClick={sendSOS}
      >
        🚨 SOS
      </button>

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

      <div className="space-y-3">
        {contacts.map((c) => (
          <div
            key={c._id}
            className="p-3 border rounded flex justify-between items-center"
          >
            <div>
              <p>
                <strong>{c.name}</strong>
              </p>
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
          <div className="flex-1 flex flex-col p-4">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
