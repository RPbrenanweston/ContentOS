# CSV Upload Guide

Complete guide to uploading enrichment data via CSV into the AI Security Recruitment platform.

## Overview

The CSV upload system enables manual enrichment of company and prospect data without API costs. It supports two primary formats:

1. **Apollo Contact Exports** - Sales intelligence data (companies + decision makers)
2. **Candidate CSVs** - Supply-side talent data for matching

### Key Features

- **Smart Merge Logic** - Preserves existing data, fills blanks with new data
- **Multi-table Distribution** - Single CSV row creates/updates both company and prospect records
- **Validation Engine** - Catches data quality issues before database changes
- **Source Tracking** - Records upload timestamp, filename, and fields updated
- **Dry-run Mode** - Validate CSV without making database changes
- **Comprehensive Error Handling** - Partial success support with detailed error reporting

## Supported Formats

### Apollo Contact Export Format

Export contacts from Apollo.io with these required columns:

| CSV Column | Database Field | Table | Notes |
|------------|----------------|-------|-------|
| First Name | name (combined) | prospects | Combined with Last Name |
| Last Name | name (combined) | prospects | Combined with First Name |
| Email | email | prospects | Validated format |
| Phone | phone | prospects | Optional |
| Title | title | prospects | Job title |
| Seniority | seniority | prospects | Normalized (C-Level, VP, Director, etc.) |
| Departments | departments | prospects | Comma-separated → array |
| LinkedIn URL | linkedin_url | prospects | Validated URL format |
| City | location | prospects | Combined with State, Country |
| State | location | prospects | Combined with City, Country |
| Country | location | prospects | Combined with City, State |
| Company Name | name | companies | Required |
| Company Domain | domain | companies | Required, unique identifier |
| Industry | industry | companies | Optional |
| Employee Count | employee_count | companies | Integer or range (e.g., "50-100") |
| Funding | funding_stage | companies | Seed, Series A/B/C, Public, etc. |
| Total Funding | total_funding | companies | Text (e.g., "$45M") |
| Revenue Range | revenue_range | companies | Text (e.g., "$10M-$50M") |
| Company HQ City | headquarters_location | companies | Company HQ location |

**Example:** See `sample_data/apollo_export_example.csv`

### Candidate Format

For supply-side talent uploads:

| CSV Column | Database Field | Notes |
|------------|----------------|-------|
| Name | name | Required |
| Email | email | Validated format, used for deduplication |
| Phone | phone | Optional |
| Current Title | current_title | Current job title |
| Current Company | current_company | Current employer |
| Skills | skills | Comma-separated → array |
| Years Experience | years_experience | Integer |
| Compensation Expectation | compensation_expectation | Text (e.g., "$150K-$180K") |
| Availability | availability | immediate, 2_weeks, 1_month, etc. |
| LinkedIn URL | linkedin_url | Validated URL |
| Resume URL | resume_url | Link to resume PDF |
| Notes | recruiter_notes | Internal recruiter notes |

## Data Merge Strategy

The system uses **preserve-existing, fill-blanks** logic:

### Rules

1. **If existing field is NULL and new field has value** → Use new value
2. **If existing field has value and new field has value** → Keep existing (preserve truth)
3. **If both NULL** → Remain NULL
4. **Protected fields never change** → `id`, `created_at`, `source_of_truth`

### Special Cases

#### Array Fields (departments, skills)

Arrays are **merged and deduplicated**:

```python
existing_departments = ['Engineering']
new_departments = ['Engineering', 'Security']
merged_departments = ['Engineering', 'Security']  # Union
```

#### Interview History (candidates)

Interview history is **append-only** and not updated via CSV uploads (managed separately).

### Metadata Tracking

Every merge updates metadata to track:

- Timestamp of merge
- Which fields were updated
- Source of new data (e.g., 'csv_upload')

```json
{
  "metadata": {
    "last_merge": {
      "timestamp": "2024-01-28T10:30:00Z",
      "fields_updated": ["employee_count", "total_funding"],
      "source": "csv_upload"
    },
    "merge_history": [
      {
        "timestamp": "2024-01-20T08:00:00Z",
        "fields_updated": ["industry"],
        "source": "csv_upload"
      },
      {
        "timestamp": "2024-01-28T10:30:00Z",
        "fields_updated": ["employee_count", "total_funding"],
        "source": "csv_upload"
      }
    ]
  }
}
```

## CLI Usage

### Installation

```bash
cd backend
pip install -r requirements.txt
```

### Environment Setup

Create `.env` file with Supabase credentials:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
# Or use anon key for testing:
# SUPABASE_ANON_KEY=your-anon-key-here
```

### Commands

#### Dry Run (Validate Only)

Test CSV format and validation without making database changes:

```bash
python backend/csv_uploader.py upload sample_data/apollo_export_example.csv \
  --upload-type=apollo \
  --dry-run
```

Output:
```
🔍 DRY RUN - Validation Results:
Total rows: 10

Companies: 10 valid, 0 errors
Prospects: 10 valid, 0 errors
```

#### Upload Apollo CSV

```bash
python backend/csv_uploader.py upload sample_data/apollo_export_example.csv \
  --upload-type=apollo
```

Output:
```
✅ Upload complete!
Source: apollo_export_example.csv
Timestamp: 2024-01-28T10:30:00Z

Companies processed: 6
Prospects processed: 10
```

#### Upload Candidate CSV

```bash
python backend/csv_uploader.py upload sample_data/candidates.csv \
  --upload-type=candidate
```

### Error Handling

If validation errors occur, the system provides detailed feedback:

```
⚠️  2 rows failed:
  Row 5: email: value is not a valid email address
  Row 8: domain: Invalid domain format: not-a-domain
