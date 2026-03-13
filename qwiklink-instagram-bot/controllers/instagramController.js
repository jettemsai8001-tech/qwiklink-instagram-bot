'use strict';

const crypto = require('crypto');
const { containsLocationKeyword, getMatchedKeywords } = require('../utils/keywordDetector');
const {
  getBusinessUrl,
  replyToComment,
  sendDirectMessage,
} = require('../services/instagramService');

// ─────────────────────────────────────────────────────────
// Payload signature validation
// ─────────────────────────────────────────────────────────

/**
 * Validate the X-Hub-Signature-256 header from Meta to ensure
 * the webhook payload genuinely came from Instagram/Meta.
 *
 * @param {string} rawBody      - Raw request body string.
 * @param {string} signature    - Value of X-Hub-Signature-256 header.
 * @returns {boolean}
 */
function isValidSignature(rawBody, signature) {
  if (!signature) return false;

  const appSecret = process.env.APP_SECRET;
  if (!appSecret) {
    console.warn('[SECURITY] APP_SECRET not set — skipping signature check');
    return true; // allow in dev but warn loudly
  }

  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')}`;

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// Comment handler
// ─────────────────────────────────────────────────────────

/**
 * Process a comment change event from the webhook.
 *
 * Expected structure (Instagram Graph API v19+):
 * {
 *   field: "comments",
 *   value: {
 *     id: "<comment_id>",
 *     text: "<comment text>",
 *     from: { id: "<user_id>", username: "<username>" },
 *     media: { id: "<media_id>" }
 *   }
 * }
 */
async function handleComment(change) {
  const value = change.value || {};
  const commentId  = value.id;
  const text       = value.text || '';
  const username   = value?.from?.username || 'unknown';

  if (!commentId || !text) {
    console.log('[COMMENT] Missing commentId or text — skipping');
    return;
  }

  // Ignore replies from the business account itself to avoid infinite loops
  const fromId    = value?.from?.id || '';
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID || '';
  if (fromId === accountId) {
    console.log(`[COMMENT] Own comment from account ${fromId} — skipping`);
    return;
  }

  console.log(`[COMMENT] @${username} (${commentId}): "${text}"`);

  if (!containsLocationKeyword(text)) {
    console.log(`[COMMENT] No location keyword found — skipping`);
    return;
  }

  const matched = getMatchedKeywords(text);
  console.log(`[COMMENT] Keyword(s) matched: [${matched.join(', ')}] — sending reply`);

  const businessUrl = getBusinessUrl();
  const replyText   = `Get directions here 👇\n${businessUrl}`;

  try {
    const result = await replyToComment(commentId, replyText);
    console.log(`[COMMENT] Reply sent successfully. Response:`, result);
  } catch (err) {
    console.error(`[COMMENT] Failed to send reply:`, err?.response?.data || err.message);
  }
}

// ─────────────────────────────────────────────────────────
// DM / Message handler
// ─────────────────────────────────────────────────────────

/**
 * Process a messaging event (DM) from the webhook.
 *
 * Expected structure:
 * {
 *   sender:    { id: "<user_id>" },
 *   recipient: { id: "<account_id>" },
 *   message: {
 *     mid: "<message_id>",
 *     text: "<message text>"
 *   }
 * }
 */
async function handleMessage(messagingEvent) {
  const senderId  = messagingEvent?.sender?.id;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID || '';
  const text      = messagingEvent?.message?.text || '';
  const mid       = messagingEvent?.message?.mid || '';

  if (!senderId || !text) {
    console.log('[DM] Missing senderId or text — skipping');
    return;
  }

  // Ignore messages from the business account itself
  if (senderId === accountId) {
    console.log(`[DM] Own message — skipping`);
    return;
  }

  // Ignore message echoes (sent by the page, not received)
  if (messagingEvent?.message?.is_echo) {
    console.log(`[DM] Echo message — skipping`);
    return;
  }

  console.log(`[DM] From ${senderId} (mid: ${mid}): "${text}"`);

  if (!containsLocationKeyword(text)) {
    console.log(`[DM] No location keyword found — skipping`);
    return;
  }

  const matched = getMatchedKeywords(text);
  console.log(`[DM] Keyword(s) matched: [${matched.join(', ')}] — sending reply`);

  const businessUrl = getBusinessUrl();
  const replyText   = `Here is the location 👇\n${businessUrl}`;

  try {
    const result = await sendDirectMessage(senderId, replyText);
    console.log(`[DM] Reply sent successfully. Response:`, result);
  } catch (err) {
    console.error(`[DM] Failed to send DM:`, err?.response?.data || err.message);
  }
}

// ─────────────────────────────────────────────────────────
// Main webhook handler
// ─────────────────────────────────────────────────────────

/**
 * Handle GET /webhook — Meta webhook verification challenge.
 */
function verifyWebhook(req, res) {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`[WEBHOOK] Verification request — mode: ${mode}, token: ${token}`);

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('[WEBHOOK] Verification successful ✅');
    return res.status(200).send(challenge);
  }

  console.warn('[WEBHOOK] Verification failed ❌ — token mismatch');
  return res.status(403).json({ error: 'Forbidden: token mismatch' });
}

/**
 * Handle POST /webhook — process incoming Instagram events.
 */
async function handleWebhook(req, res) {
  // ── Signature validation ──
  const signature = req.headers['x-hub-signature-256'] || '';
  const rawBody   = req.rawBody || JSON.stringify(req.body);

  if (!isValidSignature(rawBody, signature)) {
    console.warn('[WEBHOOK] Invalid signature — rejecting request');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const body = req.body;

  // Meta sends { object: "instagram", entry: [...] }
  if (body.object !== 'instagram') {
    console.log(`[WEBHOOK] Ignored non-instagram object: ${body.object}`);
    return res.status(200).json({ status: 'ignored' });
  }

  // Always respond 200 immediately — Meta requires fast response
  res.status(200).json({ status: 'ok' });

  // Process entries asynchronously after responding
  const entries = body.entry || [];

  for (const entry of entries) {
    console.log(`[WEBHOOK] Entry ID: ${entry.id}, time: ${entry.time}`);

    // ── Comment events ──
    const changes = entry.changes || [];
    for (const change of changes) {
      console.log(`[WEBHOOK] Change field: ${change.field}`);

      if (change.field === 'comments') {
        await handleComment(change).catch((err) =>
          console.error('[WEBHOOK] Unhandled comment error:', err.message)
        );
      }
    }

    // ── DM / Messaging events ──
    const messagingEvents = entry.messaging || [];
    for (const event of messagingEvents) {
      if (event.message) {
        await handleMessage(event).catch((err) =>
          console.error('[WEBHOOK] Unhandled message error:', err.message)
        );
      }
    }
  }
}

module.exports = { verifyWebhook, handleWebhook };
