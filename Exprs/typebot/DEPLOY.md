# Typebot — Coolify Deployment Guide

## Prerequisites

- Coolify running on your VPS
- Two DNS A records pointing to your server:
  - `typebot.brenanweston.com` → server IP (builder)
  - `bot.brenanweston.com` → server IP (viewer)
- SMTP credentials for magic link login (Gmail app password or similar)

## Step 1: DNS Setup

In your DNS provider (Cloudflare / Route53 / wherever brenanweston.com is managed):

```
typebot.brenanweston.com  →  A  →  YOUR_SERVER_IP
bot.brenanweston.com      →  A  →  YOUR_SERVER_IP
```

If using Cloudflare, set proxy status to **DNS only** (grey cloud) initially until SSL is confirmed working through Coolify's Traefik, then you can enable the orange cloud if desired.

## Step 2: Create the .env File

```bash
# On your server or locally
cp .env.example .env

# Generate the encryption secret
openssl rand -base64 32
# Paste the output as ENCRYPTION_SECRET in .env

# Generate a strong DB password
openssl rand -base64 24
# Paste as POSTGRES_PASSWORD in .env

# Fill in SMTP credentials
nano .env
```

## Step 3: Deploy in Coolify

1. Open Coolify dashboard
2. Go to your project → **Add New Resource** → **Docker Compose**
3. Paste the contents of `docker-compose.yml`
4. In the Coolify environment variables section, add all variables from your `.env`
5. Configure domains in Coolify UI:
   - Click on `typebot-builder` service → Set domain to `https://typebot.brenanweston.com`
   - Click on `typebot-viewer` service → Set domain to `https://bot.brenanweston.com`
6. **Important Coolify setting**: For each service, set the container port:
   - Builder: container port `3000` (Coolify routes to this internally)
   - Viewer: container port `3000`
7. Click **Deploy**

Coolify's Traefik will auto-provision SSL certificates via Let's Encrypt.

## Step 4: Verify

1. Visit `https://typebot.brenanweston.com` — you should see the Typebot login screen
2. Enter `robert@brenanweston.com` — you'll receive a magic link email
3. Click the link → you're in the builder
4. Create a test bot, publish it, and visit `https://bot.brenanweston.com/test-bot` to confirm the viewer works

## Step 5: Connect to n8n

In each Typebot flow, add a **Webhook** block and point it to your n8n instance:

| Bot Flow | n8n Webhook URL |
|----------|----------------|
| Lead Capture | `https://n8n.brenanweston.com/webhook/typebot-lead` |
| Candidate Intake | `https://n8n.brenanweston.com/webhook/typebot-candidate` |
| Client Qualifier | `https://n8n.brenanweston.com/webhook/typebot-client` |

In n8n, create matching **Webhook** trigger nodes for each. The payload from Typebot arrives as JSON with all the collected form fields.

## Updating Typebot

```bash
# In Coolify, just redeploy — it pulls latest images
# Or via CLI on the server:
docker compose pull
docker compose up -d
```

Always check the [Typebot changelog](https://github.com/baptisteArno/typebot.io/releases) before major version updates.

## Troubleshooting

**Can't log in / no magic link email:**
- Check SMTP vars are correct in Coolify env
- Check spam folder
- Verify ADMIN_EMAIL matches exactly

**Bot not loading on viewer URL:**
- Confirm NEXT_PUBLIC_VIEWER_URL matches the domain Coolify assigned to typebot-viewer
- Check Coolify logs for the viewer container

**Database connection errors:**
- Ensure typebot-db health check is passing (green in Coolify)
- Verify POSTGRES_PASSWORD matches between .env and DATABASE_URL

**Coolify-specific: "502 Bad Gateway":**
- The container port in Coolify must be set to `3000` for both builder and viewer
- Wait 30-60 seconds after deploy for the Next.js app to compile and start
