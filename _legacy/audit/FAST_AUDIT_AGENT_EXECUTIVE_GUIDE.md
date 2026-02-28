# FAST AUDIT AGENT: EXECUTIVE GUIDE

**Complete overview for implementing the audit system across 120 companies**

---

## WHAT IS THE FAST AUDIT AGENT?

The Fast Audit Agent is a systematic process for validating company signals with extreme speed and precision. It answers critical questions:

1. **Are the signals in our database real?** (Verification)
2. **Which signals are hallucinated or inferred?** (Classification)
3. **How reliable is each company's dataset?** (Validity Rating)
4. **Which signals trigger sales conversations?** (Trigger Taxonomy)

**Key Metrics:**
- Process 10 companies in 2.5 hours
- Verify 95%+ of signals with credible sources
- Classify 100% of verified signals with trigger taxonomy
- Scale to 120 companies in ~30 hours of focused work

---

## WHY THIS MATTERS

### Problem

Your database contains ~500 signals across 120 companies. But are they credible?

- Some signals verified (announced by company)
- Some signals partially verified (mentioned in news)
- **Some signals unverified (inferred from job postings, rumors, or historical patterns)**

Without verification, you risk:
- Showing unverified "signals" to sales teams (credibility damage)
- Basing customer research on hallucinated events
- Missing critical signals that are actually verified
- Wasting sales team time on false positives

### Solution

The Fast Audit Agent:
1. **Quickly verifies each signal** (2-3 min per signal, max)
2. **Separates verified from hallucinated** (clear VERIFIED/UNVERIFIED classification)
3. **Maps to trigger taxonomy** (sales teams know why signal matters)
4. **Rates company reliability** (EXCELLENT/GOOD/FAIR/POOR)
5. **Scales to full database** (systematic process, reproducible results)

### Outcome

Clean, credible signal database ready for:
- Sales intelligence platform
- Prospect research
- Customer success expansion
- Board/investor presentations

---

## THE AUDIT PROCESS AT A GLANCE

### 3-Phase Workflow

**Phase 1: Extraction (1 min per company)**
- Read all signals for one company
- Extract: date, type, description, confidence
- Count total signals

**Phase 2: Verification (12 min per company)**
- For each signal: Search for credible source
- Decision tree: Primary source → Secondary → Tertiary → Unverified
- 2-minute hard stop per signal
- Document URL + verification status

**Phase 3: Documentation (3 min per company)**
- Organize signals hierarchically
- Map to trigger taxonomy
- Calculate verification metrics
- Rate company reliability
- Generate recommended actions

**Total: 16 min per company | 160 min for 10 | 2.7 hours**

---

## QUICK START: AUDIT YOUR FIRST COMPANY IN 15 MINUTES

### Materials Needed

1. **AUDIT_TEMPLATE.md** (blank template)
2. **FAST_AUDIT_AGENT_SPECIFICATION.md** (reference guide)
3. **Browser** (Google, Crunchbase, TechCrunch bookmarked)
4. **Timer** (15 minutes)

### Step-by-Step (15 min)

**Minute 0-1: Extraction**
- [ ] Open company page
- [ ] Read all signals
- [ ] List: dates, descriptions, types
- [ ] Count total signals

**Minute 1-13: Verification (3-5 signals)**
- [ ] For Signal 1:
  - [ ] Search: "Company Name + keyword" (Google, 1 min)
  - [ ] Found? Record URL, mark VERIFIED
  - [ ] Not found? Search TechCrunch (1 min)
  - [ ] Found? Record URL, mark VERIFIED
  - [ ] Not found? Mark UNVERIFIED at 2-min mark
- [ ] Repeat for Signals 2-5 (2-3 min each)

**Minute 13-15: Documentation**
- [ ] Copy completed audit to template
- [ ] Map each signal to trigger category
- [ ] Calculate: X verified / Y total = Z%
- [ ] Assign validity rating (EXCELLENT/GOOD/FAIR/POOR)
- [ ] Save file: `AUDIT_[COMPANY]_2025-02-01.md`

---

## KEY DECISION RULES

### The Verification Matrix

