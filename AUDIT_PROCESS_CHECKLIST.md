# FAST AUDIT AGENT: EXECUTION CHECKLIST

**Quick-start guide for operators running company audits**

---

## PRE-AUDIT SETUP (5 minutes)

### Environment Preparation
- [ ] Open 2-3 browser tabs (keep 1 for company page, others for search)
- [ ] Bookmark these resources:
  - [ ] Google Search
  - [ ] Crunchbase (crunchbase.com)
  - [ ] TechCrunch (techcrunch.com)
  - [ ] Company LinkedIn (linkedin.com/company/)
- [ ] Have AUDIT_TEMPLATE.md open in editor
- [ ] Set timer for 2.5 hours (for 10 companies)

### Documentation Setup
- [ ] Create `/audits/batch_01/` folder
- [ ] Prepare naming convention: `AUDIT_[COMPANY]_[DATE].md`
- [ ] Have FAST_AUDIT_AGENT_SPECIFICATION.md accessible as reference

### Company List Review
- [ ] Receive list of 10 companies to audit
- [ ] Verify each company has accessible profile/page
- [ ] Note any companies with known signal counts
- [ ] Flag any companies that are private/difficult to research

**Estimated Setup Time: 3-5 minutes**

---

## PHASE 1: SIGNAL EXTRACTION (1 minute per company)

### Steps

**For each company:**

1. **Open company page/profile**
   - [ ] Navigate to company data source
   - [ ] Verify page loads and contains signal information
   - [ ] Scroll through entire page to find all signals
   - [ ] Take mental note of signal count

2. **Extract signal metadata**
   - [ ] Read signal description carefully
   - [ ] Identify date (YYYY-MM-DD if available, YYYY-MM if only month known)
   - [ ] Classify signal type (e.g., "Funding", "Product Launch", "Hiring")
   - [ ] Note stated confidence level (LOW / MEDIUM / HIGH)
   - [ ] Identify any specific details (amounts, participants, locations)

3. **Document extraction**
   - [ ] Copy signal description verbatim (for accuracy)
   - [ ] List all claimed participants/companies
   - [ ] Note any missing metadata (flag these)
   - [ ] Count total signals

4. **Quality gate**
   - [ ] Does each signal have date + description?
     - [ ] YES → Continue to verification
     - [ ] NO → Flag signal as "missing metadata", note in audit trail
   - [ ] Is date in valid format?
     - [ ] YES → Continue
     - [ ] NO → Standardize to YYYY-MM-DD

**⏱️ Target Time: 1 minute per company**
**⏰ Checkpoint: Stop at 1 min mark, move to verification phase**

---

## PHASE 2: SIGNAL VERIFICATION (10-15 minutes per company)

### Verification Process Overview

For each signal, follow this decision tree:

```
START (Signal)
│
├─ Search for PRIMARY SOURCE (1 min)
│  ├─ FOUND ✓ → Document URL + mark VERIFIED → NEXT SIGNAL
│  └─ NOT FOUND → Continue
│
├─ Search for SECONDARY SOURCE (1 min)
│  ├─ FOUND ✓ → Document URL + mark VERIFIED/PARTIALLY_VERIFIED → NEXT SIGNAL
│  └─ NOT FOUND → Continue
│
├─ Search for TERTIARY SOURCE (≤30 sec)
│  ├─ FOUND ✓ → Document URL + mark PARTIALLY_VERIFIED → NEXT SIGNAL
│  └─ NOT FOUND at 2-min mark → Mark UNVERIFIED → NEXT SIGNAL
│
END (Move to Next Signal or Phase 3)
```

### Step-by-Step Verification

**For each signal (maximum 3-5 signals per company):**

#### Search Step 1: Primary Sources (Target: <1 minute)

**Goal:** Find company announcement, official press release, or founder statement

**Search Strategy:**
1. Try site-specific search: `site:company.com "keyword from signal"`
   - [ ] Company press releases page
   - [ ] Blog posts from company domain
   - [ ] CEO/founder Twitter (@ceoname + keywords)

2. If not found, try: `"Company Name" "specific detail" 2025`
   - [ ] Example: `"Adaptive Security" Series A $43M 2025`

