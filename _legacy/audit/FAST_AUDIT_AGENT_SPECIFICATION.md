# FAST AUDIT AGENT SPECIFICATION

## Executive Summary

The Fast Audit Agent is designed to validate signals across company datasets with extreme speed and precision. It processes 10 companies in <2 hours by:

1. **Extracting signals** from each company profile in 1 minute
2. **Verifying signals** via targeted search (2-3 min per signal, max 10 min per company)
3. **Classifying verification status** as VERIFIED, PARTIALLY_VERIFIED, or UNVERIFIED
4. **Mapping to trigger taxonomy** for sales intelligence applications
5. **Generating nested audit documentation** with structured decision trails

**Target KPIs:**
- Processing speed: 15 min per company (10 companies = 2.5 hours)
- Verification accuracy: 95%+ match to source URLs
- Signal classification: 100% tagged with trigger taxonomy
- Scalability: Easily replicable across 110 remaining companies

---

## AUDIT WORKFLOW OVERVIEW

### Phase 1: Signal Extraction (1 minute per company)

**Input:** Company profile page with embedded signals
**Output:** Structured signal list with metadata

**Steps:**
1. Read company page systematically
2. Extract: date, description, signal-type, stated-confidence
3. Organize by recency (most recent first)
4. Count total signals per company
5. Flag any signals missing critical metadata

**Quality Gate:** All signals must have date + description minimum

**Time Allocation:** 1 minute per company

---

### Phase 2: Signal Verification (10-15 min per company)

**Input:** Extracted signal list
**Output:** Verification status + source URL for each signal

#### Per-Signal Verification Logic

For each signal (max 3-5 per company):

| Step | Action | Timing | Decision |
|------|--------|--------|----------|
| 1 | Search for company announcement or press release | <1 min | Found? → URL + VERIFIED |
| 2 | If not found, search news coverage (TechCrunch, VentureBeat, etc) | <1 min | Found? → URL + VERIFIED |
| 3 | If not found, search funding databases (Crunchbase, PitchBook) | <1 min | Found? → URL + PARTIALLY_VERIFIED |
| 4 | If not found after 2 min, mark as UNVERIFIED | — | Stop search, move to next signal |

**Search Priority Order:**
1. **Primary sources** (company announcements, official press releases)
2. **Secondary sources** (major tech news outlets: TechCrunch, VentureBeat, Forbes, Bloomberg)
3. **Tertiary sources** (funding databases, LinkedIn profiles, conference announcements)
4. **Unverified** (no credible source found after exhaustive 2-min search)

**Time Allocation:**
- 3 signals @ 2-3 min each = 6-9 min
- 4 signals @ 2 min each = 8 min
- 5 signals @ 2 min each = 10 min max
- **Total per company: 10-15 min**

---

### Phase 3: Documentation & Trigger Tagging (3 min per company)

**Input:** Verification results + signal metadata
**Output:** Nested markdown with trigger taxonomy

**Steps:**
1. Organize signals hierarchically (date order, newest first)
2. For each verified signal, map to trigger taxonomy
3. Calculate verification metrics (X verified / Y total)
4. Assign validity rating to company dataset
5. Generate recommended action (keep/remove/investigate)

**Time Allocation:** 3 minutes per company

---

## VERIFICATION QUALITY GATES

### What Makes a Signal "VERIFIED"

**VERIFIED (Highest Confidence):**
- Source found within 2 minutes
- Source is primary (company announcement, press release, official statement)
- Source matches signal claim date, amount, or participant names
- Example: Series A announcement from company blog or official press release

**PARTIALLY_VERIFIED (Medium Confidence):**
- Source found in secondary/tertiary database
- Date/amount matches but source is aggregator (not primary)
- Multiple sources corroborate but no single definitive statement
- Example: Crunchbase entry with funding date + amount matching signal

