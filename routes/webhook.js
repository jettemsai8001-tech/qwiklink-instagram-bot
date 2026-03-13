'use strict';

const express    = require('express');
const router     = express.Router();
const { verifyWebhook, handleWebhook } = require('../controllers/instagramController');

/**
 * GET /webhook
 * Meta calls this once when you first configure the webhook.
 * It passes hub.mode, hub.verify_token, hub.challenge as query params.
 */
router.get('/', verifyWebhook);

/**
 * POST /webhook
 * Meta sends all Instagram events (comments, DMs, etc.) here.
 * Must respond 200 within 20 seconds or Meta will retry.
 */
router.post('/', handleWebhook);

module.exports = router;
