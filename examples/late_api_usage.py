"""
Late API Usage Examples

Demonstrates how to use the Late API integration for social media scheduling
in your recruitment intelligence workflow.

Before running:
1. Set your LATE_API_KEY in .env file
2. Connect social media accounts at https://getlate.dev
3. Get account IDs using the examples below
"""

import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.late_client import LateClient
from backend.social_media_scheduler import SocialMediaScheduler

load_dotenv()


def example_1_basic_setup():
    """Example 1: Initialize client and check connected accounts"""
    print("=" * 60)
    print("EXAMPLE 1: Basic Setup & Connected Accounts")
    print("=" * 60)

    # Initialize client
    client = LateClient()
    print("✓ Late API client initialized")

    # Get all profiles
    profiles = client.get_profiles()
    print(f"\nConnected Profiles: {len(profiles)}")
    for profile in profiles:
        print(f"  - {profile.get('name', 'Unnamed')} (ID: {profile.get('id')})")

    # Get all accounts
    accounts = client.get_accounts()
    print(f"\nConnected Accounts: {len(accounts)}")
    for account in accounts:
        platform = account.get('platform', 'unknown')
        name = account.get('name', 'Unknown')
        account_id = account.get('id', 'unknown')
        print(f"  - {platform.upper()}: {name} (ID: {account_id})")

    return client


def example_2_post_hiring_announcement(client: LateClient):
    """Example 2: Post a hiring announcement immediately"""
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Post Hiring Announcement")
    print("=" * 60)

    scheduler = SocialMediaScheduler(client)

    # Post immediately to LinkedIn
    result = scheduler.post_hiring_announcement(
        company_name="Wiz Security",
        role_title="Senior AI Security Engineer",
        role_url="https://www.wiz.io/careers",
        platforms=['linkedin'],
        schedule_time=None  # None = post immediately
    )

    print(f"✓ Posted hiring announcement")
    print(f"  Post ID: {result.get('id')}")
    print(f"  Status: {result.get('status')}")


def example_3_schedule_company_signal(client: LateClient):
    """Example 3: Schedule a company signal post for tomorrow morning"""
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Schedule Company Signal Post")
    print("=" * 60)

    scheduler = SocialMediaScheduler(client)

    # Schedule for tomorrow at 9am
    tomorrow_9am = datetime.now().replace(
        hour=9, minute=0, second=0, microsecond=0
    ) + timedelta(days=1)

    result = scheduler.post_company_signal(
        company_name="Snyk",
        signal_type="funding",
        signal_description="Raised $196M Series F at $8.5B valuation",
        context="This signals major expansion plans. Expect hiring across engineering and GTM.",
        platforms=['linkedin'],
        schedule_time=tomorrow_9am
    )

    print(f"✓ Scheduled company signal post")
    print(f"  Post ID: {result.get('id')}")
    print(f"  Scheduled for: {tomorrow_9am}")


def example_4_thought_leadership(client: LateClient):
    """Example 4: Post thought leadership content"""
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Thought Leadership Post")
    print("=" * 60)

    scheduler = SocialMediaScheduler(client)

    result = scheduler.post_thought_leadership(
        topic="The State of AI Security Hiring in 2026",
        content_blocks=[
            "After analyzing 100+ AI security companies, here are 3 hiring trends:",
            "1. 🔐 AI Security Engineers are the #1 priority (40% of all openings)",
            "2. 🌍 Remote-first is now standard (85% of roles offer full remote)",
            "3. 💰 Salaries up 25% YoY for ML security specialists",
            "What trends are you seeing?"
        ],
        hashtags=['aisecurity', 'hiring', 'recruitment', 'tech'],
        platforms=['linkedin']
    )

    print(f"✓ Posted thought leadership content")
    print(f"  Post ID: {result.get('id')}")


def example_5_batch_scheduling(client: LateClient):
    """Example 5: Schedule multiple posts with automatic spacing"""
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Batch Schedule Multiple Posts")
    print("=" * 60)

    scheduler = SocialMediaScheduler(client)

    # Get LinkedIn account IDs
    linkedin_ids = scheduler.get_linkedin_account_ids()

    if not linkedin_ids:
        print("⚠ No LinkedIn accounts connected. Skipping batch scheduling.")
        return

    # Prepare batch of posts
    posts = [
        {
            'content': '🚀 Wiz is hiring! Senior Security Engineer role open.\n\n#hiring #security',
            'account_ids': linkedin_ids
        },
        {
            'content': '💰 Snyk raised $196M - expect major hiring push soon.\n\n#funding #aisecurity',
            'account_ids': linkedin_ids
        },
        {
            'content': '📊 85% of AI security roles now offer remote work. The landscape is changing.\n\n#remote #tech',
            'account_ids': linkedin_ids
        }
    ]

    # Schedule starting tomorrow, with 6 hours between posts
    start_time = datetime.now() + timedelta(days=1)
    start_time = start_time.replace(hour=9, minute=0, second=0, microsecond=0)

    results = scheduler.schedule_batch_posts(
        posts=posts,
        start_time=start_time,
        interval_hours=6
    )

    print(f"✓ Scheduled {len(results)} posts")
    for i, result in enumerate(results):
        if 'error' in result:
            print(f"  Post {i+1}: ERROR - {result['error']}")
        else:
            print(f"  Post {i+1}: {result.get('id')} - {result.get('status')}")