3. If not found, try: `"Company Name" announcement news`

**Decision at 1 min:**
- [ ] **FOUND primary source?**
  - ✓ YES → Record URL, mark **VERIFIED**, move to next signal
  - ✗ NO → Proceed to Step 2

---

#### Search Step 2: Secondary Sources (Target: 1-1.5 minutes)

**Goal:** Find news coverage from reputable tech outlets or official funding databases

**Search Strategy:**
1. Try tech news outlets: `TechCrunch "Company Name" [signal keyword]`
   - [ ] TechCrunch
   - [ ] VentureBeat
   - [ ] Forbes
   - [ ] Wall Street Journal

2. Try funding databases: `Crunchbase "Company Name"`
   - [ ] Look for funding rounds with dates
   - [ ] Check source links in Crunchbase

3. If funding event: `PitchBook "Company Name"`

**Decision at 2 min total:**
- [ ] **FOUND secondary source?**
  - ✓ YES (news outlet) → Record URL, mark **VERIFIED**, move to next signal
  - ✓ YES (database) → Record URL, mark **PARTIALLY_VERIFIED**, move to next signal
  - ✗ NO → Proceed to Step 3 (only if time remains, typically stop here)

---

#### Search Step 3: Tertiary/Validation Sources (Target: <30 sec)

**Goal:** Cross-check via LinkedIn, additional databases, or conference announcements

**Search Strategy:**
1. LinkedIn profile or company page
   - [ ] Look for posts about hiring/announcements
   - [ ] Check "About" section for timeline

2. Founder/leadership LinkedIn announcements
   - [ ] CEO announcing new role
   - [ ] Executives posting about funding

**Decision at 2 min mark (hard stop):**
- [ ] **FOUND any credible source?**
  - ✓ YES → Record URL, mark **PARTIALLY_VERIFIED**, move to next signal
  - ✗ NO → Mark **UNVERIFIED**, do NOT continue searching, move to next signal

---

### Verification Quality Gates

| When to Stop Searching | Action |
|------------------------|--------|
| Primary source found | STOP - Mark VERIFIED |
| Secondary source found | STOP - Mark VERIFIED or PARTIALLY_VERIFIED |
| 2 minutes elapsed | STOP - Mark UNVERIFIED |
| 3 sources conflicting | STOP - Document conflict, mark PARTIALLY_VERIFIED, flag for review |

### Handling Special Cases

**Case 1: Multiple sources with different dates**
- Record most credible source (primary > secondary > tertiary)
- Note date discrepancy in audit trail
- Mark PARTIALLY_VERIFIED if conflict significant (>30 days)

**Case 2: Signal amount differs by >10% from source**
- Example: Signal claims $43M, Crunchbase says $38M
- Document both amounts
- Mark PARTIALLY_VERIFIED
- Flag for manual verification

**Case 3: Company name variations**
- Example: "Adaptive Security" vs "Adaptive Security Inc"
- Try variations in search
- Accept as same company if obvious match
- Include note in audit

**Case 4: Executive hiring with no press release**
- Search LinkedIn for profile change/announcement
- Mark PARTIALLY_VERIFIED if confirmed on LinkedIn
- Mark UNVERIFIED if no confirmation found

### Verification Checklist Per Signal

- [ ] Signal description clearly understood
- [ ] Search Step 1 completed (primary source)
  - [ ] Time invested: ___ minutes
  - [ ] Result: ✓ FOUND / ✗ NOT FOUND
  - [ ] URL: [if found: ___] or [not found]
- [ ] Search Step 2 completed (secondary source) OR at 2-min mark
  - [ ] Time invested: ___ minutes
  - [ ] Result: ✓ FOUND / ✗ NOT FOUND
  - [ ] URL: [if found: ___] or [not found]
- [ ] Decision made:
  - [ ] VERIFIED (primary or secondary source found)
  - [ ] PARTIALLY_VERIFIED (tertiary source or database entry)
  - [ ] UNVERIFIED (no source found after 2 min)
