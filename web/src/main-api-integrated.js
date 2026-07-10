/**
 * UPDATED MAIN.JS - Backend API Integration
 * Connects Frontend with Backend API & MySQL Database
 * 
 * This version replaces mock data with real API calls
 * and properly integrates with the database through the Backend
 */

import './index.css';
import { integrationManager } from './services/integration.js';
import { syncUserDataFromBackend, submitWasteAndUpdateState, redeemRewardAndUpdateState } from './services/stateSync.js';
import { apiClient } from './services/api.js';

// ==================== CONSTANTS ====================

const WASTE_VALUATIONS = {
  'Plastik': { pointsPerKg: 100, moneyPerKg: 10000, icon: 'droplet' },
  'Kaleng': { pointsPerKg: 250, moneyPerKg: 25000, icon: 'zap' },
  'Kertas': { pointsPerKg: 50, moneyPerKg: 5000, icon: 'file-text' },
  'Kaca': { pointsPerKg: 100, moneyPerKg: 10000, icon: 'glass-water' },
  'Elektronik': { pointsPerKg: 200, moneyPerKg: 20000, icon: 'cpu' },
  'Lainnya': { pointsPerKg: 90, moneyPerKg: 9000, icon: 'help-circle' }
};

function wholeNumber(value) {
  return String(Math.round(Number(value || 0)));
}

const IMPACT_CATALOG = {
  co2: {
    title: 'Estimasi Emisi Karbon Terpotong Berkelanjutan',
    desc: 'Setiap sampah plastik yang didaur ulang menghindari kontribusi emisi karbon dioksida sirkular.',
    tagline: 'MENGURANGI KARBON DIOKSIDA',
    icon: 'cloud-rain',
    colorClass: 'bg-orange-600',
    getValue: (stats) => wholeNumber(stats.impact.co2Saved),
    subText: 'Setara emisi berkendara mobil bensin sejauh 342 Km'
  },
  energy: {
    title: 'Hemat Listrik Rumah Tangga Terakreditasi',
    desc: 'Siklus daur ulang material organik & aluminium menghemat energi pemurnian bijih logam baru.',
    tagline: 'LISTRIK TERHEMATKAN',
    icon: 'zap',
    colorClass: 'bg-amber-500',
    getValue: (stats) => wholeNumber(stats.impact.energySaved),
    subText: 'Setara dengan menyalakan lampu LED 10W selama 19.540 jam'
  },
  water: {
    title: 'Volume Air Konsumsi Terlindungi',
    desc: 'Bebas polusi mikroplastik harian melindungi suplai air bawah tanah perkotaan masa kini.',
    tagline: 'AIR BERSIH TERSELAMATKAN',
    icon: 'droplet',
    colorClass: 'bg-sky-600',
    getValue: (stats) => wholeNumber(stats.impact.waterSaved),
    subText: 'Setara dengan menyelamatkan 720 galon air minum'
  },
  landfill: {
    title: 'Sampah Fisik TPA Sukses Dialihkan',
    desc: 'Upaya pemilahan sampah mandiri mencegah overload di Tempat Pembuangan Akhir (TPA) regional.',
    tagline: 'MATERIAL TERDAUR ULANG',
    icon: 'trash-2',
    colorClass: 'bg-emerald-600',
    getValue: (stats) => wholeNumber(stats.impact.landfillDiverted),
    subText: 'Bobot material sampah langsung masuk industri sirkular'
  }
};

// ==================== APPLICATION STATE ====================

const state = {
  isLoggedIn: false,
  profile: {},
  stats: {},
  history: [],
  rewards: [],
  redeemedRewards: [],
  activeTab: 'home',
  rewardSubtab: 'catalog',
  selectedRewardCategory: 'All',
  selectedImpactCategory: 'co2',
  depositTypeSelected: 'Plastik',
  isLoading: false,
  error: null,
};

// ==================== APP INITIALIZATION ====================

window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Try to restore session from localStorage
    const restoredUser = integrationManager.restoreSessionFromStorage();
    
    if (restoredUser) {
      // User was logged in, restore session
      console.log('Restoring previous session...');
      await loadUserData(restoredUser.rfid_uid);
      showMainApp();
    } else {
      // Show login screen
      console.log('No session found, showing login screen...');
      showLoginScreen();
    }
  } catch (error) {
    console.error('App initialization error:', error);
    showError('Gagal menginisialisasi aplikasi. Silakan coba lagi.');
    showLoginScreen();
  }
});

