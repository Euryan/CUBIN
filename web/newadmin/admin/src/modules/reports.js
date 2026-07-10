/**
 * Reporting module for operational insights.
 */

import { fetchDashboardStats, getMonthlyDisposalSeries } from './data.js';
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

function moneyId(value) {
  return `Rp ${numberId(value)}`;
}

function bucketByCategory(rows) {
  const bucket = new Map();
  rows.forEach((row) => {
    const key = row.category || 'Lainnya';
    const current = bucket.get(key) || { category: key, total_weight: 0, total_points: 0, total_value: 0, total_entries: 0 };
    current.total_weight += Number(row.weight || 0);
    current.total_points += Number(row.point || 0);
    current.total_value += Number(row.total_price || 0);
    current.total_entries += 1;
    bucket.set(key, current);
  });
  return [...bucket.values()].sort((a, b) => b.total_weight - a.total_weight);
}

export const renderReports = async (container) => {
  const stats = await fetchDashboardStats();
  const disposals = stats.disposals || [];
  const users = stats.users || [];
  const now = Date.now();

  const ranges = {
    '7': 7,
    '30': 30,
    '90': 90,
    all: Infinity,
  };

  container.innerHTML = `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold tracking-tight text-black">Laporan Operasional</h2>
        <button id="export-report-btn" class="px-4 py-2 text-sm font-medium bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-all text-emerald-700 flex items-center gap-2 shadow-sm">
          ${icons.download} Export Laporan
        </button>
      </div>

      <div class="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
        <label class="text-xs uppercase tracking-wider text-zinc-500">Periode</label>
        <select id="report-range" class="bg-emerald-50 border border-emerald-100 text-sm text-zinc-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-300">
          <option value="7">7 Hari</option>
          <option value="30" selected>30 Hari</option>
          <option value="90">90 Hari</option>
          <option value="all">Semua Data</option>
        </select>
      </div>

      <div id="report-summary" class="grid grid-cols-1 md:grid-cols-4 gap-4"></div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
          <h3 class="text-lg font-semibold text-black mb-4">Top Kategori (berdasarkan berat)</h3>
          <div id="report-top-categories" class="space-y-3"></div>
        </div>
        <div class="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
          <h3 class="text-lg font-semibold text-black mb-4">Top Nasabah (berdasarkan poin)</h3>
          <div id="report-top-users" class="space-y-3"></div>
        </div>
      </div>

      <div class="bg-white border border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
        <div class="px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-black">Tren Bulanan</h3>
          <span class="text-xs text-zinc-500">Akumulasi berat, poin, dan nilai</span>
        </div>
        <div id="report-monthly-table"></div>
      </div>
    </div>
  `;

  const summary = document.getElementById('report-summary');
  const topCategories = document.getElementById('report-top-categories');
  const topUsers = document.getElementById('report-top-users');
  const monthlyTable = document.getElementById('report-monthly-table');
  const rangeSelect = document.getElementById('report-range');

  const renderRange = () => {
    const days = ranges[rangeSelect.value] || 30;
    const filtered = disposals.filter((row) => {
      if (!Number.isFinite(days)) return true;
      const diff = (now - new Date(row.created_at || now).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= days;
    });

    const totalWeight = filtered.reduce((sum, row) => sum + Number(row.weight || 0), 0);
    const totalPoints = filtered.reduce((sum, row) => sum + Number(row.point || 0), 0);
    const totalValue = filtered.reduce((sum, row) => sum + Number(row.total_price || 0), 0);

    summary.innerHTML = `
      ${metricCard('Total Transaksi', wholeNumber(filtered.length))}
      ${metricCard('Total Jumlah', wholeNumber(totalWeight))}
      ${metricCard('Total Poin', wholeNumber(totalPoints))}
      ${metricCard('Total Nilai', moneyId(totalValue), 'text-emerald-700')}
    `;

    const categories = bucketByCategory(filtered).slice(0, 5);
    topCategories.innerHTML = categories.length
      ? categories.map((item) => `
          <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <div class="flex justify-between text-sm font-medium text-zinc-700">
              <span>${item.category}</span>
              <span>${wholeNumber(item.total_weight)}</span>
            </div>
            <p class="mt-1 text-xs text-zinc-500">${item.total_entries} transaksi • ${moneyId(item.total_value)}</p>
          </div>
        `).join('')
      : '<p class="text-sm text-zinc-500">Belum ada data.</p>';

    const topByPoint = [...users].sort((a, b) => Number(b.total_point || 0) - Number(a.total_point || 0)).slice(0, 5);
    topUsers.innerHTML = topByPoint.length
      ? topByPoint.map((item) => `
          <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <div class="flex justify-between text-sm font-medium text-zinc-700">
              <span>${item.nama}</span>
              <span>${wholeNumber(item.total_point)} poin</span>
            </div>
            <p class="mt-1 text-xs text-zinc-500">RFID ${item.rfid_uid} • ${wholeNumber(item.total_entries)} setoran</p>
          </div>
        `).join('')
      : '<p class="text-sm text-zinc-500">Belum ada data nasabah.</p>';

    const monthlySeries = getMonthlyDisposalSeries(filtered);
    renderTable({
      container: monthlyTable,
      data: monthlySeries,
      columns: [
        { key: 'month', label: 'Bulan' },
        { key: 'total_entries', label: 'Transaksi', render: (value) => wholeNumber(value) },
        { key: 'total_weight', label: 'Jumlah', render: (value) => wholeNumber(value) },
        { key: 'total_points', label: 'Poin', render: (value) => wholeNumber(value) },
        { key: 'total_value', label: 'Nilai', render: (value) => `<span class="text-emerald-700 font-medium">${moneyId(value)}</span>` },
      ],
    });
  };

  rangeSelect?.addEventListener('change', renderRange);
  renderRange();

  document.getElementById('export-report-btn')?.addEventListener('click', () => {
    const days = ranges[rangeSelect.value] || 30;
    const filtered = disposals.filter((row) => {
      if (!Number.isFinite(days)) return true;
      const diff = (now - new Date(row.created_at || now).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= days;
    });

    exportToCSV(filtered, `bank_sampah_report_${rangeSelect.value}`, [
      { key: 'id', label: 'Log ID' },
      { key: 'user_name', label: 'Nasabah' },
      { key: 'rfid_uid', label: 'RFID UID' },
      { key: 'category', label: 'Kategori' },
      { key: 'weight', label: 'Jumlah' },
      { key: 'point', label: 'Poin' },
      { key: 'total_price', label: 'Nilai (Rp)' },
      { key: 'created_at', label: 'Waktu' },
    ]);
  });
};

function metricCard(title, value, valueClass = 'text-black') {
  return `
    <div class="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wider text-zinc-400">${title}</p>
      <p class="mt-2 text-2xl font-bold ${valueClass}">${value}</p>
    </div>
  `;
}
