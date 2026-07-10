/**
 * Data management module for Bank Sampah admin.
 * Frontend state uses localStorage, business data uses backend API.
 */

import { API_BASE } from './config.js';

const STORAGE_PREFIX = 'ecotrash_admin';
const API_V1_PREFIX = '/v1';
const RFID_API_BASE = (import.meta.env.VITE_RFID_API_BASE_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');

function defaultDevices() {
  return [
    {
      id: 'DEV-1001',
      name: 'Smart Bin Utama',
      location: 'Lobby Gedung A',
      status: 'online',
      capacityKg: 120,
      currentLoadKg: 38,
      firmware: 'v1.4.2',
      serialNumber: 'SN-ET-240001',
      lastSync: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'DEV-1002',
      name: 'Smart Bin Produksi',
      location: 'Area Produksi',
      status: 'maintenance',
      capacityKg: 150,
      currentLoadKg: 112,
      firmware: 'v1.4.1',
      serialNumber: 'SN-ET-240002',
      lastSync: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'DEV-1003',
      name: 'Smart Bin Kantin',
      location: 'Kantin Karyawan',
      status: 'online',
      capacityKg: 90,
      currentLoadKg: 41,
      firmware: 'v1.4.2',
      serialNumber: 'SN-ET-240003',
      lastSync: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];
}

function storageKey(key) {
  return `${STORAGE_PREFIX}_${key}`;
}

function mapErrorMessage(status, body) {
  if (body?.detail) return body.detail;
  if (body?.message) return body.message;
  return `HTTP ${status}`;
}

async function apiJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${API_V1_PREFIX}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(mapErrorMessage(response.status, body));
  }

  return body;
}

async function rfidJson(path, options = {}) {
  let response;
  try {
    response = await fetch(`${RFID_API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    throw new Error(`RFID service tidak terhubung di ${RFID_API_BASE}`);
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(mapErrorMessage(response.status, body));
  }

  return body;
}

function number(value) {
  return Number(value || 0);
}

export const db = {
  get: (key, defaultValue) => {
    const data = localStorage.getItem(storageKey(key));
    return data ? JSON.parse(data) : defaultValue;
  },
  set: (key, value) => {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
  },
  init: () => {
    if (!localStorage.getItem(storageKey('settings'))) {
      db.set('settings', {
        storeName: 'EcoTrash Admin',
        storeEmail: 'admin@ecotrash.local',
        address: 'Bank Sampah EcoTrash Indonesia',
      });
    }
    if (!localStorage.getItem(storageKey('devices'))) {
      db.set('devices', defaultDevices());
    }
  },
  reset: () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`${STORAGE_PREFIX}_`))
      .forEach((key) => localStorage.removeItem(key));
    db.init();
  },
};

export async function authenticateAdmin(email, password) {
  return apiJson('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchCategories() {
  const categories = await apiJson('/admin/categories');
  return (Array.isArray(categories) ? categories : []).map((item) => ({
    id: item.id,
    name: item.name,
    // Backend still stores this as `price`, but semantically this is points per kg.
    point_rate: number(item.price),
    description: item.description || '',
    created_at: item.created_at || null,
  }));
}

export async function createCategory(payload) {
  const normalizedPayload = {
    ...payload,
    price: Number(payload.point_rate ?? payload.price ?? 0),
  };

  return apiJson('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(normalizedPayload),
  });
}

export async function updateCategory(categoryId, payload) {
  const normalizedPayload = {
    ...payload,
    price: Number(payload.point_rate ?? payload.price ?? 0),
  };

  return apiJson(`/admin/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(normalizedPayload),
  });
}

export async function deleteCategory(categoryId) {
  return apiJson(`/admin/categories/${categoryId}`, {
    method: 'DELETE',
  });
}

async function fetchUsersRaw() {
  const users = await apiJson('/users/');
  return Array.isArray(users) ? users : [];
}

async function fetchTrashHistoryRaw() {
  const rows = await apiJson('/trash/history');
  return Array.isArray(rows) ? rows : [];
}

export async function fetchDisposals() {
  const [rows, users] = await Promise.all([fetchTrashHistoryRaw(), fetchUsersRaw()]);
  const userMap = new Map(users.map((user) => [user.id, user]));

  return rows.map((row) => {
    const user = userMap.get(row.user_id);
    return {
      id: row.id,
      user_id: row.user_id,
      user_name: user?.nama || `User ${row.user_id}`,
      rfid_uid: user?.rfid_uid || '-',
      category: row.category,
      weight: number(row.weight),
      point: number(row.point),
      point_rate: number(row.price),
      confidence_ai: number(row.confidence_ai),
      created_at: row.created_at,
    };
  });
}

