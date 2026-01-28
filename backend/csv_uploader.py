"""
CSV uploader with Supabase integration and CLI interface.

Handles uploading Apollo exports and candidate CSVs to Supabase,
with smart merge logic and comprehensive error handling.
"""

import typer
from supabase import create_client, Client
from pathlib import Path
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import os
from dotenv import load_dotenv

from csv_mapper import parse_csv
from validation import validate_csv_batch, validate_row
from data_merger import merge_company_data, merge_prospect_data, merge_candidate_data

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = typer.Typer()


class CSVUploader:
    """Handles CSV uploads to Supabase with validation and merge logic."""

    def __init__(self, supabase_client: Client):
        self.client = supabase_client
        self.logger = logging.getLogger(__name__)

    def upload_apollo_csv(self, filepath: Path, dry_run: bool = False) -> Dict[str, Any]:
        """
        Upload Apollo contact export CSV.

        Main upload flow:
        1. Parse CSV with Apollo mapping
        2. Validate all rows
        3. For each row:
           a. Extract company data
           b. Upsert company (merge if exists)
           c. Extract prospect data
           d. Link prospect to company
           e. Upsert prospect (merge if exists)
        4. Track source (CSV filename, timestamp)
        5. Return upload summary

        Args:
            filepath: Path to Apollo CSV file
            dry_run: If True, validate only without database changes

        Returns:
            Upload summary with counts and errors
        """
        self.logger.info(f"Processing Apollo CSV: {filepath}")

        # Parse CSV
        try:
            rows = parse_csv(str(filepath), mapping_profile='apollo')
        except Exception as e:
            self.logger.error(f"CSV parsing failed: {e}")
            return {'error': str(e), 'stage': 'parsing'}

        self.logger.info(f"Parsed {len(rows)} rows from CSV")

        if dry_run:
            return self._dry_run_report(rows, 'apollo')

        # Upload
        uploaded_companies = []
        uploaded_prospects = []
        failed_rows = []

        for idx, row in enumerate(rows, start=1):
            try:
                # Validate company data
                is_valid, errors, normalized_company = validate_row(
                    row['company_data'], 'company'
                )
                if not is_valid:
                    raise ValueError(f"Company validation failed: {', '.join(errors)}")

                # Validate prospect data
                is_valid, errors, normalized_prospect = validate_row(
                    row['prospect_data'], 'prospect'
                )
                if not is_valid:
                    raise ValueError(f"Prospect validation failed: {', '.join(errors)}")

                # Upsert company
                company = self._upsert_company(normalized_company)
                uploaded_companies.append(company['id'])

                # Upsert prospect
                prospect = self._upsert_prospect(normalized_prospect, company['id'])
                uploaded_prospects.append(prospect['id'])

                self.logger.debug(f"Row {idx}: Company {company['id']}, Prospect {prospect['id']}")

            except Exception as e:
                self.logger.error(f"Row {idx} failed: {e}")
                failed_rows.append({
                    'row': idx,
                    'error': str(e),
                    'company': row['company_data'].get('name', 'Unknown'),
                    'prospect': row['prospect_data'].get('name', 'Unknown')
                })

        return {
            'success': True,
            'companies_processed': len(set(uploaded_companies)),  # Deduplicate
            'prospects_processed': len(uploaded_prospects),
            'failed_rows': failed_rows,
            'source': filepath.name,
            'timestamp': datetime.now().isoformat()
        }

    def upload_candidate_csv(self, filepath: Path, dry_run: bool = False) -> Dict[str, Any]:
        """
        Upload candidate/talent CSV (independent table).

        Args:
            filepath: Path to candidate CSV file
            dry_run: If True, validate only without database changes

        Returns:
            Upload summary with counts and errors
        """
        self.logger.info(f"Processing Candidate CSV: {filepath}")

        # Parse CSV
        try:
            rows = parse_csv(str(filepath), mapping_profile='candidate')
        except Exception as e:
            self.logger.error(f"CSV parsing failed: {e}")
            return {'error': str(e), 'stage': 'parsing'}

        self.logger.info(f"Parsed {len(rows)} candidates from CSV")

        if dry_run:
            return self._dry_run_report(rows, 'candidate')

        # Upload
        uploaded_candidates = []
        failed_rows = []

        for idx, row in enumerate(rows, start=1):
            try:
                # Validate candidate data
                is_valid, errors, normalized_candidate = validate_row(
                    row['candidate_data'], 'candidate'
                )
                if not is_valid:
                    raise ValueError(f"Candidate validation failed: {', '.join(errors)}")

                # Upsert candidate
                candidate = self._upsert_candidate(normalized_candidate)
                uploaded_candidates.append(candidate['id'])

                self.logger.debug(f"Row {idx}: Candidate {candidate['id']}")

            except Exception as e:
                self.logger.error(f"Row {idx} failed: {e}")
                failed_rows.append({
                    'row': idx,
                    'error': str(e),
                    'candidate': row['candidate_data'].get('name', 'Unknown')
                })

        return {
            'success': True,
            'candidates_processed': len(uploaded_candidates),
            'failed_rows': failed_rows,
            'source': filepath.name,
            'timestamp': datetime.now().isoformat()
        }

    def _upsert_company(self, company_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Upsert company with merge logic.

        Checks if company exists by domain, merges if exists, inserts if new.

        Args:
            company_data: Validated company data

        Returns:
            Company record (existing or newly created)
        """
        domain = company_data['domain']

        # Check if company exists
        result = self.client.table('companies').select('*').eq('domain', domain).execute()

        if result.data and len(result.data) > 0:
            # Company exists - merge
            existing = result.data[0]
            self.logger.debug(f"Company exists: {existing['name']} ({domain})")

            # Add source tracking to new data
            company_data['source_of_truth'] = 'csv_upload'

            # Merge
            merged = merge_company_data(existing, company_data)

            # Update in database
            update_result = self.client.table('companies').update(merged).eq('id', existing['id']).execute()

            return update_result.data[0]
        else:
            # Company doesn't exist - insert
            self.logger.debug(f"Creating new company: {company_data['name']} ({domain})")

            company_data['source_of_truth'] = 'csv_upload'
            company_data['confidence_level'] = 80  # CSV uploads are high confidence

            insert_result = self.client.table('companies').insert(company_data).execute()

            return insert_result.data[0]

    def _upsert_prospect(self, prospect_data: Dict[str, Any], company_id: str) -> Dict[str, Any]:
        """
        Upsert prospect with company linkage.

        Checks if prospect exists by email + company_id, merges if exists, inserts if new.

        Args:
            prospect_data: Validated prospect data
            company_id: UUID of linked company

        Returns:
            Prospect record (existing or newly created)
        """
        # Link to company
        prospect_data['company_id'] = company_id

        # Check if prospect exists
        # Use email + company_id for uniqueness (same person can be at multiple companies)
        email = prospect_data.get('email')

        if email:
            result = self.client.table('prospects').select('*').eq('email', email).eq('company_id', company_id).execute()

            if result.data and len(result.data) > 0:
                # Prospect exists - merge
                existing = result.data[0]
                self.logger.debug(f"Prospect exists: {existing['name']} ({email})")

                prospect_data['source_of_truth'] = 'csv_upload'

                merged = merge_prospect_data(existing, prospect_data)

                update_result = self.client.table('prospects').update(merged).eq('id', existing['id']).execute()

                return update_result.data[0]

        # Prospect doesn't exist (or no email) - insert
        self.logger.debug(f"Creating new prospect: {prospect_data['name']}")

        prospect_data['source_of_truth'] = 'csv_upload'
        prospect_data['confidence_level'] = 80

        insert_result = self.client.table('prospects').insert(prospect_data).execute()

        return insert_result.data[0]

    def _upsert_candidate(self, candidate_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Upsert candidate.

        Checks if candidate exists by email, merges if exists, inserts if new.

        Args:
            candidate_data: Validated candidate data

        Returns:
            Candidate record (existing or newly created)
        """
        email = candidate_data.get('email')

        if email:
            result = self.client.table('candidates').select('*').eq('email', email).execute()

            if result.data and len(result.data) > 0:
                # Candidate exists - merge
                existing = result.data[0]
                self.logger.debug(f"Candidate exists: {existing['name']} ({email})")

                candidate_data['source_of_truth'] = 'csv_upload'

                merged = merge_candidate_data(existing, candidate_data)

                update_result = self.client.table('candidates').update(merged).eq('id', existing['id']).execute()

                return update_result.data[0]

        # Candidate doesn't exist (or no email) - insert
        self.logger.debug(f"Creating new candidate: {candidate_data['name']}")

        candidate_data['source_of_truth'] = 'csv_upload'
        candidate_data['placement_status'] = 'active'

        insert_result = self.client.table('candidates').insert(candidate_data).execute()

        return insert_result.data[0]

    def _dry_run_report(self, rows: List[Dict[str, Any]], upload_type: str) -> Dict[str, Any]:
        """
        Generate dry-run validation report without database changes.

        Args:
            rows: Parsed CSV rows
            upload_type: 'apollo' or 'candidate'

        Returns:
            Validation report
        """
        self.logger.info("DRY RUN MODE - No database changes will be made")

        if upload_type == 'apollo':
            # Validate companies
            company_rows = [r['company_data'] for r in rows]
            company_valid, company_errors_count, company_errors = validate_csv_batch(company_rows, 'company')

            # Validate prospects
            prospect_rows = [r['prospect_data'] for r in rows]
            prospect_valid, prospect_errors_count, prospect_errors = validate_csv_batch(prospect_rows, 'prospect')

            return {
                'dry_run': True,
                'total_rows': len(rows),
                'companies': {
                    'valid': company_valid,
                    'errors': company_errors_count,
                    'error_details': company_errors
                },
                'prospects': {
                    'valid': prospect_valid,
                    'errors': prospect_errors_count,
                    'error_details': prospect_errors
                }
            }
        else:
            # Validate candidates
            candidate_rows = [r['candidate_data'] for r in rows]
            candidate_valid, candidate_errors_count, candidate_errors = validate_csv_batch(candidate_rows, 'candidate')

            return {
                'dry_run': True,
                'total_rows': len(rows),
                'candidates': {
                    'valid': candidate_valid,
                    'errors': candidate_errors_count,
                    'error_details': candidate_errors
                }
            }


@app.command()
def upload(
    filepath: Path,
    upload_type: str = typer.Option('apollo', help="Type of CSV: 'apollo' or 'candidate'"),
    dry_run: bool = typer.Option(False, '--dry-run', help="Validate only, don't modify database")
):
    """
    Upload CSV to Supabase.

    Examples:
        python csv_uploader.py upload sample_data/apollo.csv --upload-type=apollo --dry-run
        python csv_uploader.py upload sample_data/apollo.csv --upload-type=apollo
        python csv_uploader.py upload sample_data/candidates.csv --upload-type=candidate
    """
    # Check file exists
    if not filepath.exists():
        typer.echo(f"Error: File not found: {filepath}")
        raise typer.Exit(1)

    # Get Supabase credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_ANON_KEY')

    if not supabase_url or not supabase_key:
        typer.echo("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        raise typer.Exit(1)

    # Create Supabase client
    supabase_client = create_client(supabase_url, supabase_key)

    # Create uploader
    uploader = CSVUploader(supabase_client)

    # Upload
    if upload_type == 'apollo':
        result = uploader.upload_apollo_csv(filepath, dry_run)
    elif upload_type == 'candidate':
        result = uploader.upload_candidate_csv(filepath, dry_run)
    else:
        typer.echo(f"Error: Unknown upload type: {upload_type}")
        typer.echo("Valid types: apollo, candidate")
        raise typer.Exit(1)

    # Print summary
    if 'error' in result:
        typer.echo(f"\n❌ Upload failed at {result['stage']}: {result['error']}")
        raise typer.Exit(1)

    if result.get('dry_run'):
        typer.echo("\n🔍 DRY RUN - Validation Results:")
        typer.echo(f"Total rows: {result['total_rows']}")

        if 'companies' in result:
            typer.echo(f"\nCompanies: {result['companies']['valid']} valid, {result['companies']['errors']} errors")
            if result['companies']['errors'] > 0:
                typer.echo("Company errors:")
                for error in result['companies']['error_details'][:5]:  # Show first 5
                    typer.echo(f"  Row {error['row']}: {error['errors']}")

            typer.echo(f"\nProspects: {result['prospects']['valid']} valid, {result['prospects']['errors']} errors")
            if result['prospects']['errors'] > 0:
                typer.echo("Prospect errors:")
                for error in result['prospects']['error_details'][:5]:
                    typer.echo(f"  Row {error['row']}: {error['errors']}")
        else:
            typer.echo(f"\nCandidates: {result['candidates']['valid']} valid, {result['candidates']['errors']} errors")
            if result['candidates']['errors'] > 0:
                typer.echo("Candidate errors:")
                for error in result['candidates']['error_details'][:5]:
                    typer.echo(f"  Row {error['row']}: {error['errors']}")
    else:
        typer.echo("\n✅ Upload complete!")
        typer.echo(f"Source: {result['source']}")
        typer.echo(f"Timestamp: {result['timestamp']}")

        if 'companies_processed' in result:
            typer.echo(f"\nCompanies processed: {result['companies_processed']}")
            typer.echo(f"Prospects processed: {result['prospects_processed']}")
        else:
            typer.echo(f"\nCandidates processed: {result['candidates_processed']}")

        if result['failed_rows']:
            typer.echo(f"\n⚠️  {len(result['failed_rows'])} rows failed:")
            for failure in result['failed_rows'][:5]:
                typer.echo(f"  Row {failure['row']}: {failure['error']}")


if __name__ == '__main__':
    app()
