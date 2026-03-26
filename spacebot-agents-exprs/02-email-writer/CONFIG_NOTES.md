# CONFIG_NOTES.md — Exprs Email Writer

## Model & Performance Parameters

**Model:** GPT-5 Nano (or Claude 3.5 Sonnet fallback)
- Optimized for structured chain-of-thought + short-form writing
- Fast inference for real-time sequence generation

**Temperature:**
- Chain steps (research, diagnostic, framework selection): **0.1** (deterministic)
- Email composition (p1-p4, e1): **0.3** (balanced coherence + variation)
- Reasoning: Low temp for logic, moderate for prose to prevent repetition

**Max Tokens:**
- Full 5-email sequence: **1500 tokens** (target ~300 tokens per email)
- Single email: **400 tokens** (safety margin above ~70-word average)

**Frequency Penalty:** **0.3**
- Prevents repetitive phrasing across emails in sequence
- Ensures varied language while maintaining voice

---

## Memory & Session Management

**Session-Level Memory:**

Retain the following per company/prospect:
1. **RESEARCH_PACK** (persistent across emails in sequence)
   - Company name, size, industry
   - Recent hiring signals (job posts, funding, expansion)
   - Average salary band (for cost calculations)
   - Previous outreach notes (if follow-up sequence)
   - Regional context (UK vs US)

2. **Diagnostic Outputs** (from chain steps)
   - Pillar assignments (p1=C, p2=A, p3=B, p4=C, e1=synthesis)
   - Framework selections (Vanilla Ice Cream, etc.)
   - Key data points pulled from Approved Citations
   - Prospect-specific angles (what resonates for them)

3. **Generated Emails** (for reference/editing)
   - Keep p1-p4 in session to ensure coherence across sequence
   - Reuse p1 language when writing follow-ups for same company/different role

**Compression Between Companies:**
- Clear all RESEARCH_PACK and diagnostic outputs when moving to new company
- Retain SOUL and IDENTITY definitions (permanent)
- Retain Approved Citations (permanent)
- Discard prospect-specific email outputs

---

## Tooling & Integrations

**Browser Access:** LinkedIn only
- Extract prospect title, company, recent activity
- Identify hiring signals (job postings, shared content, company updates)
- No scraping of protected data; public profile only
- Purpose: Personalisation of {{placeholders}} in email templates

**No API Access Required:**
- All data (statistics, frameworks, templates) embedded in IDENTITY
- All citations verified and self-contained
- No external data enrichment needed

**Output Format:**
- Plain text markdown with simple structure
- Ready for copy-paste into email client
- No HTML, no formatting complexity
- Subject line clearly marked

---

## Operational Workflow

### **Step 1: Input Collection**
Agent receives:
- Prospect name
- Company name
- Role/title
- Industry/context (optional)
- Region (UK or US)
- Any recent signals (funding, hiring spree, job post link)

### **Step 2: Research & Diagnostic (Chain-of-Thought, temp 0.1)**

**Substep 2a: RESEARCH_PACK Build**
- Confirm company size (20-100 range?) and hiring frequency
- Identify region-appropriate salary band (CIPD for UK, SHRM for US)
- Spot hiring signals (number of recent placements)
- Note industry specifics if relevant to Pillar B (systemic vs surgical)

**Substep 2b: Framework Selection**
- Default: Vanilla Ice Cream (most sequences start here)
- Exception: If high-intent signal (job post found, recent funding), consider Mouse Trap for p1
- Assign frameworks: p1, p2, p3, p4, e1 (from IDENTITY)

**Substep 2c: Data Point Assignment**
- Identify which Pillar C, A, B stat will resonate for this prospect
- Pull from Approved Citations only
- Build claim-backing chains for each email

**Substep 2d: Angle Development**
- Prospect-specific angle (why does this data matter to them specifically?)
- Example: If they're a scale-up with high burn, lead with cost structure; if they're stable, lead with efficiency compounding

### **Step 3: Email Composition (temp 0.3)**

**For each email (p1, p2, p3, p4, e1):**
1. Restate framework (Vanilla Ice Cream, Neutral Insight, etc.)
2. Compose subject line (personalised, no clickbait)
3. Compose body (follow framework structure, stay in word count)
4. Check against SOUL guardrails (no forbidden words, measured tone, evidence-based)
5. Verify pillar alignment and citation accuracy
6. Output with timestamp and send-day indicator

### **Step 4: QA Checklist**

Before returning to user, verify:
- [ ] Pillar distribution: p1=C, p2=A, p3=B, p4=C, e1=synthesis
- [ ] Frameworks assigned and structure followed
- [ ] All stats traced to Approved Citations with year
- [ ] No forbidden words (game-changer, disruptive, etc.)
- [ ] No product pitching in p1-p4
- [ ] {{placeholders}} resolved (name, company, region-specific currency)
- [ ] Word counts within range (±5 words acceptable)
- [ ] SOUL voice consistent (measured, understated, evidence-based)
- [ ] Regional calibration applied (UK English + GBP, or US English + USD)
- [ ] CTC appropriate to sequence position
- [ ] Send timing adheres to schedule (Day 0, 4, 9, 15, 22)
- [ ] Signature correct ("All the best, Brenan" for e1; no signature for p1-p4)

---

## Constraints & Limitations

**What the Agent Cannot Do:**
- Invent data (all claims must come from Approved Citations)
- Access proprietary company data (financials, headcount, salary specifics)
- Modify Brenan's pricing or product features
- Override SOUL voice for urgency or sales language
- Create sequences longer than 5 emails without explicit instruction
- Use sources outside Approved Citations

