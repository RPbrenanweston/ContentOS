# CONFIG_NOTES: Exprs Research Intel

## Model & Inference Settings

### Primary Model
- **Model:** GPT-4o (structured research + data extraction)
- **Rationale:** Research requires accuracy (source tracking, data verification), structured JSON output, and multi-step reasoning (synthesizing signals across sources). GPT-4o is optimized for these tasks.

### Temperature & Determinism
- **Temperature:** 0.1
- **Rationale:** Research must be factual and deterministic. Low temperature ensures the agent prioritizes accuracy over creative interpretation. Same company researched twice should yield nearly identical results.

### Token Budget
- **Max tokens:** 3000 (per research pack)
- **Rationale:** Research packs are data-dense (JSON structure) but can be verbose if exploring gaps or alternative data sources. 3000 tokens is sufficient for a complete pack with full source index and reasoning.

### Instruction Handling
- **System prompt:** Always loaded (research framework, source quality hierarchy, tone)
- **Per-request context:** Company name + any specific directives (e.g., "quick fit assessment only" vs. "full deep dive")

---

## Browser & Web Access

### Browser: ENABLED (Required)
- **Why:** Primary data sources (careers pages, LinkedIn profiles, Crunchbase, Glassdoor) are web-based. Full web access is non-negotiable.
- **Required capabilities:**
  - LinkedIn company profile access (headcount graphs, employee search, open roles)
  - Company website + careers page parsing (open roles, team structure, process maturity)
  - Crunchbase (funding, stage, investor info)
  - Glassdoor (reviews, hiring signals, culture feedback)
  - Job boards (Indeed, LinkedIn Jobs) for agency post detection
  - Press/news aggregators (TechCrunch, company blogs)

### Search Budget
- **5–8 web searches per company research**
- **3–5 page fetches per company research**
- **Optimize for:** Breadth first (hit all required dimensions), then depth (verify signals via multiple sources)
- **Example search sequence:**
  1. "[Company name] careers"
  2. "site:linkedin.com [Company name]"
  3. "[Company name] Crunchbase"
  4. "[Company name] Glassdoor reviews"
  5. "[Company name] hiring jobs"
  6. "[Company name] Series B funding" (if applicable)
  7. "[Company name] cto founder linkedin"

### Page Fetch Priority
1. Company careers page (open roles, process maturity)
2. LinkedIn company profile (headcount, growth, employees)
3. Crunchbase (funding, stage)
4. Glassdoor (reviews, hiring signals)
5. Job boards (agency posts) — fallback to LinkedIn Jobs if Indeed inaccessible

---

## Memory & Session Management

### Within Session (Single Research Request)
- **Retain:** All research packs produced in the session
- **Use case:** Brenan asks "Compare those 5 companies we just researched"
- **Behavior:** Retrieve all packs from session memory, run comparative analysis, output summary table
- **Cleanup:** None (retain throughout session)

### Cross-Session (Multi-Session Storage)
- **Store:** All completed research packs as JSON files in `research-packs/[company-name].json`
- **Use case:** Brenan asks "Research Acme Corp" → check if pack exists from previous session → use cached pack if < 30 days old, refresh if older
- **Behavior:**
  - If cached pack exists and < 30 days old: Load it, note "cached pack from [date]," offer to refresh if needed
  - If cached pack exists and > 30 days old: Refresh and update
  - If no cached pack: Create new pack
- **Metadata:** Every pack includes `research_date`. Compare to current date to determine staleness.

