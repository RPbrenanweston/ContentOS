"""
Late API Client

Integrates with Late.dev social media scheduling platform
Supports posting to 13+ platforms including LinkedIn, Twitter/X, Instagram, etc.

API Documentation: https://docs.getlate.dev/
"""

# @crumb
# @id           sal-py-late-client
# @intent       Provide a typed Python interface to the Late API so job automation
#               scripts can schedule social media posts without raw HTTP management
# @responsibilities
#               - Authenticate requests via Bearer token from env
#               - CRUD for posts, profiles, accounts, queues, and media uploads
#               - Surface Late API errors as typed LateAPIError exceptions
# @contracts    in: LATE_API_KEY env var | out: JSON response dicts | raises
#               LateAPIError on 4xx/5xx provider errors
# @hazards      Bearer token in session headers — no rotation/expiry; rate limit headers
#               logged but not enforced — caller silently 429s; media upload (upload_media)
#               bypasses session headers; no request timeout — hangs on network stall
# @area         JOB
# @refs         backend/social_media_scheduler.py, docs/late-api-integration.md
# @prompt       Should _request add retry logic for 429 responses, or delegate to retry.py?
# @crumbfn _request | Core HTTP dispatcher; maps HTTP errors to LateAPIError | +L72-L123
# @crumbfn create_post | Multi-platform post creation with draft and schedule support | +L163-L215

import os
import requests
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class LateAPIError(Exception):
    """Exception raised for Late API errors"""
    pass