def example_6_view_scheduled_posts(client: LateClient):
    """Example 6: View all scheduled posts"""
    print("\n" + "=" * 60)
    print("EXAMPLE 6: View Scheduled Posts")
    print("=" * 60)

    scheduler = SocialMediaScheduler(client)

    scheduled = scheduler.get_scheduled_posts()

    print(f"Scheduled Posts: {len(scheduled)}")
    for post in scheduled:
        post_id = post.get('id')
        scheduled_at = post.get('scheduled_at')
        content_preview = post.get('content', '')[:50] + '...'
        print(f"\n  Post ID: {post_id}")
        print(f"  Scheduled: {scheduled_at}")
        print(f"  Preview: {content_preview}")


def example_7_rss_content_sharing(client: LateClient):
    """Example 7: Share RSS feed content"""
    print("\n" + "=" * 60)
    print("EXAMPLE 7: Share RSS Feed Content")
    print("=" * 60)

    scheduler = SocialMediaScheduler(client)

    # Schedule RSS article for this afternoon
    this_afternoon = datetime.now().replace(
        hour=14, minute=0, second=0, microsecond=0
    )

    result = scheduler.schedule_rss_content(
        article_title="AI Security Startups Raised $2B in Q1 2026",
        article_summary="Funding surge signals massive hiring wave across the sector. Top companies include Wiz, Snyk, and Sysdig.",
        article_url="https://techcrunch.com/ai-security-funding",
        source_name="TechCrunch",
        platforms=['linkedin'],
        schedule_time=this_afternoon
    )

    print(f"✓ Scheduled RSS content sharing")
    print(f"  Post ID: {result.get('id')}")
    print(f"  Scheduled for: {this_afternoon}")


def example_8_cancel_post(client: LateClient):
    """Example 8: Cancel a scheduled post"""
    print("\n" + "=" * 60)
    print("EXAMPLE 8: Cancel Scheduled Post")
    print("=" * 60)

    scheduler = SocialMediaScheduler(client)

    # Get first scheduled post
    scheduled = scheduler.get_scheduled_posts()

    if not scheduled:
        print("⚠ No scheduled posts to cancel")
        return

    post_to_cancel = scheduled[0]
    post_id = post_to_cancel.get('id')

    # Cancel it
    result = scheduler.cancel_scheduled_post(post_id)

    print(f"✓ Cancelled scheduled post")
    print(f"  Post ID: {post_id}")


def example_9_upload_media_with_post(client: LateClient):
    """Example 9: Upload media and create post with image"""
    print("\n" + "=" * 60)
    print("EXAMPLE 9: Post with Media Upload")
    print("=" * 60)

    # Note: This example requires an actual image file
    # Uncomment and modify path as needed

    # Upload image
    # media = client.upload_media('/path/to/image.png')
    # media_url = media.get('url')
    # print(f"✓ Uploaded media: {media_url}")

    # Get LinkedIn accounts
    accounts = client.get_accounts()
    linkedin_accounts = [acc['id'] for acc in accounts if acc.get('platform') == 'linkedin']

    if not linkedin_accounts:
        print("⚠ No LinkedIn accounts found. Skipping media post.")
        return

    # Create post with media
    # result = client.create_post(
    #     content="Check out our latest hiring insights! 📊\n\n#recruitment #data",
    #     account_ids=linkedin_accounts,
    #     media_urls=[media_url]
    # )
    # print(f"✓ Posted with media")
    # print(f"  Post ID: {result.get('id')}")

    print("⚠ Example code commented out - uncomment and add image path to test")


def main():
    """Run all examples"""
    print("\n🚀 Late API Integration Examples")
    print("=" * 60)

    try:
        # Example 1: Basic setup (always run this)
        client = example_1_basic_setup()

        # Uncomment the examples you want to run:

        # example_2_post_hiring_announcement(client)
        # example_3_schedule_company_signal(client)
        # example_4_thought_leadership(client)
        # example_5_batch_scheduling(client)
        # example_6_view_scheduled_posts(client)
        # example_7_rss_content_sharing(client)
        # example_8_cancel_post(client)
        # example_9_upload_media_with_post(client)

        print("\n" + "=" * 60)
        print("✓ Examples completed successfully")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
