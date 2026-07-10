/**
 * Kategori sampah (pengganti modul products ecommerce).
 */

import { fetchCategories, createCategory, updateCategory, deleteCategory } from './data.js';
import { icons } from './icons.js';
import { renderTable, modal, toast } from './ui.js';
import { exportToCSV } from './export.js';

function formatPointRate(value) {
  return `${Number(value || 0).toLocaleString('id-ID')} poin/kg`;
}

function getSearchText(category) {
  return [
    category.name,
    category.description,
    category.point_rate,
  ].join(' ').toLowerCase();
}

export const renderProducts = async (container) => {
  const categories = await fetchCategories();

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Jenis Sampah</h2>
        <div class="flex items-center gap-3">
          <button id="export-categories-btn" class="px-4 py-2 text-sm font-medium bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-all text-emerald-700 flex items-center gap-2 shadow-sm">
            ${icons.download} Export CSV
          </button>
          <button id="add-category-btn" class="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm">
            ${icons.plus} Tambah Kategori
          </button>
        </div>
      </div>

      <div class="bg-white border border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-emerald-100">
          <div class="relative max-w-md">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">${icons.search}</div>
            <input id="categories-search" type="text" placeholder="Cari nama kategori atau deskripsi..." class="w-full bg-emerald-50 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-600 focus:ring-1 focus:ring-emerald-300 placeholder:text-zinc-400">
          </div>
        </div>
        <div id="categories-table-container"></div>
      </div>
    </div>
  `;

  const searchInput = document.getElementById('categories-search');
  const tableContainer = document.getElementById('categories-table-container');

  const columns = [
    {
      key: 'name',
      label: 'Kategori',
      render: (value, row) => `
        <div>
          <p class="font-medium text-black">${value}</p>
          <p class="text-xs text-zinc-400">${row.description || '-'}</p>
        </div>
      `,
    },
    {
      key: 'point_rate',
      label: 'Poin/Kg',
      render: (value) => `<span class="font-medium text-emerald-700">${formatPointRate(value)}</span>`,
    },
    {
      key: 'created_at',
      label: 'Dibuat',
      render: (value) => `<span class="text-xs text-zinc-500">${value ? new Date(value).toLocaleString() : '-'}</span>`,
    },
  ];

  const renderRows = () => {
    const keyword = searchInput?.value.trim().toLowerCase() || '';
    const filtered = categories.filter((row) => !keyword || getSearchText(row).includes(keyword));

    renderTable({
      container: tableContainer,
      data: filtered,
      columns,
      actions: (item) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex items-center justify-end gap-2';

        const editBtn = document.createElement('button');
        editBtn.className = 'p-2 text-zinc-400 hover:text-emerald-700 transition-colors hover:bg-emerald-50 rounded-lg';
        editBtn.innerHTML = icons.edit;
        editBtn.onclick = () => showCategoryModal(item, categories, container);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'p-2 text-zinc-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg';
        deleteBtn.innerHTML = icons.trash;
        deleteBtn.onclick = () => removeCategory(item.id, container);

        wrapper.appendChild(editBtn);
        wrapper.appendChild(deleteBtn);
        return wrapper;
      },
    });
  };

  searchInput?.addEventListener('input', renderRows);
  renderRows();

  document.getElementById('add-category-btn')?.addEventListener('click', () => showCategoryModal(null, categories, container));
  document.getElementById('export-categories-btn')?.addEventListener('click', () => {
    exportToCSV(categories, 'bank_sampah_categories', [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nama Kategori' },
      { key: 'point_rate', label: 'Poin per Kg' },
      { key: 'description', label: 'Deskripsi' },
      { key: 'created_at', label: 'Dibuat' },
    ]);
  });
};

function showCategoryModal(category, categories, container) {
  const content = document.createElement('div');
  content.className = 'space-y-4';
  content.innerHTML = `
    <div class="space-y-2">
      <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Nama Kategori</label>
      <input type="text" id="c-name" value="${category?.name || ''}" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
    </div>
    <div class="space-y-2">
      <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Poin per Kg</label>
      <input type="number" id="c-point-rate" value="${category?.point_rate || ''}" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300">
    </div>
    <div class="space-y-2">
      <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Deskripsi</label>
      <textarea id="c-description" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300 h-24">${category?.description || ''}</textarea>
    </div>
  `;

  modal.show(category ? 'Edit Jenis Sampah' : 'Tambah Jenis Sampah', content, [
    {
      label: 'Simpan',
      onClick: async () => {
        const payload = {
          name: content.querySelector('#c-name')?.value.trim(),
          point_rate: Number(content.querySelector('#c-point-rate')?.value || 0),
          description: content.querySelector('#c-description')?.value.trim() || null,
        };

        if (!payload.name || payload.point_rate <= 0) {
          toast.show('Nama dan poin/kg wajib diisi', 'error');
          return;
        }

        if (category) {
          await updateCategory(category.id, payload);
          toast.show('Kategori berhasil diperbarui', 'success');
        } else {
          await createCategory(payload);
          toast.show('Kategori berhasil ditambahkan', 'success');
        }

        renderProducts(container);
      },
    },
  ]);
}

function removeCategory(categoryId, container) {
  modal.show('Hapus Kategori', 'Yakin ingin menghapus kategori ini?', [
    {
      label: 'Hapus',
      variant: 'danger',
      onClick: async () => {
        await deleteCategory(categoryId);
        toast.show('Kategori berhasil dihapus', 'success');
        renderProducts(container);
      },
    },
  ]);
}
