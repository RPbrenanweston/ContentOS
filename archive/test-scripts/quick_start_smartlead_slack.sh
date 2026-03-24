#!/bin/bash
# Quick Start: Smartlead → Slack Integration

set -e

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  Smartlead → Slack Integration - Quick Start"
echo "═══════════════════════════════════════════════════════════════════════════════"

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.9+"
    exit 1
fi
echo "✅ Python 3 found"

# Check pip packages
if ! python3 -c "import flask" 2>/dev/null; then
    echo "⚠️  Flask not found. Installing..."
    pip3 install flask requests
fi
echo "✅ Required packages installed"

# Check for Slack webhook URL
if [ -z "$SLACK_WEBHOOK_URL" ]; then
    echo ""
    echo "❌ SLACK_WEBHOOK_URL environment variable not set"
    echo ""
    echo "To get your Slack webhook URL:"
    echo "  1. Go to https://api.slack.com/apps"
    echo "  2. Create or select your app"
    echo "  3. Go to 'Incoming Webhooks'"
    echo "  4. Toggle 'Activate Incoming Webhooks' to ON"
    echo "  5. Click 'Add New Webhook to Workspace'"
    echo "  6. Select channel and copy the webhook URL"
    echo ""
    echo "Then set it:"
    echo "  export SLACK_WEBHOOK_URL='https://hooks.slack.com/services/YOUR/WEBHOOK/URL'"
    echo ""
    exit 1
fi

echo "✅ Slack webhook URL configured"

# Start the webhook receiver
echo ""
echo "🚀 Starting webhook receiver on port 5000..."
echo ""
echo "The receiver will accept Smartlead webhooks at:"
echo "  http://localhost:5000/smartlead-webhook"
echo ""
echo "For production use, you need a public HTTPS endpoint."
echo "Options:"
echo "  • Local testing: Install ngrok and run 'ngrok http 5000'"
echo "  • Production: Deploy to Vercel, Railway, Render, or similar"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "───────────────────────────────────────────────────────────────────────────────"
echo ""

# Run the webhook receiver
python3 smartlead_slack_bridge.py
