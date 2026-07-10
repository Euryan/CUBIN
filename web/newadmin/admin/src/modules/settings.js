/**
 * Settings module for Bank Sampah admin.
 */

import { db } from './data.js';
import { toast, modal } from './ui.js';

export const renderSettings = (container) => {
  const settings = db.get('settings', {
    storeName: 'EcoTrash Admin',
    storeEmail: 'admin@ecotrash.local',
    address: 'Bank Sampah EcoTrash Indonesia',
  });

  const session = db.get('session', null);

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Pengaturan</h2>
        <button id="save-settings-btn" class="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm">
          Simpan Perubahan
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h3 class="text-lg font-semibold text-black">Profil Instansi</h3>
              <p class="text-sm text-zinc-500">Informasi ini dipakai sebagai identitas panel admin.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Nama Instansi</label>
                <input id="s-name" type="text" value="${settings.storeName || ''}" class="w-full bg-emerald-50/40 border-emerald-100 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300">
              </div>
              <div class="space-y-2">
                <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Email Admin</label>
                <input id="s-email" type="email" value="${settings.storeEmail || ''}" class="w-full bg-emerald-50/40 border-emerald-100 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300">
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Alamat</label>
              <textarea id="s-address" class="w-full bg-emerald-50/40 border-emerald-100 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300 h-24">${settings.address || ''}</textarea>
            </div>
          </div>

          <div class="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 class="text-lg font-semibold text-red-600">Zona Risiko</h3>
              <p class="text-sm text-red-400">Aksi ini menghapus cache lokal admin dan meminta login ulang.</p>
            </div>
            <button id="reset-data-btn" class="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all">
              Reset Data Lokal
            </button>
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 class="text-lg font-semibold text-black">Akun Login Aktif</h3>
            <p class="text-sm text-zinc-600">${session?.user || 'Admin Bank Sampah'}</p>
            <p class="text-xs text-zinc-500">${session?.email || 'admin@ecotrash.local'}</p>
            <p class="text-xs text-zinc-500">Role: ${session?.role || 'Waste Operations'}</p>
          </div>

          <div class="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
            <h3 class="text-lg font-semibold text-black">Modul Aktif</h3>
            <ul class="mt-3 text-sm text-zinc-600 space-y-2">
              <li>• Dashboard KPI</li>
              <li>• Jenis Sampah</li>
              <li>• Riwayat Pembuangan</li>
              <li>• Data Nasabah</li>
              <li>• Katalog Reward</li>
              <li>• Laporan Operasional</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('save-settings-btn')?.addEventListener('click', () => {
    const next = {
      storeName: document.getElementById('s-name')?.value.trim(),
      storeEmail: document.getElementById('s-email')?.value.trim(),
      address: document.getElementById('s-address')?.value.trim(),
    };
    db.set('settings', next);
    toast.show('Pengaturan berhasil disimpan', 'success');
  });

  document.getElementById('reset-data-btn')?.addEventListener('click', () => {
    modal.show('Reset Data Lokal', 'Yakin ingin menghapus cache lokal admin?', [
      {
        label: 'Ya, Reset',
        variant: 'danger',
        onClick: () => {
          db.reset();
          db.set('session', null);
          window.location.reload();
        },
      },
    ]);
  });
};
