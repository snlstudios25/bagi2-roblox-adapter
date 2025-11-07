// --
// Creation Date: 2025-11-07
// Updated: 2025-11-07 (v6 - Final Fix)
// Change Log:
// - [FIX] Mengubah nama variabel dari ROBLOX_TOPIC_NAME menjadi ROBLOX_TOPIC
//   agar cocok dengan pengaturan Environment Variable di Render.com.
// --

import express from 'express';
import crypto from 'crypto';
import axios from 'axios';

const app = express();
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

const PORT = process.env.PORT || 3000;

const BAGIBAGI_WEBHOOK_TOKEN = process.env.BAGIBAGI_WEBHOOK_TOKEN;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const ROBLOX_UNIVERSE_ID = process.env.ROBLOX_UNIVERSE_ID;

// ====================================================================
// [PERUBAHAN DI SINI]
// Nama variabel diubah agar cocok dengan setting Render.com Anda
const ROBLOX_TOPIC_NAME = process.env.ROBLOX_TOPIC; 
// ====================================================================

// Health Check Endpoint untuk Render.com
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Endpoint untuk menerima webhook dari bagi2.co
app.post('/webhook/bagibagi', async (req, res) => {
    console.log("Webhook received (API v1 attempt)...");

    const signature = req.get('X-Bagibagi-Signature');
    if (!signature) {
        console.error("V1: Validation Failed: No signature header.");
        return res.status(400).json({ success: false, message: "Validation Failed" });
    }

    // --- Langkah Validasi Signature ---
    const expectedSignature = crypto
        .createHmac('sha256', BAGIBAGI_WEBHOOK_TOKEN)
        .update(req.rawBody)
        .digest('hex');

    if (signature !== expectedSignature) {
        console.error("V1: Validation Failed: Invalid signature.");
        return res.status(403).json({ success: false, message: "Validation Failed" });
    }

    console.log("V1: Signature validated successfully.");

    // --- Proses dan Kirim ke Roblox Open Cloud (V1) ---
    try {
        const donationData = req.body;

        const messageToRoblox = {
            name: donationData.name,
            amount: donationData.amount,
            message: donationData.message,
        };

        const robloxApiUrl_V1 = `https://apis.roblox.com/messaging-service/v1/universes/${ROBLOX_UNIVERSE_ID}/topics/${ROBLOX_TOPIC_NAME}`;
        
        const payloadV1 = {
            message: JSON.stringify(messageToRoblox)
        };
        
        console.log(`Sending data to Roblox Topic (v1): ${ROBLOX_TOPIC_NAME}`);
        
        await axios.post(robloxApiUrl_V1, payloadV1, {
            headers: {
                'x-api-key': ROBLOX_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log("Successfully sent message to Roblox (v1).");
        res.status(200).json({ success: true, message: "Webhook received and processed." });

    } catch (error) {
        if (error.response) {
            console.error("V1: Error forwarding message to Roblox:", error.response.status, error.response.data);
        } else if (error.request) {
            console.error("V1: Error forwarding message: No response from Roblox.", error.request);
        } else {
            console.error("V1: Error setting up request to Roblox:", error.message);
        }
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Adapter listening on :${PORT}`);
});
