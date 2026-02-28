"""
Signal Deduplicator - Prevents duplicate signals in database

Strategy: Hybrid approach
- One signal record per opportunity
- Track all sources that mentioned it (in metadata.sources array)
- Deduplication criteria: same company + similar title + within 7 days

Uses fuzzy title matching (80% similarity threshold)
"""

from datetime import datetime, timedelta
from typing import Dict, Optional
from fuzzywuzzy import fuzz
import logging


class SignalDeduplicator:
    def __init__(self, supabase_client):
        """
        Initialize deduplicator with Supabase client

        Args:
            supabase_client: Supabase client instance
        """
        self.client = supabase_client
        self.logger = logging.getLogger(__name__)

    def is_duplicate(self, new_signal: Dict) -> Dict:
        """
        Check if signal already exists in database

        Deduplication criteria:
        - Same company_id
        - Same signal_type
        - Similar title (80%+ fuzzy match)
        - Within 7 days

        Args:
            new_signal: Signal data dict with company_id, signal_type, title, etc.

        Returns:
            {
                'is_duplicate': bool,
                'existing_signal_id': uuid or None,
                'should_merge': bool
            }
        """
        if not new_signal.get('company_id'):
            # Can't deduplicate without company_id
            return {
                'is_duplicate': False,
                'existing_signal_id': None,
                'should_merge': False
            }

        # Query for similar signals
        seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()

        try:
            # Find signals from same company with same type in last 7 days
            result = self.client.table('signals').select('*').match({
                'company_id': new_signal['company_id'],
                'signal_type': new_signal['signal_type']
            }).gte('detected_at', seven_days_ago).execute()

            existing_signals = result.data

            # Check for title similarity
            for signal in existing_signals:
                similarity = self._calculate_title_similarity(
                    signal.get('title', ''),
                    new_signal.get('title', '')
                )

                if similarity > 0.8:  # 80% similar threshold
                    self.logger.info(f"Duplicate found: {signal['id']} (similarity: {similarity:.2f})")
                    return {
                        'is_duplicate': True,
                        'existing_signal_id': signal['id'],
                        'should_merge': True
                    }

        except Exception as e:
            self.logger.error(f"Error checking for duplicates: {e}")

        return {
            'is_duplicate': False,
            'existing_signal_id': None,
            'should_merge': False
        }

    def merge_signal_sources(self, existing_signal_id: str, new_source: Dict) -> bool:
        """
        Merge new source into existing signal metadata

        Tracks: which sources mentioned this signal, when

        Args:
            existing_signal_id: UUID of existing signal
            new_source: Dict with 'source' and 'link' fields

        Returns:
            True if merge succeeded, False otherwise
        """
        try:
            # Get existing signal
            result = self.client.table('signals').select('*').eq('id', existing_signal_id).execute()

            if not result.data:
                self.logger.error(f"Signal {existing_signal_id} not found")
                return False

            signal = result.data[0]

            # Initialize or update metadata
            metadata = signal.get('metadata', {})
            if not isinstance(metadata, dict):
                metadata = {}

            if 'sources' not in metadata:
                metadata['sources'] = []

            # Add new source with timestamp
            metadata['sources'].append({
                'source': new_source.get('source'),
                'url': new_source.get('link'),
                'detected_at': datetime.now().isoformat()
            })

            # Update signal
            self.client.table('signals').update({
                'metadata': metadata,
                'updated_at': datetime.now().isoformat()
            }).eq('id', existing_signal_id).execute()

            self.logger.info(f"Merged source {new_source.get('source')} into signal {existing_signal_id}")
            return True

        except Exception as e:
            self.logger.error(f"Error merging signal sources: {e}")
            return False

    def _calculate_title_similarity(self, title1: str, title2: str) -> float:
        """
        Calculate similarity between two titles (0-1)

        Uses fuzzywuzzy's ratio for full string comparison

        Args:
            title1: First title string
            title2: Second title string

        Returns:
            Similarity score 0.0-1.0
        """
        if not title1 or not title2:
            return 0.0

        return fuzz.ratio(title1.lower(), title2.lower()) / 100.0

    def get_signal_sources(self, signal_id: str) -> list:
        """
        Get all sources that mentioned a signal

        Args:
            signal_id: UUID of signal

        Returns:
            List of source dicts from metadata.sources
        """
        try:
            result = self.client.table('signals').select('metadata').eq('id', signal_id).execute()

            if result.data:
                metadata = result.data[0].get('metadata', {})
                return metadata.get('sources', [])

        except Exception as e:
            self.logger.error(f"Error fetching signal sources: {e}")

        return []
