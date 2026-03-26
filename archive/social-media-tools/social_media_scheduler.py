"""
Social Media Scheduler

Integrates with Late API to schedule and post recruitment content
across LinkedIn, Twitter/X, and other platforms.

Use cases:
- Schedule hiring announcements
- Share company signals (funding, product launches)
- Post industry insights and thought leadership
- Automate recurring content from RSS feeds
"""

# @crumb
# @id           sal-py-social-scheduler
# @intent       Compose recruitment-focused social posts and batch-schedule them via
#               LateClient, abstracting content templates from raw API calls
# @responsibilities
#               - Build platform-appropriate content for hiring, signals, thought leadership
#               - Resolve account IDs for target platforms via lazy-cached account list
#               - Batch-schedule multiple posts with configurable time spacing
# @contracts    in: LateClient + content params | out: Late API post response | raises
#               ValueError if no connected accounts found for requested platforms
# @hazards      _account_cache never invalidates — stale if accounts added/removed post-init;
#               mutable default arg platforms=['linkedin'] is Python anti-pattern (shared
#               mutable); schedule_batch_posts swallows per-post errors silently into results
# @area         JOB
# @refs         backend/late_client.py
# @prompt       Should account_cache have a TTL or be invalidated on reconnect events?
# @crumbfn post_hiring_announcement | Content template + account resolver for hiring posts | +L91-L143
# @crumbfn schedule_batch_posts | Time-spaced bulk scheduling; partial errors not raised | +L318-L370

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from backend.late_client import LateClient, format_iso_timestamp

logger = logging.getLogger(__name__)


