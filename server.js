'use strict';

require('dotenv').config();

const express    = require('express');
const morgan     = require('morgan');
const webhookRouter = require('./routes/webhook');

// ─────────────────────────────────────────────────────────
// Validate required env vars at boot — fail fast
// ─────────────────────────────────────────────────────────
const REQUIRED_ENV = [
  'INSTAGRAM_ACCESS_TOKEN',
  'VERIFY_TOKEN',
  'APP_SECRET',
  'INSTAGRAM_ACCOUNT_ID',
  'BUSINESS_SLUG',
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[BOOT] ❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('[BOOT] Copy .env.example → .env and fill in all values.');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────
// App setup
// ─────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

// HTTP request logger
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// IMPORTANT: capture raw body BEFORE express.json() parses it.
// We need rawBody to validate Meta's X-Hub-Signature-256 header.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);

// ─────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────
app.use('/webhook', webhookRouter);

// Health check — used by Render/Railway to confirm the service is up
app.get('/health', (_req, res) => {
  res.status(200).json({
    status:  'ok',
    service: 'qwiklink-instagram-bot',
    time:    new Date().toISOString(),
  });
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 QwikLink Instagram Bot running`);
  console.log(`   ► Port        : ${PORT}`);
  console.log(`   ► Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   ► Business    : https://qwiklink.in/${process.env.BUSINESS_SLUG}`);
  console.log(`   ► Webhook     : POST /webhook\n`);
});

module.exports = app;