**UNVERIFIED (Low Confidence):**
- No credible source found after 2-min search
- Source exists but dates/amounts conflict with signal claim
- Signal appears derived/inferred (e.g., "likely hired" based on job postings)
- Example: "Product launch" signal with no press release, news coverage, or announcement

### Source Credibility Hierarchy

```
Tier 1: Primary Sources (Highest)
  - Company press releases / announcements
  - Official company blogs / CEO tweets
  - SEC filings / legal documents
  - Company earnings calls / official statements

Tier 2: Secondary Sources (High)
  - Major tech news outlets (TechCrunch, VentureBeat, Forbes, Bloomberg, Wall Street Journal)
  - Official funding database confirmations (Crunchbase, PitchBook, AngelList)
  - Major industry publications (VentureBeat, The Information)

Tier 3: Tertiary Sources (Medium)
  - Startup databases with source attribution
  - LinkedIn announcements with public verification
  - Conference / event listings
  - Patent filings

Tier 4: Inference / Unverified (Not accepted)
  - Social media rumors
  - Inferred from job postings
  - Historical patterns / "likely based on hiring"
  - Aggregators without primary source attribution
```

---

## TRIGGER TAXONOMY & MAPPING

### Trigger Categories

Every verified signal must be tagged with ONE primary trigger category and specific sub-type:

#### 1. CAPITAL EVENTS
- **Funding > Seed** (Pre-Series A capital)
- **Funding > Series A-C** (Series A, B, or C rounds)
- **Funding > Series D+** (Series D or later)
- **Funding > Growth Round** (Growth equity or late-stage)
- **M&A > Acquisition** (Company acquired)
- **M&A > Merger** (Merger transaction)
- **Debt > Credit Facility** (Debt financing, credit line)
- **Debt > Convertible Note** (Convertible instruments)
- **IPO** (Initial Public Offering)

#### 2. EXECUTIVE HIRING
- **C-Suite > CEO** (Chief Executive Officer)
- **C-Suite > CTO** (Chief Technology Officer)
- **C-Suite > COO** (Chief Operating Officer)
- **C-Suite > CFO** (Chief Financial Officer)
- **C-Suite > CMO** (Chief Marketing Officer)
- **C-Suite > CISO** (Chief Information Security Officer)
- **VPs > VP Engineering**
- **VPs > VP Sales**
- **VPs > VP Marketing**
- **VPs > VP Product**
- **Board > Board Member** (New board addition)

#### 3. GO-TO-MARKET
- **Sales Hiring > VP Sales** (Sales leadership hire)
- **Sales Hiring > Sales Team Growth** (Sales engineer, account executive hires)
- **Channel Programs > Partner Announced** (New channel/partner program)
- **Channel Programs > Reseller Agreement** (Reseller or distribution deal)
- **Marketing > Campaign Launch** (Major marketing initiative)
- **Customer Success > Expansion Hire** (Customer success leadership)

#### 4. PRODUCT ENGINEERING
- **Product Launch > Public Release** (General availability)
- **Product Launch > Beta Release** (Limited availability)
- **Product Launch > Platform** (New platform/service)
- **Feature Release > Major Feature** (Significant new capability)
- **Feature Release > Integration** (New product integration)
- **Release > Version Milestone** (Major version bump: v2, v3)
- **AI Integration** (AI/ML feature announcement)

#### 5. PARTNERSHIPS
- **Technology Partner > API Integration** (Technical partnership)
- **Technology Partner > Built On** (Built on partner platform)
- **Channel Partner > Reseller** (Reseller relationship)
- **Channel Partner > GSI** (Global Systems Integrator)
- **Strategic Alliance > Co-marketing** (Co-marketing initiative)
- **Strategic Alliance > Joint Solution** (Co-developed solution)