- [ ] Confidence level adjusted
  - [ ] Original: [LOW/MEDIUM/HIGH]
  - [ ] Adjusted to: [LOW/MEDIUM/HIGH]
  - [ ] Reason: [e.g., "Confirmed via TechCrunch", "No source found"]

**⏱️ Target Time: 2-3 min per signal**
**⏰ Total per company: 10-15 minutes (3-5 signals)**

---

## PHASE 3: DOCUMENTATION & TRIGGER TAGGING (3 minutes per company)

### Step 1: Organize Signals Hierarchically (1 minute)

- [ ] Sort signals by date (newest first)
- [ ] Group by signal type if applicable
- [ ] Create hierarchical structure in audit document

### Step 2: Map to Trigger Taxonomy (1.5 minutes)

**For each VERIFIED signal:**

1. Identify primary trigger category
   - [ ] Capital Events
   - [ ] Executive Hiring
   - [ ] Go-to-Market
   - [ ] Product Engineering
   - [ ] Partnerships
   - [ ] Traction & Validation
   - [ ] Geographic/Operational
   - [ ] Organizational Culture
   - [ ] Risk & Decline
   - [ ] Customer Success

2. Select sub-category (from SPECIFICATION.md)
   - [ ] Example: Capital Events > Funding > Series A-C

3. Select specific type
   - [ ] Example: Series A Round

4. Document trigger tags
   - [ ] Format: `#Capital-Events #Funding-Series-A`

5. Estimate lead time
   - [ ] Reference lead-time table in SPECIFICATION.md
   - [ ] Document expected timeline to impact

**Decision Tree for Trigger Mapping:**

```
Is signal financial?
├─ YES → Capital Events (funding/M&A/debt)
└─ NO → Continue

Is signal hiring-related?
├─ YES → Executive Hiring
└─ NO → Continue

Is signal sales/go-to-market?
├─ YES → Go-to-Market
└─ NO → Continue

Is signal product/feature?
├─ YES → Product Engineering
└─ NO → Continue

Is signal partnership/integration?
├─ YES → Partnerships
└─ NO → Continue

Is signal achievement/award?
├─ YES → Traction & Validation
└─ NO → Continue

Is signal geographic/expansion?
├─ YES → Geographic/Operational
└─ NO → Continue

Is signal team/organizational?
├─ YES → Organizational Culture
└─ NO → Continue

Is signal negative (departure/layoff)?
├─ YES → Risk & Decline
└─ NO → Continue

Is signal customer success?
├─ YES → Customer Success
└─ NO → Other
```

### Step 3: Calculate Metrics (1 minute)

- [ ] Total signals: X
- [ ] Verified signals: Y
- [ ] Partially verified signals: Z
- [ ] Unverified signals: W
- [ ] Verification rate: Y/X = ___%
- [ ] Validity rating:
  - [ ] 90-100% verified → EXCELLENT
  - [ ] 75-89% verified → GOOD
  - [ ] 50-74% verified → FAIR
  - [ ] <50% verified → POOR

### Step 4: Populate Audit Document (2-3 minutes)

- [ ] Copy template to new file
- [ ] Fill in company metadata
- [ ] Populate each signal section with:
  - [ ] Claim (description)
  - [ ] Search time
  - [ ] Source URL
  - [ ] Verification status
  - [ ] Confidence adjustment
  - [ ] Trigger tags
  - [ ] Trigger taxonomy
  - [ ] Lead time
  - [ ] Recommended action
- [ ] Complete summary section:
  - [ ] Verification breakdown (counts + %)
  - [ ] Validity assessment
  - [ ] Trigger distribution table
  - [ ] Recommended actions (keep/investigate/remove)
- [ ] Add audit notes
  - [ ] Overall impression
  - [ ] Data gaps identified
  - [ ] Quality issues
  - [ ] Suggestions for future audits

### Step 5: Final Review (1 minute)

- [ ] Check all URLs in browser (spot-check 3 random)
  - [ ] Click each URL, verify it opens
  - [ ] Confirm content matches signal description
- [ ] Verify all percentages calculate correctly
- [ ] Confirm trigger tags are consistent
- [ ] Check that recommended actions align with verification status
- [ ] Save file with naming convention: `AUDIT_[COMPANY]_[DATE].md`

