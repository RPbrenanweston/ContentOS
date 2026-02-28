"""
CSV mapping profiles and parsing utilities.

Maps CSV column names to database field names for different data sources
(Apollo exports, candidate CSVs, etc.).
"""

import pandas as pd
from typing import Dict, List, Optional, Any
import re


class ApolloMappingProfile:
    """Field mapping for Apollo contact exports."""

    PROSPECT_FIELDS = {
        'First Name': 'name_first',
        'Last Name': 'name_last',
        'Email': 'email',
        'Phone': 'phone',
        'Title': 'title',
        'Seniority': 'seniority',
        'Departments': 'departments',
        'LinkedIn URL': 'linkedin_url',
        'City': 'location_city',
        'State': 'location_state',
        'Country': 'location_country'
    }

    COMPANY_FIELDS = {
        'Company Name': 'name',
        'Company Domain': 'domain',
        'Industry': 'industry',
        'Employee Count': 'employee_count',
        'Funding': 'funding_stage',
        'Total Funding': 'total_funding',
        'Revenue Range': 'revenue_range',
        'Company HQ City': 'headquarters_location'
    }


class CandidateMappingProfile:
    """Field mapping for candidate/talent CSVs."""

    CANDIDATE_FIELDS = {
        'Name': 'name',
        'Email': 'email',
        'Phone': 'phone',
        'Current Title': 'current_title',
        'Current Company': 'current_company',
        'Skills': 'skills',
        'Years Experience': 'years_experience',
        'Compensation Expectation': 'compensation_expectation',
        'Availability': 'availability',
        'LinkedIn URL': 'linkedin_url',
        'Resume URL': 'resume_url',
        'Notes': 'recruiter_notes'
    }


def normalize_departments(dept_string: Optional[str]) -> Optional[List[str]]:
    """
    Convert 'Sales, Marketing' → ['Sales', 'Marketing'].

    Args:
        dept_string: Comma-separated department string

    Returns:
        List of department names, or None if empty
    """
    if not dept_string or pd.isna(dept_string):
        return None

    # Split by comma, strip whitespace, filter empty strings
    departments = [d.strip() for d in str(dept_string).split(',')]
    departments = [d for d in departments if d]

    return departments if departments else None


def normalize_skills(skills_string: Optional[str]) -> Optional[List[str]]:
    """
    Convert 'Python, AWS, Security' → ['Python', 'AWS', 'Security'].

    Args:
        skills_string: Comma-separated skills string

    Returns:
        List of skill names, or None if empty
    """
    if not skills_string or pd.isna(skills_string):
        return None

    # Split by comma, strip whitespace, filter empty strings
    skills = [s.strip() for s in str(skills_string).split(',')]
    skills = [s for s in skills if s]

    return skills if skills else None


def combine_name_fields(first: Optional[str], last: Optional[str]) -> str:
    """
    Combine first/last name with proper handling of nulls.

    Args:
        first: First name
        last: Last name

    Returns:
        Combined full name
    """
    parts = []

    if first and not pd.isna(first):
        parts.append(str(first).strip())

    if last and not pd.isna(last):
        parts.append(str(last).strip())

    if not parts:
        return "Unknown"

    return " ".join(parts)


def normalize_location(city: Optional[str], state: Optional[str], country: Optional[str]) -> Optional[str]:
    """
    Combine location fields into single string.

    Args:
        city: City name
        state: State/province
        country: Country name

    Returns:
        Combined location string (e.g., "San Francisco, CA, USA")
    """
    parts = []

    if city and not pd.isna(city):
        parts.append(str(city).strip())

    if state and not pd.isna(state):
        parts.append(str(state).strip())

    if country and not pd.isna(country):
        parts.append(str(country).strip())

    return ", ".join(parts) if parts else None


def parse_csv(filepath: str, mapping_profile: str = 'apollo') -> List[Dict[str, Any]]:
    """
    Load CSV and apply field mapping.

    Args:
        filepath: Path to CSV file
        mapping_profile: Which mapping profile to use ('apollo' or 'candidate')

    Returns:
        List of dictionaries with mapped field names

    Raises:
        ValueError: If mapping profile is unknown
        FileNotFoundError: If CSV file doesn't exist
    """
    # Read CSV with pandas
    try:
        df = pd.read_csv(filepath)
    except FileNotFoundError:
        raise FileNotFoundError(f"CSV file not found: {filepath}")
    except Exception as e:
        raise ValueError(f"Error reading CSV: {e}")

    # Select mapping profile
    if mapping_profile == 'apollo':
        return parse_apollo_csv(df)
    elif mapping_profile == 'candidate':
        return parse_candidate_csv(df)
    else:
        raise ValueError(f"Unknown mapping profile: {mapping_profile}")


def parse_apollo_csv(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Parse Apollo export format and split into company + prospect data.

    Args:
        df: DataFrame with Apollo CSV columns

    Returns:
        List of dicts with 'company_data' and 'prospect_data' keys
    """
    rows = []

    for _, row in df.iterrows():
        # Extract prospect data
        prospect_data = {}
        for csv_col, db_field in ApolloMappingProfile.PROSPECT_FIELDS.items():
            if csv_col in df.columns:
                value = row.get(csv_col)

                # Handle special fields
                if db_field == 'departments':
                    value = normalize_departments(value)
                elif db_field in ['name_first', 'name_last']:
                    # Store temporarily for combination
                    prospect_data[db_field] = value if not pd.isna(value) else None
                elif not pd.isna(value):
                    prospect_data[db_field] = value

        # Combine first/last name
        name = combine_name_fields(
            prospect_data.pop('name_first', None),
            prospect_data.pop('name_last', None)
        )
        prospect_data['name'] = name

        # Combine location fields
        location = normalize_location(
            prospect_data.pop('location_city', None),
            prospect_data.pop('location_state', None),
            prospect_data.pop('location_country', None)
        )
        if location:
            prospect_data['location'] = location

        # Extract company data
        company_data = {}
        for csv_col, db_field in ApolloMappingProfile.COMPANY_FIELDS.items():
            if csv_col in df.columns:
                value = row.get(csv_col)

                # Handle special conversions
                if db_field == 'employee_count' and not pd.isna(value):
                    # Try to convert to integer
                    try:
                        company_data[db_field] = int(value)
                    except (ValueError, TypeError):
                        # Handle ranges like "50-100"
                        match = re.search(r'(\d+)', str(value))
                        if match:
                            company_data[db_field] = int(match.group(1))
                elif not pd.isna(value):
                    company_data[db_field] = value

        rows.append({
            'company_data': company_data,
            'prospect_data': prospect_data
        })

    return rows


def parse_candidate_csv(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Parse candidate/talent CSV format.

    Args:
        df: DataFrame with candidate CSV columns

    Returns:
        List of dicts with 'candidate_data' key
    """
    rows = []

    for _, row in df.iterrows():
        candidate_data = {}

        for csv_col, db_field in CandidateMappingProfile.CANDIDATE_FIELDS.items():
            if csv_col in df.columns:
                value = row.get(csv_col)

                # Handle special fields
                if db_field == 'skills':
                    value = normalize_skills(value)
                elif db_field == 'years_experience' and not pd.isna(value):
                    try:
                        value = int(value)
                    except (ValueError, TypeError):
                        value = None
                elif pd.isna(value):
                    continue

                if value is not None:
                    candidate_data[db_field] = value

        rows.append({
            'candidate_data': candidate_data
        })

    return rows
