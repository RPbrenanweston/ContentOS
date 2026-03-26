# Late API Integration Guide

## Overview

The Late API integration enables your recruitment intelligence platform to automatically schedule and post content across 13+ social media platforms including LinkedIn, Twitter/X, Instagram, TikTok, Facebook, YouTube, and more.

**Use Cases:**
- Share hiring announcements to attract candidates
- Post company signals (funding, launches) to build awareness
- Distribute thought leadership content to establish expertise
- Automate RSS feed content sharing
- Schedule batch posts for consistent social presence

## Setup

### 1. Get Your Late API Key

1. Sign up at [https://getlate.dev/signup](https://getlate.dev/signup)
2. Connect your social media accounts (LinkedIn, Twitter, etc.)
3. Navigate to API settings and copy your API key
4. The key format is: `sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Configure Environment

Add your API key to your `.env` file:

```bash
# Late API Configuration
LATE_API_KEY=sk_54fa5dc9d796591a85917f7359e27f4433ef4cc0eee7af58785a4fc34d619d87
```

### 3. Install Dependencies

The integration uses the `requests` library (already in your dependencies):

```bash
pip install requests python-dotenv
```

## Architecture

### Components

1. **`backend/late_client.py`** - Core API client
   - Handles authentication
   - Provides low-level API methods
   - Manages rate limiting and errors

2. **`backend/social_media_scheduler.py`** - High-level scheduler
   - Business logic for recruitment content
   - Pre-built templates for hiring announcements, signals, etc.
   - Batch scheduling capabilities

3. **`examples/late_api_usage.py`** - Usage examples
   - Demonstrates all major features
   - Ready-to-run code snippets

## Quick Start

### Basic Usage

```python
from backend.late_client import LateClient
from backend.social_media_scheduler import SocialMediaScheduler

# Initialize
client = LateClient()
scheduler = SocialMediaScheduler(client)

# Post hiring announcement immediately
scheduler.post_hiring_announcement(
    company_name="Wiz Security",
    role_title="Senior AI Security Engineer",
    role_url="https://www.wiz.io/careers",
    platforms=['linkedin']
)
```

### Schedule for Later

```python
from datetime import datetime, timedelta

# Schedule for tomorrow at 9am
tomorrow_9am = datetime.now() + timedelta(days=1)
tomorrow_9am = tomorrow_9am.replace(hour=9, minute=0, second=0)

scheduler.post_company_signal(
    company_name="Snyk",
    signal_type="funding",
    signal_description="Raised $196M Series F",
    context="Major expansion expected - hiring across all departments",
    platforms=['linkedin'],
    schedule_time=tomorrow_9am
)
```

## Common Use Cases

### 1. Hiring Announcements

When you discover a new hiring signal:

```python
scheduler.post_hiring_announcement(
    company_name="Company Name",
    role_title="Role Title",
    role_url="https://apply-url.com",
    platforms=['linkedin', 'twitter'],
    schedule_time=None  # Post immediately
)
```

### 2. Company Signals

When you detect funding, product launches, or other signals:

```python
scheduler.post_company_signal(
    company_name="Company Name",
    signal_type="funding",  # or 'product_launch', 'acquisition', etc.
    signal_description="Brief description",
    context="Why this matters for hiring",
    platforms=['linkedin']
)
```

### 3. Thought Leadership

Build your personal brand as a recruitment expert:

```python
scheduler.post_thought_leadership(
    topic="The State of AI Security Hiring in 2026",
    content_blocks=[
        "After analyzing 100+ companies, here are 3 trends:",
        "1. AI Security Engineers are #1 priority",
        "2. Remote-first is now standard (85% of roles)",
        "3. Salaries up 25% YoY for specialists"
    ],
    hashtags=['aisecurity', 'hiring', 'recruitment'],
    platforms=['linkedin']
)
```

### 4. RSS Content Sharing

Automatically share industry news:

```python
scheduler.schedule_rss_content(
    article_title="AI Security Startups Raised $2B in Q1",
    article_summary="Funding surge signals massive hiring wave",
    article_url="https://techcrunch.com/article",
    source_name="TechCrunch",
    platforms=['linkedin']
)
```

### 5. Batch Scheduling

Schedule a week's worth of content:

```python
linkedin_ids = scheduler.get_linkedin_account_ids()

posts = [
    {'content': 'Monday post...', 'account_ids': linkedin_ids},
    {'content': 'Wednesday post...', 'account_ids': linkedin_ids},
    {'content': 'Friday post...', 'account_ids': linkedin_ids}
]

scheduler.schedule_batch_posts(
    posts=posts,
    start_time=datetime.now() + timedelta(days=1),
    interval_hours=48  # Every 2 days
)
```

## Integration with Your Workflow

### RSS Aggregator Integration

Modify `backend/scheduler.py` to automatically post RSS signals:

```python
from backend.social_media_scheduler import SocialMediaScheduler
from backend.late_client import LateClient

def run_daily_signal_collection():
    # ... existing code ...

    # Add social media posting
    late_client = LateClient()
    social_scheduler = SocialMediaScheduler(late_client)

    # Post top 3 signals to LinkedIn
    for signal in top_signals[:3]:
        social_scheduler.schedule_rss_content(
            article_title=signal['title'],
            article_summary=signal['summary'],
            article_url=signal['url'],
            source_name=signal['source'],
            platforms=['linkedin']
        )
```

### Attio CRM Integration

Post when new high-value leads are added:

```python
def on_new_lead_created(lead_data):
    """Called when new lead is added to Attio"""

    if lead_data.get('signal_type') == 'funding':
        scheduler.post_company_signal(
            company_name=lead_data['company_name'],
            signal_type='funding',
            signal_description=lead_data['signal_description'],
            platforms=['linkedin']
        )
```

## API Reference

### LateClient Methods

**Account Management:**
- `get_profiles()` - Get all profiles
- `get_accounts()` - Get connected social accounts

**Posts:**
- `create_post(content, account_ids, scheduled_at, media_urls)` - Create post
- `get_posts(status, account_id, limit)` - List posts
- `get_post(post_id)` - Get single post
- `update_post(post_id, content, scheduled_at)` - Update post
- `delete_post(post_id)` - Delete post

**Analytics:**
- `get_post_analytics(post_id)` - Get post performance
- `get_account_analytics(account_id, start_date, end_date)` - Account analytics

**Media:**
- `upload_media(file_path)` - Upload image/video

### SocialMediaScheduler Methods

**Posting:**
- `post_hiring_announcement()` - Post hiring announcements
- `post_company_signal()` - Post company signals
- `post_thought_leadership()` - Post thought leadership
- `schedule_rss_content()` - Share RSS content

**Management:**
- `schedule_batch_posts()` - Schedule multiple posts
- `get_scheduled_posts()` - View scheduled posts
- `cancel_scheduled_post(post_id)` - Cancel scheduled post
- `get_post_performance(post_id)` - Get analytics

**Utilities:**
- `get_linkedin_account_ids()` - Get LinkedIn accounts
- `get_twitter_account_ids()` - Get Twitter accounts

## Rate Limits

Late API rate limits vary by plan tier:

| Plan | Requests/Minute |
|------|-----------------|
| Free | 60 |
| Pro | 300 |
| Business | 600 |
| Enterprise | 1,200 |

Rate limit info is included in response headers:
- `X-RateLimit-Limit` - Total allowed
- `X-RateLimit-Remaining` - Remaining in window

## Best Practices

### 1. Content Strategy

**Frequency:**
- LinkedIn: 3-5 posts/week (max 1/day)
- Twitter: 5-10 posts/week
- Don't over-post - quality > quantity

**Timing:**
- LinkedIn: Weekdays 7-9am, 12-1pm, 5-6pm
- Twitter: Weekdays 8-10am, 6-9pm
- Test what works for your audience

**Content Mix:**
- 40% - Hiring announcements
- 30% - Company signals & news
- 30% - Thought leadership & insights

### 2. Automation Guidelines

**Do Automate:**
- RSS content sharing
- Hiring announcements from job boards
- Company signal posts (funding, launches)
- Weekly/monthly digest posts

**Don't Automate:**
- Replies to comments
- Direct messages
- Engagement (likes, shares)
- Controversial or sensitive topics

### 3. Personalization

Add your voice to automated content:

```python
# Generic (avoid)
content = "Company X is hiring!"

# Personalized (better)
content = "Excited to see Company X growing their AI security team! 🚀 Great opportunity for senior engineers."
```

### 4. Error Handling

Always handle API errors gracefully:

```python
try:
    result = scheduler.post_hiring_announcement(...)
    logger.info(f"Posted successfully: {result['id']}")
except LateAPIError as e:
    logger.error(f"Failed to post: {e}")
    # Retry logic or alert human
```

## Monitoring & Analytics

### Track Post Performance

```python
# Get analytics for published posts
posts = client.get_posts(status='published', limit=10)

for post in posts:
    analytics = scheduler.get_post_performance(post['id'])
    print(f"Post: {post['id']}")
    print(f"  Views: {analytics.get('views', 0)}")
    print(f"  Engagements: {analytics.get('engagements', 0)}")
    print(f"  Clicks: {analytics.get('clicks', 0)}")
```

### Monitor Schedule

```python
# View upcoming posts
scheduled = scheduler.get_scheduled_posts()
print(f"Scheduled posts: {len(scheduled)}")

for post in scheduled:
    print(f"{post['scheduled_at']}: {post['content'][:50]}...")
```

## Troubleshooting

### Common Issues

**1. "API key not provided" error**
- Check `.env` file has `LATE_API_KEY=your_key`
- Ensure `.env` is in project root
- Restart your application after adding key

**2. "No connected accounts found"**
- Log in to https://getlate.dev
- Connect your social media accounts
- Verify accounts are active (check `client.get_accounts()`)

**3. Rate limit exceeded**
- Implement exponential backoff
- Batch operations where possible
- Upgrade to higher plan tier if needed

**4. Post scheduling fails**
- Ensure `scheduled_at` is in future
- Use ISO 8601 format: `format_iso_timestamp(datetime_obj)`
- Check account permissions

## Examples

Run the complete examples:

```bash
python examples/late_api_usage.py
```

This will show all connected accounts and provide commented examples for:
- Posting immediately
- Scheduling posts
- Batch scheduling
- Viewing scheduled posts
- Cancelling posts
- Media uploads

## Security

**Protect Your API Key:**
- Never commit `.env` to version control
- Use environment variables in production
- Rotate keys if compromised
- Limit key permissions to necessary scopes

**Add to `.gitignore`:**
```
.env
*.env
```

## Support & Resources

- **Late Documentation:** [https://docs.getlate.dev/](https://docs.getlate.dev/)
- **API Reference:** [https://docs.getlate.dev/core/posts](https://docs.getlate.dev/core/posts)
- **Platform Signup:** [https://getlate.dev/signup](https://getlate.dev/signup)

## Next Steps

1. ✅ Get your Late API key from [getlate.dev](https://getlate.dev/signup)
2. ✅ Connect your LinkedIn and Twitter accounts
3. ✅ Add API key to `.env` file
4. ✅ Run `python examples/late_api_usage.py` to test
5. ✅ Integrate with your RSS aggregator workflow
6. ✅ Set up daily posting schedule
7. ✅ Monitor analytics and optimize content

---

*Last Updated: February 3, 2026*