**⏱️ Target Time: 3 minutes per company**

---

## FULL AUDIT CYCLE: TIMING CHECKPOINT

### Expected Timeline for 10 Companies

| Phase | Per Company | 10 Companies | Cumulative |
|-------|------------|--------------|-----------|
| Setup | — | 5 min | 5 min |
| Extraction | 1 min | 10 min | 15 min |
| Verification | 12 min | 120 min | 135 min |
| Documentation | 3 min | 30 min | 165 min |
| **Validation** | — | 10 min | **175 min** |
| **TOTAL** | 16 min | 160 min | **2.9 hours** |

**Target: <2.5 hours for 10 companies**

### Timing Optimization

**If running behind schedule:**
1. Reduce per-signal verification time to 90 seconds max
2. Search only for primary/secondary sources (skip tertiary)
3. Mark any signal taking >2 min as UNVERIFIED immediately
4. Complete documentation in batch (after all extractions done)

**If running ahead:**
1. Conduct additional spot-checks on URLs
2. Research top 1-2 unverified signals more deeply
3. Create bonus analysis (trigger distribution, data quality metrics)

---

## QUALITY CHECKPOINTS

### At Extraction (1 min mark)
- [ ] All signals identified on company page?
- [ ] Dates properly formatted?
- [ ] Descriptions accurately captured?
- **GATE:** If <80% confidence in extraction, redo before verification

### At Verification (2 min per signal)
- [ ] Was search systematic (primary → secondary → tertiary)?
- [ ] Time limit (2 min) respected?
- [ ] Decision made and documented?
- **GATE:** If verification taking >3 min per signal, mark UNVERIFIED and move on

### At Documentation (3 min mark)
- [ ] All signals mapped to trigger taxonomy?
- [ ] Percentages calculated correctly?
- [ ] URLs tested in browser?
- **GATE:** If errors found, fix immediately before saving

### At Validation (Post-audit)
- [ ] Spot-check 3 random signals (verify URLs work)
- [ ] Recalculate percentages manually
- [ ] Confirm validity rating justified by data
- [ ] Check for any obvious inconsistencies
- **GATE:** If >2 errors found, re-audit that company

---

## DECISION TREE: WHEN TO MARK EACH STATUS

### Flow Chart for Verification Status

```
START: Have source been found?

├─ Company announcement/press release found?
│  └─ YES → VERIFIED ✓
│
├─ Major news outlet (TechCrunch, VentureBeat) found?
│  └─ YES → VERIFIED ✓
│
├─ Funding database with primary source link?
│  └─ YES → VERIFIED ✓
│
├─ Funding database without linked primary source?
│  └─ YES → PARTIALLY_VERIFIED ~
│
├─ Multiple secondary sources corroborate?
│  └─ YES → PARTIALLY_VERIFIED ~
│
├─ LinkedIn profile confirms (with verification badge)?
│  └─ YES → PARTIALLY_VERIFIED ~
│
├─ Sources conflict on date/amount?
│  └─ YES → PARTIALLY_VERIFIED ~ (flag for review)
│
└─ No source found after 2 min exhaustive search?
   └─ YES → UNVERIFIED ✗
```

### When to DEFINITELY Mark VERIFIED
- ✓ Company press release with matching date/amount
- ✓ TechCrunch/VentureBeat article with matching details
- ✓ Crunchbase entry with linked source document
- ✓ CEO tweet or public statement with verification

### When to DEFINITELY Mark PARTIALLY_VERIFIED
- ~ Crunchbase entry without linked primary source (but amount matches)
- ~ Multiple secondary sources corroborate, but primary not found
- ~ LinkedIn profile update (less authoritative than announcement)
- ~ Date confirmed but specific amount not

### When to DEFINITELY Mark UNVERIFIED
- ✗ Signal appears inferred from job postings
- ✗ Rumor on social media without confirmation
- ✗ Search exhausted at 2-min mark with no results
- ✗ Source contradicts signal details significantly (>10% variance)

---

## COMMON PITFALLS & SOLUTIONS

