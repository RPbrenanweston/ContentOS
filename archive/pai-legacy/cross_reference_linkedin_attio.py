#!/usr/bin/env python3
"""
Cross-reference LinkedIn connections with Attio CRM people records
"""
import json
import re
from difflib import SequenceMatcher
from typing import List, Dict, Any, Optional

def normalize_name(name: str) -> str:
    """Normalize a name for comparison"""
    if not name:
        return ""
    # Remove special characters, extra spaces, and convert to lowercase
    name = re.sub(r'[^\w\s]', '', name.lower())
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def normalize_company(company: str) -> str:
    """Normalize company name for comparison"""
    if not company:
        return ""
    # Remove common suffixes and special characters
    company = company.lower()
    for suffix in [' inc', ' llc', ' ltd', ' limited', ' corp', ' corporation', ' gmbh']:
        company = company.replace(suffix, '')
    company = re.sub(r'[^\w\s]', '', company)
    company = re.sub(r'\s+', ' ', company).strip()
    return company

def fuzzy_match_name(name1: str, name2: str, threshold: float = 0.85) -> bool:
    """Check if two names match with fuzzy matching"""
    if not name1 or not name2:
        return False
    
    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)
    
    if norm1 == norm2:
        return True
    
    # Calculate similarity ratio
    ratio = SequenceMatcher(None, norm1, norm2).ratio()
    return ratio >= threshold

def extract_attio_person_data(record: Dict[str, Any]) -> Dict[str, Any]:
    """Extract relevant fields from Attio person record"""
    values = record.get('values', {})
    
    # Extract name
    name_data = values.get('name', [{}])[0] if values.get('name') else {}
    full_name = name_data.get('full_name', '')
    first_name = name_data.get('first_name', '')
    last_name = name_data.get('last_name', '')
    
    # Extract email
    email_data = values.get('email_addresses', [{}])[0] if values.get('email_addresses') else {}
    email = email_data.get('email_address', '')
    
    # Extract company - this is a reference, we'll just note it exists
    company_data = values.get('company', [{}])[0] if values.get('company') else {}
    has_company = bool(company_data.get('target_record_id'))
    
    # Extract job title
    job_title_data = values.get('job_title', [{}])[0] if values.get('job_title') else {}
    job_title = job_title_data.get('value', '')
    
    return {
        'record_id': record['id']['record_id'],
        'full_name': full_name,
        'first_name': first_name,
        'last_name': last_name,
        'email': email,
        'has_company': has_company,
        'job_title': job_title
    }

