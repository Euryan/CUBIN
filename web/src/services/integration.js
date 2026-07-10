/**
 * Integration Layer - Connect Frontend State with Backend API
 * This module handles syncing between app state and backend
 */

import { apiClient } from './api.js';

class IntegrationManager {
  constructor() {
    this.currentUser = null;
    this.isLoading = false;
  }

  /**
   * Initialize user session with username + email.
   */
  async initializeUserSession(username, email) {
    try {
      this.isLoading = true;
      
      // Authenticate with backend
      const userData = await apiClient.loginWithProfile(username, email);
      this.currentUser = userData;
      
      // Store in localStorage for session persistence
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('rfidUid', userData.rfid_uid || '');
      localStorage.setItem('authProfile', JSON.stringify({ username, email }));
      
      return userData;
    } catch (error) {
      console.error('Failed to initialize user session:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Fetch user profile and stats from backend
   */
  async fetchUserProfile(rfidUid) {
    try {
      const user = await apiClient.getUserByRFID(rfidUid);
      this.currentUser = user;
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    } catch (error) {
      // RFID bisa berubah oleh admin. Jika lookup RFID lama gagal, re-auth dengan username+email.
      const authProfileRaw = localStorage.getItem('authProfile');
      const authProfile = authProfileRaw ? JSON.parse(authProfileRaw) : null;
      const fallbackUsername = this.currentUser?.username || authProfile?.username;
      const fallbackEmail = this.currentUser?.email || authProfile?.email;

      if (fallbackUsername && fallbackEmail) {
        try {
          const refreshedUser = await apiClient.loginWithProfile(fallbackUsername, fallbackEmail);
          this.currentUser = refreshedUser;
          localStorage.setItem('currentUser', JSON.stringify(refreshedUser));
          localStorage.setItem('rfidUid', refreshedUser.rfid_uid || '');
          return refreshedUser;
        } catch (refreshError) {
          console.error('Failed to refresh user profile via username/email:', refreshError);
          throw refreshError;
        }
      }

      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  }

  /**
   * Restore then refresh user session from stored credentials.
   */
  async restoreAndRefreshSession() {
    const authProfileRaw = localStorage.getItem('authProfile');
    if (!authProfileRaw) return null;

    try {
      const authProfile = JSON.parse(authProfileRaw);
      if (!authProfile?.username || !authProfile?.email) return null;
      return await this.initializeUserSession(authProfile.username, authProfile.email);
    } catch (error) {
      console.error('Failed to restore and refresh session:', error);
      return null;
    }
  }

  /**
   * Fetch leaderboard data
   */
  async fetchLeaderboard(limit = 20) {
    try {
      return await apiClient.getLeaderboard(limit);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      throw error;
    }
  }

  /**
   * Submit waste deposit to backend
   */
  async submitWasteDeposit(rfidUid, category, weight, location = '', confidenceAi = 0.95) {
    try {
      const result = await apiClient.createTrashDetection(
        rfidUid,
        category,
        weight,
        confidenceAi
      );
      
      // Update local user state with new data
      if (this.currentUser) {
        this.currentUser.total_points = result.user_points || this.currentUser.total_points;
        this.currentUser.total_weight = result.total_weight || this.currentUser.total_weight;
        this.currentUser.earned_balance = result.user_balance || this.currentUser.earned_balance;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to submit waste deposit:', error);
      throw error;
    }
  }

  /**
   * Fetch waste history for current user
   */
  async fetchWasteHistory(userId) {
    try {
      const historyData = await apiClient.getUserHistory(userId);
      return historyData.history || [];
    } catch (error) {
      console.error('Failed to fetch waste history:', error);
      throw error;
    }
  }

  /**
   * Fetch all rewards catalog
   */
  async fetchRewardsCatalog() {
    try {
      return await apiClient.getAllRewards();
    } catch (error) {
      console.error('Failed to fetch rewards catalog:', error);
      throw error;
    }
  }

  /**
   * Redeem a reward
   */
  async redeemReward(rfidUid, rewardId, quantity = 1) {
    try {
      const result = await apiClient.redeemReward(rfidUid, rewardId, quantity);
      
      // Update local user state
      if (this.currentUser) {
        this.currentUser.total_points = result.remaining_points || this.currentUser.total_points;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to redeem reward:', error);
      throw error;
    }
  }

  /**
   * Fetch redemption history for user
   */
  async fetchRedemptionHistory(rfidUid) {
    try {
      return await apiClient.getRedemptionHistory(rfidUid);
    } catch (error) {
      console.error('Failed to fetch redemption history:', error);
      throw error;
    }
  }

  /**
   * Fetch trash summary/statistics
   */
  async fetchTrashSummary() {
    try {
      return await apiClient.getTrashSummary();
    } catch (error) {
      console.error('Failed to fetch trash summary:', error);
      throw error;
    }
  }

  /**
   * Restore user session from localStorage
   */
  restoreSessionFromStorage() {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
    return null;
  }

  /**
   * Clear user session
   */
  clearSession() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rfidUid');
    localStorage.removeItem('authProfile');
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return this.currentUser !== null;
  }
}

// Export singleton instance
export const integrationManager = new IntegrationManager();

export default IntegrationManager;
