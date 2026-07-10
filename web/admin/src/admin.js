/**
 * EcoTrash Admin Dashboard JS
 * Real-time monitoring dari hardware deteksi sampah
 */

const API = 'http://localhost:8000/api/v1';
let autoRefreshInterval = null;
let allDetections = [];
let allCategories = [];

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  fetchAll();
  startAutoRefresh();
});

function startAutoRefresh() {
  autoRefreshInterval = setInterval(fetchAll, 5000);
}

function toggleAutoRefresh(enabled) {
  if (enabled) {
    startAutoRefresh();
  } else {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

async function fetchAll() {
  const btn = document.getElementById('refresh-btn');
  btn?.classList.add('spinning');

  await Promise.allSettled([
    fetchRealtimeStats(),
    fetchDetections(),
    fetchUsers(),
    fetchCategories(),
    checkApiHealth(),
  ]);

  document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString('id-ID');
  btn?.classList.remove('spinning');
  lucide.createIcons();
}

// ==================== VIEWS ====================

window.switchView = function(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${view}`)?.classList.remove('hidden');

  document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');

  const titles = { dashboard: 'Dashboard', detections: 'Log Deteksi', users: 'Pengguna', categories: 'Kategori Sampah', hardware: 'Status Hardware' };
  document.getElementById('page-title').textContent = titles[view] || view;
};

// ==================== REALTIME STATS ====================

async function fetchRealtimeStats() {
  try {
    const res = await fetch(`${API}/trash/stats/realtime`);
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('s-total-entries').textContent = data.total_entries.toLocaleString('id-ID');
    document.getElementById('s-total-weight').textContent = `${data.total_weight.toFixed(1)} kg`;
    document.getElementById('s-total-points').textContent = data.total_points.toLocaleString('id-ID');
    document.getElementById('s-total-users').textContent = data.total_users.toLocaleString('id-ID');

    renderCategoryBars(data.category_stats, data.total_weight);
    renderLiveFeed(data.recent_logs);

    // Hardware last detection
    if (data.recent_logs.length > 0) {
      const last = data.recent_logs[0];
      const t = new Date(last.created_at + 'Z').toLocaleString('id-ID');
      const el = document.getElementById('hw-last-detect');
      if (el) el.textContent = `${last.category} - ${t}`;
    }
  } catch (e) {
    console.warn('Stats fetch error:', e.message);
  }
}

function renderCategoryBars(stats, totalWeight) {
  const container = document.getElementById('category-bars');
  if (!container) return;

  const cats = Object.entries(stats).filter(([, v]) => v.count > 0 || v.weight > 0);
  if (cats.length === 0) {
    container.innerHTML = '<div class="empty-state">Belum ada data deteksi</div>';
    return;
  }

  const maxWeight = Math.max(...cats.map(([, v]) => v.weight), 0.001);

  container.innerHTML = cats.map(([name, val]) => {
    const pct = totalWeight > 0 ? ((val.weight / totalWeight) * 100).toFixed(1) : 0;
    const barPct = (val.weight / maxWeight) * 100;
    return `
      <div class="cat-bar-item">
        <div class="cat-bar-label">
          <span class="cat-bar-name">${name} <span style="color:var(--text3);font-size:10px">(${val.count}x)</span></span>
          <span class="cat-bar-val">${val.weight.toFixed(2)} kg &nbsp;·&nbsp; ${pct}%</span>
        </div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width:${barPct}%"></div>
        </div>
      </div>`;
  }).join('');
}

function renderLiveFeed(logs) {
  const container = document.getElementById('live-feed');
  if (!container) return;
  if (!logs || logs.length === 0) {
    container.innerHTML = '<div class="empty-state">Menunggu deteksi hardware...</div>';
    return;
  }

  container.innerHTML = logs.map(log => {
    const t = new Date(log.created_at + 'Z').toLocaleTimeString('id-ID');
    const badge = getCatBadge(log.category);
    const conf = log.confidence_ai >= 1 ? log.confidence_ai.toFixed(1) : (log.confidence_ai * 100).toFixed(1);
    return `
      <div class="feed-item">
        <span class="feed-time">${t}</span>
        <span class="feed-cat">${badge} ${log.category}</span>
        <span class="feed-weight">${log.weight.toFixed(2)} kg</span>
        <span class="feed-conf">${conf}%</span>
      </div>`;
  }).join('');
}

function getCatBadge(cat) {
  const map = { Plastik: '🔵', Kaleng: '🟡', Kertas: '🟢', Kaca: '🟣', Elektronik: '⚪', Lainnya: '⚫' };
  return map[cat] || '⚫';
}

// ==================== DETECTIONS TABLE ====================

async function fetchDetections() {
  try {
    const res = await fetch(`${API}/trash/history`);
    if (!res.ok) return;
    allDetections = await res.json();
    renderDetectionsTable(allDetections);
  } catch (e) { console.warn('Detections fetch error:', e.message); }
}

function renderDetectionsTable(data) {
  const tbody = document.getElementById('detections-tbody');
  if (!tbody) return;
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text3)">Belum ada log deteksi</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(row => {
    const t = new Date(row.created_at + 'Z').toLocaleString('id-ID');
    const conf = row.confidence_ai >= 1 ? row.confidence_ai.toFixed(1) : (row.confidence_ai * 100).toFixed(1);
    const badgeClass = `badge badge-${row.category?.toLowerCase().replace(/[^a-z]/g, '') || 'default'}`;
    return `<tr>
      <td class="mono">#${row.id}</td>
      <td style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text3)">${t}</td>
      <td>user_${row.user_id}</td>
      <td><span class="${badgeClass}">${row.category}</span></td>
      <td class="mono">${row.weight.toFixed(2)} kg</td>
      <td style="color:var(--amber);font-family:'JetBrains Mono',monospace">+${row.point ?? 0}</td>
      <td style="font-family:'JetBrains Mono',monospace;color:var(--text3)">${conf}%</td>
    </tr>`;
  }).join('');
}

window.filterDetections = function() {
  const q = document.getElementById('detect-search')?.value.toLowerCase() || '';
  const filtered = allDetections.filter(d =>
    (d.category || '').toLowerCase().includes(q) ||
    String(d.user_id).includes(q) ||
    String(d.id).includes(q)
  );
  renderDetectionsTable(filtered);
};

// ==================== USERS TABLE ====================

async function fetchUsers() {
  try {
    const res = await fetch(`${API}/users`);
    if (!res.ok) return;
    const users = await res.json();
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text3)">Belum ada user terdaftar</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => {
      const t = new Date(u.created_at + 'Z').toLocaleDateString('id-ID');
      const isHw = u.rfid_uid === 'hardware_system';
      return `<tr>
        <td class="mono">#${u.id}</td>
        <td style="font-weight:700;color:var(--text)">${u.nama}${isHw ? ' <span style="font-size:10px;color:var(--text3)">[system]</span>' : ''}</td>
        <td class="mono" style="font-size:11px">${u.rfid_uid}</td>
        <td style="color:var(--amber);font-family:'JetBrains Mono',monospace">${(u.total_point ?? 0).toLocaleString('id-ID')} pts</td>
        <td style="font-size:11px;color:var(--text3)">${t}</td>
      </tr>`;
    }).join('');
  } catch (e) { console.warn('Users fetch error:', e.message); }
}

// ==================== CATEGORIES ====================

async function fetchCategories() {
  try {
    const res = await fetch(`${API}/admin/categories`);
    if (!res.ok) return;
    allCategories = await res.json();
    renderCategoriesTable(allCategories);
  } catch (e) { console.warn('Categories fetch error:', e.message); }
}

function renderCategoriesTable(cats) {
  const tbody = document.getElementById('categories-tbody');
  if (!tbody) return;
  if (!cats || cats.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text3)">Belum ada kategori. Tambahkan kategori terlebih dahulu.</td></tr>';
    return;
  }
  tbody.innerHTML = cats.map(c => `<tr>
    <td class="mono">#${c.id}</td>
    <td style="font-weight:700;color:var(--text)">${c.name}</td>
    <td style="font-family:'JetBrains Mono',monospace;color:var(--green)">${(c.price ?? 0).toLocaleString('id-ID')} pts/kg</td>
    <td style="color:var(--text3);font-size:11px">${c.description || '-'}</td>
    <td>
      <button class="btn-icon-sm" onclick="openEditCategory(${c.id})"><i data-lucide="edit-2"></i> Edit</button>
      <button class="btn-icon-sm btn-del" onclick="deleteCategory(${c.id})" style="margin-left:4px"><i data-lucide="trash-2"></i></button>
    </td>
  </tr>`).join('');
  lucide.createIcons();
}

window.openAddCategory = function() {
  document.getElementById('modal-title').textContent = 'Tambah Kategori';
  document.getElementById('cat-edit-id').value = '';
  document.getElementById('cat-name').value = '';
  document.getElementById('cat-price').value = '';
  document.getElementById('cat-desc').value = '';
  document.getElementById('category-modal').classList.remove('hidden');
  lucide.createIcons();
};

window.openEditCategory = function(id) {
  const cat = allCategories.find(c => c.id === id);
  if (!cat) return;
  document.getElementById('modal-title').textContent = 'Edit Kategori';
  document.getElementById('cat-edit-id').value = id;
  document.getElementById('cat-name').value = cat.name;
  document.getElementById('cat-price').value = cat.price;
  document.getElementById('cat-desc').value = cat.description || '';
  document.getElementById('category-modal').classList.remove('hidden');
  lucide.createIcons();
};

window.closeModal = function() {
  document.getElementById('category-modal').classList.add('hidden');
};

window.submitCategory = async function(e) {
  e.preventDefault();
  const editId = document.getElementById('cat-edit-id').value;
  const payload = {
    name: document.getElementById('cat-name').value.trim(),
    price: parseFloat(document.getElementById('cat-price').value),
    description: document.getElementById('cat-desc').value.trim() || null,
  };
  try {
    const url = editId ? `${API}/admin/categories/${editId}` : `${API}/admin/categories`;
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error((await res.json()).detail || 'Gagal');
    closeModal();
    await fetchCategories();
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.deleteCategory = async function(id) {
  if (!confirm('Hapus kategori ini?')) return;
  try {
    await fetch(`${API}/admin/categories/${id}`, { method: 'DELETE' });
    await fetchCategories();
  } catch (e) { alert('Gagal menghapus'); }
};

// ==================== HARDWARE TEST ====================

window.sendTestDetection = async function() {
  const btn = document.getElementById('test-btn');
  const resultEl = document.getElementById('test-result');
  const catName = document.getElementById('test-category').value;
  const weight = parseFloat(document.getElementById('test-weight').value);
  const rfid = document.getElementById('test-rfid').value.trim() || null;

  // Map category name to class index
  const classMap = { Plastik: 1, Kaleng: 2, Kertas: 3, Kaca: 4 };
  const classIndex = classMap[catName];

  btn.disabled = true;
  btn.textContent = 'Mengirim...';
  resultEl.className = 'test-result hidden';

  try {
    const res = await fetch(`${API}/trash/detect-hardware`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_index: classIndex, confidence_ai: 95.0, weight, rfid_uid: rfid, hardware_id: 'ADMIN-TEST', location: 'Admin Panel' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error');
    resultEl.className = 'test-result ok';
    resultEl.textContent = `✅ ${data.message} | +${data.points_earned} pts`;
    await fetchAll();
  } catch (err) {
    resultEl.className = 'test-result err';
    resultEl.textContent = `❌ ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="zap"></i> Kirim Test Deteksi';
    lucide.createIcons();
  }
};

