import { Map, Home, Users, Settings, AlertCircle, PhoneCall } from "lucide-react";
import { useAuth } from '../../context/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '../../components/ui/sidebar';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from "react";

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
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Welcome, {user?.name}!</h2>
      <p className="text-gray-600">Email: {user?.email}</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900">Total Walks</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-900">Safety Score</h3>
          <p className="text-3xl font-bold text-green-600">--</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-900">Friends</h3>
          <p className="text-3xl font-bold text-purple-600">{user?.friends?.length || 0}</p>
        </div>
      </div>
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
