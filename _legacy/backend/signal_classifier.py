"""
Signal Classifier - Categorizes RSS feed items into signal types with tags

Classifies feed items into:
- HIRING: Job postings, hiring announcements, team expansion
- COMPANY: Funding, acquisitions, product launches, partnerships
- INDIVIDUAL: Promotions, new hires, leadership changes

Extracts tags like hiring_urgency:high, expansion_signal, funding_signal, etc.
"""

import re
from typing import List, Dict


class SignalClassifier:
    def __init__(self, keywords_config: Dict):
        """
        Initialize classifier with keyword configuration

        Args:
            keywords_config: Dictionary of keyword categories from feed_config.yaml
        """
        self.keywords = keywords_config

    def classify(self, item: Dict) -> Dict:
        """
        Classify feed item into signal type and extract tags

        Args:
            item: Dictionary with 'title' and 'summary' fields

        Returns:
            {
                'signal_type': 'HIRING' | 'COMPANY' | 'INDIVIDUAL',
                'tags': ['hiring_urgency:high', 'expansion_signal', ...],
                'matched_keywords': [...],
                'pattern_confidence': 0-100
            }
        """
        text = f"{item.get('title', '')} {item.get('summary', '')}".lower()

        # Detect signal type
        signal_type = self._detect_signal_type(text)

        # Extract tags
        tags = self._extract_tags(text)

        # Match keywords
        matched_keywords = self._match_keywords(text)

        # Calculate pattern confidence
        pattern_confidence = self._calculate_pattern_confidence(
            signal_type, matched_keywords, tags
        )

        return {
            'signal_type': signal_type,
            'tags': tags,
            'matched_keywords': matched_keywords,
            'pattern_confidence': pattern_confidence
        }

    def _detect_signal_type(self, text: str) -> str:
        """
        Detect primary signal type based on keyword scoring

        Args:
            text: Lowercased combined title and summary

        Returns:
            'HIRING' | 'COMPANY' | 'INDIVIDUAL'
        """
        hiring_score = self._count_keyword_matches(text, self.keywords['hiring_signals'])
        leadership_score = self._count_keyword_matches(text, self.keywords['leadership_signals'])
        company_score = (
            self._count_keyword_matches(text, self.keywords['funding_signals']) +
            self._count_keyword_matches(text, self.keywords['product_signals']) +
            self._count_keyword_matches(text, self.keywords['expansion_signals'])
        )

        # Classify by highest score
        if hiring_score >= leadership_score and hiring_score >= company_score and hiring_score > 0:
            return 'HIRING'
        elif leadership_score > company_score and leadership_score > 0:
            return 'INDIVIDUAL'
        elif company_score > 0:
            return 'COMPANY'
        else:
            # Default to COMPANY if no keywords matched
            return 'COMPANY'

    def _extract_tags(self, text: str) -> List[str]:
        """
        Extract flexible tags based on content analysis

        Args:
            text: Lowercased combined title and summary

        Returns:
            List of tags like ['hiring_urgency:high', 'expansion_signal']
        """
        tags = []

        # Hiring urgency
        if any(kw in text for kw in ['urgently', 'immediately', 'asap', 'rapidly growing']):
            tags.append('hiring_urgency:high')
        elif any(kw in text for kw in ['hiring', 'recruiting', 'positions']):
            tags.append('hiring_urgency:medium')

        # Expansion signals
        if any(kw in text for kw in self.keywords['expansion_signals']):
            tags.append('expansion_signal')

        # Funding signals
        if any(kw in text for kw in self.keywords['funding_signals']):
            tags.append('funding_signal')

        # Leadership changes
        if any(kw in text for kw in self.keywords['leadership_signals']):
            tags.append('leadership_change')

        # Product launches
        if any(kw in text for kw in self.keywords['product_signals']):
            tags.append('product_launch')

        # Security/AI specific tags
        if any(kw in text for kw in ['artificial intelligence', 'machine learning', 'ai', 'ml']):
            tags.append('ai_related')

        if any(kw in text for kw in ['cybersecurity', 'security', 'breach', 'vulnerability']):
            tags.append('security_related')

        return tags

    def _match_keywords(self, text: str) -> List[str]:
        """
        Return list of all matched keywords across all categories

        Args:
            text: Lowercased combined title and summary

        Returns:
            List of matched keyword strings
        """
        matched = []
        for category, keywords in self.keywords.items():
            for keyword in keywords:
                if keyword in text:
                    matched.append(keyword)
        return list(set(matched))  # Deduplicate

    def _calculate_pattern_confidence(self, signal_type: str, matched_keywords: List[str], tags: List[str]) -> int:
        """
        Calculate 0-100 confidence score based on pattern matching quality

        Higher confidence = more keyword matches + more relevant tags

        Args:
            signal_type: Detected signal type
            matched_keywords: List of matched keywords
            tags: List of extracted tags

        Returns:
            Integer confidence score 0-100
        """
        confidence = 50  # Base confidence

        # Boost for keyword matches (up to +30)
        confidence += min(len(matched_keywords) * 5, 30)

        # Boost for relevant tags (up to +20)
        confidence += min(len(tags) * 5, 20)

        # Cap at 100
        return min(confidence, 100)

    def _count_keyword_matches(self, text: str, keywords: List[str]) -> int:
        """
        Count how many keywords from list appear in text

        Args:
            text: Lowercased text to search
            keywords: List of keyword strings to find

        Returns:
            Count of keyword matches
        """
        return sum(1 for kw in keywords if kw in text)
