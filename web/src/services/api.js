/**
 * API Service - Handle all HTTP communication with Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT || 30000;

class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.timeout = API_TIMEOUT;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error.message);
      throw error;
    }
  }

  // ==================== AUTH ENDPOINTS ====================

  /**
   * Login dengan username + email
   */
  async loginWithProfile(username, email) {
    return this.request('/api/v1/auth/login-user', {
      method: 'POST',
      body: JSON.stringify({ username, email }),
    });
  }

  /**
   * Register user dengan username + email (RFID ditetapkan admin)
   */
  async registerWithProfile(username, email) {
    return this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email }),
    });
  }

  // ==================== USER ENDPOINTS ====================

  /**
   * Get semua users
   */
  async getAllUsers() {
    return this.request('/api/v1/users');
  }

  /**
   * Get user berdasarkan RFID UID
   */
  async getUserByRFID(rfidUid) {
    return this.request(`/api/v1/users/rfid/${rfidUid}`);
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit = 20) {
    return this.request(`/api/v1/users/leaderboard?limit=${limit}`);
  }

  /**
   * Get user history
   */
  async getUserHistory(userId) {
    return this.request(`/api/v1/users/${userId}/history`);
  }

  // ==================== TRASH ENDPOINTS ====================

  /**
   * Create trash detection
   */
  async createTrashDetection(rfidUid, category, weight, confidenceAi = 0.95) {
    return this.request('/api/v1/trash/detect', {
      method: 'POST',
      body: JSON.stringify({
        rfid_uid: rfidUid,
        category: category,
        weight: weight,
        confidence_ai: confidenceAi,
      }),
    });
  }

  /**
   * Get trash history
   */
  async getTrashHistory() {
    return this.request('/api/v1/trash/history');
  }

  /**
   * Get trash summary (statistics)
   */
  async getTrashSummary() {
    return this.request('/api/v1/trash/summary');
  }

  /**
   * Get latest trash detection
   */
  async getLatestDetection() {
    return this.request('/api/v1/trash/latest');
  }

  // ==================== REWARD ENDPOINTS ====================

  /**
   * Get semua rewards
   */
  async getAllRewards() {
    return this.request('/api/v1/rewards');
  }

  /**
   * Redeem reward
   */
  async redeemReward(rfidUid, rewardId, quantity = 1) {
    return this.request('/api/v1/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify({
        rfid_uid: rfidUid,
        reward_id: rewardId,
        quantity: quantity,
      }),
    });
  }

  /**
   * Get redemption history
   */
  async getRedemptionHistory(rfidUid) {
    return this.request(`/api/v1/rewards/history/${rfidUid}`);
  }

  /**
   * Create/register user
   */
  async createUser(payload) {
    return this.request('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export for testing with different base URL
export default ApiClient;
