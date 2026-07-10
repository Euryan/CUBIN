import express from "express";
import cors from "cors";
import crypto from "node:crypto";

const app = express();
const PORT = 3010;
const BACKEND_API_BASE = (process.env.BACKEND_API_BASE || "http://127.0.0.1:8000").replace(/\/$/, "");
const FIRST_TRASH_TIMEOUT_MS = 30_000;
const NEXT_TRASH_TIMEOUT_MS = 5_000;

app.use(cors());
app.use(express.json());

let latestRFID = null;
let rfidLogs = [];
const activeSessions = new Map();
const cachedUsers = new Map();

const demoUsers = [
  {
    id: "USR-001",
    uid: "634339FE",
    name: "Eureka",
    points: 450,
    balance: 12000,
  },
];

function createRFIDPayload(uid, device) {
  return {
    uid,
    device: device || "Unknown Device",
    time: new Date().toLocaleString("id-ID"),
    timestamp: Date.now(),
  };
}

function recordRFIDScan(uid, device) {
  const data = createRFIDPayload(uid, device);
  latestRFID = data;
  rfidLogs.unshift(data);
  return data;
}

function normalizeUid(uid) {
  return String(uid || "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function createSessionId() {
  return crypto.randomUUID();
}

function getSessionDeadline(session) {
  if (session.state === "WAITING_FIRST_TRASH") {
    return session.firstTrashDeadline;
  }

  if (session.state === "ACTIVE_BATCH") {
    return session.nextTrashDeadline;
  }

  return 0;
}

function isSessionExpired(session) {
  return Date.now() > getSessionDeadline(session);
}

function finalizeSession(hardwareId, reason = "completed") {
  const session = activeSessions.get(hardwareId);

  if (!session) {
    return null;
  }

  session.state = "COMPLETED";
  session.completedAt = Date.now();
  session.closeReason = reason;

  console.log("Session selesai:", {
    sessionId: session.sessionId,
    userId: session.userId,
    uid: session.uid,
    trashCount: session.trashCount,
    reason,
  });

  activeSessions.delete(hardwareId);

  return session;
}

function getValidSession(hardwareId) {
  const session = activeSessions.get(hardwareId);

  if (!session) {
    return null;
  }

  if (isSessionExpired(session)) {
    const reason = session.state === "WAITING_FIRST_TRASH"
      ? "first-trash-timeout"
      : "next-trash-timeout";

    finalizeSession(hardwareId, reason);
    return null;
  }

  return session;
}

function serializeSession(session) {
  const deadline = getSessionDeadline(session);

  return {
    sessionId: session.sessionId,
    hardwareId: session.hardwareId,
    state: session.state,
    trashCount: session.trashCount,
    totalPointsEarned: session.totalPointsEarned,
    deadline,
    remainingMs: Math.max(0, deadline - Date.now()),
    lastTransaction: session.lastTransaction,
  };
}

function calculatePoints(category, weight) {
  const pointsPerKg = {
    Plastik: 100,
    Kaleng: 150,
    Kertas: 80,
    Kaca: 120,
  };

  const rate = pointsPerKg[category] || 0;

  return Math.max(1, Math.round(rate * weight));
}

async function findUserByUid(uid) {
  const normalizedUid = normalizeUid(uid);

  try {
    const response = await fetch(`${BACKEND_API_BASE}/api/v1/users/rfid/${encodeURIComponent(normalizedUid)}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(errorBody || `Backend lookup failed with ${response.status}`);
    }

    const user = await response.json();

    const normalizedUser = {
      id: user.id || user.user_id || user.userId,
      uid: normalizedUid,
      name: user.nama || user.username || user.name || "User",
      points: Number(user.total_point ?? user.points ?? 0),
      balance: Number(user.saldo_reward ?? user.balance ?? 0),
    };

    if (normalizedUser.id) {
      cachedUsers.set(normalizedUser.id, normalizedUser);
    }

    return normalizedUser;
  } catch (error) {
    console.warn("Fallback to local demo user for findUserByUid:", error?.message || error);
    return demoUsers.find((user) => user.uid.toUpperCase() === normalizedUid) || null;
  }
}

async function findUserById(userId) {
  if (cachedUsers.has(userId)) {
    return cachedUsers.get(userId);
  }

  const localUser = demoUsers.find((user) => user.id === userId);
  if (localUser) {
    return localUser;
  }

  // TODO: Ganti dengan query database milikmu jika diperlukan.
  return null;
}

async function addPointsToUser(userId, pointsToAdd) {
  // TODO: Ganti dengan update database milikmu agar poin/saldo benar-benar tersimpan.
  const user = cachedUsers.get(userId) || demoUsers.find((item) => item.id === userId);

  if (!user) {
    throw new Error("User tidak ditemukan");
  }

  user.points += Number(pointsToAdd || 0);
  user.balance += Number(pointsToAdd || 0) * 100;

  cachedUsers.set(userId, user);

  return user;
}

async function saveTransaction(transaction) {
  console.log("Transaksi baru:", transaction);

  // TODO: Ganti dengan penyimpanan transaksi ke database milikmu.
  // Contoh:
  // await db.addTransaction(transaction);

  return transaction;
}

async function sendHardwareDetectionToBackend(payload) {
  const response = await fetch(`${BACKEND_API_BASE}/api/v1/trash/detect-hardware`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(errorBody || `Backend detect-hardware failed with ${response.status}`);
  }

  return response.json();
}

app.post("/api/rfid", (req, res) => {
  const { uid, device } = req.body;

  if (!uid) {
    return res.status(400).json({
      success: false,
      message: "UID tidak ditemukan",
    });
  }

  const data = recordRFIDScan(uid, device);

  console.log("RFID Masuk:", data);

  res.json({
    success: true,
    message: "UID berhasil diterima",
    data,
  });
});

app.post("/api/rfid/check-user", async (req, res) => {
  try {
    const uid = normalizeUid(req.body.uid);
    const device = String(req.body.device || "CUBIN-RFID-ESP8266-01");
    const hardwareId = String(req.body.hardware_id || "CUBIN-UNIT-01");

    if (!uid) {
      return res.status(400).json({
        success: false,
        registered: false,
        message: "UID kosong",
      });
    }

    const scan = recordRFIDScan(uid, device);
    const user = await findUserByUid(uid);

    const log = {
      uid,
      device,
      hardwareId,
      time: scan.time,
      timestamp: scan.timestamp,
    };

    console.log("RFID Check User:", log);

    if (!user) {
      return res.status(404).json({
        success: false,
        registered: false,
        message: "Kartu belum terdaftar",
        uid,
      });
    }

    const previousSession = getValidSession(hardwareId);

    if (previousSession && previousSession.uid === uid) {
      return res.json({
        success: true,
        registered: true,
        reusedSession: true,
        message: "Sesi pengguna masih aktif",
        session: serializeSession(previousSession),
        user: {
          id: user.id,
          name: user.name,
          points: user.points,
          balance: user.balance,
        },
      });
    }

    if (previousSession && previousSession.uid !== uid) {
      finalizeSession(hardwareId, "replaced-by-new-rfid");
    }

    const now = Date.now();

    const session = {
      sessionId: createSessionId(),
      hardwareId,
      rfidDevice: device,
      uid,
      userId: user.id,
      state: "WAITING_FIRST_TRASH",
      trashCount: 0,
      totalPointsEarned: 0,
      createdAt: now,
      lastActivityAt: now,
      firstTrashDeadline: now + FIRST_TRASH_TIMEOUT_MS,
      nextTrashDeadline: null,
      lastTransaction: null,
    };

    activeSessions.set(hardwareId, session);

    return res.json({
      success: true,
      registered: true,
      reusedSession: false,
      message: "User ditemukan, menunggu sampah",
      session: serializeSession(session),
      user: {
        id: user.id,
        name: user.name,
        points: user.points,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("RFID check error:", error);
    return res.status(500).json({
      success: false,
      registered: false,
      message: "Terjadi kesalahan server",
    });
  }
});

app.get("/api/session/active", async (req, res) => {
  try {
    const hardwareId = String(req.query.hardware_id || "CUBIN-UNIT-01");
    const session = getValidSession(hardwareId);

    if (!session) {
      return res.status(404).json({
        success: false,
        active: false,
        message: "Tidak ada sesi aktif",
      });
    }

    const user = await findUserById(session.userId);

    if (!user) {
      finalizeSession(hardwareId, "user-not-found");

      return res.status(404).json({
        success: false,
        active: false,
        message: "User tidak ditemukan",
      });
    }

    return res.json({
      success: true,
      active: true,
      session: serializeSession(session),
      user: {
        id: user.id,
        name: user.name,
        points: user.points,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("Get active session error:", error);

    return res.status(500).json({
      success: false,
      active: false,
      message: "Terjadi kesalahan server",
    });
  }
});

app.post("/api/v1/trash/detect-hardware", async (req, res) => {
  try {
    const {
      class_index,
      category,
      confidence_ai,
      weight,
      hardware_id,
      location,
    } = req.body;

    const hardwareId = String(hardware_id || "CUBIN-UNIT-01");
    const session = getValidSession(hardwareId);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Tidak ada sesi RFID aktif. Silakan tap kartu.",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Kategori sampah kosong",
      });
    }

    const numericWeight = Number(weight) || 0;
    const numericConfidence = Number(confidence_ai) || 0;
    const now = Date.now();

    const backendResult = await sendHardwareDetectionToBackend({
      class_index: Number(class_index),
      confidence_ai: numericConfidence,
      weight: numericWeight,
      rfid_uid: session.uid,
      hardware_id: hardwareId,
      location: location || "CUBIN",
    });

    const pointsEarned = Number(backendResult.points_earned ?? calculatePoints(category, numericWeight));
    const updatedUser = await findUserByUid(session.uid);

    const transaction = {
      id: `TRX-${now}`,
      sessionId: session.sessionId,
      userId: session.userId,
      uid: session.uid,
      hardwareId,
      location: location || "CUBIN",
      classIndex: Number(class_index),
      category: backendResult.category || category,
      confidenceAi: numericConfidence,
      weight: numericWeight,
      pointsEarned,
      cashEarned: Number(backendResult.cash_earned || 0),
      backendTrashId: backendResult.trash_id || null,
      createdAt: now,
      time: new Date().toLocaleString("id-ID"),
      detectedAt: backendResult.detected_at || null,
    };

    session.state = "ACTIVE_BATCH";
    session.trashCount += 1;
    session.totalPointsEarned += pointsEarned;
    session.lastActivityAt = now;
    session.nextTrashDeadline = now + NEXT_TRASH_TIMEOUT_MS;
    session.lastTransaction = {
      id: transaction.id,
      category: transaction.category,
      weight: transaction.weight,
      pointsEarned: transaction.pointsEarned,
      createdAt: transaction.createdAt,
    };

    return res.json({
      success: true,
      message: "Transaksi berhasil. Menunggu sampah berikutnya.",
      points_earned: pointsEarned,
      session: serializeSession(session),
      transaction,
      user: {
        id: updatedUser?.id || session.userId,
        name: updatedUser?.name || "User",
        points: Number(updatedUser?.points || 0),
        balance: Number(updatedUser?.balance || 0),
      },
    });
  } catch (error) {
    console.error("Trash detection error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan transaksi",
    });
  }
});

app.post("/api/session/close", (req, res) => {
  const hardwareId = String(req.body.hardware_id || "CUBIN-UNIT-01");
  finalizeSession(hardwareId, "manual-close");

  return res.json({
    success: true,
    message: "Sesi ditutup",
  });
});

app.get("/api/rfid/latest", (req, res) => {
  res.json({
    success: true,
    data: latestRFID,
  });
});

app.get("/api/rfid/logs", (req, res) => {
  res.json({
    success: true,
    data: rfidLogs,
  });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`CUBIN API aktif di port ${PORT}`);
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.log(`Port ${PORT} sudah digunakan. RFID server kemungkinan sudah berjalan.`);
    process.exit(0);
    return;
  }

  console.error("RFID server gagal dijalankan:", error);
  process.exit(1);
});