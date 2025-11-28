import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import friendsService from "../services/friendsService";

const Friends = () => {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [friendEmail, setFriendEmail] = useState("");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFriends = async () => {
    if (!token) return;
    try {
      const data = await friendsService.getFriends();
      setFriends(data);
    } catch (err) {
      console.error("Fetch friends error:", err.message);
    }
  };

  const fetchRequests = async () => {
    if (!token) return;
    try {
      const data = await friendsService.getIncomingRequests();
      setRequests(data);
    } catch (err) {
      console.error("Fetch incoming requests error:", err.message);
    }
  };

  const fetchSentRequests = async () => {
    if (!token) return;
    try {
      const data = await friendsService.getSentRequests();
      setSentRequests(data);
    } catch (err) {
      console.error("Fetch sent requests error:", err.message);
    }
  };

  const addFriend = async () => {
    const query = friendEmail.trim();
    if (!query) {
      setError("Please enter a name or email to search");
      return;
    }
    if (!token) {
      setError("You must be logged in to add friends.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await friendsService.sendFriendRequest(query);
      alert(result.message || "Friend request sent");
      setFriendEmail("");
      fetchSentRequests();
    } catch (err) {
      setError(err.message);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    
    fetchFriends();
    fetchRequests();
    fetchSentRequests();

    // Auto-refresh incoming requests every 10 seconds
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
          title={!isAuthenticated ? "Log in to add friends" : ""}
          className={`text-white px-4 py-2 rounded ${
            isAuthenticated
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {loading ? "Sending..." : "Send Request"}
        </button>
      </div>

      {/* Error message */}
      {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

      {/* Incoming Requests */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Incoming Requests:</h3>
        {requests.length === 0 ? (
          <p className="text-gray-500 text-sm">No incoming requests</p>
        ) : (
          requests.map((r) => (
            <div
              key={r._id}
              className="flex justify-between items-center border p-3 rounded-lg mb-2"
            >
              <div>
                <div className="font-medium">{r.from?.name || r.from?.email}</div>
                <div className="text-gray-600 text-sm">{r.from?.email}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const result = await friendsService.approveFriendRequest(r._id);
                      alert(result.message || "Friend request accepted");
                      fetchFriends();
                      fetchRequests();
                    } catch (err) {
                      alert(err.message);
                    }
                  }}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  Accept
                </button>
                <button
                  onClick={async () => {
                    try {
                      const result = await friendsService.declineFriendRequest(r._id);
                      alert(result.message || "Friend request declined");
                      fetchRequests();
                    } catch (err) {
                      alert(err.message);
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
            <div
              key={r._id}
              className="flex justify-between items-center border p-3 rounded-lg mb-2"
            >
              <div>
                <div className="font-medium">{r.to?.name || r.to?.email}</div>
                <div className="text-gray-600 text-sm">{r.to?.email}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (
                      !confirm(
                        `Cancel friend request to ${r.to?.name || r.to?.email}?`
                      )
                    )
                      return;
                    try {
                      const result = await friendsService.cancelRequest(r._id);
                      alert(result.message || "Friend request canceled");
                      fetchSentRequests();
                    } catch (err) {
                      alert(err.message);
                    }
                  }}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={async () => {
                    try {
                      const query = r.to?.email || r.to?.name;
                      if (!query)
                        return alert("Cannot resend: missing recipient info");
                      const result = await friendsService.sendFriendRequest(query);
                      alert(result.message || "Friend request resent");
                      fetchSentRequests();
                    } catch (err) {
                      alert(err.message);
                    }
                  }}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Resend
                </button>
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
                    if (
                      !confirm(`Remove ${friend.name} from your friends?`)
                    )
                      return;
                    try {
                      const result = await friendsService.removeFriend(friend._id);
                      alert(result.message || "Friend removed");
                      fetchFriends();
                    } catch (err) {
                      alert(err.message);
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
