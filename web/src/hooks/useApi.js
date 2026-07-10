/**
 * Custom React Hook untuk API calls
 * Handles loading, error, dan data states
 */

import { useState, useCallback } from 'react';
import { apiClient } from '../services/api.js';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiMethod, ...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiMethod(...args);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, error };
};

/**
 * Hook untuk Auth
 */
export const useAuth = () => {
  const { execute, loading, error } = useApi();

  const login = useCallback(async (username, email) => {
    return execute(apiClient.loginWithProfile.bind(apiClient), username, email);
  }, [execute]);

  return { login, loading, error };
};

/**
 * Hook untuk User data
 */
export const useUser = () => {
  const { execute, loading, error } = useApi();

  const getUserByRFID = useCallback(async (rfidUid) => {
    return execute(apiClient.getUserByRFID.bind(apiClient), rfidUid);
  }, [execute]);

  const getLeaderboard = useCallback(async (limit = 20) => {
    return execute(apiClient.getLeaderboard.bind(apiClient), limit);
  }, [execute]);

  const getUserHistory = useCallback(async (userId) => {
    return execute(apiClient.getUserHistory.bind(apiClient), userId);
  }, [execute]);

  return { getUserByRFID, getLeaderboard, getUserHistory, loading, error };
};

/**
 * Hook untuk Trash detection
 */
export const useTrash = () => {
  const { execute, loading, error } = useApi();

  const createDetection = useCallback(async (rfidUid, category, weight, confidenceAi) => {
    return execute(
      apiClient.createTrashDetection.bind(apiClient),
      rfidUid,
      category,
      weight,
      confidenceAi
    );
  }, [execute]);

  const getHistory = useCallback(async () => {
    return execute(apiClient.getTrashHistory.bind(apiClient));
  }, [execute]);

  const getSummary = useCallback(async () => {
    return execute(apiClient.getTrashSummary.bind(apiClient));
  }, [execute]);

  const getLatestDetection = useCallback(async () => {
    return execute(apiClient.getLatestDetection.bind(apiClient));
  }, [execute]);

  return { createDetection, getHistory, getSummary, getLatestDetection, loading, error };
};

/**
 * Hook untuk Rewards
 */
export const useRewards = () => {
  const { execute, loading, error } = useApi();

  const getAllRewards = useCallback(async () => {
    return execute(apiClient.getAllRewards.bind(apiClient));
  }, [execute]);

  const redeemReward = useCallback(async (rfidUid, rewardId, quantity = 1) => {
    return execute(apiClient.redeemReward.bind(apiClient), rfidUid, rewardId, quantity);
  }, [execute]);

  const getRedemptionHistory = useCallback(async (rfidUid) => {
    return execute(apiClient.getRedemptionHistory.bind(apiClient), rfidUid);
  }, [execute]);

  return { getAllRewards, redeemReward, getRedemptionHistory, loading, error };
};
