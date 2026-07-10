/**
 * Data nasabah (pengganti modul customers ecommerce).
 */

import { fetchUsers, updateUserRFID, fetchLatestRFID } from './data.js';
import { icons } from './icons.js';
import { modal, renderTable, toast } from './ui.js';
import { exportToCSV } from './export.js';

function numberId(value, digits = 0) {
  return Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function wholeNumber(value) {
  return String(Math.round(Number(value || 0)));
}

function searchText(row) {
  return [
    row.nama,
    row.username,
    row.email,
    row.rfid_uid,
    row.id,
  ].join(' ').toLowerCase();
}

export const renderCustomers = async (container) => {
  const users = await fetchUsers();

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Data Nasabah</h2>
        <button id="export-users-btn" class="px-4 py-2 text-sm font-medium bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-all text-emerald-700 flex items-center gap-2 shadow-sm">
          ${icons.download} Export CSV
        </button>
      </div>

      <div class="bg-white border border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-emerald-100">
          <div class="relative max-w-md">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">${icons.search}</div>
            <input id="users-search" type="text" placeholder="Cari nama, username, email, atau RFID..." class="w-full bg-emerald-50 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-600 focus:ring-1 focus:ring-emerald-300 placeholder:text-zinc-400">
          </div>
        </div>
        <div id="users-table"></div>
      </div>
    </div>
  `;

  const table = document.getElementById('users-table');
  const searchInput = document.getElementById('users-search');

  const columns = [
    {
      key: 'nama',
      label: 'Nasabah',
      render: (value, row) => `
        <div>
          <p class="font-medium text-black">${value}</p>
          <p class="text-xs text-zinc-400">ID ${row.id} • Username ${row.username || '-'} • ${row.email || '-'}</p>
        </div>
      `,
    },
    {
      key: 'rfid_uid',
      label: 'RFID UID',
      render: (value) => value?.startsWith('pending_') ? '<span class="text-amber-600 text-xs font-semibold">Belum diassign admin</span>' : (value || '-'),
    },
    { key: 'total_entries', label: 'Total Setoran', render: (value) => wholeNumber(value) },
    { key: 'total_weight', label: 'Total Jumlah', render: (value) => wholeNumber(value) },
    { key: 'total_points', label: 'Total Poin Setoran', render: (value) => wholeNumber(value) },
    { key: 'total_point', label: 'Total Poin', render: (value) => wholeNumber(value) },
    { key: 'last_active', label: 'Aktivitas Terakhir', render: (value) => `<span class="text-xs text-zinc-500">${value ? new Date(value).toLocaleString() : '-'}</span>` },
  ];

  const renderRows = () => {
    const keyword = searchInput?.value.trim().toLowerCase() || '';
    const filtered = users.filter((row) => !keyword || searchText(row).includes(keyword));
    renderTable({
      container: table,
      data: filtered,
      columns,
      actions: (item) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-end gap-2';

        const rfidBtn = document.createElement('button');
        rfidBtn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50';
        rfidBtn.textContent = item.rfid_uid?.startsWith('pending_') ? 'Set RFID UID' : 'Edit RFID UID';
        rfidBtn.onclick = () => openRFIDModal(item, container);

        wrapper.appendChild(rfidBtn);
        return wrapper;
      },
    });
  };

  searchInput?.addEventListener('input', renderRows);
  renderRows();

  document.getElementById('export-users-btn')?.addEventListener('click', () => {
    exportToCSV(users, 'bank_sampah_users', [
      { key: 'id', label: 'User ID' },
      { key: 'nama', label: 'Nama' },
      { key: 'username', label: 'Username' },
      { key: 'email', label: 'Email' },
      { key: 'rfid_uid', label: 'RFID UID' },
      { key: 'total_entries', label: 'Total Setoran' },
      { key: 'total_weight', label: 'Total Jumlah' },
      { key: 'total_points', label: 'Total Poin Setoran' },
      { key: 'total_point', label: 'Total Poin' },
      { key: 'last_active', label: 'Aktivitas Terakhir' },
    ]);
  });
};

function openRFIDModal(user, container) {
  const content = document.createElement('div');
  content.className = 'space-y-4';
  content.innerHTML = `
    <p class="text-sm text-zinc-600">Assign UID RFID untuk <span class="font-semibold text-black">${user.nama}</span> (${user.username || '-'})</p>
    <div class="space-y-2">
      <label class="text-xs uppercase tracking-wider text-zinc-400">RFID UID</label>
      <input id="new-rfid-input" type="text" value="${user.rfid_uid?.startsWith('pending_') ? '' : (user.rfid_uid || '')}" placeholder="Contoh: rfid_123456" class="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300">
    </div>

    <div class="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-semibold text-zinc-600">Scanner RFID (Realtime 1 UID)</p>
        <span id="rfid-status" class="text-[11px] text-zinc-500">Sinkronisasi scanner...</span>
      </div>

      <p class="text-[11px] text-zinc-500">Sistem akan otomatis mengisi 1 UID terbaru. Untuk mengganti UID, klik Reset lalu tempel kartu baru.</p>

      <div class="flex flex-wrap gap-2">
        <button id="reset-rfid-capture-btn" type="button" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50">Reset Capture</button>
      </div>
    </div>

    <div class="pt-2 flex items-center justify-end gap-2">
      <button id="save-rfid-btn" type="button" class="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Simpan UID</button>
    </div>
  `;

  const instance = modal.show('Set RFID UID Nasabah', content, []);
  const input = content.querySelector('#new-rfid-input');
  const status = content.querySelector('#rfid-status');
  const resetBtn = content.querySelector('#reset-rfid-capture-btn');
  const saveBtn = content.querySelector('#save-rfid-btn');

  let pollTimer = null;
  let baselineKey = null;
  let isCaptured = false;

  const makeRFIDKey = (item) => {
    if (!item) return null;
    return `${item.uid || ''}|${item.time || ''}|${item.timestamp || ''}`;
  };

  const syncRealtimeUID = async () => {
    if (!document.body.contains(content)) {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      return;
    }

    try {
      const latest = await fetchLatestRFID();
      const key = makeRFIDKey(latest);

      if (!key) {
        if (status) status.textContent = 'Menunggu kartu RFID...';
        return;
      }

      if (!baselineKey) {
        baselineKey = key;
        if (status) status.textContent = 'Siap menerima UID baru...';
        return;
      }

      if (!isCaptured && key !== baselineKey) {
        if (input) input.value = latest.uid || '';
        isCaptured = true;
        if (status) status.textContent = `UID terkunci: ${latest.uid || '-'} (${latest.time || 'baru saja'})`;
      }
    } catch (error) {
      if (status) status.textContent = 'Scanner RFID tidak terhubung';
    }
  };

  resetBtn?.addEventListener('click', async () => {
    const latest = await fetchLatestRFID().catch(() => null);
    baselineKey = makeRFIDKey(latest);
    isCaptured = false;
    if (input) input.value = '';
    if (status) status.textContent = 'Capture direset. Tempel kartu baru...';
    toast.show('Capture UID direset', 'info');
  });

  saveBtn?.addEventListener('click', async () => {
    const nextRFID = input?.value.trim();
    if (!nextRFID) {
      toast.show('RFID UID tidak boleh kosong', 'error');
      return;
    }

    try {
      await updateUserRFID(user.id, nextRFID);
      toast.show('RFID UID berhasil diperbarui', 'success');
      if (pollTimer) clearInterval(pollTimer);
      instance.closeModal();
      await renderCustomers(container);
    } catch (error) {
      toast.show(error.message || 'Gagal menyimpan RFID UID', 'error');
    }
  });

  syncRealtimeUID();
  pollTimer = setInterval(syncRealtimeUID, 1000);
}
