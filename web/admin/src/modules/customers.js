/**
 * Users Module
 * Displays bank-sampah participants (nasabah) and basic account metrics.
 */

import { fetchCustomers } from './data.js';
import { icons } from './icons.js';
import { renderTable } from './ui.js';
import { exportToCSV } from './export.js';

function getSearchText(user) {
  return [
    user.id,
    user.nama,
    user.rfid_uid,
    user.total_point,
  ].join(' ').toLowerCase();
}

function formatNumber(value, digits = 2) {
  return Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export const renderCustomers = async (container) => {
  const users = await fetchCustomers();

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Data Nasabah</h2>
        <div class="flex items-center gap-3">
          <button id="export-customers-btn" class="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all text-zinc-600 flex items-center gap-2 shadow-sm">
            ${icons.download} Export CSV
          </button>
        </div>
      </div>

      <div class="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-zinc-200 flex items-center justify-between gap-4">
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              ${icons.search}
            </div>
            <input id="customers-search" type="text" placeholder="Cari nama nasabah atau RFID UID..." class="w-full bg-zinc-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-600 focus:ring-1 focus:ring-zinc-300 placeholder:text-zinc-400">
          </div>
        </div>
        <div id="customers-table-container"></div>
      </div>
    </div>
  `;

  const tableContainer = document.getElementById('customers-table-container');
  const searchInput = document.getElementById('customers-search');

  const getFilteredUsers = () => {
    const keyword = searchInput?.value.trim().toLowerCase() || '';
    return users.filter((user) => !keyword || getSearchText(user).includes(keyword));
  };

  const renderRows = () => {
    renderTable({
      container: tableContainer,
      data: getFilteredUsers(),
      columns: [
        { key: 'id', label: 'User ID', render: (value) => `<span class="font-medium text-black">#${value}</span>` },
        {
          key: 'nama',
          label: 'Nama Nasabah',
          render: (value, item) => `
            <div class="space-y-1">
              <p class="font-medium text-black">${value || '-'}</p>
              <p class="text-xs text-zinc-400">RFID: ${item.rfid_uid || '-'}</p>
            </div>
          `,
        },
        { key: 'total_point', label: 'Total Poin', render: (value) => `<span class="text-sm text-zinc-700">${formatNumber(value)}</span>` },
        {
          key: 'created_at',
          label: 'Terdaftar',
          render: (value) => `<span class="text-xs text-zinc-400">${value ? new Date(value).toLocaleString() : '-'}</span>`,
        },
      ],
    });
  };

  searchInput?.addEventListener('input', renderRows);
  renderRows();

  document.getElementById('export-customers-btn')?.addEventListener('click', () => {
    exportToCSV(getFilteredUsers(), 'bank_sampah_users', [
      { key: 'id', label: 'User ID' },
      { key: 'nama', label: 'Nama' },
      { key: 'rfid_uid', label: 'RFID UID' },
      { key: 'total_point', label: 'Total Point' },
      { key: 'created_at', label: 'Created At' },
    ]);
  });
};
