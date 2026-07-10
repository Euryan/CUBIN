/**
 * Waste Categories Module
 * CRUD untuk jenis sampah dan poin-per-kg.
 */

import { createProduct, deleteProductById, fetchProducts, updateProduct } from './data.js';
import { icons } from './icons.js';
import { renderTable, modal, toast } from './ui.js';
import { exportToCSV } from './export.js';

function getCategorySearchText(category) {
  return [
    category.name,
    category.description,
    String(category.price),
  ].join(' ').toLowerCase();
}

function formatPoints(value) {
  return `${Number(value || 0).toLocaleString('id-ID')} pts/kg`;
}

export const renderProducts = async (container) => {
  const categories = await fetchProducts();

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Jenis Sampah & Poin</h2>
        <div class="flex items-center gap-3">
          <button id="export-products-btn" class="px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all text-zinc-600 flex items-center gap-2 shadow-sm">
            ${icons.download} Export CSV
          </button>
          <button id="add-product-btn" class="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-sm">
            ${icons.plus} Tambah Jenis
          </button>
        </div>
      </div>

      <div class="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-zinc-200 flex items-center justify-between gap-4">
          <div class="relative flex-1 max-w-md">
            <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              ${icons.search}
            </div>
            <input id="products-search" type="text" placeholder="Cari jenis sampah atau deskripsi..." class="w-full bg-zinc-100 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-600 focus:ring-1 focus:ring-zinc-300 placeholder:text-zinc-400">
          </div>
        </div>
        <div id="products-table-container"></div>
      </div>
    </div>
  `;

  const tableContainer = document.getElementById('products-table-container');
  const searchInput = document.getElementById('products-search');

  const getFilteredCategories = () => {
    const keyword = searchInput?.value.trim().toLowerCase() || '';
    return categories.filter((category) => !keyword || getCategorySearchText(category).includes(keyword));
  };

  const renderFilteredCategories = () => {
    renderTable({
      container: tableContainer,
      data: getFilteredCategories(),
      columns: [
        {
          key: 'name',
          label: 'Jenis Sampah',
          render: (value, item) => `
            <div class="space-y-1">
              <p class="font-medium text-black">${value}</p>
              <p class="text-xs text-zinc-400">ID ${item.id}</p>
            </div>
          `,
        },
        {
          key: 'price',
          label: 'Poin per Kg',
          render: (value) => `<span class="font-medium text-emerald-700">${formatPoints(value)}</span>`,
        },
        {
          key: 'description',
          label: 'Deskripsi',
          render: (value) => `<span class="text-sm text-zinc-500">${value || '-'}</span>`,
        },
        {
          key: 'created_at',
          label: 'Dibuat',
          render: (value) => `<span class="text-xs text-zinc-400">${value ? new Date(value).toLocaleString() : '-'}</span>`,
        },
      ],
      actions: (item) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-end gap-2';

        const editBtn = document.createElement('button');
        editBtn.className = 'p-2 text-zinc-400 hover:text-black transition-colors hover:bg-zinc-100 rounded-lg';
        editBtn.innerHTML = icons.edit;
        editBtn.onclick = () => showCategoryModal(item);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'p-2 text-zinc-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg';
        deleteBtn.innerHTML = icons.trash;
        deleteBtn.onclick = () => deleteCategory(item.id);

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
        return div;
      },
    });
  };

  searchInput?.addEventListener('input', renderFilteredCategories);
  renderFilteredCategories();

  document.getElementById('add-product-btn')?.addEventListener('click', () => showCategoryModal());
  document.getElementById('export-products-btn')?.addEventListener('click', () => {
    exportToCSV(getFilteredCategories(), 'waste_categories', [
      { key: 'id', label: 'Category ID' },
      { key: 'name', label: 'Category Name' },
      { key: 'price', label: 'Points per Kg' },
      { key: 'description', label: 'Description' },
      { key: 'created_at', label: 'Created At' },
    ]);
  });
};

function showCategoryModal(category) {
  const isEdit = !!category;
  const content = document.createElement('div');
  content.className = 'space-y-4';
  content.innerHTML = `
    <div class="space-y-2">
      <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Nama Jenis Sampah</label>
      <input type="text" id="c-name" value="${category?.name || ''}" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300" placeholder="Contoh: Plastik">
    </div>
    <div class="space-y-2">
      <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Poin per Kg</label>
      <input type="number" id="c-price" value="${category?.price ?? ''}" min="1" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300" placeholder="Contoh: 120">
    </div>
    <div class="space-y-2">
      <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Deskripsi</label>
      <textarea id="c-description" class="w-full bg-zinc-50 border-zinc-200 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-zinc-300 h-24" placeholder="Keterangan tambahan...">${category?.description || ''}</textarea>
    </div>
  `;

  modal.show(isEdit ? 'Edit Jenis Sampah' : 'Tambah Jenis Sampah', content, [
    {
      label: isEdit ? 'Simpan Perubahan' : 'Buat Jenis',
      onClick: async () => {
        const name = document.getElementById('c-name').value.trim();
        const price = Number(document.getElementById('c-price').value);
        const description = document.getElementById('c-description').value.trim();

        if (!name || Number.isNaN(price) || price <= 0) {
          toast.show('Nama dan poin per kg wajib diisi', 'error');
          return;
        }

        const payload = { name, price, description };

        if (isEdit) {
          await updateProduct(category.id, payload);
          toast.show('Jenis sampah berhasil diperbarui', 'success');
        } else {
          await createProduct(payload);
          toast.show('Jenis sampah berhasil ditambahkan', 'success');
        }

        await renderProducts(document.getElementById('main-content'));
      },
    },
  ]);
}

function deleteCategory(id) {
  modal.show('Hapus Jenis Sampah', 'Yakin ingin menghapus jenis sampah ini?', [
    {
      label: 'Hapus',
      variant: 'danger',
      onClick: async () => {
        await deleteProductById(id);
        toast.show('Jenis sampah dihapus', 'success');
        await renderProducts(document.getElementById('main-content'));
      },
    },
  ]);
}
