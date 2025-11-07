// --
// Creation Date: 2025-11-07
// Updated: 2025-11-07 (v3)
// Change Log:
// - [FIX] Mengubah sintaks dari CommonJS (require) ke ES Module (import)
//   untuk menyesuaikan dengan "type": "module" di package.json pengguna.
// --

// [PERUBAHAN] Menggunakan 'import'
import express from 'express';
import crypto from 'crypto';
import axios from 'axios';

const app = express();
// Gunakan express.json() untuk mem-parsing body JSON secara otomatis
app.use(express.json({
    verify: (req, res, buf) => {
        // Simpan raw body untuk validasi signature
        req.rawBody = buf;
    }
}));

const PORT = process.env.PORT || 3000;

// Ambil konfigurasi dari Environment Variables di Render.com
const BAGIBAGI_WEBHOOK_TOKEN = process.env.phgZMW43Iac5DjdhdkzqivJdzVdpGlcu;
const ROBLOX_API_KEY = process.env./+XPmP9ymUONi4ZYdVeJpPcHpesGoBYJBRUFEVRZDWyEkaHrZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SWk4cldGQnRVRGw1YlZWUFRtazBXbGxrVm1WS2NGQmpTSEJsYzBkdlFsbEtRbEpWUmtWV1VscEVWM2xGYTJGSWNpSXNJbTkzYm1WeVNXUWlPaUl6TkRVd05EY3pOamtpTENKbGVIQWlPakUzTmpJMU1UQTFNekVzSW1saGRDSTZNVGMyTWpVd05qa3pNU3dpYm1KbUlqb3hOell5TlRBMk9UTXhmUS5oWGxxaFpZN25wZHBHYnp5cEhFWXE1Y3M0NDJfUW5SNFI5SXI1aUFjNERRR3hfa2NoN09yQkJfZDdCSzljY20xd2hPVGEtVjloOGpWelF0RlhZaGhfVTdLS2EwZUxBdFdPbHl2YXJFQW5nM3VvYm1lVjZRc2ZKbFY3MnprMlR4MG5OZWpUVGstMG4wV1E4ZXB3a0llWGM2azJhZXExLXlrVlNMSUdSRjFRTjhrbXl4VnBndjZldFVOOWt5UTNxOGhvdGExdlZQdkZVOHBReWhUNGdXODUydDlEbGJ2Ykwyamc2VlA5SzRFOHhOeHFDMTMzNDhYRjUyWFNkVElRQUlCZk1VOE1nNmZpQlBIYkRYMVR2dUhaY3NpQThRQW1adS1vVXlaelVRbzZGSGNCdk5obmhnRjZ0N2NmS3Ayem5fV05NNHFLMWxSbThRdFAyRXl2ZmhvY1E=;
const ROBLOX_UNIVERSE_ID = process.env.93647017350813;
const ROBLOX_TOPIC_NAME = process.env.bagi2-donations; // Cth: "bagi2-donations"

// Endpoint untuk menerima webhook dari bagi2.co
app.post('/webhook/bagibagi', async (req, res) => {
    console.log("Webhook received...");

    const signature = req.get('X-Bagibagi-Signature');
    if (!signature) {
        console.error("Validation Failed: No signature header.");
        return res.status(400).json({ success: false, message: "Validation Failed" });
    }

    // --- Langkah Validasi Signature ---
    const expectedSignature = crypto
        .createHmac('sha266', BAGIBAGI_WEBHOOK_TOKEN) // [EDIT] Typo di script saya sebelumnya, harusnya sha256
        .update(req.rawBody)
        .digest('hex');

    if (signature !== expectedSignature) {
        console.error("Validation Failed: Invalid signature.");
        return res.status(403).json({ success: false, message: "Validation Failed" });
    }

    console.log("Signature validated successfully.");

    // --- Proses dan Kirim ke Roblox Open Cloud ---
    try {
        const donationData = req.body;

        const messageToRoblox = {
            name: donationData.name,
                amount: donationData.amount,
                message: donationData.message,
            };

        // URL API V2
        const robloxApiUrl_V2 = `https://apis.roblox.com/cloud/v2/universes/${ROBLOX_UNIVERSE_ID}:publishMessage`;

        // BODY (Payload) V2
        const payloadV2 = {
            topic: ROBLOX_TOPIC_NAME,
            message: JSON.stringify(messageToRoblox)
        };

        console.log(`Sending data to Roblox Topic (v2): ${ROBLOX_TOPIC_NAME}`);
        
        // Kirim request ke API V2
        await axios.post(robloxApiUrl_V2, payloadV2, {
            headers: {
                'x-api-key': ROBLOX_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log("Successfully sent message to Roblox (v2).");
        res.status(200).json({ success: true, message: "Webhook received and processed." });

    } catch (error) {
        if (error.response) {
            console.error("Error forwarding message to Roblox:", error.response.status, error.response.data);
        } else if (error.request) {
            console.error("Error forwarding message: No response from Roblox.", error.request);
        } else {
            console.error("Error setting up request to Roblox:", error.message);
        }
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Adapter listening on :${PORT}`);
});