### Memory Compression
- **Full packs:** Retain in storage (JSON is compact; no need to compress)
- **Raw search results:** Discard after synthesizing into pack (don't store intermediate Google results)
- **Rationale:** Final pack is what matters for Email Writer + Account Scorer. Raw results add clutter.

---

## Output Format

### Standard Output: RESEARCH_PACK JSON
- **Format:** Valid JSON (not JSON-LD, not markdown)
- **Schema:** Defined in IDENTITY.md (see "Output Format: RESEARCH_PACK JSON")
- **Validation:** Ensure all required fields are present; mark gaps explicitly if data unavailable
- **Delivery:** Return raw JSON (not wrapped in markdown code block unless Brenan requests it for readability)

### Alternative Output: Quick Assessment (Summary)
- **When:** Brenan requests "quick fit assessment only"
- **Format:** 1–2 paragraphs + ICP tier + recommended contact + key pain signal
- **Example:**
  ```
  Series B fintech, rapid hiring (25/year), weak internal TA (2 people), confirmed agency dependency (7 agency job posts). Estimated £97K–£162K annual agency spend. ICP: Primary. Lead with: cost efficiency + hiring process control.

  Contact: CEO [Name], secondary: VP Eng [Name]. Gaps: CFO not found.
  ```

### Error Handling
- **Missing data:** Flag in "gaps" section of pack; don't omit from output or invent data
- **Unreachable sources:** Note in source index; attempt alternate sources (e.g., if careers page is down, use LinkedIn jobs)
- **Conflicting signals:** Surface both, note the conflict, explain which source is more reliable
- **Incomplete pack:** Mark `research_status: "Incomplete (gaps noted below)"` and proceed; don't block on minor gaps

---

## Cortex Integration (Context Loading)

Before starting a research session, **load the following Cortex documents** (one-time per session):

### 1. ICP Definition
- **Content:** Detailed description of Exprs.io's ideal customer profile
  - Company size: 20–100 employees (primary), 100–300 (secondary)
  - Stage: Seed through Series B
  - Hiring volume: 5+ roles/year (threshold for meaningful agency spend)
  - Geography: UK primary, US secondary
  - Industry: Tech-first (SaaS, fintech, healthtech), secondary: scale-ups in other sectors
  - Pain point: "Hiring is growing faster than our HR team can handle"
  - Budget: Has access to 5–50K/year discretionary hiring infrastructure budget

- **Use in research:** Guides ICP tier assignment (Primary/Secondary/Tertiary/Disqualified). When you identify a prospect, map their signals against ICP definition to justify the tier.

### 2. Pricing & ROI Framework
- **Content:** Exprs.io pricing, competitor pricing, ROI calculation model
  - Example: "Exprs costs £X/month. A typical prospect spends £50–150K/year on agencies. ROI messaging: 'Recoup the investment in Y months.'"
  - Competitor benchmarks: Agency cost (20% of salary), ATS cost (£3–10K/year), internal recruiter cost (£40–60K/year + benefits)

- **Use in research:** When calculating estimated agency spend and interpreting strength of case. Agency spend > Exprs cost = strong ROI case. Frame in pack's "assessment" section.

### 3. Three Sales Pillars (Content Framework)
- **Content:** Core value propositions that resonate with prospects. Example:
  - **Pillar A:** Cost Efficiency — "Replace agency spend with fixed-cost infrastructure"
  - **Pillar B:** Hiring Speed — "Own your hiring pipeline; reduce time-to-hire"
  - **Pillar C:** Quality & Fit — "Hire better; reduce bad hires and churn"

- **Use in research:** Identify which pillar(s) best match the prospect's pain signals. In pack's "assessment" section, recommend which pillar to lead with (e.g., "Recommended_pillar: B (Speed)" if company is growing rapidly and hiring slowly).

### 4. Messaging Frameworks (Optional)
- **Content:** Pre-tested email hooks, call scripts, positioning frameworks
  - Example: "Mouse Trap" = "We help you replace your agency with predictable hiring"
  - Example: "Vanilla Ice Cream" = "We're the cost-effective alternative to your current TA setup"

- **Use in research:** If a prospect fits a known framework, note it in `recommended_framework`. Email Writer can then pull the pre-tested template.

---

## Execution Workflow

### Single Company Research
```
Input: Company name (+ optional directives)
  ↓
Load Cortex (ICP, pricing, pillars)
  ↓
Execute web searches + page fetches (5–8 searches, 3–5 fetches)
  ↓
Synthesize into RESEARCH_PACK JSON
  ↓
Validate pack (all required fields, source index complete, gaps noted)
  ↓
Return RESEARCH_PACK JSON to user
```

**Target time:** 2–3 minutes per company

### Batch Research (Multiple Companies)
```
Input: List of 5–10 companies
  ↓
Load Cortex (one-time)
  ↓
For each company:
  - Execute search workflow (as above)
  - Retain pack in session memory
  ↓
Synthesize priority ranking:
  - Sort by ICP tier (Primary > Secondary > Tertiary)
  - Within tier, sort by estimated agency spend (higher = stronger case)
  ↓
Return:
  - Full RESEARCH_PACK JSON for each company
  - Priority-ranked summary table (1 row per company, key signals)
```

**Target time:** 2–3 minutes per company (parallelizable)

### Cached Pack Refresh
```
Input: Company name already researched in prior session
  ↓
Check stored pack (research_packs/[company].json)
  ↓
If pack < 30 days old: Offer refresh ("Use cached pack from [date]? Or research fresh?")
  ↓
If pack > 30 days old: Automatically refresh (headcount, hiring, funding can change fast)
  ↓
Return updated pack + "Updated from [date]"
```

---

## Quality Assurance

### Before Returning a Pack
- [ ] All required JSON fields present (metadata, company_profile, hiring_model, etc.)
- [ ] Source index complete (every material claim has a source)
- [ ] Gaps section filled (what couldn't we verify? Why?)
- [ ] Confidence section justified (reasoning for overall confidence level)
- [ ] ICP tier assignment matches signal strength (Primary = multiple strong signals, not just one)
- [ ] Recommended pillar is justified by pain signals (not arbitrary)
- [ ] No speculation (every assessment backed by confirmed or clearly-inferred data)
- [ ] Tone matches SOUL.md (analytical, pragmatic, not marketing-y)

### Red Flags to Catch
- **Missing confidence levels:** Always include overall_confidence + rationale
- **Weak source index:** If > 2 claims lack sources, flag it
- **Circular reasoning:** "ICP is Primary because they're a good fit" — unacceptable. State concrete signals.
- **Outdated data:** If only source is 2023 Glassdoor review, note staleness in confidence section
- **Empty decision makers:** If CEO can't be found, don't skip section; note "not found" explicitly and suggest how to verify (call-in, secondary research)

---

## Failure Modes & Mitigation

### Scenario: Company website is down or careers page missing
- **Mitigation:** Fall back to LinkedIn jobs + Crunchbase + Glassdoor. Note in source index that careers page was unavailable.
- **Output:** Pack is still valid; just note gap clearly.

### Scenario: Company is private, no funding data available
- **Mitigation:** Use headcount + hiring signals to infer stage. Note inference clearly.
- **Output:** "Stage: Unknown (private company). Based on headcount (250) and hiring velocity (40/year), likely Series B–C."

### Scenario: Prospect is too small (< £20K estimated spend)
- **Mitigation:** Still produce full pack. Brenan may disagree with the spend threshold. Let the data speak.
- **Output:** Flag in assessment: "Estimated agency spend is below typical threshold (£20K/year). Recommended action: deprioritize unless other signals are strong."

### Scenario: Conflicting signals (one source says "high growth," another says "flat")
- **Mitigation:** Surface both. Note which source is more reliable. Explain discrepancy.
- **Output:** "LinkedIn headcount graph shows 50 → 55 people (5/year growth). But Crunchbase funding round from 6 months ago announced plans to '3x the team.' Likely discrepancy: recent growth hasn't fully reflected on LinkedIn yet. Conservative estimate: steady growth (5–10/year). Higher estimate: rapid growth (20+/year) if they're halfway through hiring surge."

---

## Rate Limiting & Efficiency

### Search Budget Per Company
- Allocate 5–8 searches and 3–5 page fetches
- Prioritize high-value searches (LinkedIn, Crunchbase, careers page)
- If company is well-known or has been researched recently (cached pack), reduce budget

### Parallelization
- Research multiple companies in parallel if possible (allows batch requests)
- Don't block on one company while researching others

### Early Exit Conditions
- If company is clearly disqualified (< £10K estimated spend, contracting, no hiring signals), note it and move on. Don't dig deeper.
- If pack is complete with high confidence, stop searching and return it. Don't over-research.

---

## Session Context & Persistence

### Session Start
- Load Cortex (ICP, pricing, pillars)
- Initialize session memory (store all packs produced)
- Log start time

### Session End
- Archive all packs to storage (`research-packs/[company-name].json`)
- Save session summary (companies researched, time spent, any failures)
- Clear temporary search results (keep packs only)

### Multi-Session Workflow
- Brenan may ask "Remember that Acme research? Are they still a good fit?" → Check storage, load pack, note date, offer refresh if > 30 days old

---

## Logging & Debugging

### What to Log
- Company name + research start/end time
- Number of searches executed
- Number of sources found
- Confidence level + reason
- Any errors or data gaps

### What Not to Log
- Raw search results (too verbose)
- Intermediate drafts of pack JSON
- Browser debugging output

### Troubleshooting
- If a pack takes > 3 minutes: Check if you're over-researching. Review search queries for efficiency.
- If confidence is low (< 70%): Document why. Are sources missing? Is company private? Is data conflicting?
- If source index is small (< 5 sources): You may be missing data. Re-check Glassdoor, job boards, press for gaps.

---

## Notes for Spacebot Integration

### Cortex Loading
- Ensure ICP, pricing, and pillars are loaded as context before agent execution
- If Cortex is unavailable, agent can still operate (will note gaps in research pack)
- Cortex update frequency: Monthly (sync with Brenan's messaging updates)

### Skill Dependencies
- This agent may call downstream skills:
  - **Email Writer skill:** Uses RESEARCH_PACK to draft outreach email
  - **Account Scorer skill:** Uses RESEARCH_PACK to assign fit score and priority
- Ensure RESEARCH_PACK JSON is valid and matches downstream skill schema

### User Handoff
- After producing a pack, agent should offer next action: "Ready to write an email? I'll pass this pack to the Email Writer skill."

### Storage Integration
- Packs should be stored in a shared location that both Research Intel and downstream skills can access
- Filename format: `research-packs/[company-name]_[research-date].json` (allows version history)
