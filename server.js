// --
// Creation Date: 2025-11-07
// Updated: 2025-11-07
// Change Log:
// - [FIX] Migrasi dari MessagingService API v1 ke v2
//   (https://apis.roblox.com/cloud/v2/universes/...)
//   untuk memperbaiki error 'InsufficientScope' yang disebabkan oleh UI permission
//   Creator Hub yang baru.
// --

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

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
const BAGIBAGI_WEBHOOK_TOKEN = process.env.BAGIBAGI_WEBHOOK_TOKEN;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const ROBLOX_UNIVERSE_ID = process.env.ROBLOX_UNIVERSE_ID;
const ROBLOX_TOPIC_NAME = process.env.ROBLOX_TOPIC_NAME; // Cth: "bagi2-donations"

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
        .createHmac('sha256', BAGIBAGI_WEBHOOK_TOKEN)
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

        // Siapkan data yang akan dikirim ke Roblox
        const messageToRoblox = {
            name: donationData.name,
            amount: donationData.amount,
            message: donationData.message,
        };

        // ====================================================================
        // [PERUBAHAN UTAMA] Menggunakan API v2
        // ====================================================================
        
        // URL API V2
        // (Perhatikan formatnya: .../universes/{id}:publishMessage)
        const robloxApiUrl_V2 = `https://apis.roblox.com/cloud/v2/universes/${ROBLOX_UNIVERSE_ID}:publishMessage`;

        // BODY (Payload) V2
        // (Topic sekarang ada di dalam body, bersama dengan message)
        const payloadV2 = {
            topic: ROBLOX_TOPIC_NAME,
            message: JSON.stringify(messageToRoblox)
        };
        
        // ====================================================================

        console.log(`Sending data to Roblox Topic (v2): ${ROBLOX_TOPIC_NAME}`);
        
        // Kirim request ke API V2
        await axios.post(robloxApiUrl_V2, payloadV2, {
            headers: {
                'x-api-key': ROBLOX_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log("Successfully sent message to Roblox (v2).");
        // Kirim response sukses kembali ke bagi2.co
        res.status(200).json({ success: true, message: "Webhook received and processed." });

    } catch (error) {
        // Tangkap error dengan lebih baik untuk debugging
        if (error.response) {
            // Error dari Roblox (misal 4xx, 5xx)
            console.error("Error forwarding message to Roblox:", error.response.status, error.response.data);
        } else if (error.request) {
            // Request terkirim tapi tidak ada respon
            console.error("Error forwarding message: No response from Roblox.", error.request);
        } else {
            // Error saat setup request
            console.error("Error setting up request to Roblox:", error.message);
        }
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Adapter listening on :${PORT}`);
});
