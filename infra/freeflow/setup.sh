#!/bin/bash
# ============================================================
# FreeFlow Setup Script for Hetzner VPS
#
# Run on your server:
#   chmod +x setup.sh && ./setup.sh
# ============================================================

set -e

echo "=== FreeFlow Self-Hosted Setup ==="
echo ""

# 1. Clone the FreeFlow repo
if [ ! -d "freeflow-repo" ]; then
  echo "[1/5] Cloning FreeFlow repo..."
  git clone https://github.com/RPbrenanweston/freeflowforcontentOS.git freeflow-repo
else
  echo "[1/5] FreeFlow repo already exists, pulling latest..."
  cd freeflow-repo && git pull && cd ..
fi

# 2. Create .env from example if it doesn't exist
if [ ! -f ".env" ]; then
  echo "[2/5] Creating .env file..."
  cp .env.example .env

  # Generate random secrets
  BETTER_AUTH_SECRET=$(openssl rand -hex 32)
  BOOTSTRAP_TOKEN=$(openssl rand -hex 16)
  POSTGRES_PASSWORD=$(openssl rand -hex 24)

  # Replace placeholder values
  sed -i "s/CHANGE_ME_GENERATE_WITH_OPENSSL_RAND/$BETTER_AUTH_SECRET/" .env
  sed -i "0,/CHANGE_ME_GENERATE_WITH_OPENSSL_RAND/s//$BOOTSTRAP_TOKEN/" .env
  sed -i "s/CHANGE_ME_TO_A_STRONG_PASSWORD/$POSTGRES_PASSWORD/" .env

  echo ""
  echo "  !! IMPORTANT: Edit .env and add your OpenAI API key !!"
  echo "  !! Also update PUBLIC_URL to your domain             !!"
  echo ""
  echo "  Generated secrets:"
  echo "    BOOTSTRAP_TOKEN: $BOOTSTRAP_TOKEN"
  echo "    (Save this — you need it to create the first admin)"
  echo ""
else
  echo "[2/5] .env already exists, skipping..."
fi

# 3. Create SSL directory
echo "[3/5] Creating SSL directory..."
mkdir -p ssl
if [ ! -f "ssl/fullchain.pem" ]; then
  echo ""
  echo "  !! Place your SSL certs in ./ssl/ !!"
  echo "  !! Files needed: fullchain.pem and privkey.pem !!"
  echo ""
  echo "  Quick option — Let's Encrypt with certbot:"
  echo "    sudo certbot certonly --standalone -d freeflow.yourdomain.com"
  echo "    cp /etc/letsencrypt/live/freeflow.yourdomain.com/fullchain.pem ./ssl/"
  echo "    cp /etc/letsencrypt/live/freeflow.yourdomain.com/privkey.pem ./ssl/"
  echo ""
fi

# 4. Update nginx.conf domain
echo "[4/5] Reminder: Update nginx.conf with your actual domain"
echo "  Replace 'freeflow.yourdomain.com' in nginx.conf"
echo ""

# 5. Ready to launch
echo "[5/5] Setup complete!"
echo ""
echo "  Next steps:"
echo "    1. nano .env              # Add your OpenAI key + domain"
echo "    2. nano nginx.conf        # Replace yourdomain.com"
echo "    3. # Add SSL certs to ./ssl/"
echo "    4. docker compose up -d   # Launch everything"
echo "    5. docker compose logs -f  # Watch logs"
echo "    6. Visit https://your-domain/health"
echo ""
echo "  Endpoints:"
echo "    POST /dictate     — Upload WAV for transcription"
echo "    WS   /stream      — Real-time WebSocket streaming"
echo "    POST /polish      — Text-only cleanup"
echo "    GET  /health      — Health check"
echo ""
echo "  Admin setup:"
echo "    Use BOOTSTRAP_TOKEN from above to create first admin"
echo ""
