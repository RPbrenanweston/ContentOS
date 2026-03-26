# NYC Companies Enrichment Batch - Complete Analysis

**Date:** 2026-02-16
**Dataset:** `nyc-companies-enriched.csv` (696 companies)
**Enrichment API:** Lead Magic
**Total Cost:** $0.1282 USD

> **Note:** Analysis based on the 696-company enrichment batch. 12 companies from the original 708-row input lacked sufficient data for Lead Magic to return results. An earlier draft of this report incorrectly referenced an 846-company dataset (`companies_with_headcount.json`); that file contains a different superset and is NOT the source of truth for this analysis. All figures below derive exclusively from `nyc-companies-enriched.csv`.

---

## 1. DATASET OVERVIEW

| Metric | Value |
|--------|-------|
| Total companies in enrichment batch | 696 |
| Companies with headcount returned | 640 (92.0%) |
| Missing headcount | 56 (8.0%) |
| Mean headcount | 206.5 |
| Median headcount | 97.0 |
| Standard deviation | 644.4 |
| Range | 1 - 11,757 |
| P25 | 56 |
| P75 | 161 |
| P90 | 319 |
| P95 | 665 |

**Distribution shape:** Right-skewed (mean/median ratio: 2.13). A long tail of enterprise companies pulls the mean well above the median. The median of 97 employees is far more representative of the typical company in this dataset. At a 2.13 ratio, the skew is more pronounced than typical B2B datasets, driven by 14 companies above 1,000 headcount.

---

## 2. ICP QUALIFICATION ASSESSMENT (<=100 Employees)

### Headline Numbers

- **333 of 640 companies with known headcount qualify (52.0%)**
- 333 of 696 total (47.8%)
- Slightly under half the total batch qualifies at the 100-employee threshold

### ICP Sub-Band Breakdown

| Band | Count | % of ICP | % of Total | Avg HC | Med HC |
|------|------:|:--------:|:----------:|-------:|-------:|
| 1-10 (Micro) | 20 | 6.0% | 2.9% | 6 | 6 |
| 11-25 (Tiny) | 37 | 11.1% | 5.3% | 18 | 18 |
| 26-50 (Small) | 88 | 26.4% | 12.6% | 39 | 39 |
| 51-100 (Growth) | 188 | 56.5% | 27.0% | 76 | 73 |
| **Total ICP** | **333** | **100%** | **47.8%** | **55** | **58** |

### Key Insight: The 51-100 band dominates

