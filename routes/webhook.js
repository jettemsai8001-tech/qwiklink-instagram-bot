const express = require('express');
const router = express.Router();

// ─────────────────────────────────────────────────────────
// 1. GET: Webhook Verification (The Handshake)
// ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        console.log('✅ WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// ─────────────────────────────────────────────────────────
// 2. POST: Handle Incoming Messages
// ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const body = req.body;

    if (body.object === 'instagram') {
        try {
            for (const entry of body.entry) {
                // Safety check for different types of Instagram data
                const webhook_event = entry.messaging ? entry.messaging[0] : entry.changes?.[0]?.value;
                
                if (!webhook_event) continue;

                const sender_id = webhook_event.sender?.id || webhook_event.from?.id;
                const message_text = webhook_event.message?.text;

                if (message_text && sender_id) {
                    console.log(`📩 Received: "${message_text}" from ${sender_id}`);
                    
                    // Run the reply function
                    await sendReply(sender_id, message_text.toLowerCase());
                }
            }
            res.status(200).send('EVENT_RECEIVED');
        } catch (err) {
            console.error('❌ Error processing entries:', err);
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(404);
    }
});

// ─────────────────────────────────────────────────────────
// 3. Helper Function: Send Reply using "fetch"
// ─────────────────────────────────────────────────────────
async function sendReply(recipient_id, incomingText) {
    // This grabs the token you saved in Render
    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    const url = "https://graph.facebook.com/v19.0/me/messages";
    
    // Simple logic for what the bot says
    let replyText = "Hello! I am your QwikLink bot. Type 'link' to see more! 🚀";
    
    if (incomingText.includes("link")) {
        replyText = "Check out our business profile: https://qwiklink.in/qwiklink";
    }

    try {
        const response = await fetch(`${url}?access_token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: recipient_id },
                message: { text: replyText }
            })
        });

        const result = await response.json();

        if (response.ok) {
            console.log(`📤 Reply sent successfully to ${recipient_id}`);
        } else {
            // This will print the EXACT reason why Meta is rejecting your token
            console.error('❌ Meta API Error:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.error('❌ Network Error:', error.message);
    }
}

module.exports = router;
