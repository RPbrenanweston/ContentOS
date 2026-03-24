#!/usr/bin/env python3
"""
NYC Companies - Lead Magic Batch Enrichment
============================================
Enriches 696 NYC companies via Lead Magic company-search API.
Features: checkpoint/resume, progress tracking, cost transparency.

Endpoint: companies/company-search
Cost: 1 credit per found company, 0 for not-found
"""

import csv
import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

# ─── Configuration ────────────────────────────────────────────────────────────

BASE_DIR = Path("/Users/robertpeacock/Desktop/Claude code")
INPUT_CSV = BASE_DIR / "outputs" / "cro" / "nyc_companies_extracted.csv"
OUTPUT_CSV = BASE_DIR / "nyc-companies-enriched.csv"
SUMMARY_JSON = BASE_DIR / "nyc-companies-summary.json"
CHECKPOINT_JSON = BASE_DIR / "nyc-companies-checkpoint.json"
ICP_CSV = BASE_DIR / "nyc-companies-icp-under-100.csv"

PROGRESS_INTERVAL = 10  # Print progress every N records
RATE_LIMIT_DELAY = 0.15  # Seconds between API calls (avoid rate limiting)
CREDIT_COST_USD = 0.0002  # Cost per credit in USD

# ─── Load Environment ─────────────────────────────────────────────────────────

env_file = BASE_DIR / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

sys.path.insert(0, str(BASE_DIR))
from leadmagic_client import LeadMagicClient

LEADMAGIC_API_KEY = os.getenv("LEADMAGIC_API_KEY")
if not LEADMAGIC_API_KEY:
    print("ERROR: LEADMAGIC_API_KEY not found in .env")
    sys.exit(1)


def extract_domain(url: str) -> str:
    """Extract clean domain from URL."""
    if not url:
        return ""
    url = url.strip()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        domain = domain.replace('www.', '')
        domain = domain.rstrip('/')
        return domain
    except Exception:
        return url


def load_checkpoint() -> dict:
    """Load checkpoint if exists."""
    if CHECKPOINT_JSON.exists():
        with open(CHECKPOINT_JSON, 'r') as f:
            return json.load(f)
    return {"processed": {}, "last_index": -1, "total_credits": 0.0, "errors": []}


def save_checkpoint(checkpoint: dict):
    """Save checkpoint to disk."""
    with open(CHECKPOINT_JSON, 'w') as f:
        json.dump(checkpoint, f, indent=2)


