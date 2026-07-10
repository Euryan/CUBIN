/**
 * Main app entry for Bank Sampah admin frontend.
 */

import './index.css';
import { db, authenticateAdmin } from './modules/data.js';
import { icons } from './modules/icons.js';
import { toast } from './modules/ui.js';
import { renderDashboard } from './modules/dashboard.js';
import { renderProducts } from './modules/products.js';
import { renderOrders } from './modules/orders.js';
import { renderCustomers } from './modules/customers.js';
import { renderRewards } from './modules/rewards.js';
import { renderReports } from './modules/reports.js';
import { renderSettings } from './modules/settings.js';
import { renderDeviceDashboard } from './modules/device-dashboard.js';

db.init();

const app = document.getElementById('root');

const routes = {
  dashboard: renderDashboard,
  products: renderProducts,
  orders: renderOrders,
  customers: renderCustomers,
  rewards: renderRewards,
  reports: renderReports,
  'device-dashboard': renderDeviceDashboard,
  settings: renderSettings,
};

let currentRoute = 'dashboard';
let selectedDeviceId = null;

function getSettings() {
  return db.get('settings', {
    storeName: '',
    storeEmail: 'admin@ecotrash.local',
    address: 'Bank Sampah Indonesia',
  });
}

function getBrandWordmark() {
  return getSettings().storeName.toUpperCase();
}

function getBrandMonogram() {
  return 'E';
}

function getBrandLogoMarkup(sizeClass = 'w-44 h-auto') {
  return `<img src="/Logo.png" alt="Logo" class="${sizeClass} object-contain" />`;
}
function init() {
  const session = db.get('session', null);

  if (!session) {
    renderLogin();
    return;
  }

  renderLayout();
  navigateTo(currentRoute);
}

function renderLogin() {
  app.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div class="w-full max-w-md space-y-12">
        <div class="text-center space-y-4">
          <div class="mx-auto flex justify-center">${getBrandLogoMarkup()}</div>
          <p class="text-zinc-500 text-sm font-medium uppercase tracking-widest">Bank Sampah Control Room</p>
        </div>

        <div class="bg-white border border-emerald-100 rounded-3xl p-8 space-y-8 shadow-xl">
          <div class="space-y-2 text-center">
            <h2 class="text-xl font-bold text-black">Admin Sign In</h2>
            <p class="text-xs text-zinc-500">Gunakan kredensial admin backend untuk masuk</p>
          </div>
          <div class="space-y-6">
            <div class="space-y-2">
              <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email</label>
              <input type="email" id="login-email" value="admin@ecotrash.local" class="w-full bg-emerald-50/40 border-emerald-100 rounded-xl px-4 py-3 text-black focus:ring-1 focus:ring-emerald-300 transition-all outline-none">
            </div>
            <div class="space-y-2">
              <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest">Password</label>
              <input type="password" id="login-password" value="password" class="w-full bg-emerald-50/40 border-emerald-100 rounded-xl px-4 py-3 text-black focus:ring-1 focus:ring-emerald-300 transition-all outline-none">
            </div>
          </div>

          <button id="login-btn" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl active:scale-[0.98]">
            Masuk ke Dashboard
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value || '';

    try {
      const account = await authenticateAdmin(email, password);
      db.set('session', {
        user: account.name,
        email: account.email,
        role: account.role,
        source: account.source,
      });
      toast.show(`Selamat datang, ${account.name}`, 'success');
      init();
    } catch (error) {
      toast.show(error.message || 'Login gagal', 'error');
    }
  });
}

