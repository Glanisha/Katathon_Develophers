import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Friends = () => {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [friendEmail, setFriendEmail] = useState("");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = "http://localhost:5000/api"; // Update if deployed

  const fetchFriends = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/friends/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Accept either `{ friends: [...] }` or raw array for compatibility
      setFriends(res.data.friends ?? res.data ?? []);
    } catch (err) {
      console.error("Fetch Friends Error:", err);
    }
  };

  const fetchRequests = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data.requests ?? []);
    } catch (err) {
      console.error('Fetch requests error', err);
    }
  };

  const fetchSentRequests = async () => {
    if (!token) return;
    try {
      console.log('Fetching sent requests from', `${API_URL}/friends/requests/sent`);
      const res = await axios.get(`${API_URL}/friends/requests/sent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Sent requests response:', res.data);
      setSentRequests(res.data.requests ?? []);
    } catch (err) {
      console.error('Fetch sent requests error:', err.response?.status, err.response?.data || err.message);
    }
  };

  const addFriend = async () => {
    const query = friendEmail.trim();
    if (!query) {
      alert('Please enter a name or email to search');
      return;
    }
    if (!token) {
      alert('You must be logged in to add friends.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/friends/request`,
        { query },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.message) alert(res.data.message);
      setFriendEmail('');
      fetchRequests();
      fetchSentRequests();
    } catch (err) {
      if (err.response) {
        const serverMsg = err.response?.data?.message || err.response?.data?.error || JSON.stringify(err.response.data);
        alert(`Server error: ${serverMsg} (status ${err.response.status})`);
      } else if (err.request) {
        alert('Network error: No response from server. Is the backend running?');
      } else {
        alert(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchRequests();
    fetchSentRequests();

    // Auto-refresh incoming requests every 10 seconds so new requests appear immediately
    const interval = setInterval(() => {
      fetchRequests();
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Friends</h2>

      {/* Add Friend (by email or name) */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Friend's email or first name"
          value={friendEmail}
          onChange={(e) => setFriendEmail(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <button
          onClick={addFriend}
          disabled={loading || !isAuthenticated}
          title={!isAuthenticated ? 'Log in to add friends' : ''}
          className={`text-white px-4 py-2 rounded ${isAuthenticated ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'}`}>
          {loading ? "Sending..." : "Send Request"}
        </button>
      </div>

      {/* Incoming Requests */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Incoming Requests:</h3>
        {requests.length === 0 ? (
          <p className="text-gray-500 text-sm">No incoming requests</p>
        ) : (
          requests.map((r) => (
            <div key={r._id} className="flex justify-between items-center border p-3 rounded-lg mb-2">
              <div>
                <div className="font-medium">{r.from?.name || r.from?.email}</div>
                <div className="text-gray-600 text-sm">{r.from?.email}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await axios.post(`${API_URL}/friends/requests/${r._id}/approve`, {}, { headers: { Authorization: `Bearer ${token}` } });
                      alert('Friend request accepted');
                      fetchFriends();
                      fetchRequests();
                    } catch (err) {
                      alert(err.response?.data?.message || 'Error accepting request');
                    }
                  }}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  Accept
                </button>
                <button
                  onClick={async () => {
                    try {
                      await axios.post(`${API_URL}/friends/requests/${r._id}/decline`, {}, { headers: { Authorization: `Bearer ${token}` } });
                      alert('Friend request declined');
                      fetchRequests();
                    } catch (err) {
                      alert(err.response?.data?.message || 'Error declining request');
                    }
                  }}
                  className="bg-gray-300 text-black px-3 py-1 rounded"
                >
                  Decline
                </button>
              </div>
            </div>
          ))
        )}
      </div>


      {/* Outgoing / Sent Requests */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Outgoing Requests:</h3>
        {sentRequests.length === 0 ? (
          <p className="text-gray-500 text-sm">No outgoing requests</p>
        ) : (
          sentRequests.map((r) => (
            <div key={r._id} className="flex justify-between items-center border p-3 rounded-lg mb-2">
              <div>
                <div className="font-medium">{r.to?.name || r.to?.email}</div>
                <div className="text-gray-600 text-sm">{r.to?.email}</div>
              </div>
              <div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!confirm(`Cancel friend request to ${r.to?.name || r.to?.email}?`)) return;
                      try {
                        await axios.delete(`${API_URL}/friends/requests/${r._id}`, { headers: { Authorization: `Bearer ${token}` } });
                        alert('Friend request canceled');
                        fetchSentRequests();
                      } catch (err) {
                        alert(err.response?.data?.message || 'Error canceling request');
                      }
                    }}
                    className="bg-yellow-500 text-white px-3 py-1 rounded"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        // resend the friend request to the same user (acts as Undo/Resend)
                        const query = r.to?.email || r.to?.name;
                        if (!query) return alert('Cannot resend: missing recipient info');
                        const res = await axios.post(`${API_URL}/friends/request`, { query }, { headers: { Authorization: `Bearer ${token}` } });
                        alert(res.data?.message || 'Friend request resent');
                        fetchSentRequests();
                      } catch (err) {
                        alert(err.response?.data?.message || 'Error resending request');
                      }
                    }}
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    Resend
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Friends List */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Your Friends:</h3>
        {friends.length === 0 ? (
          <p className="text-gray-500 text-sm">No friends yet. Add someone!</p>
        ) : (
          friends.map((friend) => (
            <div
              key={friend._id}
              className="flex justify-between items-center border p-3 rounded-lg mb-2"
            >
              <span className="font-medium">{friend.name}</span>
              <span className="text-gray-600 text-sm">{friend.email}</span>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!confirm(`Remove ${friend.name} from your friends?`)) return;
                    // debug info: log id and token presence
                    console.log('Removing friend', { friendId: friend._id, tokenPreview: token ? `${token.slice(0,8)}...` : null });
                    try {
                      await axios.delete(`${API_URL}/friends/${friend._id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      alert('Friend removed');
                      fetchFriends();
                    } catch (err) {
                      console.error('Remove friend client error', err);
                      alert(err.response?.data?.message || 'Error removing friend');
                    }
                  }}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Show Friends on Map */}
      {friends.length > 0 && (
        <button
          onClick={() => navigate("/dashboard/map")}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          View Friends on Map
        </button>
      )}
    </div>
  );
};

export default Friends;
