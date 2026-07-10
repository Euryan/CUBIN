/**
 * Reward catalog management for Bank Sampah admin.
 */

import { fetchRewards, createReward, updateReward, deleteReward } from './data.js';
import { icons } from './icons.js';
import { renderTable, modal, toast } from './ui.js';
import { exportToCSV } from './export.js';

function numberId(value, digits = 0) {
  return Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function searchText(item) {
  return [item.reward_name, item.required_point, item.stock].join(' ').toLowerCase();
}

export const renderRewards = async (container) => {
  const rewards = await fetchRewards();

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Katalog Reward</h2>
        <div class="flex items-center gap-3">
          <button id="export-rewards-btn" class="px-4 py-2 text-sm font-medium bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-all text-emerald-700 flex items-center gap-2 shadow-sm">
            ${icons.download} Export CSV
          </button>
          <button id="add-reward-btn" class="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm">
            ${icons.plus} Tambah Reward
          </button>
        </div>
      </div>

      <div class="bg-white border border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-emerald-100">
          <div class="relative max-w-md">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">${icons.search}</div>
            <input id="rewards-search" type="text" placeholder="Cari nama reward..." class="w-full bg-emerald-50 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-700 focus:ring-1 focus:ring-emerald-300 placeholder:text-zinc-400">
          </div>
        </div>
        <div id="rewards-table"></div>
      </div>
    </div>
  `;

  const table = document.getElementById('rewards-table');
  const searchInput = document.getElementById('rewards-search');

  const columns = [
    {
      key: 'reward_name',
      label: 'Reward',
      render: (value, row) => `
        <div>
          <p class="font-medium text-black">${value}</p>
          <p class="text-xs text-zinc-400">ID ${row.id}</p>
        </div>
      `,
    },
    { key: 'required_point', label: 'Poin Dibutuhkan', render: (value) => `<span class="font-medium text-emerald-700">${numberId(value, 2)}</span>` },
    { key: 'stock', label: 'Stok', render: (value) => numberId(value) },
    { key: 'created_at', label: 'Dibuat', render: (value) => `<span class="text-xs text-zinc-500">${value ? new Date(value).toLocaleString() : '-'}</span>` },
  ];

  const renderRows = () => {
    const keyword = searchInput?.value.trim().toLowerCase() || '';
    const filtered = rewards.filter((row) => !keyword || searchText(row).includes(keyword));

    renderTable({
      container: table,
      data: filtered,
      columns,
      actions: (item) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-end gap-2';

        const editBtn = document.createElement('button');
        editBtn.className = 'p-2 text-zinc-400 hover:text-emerald-700 transition-colors hover:bg-emerald-50 rounded-lg';
        editBtn.innerHTML = icons.edit;
        editBtn.onclick = () => showRewardModal(item, container);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'p-2 text-zinc-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg';
        deleteBtn.innerHTML = icons.trash;
        deleteBtn.onclick = () => removeReward(item.id, container);

        wrapper.appendChild(editBtn);
        wrapper.appendChild(deleteBtn);
        return wrapper;
      },
    });
  };

  searchInput?.addEventListener('input', renderRows);
  renderRows();

  document.getElementById('add-reward-btn')?.addEventListener('click', () => showRewardModal(null, container));
  document.getElementById('export-rewards-btn')?.addEventListener('click', () => {
    exportToCSV(rewards, 'bank_sampah_rewards', [
      { key: 'id', label: 'ID' },
      { key: 'reward_name', label: 'Nama Reward' },
      { key: 'required_point', label: 'Poin Dibutuhkan' },
      { key: 'stock', label: 'Stok' },
      { key: 'created_at', label: 'Dibuat' },
    ]);
  });
};

function showRewardModal(reward, container) {
  const content = document.createElement('div');
  content.className = 'space-y-4';
  content.innerHTML = `
    <div class="space-y-2">
      <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Nama Reward</label>
      <input id="r-name" type="text" value="${reward?.reward_name || ''}" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300">
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Poin Dibutuhkan</label>
        <input id="r-point" type="number" value="${reward?.required_point || ''}" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300">
      </div>
      <div class="space-y-2">
        <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Stok</label>
        <input id="r-stock" type="number" value="${reward?.stock || ''}" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300">
      </div>
    </div>
  `;

  modal.show(reward ? 'Edit Reward' : 'Tambah Reward', content, [
    {
      label: 'Simpan',
      onClick: async () => {
        const payload = {
          reward_name: content.querySelector('#r-name')?.value.trim(),
          required_point: Number(content.querySelector('#r-point')?.value || 0),
          stock: Number(content.querySelector('#r-stock')?.value || 0),
          image: null,
        };

        if (!payload.reward_name || payload.required_point <= 0 || payload.stock < 0) {
          toast.show('Data reward belum valid', 'error');
          return;
        }

        if (reward) {
          await updateReward(reward.id, payload);
          toast.show('Reward berhasil diperbarui', 'success');
        } else {
          await createReward(payload);
          toast.show('Reward berhasil ditambahkan', 'success');
        }

        renderRewards(container);
      },
    },
  ]);
}

function removeReward(rewardId, container) {
  modal.show('Hapus Reward', 'Yakin ingin menghapus reward ini?', [
    {
      label: 'Hapus',
      variant: 'danger',
      onClick: async () => {
        await deleteReward(rewardId);
        toast.show('Reward berhasil dihapus', 'success');
        renderRewards(container);
      },
    },
  ]);
}
