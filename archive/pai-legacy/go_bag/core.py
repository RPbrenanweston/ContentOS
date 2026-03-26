"""
Client Go Bag Core Module
Handles web scraping, brand analysis, and client context extraction.
"""

import os
import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

import requests
from anthropic import Anthropic
from bs4 import BeautifulSoup
from rich.console import Console

console = Console()


@dataclass
class ClientContext:
    """Extracted brand intelligence about a client."""

    client_name: str
    website_url: str
    mission: str
    target_audience: str
    brand_tone: str
    primary_services: list[str]
    raw_content: str


class WebScraper:
    """Scrapes website content for brand analysis."""

    def __init__(self, timeout: int = 10):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def scrape(self, url: str) -> str:
        """
        Scrape main content from URL.

        Args:
            url: Website URL to scrape

        Returns:
            Cleaned text content from the site

        Raises:
            requests.RequestException: If scraping fails
        """
        try:
            # Validate URL
            if not url.startswith(('http://', 'https://')):
                url = f'https://{url}'

            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()

            # Parse HTML
            soup = BeautifulSoup(response.content, 'html.parser')

            # Remove script and style elements
            for script in soup(['script', 'style']):
                script.decompose()

            # Extract text
            text = soup.get_text(separator='\n', strip=True)

            # Clean up whitespace
            text = '\n'.join(line.strip() for line in text.split('\n') if line.strip())

            return text[:5000]  # Limit to first 5000 chars for API efficiency

        except requests.exceptions.RequestException as e:
            raise requests.RequestException(f"Failed to scrape {url}: {str(e)}")


class BrandAnalyzer:
    """Analyzes brand intelligence using Claude API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")
        self.client = Anthropic(api_key=self.api_key)

    def analyze(self, website_url: str, raw_content: str) -> dict:
        """
        Analyze website content to extract brand intelligence.

        Args:
            website_url: URL of the website
            raw_content: Scraped text content

        Returns:
            Dict with mission, audience, tone, services
        """
        prompt = f"""You are a strategic consultant analyzing a company's digital presence.

Website URL: {website_url}

Website Content:
{raw_content}

Extract and provide ONLY the following in a structured format:

1. COMPANY_MISSION: A 1-2 sentence summary of their core mission/purpose
2. TARGET_AUDIENCE: Who they serve (e.g., "Mid-market SaaS companies", "Fortune 500 enterprises")
3. BRAND_TONE: One or two words describing their communication style (e.g., "formal and authoritative", "playful and conversational", "technical and precise")
4. PRIMARY_SERVICES: A comma-separated list of their main offerings (e.g., "Consulting, Implementation, Support")

CRITICAL: Format your response EXACTLY as:
COMPANY_MISSION: [text]
TARGET_AUDIENCE: [text]
BRAND_TONE: [text]
PRIMARY_SERVICES: [text]"""

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        return self._parse_analysis(response.content[0].text)

    def _parse_analysis(self, response_text: str) -> dict:
        """Parse the structured response from Claude."""
        result = {
            'mission': '',
            'target_audience': '',
            'brand_tone': '',
            'primary_services': []
        }

        lines = response_text.strip().split('\n')
        for line in lines:
            if line.startswith('COMPANY_MISSION:'):
                result['mission'] = line.replace('COMPANY_MISSION:', '').strip()
            elif line.startswith('TARGET_AUDIENCE:'):
                result['target_audience'] = line.replace('TARGET_AUDIENCE:', '').strip()
            elif line.startswith('BRAND_TONE:'):
                result['brand_tone'] = line.replace('BRAND_TONE:', '').strip()
            elif line.startswith('PRIMARY_SERVICES:'):
                services_str = line.replace('PRIMARY_SERVICES:', '').strip()
                result['primary_services'] = [s.strip() for s in services_str.split(',')]

        return result


class ClientContextBuilder:
    """Orchestrates scraping and analysis to build client context."""

    def __init__(self, api_key: Optional[str] = None):
        self.scraper = WebScraper()
        self.analyzer = BrandAnalyzer(api_key)

    def build(self, url: str) -> ClientContext:
        """
        Build complete client context from URL.

        Args:
            url: Client website URL

        Returns:
            ClientContext with all extracted intelligence
        """
        # Extract client name from domain
        parsed = urlparse(url if url.startswith(('http://', 'https://')) else f'https://{url}')
        domain = parsed.netloc.replace('www.', '')
        client_name = domain.split('.')[0].title()

        # Scrape content
        raw_content = self.scraper.scrape(url)

        # Analyze brand
        analysis = self.analyzer.analyze(url, raw_content)

        return ClientContext(
            client_name=client_name,
            website_url=url,
            mission=analysis['mission'],
            target_audience=analysis['target_audience'],
            brand_tone=analysis['brand_tone'],
            primary_services=analysis['primary_services'],
            raw_content=raw_content
        )
