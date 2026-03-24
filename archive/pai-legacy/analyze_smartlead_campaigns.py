#!/usr/bin/env python3
"""
Analyze Smartlead email campaigns
Fetches campaigns, sequences, and metrics for recruitment service analysis
"""

import json
from smartlead_client import SmartleadClient


def analyze_campaigns():
    """Fetch and analyze all Smartlead campaigns."""

    # Initialize client
    API_KEY = "ca060959-8077-45dd-b024-c103a4713a55_7513a27"
    client = SmartleadClient(API_KEY)

    print("=" * 80)
    print("SMARTLEAD CAMPAIGN ANALYSIS - EXPRS RECRUITMENT SERVICE")
    print("=" * 80)

    try:
        # Get all campaigns
        print("\n📧 Fetching campaigns...")
        campaigns = client.get_campaigns(include_tags=True)

        if not campaigns or not isinstance(campaigns, list):
            print("⚠️  No campaigns found or unexpected response format")
            print(f"Response: {campaigns}")
            return

        print(f"✅ Found {len(campaigns)} campaign(s)\n")

        # Analyze each campaign
        for idx, campaign in enumerate(campaigns, 1):
            print(f"\n{'=' * 80}")
            print(f"CAMPAIGN {idx}: {campaign.get('name', 'Unnamed')}")
            print(f"{'=' * 80}")

            campaign_id = campaign.get('id')

            # Basic info
            print(f"\n📋 BASIC INFO:")
            print(f"  ID: {campaign_id}")
            print(f"  Status: {campaign.get('status', 'Unknown')}")
            print(f"  Created: {campaign.get('created_at', 'Unknown')}")
            if campaign.get('tags'):
                print(f"  Tags: {', '.join(campaign.get('tags', []))}")

            # Get detailed campaign info
            try:
                campaign_detail = client.get_campaign(campaign_id)

                # Sequence info
                if 'sequences' in campaign_detail:
                    print(f"\n📬 EMAIL SEQUENCES:")
                    for seq_idx, sequence in enumerate(campaign_detail.get('sequences', []), 1):
                        print(f"\n  Sequence {seq_idx}:")
                        print(f"    Subject: {sequence.get('subject', 'N/A')}")
                        print(f"    Delay: {sequence.get('delay_in_days', 0)} days")
                        if sequence.get('body'):
                            preview = sequence['body'][:150].replace('\n', ' ')
                            print(f"    Preview: {preview}...")

                # Settings
                if 'settings' in campaign_detail:
                    print(f"\n⚙️  SETTINGS:")
                    settings = campaign_detail['settings']
                    print(f"  Daily limit: {settings.get('daily_limit', 'N/A')}")
                    print(f"  Time zone: {settings.get('timezone', 'N/A')}")
                    print(f"  Sending window: {settings.get('sending_start', 'N/A')} - {settings.get('sending_end', 'N/A')}")

            except Exception as e:
                print(f"⚠️  Could not fetch campaign details: {e}")

            # Get campaign statistics
            try:
                stats = client.get_campaign_stats(campaign_id)

                print(f"\n📊 METRICS:")
                print(f"  Total leads: {stats.get('total_leads', 0)}")
                print(f"  Emails sent: {stats.get('emails_sent', 0)}")
                print(f"  Opens: {stats.get('opens', 0)} ({stats.get('open_rate', 0):.1f}%)")
                print(f"  Clicks: {stats.get('clicks', 0)} ({stats.get('click_rate', 0):.1f}%)")
                print(f"  Replies: {stats.get('replies', 0)} ({stats.get('reply_rate', 0):.1f}%)")
                print(f"  Bounces: {stats.get('bounces', 0)}")
                print(f"  Unsubscribes: {stats.get('unsubscribes', 0)}")

            except Exception as e:
                print(f"⚠️  Could not fetch campaign stats: {e}")

            # Get sample leads (first 5)
            try:
                leads = client.get_leads(campaign_id, limit=5)
                if leads and isinstance(leads, list) and len(leads) > 0:
                    print(f"\n👥 SAMPLE LEADS (showing {min(5, len(leads))}):")
                    for lead in leads[:5]:
                        print(f"  • {lead.get('email', 'N/A')} - Status: {lead.get('status', 'Unknown')}")
            except Exception as e:
                print(f"⚠️  Could not fetch leads: {e}")

        # Get email accounts
        print(f"\n\n{'=' * 80}")
        print("EMAIL ACCOUNTS")
        print(f"{'=' * 80}")

        try:
            accounts = client.get_email_accounts()
            if accounts and isinstance(accounts, list):
                print(f"\n✅ {len(accounts)} email account(s) connected:")
                for account in accounts:
                    print(f"  • {account.get('email', 'N/A')} - Status: {account.get('status', 'Unknown')}")
            else:
                print("⚠️  No email accounts found")
        except Exception as e:
            print(f"⚠️  Could not fetch email accounts: {e}")

        # Save full data to JSON
        output_file = "smartlead_campaign_analysis.json"
        with open(output_file, 'w') as f:
            json.dump({
                'campaigns': campaigns,
                'analysis_date': '2026-02-09',
                'total_campaigns': len(campaigns)
            }, f, indent=2)

        print(f"\n\n✅ Full data saved to: {output_file}")

    except Exception as e:
        print(f"\n❌ Error analyzing campaigns: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    analyze_campaigns()
