const express = require('express');
const router = express.Router();
const axios = require('axios'); // Make sure you ran 'npm install axios'

router.post('/', async (req, res) => {
    const body = req.body;

    if (body.object === 'instagram') {
        for (const entry of body.entry) {
            const webhook_event = entry.messaging[0];
            const sender_id = webhook_event.sender.id;
            const message_text = webhook_event.message?.text;

            if (message_text) {
                console.log(`Received: "${message_text}" from ${sender_id}`);
                
                // Trigger the reply
                try {
                    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`, {
                        recipient: { id: sender_id },
                        message: { text: "Got your message! I'm the QwikLink bot 🚀" }
                    });
                } catch (error) {
                    console.error('Error sending reply:', error.response?.data || error.message);
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// GET route for Meta verification (Keep this for the handshake!)
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

module.exports = router;
