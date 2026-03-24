#!/usr/bin/env python3
"""
Create properly scheduled LinkedIn post for Brenan Weston
"""

import sys
sys.path.append('backend')

from late_client import LateClient
import json

def main():
    client = LateClient()

    # Brenan Weston organization account
    account_id = "69828ac193a320156c42c2bc"

    # Post content
    content = """**January 2026: AI Security's Breakout Month**

January marked a significant inflection point for AI security. Here's what stood out:

**Consolidation Accelerates**
Check Point closed its ~$300M acquisition of Lakera, creating one of the first end-to-end AI security stacks. The Swiss startup is now the cornerstone of Check Point's Global Center of Excellence for AI Security in Zurich. https://www.venturelab.swiss/Lakera-acquired-by-Checkpoint-in-USD-300-million-deal

**Market Validation**
Gartner's January 13th Emerging Tech report spotlighted AI TRiSM (Trust, Risk, and Security Management) startups, with $1.7B in VC investments. Mindgard featured as a leader in attacker-aligned AI security testing. https://mindgard.ai/blog/2026-gartner-emerging-tech-top-funded-startups-in-ai-trism-agentic-ai-and-beyond

**Fresh Capital**
Early February brought ORION Security's $32M Series A (led by Norwest, with IBM participating) for autonomous data loss prevention. At 20 employees, they're proving AI security doesn't require massive teams to attract major backing. https://www.securityweek.com/orion-raises-32-million-for-data-security/

**What This Signals**
The consolidation pattern (major vendors acquiring AI security startups) combined with strong VC activity suggests the market is maturing fast. Independent players face a critical decision: scale rapidly or seek strategic partnerships.

Worth watching: Entro Security's NHI Global Summit at Nasdaq Marketsite (Feb 26). Non-human identity security is emerging as the next battleground."""

    # Delete previous draft first
    print("Deleting previous draft post 698384255a6fa7f85178de0d...")
    try:
        client.delete_post("698384255a6fa7f85178de0d")
        print("✓ Previous draft deleted")
    except Exception as e:
        print(f"Note: Could not delete previous draft: {e}")

    # Create new scheduled draft
    print(f"\nCreating NEW draft scheduled for tomorrow 17:00 UTC...")
    result = client.create_post(
        content=content,
        account_ids=[account_id],
        scheduled_at="2026-02-05T17:00:00Z",
        is_draft=True
    )

    print("\n✓ Draft post created and scheduled!")
    print(f"\nPost ID: {result.get('post', {}).get('_id')}")
    print(f"Status: {result.get('post', {}).get('status')}")
    print(f"Scheduled for: {result.get('post', {}).get('scheduledFor')}")
    print(f"Account: Brenan Weston organization")
    print(f"\nYou can review and edit this draft in Late.dev before it publishes tomorrow at 17:00 UTC")

if __name__ == "__main__":
    main()
