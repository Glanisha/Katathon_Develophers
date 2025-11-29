import { useEffect, useRef, useState } from "react";
import api from "../../api";
import { useAuth } from "../context/AuthContext";

function FriendsChatPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Find existing chat for a friend by userId
  const findChatForFriend = (friendId) => {
    return (
      chats.find((c) =>
        (c.participants || []).some(
          (p) => String(p.userId) === String(friendId)
        )
      ) || null
    );
  };

  // Load friends + chats once on mount
  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        setError("");
        const res = await api.get("/friends/list");
        setFriends(res.data.friends || res.data || []);
      } catch (err) {
        console.error("Load friends error", err);
        setError("Failed to load friends");
      } finally {
        setLoadingFriends(false);
      }
    };

    const loadChats = async () => {
      try {
        const res = await api.get("/chats");
        setChats(res.data.chats || []);
      } catch (err) {
        console.error("Load chats error", err);
      }
    };

    loadFriends();
    loadChats();
  }, []);

  // Refresh current chat from backend (can optionally pass a chatId)
  const refreshCurrentChat = async (chatId = null) => {
    const id = chatId || (currentChat && currentChat._id);
    if (!id) return;

    try {
      const res = await api.get(`/chats/${id}`);
      const updated = res.data.chat;
      setCurrentChat(updated);
      setMessages(updated.messages || []);
      setChats((prev) =>
        prev.map((c) => (c._id === updated._id ? updated : c))
      );
    } catch (err) {
      console.error("Refresh chat error", err);
    }
  };

  // Open chat when clicking on a friend
  const openChatWithFriend = async (friend) => {
    setSelectedFriend(friend);
    setError("");

    let chat = findChatForFriend(friend._id);

    // If chat doesn't exist, create a new friend-to-friend chat
    if (!chat) {
      try {
        const res = await api.post("/chats", {
          participants: [
            { userId: user._id, name: user.name },
            { userId: friend._id, name: friend.name },
          ],
          context: { type: "friend", friendId: friend._id },
        });

        chat = res.data.chat;
        setChats((prev) => [chat, ...prev]);
      } catch (err) {
        console.error("Create chat error", err);
        setError("Failed to create chat");
        return;
      }
    }

    setCurrentChat(chat);
    setMessages(chat.messages || []);
  };

  // Send a message in the current chat
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentChat) return;

    setSending(true);
    setError("");

    try {
      const res = await api.post(`/chats/${currentChat._id}/message`, {
        text: newMessage.trim(),
        generateReply: false, // friend-to-friend (no AI reply)
      });

      const updatedChat = res.data.chat;
      setCurrentChat(updatedChat);
      setMessages(updatedChat.messages || []);
      setChats((prev) =>
        prev.map((c) => (c._id === updatedChat._id ? updatedChat : c))
      );
      setNewMessage("");

      // Extra safety: ensure we have the latest from DB
      await refreshCurrentChat(updatedChat._id);
    } catch (err) {
      console.error("Send message error", err);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Call button (simple tel: link)
  const handleCall = (friend) => {
    if (friend.phone) {
      window.location.href = `tel:${friend.phone}`;
    } else {
      alert("No phone number saved for this friend.");
    }
  };

  return (
    <div className="chat-page">
      {/* LEFT: friends list */}
      <div className="friends-column">
        <div className="friends-header">
          <h2>Friends</h2>
        </div>

        {loadingFriends && <div className="info-text">Loading friends…</div>}
        {error && <div className="error-text">{error}</div>}

        <div className="friends-list">
          {friends.length === 0 && !loadingFriends ? (
            <div className="info-text">No friends yet.</div>
          ) : (
            friends.map((f) => {
              const selected = selectedFriend && selectedFriend._id === f._id;
              const hasChat = !!findChatForFriend(f._id);
              return (
                <div
                  key={f._id}
                  className={
                    "friend-item" + (selected ? " friend-item-selected" : "")
                  }
                >
                  <div
                    className="friend-main"
                    onClick={() => openChatWithFriend(f)}
                  >
                    <div className="friend-name">{f.name}</div>
                    {hasChat && (
                      <div className="friend-status">Chat active</div>
                    )}
                  </div>
                  <button
                    className="call-button"
                    onClick={() => handleCall(f)}
                  >
                    Call
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: chat window */}
      <div className="chat-column">
        {currentChat && selectedFriend ? (
          <>
            <div className="chat-header">
              <div>
                <div className="chat-title">{selectedFriend.name}</div>
                <div className="chat-subtitle">
                  Friend chat • {messages.length} messages
                </div>
              </div>
              <button
                className="call-button"
                onClick={() => handleCall(selectedFriend)}
              >
                Call
              </button>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="info-text">
                  Say hi and start the conversation 🙂
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMe =
                    m.userId &&
                    String(m.userId) === String(user._id) &&
                    m.sender === "user";
                  return (
                    <div
                      key={idx}
                      className={"message-row " + (isMe ? "me" : "them")}
                    >
                      <div className="message-bubble">
                        <div>{m.text}</div>
                        <div className="message-time">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-row" onSubmit={handleSend}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message…"
              />
              <button type="submit" disabled={sending || !newMessage.trim()}>
                {sending ? "Sending…" : "Send"}
              </button>
              <button type="button" onClick={() => refreshCurrentChat()}>
                Refresh
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty">
            Select a friend on the left to start chatting
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendsChatPage;
