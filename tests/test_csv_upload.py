"""
Tests for CSV upload system.

Tests parsing, validation, and merge logic for Apollo and candidate CSVs.
"""

import pytest
from backend.csv_mapper import (
    parse_csv,
    normalize_departments,
    normalize_skills,
    combine_name_fields,
    normalize_location
)
from backend.validation import validate_row, validate_csv_batch
from backend.data_merger import merge_company_data, merge_prospect_data, merge_candidate_data


class TestCSVParsing:
    """Test CSV parsing with different mapping profiles."""

    def test_parse_apollo_csv(self):
        """Test CSV parsing with Apollo format."""
        # This would require a test CSV file
        # For now, test the parsing functions independently
        pass

    def test_normalize_departments(self):
        """Test department string parsing."""
        result = normalize_departments("Sales, Marketing, Engineering")
        assert result == ["Sales", "Marketing", "Engineering"]

        result = normalize_departments("Sales")
        assert result == ["Sales"]

        result = normalize_departments(None)
        assert result is None

        result = normalize_departments("")
        assert result is None

    def test_normalize_skills(self):
        """Test skills string parsing."""
        result = normalize_skills("Python, AWS, Security")
        assert result == ["Python", "AWS", "Security"]

        result = normalize_skills("Python")
        assert result == ["Python"]

        result = normalize_skills(None)
        assert result is None

    def test_combine_name_fields(self):
        """Test name combination with proper null handling."""
        assert combine_name_fields("John", "Doe") == "John Doe"
        assert combine_name_fields("John", None) == "John"
        assert combine_name_fields(None, "Doe") == "Doe"
        assert combine_name_fields(None, None) == "Unknown"

    def test_normalize_location(self):
        """Test location field combination."""
        result = normalize_location("San Francisco", "CA", "USA")
        assert result == "San Francisco, CA, USA"

        result = normalize_location("San Francisco", None, "USA")
        assert result == "San Francisco, USA"

        result = normalize_location(None, None, None)
        assert result is None


class TestValidation:
    """Test validation engine."""

    def test_validation_rejects_invalid_email(self):
        """Test validation catches bad emails."""
        data = {
            'name': 'John Doe',
            'email': 'not-an-email',
            'title': 'Engineer'
        }
        is_valid, errors, _ = validate_row(data, 'prospect')
        assert not is_valid
        assert len(errors) > 0
        assert 'email' in str(errors).lower()

    def test_validation_accepts_valid_email(self):
        """Test validation accepts valid emails."""
        data = {
            'name': 'John Doe',
            'email': 'john.doe@example.com',
            'title': 'Engineer'
        }
        is_valid, errors, normalized = validate_row(data, 'prospect')
        assert is_valid
        assert len(errors) == 0
        assert normalized['email'] == 'john.doe@example.com'

    def test_validation_rejects_invalid_domain(self):
        """Test validation catches bad domains."""
        data = {
            'name': 'Acme Corp',
            'domain': 'not a domain'
        }
        is_valid, errors, _ = validate_row(data, 'company')
        assert not is_valid
        assert len(errors) > 0

    def test_validation_accepts_valid_domain(self):
        """Test validation accepts valid domains."""
        data = {
            'name': 'Acme Corp',
            'domain': 'acme.com'
        }
        is_valid, errors, normalized = validate_row(data, 'company')
        assert is_valid
        assert len(errors) == 0
        assert normalized['domain'] == 'acme.com'

    def test_validation_normalizes_domain(self):
        """Test domain normalization."""
        data = {
            'name': 'Acme Corp',
            'domain': 'https://www.ACME.COM/'
        }
        is_valid, errors, normalized = validate_row(data, 'company')
        assert is_valid
        assert normalized['domain'] == 'acme.com'

    def test_validation_requires_name(self):
        """Test that name is required."""
        data = {
            'email': 'test@example.com'
        }
        is_valid, errors, _ = validate_row(data, 'prospect')
        assert not is_valid
        assert 'name' in str(errors).lower()


class TestDataMerge:
    """Test smart merge logic."""

    def test_merge_fills_blanks(self):
        """Test merge logic preserves existing data and fills blanks."""
        existing = {
            'id': 'test-id',
            'name': 'Acme Corp',
            'domain': 'acme.com',
            'employee_count': None,
            'industry': 'Technology',
            'created_at': '2024-01-01T00:00:00Z',
            'metadata': {}
        }
        new_data = {
            'name': 'Acme Corp',
            'domain': 'acme.com',
            'employee_count': 500,
            'industry': 'Software'
        }

        merged = merge_company_data(existing, new_data)

        # Existing data preserved
        assert merged['name'] == 'Acme Corp'
        assert merged['industry'] == 'Technology'  # Not overwritten

        # Blank filled
        assert merged['employee_count'] == 500

        # Metadata updated
        assert 'last_merge' in merged['metadata']
        assert 'employee_count' in merged['metadata']['last_merge']['fields_updated']

    def test_merge_preserves_existing(self):
        """Test merge doesn't overwrite existing data."""
        existing = {
            'id': 'test-id',
            'name': 'Acme Corp',
            'domain': 'acme.com',
            'employee_count': 500,
            'industry': 'Technology',
            'created_at': '2024-01-01T00:00:00Z',
            'metadata': {}
        }
        new_data = {
            'name': 'Acme Corp',
            'domain': 'acme.com',
            'employee_count': 600,  # Different value
            'industry': 'Software'  # Different value
        }

        merged = merge_company_data(existing, new_data)

        # All existing values preserved
        assert merged['employee_count'] == 500
        assert merged['industry'] == 'Technology'

        # No fields updated
        assert merged['metadata']['last_merge']['fields_updated'] == []

    def test_merge_handles_arrays(self):
        """Test array merging for departments."""
        existing = {
            'id': 'test-id',
            'name': 'John Doe',
            'email': 'john@example.com',
            'departments': ['Engineering'],
            'company_id': 'company-id',
            'created_at': '2024-01-01T00:00:00Z',
            'metadata': {}
        }
        new_data = {
            'name': 'John Doe',
            'email': 'john@example.com',
            'departments': ['Engineering', 'Security']
        }

        merged = merge_prospect_data(existing, new_data)

        # Arrays merged and deduplicated
        assert set(merged['departments']) == {'Engineering', 'Security'}

    def test_merge_protects_critical_fields(self):
        """Test that critical fields are never overwritten."""
        existing = {
            'id': 'original-id',
            'name': 'Acme Corp',
            'domain': 'acme.com',
            'created_at': '2024-01-01T00:00:00Z',
            'source_of_truth': 'manual',
            'metadata': {}
        }
        new_data = {
            'id': 'malicious-id',
            'name': 'Acme Corp',
            'domain': 'acme.com',
            'created_at': '2024-12-01T00:00:00Z',
            'source_of_truth': 'csv_upload'
        }

        merged = merge_company_data(existing, new_data)

        # Protected fields never change
        assert merged['id'] == 'original-id'
        assert merged['created_at'] == '2024-01-01T00:00:00Z'
        assert merged['source_of_truth'] == 'manual'


class TestUploadIntegration:
    """Integration tests for full upload workflow."""

    def test_dry_run_no_database_changes(self):
        """Test dry-run mode doesn't modify database."""
        # Would require database mock or test instance
        pass

    def test_upload_links_prospect_to_company(self):
        """Test prospect correctly linked to company via company_id."""
        # Would require database mock or test instance
        pass

    def test_upload_handles_duplicates(self):
        """Test uploading same CSV twice uses merge logic."""
        # Would require database mock or test instance
        pass


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