| Pitfall | Solution |
|---------|----------|
| Spending >2 min per signal | Set alarm at 1:30 mark, decide at 2 min exactly |
| Searching for "perfect" source | Accept secondary source after primary not found in 1 min |
| Forgetting to document search time | Log time as you search, not after |
| Inconsistent trigger tagging | Use SPECIFICATION.md as reference, double-check categories |
| Copying signal descriptions incorrectly | Read twice before copying, paste verbatim |
| Calculating percentages wrong | Use formula: (Verified / Total) × 100 = % |
| Not testing URLs before saving | Spot-check 3 random URLs in each audit before closing |
| Audit taking >15 min per company | Reduce signals verified to top 3, mark others UNVERIFIED |

---

## PARALLEL PROCESSING (Multiple Operators)

### Setup for 2 Operators (75 min total)

**Operator A: Extraction & Documentation**
- Extracts signals for companies 1-5
- Documents findings as Operator B verifies

**Operator B: Verification**
- Verifies signals from Operator A's first batch
- While A moves to next extraction

**Timeline:**
- Companies 1-5: Parallel (Extraction 5 min, Verification 60 min overlap)
- Companies 6-10: Parallel (same pattern)
- Total: ~75 minutes

---

## POST-AUDIT VALIDATION (10 minutes)

### Validation Checklist

- [ ] **Spot-check 15% of audits** (2 out of 10 = 2 audits)
  - [ ] Audit 1: Test 3 URLs
  - [ ] Audit 2: Test 3 URLs
  - [ ] All URLs clickable and content matches?

- [ ] **Verify calculations**
  - [ ] Pick 3 random audits
  - [ ] Manually count: verified + partially_verified + unverified
  - [ ] Confirm percentages match calculated values
  - [ ] Check: X + Y + Z = Total?

- [ ] **Review trigger tags**
  - [ ] Pick 5 random signals
  - [ ] Confirm trigger tag matches signal type
  - [ ] Confirm taxonomy path is specific and correct

- [ ] **Consistency review**
  - [ ] Are similar signal types tagged identically across companies?
  - [ ] Do validity ratings align with verification percentages?
  - [ ] Are recommended actions justified?

### Validation Results

- [ ] **No errors found** → Complete, ready for archive
- [ ] **1-2 errors found** → Minor fixes, re-save
- [ ] **>2 errors found** → Re-audit that company, repeat validation

---

## COMPLETION CHECKLIST

### Before Marking Audit COMPLETE

**For each of 10 companies:**
- [ ] Extraction phase completed (all signals identified)
- [ ] Verification phase completed (all signals 2-min searched)
- [ ] Documentation phase completed (all fields filled)
- [ ] Trigger tags assigned (all verified signals mapped)
- [ ] Metrics calculated (percentages correct)
- [ ] Validity rating assigned (justified by data)
- [ ] Recommended actions documented
- [ ] File saved with naming convention
- [ ] Spot-check validation passed

**For entire audit batch:**
- [ ] 10 audit files created and saved
- [ ] Total time <2.5 hours
- [ ] All URLs tested (spot-check)
- [ ] 0 unresolved ambiguities
- [ ] All trigger tags consistent
- [ ] Summary statistics compiled
- [ ] Ready for next phase (scaling to 110 companies)

---

## NEXT STEPS AFTER COMPLETION

1. **Consolidate** all 10 audits into master report
2. **Generate statistics** (overall verification rate, top triggers)
3. **Archive files** in `/audits/batch_01/` with timestamp
4. **Export to JSON** for database ingestion (if needed)
5. **Review lessons learned** and document optimization tips
6. **Prepare for scaling** to remaining 110 companies

---

## REFERENCE MATERIALS

**Always have these accessible:**
1. FAST_AUDIT_AGENT_SPECIFICATION.md (full workflow)
2. Trigger Taxonomy (trigger categories + lead times)
3. Source Credibility Hierarchy (what counts as verified)
4. Decision Rules (when to mark each status)

**Bookmark for quick searches:**
- Google Search
- Crunchbase
- TechCrunch
- VentureBeat
- LinkedIn

---

**Version:** 1.0
**Last Updated:** 2025-02-01
**Status:** Ready for Execution
