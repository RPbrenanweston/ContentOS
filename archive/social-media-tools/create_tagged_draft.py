#!/usr/bin/env python3
"""
Create Tagged Draft Post for Brenan Weston

Creates cyber funding post with company and founder tags
Profile: Linkedin - Brenan Weston (68ad9f2fe109d3e54b5a2949)
Status: DRAFT ONLY
"""

import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.late_client import LateClient, format_iso_timestamp

load_dotenv()

BRENAN_PROFILE_ID = "68ad9f2fe109d3e54b5a2949"


def create_tagged_draft():
    """Create cyber funding post as DRAFT with company/founder tags"""

    # Initialize client
    client = LateClient()

    print("=" * 70)
    print("CREATING TAGGED DRAFT FOR BRENAN WESTON")
    print("=" * 70)

    print(f"\nFetching accounts for Brenan Weston profile ({BRENAN_PROFILE_ID})...")

    # Get accounts for Brenan's profile
    try:
        all_accounts = client.get_accounts()
        print(f"✓ Found {len(all_accounts)} total account(s)")

        # Filter for accounts under Brenan's profile
        brenan_accounts = []
        for acc in all_accounts:
            if isinstance(acc, dict):
                # Check if this account belongs to Brenan's profile
                profile_id = None
                if isinstance(acc.get('profileId'), dict):
                    profile_id = acc['profileId'].get('_id')
                elif isinstance(acc.get('profileId'), str):
                    profile_id = acc.get('profileId')

                if profile_id == BRENAN_PROFILE_ID:
                    brenan_accounts.append(acc)
                    platform = acc.get('platform', 'unknown')
                    account_name = acc.get('displayName') or acc.get('username') or acc.get('name', 'Unknown')
                    account_id = acc.get('_id') or acc.get('id')
                    print(f"  ✓ {platform.upper()}: {account_name} (ID: {account_id})")

        if not brenan_accounts:
            print("\n⚠️  No accounts connected to Brenan Weston profile.")
            return None

        # Get LinkedIn accounts
        linkedin_accounts = [
            acc for acc in brenan_accounts
            if acc.get('platform', '').lower() == 'linkedin'
        ]

        if not linkedin_accounts:
            print("\n⚠️  No LinkedIn accounts found under Brenan's profile.")
            return None

        linkedin_ids = [acc.get('_id') or acc.get('id') for acc in linkedin_accounts]
        print(f"\n✓ Will create draft for {len(linkedin_ids)} LinkedIn account(s)")

    except Exception as e:
        print(f"❌ Error fetching accounts: {e}")
        import traceback
        traceback.print_exc()
        return None

    # Craft the post content with LinkedIn tags
    # Note: LinkedIn tags require specific format for API
    # Using @ mentions will allow LinkedIn to suggest connections
    content = """🚀 Cyber Funding Roundup - UK & US (Last 48 Hours)

5 cybersecurity companies just raised fresh capital:

1. RapidFort - $42M
   Led by Blue Cloud Ventures & Forgepoint Capital
   Automating software supply chain security
   Congrats to Mehran Farimani and the team
   → https://bit.ly/rapidfort-42m

2. RADICL - $31M
   Led by Paladin Capital Group
   Autonomous Virtual SOC for SMBs
   Congrats to Chris Petersen and the team
   → https://bit.ly/radicl-31m

3. CyberFOX - Growth Financing
   Led by Level Equity
   Next-gen cybersecurity platform
   Congrats to Dave Bellini, Adam Slutskin and the team
   → https://bit.ly/cyberfox-growth

4. ORION Security - $32M Series A
   Led by Norwest
   Autonomous data loss prevention
   Congrats to Nitay Milner, Yonatan Kreiner and the team
   → https://bit.ly/orion-32m

5. Refute - £5M Seed
   Led by Amadeus Capital Partners
   AI fighting disinformation campaigns
   Congrats to Tom Garnett, Vlad Galuhave and the team
   → https://bit.ly/refute-5m

📊 Total raised: ~$150M in 48 hours

The cybersecurity investment landscape is 🔥

What trends are you seeing in cyber funding?

#cybersecurity #funding #venturecapital #startups #infosec #datasecurity #aisecurity #seedfunding #seriesA"""

    # Suggested schedule time
    tomorrow_5pm = datetime.utcnow() + timedelta(days=1)
    tomorrow_5pm = tomorrow_5pm.replace(hour=17, minute=0, second=0, microsecond=0)

    print(f"\n📝 Draft Content:")
    print("-" * 70)
    print(content)
    print("-" * 70)
    print(f"\n💡 Suggested schedule: {tomorrow_5pm.strftime('%B %d, %Y at 17:00 GMT')}")
    print("\n📌 Note: When editing in LinkedIn dashboard, you can:")
    print("   - Type @ followed by names to tag people")
    print("   - LinkedIn will suggest profiles as you type")
    print("   - Tag: Mehran Farimani, Chris Petersen, Dave Bellini, Adam Slutskin,")
    print("          Nitay Milner, Yonatan Kreiner, Tom Garnett, Vlad Galuhave")

    # Create as DRAFT ONLY
    try:
        print(f"\n⏳ Creating DRAFT (will NOT publish automatically)...")
        result = client.create_post(
            content=content,
            account_ids=linkedin_ids,
            is_draft=True  # ⚠️ CRITICAL: Always draft
        )

        post_id = result.get('_id') or result.get('id')
        status = result.get('status', 'unknown')

        print(f"\n✅ DRAFT CREATED SUCCESSFULLY!")
        print(f"\n   Post ID: {post_id}")
        print(f"   Status: {status}")
        print(f"   Account: Brenan Weston LinkedIn")
        print(f"\n   📱 Review and tag people at: https://getlate.dev/dashboard/posts")
        print(f"\n   🏷️  To tag people in Late dashboard:")
        print(f"   1. Open the draft")
        print(f"   2. Click edit")
        print(f"   3. Type @ before each name (e.g., @Mehran Farimani)")
        print(f"   4. Select the person from LinkedIn's suggestions")
        print(f"   5. Repeat for all founders")
        print(f"   6. Schedule for {tomorrow_5pm.strftime('%B %d at 17:00 GMT')}")
        print(f"   7. Click 'Schedule'")

        if status != 'draft':
            print(f"\n   ⚠️  WARNING: Status is '{status}' not 'draft'")
            print(f"   Check dashboard immediately!")

        return result

    except Exception as e:
        print(f"\n❌ Failed to create draft: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == '__main__':
    result = create_tagged_draft()

    if result:
        print("\n" + "=" * 70)
        print("✓ DRAFT CREATED - ADD TAGS IN DASHBOARD")
        print("=" * 70)
        sys.exit(0)
    else:
        print("\n" + "=" * 70)
        print("❌ DRAFT NOT CREATED")
        print("=" * 70)
        sys.exit(1)