#### 6. TRACTION & VALIDATION
- **Awards > Industry Award** (Industry recognition)
- **Awards > Analyst Recognition** (Gartner Magic Quadrant, etc)
- **Analyst > Gartner Magic Quadrant** (Gartner position)
- **Analyst > Forrester Wave** (Forrester Wave placement)
- **Customer Wins > Enterprise Logo** (Fortune 500 / major customer)
- **Customer Wins > Customer Count Milestone** (1000 customers, etc)
- **Media Coverage > Major Publication** (TechCrunch, Forbes, etc)

#### 7. GEOGRAPHIC / OPERATIONAL
- **Expansion > International Office** (New country presence)
- **Expansion > Regional Office** (New US region)
- **Expansion > Regional Headquarters** (Regional HQ opening)
- **Operations > IPO** (Going public)
- **Operations > Headquarters Move** (Relocation)

#### 8. ORGANIZATIONAL CULTURE
- **Organizational Change > Restructuring** (Company restructuring)
- **Organizational Change > Acquisition Integration** (Post-acquisition integration)
- **Team Growth > Headcount Milestone** (100 employees, 500 employees, etc)
- **Diversity** (DEI initiative announcement)

#### 9. RISK & DECLINE
- **Executive Departure > CEO** (CEO departure)
- **Executive Departure > Leadership** (Leadership departure)
- **Funding > Down Round** (Down round - valuation decrease)
- **Funding > Bridge Round** (Bridge financing - distress signal)
- **Layoffs** (Workforce reduction)
- **Regulatory** (Regulatory action / investigation)

#### 10. CUSTOMER SUCCESS & EXPANSION
- **Retention Strategy** (Announced retention focus)
- **Expansion Programs** (Upsell / cross-sell programs)
- **Enterprise Support** (Enterprise support model)

### Lead Time Expectations by Trigger

```
Capital Events > Funding:
  - Series A-C: 30-90 days after signal
  - Series D+: 60-180 days

Executive Hiring:
  - VP/C-Suite: 30-60 days announcement to departure
  - New hire to impact: 90-180 days

Product Launches:
  - Beta to GA: 30-90 days
  - Feature to ROI: 60-180 days

Partnerships:
  - Announcement to deployment: 30-180 days
  - Revenue impact: 90-365 days

M&A:
  - Announcement to close: 30-180 days
  - Integration: 6-18 months
```

---

## SIGNAL EXTRACTION & CLASSIFICATION

### Signal Metadata Structure

Every signal must capture:

```yaml
signal-id: UNIQUE_ID (e.g., "adaptive-001")
company-name: string
date: YYYY-MM-DD (or YYYY-MM if day unknown)
signal-type: string (matching categories above)
description: string (2-3 sentences)
stated-confidence: LOW | MEDIUM | HIGH (from original source)
claimed-details:
  - amount: string (if funding/deal)
  - participants: list (investors, partners, acquirers)
  - location: string (if geographic)
  - scope: string (if product or hiring)
```

### Example Signal Structure

```yaml
signal-id: "adaptive-001"
company-name: "Adaptive Security"
date: "2025-04-15"
signal-type: "Capital Events > Funding > Series A"
description: "Series A funding of $43M from a16z and OpenAI Fund"
stated-confidence: MEDIUM
claimed-details:
  amount: "$43M"
  participants: ["Andreessen Horowitz", "OpenAI Fund"]
  location: "US"
  scope: "Series A Round"
```

---

## COMPANY VALIDITY ASSESSMENT

### Reliability Scoring

Assess each company's dataset reliability using this framework:

```
EXCELLENT (90-100% verified)
  - 90%+ of signals verified with primary sources
  - Clear timeline with consistent dating
  - Strong correlation to public records / announcements
  - Action: Use all signals confidently

GOOD (75-89% verified)
  - 75%+ of signals verified
  - Most signals have news coverage or funding database confirmation
  - Minor gaps in documentation
  - Action: Use verified signals, investigate unverified

FAIR (50-74% verified)
  - 50%+ signals verified
  - Significant gaps in secondary documentation
  - Some signals appear inferred rather than announced
  - Action: Use only verified signals, flag inferred signals

POOR (<50% verified)
  - <50% verified signals
  - Most signals lack credible sources
  - Heavy reliance on inferred/derived signals
  - Action: Significant manual verification required, consider removing unreliable signals
```

