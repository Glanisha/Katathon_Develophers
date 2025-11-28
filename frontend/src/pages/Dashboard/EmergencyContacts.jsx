import { useState, useEffect } from "react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function EmergencyContacts() {
  const { user } = useAuth();
  const userId = user?._id;

  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", relation: "" });

  const fetchContacts = async () => {
    if (!userId) return;

    try {
      const res = await api.get(`/emergency/${userId}`);
      setContacts(res.data || []);
    } catch (err) {
      console.log("Fetch contacts error:", err.response?.data || err.message);
      setContacts([]);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [userId]);

  const addContact = async () => {
    if (!form.name || !form.phone) return alert("Fill both fields!");
    if (!userId) return;

    try {
      const res = await api.post("/emergency/add", {
        userId,
        name: form.name,
        phone: form.phone,
        relation: form.relation || "Friend",
      });

      setContacts([...contacts, res.data]);
      setForm({ name: "", phone: "", relation: "" });
    } catch (err) {
      console.log("Add contact error:", err.response?.data || err.message);
    }
  };

  const deleteContact = async (id) => {
    try {
      await api.delete(`/emergency/${id}`);
      setContacts(contacts.filter((c) => c._id !== id));
    } catch (err) {
      console.log("Delete contact error:", err.response?.data || err.message);
    }
  };

  const sendSOS = async () => {
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
            () => resolve() // continue without location if denied
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
      const res = await api.post("/alert/send-to-friends", { userId, message });
      alert("SOS sent to all emergency contacts!");
    } catch (err) {
      console.log("Error sending SOS:", err.response?.data || err.message);
      alert("Failed to send SOS");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Emergency Contacts</h1>

      {/* SOS BUTTON */}
      <button
        className="bg-red-600 text-white px-4 py-2 rounded mb-4"
        onClick={sendSOS}
      >
        🚨 SOS
      </button>

      {/* ADD CONTACT FORM */}
      <div className="mb-6 flex flex-wrap gap-2">
        <input
          className="border p-2"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="border p-2"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="border p-2"
          placeholder="Relation"
          value={form.relation}
          onChange={(e) => setForm({ ...form, relation: e.target.value })}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={addContact}>
          Add Contact
        </button>
      </div>

      {/* CONTACT LIST */}
      <h2 className="text-xl font-semibold mb-3">Saved Contacts:</h2>
      {contacts.length === 0 ? (
        <p>No contacts added yet.</p>
      ) : (
        <ul>
          {contacts.map((c) => (
            <li
              key={c._id}
              className="border p-3 mb-2 flex justify-between items-center"
            >
              <span>
                <strong>{c.name}</strong> — {c.phone} ({c.relation})
              </span>
              <button
                className="bg-red-600 text-white px-3 py-1 rounded"
                onClick={() => deleteContact(c._id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
