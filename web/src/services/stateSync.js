/**
 * State Management - Sync with Backend
 * Maps frontend state to backend data structures
 */

import { integrationManager } from './integration.js';

/**
 * Transform backend user data to frontend state format
 */
export const transformUserToState = (backendUser) => {
  const name = backendUser.name || backendUser.nama || 'User';
  const totalPoints = backendUser.total_points ?? backendUser.total_point ?? 0;
  const totalWeight = backendUser.total_weight ?? backendUser.total_weight ?? 0;
  const totalBalance = backendUser.earned_balance ?? backendUser.saldo_reward ?? 0;

  return {
    profile: {
      name,
      email: backendUser.email || '',
      profilePic: backendUser.profile_pic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      memberTier: backendUser.tier || 'Bronze',
      joinedDate: backendUser.created_at ? new Date(backendUser.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      rfidUid: backendUser.rfid_uid || backendUser.rfidUid || '',
    },
    stats: {
      level: backendUser.level || 1,
      totalPoints,
      totalWeight,
      totalBalance,
      currentLevelPoints: backendUser.current_level_points || 0,
      nextLevelPoints: backendUser.next_level_points || 1000,
      impact: {
        co2Saved: totalWeight * 2.4,
        energySaved: totalWeight * 5.6,
        waterSaved: Math.round(totalWeight * 15.6),
        landfillDiverted: totalWeight,
      }
    }
  };
};

/**
 * Transform backend trash detection to frontend history format
 */
export const transformTrashToHistory = (backendTrash) => {
  return {
    id: backendTrash.id || `TRX-${backendTrash.trash_id}`,
    type: backendTrash.category?.name || backendTrash.category || 'Unknown',
    weight: backendTrash.weight || 0,
    points: backendTrash.points_earned ?? backendTrash.point ?? 0,
    earnedAmount: backendTrash.cash_earned ?? backendTrash.price ?? 0,
    date: (backendTrash.detected_at || backendTrash.created_at)
      ? new Date(backendTrash.detected_at || backendTrash.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    status: backendTrash.status || 'Confirmed',
    location: backendTrash.location || 'Unknown',
    confidence: backendTrash.confidence_ai || 0.95,
  };
};

/**
 * Transform backend reward to frontend format
 */
export const transformRewardToFrontend = (backendReward) => {
  return {
    id: backendReward.id || backendReward.reward_id,
    name: backendReward.name || backendReward.reward_name || 'Unknown Reward',
    description: backendReward.description || '',
    pointsRequired: backendReward.points_required || backendReward.required_point || 0,
    category: backendReward.category?.name || backendReward.category || 'Reward',
    image: backendReward.image_url || 'https://via.placeholder.com/200',
    available: backendReward.available_quantity || backendReward.stock || 0,
    impact: backendReward.impact_description || '',
  };
};

export const transformRedemptionToFrontend = (backendRedemption) => {
  const rewardName = backendRedemption.reward_name || `Reward #${backendRedemption.reward_id || '-'}`;
  return {
    id: `RDM-${backendRedemption.id}`,
    rewardTitle: rewardName,
    category: 'Reward',
    pointsDeducted: backendRedemption.total_point || 0,
    date: backendRedemption.redeemed_at
      ? new Date(backendRedemption.redeemed_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    status: backendRedemption.status || 'completed',
    code: `RED-${backendRedemption.id}`,
  };
};

/**
 * Fetch and sync all user data from backend
 */
export const syncUserDataFromBackend = async (rfidUid) => {
  try {
    // Fetch user profile
    const userData = await integrationManager.fetchUserProfile(rfidUid);
    
    // Transform to state
    const transformedState = transformUserToState(userData);
    
    // Fetch waste history
    const wasteHistory = await integrationManager.fetchWasteHistory(userData.id);
    const transformedHistory = wasteHistory.map(transformTrashToHistory);

    const totalWeightFromHistory = transformedHistory.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    transformedState.stats.totalWeight = totalWeightFromHistory;
    // Keep user totals authoritative from profile endpoint.
    // History contains gross waste deposits only and can diverge from net balance after redemptions.
    transformedState.stats.impact = {
      co2Saved: totalWeightFromHistory * 2.4,
      energySaved: totalWeightFromHistory * 5.6,
      waterSaved: Math.round(totalWeightFromHistory * 15.6),
      landfillDiverted: totalWeightFromHistory,
    };
    
    // Fetch rewards
    const rewards = await integrationManager.fetchRewardsCatalog();
    const transformedRewards = rewards.map(transformRewardToFrontend);

    // Fetch redemption history
    const redemptionHistory = await integrationManager.fetchRedemptionHistory(userData.rfid_uid);
    const transformedRedemptions = redemptionHistory.map(transformRedemptionToFrontend);
    
    return {
      profile: transformedState.profile,
      stats: transformedState.stats,
      history: transformedHistory,
      rewards: transformedRewards,
      redeemedRewards: transformedRedemptions,
      user: userData
    };
  } catch (error) {
    console.error('Error syncing user data:', error);
    throw error;
  }
};

/**
 * Submit waste deposit and update local state
 */
export const submitWasteAndUpdateState = async (rfidUid, category, weight, location = '') => {
  try {
    const result = await integrationManager.submitWasteDeposit(
      rfidUid,
      category,
      weight,
      location
    );
    
    // Return transformed transaction
    return transformTrashToHistory(result);
  } catch (error) {
    console.error('Error submitting waste:', error);
    throw error;
  }
};

/**
 * Redeem reward and update state
 */
export const redeemRewardAndUpdateState = async (rfidUid, rewardId, quantity = 1) => {
  try {
    const result = await integrationManager.redeemReward(rfidUid, rewardId, quantity);
    
    return {
      success: true,
      remainingPoints: result.remaining_points,
      redemption: result
    };
  } catch (error) {
    console.error('Error redeeming reward:', error);
    throw error;
  }
};