### Validity Rating Criteria

| Rating | Criteria | Action |
|--------|----------|--------|
| **EXCELLENT** | 90%+ verified, clear timeline, primary sources | Keep all signals |
| **GOOD** | 75-89% verified, mostly secondary sources | Keep verified, mark inferred |
| **FAIR** | 50-74% verified, significant gaps | Use only verified signals |
| **POOR** | <50% verified, mostly inferred | Requires manual audit before use |

---

## AUDIT DOCUMENTATION STRUCTURE

### Nested Hierarchy Required

Each company audit output follows this structure:

```
# Company: [NAME]

## Metadata
- stage:: [STAGE]
- total-signals:: [COUNT]
- audit-date:: [DATE]
- audit-status:: COMPLETE

## Audit Results

### Signal 1: [TYPE] - [DATE]
- claim:: [DESCRIPTION]
- search-time:: [TIME]
- source-found:: ✓/✗
- url:: [URL or "Not found"]
- verification-status:: VERIFIED/PARTIALLY_VERIFIED/UNVERIFIED
- confidence-adjustment:: [BEFORE] → [AFTER]
- trigger-tags:: #[TAG] #[TAG]
- trigger-taxonomy:: [CATEGORY > SUBCATEGORY > TYPE]
- lead-time-expected:: [DAYS] days
- recommended-action:: KEEP/INVESTIGATE/REMOVE

### Signal N: ...

## Audit Summary
- verified:: X/Y (percentage)
- partially-verified:: X/Y (percentage)
- unverified:: X/Y (percentage)
- validity-rating:: EXCELLENT/GOOD/FAIR/POOR
- recommended-action:: [SUMMARY]
```

---

## PARALLELIZATION STRATEGY

### Batch Processing Timeline

**Sequential Processing (Single Operator):**
- 10 companies × 15 min = 150 min = 2.5 hours

**Parallel Processing (Two Operators):**
- 5 companies each × 15 min = 75 min = 1.25 hours
- Stagger by company (while Operator A verifies, Operator B extracts next batch)

**Optimal Parallel (Three Operators):**
- Operator A: Extraction (Companies 1-4)
- Operator B: Verification (Companies 1-4)
- Operator C: Documentation (Companies 1-2, ready as B completes)
- Estimated completion: 1 hour for 10 companies

**Wave Processing (5 companies/wave):**
- Wave 1: Companies 1-5 (0-2.5 hours)
- Wave 2: Companies 6-10 (2.5-5 hours)
- Allows rest/review between waves

---

## QUALITY GATES & DECISION RULES

### When to Mark VERIFIED

✓ **Accept as VERIFIED:**
- Company press release or blog announcement with matching date
- Major news outlet (TechCrunch, VentureBeat, Bloomberg) reporting same amount/date
- Funding database (Crunchbase, PitchBook) with primary source URL
- SEC filing (if applicable)
- CEO/founder public statement (Twitter, LinkedIn with verification)

✗ **Do NOT mark VERIFIED:**
- Unattributed rumors on social media
- Inferred from job postings without announcement
- "Likely" or "estimated" amounts without confirmation
- Secondary aggregators without primary source link

### When to Mark PARTIALLY_VERIFIED

✓ **Accept as PARTIALLY_VERIFIED:**
- Funding database entry without linked primary source but amounts match
- Multiple secondary sources corroborate but primary source not found
- Announcement found but missing specific detail (date vs amount)
- LinkedIn profile updates confirming executive hire but no press release

✗ **Do NOT mark PARTIALLY_VERIFIED:**
- Rumors or inferred signals
- Unconfirmed details (if amounts differ, drop to UNVERIFIED)

### When to Mark UNVERIFIED