```
Does company press release exist with matching details?
├─ YES → VERIFIED ✓ (Done. Stop searching.)
└─ NO → Continue

Does major news outlet cover this (TechCrunch, VentureBeat)?
├─ YES → VERIFIED ✓ (Done. Stop searching.)
└─ NO → Continue

Does funding database (Crunchbase) have entry with source link?
├─ YES → VERIFIED ✓ (Done. Stop searching.)
└─ NO → Continue

Does Crunchbase have entry WITHOUT source link?
├─ YES → PARTIALLY_VERIFIED ~ (Done. Stop searching.)
└─ NO → Continue

Have you searched for 2 minutes?
├─ YES → UNVERIFIED ✗ (Stop immediately. Move to next signal.)
└─ NO → Keep searching (but max 2 min)
```

### Confidence Adjustments

- **MEDIUM → HIGH:** Primary source confirms exact details
  - Example: Series A from official press release

- **MEDIUM → MEDIUM:** Secondary source confirms, minor details uncertain
  - Example: Crunchbase entry matches but amount slightly different

- **HIGH → LOW:** No source found despite high initial confidence
  - Example: "Product launch" claimed but no press release/announcement found

- **LOW → MEDIUM:** Unexpected source found validates initial skepticism
  - Example: Small company mentioned in Forbes (elevated from LOW to MEDIUM)

---

## THE TRIGGER TAXONOMY: 10 CATEGORIES

Every verified signal must map to ONE category:

| # | Category | Example Signals | Lead Time |
|---|----------|-----------------|-----------|
| 1 | **Capital Events** | Series A, Series B, M&A, IPO | 30-180 days |
| 2 | **Executive Hiring** | VP Sales, CTO hire, Board member | 30-60 days |
| 3 | **Go-to-Market** | Sales hiring, partner programs | 30-90 days |
| 4 | **Product Engineering** | Product launch, feature release, AI integration | 60-180 days |
| 5 | **Partnerships** | Channel partner, tech integration, co-marketing | 30-180 days |
| 6 | **Traction & Validation** | Gartner award, analyst recognition, major customer | 60-180 days |
| 7 | **Geographic/Operational** | International expansion, new office, HQ move | 60-180 days |
| 8 | **Organizational Culture** | Restructuring, headcount milestone, M&A integration | Varies |
| 9 | **Risk & Decline** | Executive departure, layoffs, down round | Varies |
| 10 | **Customer Success** | Enterprise customer hire, retention focus | 60-180 days |

**Why it matters:** Trigger categories predict sales opportunities with different timelines and strategies.

---

## SCALING TO 120 COMPANIES

### Timeline

**Batch 1 (10 companies):** 2.5 hours
**Batch 2 (10 companies):** 2.5 hours (total: 5 hours)
**Batch 3 (20 companies):** 5 hours (total: 10 hours)
**Batch 4 (20 companies):** 5 hours (total: 15 hours)
**Batch 5 (20 companies):** 5 hours (total: 20 hours)
**Batch 6 (30 companies):** 7.5 hours (total: 27.5 hours)

**Total: ~27.5 hours for all 120 companies**

### Batch Strategy

1. **Batch 01 (Companies 1-10):** Reference implementation
   - Use Wiz audit as example
   - Perfect process, document lessons learned
   - Expected: 2.5 hours

2. **Batch 02-03 (Companies 11-30):** Optimized execution
   - Apply lessons from Batch 01
   - Faster verification times as you learn search patterns
   - Expected: 5 hours

3. **Batch 04-06 (Companies 31-120):** Full-scale operation
   - 20-30 companies per batch
   - Experienced operators (not learning anymore)
   - Expected: 18 hours total

### Parallelization

**Option 1: Single Operator (Sequential)**
- One person completes all batches sequentially
- Total time: 27.5 hours of focused work
- Quality: Consistent, one voice/approach

**Option 2: Two Operators (Parallel Batches)**
- Operator A: Batches 1-3 (12.5 hours)
- Operator B: Batches 4-6 (15 hours)
- Total wall time: ~15 hours (staggered)
- Quality: Consistent approach, cross-check at midpoint

**Option 3: Three Operators (Wave Processing)**
- Wave 1: 5 companies each (3 operators in parallel = 5 hours)
- Wave 2: 5 companies each (3 operators in parallel = 5 hours)
- Continue through all 120
- Total wall time: ~40 hours (if waves run serially) or 5 hours (if true parallel)
- Risk: Coordinate handoffs, ensure consistency

**Recommended:** Option 2 (Two operators) = Best balance of speed + quality + consistency

---

## QUALITY ASSURANCE FRAMEWORK

