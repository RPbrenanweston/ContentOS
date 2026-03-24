#!/usr/bin/env python3
"""
AI Ark API Client
Minimal wrapper for AI Ark Company and People Search APIs.
"""

import requests
import os
from typing import Dict, Optional, Any
from dataclasses import dataclass


@dataclass
class AIArkResponse:
    """Standardized response wrapper for AI Ark API calls."""
    success: bool
    data: Optional[Dict[Any, Any]]
    message: str
    error: Optional[str] = None
    status_code: Optional[int] = None


class AIArkClient:
    """Client for AI Ark API (Company & People Search)."""

    BASE_URL = "https://api.ai-ark.com/api/developer-portal/v1"

    def __init__(self, api_key: str):
        """
        Initialize AI Ark API client.

        Args:
            api_key: AI Ark API key
        """
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })

    def _make_request(
        self,
        endpoint: str,
        method: str = "POST",
        data: Optional[Dict] = None
    ) -> AIArkResponse:
        """
        Make an API request with error handling.

        Args:
            endpoint: API endpoint path
            method: HTTP method (GET, POST, etc.)
            data: JSON payload for POST requests

        Returns:
            AIArkResponse object
        """
        url = f"{self.BASE_URL}/{endpoint}"

        try:
            if method == "POST":
                response = self.session.post(url, json=data, timeout=30)
            else:
                response = self.session.get(url, timeout=30)

            response_data = response.json() if response.text else {}

            if response.status_code == 200:
                return AIArkResponse(
                    success=True,
                    data=response_data,
                    message="Success",
                    status_code=response.status_code
                )
            elif response.status_code == 401:
                return AIArkResponse(
                    success=False,
                    data=None,
                    message="Unauthorized",
                    error="Invalid API key",
                    status_code=response.status_code
                )
            elif response.status_code == 429:
                return AIArkResponse(
                    success=False,
                    data=None,
                    message="Rate limited",
                    error="Too many requests",
                    status_code=response.status_code
                )
            else:
                error_detail = response_data.get('error', response.text)
                return AIArkResponse(
                    success=False,
                    data=response_data,
                    message=f"API error: {response.status_code}",
                    error=error_detail,
                    status_code=response.status_code
                )

        except requests.exceptions.Timeout:
            return AIArkResponse(
                success=False,
                data=None,
                message="Request timeout",
                error="Request timed out after 30 seconds"
            )
        except requests.exceptions.RequestException as e:
            return AIArkResponse(
                success=False,
                data=None,
                message="Request failed",
                error=str(e)
            )

    def search_company(
        self,
        company_name: Optional[str] = None,
        domain: Optional[str] = None,
        linkedin_url: Optional[str] = None
    ) -> AIArkResponse:
        """
        Search for company information.

        Args:
            company_name: Company name
            domain: Company domain
            linkedin_url: LinkedIn company URL

        Returns:
            AIArkResponse with company data
        """
        data = {}
        if company_name:
            data['company_name'] = company_name
        elif domain:
            data['domain'] = domain
        elif linkedin_url:
            data['linkedin_url'] = linkedin_url

        return self._make_request("companies", data=data)

    def search_people(
        self,
        email: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        company_domain: Optional[str] = None
    ) -> AIArkResponse:
        """
        Search for people information.

        Args:
            email: Email address
            first_name: First name
            last_name: Last name
            company_domain: Company domain

        Returns:
            AIArkResponse with people data
        """
        data = {}
        if email:
            data['email'] = email
        else:
            if first_name:
                data['first_name'] = first_name
            if last_name:
                data['last_name'] = last_name
            if company_domain:
                data['company_domain'] = company_domain

        return self._make_request("people", data=data)


if __name__ == "__main__":
    # Test the client
    api_key = os.getenv("AIARK_API_KEY")
    if not api_key:
        print("❌ AIARK_API_KEY not set in environment")
        exit(1)

    client = AIArkClient(api_key)

    print("Testing AI Ark API Client")
    print("=" * 60)

    # Test company search with domain
    print("\n1. Testing Company Search (by domain)...")
    result = client.search_company(domain="anthropic.com")
    print(f"   Status: {result.message}")
    if result.success and result.data:
        company_name = result.data.get('company_name', 'Unknown')
        headcount = result.data.get('headcount', 'Unknown')
        print(f"   Company: {company_name}")
        print(f"   Headcount: {headcount}")
    else:
        print(f"   Error: {result.error}")

    print("\n" + "=" * 60)
    print("✓ AI Ark client initialized successfully")
