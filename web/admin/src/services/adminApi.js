/**
 * Admin Dashboard API Service
 * Adapted from main web service for admin-specific endpoints
 */

import { apiClient as baseApiClient } from '../../src/services/api.js';

class AdminApiService {
  constructor(baseClient) {
    this.client = baseClient;
  }

  // ==================== DASHBOARD ENDPOINTS ====================

  /**
   * Get admin dashboard statistics
   */
  async getDashboardStats() {
    return this.client.request('/api/v1/dashboard/stats');
  }

  /**
   * Get overview of all users
   */
  async getUsersOverview() {
    return this.client.request('/api/v1/dashboard/users');
  }

  /**
   * Get trash statistics
   */
  async getTrashStats() {
    return this.client.request('/api/v1/trash/summary');
  }

  /**
   * Get rewards overview
   */
  async getRewardsOverview() {
    return this.client.request('/api/v1/dashboard/rewards');
  }

  // ==================== ADMIN MANAGEMENT ENDPOINTS ====================

  /**
   * Get all users (paginated)
   */
  async getAllUsers(page = 1, limit = 50) {
    return this.client.request(`/api/v1/users?page=${page}&limit=${limit}`);
  }

  /**
   * Get user details by ID
   */
  async getUserDetails(userId) {
    return this.client.request(`/api/v1/users/${userId}`);
  }

  /**
   * Update user information
   */
  async updateUser(userId, data) {
    return this.client.request(`/api/v1/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    return this.client.request(`/api/v1/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // ==================== REWARD MANAGEMENT ====================

  /**
   * Get all rewards with pagination
   */
  async getAllRewardsAdmin(page = 1, limit = 50) {
    return this.client.request(`/api/v1/rewards?page=${page}&limit=${limit}`);
  }

  /**
   * Create new reward
   */
  async createReward(rewardData) {
    return this.client.request('/api/v1/rewards', {
      method: 'POST',
      body: JSON.stringify(rewardData),
    });
  }

  /**
   * Update reward
   */
  async updateReward(rewardId, rewardData) {
    return this.client.request(`/api/v1/rewards/${rewardId}`, {
      method: 'PUT',
      body: JSON.stringify(rewardData),
    });
  }

  /**
   * Delete reward
   */
  async deleteReward(rewardId) {
    return this.client.request(`/api/v1/rewards/${rewardId}`, {
      method: 'DELETE',
    });
  }

  // ==================== REPORTS ====================

  /**
   * Get trash collection report
   */
  async getTrashReport(startDate, endDate) {
    return this.client.request(
      `/api/v1/reports/trash?start_date=${startDate}&end_date=${endDate}`
    );
  }

  /**
   * Get rewards redemption report
   */
  async getRewardsReport(startDate, endDate) {
    return this.client.request(
      `/api/v1/reports/rewards?start_date=${startDate}&end_date=${endDate}`
    );
  }

  /**
   * Get user activity report
   */
  async getUserActivityReport(startDate, endDate) {
    return this.client.request(
      `/api/v1/reports/users?start_date=${startDate}&end_date=${endDate}`
    );
  }

  /**
   * Export report to CSV
   */
  async exportReport(reportType, format = 'csv') {
    const response = await fetch(
      `${this.client.baseURL}/api/v1/reports/export?type=${reportType}&format=${format}`
    );
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    return response;
  }

  // ==================== SETTINGS ====================

  /**
   * Get system settings
   */
  async getSettings() {
    return this.client.request('/api/v1/admin/settings');
  }

  /**
   * Update system settings
   */
  async updateSettings(settings) {
    return this.client.request('/api/v1/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }
}

// Export singleton instance
export const adminApiService = new AdminApiService(baseApiClient);

export default AdminApiService;
