"""
RSS Aggregator and Signal Pipeline

Orchestrates the full RSS → Signal workflow:
1. Fetch RSS feeds from configured sources
2. Parse feed items (title, link, date, summary)
3. Classify signals (HIRING/COMPANY/INDIVIDUAL)
4. Match to companies in database
5. Score confidence (0-100)
6. Deduplicate (merge sources if duplicate found)
7. Store in Supabase signals table
"""

import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from dateutil import parser as date_parser
import yaml
from pathlib import Path
import logging
from typing import Dict, List

from backend.signal_classifier import SignalClassifier
from backend.company_matcher import CompanyMatcher
from backend.confidence_scorer import ConfidenceScorer
from backend.deduplicator import SignalDeduplicator


class RSSAggregator:
    """RSS feed fetcher and parser"""

    def __init__(self, config_path='backend/feed_config.yaml'):
        """
        Initialize RSS aggregator with feed configuration

        Args:
            config_path: Path to feed_config.yaml
        """
        self.config = self._load_config(config_path)
        self.logger = logging.getLogger(__name__)

    def _load_config(self, config_path: str) -> Dict:
        """Load YAML configuration"""
        try:
            with open(config_path) as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Failed to load config from {config_path}: {e}")
            raise

    def fetch_all_feeds(self) -> List[Dict]:
        """
        Fetch all RSS feeds from config

        Returns:
            List of feed item dictionaries
        """
        all_items = []

        for category, feeds in self.config['feeds'].items():
            for feed_config in feeds:
                try:
                    items = self.fetch_feed(feed_config)
                    all_items.extend(items)
                    self.logger.info(f"Fetched {len(items)} items from {feed_config['name']}")
                except Exception as e:
                    self.logger.error(f"Failed to fetch {feed_config['name']}: {e}")

        return all_items

    def fetch_feed(self, feed_config: Dict) -> List[Dict]:
        """
        Fetch single RSS feed

        Args:
            feed_config: Feed configuration dict from feed_config.yaml

        Returns:
            List of parsed feed item dictionaries
        """
        try:
            feed = feedparser.parse(feed_config['url'])
            items = []

            for entry in feed.entries:
                item = {
                    'title': entry.get('title', ''),
                    'link': entry.get('link', ''),
                    'published': self._parse_date(entry.get('published', '')),
                    'summary': entry.get('summary', entry.get('description', '')),
                    'source': feed_config['name'],
                    'source_category': feed_config['category'],
                    'confidence_boost': feed_config.get('confidence_boost', 0),
                    'raw_content': None  # Optional: can fetch full article content
                }
                items.append(item)

            return items

        except Exception as e:
            self.logger.error(f"Error parsing feed {feed_config.get('name')}: {e}")
            return []

    def _parse_date(self, date_string: str) -> datetime:
        """
        Parse RSS date string to datetime

        Args:
            date_string: Date string from RSS feed

        Returns:
            datetime object
        """
        try:
            return date_parser.parse(date_string)
        except:
            return datetime.now()

    def fetch_full_content(self, url: str) -> str:
        """
        Fetch full article content from URL (optional, for AI summarization)

        Args:
            url: Article URL

        Returns:
            Article text content (up to 5000 chars)
        """
        try:
            response = requests.get(url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; RSS Aggregator Bot/1.0)'
            })
            soup = BeautifulSoup(response.content, 'html.parser')

            # Extract main content (heuristic: find largest text block)
            paragraphs = soup.find_all('p')
            content = ' '.join([p.get_text() for p in paragraphs])
            return content[:5000]  # Limit to 5000 chars

        except Exception as e:
            self.logger.warning(f"Could not fetch full content from {url}: {e}")
            return None


