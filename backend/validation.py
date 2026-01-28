"""
Data validation engine for CSV uploads.

Uses Pydantic models to validate company, prospect, and candidate data
before inserting into Supabase.
"""

from pydantic import BaseModel, EmailStr, HttpUrl, field_validator, Field
from typing import Optional, List
import validators
import re


class CompanyData(BaseModel):
    """Validation model for company data."""

    name: str = Field(min_length=1)
    domain: str = Field(min_length=3)
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    funding_stage: Optional[str] = None
    total_funding: Optional[str] = None
    revenue_range: Optional[str] = None
    headquarters_location: Optional[str] = None

    @field_validator('domain')
    @classmethod
    def validate_domain(cls, v):
        """Validate domain format and normalize."""
        if not v:
            raise ValueError('Domain cannot be empty')

        # Remove http://, https://, www. prefixes
        v = v.lower().strip()
        v = re.sub(r'^https?://', '', v)
        v = re.sub(r'^www\.', '', v)
        v = v.rstrip('/')

        # Basic domain validation
        if not validators.domain(v):
            raise ValueError(f'Invalid domain format: {v}')

        return v

    @field_validator('employee_count')
    @classmethod
    def validate_employee_count(cls, v):
        """Ensure employee count is positive."""
        if v is not None and v < 0:
            raise ValueError('Employee count must be positive')
        return v


class ProspectData(BaseModel):
    """Validation model for prospect (decision maker) data."""

    name: str = Field(min_length=1)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    seniority: Optional[str] = None
    departments: Optional[List[str]] = None
    linkedin_url: Optional[str] = None
    location: Optional[str] = None

    @field_validator('linkedin_url')
    @classmethod
    def validate_linkedin_url(cls, v):
        """Validate LinkedIn URL format."""
        if v and v.strip():
            v = v.strip()
            if not v.startswith('http'):
                v = f'https://{v}'
            # Basic URL validation
            if not validators.url(v):
                raise ValueError(f'Invalid LinkedIn URL: {v}')
            return v
        return None

    @field_validator('seniority')
    @classmethod
    def validate_seniority(cls, v):
        """Normalize seniority level."""
        if v:
            v = v.strip()
            # Normalize common variations
            seniority_map = {
                'c-level': 'C-Level',
                'c level': 'C-Level',
                'executive': 'C-Level',
                'vp': 'VP',
                'vice president': 'VP',
                'director': 'Director',
                'manager': 'Manager',
                'senior': 'Senior',
                'junior': 'Junior',
                'entry': 'Entry'
            }
            return seniority_map.get(v.lower(), v)
        return v


class CandidateData(BaseModel):
    """Validation model for candidate (supply-side talent) data."""

    name: str = Field(min_length=1)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    skills: Optional[List[str]] = None
    years_experience: Optional[int] = None
    compensation_expectation: Optional[str] = None
    availability: Optional[str] = None
    linkedin_url: Optional[str] = None
    resume_url: Optional[str] = None
    recruiter_notes: Optional[str] = None

    @field_validator('years_experience')
    @classmethod
    def validate_years_experience(cls, v):
        """Ensure years experience is non-negative."""
        if v is not None and v < 0:
            raise ValueError('Years experience must be non-negative')
        return v

    @field_validator('linkedin_url', 'resume_url')
    @classmethod
    def validate_url(cls, v):
        """Validate URL format."""
        if v and v.strip():
            v = v.strip()
            if not v.startswith('http'):
                v = f'https://{v}'
            if not validators.url(v):
                raise ValueError(f'Invalid URL: {v}')
            return v
        return None

    @field_validator('availability')
    @classmethod
    def validate_availability(cls, v):
        """Normalize availability status."""
        if v:
            v = v.strip().lower()
            availability_map = {
                'immediate': 'immediate',
                'now': 'immediate',
                'asap': 'immediate',
                '2 weeks': '2_weeks',
                'two weeks': '2_weeks',
                '1 month': '1_month',
                'one month': '1_month',
                '2 months': '2_months',
                'two months': '2_months'
            }
            return availability_map.get(v, v)
        return v


def validate_row(row_data: dict, data_type: str = 'prospect') -> tuple[bool, list[str], Optional[dict]]:
    """
    Validate a single row of data.

    Args:
        row_data: Dictionary of field values
        data_type: Type of data ('prospect', 'company', 'candidate')

    Returns:
        Tuple of (is_valid, error_messages, normalized_data)
    """
    errors = []

    try:
        if data_type == 'prospect':
            validated = ProspectData(**row_data)
        elif data_type == 'company':
            validated = CompanyData(**row_data)
        elif data_type == 'candidate':
            validated = CandidateData(**row_data)
        else:
            return False, [f"Unknown data type: {data_type}"], None

        # Convert to dict, excluding None values
        normalized_data = validated.model_dump(exclude_none=True)
        return True, [], normalized_data

    except Exception as e:
        # Extract validation errors from Pydantic
        if hasattr(e, 'errors'):
            for error in e.errors():
                field = '.'.join(str(loc) for loc in error['loc'])
                msg = error['msg']
                errors.append(f"{field}: {msg}")
        else:
            errors.append(str(e))

        return False, errors, None


def validate_csv_batch(rows: List[dict], data_type: str = 'prospect') -> tuple[int, int, List[dict]]:
    """
    Validate entire CSV batch.

    Args:
        rows: List of row dictionaries
        data_type: Type of data being validated

    Returns:
        Tuple of (valid_count, error_count, error_details)
        error_details is list of {'row': idx, 'errors': [error_messages]}
    """
    valid_count = 0
    error_count = 0
    error_details = []

    for idx, row in enumerate(rows):
        is_valid, errors, _ = validate_row(row, data_type)

        if is_valid:
            valid_count += 1
        else:
            error_count += 1
            error_details.append({
                'row': idx + 1,  # 1-indexed for user clarity
                'errors': errors
            })

    return valid_count, error_count, error_details