// ==================== LOGIN FLOW ====================

function showLoginScreen() {
  const mainContent = document.querySelector('body');
  
  // Check if login screen already exists
  let loginScreen = document.getElementById('login-screen-wrapper');
  if (!loginScreen) {
    loginScreen = document.createElement('div');
    loginScreen.id = 'login-screen-wrapper';
    loginScreen.className = 'fixed inset-0 bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center z-50';
    
    loginScreen.innerHTML = `
      <div class="w-full max-w-sm mx-auto px-4">
        <div class="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          <!-- Header -->
          <div class="text-center space-y-2">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl">
              <i data-lucide="leaf" class="w-8 h-8 text-emerald-600"></i>
            </div>
            <h1 class="text-2xl font-bold text-slate-800">Smart Waste</h1>
            <p class="text-slate-500 text-sm">Masukkan RFID UID Anda</p>
          </div>

          <!-- Login Form -->
          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">RFID UID</label>
              <input 
                type="text" 
                id="rfid-uid-input" 
                placeholder="Contoh: rfid_123456" 
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                required
              />
            </div>

            <button 
              type="submit" 
              id="login-btn"
              class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <span id="login-btn-text">Login</span>
              <i data-lucide="arrow-right" class="w-4 h-4 hidden" id="login-spinner"></i>
            </button>
          </form>

          <!-- Error Message -->
          <div id="login-error-message" class="hidden p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium"></div>

          <!-- Demo Info -->
          <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs font-medium">
            <p>💡 <strong>Demo:</strong> Gunakan RFID UID apapun untuk login (akan dibuat di database jika belum ada)</p>
          </div>
        </div>
      </div>
    `;
    
    mainContent.appendChild(loginScreen);
  }

  loginScreen.classList.remove('hidden');
  
  // Setup login form handler
  const loginForm = document.getElementById('login-form');
  const rfidInput = document.getElementById('rfid-uid-input');
  const loginBtn = document.getElementById('login-btn');
  
  rfidInput.focus();
  
  loginForm.addEventListener('submit', handleLogin);
  
  // Refresh Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function handleLogin(e) {
  e.preventDefault();
  
  const rfidUid = document.getElementById('rfid-uid-input').value.trim();
  const loginBtn = document.getElementById('login-btn');
  const loginBtnText = document.getElementById('login-btn-text');
  const errorMsg = document.getElementById('login-error-message');
  
  if (!rfidUid) {
    showLoginError('RFID UID tidak boleh kosong');
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Sedang login...';

    // Try to login/authenticate with backend
    const user = await integrationManager.initializeUserSession(rfidUid);
    console.log('Login successful:', user);

    // Load user data
    await loadUserData(rfidUid);

    // Close login screen and show main app
    const loginScreen = document.getElementById('login-screen-wrapper');
    if (loginScreen) loginScreen.classList.add('hidden');

    showMainApp();
    initEventListeners();
    renderAll();

  } catch (error) {
    console.error('Login error:', error);
    showLoginError(error.message || 'Login gagal. Periksa RFID UID Anda.');
    loginBtn.disabled = false;
    loginBtnText.textContent = 'Login';
  }
}

function showLoginError(message) {
  const errorMsg = document.getElementById('login-error-message');
  if (errorMsg) {
    errorMsg.textContent = message;
    errorMsg.classList.remove('hidden');
    setTimeout(() => {
      errorMsg.classList.add('hidden');
    }, 5000);
  }
}

function showMainApp() {
  state.isLoggedIn = true;
  const mainContent = document.getElementById('main-app-container');
  if (mainContent) {
    mainContent.classList.remove('hidden');
  }
}

// ==================== DATA LOADING ====================

async function loadUserData(rfidUid) {
  try {
    state.isLoading = true;
    
    console.log('Syncing user data from backend...');
    
    // Fetch all data from backend
    const syncedData = await syncUserDataFromBackend(rfidUid);
    
    // Update state
    state.profile = syncedData.profile;
    state.stats = syncedData.stats;
    state.history = syncedData.history || [];
    state.rewards = syncedData.rewards || [];
    
    console.log('User data synced successfully');
  } catch (error) {
    console.error('Error loading user data:', error);
    showError('Gagal memuat data pengguna. ' + error.message);
    throw error;
  } finally {
    state.isLoading = false;
  }
}

// ==================== EVENT LISTENERS ====================