class SocialMediaScheduler:
    """
    Handles social media content scheduling and posting via Late API

    Integrates with your recruitment intelligence workflow to:
    1. Share hiring signals and company updates
    2. Build personal brand for recruiters
    3. Engage with target accounts
    """

    def __init__(self, late_client: LateClient):
        """
        Initialize scheduler

        Args:
            late_client: Configured LateClient instance
        """
        self.client = late_client
        self._account_cache = None

    def get_linkedin_account_ids(self) -> List[str]:
        """
        Get all connected LinkedIn account IDs

        Returns:
            List of LinkedIn account IDs
        """
        if not self._account_cache:
            self._account_cache = self.client.get_accounts()

        return [
            acc['id'] for acc in self._account_cache
            if acc.get('platform') == 'linkedin'
        ]

    def get_twitter_account_ids(self) -> List[str]:
        """
        Get all connected Twitter/X account IDs

        Returns:
            List of Twitter account IDs
        """
        if not self._account_cache:
            self._account_cache = self.client.get_accounts()

        return [
            acc['id'] for acc in self._account_cache
            if acc.get('platform') in ['twitter', 'x']
        ]

    def post_hiring_announcement(
        self,
        company_name: str,
        role_title: str,
        role_url: Optional[str] = None,
        platforms: List[str] = ['linkedin'],
        schedule_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Post a hiring announcement across platforms

        Args:
            company_name: Name of hiring company
            role_title: Job title
            role_url: URL to job posting
            platforms: List of platforms ('linkedin', 'twitter')
            schedule_time: When to post (None = immediate)

        Returns:
            Post creation response
        """
        # Build content
        content = f"🚀 Hiring Alert: {company_name} is looking for a {role_title}!"

        if role_url:
            content += f"\n\nApply here: {role_url}"

        content += "\n\n#hiring #jobs #recruitment"

        # Get account IDs for selected platforms
        account_ids = []
        for platform in platforms:
            if platform == 'linkedin':
                account_ids.extend(self.get_linkedin_account_ids())
            elif platform == 'twitter':
                account_ids.extend(self.get_twitter_account_ids())

        if not account_ids:
            raise ValueError(f"No connected accounts found for platforms: {platforms}")

        # Schedule or post immediately
        scheduled_at = format_iso_timestamp(schedule_time) if schedule_time else None

        logger.info(
            f"Posting hiring announcement for {company_name} - {role_title} "
            f"to {len(account_ids)} accounts"
        )

        return self.client.create_post(
            content=content,
            account_ids=account_ids,
            scheduled_at=scheduled_at
        )

    def post_company_signal(
        self,
        company_name: str,
        signal_type: str,
        signal_description: str,
        context: Optional[str] = None,
        platforms: List[str] = ['linkedin'],
        schedule_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Post a company signal (funding, product launch, etc.)

        Args:
            company_name: Company name
            signal_type: Type of signal (e.g., 'funding', 'product_launch')
            signal_description: Brief description
            context: Optional additional context
            platforms: Target platforms
            schedule_time: When to post

        Returns:
            Post creation response

        Example:
            >>> scheduler.post_company_signal(
            ...     company_name="Wiz",
            ...     signal_type="funding",
            ...     signal_description="Raised $300M Series D",
            ...     context="This signals rapid expansion and hiring needs"
            ... )
        """
        # Map signal types to emojis
        emoji_map = {
            'funding': '💰',
            'product_launch': '🚀',
            'acquisition': '🤝',
            'leadership': '👔',
            'expansion': '🌍'
        }
        emoji = emoji_map.get(signal_type, '📢')

        # Build content
        content = f"{emoji} {company_name} Update: {signal_description}"

        if context:
            content += f"\n\n{context}"

        content += "\n\n#tech #startup #growth"

        # Get account IDs
        account_ids = []
        for platform in platforms:
            if platform == 'linkedin':
                account_ids.extend(self.get_linkedin_account_ids())
            elif platform == 'twitter':
                account_ids.extend(self.get_twitter_account_ids())

        scheduled_at = format_iso_timestamp(schedule_time) if schedule_time else None

        logger.info(f"Posting company signal for {company_name}: {signal_type}")

        return self.client.create_post(
            content=content,
            account_ids=account_ids,
            scheduled_at=scheduled_at
        )

    def post_thought_leadership(
        self,
        topic: str,
        content_blocks: List[str],
        hashtags: Optional[List[str]] = None,
        platforms: List[str] = ['linkedin'],
        schedule_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Post thought leadership content

        Args:
            topic: Main topic/hook
            content_blocks: List of content paragraphs
            hashtags: List of hashtags (without #)
            platforms: Target platforms
            schedule_time: When to post

        Returns:
            Post creation response

        Example:
            >>> scheduler.post_thought_leadership(
            ...     topic="The AI Security Hiring Landscape in 2026",
            ...     content_blocks=[
            ...         "3 trends I'm seeing:",
            ...         "1. Companies prioritizing AI security engineers",
            ...         "2. Demand for SOC 2 + AI compliance expertise",
            ...         "3. Remote-first engineering teams"
            ...     ],
            ...     hashtags=['aisecurity', 'hiring', 'tech']
            ... )
        """
        # Build content
        content = f"{topic}\n\n"
        content += "\n\n".join(content_blocks)

        if hashtags:
            tag_string = " ".join(f"#{tag}" for tag in hashtags)
            content += f"\n\n{tag_string}"

        # Get account IDs
        account_ids = []
        for platform in platforms:
            if platform == 'linkedin':
                account_ids.extend(self.get_linkedin_account_ids())
            elif platform == 'twitter':
                account_ids.extend(self.get_twitter_account_ids())

        scheduled_at = format_iso_timestamp(schedule_time) if schedule_time else None

        logger.info(f"Posting thought leadership: {topic}")

        return self.client.create_post(
            content=content,
            account_ids=account_ids,
            scheduled_at=scheduled_at
        )

    def schedule_rss_content(
        self,
        article_title: str,
        article_summary: str,
        article_url: str,
        source_name: str,
        platforms: List[str] = ['linkedin'],
        schedule_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Schedule RSS feed content sharing

        Args:
            article_title: Article headline
            article_summary: Brief summary or key takeaway
            article_url: Link to article
            source_name: Source publication
            platforms: Target platforms
            schedule_time: When to post

        Returns:
            Post creation response
        """
        # Build content
        content = f"📰 {article_title}\n\n"
        content += f"{article_summary}\n\n"
        content += f"Read more: {article_url}\n\n"
        content += f"via {source_name}"

        # Get account IDs
        account_ids = []
        for platform in platforms:
            if platform == 'linkedin':
                account_ids.extend(self.get_linkedin_account_ids())
            elif platform == 'twitter':
                account_ids.extend(self.get_twitter_account_ids())

        scheduled_at = format_iso_timestamp(schedule_time) if schedule_time else None

        logger.info(f"Scheduling RSS content: {article_title}")

        return self.client.create_post(
            content=content,
            account_ids=account_ids,
            scheduled_at=scheduled_at
        )

    def schedule_batch_posts(
        self,
        posts: List[Dict[str, Any]],
        start_time: datetime,
        interval_hours: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Schedule multiple posts with automatic spacing

        Args:
            posts: List of post configs (each with 'content' and 'account_ids')
            start_time: When to start posting
            interval_hours: Hours between posts

        Returns:
            List of created post responses

        Example:
            >>> posts = [
            ...     {'content': 'Post 1', 'account_ids': linkedin_ids},
            ...     {'content': 'Post 2', 'account_ids': linkedin_ids},
            ...     {'content': 'Post 3', 'account_ids': linkedin_ids}
            ... ]
            >>> scheduler.schedule_batch_posts(
            ...     posts=posts,
            ...     start_time=datetime.now() + timedelta(days=1),
            ...     interval_hours=6
            ... )
        """
        results = []
        current_time = start_time

        for i, post_config in enumerate(posts):
            scheduled_at = format_iso_timestamp(current_time)

            try:
                result = self.client.create_post(
                    content=post_config['content'],
                    account_ids=post_config['account_ids'],
                    scheduled_at=scheduled_at,
                    media_urls=post_config.get('media_urls')
                )
                results.append(result)
                logger.info(f"Scheduled post {i+1}/{len(posts)} for {current_time}")

            except Exception as e:
                logger.error(f"Failed to schedule post {i+1}: {e}")
                results.append({'error': str(e), 'post_index': i})

            # Increment time for next post
            current_time += timedelta(hours=interval_hours)

        return results

    def get_scheduled_posts(self) -> List[Dict[str, Any]]:
        """
        Get all scheduled posts

        Returns:
            List of scheduled posts
        """
        return self.client.get_posts(status='scheduled')

    def get_post_performance(self, post_id: str) -> Dict[str, Any]:
        """
        Get analytics for a published post

        Args:
            post_id: Post ID

        Returns:
            Analytics data
        """
        return self.client.get_post_analytics(post_id)

    def cancel_scheduled_post(self, post_id: str) -> Dict[str, Any]:
        """
        Cancel a scheduled post

        Args:
            post_id: Post ID to cancel

        Returns:
            Cancellation confirmation
        """
        logger.info(f"Cancelling scheduled post: {post_id}")
        return self.client.delete_post(post_id)
