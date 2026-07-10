/**
 * Home module: management alat overview.
 */

import { createDevice, fetchDevices, fetchUsers, fetchDisposals } from './data.js';
import { icons } from './icons.js';
import { modal, toast } from './ui.js';

function numberId(value, digits = 0) {
  return Number(value || 0).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function wholeNumber(value) {
  return String(Math.round(Number(value || 0)));
}

function statusBadge(status) {
  if (status === 'maintenance') {
    return '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold uppercase">Maintenance</span>';
  }
  if (status === 'offline') {
    return '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold uppercase">Offline</span>';
  }
  return '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold uppercase">Online</span>';
}

function calcPercent(current, capacity) {
  if (!capacity) return 0;
  return Math.min(100, Math.round((Number(current || 0) / Number(capacity || 1)) * 100));
}

function renderKpiCard(title, value, subtitle) {
  return `
    <div class="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
      <p class="text-xs uppercase tracking-wider text-zinc-400">${title}</p>
      <p class="mt-2 text-3xl font-bold text-black">${value}</p>
      <p class="mt-1 text-xs text-zinc-500">${subtitle}</p>
    </div>
  `;
}

export const renderDashboard = async (container, context = {}) => {
  const [devices, users, disposals] = await Promise.all([
    fetchDevices(),
    fetchUsers(),
    fetchDisposals(),
  ]);

  const totalWeight = disposals.reduce((sum, row) => sum + Number(row.weight || 0), 0);

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="bg-gradient-to-r from-emerald-50 via-white to-green-50 border border-emerald-100 rounded-2xl p-6 shadow-sm">
        <p class="text-xs uppercase tracking-[0.18em] text-emerald-700">Welcome</p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-black">Selamat Datang di Management Perangkat</h2>
        <p class="mt-2 text-sm text-zinc-600 max-w-3xl">Kelola perangkat perusahaan, pantau kapasitas, dan monitor performa operasional bank sampah dalam satu dashboard yang rapi dan profesional.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${renderKpiCard('Jumlah Perangkat', numberId(devices.length), 'Total perangkat terdaftar')}
        ${renderKpiCard('Jumlah Nasabah', numberId(users.length), 'Akun nasabah terhubung')}
        ${renderKpiCard('Jumlah Sampah Terpilah', wholeNumber(totalWeight), 'Akumulasi semua transaksi')}
      </div>

      <div class="flex items-center justify-between">
        <h3 class="text-xl font-semibold text-black">Perangkat Terdaftar</h3>
        <button id="add-device-btn" class="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-2 shadow-sm">
          ${icons.plus} Tambah Perangkat
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        ${devices.length ? devices.map((device) => {
          const percent = calcPercent(device.currentLoadKg, device.capacityKg);
          return `
            <button data-device-id="${device.id}" class="device-card text-left bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="text-lg font-semibold text-black">${device.name}</h4>
                  <p class="text-xs text-zinc-500 mt-1">${device.id} • ${device.location}</p>
                </div>
                ${statusBadge(device.status)}
              </div>

              <div class="mt-4 space-y-2">
                <div class="flex items-center justify-between text-xs text-zinc-500">
                  <span>Kapasitas</span>
                  <span>${wholeNumber(device.currentLoadKg)} / ${wholeNumber(device.capacityKg)}</span>
                </div>
                <div class="h-2 bg-emerald-50 rounded-full overflow-hidden">
                  <div class="h-full ${percent > 85 ? 'bg-red-500' : percent > 65 ? 'bg-amber-500' : 'bg-emerald-500'}" style="width:${percent}%"></div>
                </div>
                <p class="text-[11px] text-zinc-400">Load ${percent}% • Last sync ${device.lastSync ? new Date(device.lastSync).toLocaleString() : '-'}</p>
              </div>

              <div class="mt-4 flex items-center justify-between text-sm font-medium text-emerald-700">
                <span>Buka Dashboard Perangkat</span>
                <span>${icons.chevronRight}</span>
              </div>
            </button>
          `;
        }).join('') : '<div class="col-span-full bg-white border border-emerald-100 rounded-2xl p-8 text-center text-zinc-500">Belum ada perangkat terdaftar.</div>'}
      </div>
    </div>
  `;

  document.querySelectorAll('.device-card').forEach((button) => {
    button.addEventListener('click', () => {
      const deviceId = button.dataset.deviceId;
      context.openDeviceDashboard?.(deviceId);
    });
  });

  document.getElementById('add-device-btn')?.addEventListener('click', () => {
    openAddDeviceModal(container, context);
  });
};

function openAddDeviceModal(container, context) {
  const content = document.createElement('div');
  content.className = 'space-y-4';
  content.innerHTML = `
    <div class="space-y-2">
      <label class="text-xs uppercase tracking-wider text-zinc-400">Nama Perangkat</label>
      <input id="d-name" type="text" placeholder="Contoh: Smart Bin Gudang" class="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300">
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <label class="text-xs uppercase tracking-wider text-zinc-400">Lokasi</label>
        <input id="d-location" type="text" placeholder="Area Operasional" class="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300">
      </div>
      <div class="space-y-2">
        <label class="text-xs uppercase tracking-wider text-zinc-400">Kapasitas</label>
        <input id="d-capacity" type="number" placeholder="100" class="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300">
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <label class="text-xs uppercase tracking-wider text-zinc-400">Serial Number</label>
        <input id="d-serial" type="text" placeholder="SN-ET-XXXX" class="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300">
      </div>
      <div class="space-y-2">
        <label class="text-xs uppercase tracking-wider text-zinc-400">Firmware</label>
        <input id="d-firmware" type="text" value="v1.0.0" class="w-full bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 text-sm text-black focus:ring-1 focus:ring-emerald-300">
      </div>
    </div>
  `;

  modal.show('Tambah Perangkat', content, [
    {
      label: 'Daftarkan',
      onClick: async () => {
        const payload = {
          name: content.querySelector('#d-name')?.value.trim(),
          location: content.querySelector('#d-location')?.value.trim(),
          capacityKg: Number(content.querySelector('#d-capacity')?.value || 0),
          currentLoadKg: 0,
          serialNumber: content.querySelector('#d-serial')?.value.trim(),
          firmware: content.querySelector('#d-firmware')?.value.trim(),
          status: 'online',
        };

        if (!payload.name || !payload.location || payload.capacityKg <= 0) {
          toast.show('Nama, lokasi, dan kapasitas wajib diisi', 'error');
          return;
        }

        const device = await createDevice(payload);
        toast.show(`Perangkat ${device.name} berhasil didaftarkan`, 'success');
        renderDashboard(container, context);
      },
    },
  ]);
}