function initEventListeners() {
  // Navigation
  document.querySelectorAll('#desktop-nav [data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.getAttribute('data-tab');
      if (target) switchTab(target);
    });
  });

  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabText = e.currentTarget.querySelector('span')?.textContent;
      if (tabText === 'Beranda') switchTab('home');
      else if (tabText === 'Riwayat') switchTab('history');
      else if (tabText === 'Reward') switchTab('rewards');
      else if (tabText === 'Profil') switchTab('profile');
    });
  });

  // History search
  const searchInput = document.getElementById('history-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', updateHistoryTable);
  }

  const filterSelect = document.getElementById('history-type-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', updateHistoryTable);
  }

  // Calculator
  document.querySelectorAll('#calculator-buttons button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selectedId = e.currentTarget.getAttribute('data-impact');
      if (selectedId) {
        state.selectedImpactCategory = selectedId;
        updateCalculatorDisplay();
      }
    });
  });

  // Deposit modal type selector
  document.querySelectorAll('#deposit-type-selector button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selectedVal = e.currentTarget.getAttribute('data-val');
      if (selectedVal) {
        state.depositTypeSelected = selectedVal;
        
        document.querySelectorAll('#deposit-type-selector button').forEach(b => {
          b.className = 'dep-selector-btn p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 font-semibold text-center transition-all cursor-pointer border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50';
        });

        const activeBtn = e.currentTarget;
        activeBtn.className = 'dep-selector-btn p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 font-semibold text-center transition-all cursor-pointer border-emerald-500 bg-emerald-50/40 text-emerald-700';
        
        recalculateFormEstimates();
      }
    });
  });

  // Deposit weight slider
  const sliderInput = document.getElementById('deposit-weight-input');
  if (sliderInput) {
    sliderInput.addEventListener('input', recalculateFormEstimates);
  }

  // Reward subtabs
  document.querySelectorAll('#reward-view-tabs button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetSub = e.currentTarget.getAttribute('data-subtab');
      if (targetSub) {
        state.rewardSubtab = targetSub;
        
        document.querySelectorAll('#reward-view-tabs button').forEach(b => {
          b.className = 'px-4 py-2 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer';
        });

        const activeSubBtn = e.currentTarget;
        activeSubBtn.className = 'px-4 py-2 rounded-lg bg-white text-slate-800 shadow-sm cursor-pointer';

        if (targetSub === 'catalog') {
          document.getElementById('reward-subview-catalog')?.classList.remove('hidden');
          document.getElementById('reward-subview-history')?.classList.add('hidden');
        } else {
          document.getElementById('reward-subview-catalog')?.classList.add('hidden');
          document.getElementById('reward-subview-history')?.classList.remove('hidden');
        }
      }
    });
  });

  // Reward categories
  document.querySelectorAll('#reward-category-filter button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = e.currentTarget.getAttribute('data-cat');
      if (cat) {
        state.selectedRewardCategory = cat;
        
        document.querySelectorAll('#reward-category-filter button').forEach(b => {
          b.className = 'reward-cat-btn px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer bg-white text-slate-500 border border-slate-200/60 hover:text-slate-700';
        });

        const activeCatBtn = e.currentTarget;
        activeCatBtn.className = 'reward-cat-btn px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer bg-slate-800 text-white shadow-sm shadow-slate-900/10';

        renderRewardCatalog();
      }
    });
  });

  // Profile form
  const formProfile = document.getElementById('profile-edit-form');
  if (formProfile) {
    formProfile.addEventListener('submit', handleProfileUpdate);
  }

  // Deposit form - UPDATED TO USE API
  const formDeposit = document.getElementById('deposit-form');
  if (formDeposit) {
    formDeposit.addEventListener('submit', handleDepositSubmit);
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// ==================== EVENT HANDLERS ====================

async function handleDepositSubmit(e) {
  e.preventDefault();
  
  const category = state.depositTypeSelected;
  const weight = parseFloat(document.getElementById('deposit-weight-input').value);
  const location = document.getElementById('deposit-location-input').value;
  const rfidUid = state.profile.rfidUid;

  if (!category || !weight || !location) {
    showError('Semua field harus diisi');
    return;
  }

  try {
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sedang memproses...';

    // Submit ke Backend via API
    const transaction = await submitWasteAndUpdateState(rfidUid, category, weight, location);

    // Update state
    state.history.unshift(transaction);
    state.stats.totalPoints += transaction.points;
    state.stats.totalBalance += transaction.earnedAmount;
    state.stats.totalWeight += transaction.weight;

    // Update impact calculations
    state.stats.impact.co2Saved = state.stats.totalWeight * 2.4;
    state.stats.impact.energySaved = state.stats.totalWeight * 5.6;
    state.stats.impact.waterSaved = Math.round(state.stats.totalWeight * 15.6);
    state.stats.impact.landfillDiverted = state.stats.totalWeight;

    // Close modal
    closeDepositModal();
    
    // Show success ticket
    showSuccessTicket(transaction);
    
    // Re-render
    renderAll();

    submitBtn.disabled = false;
    submitBtn.textContent = 'Setor Sampah';

  } catch (error) {
    console.error('Deposit error:', error);
    showError('Gagal menyetorkan sampah: ' + error.message);
  }
}

function handleProfileUpdate(e) {
  e.preventDefault();
  const newName = document.getElementById('profile-input-name').value;
  const newEmail = document.getElementById('profile-input-email').value;
  
  if (!newName || !newEmail) {
    showError('Nama dan email tidak boleh kosong');
    return;
  }

  state.profile.name = newName;
  state.profile.email = newEmail;
  
  renderTopProfiles();
  showSuccess('Profil berhasil diperbaharui!');
}

function handleLogout() {
  if (confirm('Apakah Anda yakin ingin logout?')) {
    integrationManager.clearSession();
    state.isLoggedIn = false;
    
    const mainApp = document.getElementById('main-app-container');
    if (mainApp) mainApp.classList.add('hidden');
    
    showLoginScreen();
  }
}

// ==================== UI RENDERING ====================

export function switchTab(tabId) {
  state.activeTab = tabId;

  // Hide/show sections
  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.add('hidden');
  });
  const activeSection = document.getElementById(`view-${tabId}`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }

  // Update navigation styling
  document.querySelectorAll('#desktop-nav [data-tab]').forEach(btn => {
    btn.className = 'nav-btn px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100/60';
  });
  
  const activeBtn = document.querySelector(`#desktop-nav [data-tab="${tabId}"]`);
  if (activeBtn) {
    activeBtn.className = 'nav-btn px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 bg-emerald-50 text-emerald-700';
  }

  // Mobile navigation
  const mobileButtons = document.querySelectorAll('.mobile-nav-btn');
  mobileButtons.forEach(btn => {
    btn.className = 'mobile-nav-btn flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-800 text-[10px] font-bold';
  });

  let indexToHighlight = 0;
  if (tabId === 'history') indexToHighlight = 1;
  else if (tabId === 'rewards') indexToHighlight = 2;
  else if (tabId === 'profile') indexToHighlight = 3;

  if (mobileButtons[indexToHighlight]) {
    mobileButtons[indexToHighlight].className = 'mobile-nav-btn flex flex-col items-center gap-0.5 text-emerald-600 text-[10px] font-bold';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Tab-specific rendering
  if (tabId === 'home') {
    renderChart();
  } else if (tabId === 'history') {
    updateHistoryTable();
  } else if (tabId === 'rewards') {
    renderRewardCatalog();
    updateRewardHistoryTable();
  } else if (tabId === 'profile') {
    renderProfileView();
  }
}

