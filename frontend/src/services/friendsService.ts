import api from '../../api';

const API_URL = 'http://localhost:5000/api'; // Update if deployed

class FriendsService {
  /**
   * Send a friend request by email or name
   */
  async sendFriendRequest(query: string): Promise<{ message: string; requestId: string }> {
    try {
      const res = await api.post(`${API_URL}/friends/request`, { query });
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Error sending friend request');
    }
  }

  /**
   * Get list of accepted friends
   */
  async getFriends(): Promise<any[]> {
    try {
      const res = await api.get(`${API_URL}/friends/list`);
      return res.data.friends ?? res.data ?? [];
    } catch (err: any) {
      console.error('Fetch friends error:', err);
      throw new Error(err.response?.data?.message || 'Error fetching friends');
    }
  }

  /**
   * Get incoming friend requests (to me)
   */
  async getIncomingRequests(): Promise<any[]> {
    try {
      const res = await api.get(`${API_URL}/friends/requests`);
      return res.data.requests ?? [];
    } catch (err: any) {
      console.error('Fetch incoming requests error:', err);
      throw new Error(err.response?.data?.message || 'Error fetching incoming requests');
    }
  }

  /**
   * Get outgoing friend requests (sent by me)
   */
  async getSentRequests(): Promise<any[]> {
    try {
      const res = await api.get(`${API_URL}/friends/requests/sent`);
      return res.data.requests ?? [];
    } catch (err: any) {
      console.error('Fetch sent requests error:', err);
      throw new Error(err.response?.data?.message || 'Error fetching sent requests');
    }
  }

  /**
   * Approve a friend request
   */
  async approveFriendRequest(requestId: string): Promise<{ message: string }> {
    try {
      const res = await api.post(`${API_URL}/friends/requests/${requestId}/approve`, {});
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Error approving friend request');
    }
  }

  /**
   * Decline a friend request
   */
  async declineFriendRequest(requestId: string): Promise<{ message: string }> {
    try {
      const res = await api.post(`${API_URL}/friends/requests/${requestId}/decline`, {});
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Error declining friend request');
    }
  }

  /**
   * Remove a friend
   */
  async removeFriend(friendId: string): Promise<{ message: string }> {
    try {
      const res = await api.delete(`${API_URL}/friends/${friendId}`);
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Error removing friend');
    }
  }

  /**
   * Cancel a sent friend request
   */
  async cancelRequest(requestId: string): Promise<{ message: string }> {
    try {
      const res = await api.delete(`${API_URL}/friends/requests/${requestId}`);
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Error canceling request');
    }
  }
}

export default new FriendsService();
