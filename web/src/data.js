export const DEFAULT_PROFILE = {
  name: 'Eureka',
  email: 'eurekaakram@gmail.com',
  profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop',
  memberTier: 'Emerald Eco',
  joinedDate: 'Januari 2026',
};

export const DEFAULT_STATS = {
  totalPoints: 2450,
  totalBalance: 245000,
  totalWeight: 34.5,
  level: 4,
  currentLevelPoints: 2450,
  nextLevelPoints: 3000,
  impact: {
    co2Saved: 82.8,    // 1 kg trash recycled avoids ~2.4 kg CO2 representation
    energySaved: 195.4, // representing kWh saved
    waterSaved: 540,   // representing liters of water preserved
    landfillDiverted: 34.5, // exact trash diverted from landfill in kg
  }
};

export const INITIAL_WASTE_HISTORY = [
  {
    id: 'TRX-98231',
    type: 'Plastik',
    weight: 2.4,
    points: 240,
    earnedAmount: 24000,
    date: '2026-05-23',
    status: 'Berhasil',
    location: 'Smart Bin Unit 03 (Margonda)',
  },
  {
    id: 'TRX-97509',
    type: 'Kaleng',
    weight: 1.8,
    points: 450,
    earnedAmount: 45000,
    date: '2026-05-20',
    status: 'Berhasil',
    location: 'Drop-off Center Emerald Jakarta',
  },
  {
    id: 'TRX-96210',
    type: 'Elektronik',
    weight: 4.5,
    points: 900,
    earnedAmount: 90000,
    date: '2026-05-15',
    status: 'Berhasil',
    location: 'Drop-off Center Emerald Jakarta',
  },
  {
    id: 'TRX-95123',
    type: 'Kertas',
    weight: 8.2,
    points: 410,
    earnedAmount: 41000,
    date: '2026-05-08',
    status: 'Berhasil',
    location: 'Smart Bin Unit 01 (Senayan)',
  },
  {
    id: 'TRX-94883',
    type: 'Kaca',
    weight: 3.1,
    points: 310,
    earnedAmount: 31000,
    date: '2026-05-02',
    status: 'Berhasil',
    location: 'Smart Bin Unit 03 (Margonda)',
  },
  {
    id: 'TRX-93102',
    type: 'Lainnya',
    weight: 1.5,
    points: 140,
    earnedAmount: 14000,
    date: '2026-04-28',
    status: 'Berhasil',
    location: 'Smart Bin Unit 02 (Dago)',
  }
];

export const REWARD_CATALOG = [
  {
    id: 'RWD-001',
    title: 'Saldo GoPay Rp 50.000',
    pointsNeeded: 500,
    category: 'E-Wallet',
    iconName: 'gopay',
    description: 'Tukarkan poin Anda menjadi saldo GoPay siap pakai untuk kebutuhan harian.',
    provider: 'GoPay Indonesia',
  },
  {
    id: 'RWD-002',
    title: 'Saldo OVO Rp 100.000',
    pointsNeeded: 1000,
    category: 'E-Wallet',
    iconName: 'ovo',
    description: 'Transformasikan sampah menjadi saldo dompet digital OVO premium.',
    provider: 'OVO Indonesia',
  },
  {
    id: 'RWD-003',
    title: 'Donasi 2 Pohon Mangrove',
    pointsNeeded: 400,
    category: 'Sustainability',
    iconName: 'tree',
    description: 'Bantu reboisasi pesisir laut. Kami menanam 2 pohon atas nama Anda bekerja sama dengan LindungiHutan.',
    provider: 'LindungiHutan Foundation',
  },
  {
    id: 'RWD-004',
    title: 'Eco Friendly Stainless Tumblr',
    pointsNeeded: 1500,
    category: 'Merchandise',
    iconName: 'tumblr',
    description: 'Tumbler stainless steel anti karat modern berinsulasi suhu tinggi, warna matte forest green.',
    provider: 'EcoStore Indonesia',
  },
  {
    id: 'RWD-005',
    title: 'Voucher Tokopedia Rp 75.000',
    pointsNeeded: 750,
    category: 'Voucher Belanja',
    iconName: 'tokopedia',
    description: 'Diskon belanja langsung produk pilihan di official store Tokopedia tanpa minimum pembelian.',
    provider: 'Tokopedia',
  },
  {
    id: 'RWD-006',
    title: 'Reusable Grocery Mesh Bag',
    pointsNeeded: 300,
    category: 'Merchandise',
    iconName: 'bag',
    description: 'Tas jaring katun organik premium yang estetik & kuat untuk belanja bebas plastik sekali pakai.',
    provider: 'EcoStore Indonesia',
  }
];

export const INITIAL_REDEEMED_REWARDS = [
  {
    id: 'RDM-88123',
    rewardTitle: 'Saldo GoPay Rp 50.000',
    category: 'E-Wallet',
    pointsDeducted: 500,
    date: '2026-05-22',
    status: 'Berhasil',
    code: 'GP-ECO-77X829-92',
  },
  {
    id: 'RDM-87291',
    rewardTitle: 'Donasi 1 Pohon Mangrove',
    category: 'Sustainability',
    pointsDeducted: 200,
    date: '2026-05-18',
    status: 'Berhasil',
    code: 'LHG-TREE-ECO-113',
  },
  {
    id: 'RDM-86554',
    rewardTitle: 'Voucher Tokopedia Rp 50.000',
    category: 'Voucher Belanja',
    pointsDeducted: 500,
    date: '2026-05-10',
    status: 'Berhasil',
    code: 'TP-ECO-DISC50K',
  }
];

export const WEEKLY_STATS = [
  { day: 'Sen', weight: 4.2, points: 520 },
  { day: 'Sel', weight: 3.1, points: 380 },
  { day: 'Rab', weight: 8.5, points: 950 },
  { day: 'Kam', weight: 1.5, points: 150 },
  { day: 'Jum', weight: 5.6, points: 680 },
  { day: 'Sab', weight: 9.2, points: 1100 },
  { day: 'Min', weight: 2.4, points: 290 },
];

export const WASTE_TYPE_STATS = [
  { type: 'Plastik', weight: 14.5, percentage: 42, color: '#10b981' },
  { type: 'Kaleng', weight: 9.2, percentage: 27, color: '#06b6d4' },
  { type: 'Kertas', weight: 6.8, percentage: 19, color: '#f59e0b' },
  { type: 'Elektronik', weight: 4.0, percentage: 12, color: '#8b5cf6' },
];