def load_companies() -> list:
    """Load companies from CSV."""
    companies = []
    with open(INPUT_CSV, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            companies.append(row)
    return companies


def enrich_company(client: LeadMagicClient, domain: str, company_name: str) -> dict:
    """
    Enrich a single company via Lead Magic company-search.
    Tries domain first, falls back to company name.

    Returns dict with enrichment data or empty dict on failure.
    """
    result = {}

    # Try domain first (most accurate)
    if domain:
        response = client.search_company(company_domain=domain)
        if response.success and response.data:
            data = response.data
            result = {
                "employee_count": data.get("employee_count") or data.get("employees") or data.get("headcount") or data.get("size", {}).get("employees") if isinstance(data.get("size"), dict) else data.get("employee_count"),
                "industry": data.get("industry") or data.get("category") or "",
                "founded_year": data.get("founded") or data.get("founded_year") or data.get("year_founded") or "",
                "revenue": data.get("revenue") or data.get("estimated_revenue") or "",
                "description": data.get("description", "")[:200] if data.get("description") else "",
                "headquarters": data.get("headquarters") or data.get("location") or "",
                "credits_consumed": response.credits_consumed,
                "status": "found",
                "raw_data": data
            }

            # Try multiple paths for employee count
            if not result["employee_count"]:
                for key in ["employeeCount", "employee_count_range", "employeesAmountInLinkedin",
                            "staff_count", "company_size", "linkedin_employee_count"]:
                    val = data.get(key)
                    if val:
                        result["employee_count"] = val
                        break

            return result

    # Fallback to company name
    if company_name and not result:
        response = client.search_company(company_name=company_name)
        if response.success and response.data:
            data = response.data
            result = {
                "employee_count": data.get("employee_count") or data.get("employees") or data.get("headcount") or "",
                "industry": data.get("industry") or data.get("category") or "",
                "founded_year": data.get("founded") or data.get("founded_year") or "",
                "revenue": data.get("revenue") or data.get("estimated_revenue") or "",
                "description": data.get("description", "")[:200] if data.get("description") else "",
                "headquarters": data.get("headquarters") or data.get("location") or "",
                "credits_consumed": response.credits_consumed,
                "status": "found_by_name",
                "raw_data": data
            }
            return result

    return {
        "employee_count": "",
        "industry": "",
        "founded_year": "",
        "revenue": "",
        "description": "",
        "headquarters": "",
        "credits_consumed": 0,
        "status": "not_found",
        "raw_data": {}
    }


def main():
    print("=" * 80)
    print("NYC COMPANIES - LEAD MAGIC BATCH ENRICHMENT")
    print("=" * 80)

    # Load data
    companies = load_companies()
    checkpoint = load_checkpoint()
    client = LeadMagicClient(LEADMAGIC_API_KEY)

    total = len(companies)
    already_processed = len(checkpoint["processed"])

    print(f"Total companies:      {total}")
    print(f"Already processed:    {already_processed}")
    print(f"Remaining:            {total - already_processed}")
    print(f"Estimated cost:       ${(total - already_processed) * CREDIT_COST_USD:.2f} - ${(total - already_processed) * 2 * CREDIT_COST_USD:.2f}")
    print(f"Credit cost rate:     ${CREDIT_COST_USD}/credit")
    print(f"Checkpoint file:      {CHECKPOINT_JSON}")
    print("=" * 80)
    print()

    # Track stats
    stats = {
        "processed": already_processed,
        "found": sum(1 for v in checkpoint["processed"].values() if v.get("status") == "found"),
        "found_by_name": sum(1 for v in checkpoint["processed"].values() if v.get("status") == "found_by_name"),
        "not_found": sum(1 for v in checkpoint["processed"].values() if v.get("status") == "not_found"),
        "errors": len(checkpoint["errors"]),
        "credits": checkpoint["total_credits"],
        "skipped": 0
    }

    start_time = time.time()

    for idx, company in enumerate(companies):
        company_name = company.get("lm_company_name", "").strip()
        website_url = company.get("lm_company_website_url", "").strip()
        domain = extract_domain(website_url)

        # Create unique key
        key = domain or company_name

        # Skip if already processed
        if key in checkpoint["processed"]:
            stats["skipped"] += 1
            continue

        # Enrich
        try:
            result = enrich_company(client, domain, company_name)

            # Store in checkpoint (without raw_data to keep checkpoint small)
            checkpoint_entry = {k: v for k, v in result.items() if k != "raw_data"}
            checkpoint["processed"][key] = checkpoint_entry
            checkpoint["total_credits"] += result.get("credits_consumed", 0)
            checkpoint["last_index"] = idx

            # Update stats
            stats["processed"] += 1
            stats["credits"] = checkpoint["total_credits"]
            if result["status"] == "found":
                stats["found"] += 1
            elif result["status"] == "found_by_name":
                stats["found_by_name"] += 1
            else:
                stats["not_found"] += 1

        except Exception as e:
            error_entry = {
                "index": idx,
                "company": company_name,
                "domain": domain,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            checkpoint["errors"].append(error_entry)
            stats["errors"] += 1
            print(f"  ERROR [{idx}/{total}] {company_name}: {e}")

        # Progress report
        processed_count = stats["processed"]
        if processed_count % PROGRESS_INTERVAL == 0 or idx == total - 1:
            elapsed = time.time() - start_time
            rate = processed_count / elapsed if elapsed > 0 else 0
            cost = stats["credits"] * CREDIT_COST_USD
            remaining = total - processed_count - stats["skipped"]
            eta_seconds = remaining / rate if rate > 0 else 0
            eta_min = eta_seconds / 60

            print(f"  [{processed_count}/{total}] "
                  f"Found: {stats['found']+stats['found_by_name']} | "
                  f"Not found: {stats['not_found']} | "
                  f"Errors: {stats['errors']} | "
                  f"Credits: {stats['credits']:.0f} (${cost:.4f}) | "
                  f"Rate: {rate:.1f}/s | "
                  f"ETA: {eta_min:.1f}min")

        # Save checkpoint every 50 records
        if stats["processed"] % 50 == 0:
            save_checkpoint(checkpoint)

        # Rate limiting
        time.sleep(RATE_LIMIT_DELAY)

    # Final checkpoint save
    save_checkpoint(checkpoint)

    elapsed = time.time() - start_time
    print()
    print("=" * 80)
    print("ENRICHMENT COMPLETE")
    print("=" * 80)
    print(f"Time elapsed:         {elapsed:.1f}s ({elapsed/60:.1f}min)")
    print(f"Total processed:      {stats['processed']}")
    print(f"Found (domain):       {stats['found']}")
    print(f"Found (name):         {stats['found_by_name']}")
    print(f"Not found:            {stats['not_found']}")
    print(f"Errors:               {stats['errors']}")
    print(f"Total credits:        {stats['credits']:.0f}")
    print(f"Total cost:           ${stats['credits'] * CREDIT_COST_USD:.4f}")
    print()

    # ─── Generate Output Files ────────────────────────────────────────────────

    print("Generating output files...")

    # Build enriched CSV
    enriched_rows = []
    icp_rows = []

    for company in companies:
        company_name = company.get("lm_company_name", "").strip()
        website_url = company.get("lm_company_website_url", "").strip()
        domain = extract_domain(website_url)
        key = domain or company_name

        enrichment = checkpoint["processed"].get(key, {})

        row = {
            "company_name": company_name,
            "website": website_url,
            "linkedin_url": company.get("lm_company_linkedin_url", ""),
            "city": company.get("lm_city", ""),
            "country": company.get("lm_country", ""),
            "job_title": company.get("lm_title", ""),
            "job_type": company.get("lm_job_type", ""),
            "experience_level": company.get("lm_experience_level", ""),
            "salary_min": company.get("lm_salary_min", ""),
            "salary_max": company.get("lm_salary_max", ""),
            "salary_currency": company.get("lm_salary_currency", ""),
            "employee_count": enrichment.get("employee_count", ""),
            "industry": enrichment.get("industry", ""),
            "founded_year": enrichment.get("founded_year", ""),
            "revenue": enrichment.get("revenue", ""),
            "headquarters": enrichment.get("headquarters", ""),
            "enrichment_status": enrichment.get("status", "pending"),
        }
        enriched_rows.append(row)

        # ICP filter: <100 employees
        emp = enrichment.get("employee_count", "")
        try:
            emp_num = int(str(emp).replace(',', '').strip()) if emp else None
            if emp_num is not None and emp_num < 100:
                icp_rows.append(row)
        except (ValueError, TypeError):
            pass

    # Write enriched CSV
    if enriched_rows:
        fieldnames = list(enriched_rows[0].keys())
        with open(OUTPUT_CSV, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(enriched_rows)
        print(f"  Enriched CSV:  {OUTPUT_CSV} ({len(enriched_rows)} rows)")

    # Write ICP CSV
    if icp_rows:
        fieldnames = list(icp_rows[0].keys())
        with open(ICP_CSV, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(icp_rows)
        print(f"  ICP CSV (<100): {ICP_CSV} ({len(icp_rows)} rows)")

    # Build summary stats
    employee_counts = []
    for row in enriched_rows:
        emp = row.get("employee_count", "")
        try:
            emp_num = int(str(emp).replace(',', '').strip()) if emp else None
            if emp_num is not None:
                employee_counts.append(emp_num)
        except (ValueError, TypeError):
            pass

    # Size tier distribution
    tiers = {
        "1-10": 0,
        "11-50": 0,
        "51-100": 0,
        "101-250": 0,
        "251-500": 0,
        "501-1000": 0,
        "1001-5000": 0,
        "5001+": 0
    }
    for count in employee_counts:
        if count <= 10:
            tiers["1-10"] += 1
        elif count <= 50:
            tiers["11-50"] += 1
        elif count <= 100:
            tiers["51-100"] += 1
        elif count <= 250:
            tiers["101-250"] += 1
        elif count <= 500:
            tiers["251-500"] += 1
        elif count <= 1000:
            tiers["501-1000"] += 1
        elif count <= 5000:
            tiers["1001-5000"] += 1
        else:
            tiers["5001+"] += 1

    summary = {
        "timestamp": datetime.now().isoformat(),
        "input_file": str(INPUT_CSV),
        "total_companies": total,
        "processing": {
            "found": stats["found"],
            "found_by_name": stats["found_by_name"],
            "not_found": stats["not_found"],
            "errors": stats["errors"],
            "total_processed": stats["processed"]
        },
        "employee_stats": {
            "companies_with_headcount": len(employee_counts),
            "avg_employees": round(sum(employee_counts) / len(employee_counts), 1) if employee_counts else 0,
            "median_employees": sorted(employee_counts)[len(employee_counts)//2] if employee_counts else 0,
            "min_employees": min(employee_counts) if employee_counts else 0,
            "max_employees": max(employee_counts) if employee_counts else 0
        },
        "icp_filter": {
            "threshold": 100,
            "companies_under_threshold": len(icp_rows),
            "icp_match_percentage": round(len(icp_rows) / total * 100, 1) if total > 0 else 0
        },
        "size_tier_distribution": tiers,
        "cost": {
            "total_credits": stats["credits"],
            "credit_rate_usd": CREDIT_COST_USD,
            "total_cost_usd": round(stats["credits"] * CREDIT_COST_USD, 4)
        },
        "elapsed_seconds": round(elapsed, 1),
        "output_files": {
            "enriched_csv": str(OUTPUT_CSV),
            "icp_csv": str(ICP_CSV),
            "summary_json": str(SUMMARY_JSON),
            "checkpoint_json": str(CHECKPOINT_JSON)
        }
    }

    with open(SUMMARY_JSON, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"  Summary JSON:  {SUMMARY_JSON}")

    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(json.dumps(summary, indent=2))
    print("=" * 80)
    print("DONE")


if __name__ == "__main__":
    main()