```

**Partial Success:** Valid rows are uploaded even if some rows fail. Failed rows are logged for manual review.

## Validation Rules

### Company Data

- **name** - Required, min 1 character
- **domain** - Required, valid domain format (e.g., `acme.com`)
  - Auto-normalized: `https://www.ACME.COM/` → `acme.com`
  - No http://, www., or trailing slashes
- **employee_count** - Must be positive integer
- **industry** - Optional text
- **funding_stage** - Optional text
- **headquarters_location** - Optional text

### Prospect Data

- **name** - Required, min 1 character
- **email** - Valid email format (RFC 5322)
- **phone** - Optional text (no format enforcement)
- **title** - Optional text
- **seniority** - Auto-normalized to standard levels
  - `c-level`, `executive` → `C-Level`
  - `vp`, `vice president` → `VP`
  - `director` → `Director`
- **departments** - Array of strings
- **linkedin_url** - Valid URL format
- **location** - Combined from city/state/country

### Candidate Data

- **name** - Required
- **email** - Valid email format
- **skills** - Array of strings
- **years_experience** - Non-negative integer
- **availability** - Auto-normalized
  - `immediate`, `now`, `asap` → `immediate`
  - `2 weeks` → `2_weeks`
  - `1 month` → `1_month`
- **linkedin_url**, **resume_url** - Valid URL format

## Workflow: Uploading 10 Pilot Companies

### Step 1: Export from Apollo

1. In Apollo.io, select 10 target companies
2. Export contacts with all available fields
3. Ensure export includes:
   - Decision makers (CISOs, CTOs, VPs Engineering, Hiring Managers)
   - Company enrichment data (funding, employee count, revenue)

### Step 2: Validate Export

Run dry-run to check data quality:

```bash
python backend/csv_uploader.py upload apollo_export.csv \
  --upload-type=apollo \
  --dry-run
```

Review validation results. If errors, fix in CSV and re-run.

### Step 3: Upload

```bash
python backend/csv_uploader.py upload apollo_export.csv \
  --upload-type=apollo
```

### Step 4: Verify

Check Supabase tables:

```sql
-- Check companies
SELECT name, domain, employee_count, funding_stage, confidence_level
FROM companies
WHERE source_of_truth = 'csv_upload'
ORDER BY created_at DESC;

-- Check prospects
SELECT p.name, p.email, p.title, p.seniority, c.name as company_name
FROM prospects p
JOIN companies c ON p.company_id = c.id
WHERE p.source_of_truth = 'csv_upload'
ORDER BY p.created_at DESC;
```

### Step 5: Iterative Enrichment

As you gather more data:

1. Add new columns to CSV (e.g., recent funding round, headcount growth)
2. Re-upload same companies
3. Merge logic will fill blanks without overwriting existing data

## Troubleshooting

### Common Issues

#### "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set"

**Solution:** Create `.env` file in backend directory with credentials.

#### "Invalid domain format"

**Solution:** Ensure domains are in format `example.com` (no http://, no www., no paths).

#### "value is not a valid email address"

**Solution:** Check email format. Common issues: missing `@`, spaces, invalid characters.

#### "CSV file not found"

**Solution:** Check file path. Use absolute path or relative from backend directory.

#### "Foreign key violation"

**Solution:** Ensure database schema is created (run 01-01 migration first).

### Validation Best Practices

1. **Always dry-run first** - Catch errors before database changes
2. **Small batches** - Start with 5-10 rows to test mapping
3. **Review sample CSV** - Use `sample_data/apollo_export_example.csv` as template
4. **Check logs** - Review detailed error messages for specific row issues

## Field Mapping Reference

### Apollo → Supabase Mapping

```python
# Prospect fields
'First Name' → prospects.name (combined)
'Last Name' → prospects.name (combined)
'Email' → prospects.email
'Title' → prospects.title
'Seniority' → prospects.seniority
'Departments' → prospects.departments (array)
'LinkedIn URL' → prospects.linkedin_url
'City, State, Country' → prospects.location (combined)

# Company fields
'Company Name' → companies.name
'Company Domain' → companies.domain
'Industry' → companies.industry
'Employee Count' → companies.employee_count
'Funding' → companies.funding_stage
'Total Funding' → companies.total_funding
'Revenue Range' → companies.revenue_range
'Company HQ City' → companies.headquarters_location
```

### Candidate → Supabase Mapping

```python
'Name' → candidates.name
'Email' → candidates.email
'Phone' → candidates.phone
'Current Title' → candidates.current_title
'Current Company' → candidates.current_company
'Skills' → candidates.skills (array)
'Years Experience' → candidates.years_experience
'Compensation Expectation' → candidates.compensation_expectation
'Availability' → candidates.availability
'LinkedIn URL' → candidates.linkedin_url
'Resume URL' → candidates.resume_url
'Notes' → candidates.recruiter_notes
```

## Advanced: Custom Mapping Profiles

To add support for other CSV formats, extend `csv_mapper.py`:

```python
class CustomMappingProfile:
    """Field mapping for your custom CSV format."""

    PROSPECT_FIELDS = {
        'Your CSV Column Name': 'database_field_name',
        # ...
    }

    COMPANY_FIELDS = {
        'Your CSV Column Name': 'database_field_name',
        # ...
    }
```

Then update `parse_csv()` to support the new profile.

## Next Steps

After uploading pilot company data:

1. **RSS Feed Aggregator (Plan 01-03)** - Automate signal detection
2. **Agent Architecture (Phase 2)** - Build signal extraction agents
3. **Integration (Phase 4)** - Sync enriched data to Attio CRM

---

**Questions?** Check logs in `backend/` directory or review validation error details from dry-run output.