class LateClient:
    """
    Client for interacting with Late API

    Handles authentication, post creation, scheduling, and account management
    """

    BASE_URL = "https://getlate.dev/api/v1"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Late API client

        Args:
            api_key: Late API key (defaults to LATE_API_KEY env var)
        """
        self.api_key = api_key or os.getenv('LATE_API_KEY')
        if not self.api_key:
            raise ValueError("Late API key not provided. Set LATE_API_KEY environment variable or pass api_key parameter")

        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        })

    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make authenticated request to Late API

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (without base URL)
            data: Request body data
            params: Query parameters

        Returns:
            Response data as dictionary

        Raises:
            LateAPIError: If request fails
        """
        url = f"{self.BASE_URL}/{endpoint.lstrip('/')}"

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params
            )
            response.raise_for_status()

            # Log rate limit info
            if 'X-RateLimit-Remaining' in response.headers:
                logger.debug(
                    f"Rate limit: {response.headers.get('X-RateLimit-Remaining')}/"
                    f"{response.headers.get('X-RateLimit-Limit')} remaining"
                )

            return response.json() if response.content else {}

        except requests.exceptions.HTTPError as e:
            error_msg = f"Late API error: {e.response.status_code}"
            try:
                error_data = e.response.json()
                error_msg += f" - {error_data}"
            except:
                error_msg += f" - {e.response.text}"
            raise LateAPIError(error_msg)
        except requests.exceptions.RequestException as e:
            raise LateAPIError(f"Request failed: {str(e)}")

    # ============================================================================
    # PROFILES & ACCOUNTS
    # ============================================================================

    def get_profiles(self) -> List[Dict[str, Any]]:
        """
        Get all profiles (containers grouping social media accounts)

        Returns:
            List of profile objects
        """
        response = self._request('GET', 'profiles')
        # API returns {"profiles": [...]}
        if isinstance(response, dict) and 'profiles' in response:
            return response['profiles']
        return response if isinstance(response, list) else []

    def get_accounts(self, profile_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all connected social media accounts

        Args:
            profile_id: Optional profile ID to filter accounts

        Returns:
            List of account objects
        """
        params = {'profile_id': profile_id} if profile_id else None
        response = self._request('GET', 'accounts', params=params)
        # API returns {"accounts": [...]}
        if isinstance(response, dict) and 'accounts' in response:
            return response['accounts']
        return response if isinstance(response, list) else []

    # ============================================================================
    # POSTS
    # ============================================================================

    def create_post(
        self,
        content: str,
        account_ids: List[str],
        scheduled_at: Optional[str] = None,
        media_urls: Optional[List[str]] = None,
        platform_specific: Optional[Dict[str, Any]] = None,
        is_draft: bool = False
    ) -> Dict[str, Any]:
        """
        Create and optionally schedule a post across multiple platforms

        Args:
            content: Post text/caption
            account_ids: List of account IDs to post to
            scheduled_at: ISO 8601 timestamp for scheduling (None if draft or publish now)
            media_urls: List of media URLs to attach
            platform_specific: Platform-specific settings (hashtags, mentions, etc.)
            is_draft: If True, creates draft (not published). Default False for backward compatibility.

        Returns:
            Created post object with ID and status

        Example (draft):
            >>> client.create_post(
            ...     content="Hiring engineers at our AI security startup! #hiring",
            ...     account_ids=["linkedin_account_id"],
            ...     is_draft=True
            ... )

        Example (scheduled):
            >>> client.create_post(
            ...     content="Hiring engineers at our AI security startup! #hiring",
            ...     account_ids=["linkedin_account_id", "twitter_account_id"],
            ...     scheduled_at="2026-02-04T09:00:00Z"
            ... )
        """
        payload = {
            'content': content,
            'account_ids': account_ids,
            'isDraft': is_draft
        }

        if scheduled_at:
            payload['scheduled_at'] = scheduled_at

        if media_urls:
            payload['media_urls'] = media_urls

        if platform_specific:
            payload['platform_specific'] = platform_specific

        return self._request('POST', 'posts', data=payload)

    def get_posts(
        self,
        status: Optional[str] = None,
        account_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get posts with optional filtering

        Args:
            status: Filter by status (draft, scheduled, published, failed)
            account_id: Filter by account
            limit: Maximum number of posts to return

        Returns:
            List of post objects
        """
        params = {'limit': limit}
        if status:
            params['status'] = status
        if account_id:
            params['account_id'] = account_id

        return self._request('GET', 'posts', params=params)

    def get_post(self, post_id: str) -> Dict[str, Any]:
        """
        Get a specific post by ID

        Args:
            post_id: Post ID

        Returns:
            Post object with full details
        """
        return self._request('GET', f'posts/{post_id}')

    def update_post(
        self,
        post_id: str,
        content: Optional[str] = None,
        scheduled_at: Optional[str] = None,
        media_urls: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Update a draft or scheduled post

        Args:
            post_id: Post ID to update
            content: New content
            scheduled_at: New scheduled time
            media_urls: New media URLs

        Returns:
            Updated post object
        """
        payload = {}
        if content is not None:
            payload['content'] = content
        if scheduled_at is not None:
            payload['scheduled_at'] = scheduled_at
        if media_urls is not None:
            payload['media_urls'] = media_urls

        return self._request('PUT', f'posts/{post_id}', data=payload)

    def delete_post(self, post_id: str) -> Dict[str, Any]:
        """
        Delete a draft or scheduled post

        Args:
            post_id: Post ID to delete

        Returns:
            Deletion confirmation
        """
        return self._request('DELETE', f'posts/{post_id}')

    # ============================================================================
    # ANALYTICS
    # ============================================================================

    def get_post_analytics(self, post_id: str) -> Dict[str, Any]:
        """
        Get analytics for a published post

        Args:
            post_id: Post ID

        Returns:
            Analytics data (views, engagements, clicks, etc.)
        """
        return self._request('GET', f'posts/{post_id}/analytics')

    def get_account_analytics(
        self,
        account_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get analytics for an account over time period

        Args:
            account_id: Account ID
            start_date: Start date (ISO 8601)
            end_date: End date (ISO 8601)

        Returns:
            Aggregated analytics data
        """
        params = {}
        if start_date:
            params['start_date'] = start_date
        if end_date:
            params['end_date'] = end_date

        return self._request('GET', f'accounts/{account_id}/analytics', params=params)

    # ============================================================================
    # MEDIA UPLOAD
    # ============================================================================

    def upload_media(self, file_path: str) -> Dict[str, Any]:
        """
        Upload media file (image, video, document)

        Args:
            file_path: Path to media file

        Returns:
            Media object with URL for use in posts
        """
        # Remove Content-Type header for multipart upload
        headers = self.session.headers.copy()
        headers.pop('Content-Type', None)

        with open(file_path, 'rb') as f:
            files = {'file': f}
            response = requests.post(
                f"{self.BASE_URL}/media",
                headers={'Authorization': f'Bearer {self.api_key}'},
                files=files
            )
            response.raise_for_status()
            return response.json()

    # ============================================================================
    # QUEUES (Recurring Schedules)
    # ============================================================================

    def get_queues(self, profile_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all posting queues (recurring schedules)

        Args:
            profile_id: Optional profile ID to filter queues

        Returns:
            List of queue objects
        """
        params = {'profile_id': profile_id} if profile_id else None
        return self._request('GET', 'queues', params=params)

    def create_queue_post(
        self,
        queue_id: str,
        content: str,
        media_urls: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Add post to a recurring queue

        Args:
            queue_id: Queue ID
            content: Post content
            media_urls: Optional media URLs

        Returns:
            Queue post object
        """
        payload = {
            'content': content
        }
        if media_urls:
            payload['media_urls'] = media_urls

        return self._request('POST', f'queues/{queue_id}/posts', data=payload)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def format_iso_timestamp(dt: datetime) -> str:
    """
    Format datetime to ISO 8601 string for Late API

    Args:
        dt: datetime object

    Returns:
        ISO 8601 formatted string
    """
    return dt.isoformat()


def get_linkedin_accounts(client: LateClient) -> List[Dict[str, Any]]:
    """
    Get all connected LinkedIn accounts

    Args:
        client: LateClient instance

    Returns:
        List of LinkedIn account objects
    """
    accounts = client.get_accounts()
    return [acc for acc in accounts if acc.get('platform') == 'linkedin']


def get_twitter_accounts(client: LateClient) -> List[Dict[str, Any]]:
    """
    Get all connected Twitter/X accounts

    Args:
        client: LateClient instance

    Returns:
        List of Twitter account objects
    """
    accounts = client.get_accounts()
    return [acc for acc in accounts if acc.get('platform') in ['twitter', 'x']]
