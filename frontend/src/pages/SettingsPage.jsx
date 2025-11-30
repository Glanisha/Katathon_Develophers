import { useEffect, useState } from "react";
import api from "../../api";
import { useAuth } from "../context/AuthContext";

const defaultSettings = {
  profile: {
    displayName: "",
  },
  privacy: {
    shareLiveLocation: true,
    showApproxLocation: false,
    showAsNearby: true,
    friendRequestMode: "everyone",
  },
  mapPreferences: {
    defaultRouteType: "safest",
    distanceUnit: "km",
    defaultZoom: "normal",
    theme: "light",
  },
  notifications: {
    friendRequests: true,
    friendAccepted: true,
    chatMessages: true,
    nearbyIncidents: true,
    emailFriendRequests: false,
    emailEmergencyChanges: false,
  },
  chat: {
    allowFrom: "allFriends",
    readReceipts: true,
  },
  emergency: {
    sosAutoShareRouteAtNight: false,
    sosMessage:
      "I feel unsafe. This is my current location and route. Please check on me.",
  },
};

function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // change password state
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwMessage, setPwMessage] = useState("");

  // fetch settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/settings");
        setSettings({ ...defaultSettings, ...(res.data.settings || {}) });
      } catch (err) {
        console.error("Load settings error", err);
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateField = (path, value) => {
    setSettings((prev) => {
      const copy =
        typeof structuredClone === "function"
          ? structuredClone(prev)
          : JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let obj = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!obj[p]) obj[p] = {};
        obj = obj[p];
      }
      obj[parts[parts.length - 1]] = value;
      return copy;
    });
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setMessage("");
      setError("");
      const res = await api.put("/settings", { settings });
      setSettings({ ...defaultSettings, ...(res.data.settings || {}) });
      setMessage("Settings saved successfully.");
      setTimeout(() => setMessage(""), 2500);
    } catch (err) {
      console.error("Save settings error", err.response?.data || err.message);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // change password handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwMessage("");

    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError("Please fill in all password fields.");
      return;
    }

    if (pwNew !== pwConfirm) {
      setPwError("New password and confirm password do not match.");
      return;
    }

    if (pwNew.length < 8) {
      setPwError("New password must be at least 8 characters long.");
      return;
    }

    try {
      setPwSaving(true);
      await api.post("/auth/change-password", {
        currentPassword: pwCurrent,
        newPassword: pwNew,
      });
      setPwMessage("Password changed successfully.");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setTimeout(() => setPwMessage(""), 2500);
    } catch (err) {
      console.error(
        "Change password error",
        err.response?.data || err.message
      );
      const msg =
        err.response?.data?.message || "Failed to change password.";
      setPwError(msg);
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg">Loading settings…</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-gray-500">
            Manage your account, privacy, map preferences and safety options.
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {message && (
        <div className="px-3 py-2 rounded bg-green-100 text-green-700 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="px-3 py-2 rounded bg-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Account & Profile */}
      <section className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <h2 className="font-semibold text-lg">Account & Profile</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={user?.name || ""}
              disabled
              className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Display name</label>
            <input
              type="text"
              value={settings.profile.displayName}
              onChange={(e) =>
                updateField("profile.displayName", e.target.value)
              }
              placeholder="Name shown to friends"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      </section>

      {/* Change Password */}
      <section className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <h2 className="font-semibold text-lg">Change Password</h2>

        {pwMessage && (
          <div className="px-3 py-2 rounded bg-green-100 text-green-700 text-sm">
            {pwMessage}
          </div>
        )}
        {pwError && (
          <div className="px-3 py-2 rounded bg-red-100 text-red-700 text-sm">
            {pwError}
          </div>
        )}

        <form
          className="grid md:grid-cols-3 gap-4 text-sm"
          onSubmit={handleChangePassword}
        >
          <div>
            <label className="block text-gray-700 mb-1">
              Current password
            </label>
            <input
              type="password"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">New password</label>
            <input
              type="password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={pwSaving}
              className="px-4 py-2 rounded bg-gray-900 text-white text-sm hover:bg-black disabled:opacity-60"
            >
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </section>

      {/* Privacy & Safety */}
      <section className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <h2 className="font-semibold text-lg">Privacy & Safety</h2>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">Share live location</div>
              <div className="text-xs text-gray-500">
                Allow your live location to be visible to friends in the app.
              </div>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={settings.privacy.shareLiveLocation}
              onChange={(e) =>
                updateField("privacy.shareLiveLocation", e.target.checked)
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">Show approximate location only</div>
              <div className="text-xs text-gray-500">
                When enabled, your location is blurred to a nearby area instead
                of exact GPS point.
              </div>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={settings.privacy.showApproxLocation}
              onChange={(e) =>
                updateField("privacy.showApproxLocation", e.target.checked)
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">Show me as “nearby”</div>
              <div className="text-xs text-gray-500">
                Allow friends to see you in the “friends around me” list.
              </div>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={settings.privacy.showAsNearby}
              onChange={(e) =>
                updateField("privacy.showAsNearby", e.target.checked)
              }
            />
          </div>

          <div>
            <div className="font-medium mb-1">
              Who can send friend requests?
            </div>
            <select
              value={settings.privacy.friendRequestMode}
              onChange={(e) =>
                updateField("privacy.friendRequestMode", e.target.value)
              }
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="everyone">Everyone</option>
              <option value="emailOnly">
                Only people who know my email
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* Map & Route Preferences */}
      <section className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <h2 className="font-semibold text-lg">Map & Route Preferences</h2>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">
              Default route type
            </label>
            <select
              value={settings.mapPreferences.defaultRouteType}
              onChange={(e) =>
                updateField("mapPreferences.defaultRouteType", e.target.value)
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="safest">Safest</option>
              <option value="fastest">Fastest</option>
              <option value="balanced">Balanced</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Distance unit</label>
            <select
              value={settings.mapPreferences.distanceUnit}
              onChange={(e) =>
                updateField("mapPreferences.distanceUnit", e.target.value)
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="km">Kilometres (km)</option>
              <option value="miles">Miles</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">
              Default zoom level
            </label>
            <select
              value={settings.mapPreferences.defaultZoom}
              onChange={(e) =>
                updateField("mapPreferences.defaultZoom", e.target.value)
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="close">Close</option>
              <option value="normal">Normal</option>
              <option value="far">Far</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Map theme</label>
            <select
              value={settings.mapPreferences.theme}
              onChange={(e) =>
                updateField("mapPreferences.theme", e.target.value)
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <h2 className="font-semibold text-lg">Notifications</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="font-medium text-gray-700">In-app alerts</div>

            {[
              {
                key: "friendRequests",
                label: "Friend requests",
                desc: "Notify me when someone sends a friend request.",
              },
              {
                key: "friendAccepted",
                label: "Friend request accepted",
                desc: "Notify me when my request is accepted.",
              },
              {
                key: "chatMessages",
                label: "Chat messages",
                desc: "Notify me about new messages from friends.",
              },
              {
                key: "nearbyIncidents",
                label: "Incidents near me",
                desc: "Alert me when an incident is reported near my area.",
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-gray-500">
                    {item.desc}
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={settings.notifications[item.key]}
                  onChange={(e) =>
                    updateField(
                      `notifications.${item.key}`,
                      e.target.checked
                    )
                  }
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="font-medium text-gray-700">Email alerts</div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-sm">Friend requests</div>
                <div className="text-xs text-gray-500">
                  Send me an email when someone sends a friend request.
                </div>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={settings.notifications.emailFriendRequests}
                onChange={(e) =>
                  updateField(
                    "notifications.emailFriendRequests",
                    e.target.checked
                  )
                }
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-sm">
                  Emergency contacts
                </div>
                <div className="text-xs text-gray-500">
                  Email me when my emergency contact list is updated.
                </div>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={settings.notifications.emailEmergencyChanges}
                onChange={(e) =>
                  updateField(
                    "notifications.emailEmergencyChanges",
                    e.target.checked
                  )
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* Chat & Friends */}
      <section className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <h2 className="font-semibold text-lg">Chat & Friends</h2>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">
              Allow chat from
            </label>
            <select
              value={settings.chat.allowFrom}
              onChange={(e) => updateField("chat.allowFrom", e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="allFriends">All friends</option>
              <option value="closeFriends">
                Close friends only (future)
              </option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              You can later add a “close friends” list and filter here.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">Read receipts</div>
              <div className="text-xs text-gray-500">
                Allow friends to see when you’ve read their messages.
              </div>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={settings.chat.readReceipts}
              onChange={(e) =>
                updateField("chat.readReceipts", e.target.checked)
              }
            />
          </div>
        </div>
      </section>

      {/* Emergency / SOS */}
      <section className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <h2 className="font-semibold text-lg">Emergency & SOS</h2>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">
                Auto share route with emergency contact at night
              </div>
              <div className="text-xs text-gray-500">
                When enabled, your current route can be sent to your
                emergency contacts when you trigger SOS after late hours
                (for future implementation).
              </div>
            </div>
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={settings.emergency.sosAutoShareRouteAtNight}
              onChange={(e) =>
                updateField(
                  "emergency.sosAutoShareRouteAtNight",
                  e.target.checked
                )
              }
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">
              Default SOS message
            </label>
            <textarea
              rows={3}
              value={settings.emergency.sosMessage}
              onChange={(e) =>
                updateField("emergency.sosMessage", e.target.value)
              }
              className="w-full border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              This message can be used when sending alerts to emergency
              contacts together with your live location.
            </p>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        <h2 className="font-semibold text-lg text-red-600">Danger zone</h2>
        <p className="text-xs text-gray-500">
          These actions are not implemented yet in the backend, but you
          can describe them during viva as future enhancements.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <button className="px-4 py-2 rounded border border-red-300 text-red-600 hover:bg-red-50">
            Delete my account (future)
          </button>
          <button className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
            Log out of all devices (future)
          </button>
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
