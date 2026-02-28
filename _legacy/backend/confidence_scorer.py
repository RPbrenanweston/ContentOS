"""
Confidence Scorer - Calculates final signal confidence score

Combines multiple factors:
1. Source confidence boost (feed-specific, from config: 0-20)
2. Pattern confidence (keyword matching quality: 0-100, weighted 30%)
3. Match confidence (company matching quality: 0-100, weighted 20%)
4. Match type boost (exact > domain > fuzzy > none: 0-30)

Final score range: 0-100
"""


class ConfidenceScorer:
    def calculate_final_confidence(
        self,
        source_confidence_boost: int,
        pattern_confidence: int,
        match_confidence: int,
        match_type: str
    ) -> int:
        """
        Calculate final 0-100 confidence score for a signal

        Formula:
        base = 30
        + source_boost (0-20 from feed config)
        + pattern_confidence * 0.3 (0-30)
        + match_confidence * 0.2 (0-20)
        + match_type_boost (0-30)

        Args:
            source_confidence_boost: Feed-specific boost from feed_config.yaml
            pattern_confidence: Classification confidence (0-100)
            match_confidence: Company matching confidence (0-100)
            match_type: 'exact' | 'domain' | 'fuzzy' | 'keyword' | 'none'

        Returns:
            Integer confidence score 0-100
        """
        base = 30

        # Source boost (from feed config, capped at 20)
        source_score = min(source_confidence_boost, 20)

        # Pattern score (30% weight)
        pattern_score = int(pattern_confidence * 0.3)

        # Match score (20% weight)
        match_score = int(match_confidence * 0.2)

        # Match type boost
        match_type_boost = {
            'exact': 30,     # Perfect company name match
            'domain': 25,    # Domain found in text
            'fuzzy': 15,     # Fuzzy string match
            'keyword': 5,    # Only keyword match (future use)
            'none': 0        # No company match
        }.get(match_type, 0)

        final_score = base + source_score + pattern_score + match_score + match_type_boost

        # Cap at 100
        return min(final_score, 100)

    def explain_score(
        self,
        source_confidence_boost: int,
        pattern_confidence: int,
        match_confidence: int,
        match_type: str
    ) -> dict:
        """
        Explain how confidence score was calculated (for debugging/transparency)

        Args:
            source_confidence_boost: Feed-specific boost
            pattern_confidence: Classification confidence
            match_confidence: Company matching confidence
            match_type: Match type string

        Returns:
            Dictionary with score breakdown
        """
        base = 30
        source_score = min(source_confidence_boost, 20)
        pattern_score = int(pattern_confidence * 0.3)
        match_score = int(match_confidence * 0.2)
        match_type_boost = {
            'exact': 30,
            'domain': 25,
            'fuzzy': 15,
            'keyword': 5,
            'none': 0
        }.get(match_type, 0)

        final_score = min(base + source_score + pattern_score + match_score + match_type_boost, 100)

        return {
            'final_score': final_score,
            'breakdown': {
                'base': base,
                'source_boost': source_score,
                'pattern_score': pattern_score,
                'match_score': match_score,
                'match_type_boost': match_type_boost
            },
            'formula': f"{base} (base) + {source_score} (source) + {pattern_score} (pattern) + {match_score} (match) + {match_type_boost} (match_type) = {final_score}"
        }
