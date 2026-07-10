const API_BASE_URL = "http://localhost:3010";

const uidEl = document.getElementById("rfid-uid");
const timeEl = document.getElementById("rfid-time");
const logsEl = document.getElementById("rfid-logs");

async function getLatestRFID() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rfid/latest`);
    const result = await response.json();

    if (result.data) {
      uidEl.textContent = result.data.uid;
      timeEl.textContent = result.data.time;
    }
  } catch (error) {
    console.error("Gagal mengambil RFID terbaru:", error);
  }
}

async function getRFIDLogs() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rfid/logs`);
    const result = await response.json();

    if (!result.data || result.data.length === 0) return;

    logsEl.innerHTML = result.data
      .slice(0, 10)
      .map((item) => {
        return `
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p class="text-sm font-bold text-slate-800 font-mono">${item.uid}</p>
            <p class="text-xs text-slate-400">${item.device || "Unknown Device"} • ${item.time}</p>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Gagal mengambil log RFID:", error);
  }
}

async function refreshRFID() {
  await getLatestRFID();
  await getRFIDLogs();
}

refreshRFID();
setInterval(refreshRFID, 1000);