export async function fetchUsers() {
  const [users, disposals] = await Promise.all([fetchUsersRaw(), fetchDisposals()]);

  const statsByUser = new Map();
  disposals.forEach((row) => {
    const current = statsByUser.get(row.user_id) || {
      total_entries: 0,
      total_weight: 0,
      total_points: 0,
      last_active: null,
    };
    current.total_entries += 1;
    current.total_weight += number(row.weight);
    current.total_points += number(row.point);
    if (!current.last_active || new Date(row.created_at) > new Date(current.last_active)) {
      current.last_active = row.created_at;
    }
    statsByUser.set(row.user_id, current);
  });

  return users.map((user) => {
    const stats = statsByUser.get(user.id) || {
      total_entries: 0,
      total_weight: 0,
      total_points: 0,
      last_active: null,
    };
    return {
      id: user.id,
      nama: user.nama,
      username: user.username || '',
      email: user.email || '',
      rfid_uid: user.rfid_uid,
      total_point: number(user.total_point),
      saldo_reward: number(user.saldo_reward),
      total_entries: stats.total_entries,
      total_weight: stats.total_weight,
      total_points: stats.total_points,
      last_active: stats.last_active,
    };
  });
}

export async function updateUserRFID(userId, rfidUid) {
  return apiJson(`/users/${userId}/rfid`, {
    method: 'PATCH',
    body: JSON.stringify({ rfid_uid: rfidUid }),
  });
}

export async function fetchLatestRFID() {
  const result = await rfidJson('/api/rfid/latest');
  return result?.data || null;
}

export async function fetchRFIDLogs(limit = 10) {
  const result = await rfidJson('/api/rfid/logs');
  const logs = Array.isArray(result?.data) ? result.data : [];
  return logs.slice(0, limit);
}

export async function fetchDashboardStats() {
  const [summary, realtime, users, categories, disposals] = await Promise.all([
    apiJson('/dashboard/summary').catch(() => ({})),
    apiJson('/trash/stats/realtime').catch(() => ({})),
    fetchUsers(),
    fetchCategories(),
    fetchDisposals(),
  ]);

  return {
    summary,
    realtime,
    users,
    categories,
    disposals,
  };
}

export async function fetchRewards() {
  const rewards = await apiJson('/rewards/');
  return (Array.isArray(rewards) ? rewards : []).map((item) => ({
    id: item.id,
    reward_name: item.reward_name,
    required_point: number(item.required_point),
    stock: Number(item.stock || 0),
    image: item.image || '',
    created_at: item.created_at || null,
  }));
}

export async function fetchDevices() {
  return db.get('devices', defaultDevices());
}

export async function getDeviceById(deviceId) {
  const devices = await fetchDevices();
  return devices.find((device) => device.id === deviceId) || null;
}

export async function createDevice(payload) {
  const devices = await fetchDevices();
  const nextNumber = devices.length + 1001;
  const nextDevice = {
    id: payload.id?.trim() || `DEV-${nextNumber}`,
    name: payload.name,
    location: payload.location,
    status: payload.status || 'online',
    capacityKg: Number(payload.capacityKg || 0),
    currentLoadKg: Number(payload.currentLoadKg || 0),
    firmware: payload.firmware || 'v1.0.0',
    serialNumber: payload.serialNumber || `SN-ET-${Date.now()}`,
    lastSync: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  devices.push(nextDevice);
  db.set('devices', devices);
  return nextDevice;
}

export async function updateDevice(deviceId, payload) {
  const devices = await fetchDevices();
  const index = devices.findIndex((device) => device.id === deviceId);
  if (index < 0) {
    throw new Error('Perangkat tidak ditemukan');
  }

  devices[index] = {
    ...devices[index],
    ...payload,
    lastSync: payload.lastSync || new Date().toISOString(),
  };

  db.set('devices', devices);
  return devices[index];
}

export async function createReward(payload) {
  return apiJson('/admin/rewards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateReward(rewardId, payload) {
  return apiJson(`/admin/rewards/${rewardId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteReward(rewardId) {
  return apiJson(`/admin/rewards/${rewardId}`, {
    method: 'DELETE',
  });
}

export function getMonthlyDisposalSeries(disposals = []) {
  const bucket = new Map();

  disposals.forEach((row) => {
    const date = new Date(row.created_at || Date.now());
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = bucket.get(key) || { month: key, total_weight: 0, total_points: 0, total_entries: 0 };
    current.total_weight += number(row.weight);
    current.total_points += number(row.point);
    current.total_entries += 1;
    bucket.set(key, current);
  });

  return [...bucket.values()].sort((a, b) => a.month.localeCompare(b.month));
}
