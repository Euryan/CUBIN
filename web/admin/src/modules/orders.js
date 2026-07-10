/**
 * Disposal History Module
 * Displays waste disposal history with user attribution and totals.
 */

import { fetchOrders } from './data.js';
import { icons } from './icons.js';
import { renderTable } from './ui.js';
import { exportToCSV } from './export.js';

function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function getSearchText(row) {
  return [
    row.id,
    row.user_name,
    row.rfid_uid,
    row.category,
    row.created_at,
  ].join(' ').toLowerCase();
}

export const renderOrders = async (container) => {
  const disposals = await fetchOrders();

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">History Pembuangan</h2>
        <div class="flex items-center gap-3">
          <button id="export-disposals-btn" class="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all text-zinc-600 flex items-center gap-2 shadow-sm">
            ${icons.download} Export CSV
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <p class="text-xs uppercase tracking-wider text-zinc-400">Total Transaksi</p>
          <p id="disposal-total-count" class="mt-1 text-2xl font-bold text-black">0</p>
        </div>
        <div class="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <p class="text-xs uppercase tracking-wider text-zinc-400">Total Berat</p>
          <p id="disposal-total-weight" class="mt-1 text-2xl font-bold text-black">0 kg</p>
        </div>
        <div class="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <p class="text-xs uppercase tracking-wider text-zinc-400">Total Poin</p>
          <p id="disposal-total-point" class="mt-1 text-2xl font-bold text-black">0</p>
        </div>
      </div>

      <div class="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-zinc-200 flex items-center justify-between gap-4">
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              ${icons.search}
            </div>
            <input id="disposals-search" type="text" placeholder="Cari user, RFID, kategori, atau ID log..." class="w-full bg-zinc-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-600 focus:ring-1 focus:ring-zinc-300 placeholder:text-zinc-400">
          </div>
        </div>
        <div id="disposals-table-container"></div>
      </div>
    </div>
  `;

  const tableContainer = document.getElementById('disposals-table-container');
  const searchInput = document.getElementById('disposals-search');

  const getFilteredDisposals = () => {
    const keyword = searchInput?.value.trim().toLowerCase() || '';
    return disposals.filter((row) => !keyword || getSearchText(row).includes(keyword));
  };

  const updateSummary = (rows) => {
    const totalCount = rows.length;
    const totalWeight = rows.reduce((sum, row) => sum + Number(row.weight || 0), 0);
    const totalPoint = rows.reduce((sum, row) => sum + Number(row.point || 0), 0);

    document.getElementById('disposal-total-count').textContent = String(totalCount);
    document.getElementById('disposal-total-weight').textContent = `${formatNumber(totalWeight)} kg`;
    document.getElementById('disposal-total-point').textContent = formatNumber(totalPoint);
  };

  const renderRows = () => {
    const rows = getFilteredDisposals();
    updateSummary(rows);

    renderTable({
      container: tableContainer,
      data: rows,
      columns: [
        { key: 'id', label: 'Log ID', render: (value) => `<span class="font-medium text-black">#${value}</span>` },
        {
          key: 'user_name',
          label: 'Nasabah',
          render: (value, item) => `
            <div class="space-y-1">
              <p class="font-medium text-black">${value || 'Tanpa Nama'}</p>
              <p class="text-xs text-zinc-400">RFID: ${item.rfid_uid || '-'}</p>
            </div>
          `,
        },
        { key: 'category', label: 'Jenis Sampah', render: (value) => `<span class="text-sm text-zinc-700">${value}</span>` },
        { key: 'weight', label: 'Berat (kg)', render: (value) => `<span class="text-sm text-zinc-700">${formatNumber(value, 3)}</span>` },
        { key: 'point', label: 'Poin', render: (value) => `<span class="text-sm text-zinc-700">${formatNumber(value)}</span>` },
        { key: 'confidence_ai', label: 'Confidence', render: (value) => `<span class="text-sm text-zinc-500">${formatNumber(value)}%</span>` },
        {
          key: 'created_at',
          label: 'Waktu',
          render: (value) => `<span class="text-xs text-zinc-400">${value ? new Date(value).toLocaleString() : '-'}</span>`,
        },
      ],
    });
  };

  searchInput?.addEventListener('input', renderRows);
  renderRows();

  document.getElementById('export-disposals-btn')?.addEventListener('click', () => {
    exportToCSV(getFilteredDisposals(), 'waste_disposal_history', [
      { key: 'id', label: 'Log ID' },
      { key: 'user_id', label: 'User ID' },
      { key: 'user_name', label: 'User Name' },
      { key: 'rfid_uid', label: 'RFID UID' },
      { key: 'category', label: 'Category' },
      { key: 'weight', label: 'Weight (kg)' },
      { key: 'point', label: 'Points' },
      { key: 'confidence_ai', label: 'AI Confidence' },
      { key: 'created_at', label: 'Created At' },
    ]);
  });
};
