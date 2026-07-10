/**
 * Riwayat pembuangan (pengganti modul orders ecommerce).
 */

import { fetchDisposals } from './data.js';
import { icons } from './icons.js';
import { renderTable } from './ui.js';
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
    row.id,
    row.user_name,
    row.rfid_uid,
    row.category,
    row.created_at,
  ].join(' ').toLowerCase();
}

export const renderOrders = async (container) => {
  const disposals = await fetchDisposals();

  const totalWeight = disposals.reduce((sum, row) => sum + Number(row.weight || 0), 0);
  const totalPoints = disposals.reduce((sum, row) => sum + Number(row.point || 0), 0);
  const avgPointRate = disposals.length
    ? disposals.reduce((sum, row) => sum + Number(row.point_rate || 0), 0) / disposals.length
    : 0;

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Riwayat Pembuangan</h2>
        <button id="export-disposals-btn" class="px-4 py-2 text-sm font-medium bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-all text-emerald-700 flex items-center gap-2 shadow-sm">
          ${icons.download} Export CSV
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
          <p class="text-xs uppercase tracking-wider text-zinc-400">Total Jumlah</p>
          <p class="mt-2 text-3xl font-bold text-black">${wholeNumber(totalWeight)}</p>
        </div>
        <div class="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
          <p class="text-xs uppercase tracking-wider text-zinc-400">Total Poin</p>
          <p class="mt-2 text-3xl font-bold text-black">${numberId(totalPoints, 2)}</p>
        </div>
        <div class="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
          <p class="text-xs uppercase tracking-wider text-zinc-400">Rata-rata Poin/Kg</p>
          <p class="mt-2 text-3xl font-bold text-emerald-700">${numberId(avgPointRate, 2)}</p>
        </div>
      </div>

      <div class="bg-white border border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-emerald-100">
          <div class="relative max-w-md">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">${icons.search}</div>
            <input id="disposals-search" type="text" placeholder="Cari nasabah, RFID, atau kategori..." class="w-full bg-emerald-50 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-600 focus:ring-1 focus:ring-emerald-300 placeholder:text-zinc-400">
          </div>
        </div>
        <div id="disposals-table"></div>
      </div>
    </div>
  `;

  const table = document.getElementById('disposals-table');
  const searchInput = document.getElementById('disposals-search');

  const columns = [
    { key: 'id', label: 'Log ID' },
    {
      key: 'user_name',
      label: 'Nasabah',
      render: (value, row) => `
        <div>
          <p class="font-medium text-black">${value}</p>
          <p class="text-xs text-zinc-400">RFID ${row.rfid_uid}</p>
        </div>
      `,
    },
    { key: 'category', label: 'Kategori' },
    { key: 'weight', label: 'Jumlah', render: (value) => wholeNumber(value) },
    { key: 'point', label: 'Poin', render: (value) => wholeNumber(value) },
    { key: 'point_rate', label: 'Poin/Kg', render: (value) => `<span class="text-emerald-700 font-medium">${numberId(value, 2)}</span>` },
    { key: 'confidence_ai', label: 'Confidence AI', render: (value) => `${numberId(value, 2)}%` },
    { key: 'created_at', label: 'Waktu', render: (value) => `<span class="text-xs text-zinc-500">${value ? new Date(value).toLocaleString() : '-'}</span>` },
  ];

  const renderRows = () => {
    const keyword = searchInput?.value.trim().toLowerCase() || '';
    const filtered = disposals.filter((row) => !keyword || searchText(row).includes(keyword));
    renderTable({ container: table, data: filtered, columns });
  };

  searchInput?.addEventListener('input', renderRows);
  renderRows();

  document.getElementById('export-disposals-btn')?.addEventListener('click', () => {
    exportToCSV(disposals, 'bank_sampah_disposals', [
      { key: 'id', label: 'Log ID' },
      { key: 'user_name', label: 'Nasabah' },
      { key: 'rfid_uid', label: 'RFID UID' },
      { key: 'category', label: 'Kategori' },
      { key: 'weight', label: 'Jumlah' },
      { key: 'point', label: 'Poin' },
      { key: 'point_rate', label: 'Poin per Kg' },
      { key: 'confidence_ai', label: 'Confidence AI (%)' },
      { key: 'created_at', label: 'Waktu' },
    ]);
  });
};