✓ **Mark as UNVERIFIED:**
- No credible source found after 2-min exhaustive search
- Signal contradicts public records
- Source exists but details conflict (e.g., "March 2025 Series A" but source says "April 2025")
- Signal appears derived without primary documentation

### Timing Decision Rules

**If search takes >2 minutes:**
- At 2 min mark: Make binary decision (VERIFIED / PARTIALLY_VERIFIED or UNVERIFIED)
- Do not continue searching after 2-min limit
- Document search-time in audit trail
- Flag for manual review if critical signal

**If conflicting information found:**
- Documented amount differs by >10%: UNVERIFIED
- Documented date differs by >30 days: UNVERIFIED
- Same event, different dates: Use most credible source, note discrepancy

---

## IMPLEMENTATION CHECKLIST

### Pre-Audit Setup (5 min)
- [ ] Identify 10 companies for audit
- [ ] Prepare company list with URLs
- [ ] Open audit template
- [ ] Set timer for 2.5 hours
- [ ] Bookmark search tools (Google, Crunchbase, TechCrunch)

### Per-Company Execution (15 min)

**Extraction Phase (1 min):**
- [ ] Open company page
- [ ] Read all signal descriptions
- [ ] Extract: date, type, description, confidence
- [ ] Count total signals
- [ ] Document any missing metadata

**Verification Phase (10-15 min):**
- [ ] For each signal (max 3-5):
  - [ ] Search for primary source (1 min)
  - [ ] If found: Record URL, mark VERIFIED, move to next
  - [ ] If not found: Search secondary sources (1 min)
  - [ ] If found: Record URL, mark VERIFIED or PARTIALLY_VERIFIED
  - [ ] If not found: Mark UNVERIFIED at 2-min mark, move to next

**Documentation Phase (3 min):**
- [ ] Organize signals hierarchically
- [ ] Map each verified signal to trigger taxonomy
- [ ] Calculate verification metrics
- [ ] Assign validity rating
- [ ] Generate recommended actions

### Post-Audit Validation (10 min)
- [ ] Review all URLs open in browser (spot-check 3 random)
- [ ] Verify trigger tags match signal type
- [ ] Check that all percentages calculate correctly
- [ ] Confirm recommended actions align with validity rating
- [ ] Save audit file with naming convention: `AUDIT_[COMPANY]_[DATE].md`

---

## SCALING TO 110 REMAINING COMPANIES

### Batch Strategy

**Batch 1 (Companies 11-20):** 2.5 hours
**Batch 2 (Companies 21-30):** 2.5 hours
**Batch 3 (Companies 31-50):** 5 hours (20 companies)
**Batch 4 (Companies 51-70):** 5 hours (20 companies)
**Batch 5 (Companies 71-90):** 5 hours (20 companies)
**Batch 6 (Companies 91-120):** 5 hours (30 companies)

**Total Time: ~25 hours for 110 companies**
**Per operator (6 batches): ~4-5 hours of focused work**

### Process Optimization as You Scale

1. **Document repeatable searches** (e.g., "Crunchbase search syntax for [Company]")
2. **Build source library** (curated list of where each company publishes)
3. **Template repetition** (reuse trigger mappings for similar signal types)
4. **Batch validation** (review 10% of completed audits for consistency)

### Quality Assurance Post-Audit

- Spot-check 15% of audits (verify 2-3 URLs per audit)
- Recalculate verification percentages
- Flag any audits with <50% verification for re-review
- Document inconsistencies in tagging across batches

---

## OUTPUT DELIVERABLES

### Files to Generate

1. **AUDIT_SPECIFICATION.md** (this file)
   - Complete workflow definition
   - Quality gates and decision rules
   - Timing and parallelization strategy

2. **AUDIT_TEMPLATE.md**
   - Blank template for single company
   - Pre-populated sections to fill in
   - Example formatting