// ==================== API HEALTH ====================

async function checkApiHealth() {
  const dot = document.getElementById('hw-dot');
  const statusText = document.getElementById('hw-status-text');
  const apiStatus = document.getElementById('hw-api-status');

  try {
    const res = await fetch(`${API}/trash/stats/realtime`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      dot?.classList.remove('offline'); dot?.classList.add('online');
      if (statusText) statusText.textContent = 'API Online';
      if (apiStatus) { apiStatus.textContent = 'Online ✅'; apiStatus.className = 'hw-item-value online'; }
    } else { throw new Error('not ok'); }
  } catch {
    dot?.classList.remove('online'); dot?.classList.add('offline');
    if (statusText) statusText.textContent = 'API Offline';
    if (apiStatus) { apiStatus.textContent = 'Offline ❌'; apiStatus.className = 'hw-item-value offline'; }
  }

  // cobaconnect status (heuristik: ada deteksi < 30 detik)
  const connectStatus = document.getElementById('hw-connect-status');
  if (connectStatus) {
    try {
      const res2 = await fetch(`${API}/trash/latest`);
      if (res2.ok) {
        const latest = await res2.json();
        const diff = (Date.now() - new Date(latest.created_at + 'Z').getTime()) / 1000;
        if (diff < 30) {
          connectStatus.textContent = 'Aktif (deteksi < 30 detik lalu) ✅';
          connectStatus.className = 'hw-item-value online';
        } else {
          connectStatus.textContent = `Terakhir ${Math.round(diff)}s lalu`;
          connectStatus.className = 'hw-item-value';
        }
      }
    } catch { connectStatus.textContent = 'Tidak ada data'; }
  }
}
