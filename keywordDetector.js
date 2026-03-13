# QwikLink Instagram Bot

Production-ready Instagram automation backend.  
Automatically replies to comments and DMs containing location keywords with your QwikLink business page link.

---

## How It Works

```
User comments "location" on your post
        │
        ▼
Meta sends POST /webhook event
        │
        ▼
Bot detects keyword → calls Instagram Graph API
        │
        ▼
Auto-reply: "Get directions here 👇 https://qwiklink.in/your-slug"
```

---

## Folder Structure

```
qwiklink-instagram-bot/
├── server.js                  # Express app entry point
├── routes/
│   └── webhook.js             # GET + POST /webhook routes
├── controllers/
│   └── instagramController.js # Webhook verification + event routing
├── services/
│   └── instagramService.js    # Instagram Graph API calls
├── utils/
│   └── keywordDetector.js     # Keyword matching logic
├── .env.example               # Environment variable template
├── .gitignore
└── package.json
```

---

## Local Setup

### 1. Clone & install

```bash
git clone https://github.com/your-org/qwiklink-instagram-bot.git
cd qwiklink-instagram-bot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your real values
```

### 3. Run locally

```bash
npm run dev       # nodemon (auto-restart on changes)
# or
npm start         # plain node
```

### 4. Test locally with ngrok

Meta requires a public HTTPS URL. Use ngrok to expose your local server:

```bash
npx ngrok http 3000
# Copy the https URL e.g. https://abc123.ngrok.io
```

Use `https://abc123.ngrok.io/webhook` as your webhook URL in Meta Dashboard.

---

## Getting Your Instagram Credentials

### Step 1 — Create a Meta App
1. Go to https://developers.facebook.com/apps/
2. Click **Create App** → choose **Business** type
3. Add the **Instagram Graph API** product

### Step 2 — Get Access Token
1. Go to **Tools → Graph API Explorer**
2. Select your app
3. Add these permissions:
   - `instagram_basic`
   - `instagram_manage_comments`
   - `instagram_manage_messages`
   - `pages_messaging`
   - `pages_read_engagement`
4. Click **Generate Access Token**
5. Exchange for a long-lived token (valid 60 days):

```bash
curl "https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=YOUR_APP_ID
  &client_secret=YOUR_APP_SECRET
  &fb_exchange_token=SHORT_LIVED_TOKEN"
```

### Step 3 — Get Your Instagram Account ID

```bash
# Get your Facebook Pages
curl "https://graph.facebook.com/v19.0/me/accounts?access_token=YOUR_TOKEN"

# Get the linked Instagram Business Account ID
curl "https://graph.facebook.com/v19.0/PAGE_ID?fields=instagram_business_account&access_token=YOUR_TOKEN"
```

The `id` inside `instagram_business_account` is your `INSTAGRAM_ACCOUNT_ID`.

### Step 4 — Configure Webhook in Meta Dashboard
1. In your Meta App → **Webhooks** → **Instagram**
2. Click **Subscribe to this object**
3. Set:
   - **Callback URL**: `https://your-domain.com/webhook`
   - **Verify Token**: same value as `VERIFY_TOKEN` in your `.env`
4. Click **Verify and Save**
5. Subscribe to fields:
   - ✅ `comments`
   - ✅ `messages`

---

## Deploy on Render (Recommended — Free tier available)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/your-org/qwiklink-instagram-bot.git
git push -u origin main
```

### Step 2 — Create Render Web Service
1. Go to https://render.com → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter for production)

### Step 3 — Set Environment Variables on Render
In your Render service → **Environment** tab, add:

| Key | Value |
|-----|-------|
| `INSTAGRAM_ACCESS_TOKEN` | Your long-lived token |
| `VERIFY_TOKEN` | Your chosen verify token |
| `APP_SECRET` | From Meta App Settings → Basic |
| `INSTAGRAM_ACCOUNT_ID` | Your numeric IG account ID |
| `BUSINESS_SLUG` | Your QwikLink slug e.g. `sharma-dhaba` |
| `NODE_ENV` | `production` |

### Step 4 — Update Meta Webhook URL
Once Render deploys, copy your public URL (e.g. `https://qwiklink-bot.onrender.com`) and update the webhook callback URL in Meta Dashboard to:
```
https://qwiklink-bot.onrender.com/webhook
```

---

## Deploy on Railway

### Step 1 — Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2 — Deploy

```bash
cd qwiklink-instagram-bot
railway init
railway up
```

### Step 3 — Set Environment Variables

```bash
railway variables set INSTAGRAM_ACCESS_TOKEN=your_token
railway variables set VERIFY_TOKEN=your_verify_token
railway variables set APP_SECRET=your_app_secret
railway variables set INSTAGRAM_ACCOUNT_ID=your_account_id
railway variables set BUSINESS_SLUG=your-business-slug
railway variables set NODE_ENV=production
```

### Step 4 — Get your public URL

```bash
railway domain
# e.g. https://qwiklink-bot.up.railway.app
```

Use `https://qwiklink-bot.up.railway.app/webhook` in Meta Dashboard.

---

## Verify Everything Works

### Health check
```bash
curl https://your-domain.com/health
# Expected: {"status":"ok","service":"qwiklink-instagram-bot"}
```

### Webhook verification
```bash
curl "https://your-domain.com/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
# Expected: test123
```

### Simulate a comment event
```bash
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "instagram",
    "entry": [{
      "id": "123456",
      "time": 1704067200,
      "changes": [{
        "field": "comments",
        "value": {
          "id": "comment_id_123",
          "text": "location please",
          "from": { "id": "user_456", "username": "testuser" },
          "media": { "id": "media_789" }
        }
      }]
    }]
  }'
# Expected: {"status":"ok"}
# Check server logs for: [COMMENT] Keyword(s) matched: [location] — sending reply
```

> **Note**: The simulated test won't actually call the Instagram API without a valid signature. Check server logs to confirm keyword detection is working.

---

## Customising Keywords

Edit `utils/keywordDetector.js`:

```js
const LOCATION_KEYWORDS = [
  'location',
  'map',
  'address',
  'direction',
  'directions',
  'where',
  // Add your own:
  'menu',
  'timing',
  'hours',
];
```

---

## Token Refresh (Important)

Long-lived Instagram tokens expire after **60 days**. Refresh them before expiry:

```bash
curl "https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=ig_refresh_token
  &access_token=YOUR_CURRENT_LONG_LIVED_TOKEN"
```

Set a calendar reminder every 50 days, or build a cron job to auto-refresh.

---

## Security Notes

- ✅ `APP_SECRET` used to validate every webhook payload via HMAC-SHA256
- ✅ `VERIFY_TOKEN` is a secret shared only with Meta
- ✅ All secrets stored in environment variables — never in code
- ✅ Bot ignores its own messages to prevent infinite reply loops
- ✅ Bot ignores message echoes
- ✅ Responds 200 to Meta immediately; processes async to stay within timeout