### Pre-Audit QA (5 min)
- [ ] Verify company page accessible
- [ ] Confirm audit template ready
- [ ] Test search tools (Google, Crunchbase)
- [ ] Confirm timer functionality

### Per-Audit QA (1 min)
- [ ] All signals extracted?
- [ ] Extraction metadata complete?
- [ ] All verification times logged?
- [ ] All URLs clickable?

### Batch QA (10 min per batch)
- [ ] Spot-check 15% of audits (2 out of 10)
- [ ] For each spot-check:
  - [ ] Verify 3 random URLs
  - [ ] Recalculate percentages
  - [ ] Check trigger tag consistency
  - [ ] Confirm validity rating justified
- [ ] Fix any errors and re-save

### Post-Audit QA (Ongoing)
- [ ] Track verification rates by batch
- [ ] Monitor if rates dropping (process fatigue)
- [ ] Check for consistency in trigger tagging
- [ ] Flag any companies with <50% verification

---

## COMMON CHALLENGES & SOLUTIONS

### Challenge 1: "I Can't Find This Signal Anywhere"

**Why it happens:**
- Signal is too old (pre-2020)
- Signal is inferred/hallucinated
- Company is very early-stage with limited press coverage
- Company name variations (XYZ Inc vs XYZ Labs)

**Solution:**
- Stop searching after 2 minutes
- Mark as UNVERIFIED
- Document: "No credible source found after 2-min search"
- Move to next signal (don't waste time)

### Challenge 2: "Conflicting Information - Different Dates/Amounts"

**Why it happens:**
- Different press outlets report slightly different amounts
- Date variations (announced date vs close date)
- Company refinances/restructures rounds

**Solution:**
- Use most credible source (primary > secondary > tertiary)
- Document both versions in audit trail
- If difference >10%: Mark PARTIALLY_VERIFIED
- If difference minor: Mark VERIFIED with note

### Challenge 3: "Audit Taking Longer Than 15 Min"

**Why it happens:**
- Verifying too many signals (>5 per company)
- Spending >2 min per signal
- Perfectionism in documentation

**Solution:**
- Focus on top 3-4 highest-confidence signals
- Mark others UNVERIFIED if you hit time limit
- Save documentation for batch-level summary
- Remember: 15 min is target, not hard deadline

### Challenge 4: "Company Has No Signals or Unreliable Data"

**Why it happens:**
- Early-stage company with no public info
- Stealth mode company
- Data quality issues in source database

**Solution:**
- Valid outcome: Mark as "0 signals verified"
- Document: "Company in stealth mode" or "Limited public information"
- Validity rating: UNKNOWN or POOR
- Recommendation: "Requires manual research or skip"

### Challenge 5: "Need to Verify Signal About Executive Hiring"

**Why it happens:**
- Executive changes are harder to find than funding
- May not have press release
- LinkedIn is primary source

**Solution:**
1. Search company press releases first (1 min)
2. Search LinkedIn company announcements (1 min)
3. Check executive's LinkedIn profile (30 sec)
   - Profile change/new position often shows in feed
   - Connections can confirm
4. If found on LinkedIn with verification badge: PARTIALLY_VERIFIED
5. If found on company blog/press release: VERIFIED
6. If nothing found: UNVERIFIED (after 2 min)

---

## OUTPUT DELIVERABLES

### Per-Audit Deliverable

Each completed audit includes:

1. **Metadata Section**
   - Company name, stage, domain
   - Total signals count
   - Audit date, auditor, status

2. **Quick Stats**
   - Verified count + %
   - Partially verified count + %
   - Unverified count + %
   - Validity rating (EXCELLENT/GOOD/FAIR/POOR)

3. **Signal Details** (nested structure)
   - Claim (description, confidence, details)
   - Verification process (search strategy)
   - Result (URL, source type, verification status)
   - Trigger classification (tags, taxonomy, lead time)
   - Recommendation (keep/investigate/remove)

4. **Summary**
   - Verification breakdown table
   - Validity assessment reasoning
   - Trigger distribution
   - Recommended actions
   - Data gaps identified
   - Quality issues noted

5. **Audit Trail**
   - Start/end time, total duration
   - Search tools used
   - Completion checklist

6. **Appendix**
   - Source references (URLs tested)
   - Search queries attempted
   - Special notes for future auditors

### Batch-Level Deliverable

After completing 10 companies:

1. **Master Index** (`AUDIT_BATCH_01_MASTER_INDEX.md`)
   - Overview of all 10 companies
   - Timeline and execution metrics
   - Batch statistics
   - Next steps

2. **Summary Report** (`AUDIT_SUMMARY_BATCH_01.md`)
   - Cross-company statistics
   - Verification rates by domain
   - Top triggers identified
   - Data quality insights
   - Recommendations for Batch 02

3. **Lessons Learned Document**
   - What went well
   - What took longer than expected
   - Optimization opportunities
   - Companies with special considerations

### Full Database Deliverable

After all 120 companies audited:

1. **Master Audit Report** (`AUDIT_MASTER_REPORT_120_COMPANIES.md`)
   - Comprehensive statistics (120 companies, ~500 signals)
   - Verification rates by company stage
   - Verification rates by domain
   - Trigger distribution across all companies
   - Data quality ranking of companies

2. **Clean Signal Database** (JSON export)
   - Only VERIFIED signals
   - Each signal tagged with trigger category
   - Validity rating for each company
   - Recommended for sales intelligence

3. **Flagged Signals Report**
   - All UNVERIFIED signals
   - Recommendation: Remove or investigate further?
   - Which unverified signals to prioritize for follow-up

4. **Scalability Recommendations**
   - Process efficiency metrics
   - Cost analysis (hours per company)
   - Training recommendations for new operators
   - Automation opportunities identified

---

## REAL-WORLD EXECUTION EXAMPLE

### Scenario: Audit Batch 01 (10 Companies, 2 Operators)

**Setup (Day 0, 1 hour)**
- Operators A & B meet for 15 min
- Review FAST_AUDIT_AGENT_SPECIFICATION.md
- Review Wiz example audit
- Confirm tools/resources available
- Establish communication protocol
- Define quality gates

**Execution (Day 1, 2.5 hours)**

**Timeline:**
- 0:00-0:05 | Joint setup (5 min)
- 0:05-0:10 | Operator A: Extract companies 1-5 (5 min)
- 0:10-1:10 | Operator B: Verify companies 1-5 (60 min) *parallel with A*
- 0:10-0:15 | Operator A: Extract companies 6-10 (5 min) *while B verifies 1-5*
- 1:10-1:25 | Operator A: Verify companies 6-10 (15 min) *while B documents 1-5*
- 0:15-0:30 | Operator A: Document companies 1-5 (15 min)
- 1:25-1:40 | Operator A: Document companies 6-10 (15 min)
- 1:40-1:50 | Joint: Spot-check validation (10 min)
- 1:50-2:30 | Joint: Consolidation & next steps (40 min)

**Result:** All 10 companies audited in ~2.5 hours wall time (vs 4+ hours if sequential)

---

## SUCCESS METRICS

### Speed KPIs
- [ ] Complete 10 companies in <2.5 hours
- [ ] Average <15 min per company
- [ ] Average <3 min per signal
- [ ] 0 signals taking >5 min to verify

### Quality KPIs
- [ ] 95%+ URL verification in spot-checks (URLs clickable)
- [ ] 100% trigger tag assignment
- [ ] 0% calculation errors
- [ ] All signals have source URL or documented reason for UNVERIFIED

### Consistency KPIs
- [ ] Similar signal types tagged identically across batch
- [ ] Validity ratings align with verification percentages
- [ ] No "orphan" signals without clear trigger classification
- [ ] Recommended actions justified by data

### Scaling KPIs
- [ ] Process reproducible across operators
- [ ] Batch 02 faster than Batch 01 (learning curve)
- [ ] Cross-operator consistency maintained
- [ ] No quality degradation at scale

---

## NEXT STEPS: FROM AUDIT TO ACTION

### Phase 1: Consolidation (Immediate)
1. Aggregate all verified signals into master database
2. Generate company reliability report
3. Create trigger distribution dashboard

### Phase 2: Integration (1 week)
1. Export clean signals to CRM/sales platform
2. Set up "verified signal" view for sales teams
3. Train sales team on trigger taxonomy
4. Create prospect research playbook

### Phase 3: Ongoing Maintenance (Monthly)
1. Audit new companies as they're added to database
2. Monitor signal accuracy over time
3. Update confidence scores based on outcomes
4. Refine trigger taxonomy based on field usage

### Phase 4: Scaling & Optimization (3 months+)
1. Automate signal extraction where possible
2. Build API integrations (Crunchbase, news APIs)
3. Implement automated verification for known patterns
4. Create training module for new operators

---

## SUPPORTING DOCUMENTATION

All documents created as part of this specification:

1. **FAST_AUDIT_AGENT_SPECIFICATION.md**
   - Complete workflow definition
   - Quality gates and decision rules
   - Timing and parallelization strategy

2. **AUDIT_TEMPLATE.md**
   - Blank template for single company audit
   - Pre-populated sections
   - Example formatting

3. **AUDIT_PROCESS_CHECKLIST.md**
   - Step-by-step execution guide
   - Timing checkpoints
   - Quality gates
   - Decision trees

4. **AUDIT_BATCH_01_MASTER_INDEX.md**
   - Batch overview (10 sample companies)
   - Execution timeline
   - Expected statistics

5. **AUDIT_WIZ_2025-02-01_EXAMPLE.md**
   - Completed audit example (Wiz)
   - Shows format, detail level, decision-making
   - Reference for completing other audits

6. **This Document** (FAST_AUDIT_AGENT_EXECUTIVE_GUIDE.md)
   - Big picture overview
   - Quick start guide
   - Scaling recommendations

---

## COMMON QUESTIONS

**Q: How long does it take to audit 120 companies?**
A: ~27-30 hours of focused work. Can be completed in 2-4 weeks with 1-2 operators doing 2-3 hours/day.

**Q: Do I need to be technical?**
A: No. You just need to follow the workflow, use Google/Crunchbase/TechCrunch, and make binary decisions (VERIFIED or UNVERIFIED).

**Q: What if I can't find a signal source?**
A: That's fine. Mark as UNVERIFIED after 2 minutes. The audit identifies which signals lack credible sources.

**Q: Can I audit companies in parallel?**
A: Yes. Two operators can each handle 5 companies simultaneously with proper coordination.

**Q: What about inferred signals?**
A: They get marked UNVERIFIED unless you find a credible source. This is intentional—the audit separates announced signals from inferred ones.

**Q: How do I know if my audit is done?**
A: Check the completion checklist. All signals verified, all percentages calculated, all URLs tested, validity rating assigned. Done.

**Q: What should I do with UNVERIFIED signals?**
A: Either remove them from the database, or mark them as "inferred" / "requires verification" in downstream systems. Keep them documented for transparency.

---

## SUPPORT & TROUBLESHOOTING

### If You Get Stuck

1. **Review the Specification**
   - FAST_AUDIT_AGENT_SPECIFICATION.md has full workflow
   - Decision rules section explains when to mark VERIFIED vs UNVERIFIED
   - Trigger taxonomy section explains categorization

2. **Check the Example Audit**
   - AUDIT_WIZ_2025-02-01_EXAMPLE.md shows a completed audit
   - Shows verification process for different signal types
   - Demonstrates documentation level and detail

3. **Use the Checklist**
   - AUDIT_PROCESS_CHECKLIST.md has step-by-step execution
   - Decision trees for tricky situations
   - Common pitfalls and solutions

4. **Ask These Questions**
   - Is there a company press release about this signal? → VERIFIED
   - Did TechCrunch / major outlet cover this? → VERIFIED
   - Did I search for 2 minutes with no results? → UNVERIFIED
   - What trigger category best fits this signal? → [Pick one]

---

## VERSION & STATUS

- **Version**: 1.0
- **Created**: 2025-02-01
- **Status**: READY FOR IMPLEMENTATION
- **Updated**: —

**To implement:**
1. Read this executive guide (20 min)
2. Review FAST_AUDIT_AGENT_SPECIFICATION.md (30 min)
3. Study AUDIT_WIZ_2025-02-01_EXAMPLE.md (15 min)
4. Audit your first company (15 min)
5. Scale to 10 companies (2.5 hours)
6. Scale to 120 companies (27.5 hours total)

---

## READY TO START?

**Next steps:**

1. **Pick your first company** from your database
2. **Open AUDIT_TEMPLATE.md** in your editor
3. **Start the 15-minute timer**
4. **Follow AUDIT_PROCESS_CHECKLIST.md step-by-step**
5. **Reference AUDIT_WIZ_2025-02-01_EXAMPLE.md** if stuck

**Your audit starts NOW.**

---

**Questions? Review the supporting documentation or consult AUDIT_PROCESS_CHECKLIST.md**

**Ready to scale to 120 companies? Follow the timeline in this guide.**

**Current status: All systems ready. Go audit.**