function renderAll() {
  renderTopProfiles();
  renderHomeStats();
  updateCalculatorDisplay();
  renderChart();
  updateRecentHistoryHome();
  renderProfileView();
}

function renderTopProfiles() {
  document.getElementById('header-user-name').textContent = state.profile.name || 'User';
  document.getElementById('header-user-pic').src = state.profile.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  document.getElementById('header-user-tier').textContent = state.profile.memberTier || 'Bronze';

  const pName = document.getElementById('profile-input-name');
  const pEmail = document.getElementById('profile-input-email');
  const pDate = document.getElementById('profile-input-date');
  
  if (pName) pName.value = state.profile.name || '';
  if (pEmail) pEmail.value = state.profile.email || '';
  if (pDate) pDate.value = state.profile.joinedDate || new Date().toISOString().split('T')[0];

  const profileTitle = document.getElementById('profile-name-title');
  const profilePicLarge = document.getElementById('profile-pic-large');
  if (profileTitle) profileTitle.textContent = state.profile.name || 'User';
  if (profilePicLarge) profilePicLarge.src = state.profile.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
}

function renderHomeStats() {
  document.getElementById('stat-points').textContent = wholeNumber(state.stats.totalPoints);
  document.getElementById('stat-weight').textContent = wholeNumber(state.stats.totalWeight);
  document.getElementById('stat-balance').textContent = `Rp ${Math.round(Number(state.stats.totalBalance || 0)).toLocaleString('id-ID')}`;
  document.getElementById('stat-co2').textContent = wholeNumber(state.stats.impact?.co2Saved);

  document.getElementById('hero-user-name').textContent = state.profile.name || 'User';
  document.getElementById('hero-user-level').textContent = String(state.stats.level || 1);
  
  const nextLevel = state.stats.nextLevelPoints || 1000;
  const levelProgressPercentage = Math.round(((state.stats.totalPoints || 0) / nextLevel) * 100);
  document.getElementById('hero-progress-text').textContent = `${state.stats.totalPoints || 0} / ${nextLevel} Pts (${levelProgressPercentage}%)`;
  document.getElementById('hero-progress-bar').style.width = `${levelProgressPercentage}%`;

  const badgeEarned = document.getElementById('stat-points-badge');
  const profBadge = document.getElementById('profile-tier-badge');
  if (badgeEarned) badgeEarned.textContent = `${state.stats.level || 1} Tier`;
  if (profBadge) {
    profBadge.textContent = state.profile.memberTier || 'Bronze';
    profBadge.className = 'px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 uppercase tracking-widest font-mono select-none';
  }

  const rPoints = document.getElementById('reward-points-balance');
  if (rPoints) rPoints.textContent = `${state.stats.totalPoints || 0} Pts`;

  const targetNeeded = 400;
  const targetPercent = Math.min(100, Math.round(((state.stats.totalPoints || 0) / targetNeeded) * 100));
  const pbTarget = document.getElementById('target-reward-progress-bar');
  if (pbTarget) pbTarget.style.width = `${targetPercent}%`;

  setTimeout(() => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 50);
}

