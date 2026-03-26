#!/usr/bin/env python3
"""
Register Smartlead webhook for campaign notifications
"""

import json
from smartlead_client import SmartleadClient


def register_webhook(
    campaign_id: int,
    webhook_url: str,
    events: list = None,
    webhook_name: str = "Slack Notifications"
):
    """Register webhook with Smartlead for campaign events."""

    if events is None:
        # Default: High-signal events only
        events = ["EMAIL_REPLY", "LEAD_CATEGORY_UPDATED"]

    API_KEY = "ca060959-8077-45dd-b024-c103a4713a55_7513a27"
    client = SmartleadClient(API_KEY)

    print("=" * 80)
    print("REGISTERING SMARTLEAD WEBHOOK")
    print("=" * 80)

    print(f"\n📋 Configuration:")
    print(f"   Campaign ID: {campaign_id}")
    print(f"   Webhook URL: {webhook_url}")
    print(f"   Events: {', '.join(events)}")
    print(f"   Name: {webhook_name}")

    try:
        # Check existing webhooks first
        print(f"\n🔍 Checking existing webhooks...")
        existing = client.get_webhooks(campaign_id)

        if existing and isinstance(existing, list) and len(existing) > 0:
            print(f"   Found {len(existing)} existing webhook(s):")
            for webhook in existing:
                print(f"   • {webhook.get('name', 'Unnamed')} - {webhook.get('webhook_url', 'N/A')}")
                print(f"     Events: {webhook.get('event_types', [])}")

            print(f"\n⚠️  Note: Smartlead allows one webhook per event type per campaign")
            print(f"   If you're re-registering, the new webhook will replace the old one")

        # Register webhook
        print(f"\n📡 Registering webhook...")

        response = client.create_webhook(
            campaign_id=campaign_id,
            webhook_url=webhook_url,
            events=events
        )

        if response:
            print(f"\n✅ Webhook registered successfully!")
            print(f"\nWebhook Details:")
            print(json.dumps(response, indent=2))

            # Provide next steps
            print(f"\n{'='*80}")
            print(f"NEXT STEPS")
            print(f"{'='*80}")
            print(f"\n1. ✅ Webhook registered")
            print(f"2. 🧪 Test the integration:")
            print(f"      curl -X POST http://localhost:5000/test")
            print(f"\n3. 📬 Trigger a real event:")
            print(f"      • Reply to a campaign email")
            print(f"      • Or update a lead category in Smartlead")
            print(f"\n4. 👀 Monitor webhook health:")
            print(f"      https://app.smartlead.ai/app/email-campaign/{campaign_id}")
            print(f"      Settings → Webhooks → Delivery Logs")
            print(f"\n5. 📊 Check webhook summary:")
            print(f"      python3 check_webhook_status.py {campaign_id}")

            return response
        else:
            print(f"\n❌ Webhook registration failed - no response")
            return None

    except Exception as e:
        print(f"\n❌ Error registering webhook: {e}")
        import traceback
        traceback.print_exc()
        return None


def list_webhooks(campaign_id: int):
    """List all webhooks for a campaign."""

    API_KEY = "ca060959-8077-45dd-b024-c103a4713a55_7513a27"
    client = SmartleadClient(API_KEY)

    print("=" * 80)
    print(f"WEBHOOKS FOR CAMPAIGN {campaign_id}")
    print("=" * 80)

    try:
        webhooks = client.get_webhooks(campaign_id)

        if not webhooks or not isinstance(webhooks, list):
            print("\n📭 No webhooks found for this campaign")
            return

        print(f"\n📡 Found {len(webhooks)} webhook(s):\n")

        for i, webhook in enumerate(webhooks, 1):
            print(f"{'─'*80}")
            print(f"Webhook #{i}")
            print(f"{'─'*80}")
            print(f"  ID: {webhook.get('id', 'N/A')}")
            print(f"  Name: {webhook.get('name', 'Unnamed')}")
            print(f"  URL: {webhook.get('webhook_url', 'N/A')}")
            print(f"  Events: {', '.join(webhook.get('event_types', []))}")
            print(f"  Created: {webhook.get('created_at', 'N/A')}")
            print(f"  Updated: {webhook.get('updated_at', 'N/A')}")

    except Exception as e:
        print(f"\n❌ Error fetching webhooks: {e}")


if __name__ == "__main__":
    import sys

    # Campaign ID (use newly created Exprs campaign)
    campaign_id = 2917689

    if len(sys.argv) > 1 and sys.argv[1] == "--list":
        # List existing webhooks
        list_webhooks(campaign_id)
    else:
        # Register new webhook
        print(f"\n⚠️  IMPORTANT: Update webhook_url before running!")
        print(f"   1. Deploy smartlead_slack_bridge.py")
        print(f"   2. Get public HTTPS URL (ngrok or production)")
        print(f"   3. Update webhook_url below")
        print(f"   4. Set SLACK_WEBHOOK_URL environment variable")
        print(f"\nPress Enter to continue or Ctrl+C to cancel...")
        input()

        # TODO: Update this URL with your actual webhook receiver
        webhook_url = "https://your-domain.com/smartlead-webhook"
        # For ngrok testing: "https://abc123.ngrok.io/smartlead-webhook"

        if "your-domain.com" in webhook_url:
            print(f"\n❌ Error: Please update webhook_url in the script")
            print(f"   Current: {webhook_url}")
            print(f"   Expected: https://your-actual-domain.com/smartlead-webhook")
            sys.exit(1)

        # Register webhook
        register_webhook(
            campaign_id=campaign_id,
            webhook_url=webhook_url,
            events=["EMAIL_REPLY", "LEAD_CATEGORY_UPDATED"],
            webhook_name="Slack Notifications - Exprs Campaign"
        )