function renderLayout() {
  const settings = getSettings();
  const session = db.get('session', null) || {
    user: 'Admin Bank Sampah',
    email: 'admin@ecotrash.local',
    role: 'Waste Operations',
  };

  app.innerHTML = `
    <div class="min-h-screen bg-[linear-gradient(180deg,#f7fff9_0%,#ffffff_40%)] text-zinc-600 flex overflow-hidden">
      <aside id="sidebar" class="w-64 bg-white border-r border-emerald-100 flex flex-col transition-all duration-300 relative z-50">
<div class="h-28 px-4 flex items-center justify-center border-b border-emerald-100">
  <div class="w-full flex justify-center">
    ${getBrandLogoMarkup('w-44 h-auto')}
  </div>
</div>

        <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
          ${renderNavItem('dashboard', 'Home', icons.dashboard)}
          ${renderNavItem('products', 'Jenis Sampah', icons.products)}
          ${renderNavItem('orders', 'Riwayat Pembuangan', icons.orders)}
          ${renderNavItem('customers', 'Nasabah', icons.customers)}
          ${renderNavItem('rewards', 'Reward', icons.rewards)}
          ${renderNavItem('reports', 'Laporan', icons.reports)}
          <div class="pt-8 pb-2 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest sidebar-label">System</div>
          ${renderNavItem('settings', 'Settings', icons.settings)}
        </nav>

        <div class="p-4 border-t border-emerald-100">
          <button id="logout-btn" class="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
            ${icons.logout} <span class="sidebar-label">Logout</span>
          </button>
        </div>
      </aside>

      <main class="flex-1 flex flex-col min-w-0 relative">
        <header class="h-16 bg-white/80 backdrop-blur-md border-b border-emerald-100 flex items-center justify-between px-8 sticky top-0 z-40">
          <div class="flex items-center gap-4">
            <button id="toggle-sidebar" class="p-2 hover:bg-emerald-50 rounded-lg text-zinc-500 hover:text-emerald-700 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
            </button>
            <div class="relative hidden md:block">
              <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">${icons.search}</div>
              <input type="text" placeholder="Cari data nasabah, kategori, reward, atau log..." class="bg-emerald-50 border border-emerald-100 rounded-full pl-10 pr-4 py-1.5 text-xs text-zinc-600 focus:ring-1 focus:ring-emerald-300 w-80 outline-none">
            </div>
          </div>

          <div class="flex items-center gap-6">
            <div class="h-8 w-px bg-emerald-100"></div>
            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block">
                <p class="text-xs font-bold text-black">${session.user}</p>
                <p class="text-[10px] text-zinc-400">${session.role || 'Waste Operations'}</p>
              </div>
<div class="w-10 h-10 rounded-full
bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600
flex items-center justify-center
text-white font-bold text-sm
ring-2 ring-emerald-100 shadow">
    ${session.user.charAt(0).toUpperCase()}
</div>
            </div>
          </div>
        </header>

        <div id="main-content" class="flex-1 overflow-y-auto p-8 max-w-[1600px] mx-auto w-full"></div>
      </main>
    </div>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    db.set('session', null);
    toast.show('Logout berhasil', 'info');
    init();
  });

  document.getElementById('toggle-sidebar')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('w-64');
    sidebar.classList.toggle('w-20');
    document.querySelectorAll('.sidebar-label').forEach((element) => element.classList.toggle('hidden'));
  });

  document.querySelectorAll('[data-route]').forEach((element) => {
    element.addEventListener('click', (event) => {
      const route = event.currentTarget.dataset.route;
      navigateTo(route);
    });
  });
}

function renderNavItem(route, label, icon) {
  return `
    <button data-route="${route}" class="nav-item w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
      currentRoute === route
        ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]'
        : 'text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50'
    }">
      <span class="shrink-0">${icon}</span>
      <span class="sidebar-label">${label}</span>
    </button>
  `;
}

async function navigateTo(route) {
  if (!routes[route]) return;
  currentRoute = route;

  const activeRoute = route === 'device-dashboard' ? 'dashboard' : route;

  document.querySelectorAll('.nav-item').forEach((element) => {
    const current = element.dataset.route;
    if (current === activeRoute) {
      element.classList.add('bg-emerald-600', 'text-white');
      element.classList.remove('text-zinc-500', 'hover:text-emerald-700', 'hover:bg-emerald-50');
      return;
    }

    element.classList.remove('bg-emerald-600', 'text-white');
    element.classList.add('text-zinc-500', 'hover:text-emerald-700', 'hover:bg-emerald-50');
  });

  const content = document.getElementById('main-content');
  content.innerHTML = '<div class="flex items-center justify-center h-full"><div class="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div></div>';

  setTimeout(async () => {
    await routes[route](content, {
      navigateTo,
      openDeviceDashboard: (deviceId) => {
        selectedDeviceId = deviceId;
        navigateTo('device-dashboard');
      },
      getSelectedDeviceId: () => selectedDeviceId,
    });
  }, 200);
}

init();
