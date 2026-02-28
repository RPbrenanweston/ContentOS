"""
Company Matcher - Links RSS feed signals to companies in database

Matching strategies (in order of priority):
1. Exact name match (highest confidence: 100)
2. Domain extraction from text (high confidence: 95)
3. Fuzzy name match (medium confidence: varies by similarity)
4. No match (confidence: 0, flag for review)
"""

import re
from typing import List, Dict, Optional
from fuzzywuzzy import fuzz
import logging


class CompanyMatcher:
    def __init__(self, supabase_client):
        """
        Initialize matcher with Supabase client

        Args:
            supabase_client: Supabase client instance
        """
        self.client = supabase_client
        self.companies = []
        self.logger = logging.getLogger(__name__)
        self._load_companies()

    def _load_companies(self) -> None:
        """
        Load all companies from database into memory for faster matching

        Caches companies list to avoid repeated DB queries during batch processing
        """
        try:
            result = self.client.table('companies').select('id, name, domain').execute()
            self.companies = result.data
            self.logger.info(f"Loaded {len(self.companies)} companies for matching")
        except Exception as e:
            self.logger.error(f"Failed to load companies: {e}")
            self.companies = []

    def refresh_companies(self) -> None:
        """
        Refresh the in-memory company cache

        Call this after adding new companies via CSV upload
        """
        self._load_companies()

    def match_signal_to_company(self, item: Dict) -> Dict:
        """
        Match feed item to company in database

        Strategy:
        1. Exact name match (highest confidence: 100)
        2. Domain extraction from text (high confidence: 95)
        3. Fuzzy name match (medium confidence: 85-99 based on similarity)
        4. No match (confidence: 0)

        Args:
            item: Feed item dictionary with 'title', 'summary', 'link' fields

        Returns:
            {
                'company_id': uuid or None,
                'match_type': 'exact' | 'domain' | 'fuzzy' | 'none',
                'match_confidence': 0-100,
                'matched_company_name': str or None
            }
        """
        text = f"{item.get('title', '')} {item.get('summary', '')} {item.get('link', '')}"

        # Try exact name match first
        exact_match = self._find_exact_match(text)
        if exact_match:
            return exact_match

        # Try domain extraction
        domain_match = self._find_domain_match(text)
        if domain_match:
            return domain_match

        # Try fuzzy name match
        fuzzy_match = self._find_fuzzy_match(text)
        if fuzzy_match:
            return fuzzy_match

        # No match found
        return {
            'company_id': None,
            'match_type': 'none',
            'match_confidence': 0,
            'matched_company_name': None
        }

    def _find_exact_match(self, text: str) -> Optional[Dict]:
        """
        Find exact company name match in text

        Args:
            text: Combined text from feed item

        Returns:
            Match result dict or None
        """
        text_lower = text.lower()

        for company in self.companies:
            company_name = company['name'].lower()
            # Check for exact match with word boundaries
            if re.search(rf'\b{re.escape(company_name)}\b', text_lower):
                return {
                    'company_id': company['id'],
                    'match_type': 'exact',
                    'match_confidence': 100,
                    'matched_company_name': company['name']
                }

        return None

    def _find_domain_match(self, text: str) -> Optional[Dict]:
        """
        Extract domain names from text and match to companies

        Args:
            text: Combined text from feed item

        Returns:
            Match result dict or None
        """
        domains = self._extract_domains(text)

        for domain in domains:
            for company in self.companies:
                if company.get('domain') and company['domain'].lower() == domain.lower():
                    return {
                        'company_id': company['id'],
                        'match_type': 'domain',
                        'match_confidence': 95,
                        'matched_company_name': company['name']
                    }

        return None

    def _find_fuzzy_match(self, text: str) -> Optional[Dict]:
        """
        Use fuzzy string matching to find similar company names

        Args:
            text: Combined text from feed item

        Returns:
            Match result dict or None
        """
        text_lower = text.lower()
        best_match = None
        best_ratio = 0

        for company in self.companies:
            company_name = company['name'].lower()

            # Skip very short company names (high false positive rate)
            if len(company_name) < 4:
                continue

            # Use partial ratio for substring matching
            ratio = fuzz.partial_ratio(company_name, text_lower)

            # Threshold: 85% similarity required
            if ratio > 85 and ratio > best_ratio:
                best_ratio = ratio
                best_match = {
                    'company_id': company['id'],
                    'match_type': 'fuzzy',
                    'match_confidence': ratio,
                    'matched_company_name': company['name']
                }

        return best_match

    def _extract_domains(self, text: str) -> List[str]:
        """
        Extract domain names from text using regex

        Extracts patterns like example.com, subdomain.example.com

        Args:
            text: Text to extract domains from

        Returns:
            List of domain strings (lowercased)
        """
        # Regex pattern for domain names
        # Matches: word.word or word.word.word etc
        pattern = r'\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]\b'
        domains = re.findall(pattern, text.lower())

        # Filter out common non-company domains
        exclude_domains = {'linkedin.com', 'twitter.com', 'facebook.com', 'youtube.com',
                          'techcrunch.com', 'venturebeat.com', 'bleepingcomputer.com',
                          'securityweek.com', 'darkreading.com', 'thehackernews.com',
                          'crn.com', 'google.com', 'microsoft.com', 'apple.com'}

        filtered_domains = [d for d in domains if d not in exclude_domains]

        return filtered_domains