3. **AUDIT_PROCESS_CHECKLIST.md**
   - Step-by-step execution guide
   - Timing checkpoints
   - Quality gates at each phase

4. **[10 company audits]** - Individual files
   - One file per company
   - Naming: `AUDIT_[COMPANY]_[DATE].md`
   - Fully populated with verification results

### Naming Convention

```
AUDIT_[COMPANY_NAME]_[YYYY-MM-DD].md
AUDIT_ADAPTIVE_SECURITY_2025-02-01.md
AUDIT_ZENITY_2025-02-01.md
etc.
```

### Archive & Export

After completion:
1. Create `/audits/` directory
2. Move all 10 company audits to `/audits/batch_01/`
3. Generate summary report: `AUDIT_SUMMARY_BATCH_01.md`
4. Export to JSON for database ingestion (optional)

---

## SUCCESS CRITERIA

### Speed Targets
- ✓ Complete 10 companies in <2.5 hours
- ✓ Average <15 min per company
- ✓ Zero signals taking >3 min to verify

### Accuracy Targets
- ✓ 95%+ verification accuracy (URLs match claimed signals)
- ✓ 100% trigger taxonomy mapping
- ✓ 0% unresolved ambiguities (clear VERIFIED/UNVERIFIED decision)

### Quality Targets
- ✓ All signals have source URL or clear reason for UNVERIFIED
- ✓ All verification times logged and <2 min per signal
- ✓ All confidence adjustments documented
- ✓ Validity rating justified by data

### Scalability Targets
- ✓ Template applies to all 120 companies without modification
- ✓ Process can be executed by multiple operators in parallel
- ✓ 110 remaining companies auditable in <25 hours

---

## NEXT STEPS AFTER AUDIT COMPLETION

### Phase 1: Validation (30 min)
1. Spot-check 15% of audits (2-3 URLs per audit)
2. Verify trigger tags align with signal type
3. Confirm all percentages calculate correctly

### Phase 2: Consolidation (1 hour)
1. Aggregate all 10 company audits into master report
2. Generate statistics:
   - Overall verification rate across 10 companies
   - Top verified triggers
   - Most common unverified signal types
3. Identify patterns in data quality

### Phase 3: Scaling (As needed)
1. Apply same process to remaining 110 companies
2. Build source library from verified URLs
3. Create trigger distribution analysis
4. Generate sales intelligence output

### Phase 4: Output Generation
1. Export verified signals to CRM/sales platform
2. Create trigger map visualization
3. Generate company reliability report
4. Archive all audit trails for reproducibility

---

## TROUBLESHOOTING GUIDE

| Issue | Solution |
|-------|----------|
| Can't find signal source | Mark as UNVERIFIED after 2 min, don't continue searching |
| Conflicting dates/amounts | Document both, use most credible source, flag as PARTIALLY_VERIFIED |
| Company has no signals | Valid - set total-signals to 0, validity-rating to UNKNOWN |
| Signal appears inferred | Mark as UNVERIFIED, note "No primary source found" |
| Search taking too long | Set timer to 2 min, make binary decision (stop searching) |
| Unclear trigger mapping | Choose most specific sub-category, document choice |
| Audit taking >15 min | Focus on 3-4 highest confidence signals, mark others UNVERIFIED |

---

## REFERENCES

### Trigger Taxonomy Source
- Sales Intelligence Trigger Framework (Internal)
- Go-to-Market Event Classification System

### Search Resources
- Google News/Search for primary announcements
- Crunchbase for funding events
- TechCrunch for tech news
- PitchBook for institutional funding data
- LinkedIn for executive changes
- Company websites for press releases

### Example Verified Sources
- Company press releases (domain/press-releases/)
- CEO/founder Twitter accounts (verified)
- TechCrunch, VentureBeat, Forbes articles
- Crunchbase/PitchBook entries with source links
- SEC EDGAR filings

---

**Version:** 1.0
**Last Updated:** 2025-02-01
**Status:** Ready for Execution
