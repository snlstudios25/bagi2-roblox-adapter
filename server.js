import express from "express";
import axios from "axios";
import CryptoJS from "crypto-js";

const app = express();
app.use(express.json());

const {
  PORT = 3000,
  BAGI2_BASE_URL = "https://bagibagi.co",
  MERCHANT_CODE,
  API_KEY,
  ROBLOX_API_KEY,
  ROBLOX_UNIVERSE_ID,
  ROBLOX_TOPIC = "bagi2-donations"
} = process.env;

if (!MERCHANT_CODE || !API_KEY || !ROBLOX_API_KEY || !ROBLOX_UNIVERSE_ID) {
  console.warn("[WARN] Env belum lengkap. Pastikan MERCHANT_CODE, API_KEY, ROBLOX_API_KEY, ROBLOX_UNIVERSE_ID terisi.");
}

async function publishToRoblox(message) {
  const url = `https://apis.roblox.com/messaging-service/v1/universes/${ROBLOX_UNIVERSE_ID}/topics/${encodeURIComponent(ROBLOX_TOPIC)}`;
  const payload = { message: JSON.stringify(message) };
  const headers = { "x-api-key": ROBLOX_API_KEY, "content-type": "application/json" };
  const res = await axios.post(url, payload, { headers });
  return res.status;
}

app.get("/health", (_req, res) => res.send("ok"));

app.post("/webhook/bagibagi", async (req, res) => {
  try {
    const d = req.body || {};
    const msg = {
      type: "donation",
      at: new Date().toISOString(),
      userName: d?.userName ?? "Seseorang",
      amount: Number(d?.amount ?? 0),
      message: d?.message ?? "",
      isVerified: !!d?.isVerified,
      isAnonymous: !!d?.isAnonymous
    };
    await publishToRoblox(msg);
    res.json({ success: true });
  } catch (e) {
    console.error("Webhook error:", e?.response?.data || e.message);
    res.status(500).json({ success: false, error: "failed forward to roblox" });
  }
});

app.post("/push/latest", async (req, res) => {
  try {
    const page = Number(req.body?.page ?? 1);
    const pageSize = Number(req.body?.pageSize ?? 10);
    const path = "/api/partnerintegration/transactions";
    const raw = `${MERCHANT_CODE}${API_KEY}${path}${page}${pageSize}`;
    const token = CryptoJS.MD5(raw).toString();
    const url = `${BAGI2_BASE_URL}${path}?page=${page}&pageSize=${pageSize}&merchantCode=${encodeURIComponent(MERCHANT_CODE)}&token=${token}`;
    const { data } = await axios.get(url);
    await publishToRoblox({ type: "transactions", at: new Date().toISOString(), raw: data });
    res.json({ success: true, forwarded: true, count: data?.data?.items?.length || 0 });
  } catch (e) {
    console.error("push/latest error:", e?.response?.data || e.message);
    res.status(500).json({ success: false, error: "failed to fetch/forward" });
  }
});

app.post("/test/ping", async (_req, res) => {
  try {
    await publishToRoblox({ type: "ping", at: new Date().toISOString() });
    res.json({ success: true });
  } catch (e) {
    console.error("test/ping error:", e?.response?.data || e.message);
    res.status(500).json({ success: false });
  }
});
app.get("/test/ping", async (req, res) => {
  try {
    console.log("[Bagi2] /test/ping (GET) hit");
    await publishToRoblox({ type: "ping", at: new Date().toISOString() });
    console.log("[Bagi2] /test/ping forwarded to Roblox");
    res.json({ success: true });
  } catch (e) {
    console.error("[Bagi2] /test/ping error:", e.response?.data || e.message);
    res.status(500).json({ success: false, error: e.response?.data || e.message });
  }
});

app.listen(PORT, () => console.log(`Adapter listening on :${PORT}`));