class SignalPipeline:
    """Full RSS → Signal processing pipeline"""

    def __init__(self, supabase_client, config_path='backend/feed_config.yaml'):
        """
        Initialize signal pipeline with all components

        Args:
            supabase_client: Supabase client instance
            config_path: Path to feed_config.yaml
        """
        self.aggregator = RSSAggregator(config_path)
        self.classifier = SignalClassifier(self.aggregator.config['keywords'])
        self.matcher = CompanyMatcher(supabase_client)
        self.scorer = ConfidenceScorer()
        self.deduplicator = SignalDeduplicator(supabase_client)
        self.client = supabase_client
        self.logger = logging.getLogger(__name__)

    def run_pipeline(self, limit: int = None) -> Dict:
        """
        Execute full RSS → Signals pipeline:
        1. Fetch all RSS feeds
        2. Classify each item
        3. Match to companies
        4. Score confidence
        5. Deduplicate
        6. Store in Supabase

        Args:
            limit: Optional limit on number of items to process (for testing)

        Returns:
            Summary statistics dict
        """
        self.logger.info("Starting RSS signal pipeline...")

        # Fetch feeds
        items = self.aggregator.fetch_all_feeds()
        self.logger.info(f"Fetched {len(items)} feed items")

        if limit:
            items = items[:limit]
            self.logger.info(f"Limited to {limit} items for processing")

        processed_count = 0
        duplicate_count = 0
        unmatched_count = 0
        error_count = 0

        for item in items:
            try:
                # Classify signal
                classification = self.classifier.classify(item)

                # Match to company
                match_result = self.matcher.match_signal_to_company(item)

                # Skip if no company match
                if match_result['company_id'] is None:
                    unmatched_count += 1
                    self.logger.debug(f"No company match for: {item['title'][:50]}...")
                    continue

                # Score confidence
                final_confidence = self.scorer.calculate_final_confidence(
                    source_confidence_boost=item['confidence_boost'],
                    pattern_confidence=classification['pattern_confidence'],
                    match_confidence=match_result['match_confidence'],
                    match_type=match_result['match_type']
                )

                # Build signal data
                signal_data = {
                    'company_id': match_result['company_id'],
                    'signal_type': classification['signal_type'],
                    'title': item['title'],
                    'description': item['summary'],
                    'source': item['source'],
                    'source_url': item['link'],
                    'tags': classification['tags'],
                    'confidence_score': final_confidence,
                    'detected_at': item['published'].isoformat(),
                    'is_active': True,
                    'metadata': {
                        'matched_keywords': classification['matched_keywords'],
                        'match_type': match_result['match_type'],
                        'matched_company_name': match_result['matched_company_name'],
                        'source_category': item['source_category'],
                        'sources': [
                            {
                                'source': item['source'],
                                'url': item['link'],
                                'detected_at': datetime.now().isoformat()
                            }
                        ]
                    }
                }

                # Check for duplicates
                dedup_result = self.deduplicator.is_duplicate(signal_data)

                if dedup_result['is_duplicate']:
                    # Merge sources
                    self.deduplicator.merge_signal_sources(
                        dedup_result['existing_signal_id'],
                        {'source': item['source'], 'link': item['link']}
                    )
                    duplicate_count += 1
                else:
                    # Insert new signal
                    self.client.table('signals').insert(signal_data).execute()
                    processed_count += 1
                    self.logger.info(f"Created signal: {item['title'][:50]}... (confidence: {final_confidence})")

            except Exception as e:
                self.logger.error(f"Failed to process item '{item.get('title', 'unknown')}': {e}")
                error_count += 1

        result = {
            'processed': processed_count,
            'duplicates': duplicate_count,
            'unmatched': unmatched_count,
            'errors': error_count,
            'total_fetched': len(items),
            'timestamp': datetime.now().isoformat()
        }

        self.logger.info(f"Pipeline complete: {result}")
        return result


# Convenience function for CLI usage
def run_rss_pipeline(supabase_client, config_path='backend/feed_config.yaml', limit=None):
    """
    Run RSS pipeline from command line

    Args:
        supabase_client: Supabase client instance
        config_path: Path to feed config
        limit: Optional limit on items to process

    Returns:
        Pipeline result statistics
    """
    pipeline = SignalPipeline(supabase_client, config_path)
    return pipeline.run_pipeline(limit=limit)