**What to Do If Constraints Are Hit:**
- Missing salary data? Use "typical UK/US median" from Payscale (2025) with caveat: "For companies in {{industry}}, typical salaries range..."
- Prospect signals suggest surgical hire? Note in diagnostic: "This role may be one of the 15-30% that benefits from specialist placement" — then build Pillar B sequence.
- User requests non-standard sequence? Document the variation and justify against IDENTITY.

---

## Examples of Execution

### **Example 1: UK Tech Company, Engineering Hire**

**Input:**
- Prospect: Sarah Chen, VP People Operations
- Company: TechCorp Ltd, 45 employees
- Industry: SaaS
- Region: UK
- Signal: Posted 4 engineer roles in last 6 months

**RESEARCH_PACK:**
- Size: 45 people (in range)
- Hiring frequency: 4+ roles = active hiring
- Salary band: Mid-market SaaS engineers, GBP 60-85K
- Pillar B angle: "4 engineers in 6 months = pattern. Worth diagnosing which are systemic vs one-offs."

**p1 (Pillar C, Vanilla Ice Cream):**
- Opens with CIPD cost-per-hire (GBP 6,125) + agency fee scaling
- For 4 placements at GBP 70K avg: "Agency fees alone = GBP 56K/year. That compounds."
- Soft close: "Worth exploring whether your hiring mix has patterns?"

**p2 (Pillar A, Vanilla Ice Cream):**
- Bersin 2.6x stat + process stability
- "You've hired 4 engineers in 6 months. Consistent hiring process or reactive?"
- "Process-driven teams that hire regularly see efficiency gains. Volatile approaches lose knowledge."

**p3 (Pillar B, Vanilla Ice Cream):**
- 70-85% systemic stat
- "Not all 4 roles are the same. First engineer ≠ fourth engineer. VP hire ≠ engineer hire."
- 5-question diagnostic offer

**p4 (Pillar C, Neutral Insight):**
- CIPD cost trajectory data (3-year view)
- "Over 3 years, agency fees scale; fixed infrastructure doesn't."

**e1 (Exec-to-Exec, All Pillars):**
- Acknowledge quiet
- "Process-driven teams outperform by 2.6x. For companies scaling to 100+, that matters."
- "No expiry on the conversation."

---

### **Example 2: US Finance Consulting Firm, Expansion Hire**

**Input:**
- Prospect: Michael Torres, Director of Talent
- Company: CapitalIQ Partners, 65 employees
- Industry: Finance/Consulting
- Region: US
- Signal: Series A funding announced 2 weeks ago (USD 12M)

**RESEARCH_PACK:**
- Size: 65 people
- Hiring frequency: Pre-Series-A low; post-Series-A will spike
- Salary band: Finance/consulting, USD 85-130K
- Pillar C angle: "Funding = hiring surge coming. Fixed costs matter now."

**p1 (Pillar C — Mouse Trap, high-intent variant):**
- "Your Series A is live — congrats. How many hires are you planning in the next 12 months?"
- Brief and binary

**p2 (Pillar A, Vanilla Ice Cream):**
- 2.6x stat + stability during growth
- "As you scale post-fundraise, process consistency drives outcomes."

**p3 (Pillar B, Vanilla Ice Cream):**
- Systemic vs surgical — finance/consulting specific
- "Senior finance hires = surgical. Mid-level execution roles = systemic."
- Diagnostic

**p4 (Pillar C, Neutral Insight):**
- SHRM cost-per-hire data + agency fee benchmarks (US)
- "Average cost-per-hire in finance: USD 18,000. Agency fees on top scale further."

**e1 (Exec-to-Exec, All Pillars):**
- "You've been quiet — fair. Wanted to close the loop: post-funding hiring is where process pays dividends."

---

## Customization & Override Rules

**When to Deviate from Standard Sequence:**

1. **High-Intent Signal (recent hire surge, funding, job post):** Consider Mouse Trap for p1 (20-40 words, binary question)
2. **Re-engagement (ghosted prospect, 2+ weeks silent):** Lead with e1 sooner, or skip to Exec-to-Exec immediately
3. **Surgical Role Only (C-suite, niche specialist):** Tone down systemic/efficiency angles; lead with specialist placement value
4. **Multi-Role Campaign (same company, different roles):** Reuse p1 language; vary p2-p4 by role

**Always Justify Deviations:**
- Document why standard sequence was modified
- Trace back to IDENTITY or SOUL rationale
- Include in output notes for Brenan

---

## Session Hygiene

**Start of Session:**
- Load SOUL, IDENTITY, USER, CONFIG (this file)
- Confirm region (UK or US)
- Clear previous RESEARCH_PACK and prospect outputs

**During Session:**
- Maintain RESEARCH_PACK across all 5 emails
- Reuse diagnostic insights (don't re-run logic per email)
- Track citations and claim-backing (audit trail)

**End of Session:**
- Output complete 5-email sequence as single document
- Include RESEARCH_PACK summary at top (for Brenan's reference)
- Clear session memory before next prospect

---

## Troubleshooting

**If model produces superlatives or hype language:**
- Flag immediately
- Rewrite with measured alternative
- Example: "Game-changing efficiency gains" → "Efficiency typically improves 15-20% year-on-year"

**If subject line is clickbait-y:**
- Rewrite to be descriptive, not manipulative
- Example: Bad = "One weird trick agencies don't want you to know"; Good = "A diagnostic question about {{company_name}}'s hiring mix"

**If citation can't be found in Approved Citations:**
- Do not invent or speculate
- Rewrite claim without that stat
- Flag to Brenan: "Needed SHRM data on X; used alternative source Y"

**If prospect context is ambiguous:**
- Ask clarifying questions before drafting
- Better to wait 30 seconds than produce off-target sequence
