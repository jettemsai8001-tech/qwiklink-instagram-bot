'use strict';

require('dotenv').config();

const express       = require('express');
const morgan        = require('morgan');
const webhookRouter = require('./routes/webhook');

const REQUIRED_ENV = [
  'INSTAGRAM_ACCESS_TOKEN',
  'VERIFY_TOKEN',
  'APP_SECRET',
  'INSTAGRAM_ACCOUNT_ID',
  'BUSINESS_SLUG',
];

const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[BOOT] Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Capture rawBody BEFORE json() parses it — needed for signature validation
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); }
}));

app.use('/webhook', webhookRouter);

app.get('/health', (_req, res) => res.status(200).json({
  status: 'ok',
  service: 'qwiklink-instagram-bot',
  time: new Date().toISOString()
}));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 QwikLink Instagram Bot running`);
  console.log(`   Port     : ${PORT}`);
  console.log(`   Business : https://qwiklink.in/${process.env.BUSINESS_SLUG}`);
  console.log(`   Webhook  : POST /webhook\n`);
});

module.exports = app;