def find_match(linkedin_person: Dict[str, Any], attio_people: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Find matching Attio record for a LinkedIn connection"""
    linkedin_name = linkedin_person.get('name', '')
    linkedin_company = normalize_company(linkedin_person.get('company', ''))
    
    for attio_person in attio_people:
        attio_name = attio_person.get('full_name', '')
        
        # Primary match: fuzzy name matching
        if fuzzy_match_name(linkedin_name, attio_name):
            return attio_person
        
        # Also try matching first + last name separately
        if attio_person.get('first_name') and attio_person.get('last_name'):
            attio_full = f"{attio_person['first_name']} {attio_person['last_name']}"
            if fuzzy_match_name(linkedin_name, attio_full):
                return attio_person
    
    return None

def main():
    print("Starting LinkedIn-Attio cross-reference process...")
    
    # This script expects attio_all_people.json to already exist
    # (created by separate pagination script)
    try:
        with open('/Users/robertpeacock/Desktop/Claude code/attio_all_people.json', 'r') as f:
            attio_raw_data = json.load(f)
            print(f"Loaded {len(attio_raw_data)} raw Attio records")
    except FileNotFoundError:
        print("ERROR: attio_all_people.json not found. Run pagination script first.")
        return
    
    # Extract relevant data from Attio records
    print("Extracting data from Attio records...")
    attio_people = []
    for record in attio_raw_data:
        person_data = extract_attio_person_data(record)
        if person_data['full_name']:  # Only include records with names
            attio_people.append(person_data)
    
    print(f"Extracted {len(attio_people)} Attio people with names")
    
    # Load LinkedIn connections
    print("Loading LinkedIn connections...")
    with open('/Users/robertpeacock/Desktop/Claude code/connections_data.json', 'r') as f:
        linkedin_connections = json.load(f)
    
    print(f"Loaded {len(linkedin_connections)} LinkedIn connections")
    
    # Cross-reference
    print("\nCross-referencing...")
    matched = []
    unmatched = []
    
    for i, linkedin_person in enumerate(linkedin_connections):
        if (i + 1) % 100 == 0:
            print(f"  Processed {i + 1}/{len(linkedin_connections)} connections...")
        
        match = find_match(linkedin_person, attio_people)
        
        if match:
            matched.append({
                'linkedin_data': linkedin_person,
                'attio_record_id': match['record_id'],
                'attio_name': match['full_name'],
                'attio_email': match['email'],
                'attio_job_title': match['job_title']
            })
        else:
            unmatched.append(linkedin_person)
    
    # Save results
    print("\nSaving results...")
    
    with open('/Users/robertpeacock/Desktop/Claude code/matched_connections.json', 'w') as f:
        json.dump(matched, f, indent=2)
    
    with open('/Users/robertpeacock/Desktop/Claude code/unmatched_connections.json', 'w') as f:
        json.dump(unmatched, f, indent=2)
    
    # Create summary report
    print("Creating summary report...")
    
    report_lines = [
        "# LinkedIn-Attio CRM Cross-Reference Analysis",
        "",
        "## Summary Statistics",
        "",
        f"- **Total people in Attio CRM**: {len(attio_people):,}",
        f"- **Total LinkedIn connections**: {len(linkedin_connections):,}",
        f"- **Matches found**: {len(matched):,} ({len(matched)/len(linkedin_connections)*100:.1f}%)",
        f"- **Unmatched connections** (need to be added): {len(unmatched):,} ({len(unmatched)/len(linkedin_connections)*100:.1f}%)",
        "",
        "## Matched Connections",
        "",
        "The following LinkedIn connections were found in your Attio CRM:",
        ""
    ]
    
    # Add matched names (first 100 to keep report manageable)
    for i, match in enumerate(matched[:100], 1):
        linkedin_name = match['linkedin_data']['name']
        attio_name = match['attio_name']
        company = match['linkedin_data'].get('company', 'N/A')
        report_lines.append(f"{i}. **{linkedin_name}** → {attio_name} ({company})")
    
    if len(matched) > 100:
        report_lines.append(f"\n*... and {len(matched) - 100} more matches*")
    
    report_lines.extend([
        "",
        "## Unmatched Connections",
        "",
        "The following LinkedIn connections were NOT found in Attio and should be added:",
        ""
    ])
    
    # Add unmatched names (first 100)
    for i, person in enumerate(unmatched[:100], 1):
        name = person['name']
        company = person.get('company', 'N/A')
        title = person.get('title', 'N/A')
        report_lines.append(f"{i}. **{name}** - {title} at {company}")
    
    if len(unmatched) > 100:
        report_lines.append(f"\n*... and {len(unmatched) - 100} more unmatched connections*")
    
    report_lines.extend([
        "",
        "## Next Steps",
        "",
        "1. Review the matched connections in `matched_connections.json`",
        "2. Review unmatched connections in `unmatched_connections.json`",
        "3. Consider adding unmatched connections to Attio CRM",
        "4. Verify any fuzzy matches that seem incorrect",
        ""
    ])
    
    report_content = '\n'.join(report_lines)
    
    with open('/Users/robertpeacock/Desktop/Claude code/linkedin_crm_analysis.md', 'w') as f:
        f.write(report_content)
    
    print("\n" + "="*60)
    print("COMPLETE!")
    print("="*60)
    print(f"Total Attio people: {len(attio_people):,}")
    print(f"Total LinkedIn connections: {len(linkedin_connections):,}")
    print(f"Matches found: {len(matched):,} ({len(matched)/len(linkedin_connections)*100:.1f}%)")
    print(f"Unmatched: {len(unmatched):,} ({len(unmatched)/len(linkedin_connections)*100:.1f}%)")
    print("\nOutput files created:")
    print("  - matched_connections.json")
    print("  - unmatched_connections.json")
    print("  - linkedin_crm_analysis.md")
    print("="*60)

if __name__ == '__main__':
    main()
