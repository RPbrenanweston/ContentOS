"""
Smart data merger with preserve-existing, fill-blanks logic.

Merge strategy: New data fills blanks, existing data preserved.
Never overwrite existing enrichment data with new CSV uploads.
"""

from datetime import datetime
from typing import Dict, Any, List


def merge_company_data(existing_company: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge company data with preserve-existing strategy.

    Rules:
    - If existing field is NULL and new field has value → use new value
    - If existing field has value and new field has value → keep existing (preserve truth)
    - If both NULL → remain NULL
    - Always update updated_at timestamp
    - Track which fields were updated in metadata

    Args:
        existing_company: Current company record from database
        new_data: New data from CSV upload

    Returns:
        Merged company data
    """
    merged = existing_company.copy()
    updated_fields = []

    # Fields that should never be overwritten
    protected_fields = {'id', 'created_at', 'source_of_truth'}

    for field, new_value in new_data.items():
        if field in protected_fields:
            continue

        existing_value = merged.get(field)

        # Fill blank: if existing is None/null and new has value
        if existing_value is None and new_value is not None:
            merged[field] = new_value
            updated_fields.append(field)

    # Update metadata to track merge
    if 'metadata' not in merged or merged['metadata'] is None:
        merged['metadata'] = {}

    if not isinstance(merged['metadata'], dict):
        merged['metadata'] = {}

    # Initialize merge history if needed
    if 'merge_history' not in merged['metadata']:
        merged['metadata']['merge_history'] = []

    # Record this merge
    merged['metadata']['merge_history'].append({
        'timestamp': datetime.now().isoformat(),
        'fields_updated': updated_fields,
        'source': new_data.get('source_of_truth', 'unknown')
    })

    # Update last_merge pointer for quick access
    merged['metadata']['last_merge'] = {
        'timestamp': datetime.now().isoformat(),
        'fields_updated': updated_fields,
        'source': new_data.get('source_of_truth', 'unknown')
    }

    # Update timestamp
    merged['updated_at'] = datetime.now().isoformat()

    return merged


def merge_prospect_data(existing_prospect: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge prospect data with preserve-existing strategy.

    Special handling for arrays (departments): merge and deduplicate.

    Args:
        existing_prospect: Current prospect record from database
        new_data: New data from CSV upload

    Returns:
        Merged prospect data
    """
    merged = existing_prospect.copy()
    updated_fields = []

    # Protected fields
    protected_fields = {'id', 'created_at', 'source_of_truth', 'company_id'}

    for field, new_value in new_data.items():
        if field in protected_fields:
            continue

        existing_value = merged.get(field)

        # Special handling for departments array
        if field == 'departments':
            if existing_value is None and new_value is not None:
                merged[field] = new_value
                updated_fields.append(field)
            elif existing_value is not None and new_value is not None:
                # Merge arrays and deduplicate
                existing_set = set(existing_value) if existing_value else set()
                new_set = set(new_value) if new_value else set()
                merged_set = existing_set.union(new_set)

                if merged_set != existing_set:
                    merged[field] = list(merged_set)
                    updated_fields.append(field)
        else:
            # Standard fill-blanks logic
            if existing_value is None and new_value is not None:
                merged[field] = new_value
                updated_fields.append(field)

    # Update metadata
    if 'metadata' not in merged or merged['metadata'] is None:
        merged['metadata'] = {}

    if not isinstance(merged['metadata'], dict):
        merged['metadata'] = {}

    if 'merge_history' not in merged['metadata']:
        merged['metadata']['merge_history'] = []

    merged['metadata']['merge_history'].append({
        'timestamp': datetime.now().isoformat(),
        'fields_updated': updated_fields,
        'source': new_data.get('source_of_truth', 'unknown')
    })

    merged['metadata']['last_merge'] = {
        'timestamp': datetime.now().isoformat(),
        'fields_updated': updated_fields,
        'source': new_data.get('source_of_truth', 'unknown')
    }

    merged['updated_at'] = datetime.now().isoformat()

    return merged


def merge_candidate_data(existing_candidate: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge candidate data with preserve-existing strategy.

    Special handling for:
    - skills array: merge and deduplicate
    - interview_history: append, don't overwrite

    Args:
        existing_candidate: Current candidate record from database
        new_data: New data from CSV upload

    Returns:
        Merged candidate data
    """
    merged = existing_candidate.copy()
    updated_fields = []

    # Protected fields
    protected_fields = {'id', 'created_at', 'source_of_truth'}

    for field, new_value in new_data.items():
        if field in protected_fields:
            continue

        existing_value = merged.get(field)

        # Special handling for skills array
        if field == 'skills':
            if existing_value is None and new_value is not None:
                merged[field] = new_value
                updated_fields.append(field)
            elif existing_value is not None and new_value is not None:
                # Merge arrays and deduplicate
                existing_set = set(existing_value) if existing_value else set()
                new_set = set(new_value) if new_value else set()
                merged_set = existing_set.union(new_set)

                if merged_set != existing_set:
                    merged[field] = list(merged_set)
                    updated_fields.append(field)

        # Special handling for interview_history (JSONB field)
        elif field == 'interview_history':
            # Don't overwrite from CSV - interview history should be managed separately
            # CSVs don't typically contain interview history
            continue

        else:
            # Standard fill-blanks logic
            if existing_value is None and new_value is not None:
                merged[field] = new_value
                updated_fields.append(field)

    # Update metadata
    if 'metadata' not in merged or merged['metadata'] is None:
        merged['metadata'] = {}

    if not isinstance(merged['metadata'], dict):
        merged['metadata'] = {}

    if 'merge_history' not in merged['metadata']:
        merged['metadata']['merge_history'] = []

    merged['metadata']['merge_history'].append({
        'timestamp': datetime.now().isoformat(),
        'fields_updated': updated_fields,
        'source': new_data.get('source_of_truth', 'unknown')
    })

    merged['metadata']['last_merge'] = {
        'timestamp': datetime.now().isoformat(),
        'fields_updated': updated_fields,
        'source': new_data.get('source_of_truth', 'unknown')
    }

    merged['updated_at'] = datetime.now().isoformat()

    return merged