Over half of ICP-qualified companies (188, 56.5%) sit in the 51-100 range. This is the single largest concentration in any band across the entire dataset. These are companies with:
- Budget authority (revenue likely $5M-$25M)
- 1-2 decision-maker layers (founder/CTO or VP)
- Active hiring (they're posting NYC jobs)
- Technology adoption readiness (growth-stage companies invest in tooling)

The 26-50 band (88 companies, 26.4% of ICP) is the second-largest ICP segment and contains earlier-stage companies that are still viable but may have tighter budgets.

### What This Tells Us About NYC Market Composition

The NYC tech job market is structurally favorable for an ICP targeting sub-100 companies:
- Nearly half the dataset qualifies immediately
- The median company (97 employees) sits right at the ICP boundary
- The distribution peaks in exactly the ICP range

This is not a "needle in a haystack" enrichment exercise. It is a near-majority-qualifying dataset.

---

## 3. MARKET SEGMENTATION (Size Tier Analysis)

| Tier | Count | % of Known | Avg HC | Med HC | Lead Quality |
|------|------:|:----------:|-------:|-------:|:------------:|
| 1-10 (Micro) | 20 | 3.1% | 6 | 6 | LOW |
| 11-25 (Tiny) | 37 | 5.8% | 18 | 18 | LOW-MEDIUM |
| 26-50 (Small) | 88 | 13.8% | 39 | 39 | MEDIUM |
| 51-100 (Growth) | 188 | 29.4% | 76 | 73 | HIGH |
| 101-150 (Scale-up) | 127 | 19.8% | 124 | 122 | MEDIUM-HIGH |
| 151-250 (Mid-Market) | 95 | 14.8% | 186 | 179 | MEDIUM |
| 251-500 (Upper-Mid) | 45 | 7.0% | 343 | 332 | LOW |
| 501-1000 (Large) | 26 | 4.1% | 739 | 751 | NON-ICP |
| 1001-5000 (Enterprise) | 11 | 1.7% | 1,979 | 1,736 | NON-ICP |
| 5001+ (Mega) | 3 | 0.5% | 7,968 | 6,192 | NON-ICP |

### Opportunity Zones (Highest Concentration)

1. **51-100 employees (29.4%)** - Largest single tier. Growth-stage companies with budget and urgency.
2. **101-150 employees (19.8%)** - Just above ICP threshold. Scale-ups with growing complexity.
3. **151-250 employees (14.8%)** - Mid-market companies investing in infrastructure.

These three tiers alone account for 410 companies (64.1% of the dataset with known headcount). This is the addressable core.

### Recommended Lead Quality Tiers

| Tier | Band | Count | % | Rationale |
|------|------|------:|--:|-----------|
| **A (Hot)** | 26-75 | 190 | 29.7% | Big enough to buy, small enough for fast decisions |
| **B (Warm)** | 76-150 | 213 | 33.3% | Scaling, need solutions, slightly longer cycles |
| **C (Risky)** | 1-25 | 57 | 8.9% | May lack budget or stability |
| **D (Long Cycle)** | 151-500 | 140 | 21.9% | More stakeholders, procurement process |
| **F (Non-ICP)** | 500+ | 40 | 6.2% | Enterprise sales motion required |

---

## 4. OUTLIER ANALYSIS

### Enterprise Outliers (>1,000 employees)

| Company | Headcount | Industry |
|---------|----------:|----------|
| TED Conferences | 11,757 | Non-profit Organization Management |
| Chief | 6,192 | Think Tanks |
| European Wax Center | 5,954 | Health, Wellness & Fitness |
| xAI | 3,842 | Computer Software |
| Anthropic | 3,338 | Research |
| Fora | 3,284 | Computer Software |
| Nourish | 2,023 | Hospital & Health Care |
| ComForCare | 1,838 | Hospital & Health Care |
| Goldfish Swim School | 1,736 | Health, Wellness & Fitness |
| Shiftsmart | 1,393 | Computer Software |
| Her Campus Media | 1,187 | Internet |
| Bubble | 1,055 | Consumer Goods |
| tarte cosmetics | 1,047 | Cosmetics |
| City Wide Facility Solutions | 1,023 | Facilities Services |

**Action:** Remove these 14 companies from outreach lists. They require enterprise sales motions that do not match a sub-100 ICP.

### Micro Companies (1-10 employees): Risk Assessment

20 companies fall in the 1-10 range. These carry higher risk:
- May be pre-revenue or bootstrapping
- Single point of failure (founder = buyer = user)
- Budget constraints likely severe
- However: some may be well-funded startups with small teams

**Recommendation:** Do not disqualify entirely. Flag for manual review. Well-funded 5-person startups posting NYC jobs may be excellent prospects.

### The Sweet Spot

**26-100 employees is the definitive sweet spot.** Evidence:

- 276 companies (43.1% of companies with known headcount)
- Mean headcount: 64.0
- Median headcount: 64.0
- Large enough to have budget ($3M-$25M revenue range)
- Small enough for founder/CTO-level decision making
- Actively hiring (the source data is job postings)
- Optimal balance of deal size and sales cycle length

---

## 5. THRESHOLD SENSITIVITY

Should the ICP threshold move from 100?

| Threshold | Qualified | % of Known HC | Delta from 100 |
|----------:|----------:|:-------------:|:--------------:|
| 50 | 145 | 22.7% | -188 |
| 75 | 247 | 38.6% | -86 |
| **100** | **333** | **52.0%** | **baseline** |
| 125 | 406 | 63.4% | +73 |
| **150** | **460** | **71.9%** | **+127** |
| 200 | 525 | 82.0% | +192 |
| 250 | 555 | 86.7% | +222 |

### Recommendation: Consider raising threshold to 150

Moving from 100 to 150 adds **127 companies (+38.1% more leads)** while staying in the scale-up band where decision-making is still relatively fast. The 101-150 band has a median of 122 employees -- these are still companies where you can reach a VP or CTO directly.

Below 75, you start losing volume rapidly. Above 200, you enter mid-market territory with procurement processes.

**Optimal ICP threshold: 150 employees.**

---

## 6. DATA QUALITY ASSESSMENT

### Field Completeness

| Field | Populated | Coverage |
|-------|----------:|:--------:|
| Headcount (employee_count) | 640 / 696 | 92.0% |
| Industry | 641 / 696 | 92.1% |
| Founded year | 599 / 696 | 86.1% |

### Headcount Data

- 640 of 696 companies returned headcount data (92.0%)
- 56 companies missing headcount (8.0%)
- This is solid coverage but notably lower than the 99.2% rate seen in other enrichment batches

### Missing Data Notes

- **Founded year (86.1%)** falls below a 90% quality threshold. For any analysis dependent on company age (e.g., "founded after 2020" filtering), expect ~14% data gaps.
- **Industry and headcount** both exceed 90%, which is adequate for segmentation work.

**Follow-up needed?** The 56 missing-headcount companies could be manually checked on LinkedIn if any are suspected high-value targets. At 8% missing rate, this is acceptable but not negligible.

---

## 7. COST-BENEFIT ANALYSIS

### Enrichment Cost

| Metric | Value |
|--------|-------|
| Total cost | $0.1282 USD |
| Companies in batch | 696 |
| Cost per company | $0.00018 USD |
| Cost per ICP-qualified lead (333) | $0.00038 USD |
| Cost per sweet-spot lead (26-100, 276) | $0.00046 USD |

### ROI Projection (Tier A + B leads: 403 companies)

| Scenario | Reply Rate | Close Rate | Avg Deal | Projected Revenue |
|----------|:----------:|:----------:|:--------:|------------------:|
| Conservative | 1% | 5% | $3,000 | $605 |
| Moderate | 2% | 10% | $5,000 | $4,030 |
| Optimistic | 3% | 15% | $8,000 | $14,508 |

Even at the **conservative** scenario, $605 revenue from a $0.13 enrichment investment yields a **4,700x ROI**.

At moderate assumptions: **31,400x ROI**.

**Verdict:** This is one of the most cost-effective lead enrichment operations possible. The cost is essentially zero relative to any reasonable deal size.

---

## 8. STRATEGIC RECOMMENDATIONS

### Immediate Actions

1. **Raise ICP threshold to 150 employees.** This adds 127 qualified companies (total: 460) while staying in the fast-decision-making band.

2. **Prioritize Tier A (26-75) for first outreach wave.** These 190 companies are the highest-quality leads: big enough to buy, small enough to close fast. They should be your first campaign.

3. **Tier B (76-150) for second wave.** 213 companies with slightly longer but still manageable sales cycles.

4. **Remove 40 companies above 500 employees.** These require a fundamentally different sales motion.

5. **Flag 57 micro companies (1-25) for manual review.** Some may be well-funded startups worth pursuing individually.

### Next Enrichment Steps

1. **Industry/vertical enrichment** -- Group these companies by sector to enable industry-specific messaging.
2. **Decision-maker identification** -- For the 403 Tier A+B companies, identify CTO/VP/Founder contacts.
3. **Email validation** -- Validate email addresses before outreach to protect sender reputation.
4. **Technology stack enrichment** -- Identify what tools they already use to enable competitive positioning.

### Campaign Architecture

| Wave | Tier | Count | Timeline | Expected Meetings |
|------|------|------:|----------|------------------:|
| Wave 1 | A (26-75) | 190 | Week 1-2 | 2-6 |
| Wave 2 | B (76-150) | 213 | Week 3-4 | 2-6 |
| Wave 3 | C (1-25, filtered) | ~30 | Week 5 | 0-1 |
| **Total** | | **~433** | **5 weeks** | **4-13** |

---

## 9. DATA FILES

| File | Description |
|------|-------------|
| `nyc-companies-enriched.csv` | **Source of truth.** 696 companies with full enrichment fields (headcount, industry, founded year, revenue, etc.) |
| `companies_with_headcount.json` | Separate 846-company dataset. NOT used for this analysis. |
| `companies_with_headcount_FAST.json` | Fast enrichment variant of the 846 set. NOT used for this analysis. |

---

## 10. DATA RECONCILIATION NOTE

An earlier version of this report was generated from `companies_with_headcount.json` (846 companies) rather than the actual enrichment deliverable `nyc-companies-enriched.csv` (696 companies). The following corrections were made:

| Metric | Old (Incorrect) | New (Correct) | Source |
|--------|:---------------:|:-------------:|--------|
| Total companies | 846 | 696 | Row count of CSV |
| Headcount coverage | 839 (99.2%) | 640 (92.0%) | Non-empty employee_count |
| ICP qualified (<=100) | 467 (55.7%) | 333 (52.0%) | Count of HC <= 100 |
| Mean headcount | 143.5 | 206.5 | Calculated from CSV |
| Median headcount | 90.0 | 97.0 | Calculated from CSV |
| Stdev | 313.3 | 644.4 | Calculated from CSV |
| Max headcount | 6,110 | 11,757 | Max of employee_count |
| Total cost | $0.1682 | $0.1282 | Actual API spend |
| Tier A (26-75) | 293 | 190 | Filtered count |
| Tier B (76-150) | 287 | 213 | Filtered count |
| Enterprise outliers (>1000) | 9 | 14 | Filtered count |

All figures in this report now derive exclusively from the 696-company CSV.

---

*Analysis produced 2026-02-16. Corrected 2026-02-16 to resolve data source mismatch.*
