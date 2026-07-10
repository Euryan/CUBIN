/**
 * Device detail dashboard module.
 */

import { fetchDisposals, getDeviceById, updateDevice } from './data.js';
import { icons } from './icons.js';
import { renderTable, toast } from './ui.js';

function numberId(value, digits = 0) {
  return Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function wholeNumber(value) {
  return String(Math.round(Number(value || 0)));
}

function hashCode(value) {
  return String(value || '').split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 9973, 7);
}

function getDeviceScopedDisposals(disposals, deviceId) {
  if (!disposals.length) return [];
  const seed = hashCode(deviceId);
  return disposals.filter((row) => ((Number(row.id || 0) + seed) % 3) === 0);
}

function card(title, value, subtitle, valueClass = 'text-black') {
  return `
    <div class="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
      <p class="text-xs uppercase tracking-wider text-zinc-400">${title}</p>
      <p class="mt-2 text-3xl font-bold ${valueClass}">${value}</p>
      <p class="mt-1 text-xs text-zinc-500">${subtitle}</p>
    </div>
  `;
}

export const renderDeviceDashboard = async (container, context = {}) => {
  const deviceId = context.getSelectedDeviceId?.();
  const device = await getDeviceById(deviceId);

  if (!device) {
    container.innerHTML = `
      <div class="bg-white border border-emerald-100 rounded-2xl p-10 text-center">
        <h3 class="text-xl font-semibold text-black">Perangkat tidak ditemukan</h3>
        <p class="mt-2 text-sm text-zinc-500">Kembali ke Home untuk memilih perangkat yang tersedia.</p>
        <button id="back-home-btn" class="mt-5 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Kembali ke Home</button>
      </div>
    `;
    document.getElementById('back-home-btn')?.addEventListener('click', () => context.navigateTo?.('dashboard'));
    return;
  }

  const allDisposals = await fetchDisposals();
  const deviceDisposals = getDeviceScopedDisposals(allDisposals, device.id);

  const capacity = Number(device.capacityKg || 0);
  const currentLoad = Number(device.currentLoadKg || 0);
  const remaining = Math.max(0, capacity - currentLoad);
  const utilization = capacity ? Math.min(100, (currentLoad / capacity) * 100) : 0;

  const totalWeight = deviceDisposals.reduce((sum, row) => sum + Number(row.weight || 0), 0);
  const totalPoints = deviceDisposals.reduce((sum, row) => sum + Number(row.point || 0), 0);
  const avgConfidence = deviceDisposals.length
    ? deviceDisposals.reduce((sum, row) => sum + Number(row.confidence_ai || 0), 0) / deviceDisposals.length
    : 0;

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <div>
          <button id="back-home-btn" class="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 mb-2">
            ${icons.chevronLeft} Kembali ke Home
          </button>
          <h2 class="text-3xl font-bold tracking-tight text-black">Dashboard ${device.name}</h2>
          <p class="text-sm text-zinc-500 mt-1">${device.id} • ${device.location} • Firmware ${device.firmware || '-'}</p>
        </div>
        <button id="refresh-device-btn" class="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm">
          Sinkronkan Data
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        ${card('Kapasitas Total', wholeNumber(capacity), 'Daya tampung perangkat')}
        ${card('Terisi Saat Ini', wholeNumber(currentLoad), 'Volume saat ini', utilization > 85 ? 'text-red-600' : 'text-black')}
        ${card('Sisa Kapasitas', wholeNumber(remaining), 'Kapasitas yang masih tersedia', 'text-emerald-700')}
        ${card('Utilisasi', `${wholeNumber(utilization)}%`, 'Current load ratio')}
      </div>

      <div class="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-black">Status Kapasitas</h3>
          <span class="text-xs text-zinc-500">Last sync: ${device.lastSync ? new Date(device.lastSync).toLocaleString() : '-'}</span>
        </div>
        <div class="h-3 bg-emerald-50 rounded-full overflow-hidden">
          <div class="h-full ${utilization > 85 ? 'bg-red-500' : utilization > 65 ? 'bg-amber-500' : 'bg-emerald-500'}" style="width:${Math.max(1, utilization)}%"></div>
        </div>
        <p class="mt-2 text-xs text-zinc-500">Disarankan pengosongan jika utilisasi di atas 85% untuk menjaga performa perangkat.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${card('Data Tercatat', numberId(deviceDisposals.length), 'Transaksi terasosiasi')}
        ${card('Sampah Terproses', wholeNumber(totalWeight), 'Akumulasi dari perangkat')}
        ${card('Akurasi Rata-rata AI', `${wholeNumber(avgConfidence)}%`, 'Berdasarkan riwayat deteksi')}
      </div>

      <div class="bg-white border border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
        <div class="px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-black">Aktivitas Perangkat</h3>
          <span class="text-xs text-zinc-500">Poin terkumpul ${wholeNumber(totalPoints)}</span>
        </div>
        <div id="device-disposal-table"></div>
      </div>
    </div>
  `;

  document.getElementById('back-home-btn')?.addEventListener('click', () => context.navigateTo?.('dashboard'));
  document.getElementById('refresh-device-btn')?.addEventListener('click', async () => {
    await updateDevice(device.id, { lastSync: new Date().toISOString() });
    toast.show(`Perangkat ${device.name} berhasil disinkronkan`, 'success');
    renderDeviceDashboard(container, context);
  });

  renderTable({
    container: document.getElementById('device-disposal-table'),
    data: deviceDisposals.slice(0, 12),
    columns: [
      { key: 'id', label: 'Log ID' },
      { key: 'user_name', label: 'Nasabah' },
      { key: 'category', label: 'Kategori' },
      { key: 'weight', label: 'Jumlah', render: (value) => wholeNumber(value) },
      { key: 'point', label: 'Poin', render: (value) => wholeNumber(value) },
      { key: 'confidence_ai', label: 'AI', render: (value) => `${wholeNumber(value)}%` },
      { key: 'created_at', label: 'Waktu', render: (value) => `<span class="text-xs text-zinc-500">${value ? new Date(value).toLocaleString() : '-'}</span>` },
    ],
  });
};