function updateCalculatorDisplay() {
  const selected = state.selectedImpactCategory;
  const config = IMPACT_CATALOG[selected];

  document.querySelectorAll('#calculator-buttons button').forEach(btn => {
    const actId = btn.getAttribute('data-impact');
    if (actId === selected) {
      btn.className = 'impact-calc-btn py-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20';
    } else {
      btn.className = 'impact-calc-btn py-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer bg-transparent border-white/5 text-slate-400 hover:bg-white/5';
    }
  });

  const titleEl = document.getElementById('calc-tagline');
  const iconWrapper = document.getElementById('calc-icon-wrapper');
  const valEl = document.getElementById('calc-value');
  const subEl = document.getElementById('calc-sub');
  const descEl = document.getElementById('calc-desc');

  if (titleEl) titleEl.textContent = config.tagline;
  if (valEl) valEl.textContent = config.getValue(state.stats);
  if (subEl) subEl.textContent = config.title;
  if (descEl) descEl.textContent = config.desc;

  if (iconWrapper) {
    iconWrapper.className = `p-3 rounded-2xl ${config.colorClass} text-white shadow-md`;
    iconWrapper.innerHTML = `<i data-lucide="${config.icon}" class="w-6 h-6"></i>`;
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function recalculateFormEstimates() {
  const category = state.depositTypeSelected;
  const weightInput = document.getElementById('deposit-weight-input');
  const labelVal = document.getElementById('deposit-weight-label');
  
  if (weightInput && labelVal) {
    const weight = parseFloat(weightInput.value);
    labelVal.textContent = wholeNumber(weight);

    const valObj = WASTE_VALUATIONS[category];
    const pointsEst = Math.round(weight * valObj.pointsPerKg);
    const moneyEst = Math.round(weight * valObj.moneyPerKg);

    document.getElementById('deposit-points-est').textContent = `+${pointsEst} Pts`;
    document.getElementById('deposit-rupiah-est').textContent = `Rp ${moneyEst.toLocaleString('id-ID')}`;
  }
}

function renderChart() {
  const container = document.getElementById('chart-bars-container');
  if (!container) return;

  const bars = container.querySelectorAll('.visual-bar-item');
  bars.forEach(b => b.remove());

  if (state.history.length === 0) {
    container.innerHTML = '<p class="col-span-full text-center text-slate-400 py-8">Belum ada data deposit</p>';
    return;
  }

  // Get last 7 days or available history
  const weekData = state.history.slice(0, 7);
  const maxWeight = Math.max(...weekData.map(d => d.weight));

  weekData.forEach((dayData) => {
    const percentHeight = (dayData.weight / maxWeight) * 85;

    const barWrapper = document.createElement('div');
    barWrapper.className = 'visual-bar-item flex-1 flex flex-col items-center group relative h-full justify-end';
    barWrapper.innerHTML = `
      <div class="absolute bottom-full mb-2 bg-slate-800 text-white font-mono text-[9px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 select-none pointer-events-none whitespace-nowrap">
        ${wholeNumber(dayData.weight)} • +${wholeNumber(dayData.points)} Pts
      </div>
      <div class="w-full sm:w-10 max-w-[40px] rounded-t-lg bg-emerald-500 hover:bg-emerald-600 transition-all duration-300 cursor-pointer relative shadow-sm" style="height: ${percentHeight}%">
        <span class="absolute top-1 inset-x-0 text-center text-[8px] sm:text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity font-mono">${dayData.weight.toFixed(1)}</span>
      </div>
    `;

    container.appendChild(barWrapper);
  });
}

function updateRecentHistoryHome() {
  const tbody = document.getElementById('home-history-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const subset = state.history.slice(0, 3);

  if (subset.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="7" class="p-4 text-center text-slate-400">Belum ada riwayat deposit</td>';
    tbody.appendChild(emptyRow);
    return;
  }

  subset.forEach(item => {
    const row = document.createElement('tr');
    row.className = 'border-b border-slate-100/60 hover:bg-slate-50/50 transition-colors font-medium text-slate-700';
    row.innerHTML = `
      <td class="p-4 sm:p-5 font-mono text-emerald-600 font-bold">${item.id}</td>
      <td class="p-4 sm:p-5">
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>${item.type}</span>
        </span>
      </td>
      <td class="p-4 sm:p-5 font-mono font-bold">${wholeNumber(item.weight)}</td>
      <td class="p-4 sm:p-5 text-emerald-600 font-mono font-bold">+${item.points}</td>
      <td class="p-4 sm:p-5 font-mono text-slate-800">Rp ${item.earnedAmount.toLocaleString('id-ID')}</td>
      <td class="p-4 sm:p-5 font-mono text-slate-400">${item.date}</td>
      <td class="p-4 sm:p-5 text-right">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest font-mono select-none">Berhasil</span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function updateHistoryTable() {
  const tbody = document.getElementById('history-table-tbody');
  if (!tbody) return;

  const searchQuery = document.getElementById('history-search-input')?.value.toLowerCase() || '';
  const typeFilter = document.getElementById('history-type-filter')?.value || 'Semua';

  tbody.innerHTML = '';

  const filtered = state.history.filter(item => {
    const matchesSearch = String(item.id || '').toLowerCase().includes(searchQuery)
      || String(item.location || '').toLowerCase().includes(searchQuery);
    const matchesType = typeFilter === 'Semua' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (filtered.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="8" class="text-center p-8 text-slate-400 font-semibold">Tidak ditemukan riwayat penyetoran</td>';
    tbody.appendChild(emptyRow);
    return;
  }

  filtered.forEach(item => {
    const row = document.createElement('tr');
    row.className = 'border-b border-slate-100 hover:bg-slate-50/55 transition-colors font-semibold text-slate-700';
    row.innerHTML = `
      <td class="p-4 font-mono text-emerald-600 font-bold">${item.id}</td>
      <td class="p-4 font-mono text-slate-400">${item.date}</td>
      <td class="p-4">
        <span class="inline-flex items-center gap-1.5 text-slate-800 font-bold">
          <i data-lucide="${WASTE_VALUATIONS[item.type]?.icon || 'help-circle'}" class="w-4 h-4 text-emerald-500"></i>
          <span>${item.type}</span>
        </span>
      </td>
      <td class="p-4 font-mono font-black">${wholeNumber(item.weight)}</td>
      <td class="p-4 font-mono text-emerald-600 font-black">+${item.points} Pts</td>
      <td class="p-4 font-mono text-slate-800">Rp ${item.earnedAmount.toLocaleString('id-ID')}</td>
      <td class="p-4 text-slate-500 font-medium truncate max-w-[140px]">${item.location}</td>
      <td class="p-4 text-right">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest font-mono">Berhasil</span>
      </td>
    `;
    tbody.appendChild(row);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderRewardCatalog() {
  const grid = document.getElementById('rewards-catalog-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const catFilter = state.selectedRewardCategory;
  const filtered = state.rewards.filter(item => {
    return catFilter === 'All' || item.category === catFilter;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center text-slate-400 py-8">Tidak ada reward tersedia</p>';
    return;
  }

  filtered.forEach(item => {
    const affordable = state.stats.totalPoints >= item.pointsRequired;

    const card = document.createElement('div');
    card.className = `relative overflow-hidden rounded-2xl bg-white border border-slate-150 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg group ${
      !affordable ? 'opacity-70' : 'hover:border-emerald-500/30'
    }`;

    card.innerHTML = `
      <div class="space-y-4">
        <div class="flex justify-between items-start">
          <div class="p-3 rounded-xl shrink-0 ${affordable ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}">
            <i data-lucide="${item.icon || 'gift'}" class="w-5 h-5"></i>
          </div>
          <span class="font-mono text-[10px] font-black uppercase tracking-widest ${affordable ? 'text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-500/10' : 'text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full'}">
            ${item.category}
          </span>
        </div>
        
        <div class="space-y-1">
          <h4 class="text-xs font-extrabold text-slate-400 uppercase tracking-wide">Reward</h4>
          <h3 class="text-sm font-extrabold text-slate-800 tracking-tight leading-snug group-hover:text-emerald-700 transition-colors">${item.name}</h3>
          <p class="text-[11px] text-slate-400 font-medium leading-relaxed">${item.description}</p>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
        <div>
          <p class="text-[9px] font-bold text-slate-400 tracking-wider">KLAIM DENGAN</p>
          <p class="text-sm font-mono font-extrabold text-emerald-600">${item.pointsRequired} Pts</p>
        </div>
        
        <button data-redeem-id="${item.id}" class="redeem-action-btn flex items-center space-x-1 px-3.5 py-2.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer ${
          affordable
            ? 'bg-slate-800 hover:bg-emerald-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }" ${!affordable ? 'disabled' : ''}>
          <span>Tukarkan</span>
        </button>
      </div>
    `;

    card.querySelector('.redeem-action-btn')?.addEventListener('click', async () => {
      await redeemRewardItemAPI(item);
    });

    grid.appendChild(card);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function redeemRewardItemAPI(item) {
  if (state.stats.totalPoints < item.pointsRequired) {
    showError('Eco Points Anda belum mencukupi untuk klaim reward ini.');
    return;
  }

  const confirmRedeem = confirm(`Apakah Anda yakin ingin menukarkan ${item.pointsRequired} Eco Pts dengan ${item.name}?`);
  if (!confirmRedeem) return;

  try {
    // Call API to redeem reward
    const result = await redeemRewardAndUpdateState(
      state.profile.rfidUid,
      item.id,
      1
    );

    // Update state
    state.stats.totalPoints = result.remainingPoints;

    // Add to history
    state.redeemedRewards.unshift({
      id: `RDM-${Math.floor(10000 + Math.random() * 90000)}`,
      rewardTitle: item.name,
      category: item.category,
      pointsDeducted: item.pointsRequired,
      date: new Date().toISOString().split('T')[0],
      status: 'Berhasil',
      code: `${item.category.slice(0, 2).toUpperCase()}-ECO-${Math.floor(100000 + Math.random() * 900000)}`
    });

    renderAll();
    showSuccess(`Suksess! Anda berhasil meng klaim ${item.name}.`);

    // Pivot to history
    const claimHistoryBtn = document.querySelector('[data-subtab="history"]');
    if (claimHistoryBtn) claimHistoryBtn.click();

  } catch (error) {
    console.error('Redeem error:', error);
    showError('Gagal menukarkan reward: ' + error.message);
  }
}

function updateRewardHistoryTable() {
  const tbody = document.getElementById('redeemed-history-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (state.redeemedRewards.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="7" class="p-4 text-center text-slate-400">Belum ada reward yang diklaim</td>';
    tbody.appendChild(emptyRow);
    return;
  }

  state.redeemedRewards.forEach(item => {
    const row = document.createElement('tr');
    row.className = 'border-b border-slate-100 hover:bg-slate-50/50 transition-colors font-semibold text-slate-700';
    row.innerHTML = `
      <td class="p-4 font-mono text-emerald-600 font-extrabold">${item.id}</td>
      <td class="p-4 font-bold text-slate-800">${item.rewardTitle}</td>
      <td class="p-4 text-slate-500 font-medium">${item.category}</td>
      <td class="p-4 font-mono text-slate-400">${item.date}</td>
      <td class="p-4 font-mono text-orange-600 font-bold">-${item.pointsDeducted} Pts</td>
      <td class="p-4 text-center">
        <span class="inline-block bg-slate-100 font-mono text-slate-700 px-3 py-1 rounded-lg border border-slate-200 text-[11px] select-all cursor-copy">${item.code}</span>
      </td>
      <td class="p-4 text-right">
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest font-mono select-none">Berhasil</span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderProfileView() {
  const badgeContainer = document.getElementById('profile-badges-container');
  if (!badgeContainer) return;

  badgeContainer.innerHTML = '';

  const badges = [
    { title: 'Inisiasi Sirkular Hijau', requiredWeight: 2, icon: 'shield-check', desc: 'Telah mendaur ulang minimal 2 item sampah fisik.' },
    { title: 'Konservasi Mangrove', requiredWeight: 15, icon: 'sprout', desc: 'Telah mendaur ulang minimal 15 item sampah berkelanjutan.' },
    { title: 'Pioneer Netral Carbon', requiredWeight: 30, icon: 'shield-alert', desc: 'Telah mendaur ulang minimal 30 item sampah.' },
    { title: 'Eco Overlord', requiredWeight: 50, icon: 'award', desc: 'Menyelamatkan minimal 50 item sampah keras.' }
  ];

  badges.forEach(badge => {
    const unlocked = (state.stats.totalWeight || 0) >= badge.requiredWeight;
    
    const card = document.createElement('div');
    card.className = `flex items-start space-x-3.5 p-4 rounded-2xl border transition-all ${
      unlocked
        ? 'bg-emerald-500/[0.03] border-emerald-500/20 text-emerald-950'
        : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
    }`;

    card.innerHTML = `
      <div class="p-2.5 rounded-xl shrink-0 ${unlocked ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}">
        <i data-lucide="${badge.icon}" class="w-5 h-5"></i>
      </div>
      <div class="space-y-0.5">
        <h4 class="text-xs font-black ${unlocked ? 'text-slate-800' : 'text-slate-400'}">${badge.title}</h4>
        <p class="text-[10px] ${unlocked ? 'text-slate-500' : 'text-slate-400'} font-medium leading-normal">${badge.desc}</p>
        <p class="text-[9px] font-bold font-mono text-emerald-600 ${unlocked ? '' : 'hidden'}">✓ UNLOCKED</p>
      </div>
    `;

    badgeContainer.appendChild(card);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showSuccessTicket(transaction) {
  const ticketModal = document.getElementById('ticket-modal');
  if (ticketModal) {
    document.getElementById('ticket-id').textContent = transaction.id;
    document.getElementById('ticket-type').textContent = transaction.type;
    document.getElementById('ticket-weight').textContent = wholeNumber(transaction.weight);
    document.getElementById('ticket-location').textContent = transaction.location;
    document.getElementById('ticket-date').textContent = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'});
    document.getElementById('ticket-points').textContent = `+${transaction.points} Pts`;
    document.getElementById('ticket-reward').textContent = `Rp ${transaction.earnedAmount.toLocaleString('id-ID')}`;

    ticketModal.classList.remove('hidden');
    ticketModal.classList.add('flex');
  }
}

// ==================== UTILITY FUNCTIONS ====================

function showError(message) {
  const errorContainer = document.getElementById('app-error-message');
  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
        ${message}
      </div>
    `;
    errorContainer.classList.remove('hidden');
    setTimeout(() => {
      errorContainer.classList.add('hidden');
    }, 5000);
  } else {
    console.error(message);
  }
}

function showSuccess(message) {
  alert(message);
}

// ==================== WINDOW GLOBAL FUNCTIONS ====================

export function openDepositModal() {
  const dModal = document.getElementById('deposit-modal');
  if (dModal) {
    dModal.classList.remove('hidden');
    dModal.classList.add('flex');
    
    state.depositTypeSelected = 'Plastik';
    const slider = document.getElementById('deposit-weight-input');
    if (slider) slider.value = '2.0';
    
    recalculateFormEstimates();
  }
}

function closeDepositModal() {
  const dModal = document.getElementById('deposit-modal');
  if (dModal) {
    dModal.classList.add('hidden');
    dModal.classList.remove('flex');
  }
}

function closeTicketModal() {
  const ticketModal = document.getElementById('ticket-modal');
  if (ticketModal) {
    ticketModal.classList.add('hidden');
    ticketModal.classList.remove('flex');
  }
  switchTab('home');
}

window.switchTab = switchTab;
window.openDepositModal = openDepositModal;
window.closeDepositModal = closeDepositModal;
window.closeTicketModal = closeTicketModal;
