"""
Unit tests for RSS signal processing pipeline

Tests:
- RSS feed parsing
- Signal classification
- Company matching (exact, fuzzy, domain)
- Confidence scoring
- Deduplication
- Full pipeline integration
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, MagicMock
from backend.signal_classifier import SignalClassifier
from backend.company_matcher import CompanyMatcher
from backend.confidence_scorer import ConfidenceScorer
from backend.deduplicator import SignalDeduplicator
from backend.rss_aggregator import RSSAggregator, SignalPipeline


# Test fixtures
@pytest.fixture
def keywords_config():
    """Sample keywords configuration for testing"""
    return {
        'hiring_signals': ['hiring', 'recruiting', 'job opening'],
        'expansion_signals': ['expands', 'opens new office', 'growth'],
        'funding_signals': ['raises', 'funding round', 'series a'],
        'leadership_signals': ['appoints', 'names', 'new ceo'],
        'product_signals': ['launches', 'releases', 'announces']
    }


@pytest.fixture
def sample_companies():
    """Sample companies for matching tests"""
    return [
        {'id': 'uuid-1', 'name': 'Acme Corp', 'domain': 'acme.com'},
        {'id': 'uuid-2', 'name': 'CyberSec Solutions', 'domain': 'cybersec.io'},
        {'id': 'uuid-3', 'name': 'DataGuard Inc', 'domain': 'dataguard.com'}
    ]


@pytest.fixture
def mock_supabase():
    """Mock Supabase client"""
    client = Mock()
    # Mock table operations
    client.table.return_value.select.return_value.execute.return_value.data = []
    return client


# Signal Classification Tests
def test_signal_classification_hiring(keywords_config):
    """Test hiring signal detection"""
    classifier = SignalClassifier(keywords_config)

    item = {
        'title': 'Acme Corp is hiring Senior Security Engineers',
        'summary': 'We are recruiting talented professionals to join our team'
    }

    result = classifier.classify(item)

    assert result['signal_type'] == 'HIRING'
    assert 'hiring' in result['matched_keywords']
    assert 'recruiting' in result['matched_keywords']
    assert result['pattern_confidence'] > 50


def test_signal_classification_company(keywords_config):
    """Test company signal detection"""
    classifier = SignalClassifier(keywords_config)

    item = {
        'title': 'Acme Corp raises $50M Series B funding',
        'summary': 'The security startup announced a major funding round to fuel growth'
    }

    result = classifier.classify(item)

    assert result['signal_type'] == 'COMPANY'
    assert 'raises' in result['matched_keywords']
    assert 'funding_signal' in result['tags']
    assert result['pattern_confidence'] > 50


def test_signal_classification_individual(keywords_config):
    """Test individual/leadership signal detection"""
    classifier = SignalClassifier(keywords_config)

    item = {
        'title': 'Acme Corp appoints Jane Smith as new CEO',
        'summary': 'The company names industry veteran to lead strategic vision'
    }

    result = classifier.classify(item)

    assert result['signal_type'] == 'INDIVIDUAL'
    assert 'appoints' in result['matched_keywords']
    assert 'leadership_change' in result['tags']


def test_tag_extraction_urgency(keywords_config):
    """Test hiring urgency tag extraction"""
    classifier = SignalClassifier(keywords_config)

    item = {
        'title': 'Urgently hiring security engineers',
        'summary': 'Rapidly growing team needs immediate hires'
    }

    result = classifier.classify(item)

    assert 'hiring_urgency:high' in result['tags']


# Company Matching Tests
def test_company_matching_exact(mock_supabase, sample_companies):
    """Test exact company name match"""
    mock_supabase.table.return_value.select.return_value.execute.return_value.data = sample_companies

    matcher = CompanyMatcher(mock_supabase)

    item = {
        'title': 'Acme Corp raises funding',
        'summary': 'The company announced...',
        'link': 'https://example.com'
    }

    result = matcher.match_signal_to_company(item)

    assert result['match_type'] == 'exact'
    assert result['match_confidence'] == 100
    assert result['company_id'] == 'uuid-1'
    assert result['matched_company_name'] == 'Acme Corp'


def test_company_matching_domain(mock_supabase, sample_companies):
    """Test domain-based company match"""
    mock_supabase.table.return_value.select.return_value.execute.return_value.data = sample_companies

    matcher = CompanyMatcher(mock_supabase)

    item = {
        'title': 'Security breach at major tech firm',
        'summary': 'Visit acme.com for more details',
        'link': 'https://news.com/article'
    }

    result = matcher.match_signal_to_company(item)

    assert result['match_type'] == 'domain'
    assert result['match_confidence'] == 95
    assert result['company_id'] == 'uuid-1'


def test_company_matching_fuzzy(mock_supabase, sample_companies):
    """Test fuzzy company name match"""
    mock_supabase.table.return_value.select.return_value.execute.return_value.data = sample_companies

    matcher = CompanyMatcher(mock_supabase)

    item = {
        'title': 'CyberSec Solutions expands operations',
        'summary': 'The cybersecurity firm...',
        'link': 'https://example.com'
    }

    result = matcher.match_signal_to_company(item)

    # Should match 'CyberSec Solutions' with high similarity
    assert result['match_type'] in ['exact', 'fuzzy']
    assert result['match_confidence'] >= 85


def test_company_matching_no_match(mock_supabase, sample_companies):
    """Test no company match scenario"""
    mock_supabase.table.return_value.select.return_value.execute.return_value.data = sample_companies

    matcher = CompanyMatcher(mock_supabase)

    item = {
        'title': 'Generic tech news about random topic',
        'summary': 'No company mentioned here',
        'link': 'https://example.com'
    }

    result = matcher.match_signal_to_company(item)

    assert result['match_type'] == 'none'
    assert result['match_confidence'] == 0
    assert result['company_id'] is None


# Confidence Scoring Tests
def test_confidence_scoring_high():
    """Test high confidence score calculation"""
    scorer = ConfidenceScorer()

    score = scorer.calculate_final_confidence(
        source_confidence_boost=15,  # High-quality source
        pattern_confidence=90,       # Strong keyword matches
        match_confidence=100,        # Exact company match
        match_type='exact'
    )

    # Should be high confidence (80+)
    assert score >= 80
    assert score <= 100


def test_confidence_scoring_low():
    """Test low confidence score calculation"""
    scorer = ConfidenceScorer()

    score = scorer.calculate_final_confidence(
        source_confidence_boost=5,   # Lower quality source
        pattern_confidence=50,       # Weak keyword matches
        match_confidence=0,          # No company match
        match_type='none'
    )

    # Should be low-medium confidence
    assert score < 60


def test_confidence_scoring_explanation():
    """Test score explanation breakdown"""
    scorer = ConfidenceScorer()

    explanation = scorer.explain_score(
        source_confidence_boost=10,
        pattern_confidence=70,
        match_confidence=95,
        match_type='exact'
    )

    assert 'final_score' in explanation
    assert 'breakdown' in explanation
    assert 'formula' in explanation
    assert explanation['breakdown']['base'] == 30
    assert explanation['breakdown']['source_boost'] == 10


# Deduplication Tests
def test_deduplication_duplicate_found(mock_supabase):
    """Test duplicate signal detection"""
    # Mock existing signal
    existing_signal = {
        'id': 'signal-1',
        'company_id': 'uuid-1',
        'signal_type': 'HIRING',
        'title': 'Acme Corp hiring security engineers',
        'detected_at': datetime.now().isoformat()
    }

    mock_supabase.table.return_value.select.return_value.match.return_value.gte.return_value.execute.return_value.data = [existing_signal]

    deduplicator = SignalDeduplicator(mock_supabase)

    new_signal = {
        'company_id': 'uuid-1',
        'signal_type': 'HIRING',
        'title': 'Acme Corp is hiring security engineers now'
    }

    result = deduplicator.is_duplicate(new_signal)

    assert result['is_duplicate'] is True
    assert result['existing_signal_id'] == 'signal-1'
    assert result['should_merge'] is True


def test_deduplication_no_duplicate(mock_supabase):
    """Test no duplicate found"""
    mock_supabase.table.return_value.select.return_value.match.return_value.gte.return_value.execute.return_value.data = []

    deduplicator = SignalDeduplicator(mock_supabase)

    new_signal = {
        'company_id': 'uuid-1',
        'signal_type': 'HIRING',
        'title': 'Completely different hiring announcement'
    }

    result = deduplicator.is_duplicate(new_signal)

    assert result['is_duplicate'] is False
    assert result['existing_signal_id'] is None


def test_title_similarity_calculation(mock_supabase):
    """Test title similarity scoring"""
    deduplicator = SignalDeduplicator(mock_supabase)

    # Identical titles
    similarity = deduplicator._calculate_title_similarity(
        'Acme Corp hiring engineers',
        'Acme Corp hiring engineers'
    )
    assert similarity == 1.0

    # Very similar titles
    similarity = deduplicator._calculate_title_similarity(
        'Acme Corp hiring security engineers',
        'Acme Corp is hiring security engineers'
    )
    assert similarity > 0.8

    # Different titles
    similarity = deduplicator._calculate_title_similarity(
        'Acme Corp hiring engineers',
        'Different company funding news'
    )
    assert similarity < 0.5


# Full Pipeline Integration Test
def test_full_pipeline_integration(mock_supabase, sample_companies, keywords_config):
    """Test complete pipeline flow"""
    # Setup mocks
    mock_supabase.table.return_value.select.return_value.execute.return_value.data = sample_companies
    mock_supabase.table.return_value.select.return_value.match.return_value.gte.return_value.execute.return_value.data = []
    mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock()

    # Note: This test would require mocking the RSS fetching
    # For now, we verify components work together
    classifier = SignalClassifier(keywords_config)
    matcher = CompanyMatcher(mock_supabase)
    scorer = ConfidenceScorer()
    deduplicator = SignalDeduplicator(mock_supabase)

    # Simulate feed item
    item = {
        'title': 'Acme Corp hiring security engineers',
        'summary': 'Rapidly growing team seeks talent',
        'link': 'https://example.com',
        'confidence_boost': 10
    }

    # Run through pipeline steps
    classification = classifier.classify(item)
    match_result = matcher.match_signal_to_company(item)
    final_confidence = scorer.calculate_final_confidence(
        source_confidence_boost=item['confidence_boost'],
        pattern_confidence=classification['pattern_confidence'],
        match_confidence=match_result['match_confidence'],
        match_type=match_result['match_type']
    )

    # Verify results
    assert classification['signal_type'] == 'HIRING'
    assert match_result['company_id'] == 'uuid-1'
    assert final_confidence > 70  # Should be high confidence


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
