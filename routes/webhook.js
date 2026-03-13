const express = require('express');
const router = express.Router();

// 1. GET: Verification (The Handshake)
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

// 2. POST: Handle Incoming Messages
router.post('/', async (req, res) => {
    const body = req.body;

    if (body.object === 'instagram') {
        for (const entry of body.entry) {
            const webhook_event = entry.messaging ? entry.messaging[0] : entry.changes?.[0]?.value;
            
            if (!webhook_event) continue;

            const sender_id = webhook_event.sender?.id || webhook_event.from?.id;
            const message_text = webhook_event.message?.text;

            if (message_text && sender_id) {
                console.log(`📩 Received: "${message_text}" from ${sender_id}`);
                
                // Use the built-in fetch to send a reply
                await sendReply(sender_id, message_text.toLowerCase());
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// 3. Helper Function to send the message using "fetch"
async function sendReply(recipient_id, text) {
    const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`;
    
    let replyText = "Hello! I am your QwikLink bot 🚀";
    if (text.includes("link")) {
        replyText = `Here is our link: https://qwiklink.in/${process.env.BUSINESS_SLUG}`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: recipient_id },
                message: { text: replyText }
            })
        });

        if (response.ok) {
            console.log(`📤 Reply sent to ${recipient_id}`);
        } else {
            const errorData = await response.json();
            console.error('❌ Meta API Error:', errorData);
        }
    } catch (error) {
        console.error('❌ Network Error:', error.message);
    }
}

module.exports = router;
