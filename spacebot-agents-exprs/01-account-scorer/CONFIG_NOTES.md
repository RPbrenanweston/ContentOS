# CONFIG_NOTES — Spacebot Configuration

## Model Selection

**Recommended:** GPT-4 Mini (or equivalent cost-optimized model)

**Reasoning:**
- Account classification is pattern-matching against a deterministic ICP framework
- You do not need reasoning-heavy inference; you need reliable template application
- Cost is a factor: classification is high-volume and repetitive
- A smaller model trained on structured classification outperforms unnecessarily large models on this task

**Alternative:** Claude 3.5 Sonnet if reliability on edge cases is paramount (founders near the 20-person threshold, ambiguous pain signals, etc.)

---

## Temperature

**Setting: 0.1**

**Reasoning:**
- Classification must be deterministic. Given the same prospect data, you must reach the same conclusion every time.
- Low temperature removes hallucination and keeps outputs tight to the ICP framework.
- This is a classification task, not a creative task. Randomness undermines credibility.

---

## Token Limits

**Default:** 800 tokens
**Expanded:** 1,500 tokens (if detailed prospect notes or multi-page summaries are provided)

**Reasoning:**
- A single prospect scorecard rarely requires more than 800 tokens.
- 800 tokens comfortably accommodates: ICP classification, hiring volume estimate, pain signals, recommended approach, priority, and next action.
- If Brenan provides rich context (e.g., a 3-person discovery call transcript), expand to 1,500 for detailed analysis.
- Aggressive pruning: Use system-level instruction to cap reasoning tokens if available.

---

## Memory

**Mode: Session-level only**

**Reasoning:**
- Each prospect classification is independent. You do not need cross-prospect memory or learning curves.
- Brenan builds new prospect lists regularly; he does not need historical patterns or "remember this lead from 3 weeks ago."
- Session-level memory (within a single conversation) is sufficient for batch classification of 5-10 prospects in one run.
- **Do not enable long-term persistent memory.** This creates unnecessary context bloat and violates the "deterministic" principle (different memory states could alter classification).

---

## Browser

**Disabled**

**Reasoning:**
- Classification depends on the prospect information Brenan provides directly (LinkedIn profile snippet, email exchange, company website extract, etc.).
- You do not need to web-search for company size, funding stage, or hiring signals; Brenan brings that context.
- If he wants you to analyze a live LinkedIn profile or web page, he will copy-paste the relevant section. You will not visit URLs.
- Disabling browser reduces latency and cost.

---

## Compaction

**Mode: Aggressive**

**Reasoning:**
- Each prospect classification is a discrete event. You do not need to retain or reference previous classifications.
- Aggressive compaction clears session context after each classification, freeing tokens for the next prospect.
- Useful if Brenan runs back-to-back scorecards: "Score these 10 prospects" becomes 10 independent, fast operations instead of a long context chain.
- **Instruction:** Prompt Spacebot to clear reasoning and intermediate outputs after each scorecard.

---

## Cortex / Knowledge Base

**Load: ICP framework reference only**

**Scope:**
- The IDENTITY.md file (full ICP definition, disqualification criteria, pain signals, output format, outreach pillars)
- Optional: Historical case studies or anonymized prospect scorecards, if Brenan wants to seed pattern examples (e.g., "Here's what a Secondary match looks like in practice")

**Do not load:**
- Sales pitch materials or marketing copy
- Customer success stories or testimonials
- Product feature documentation
- Pricing pages

**Reasoning:**
- The ICP framework is ground truth; everything else is noise.
- Brenan does not need Spacebot to sell Exprs; Brenan does the selling.
- Keep the knowledge base lean. More context != better classification.

---

## System Prompt (Summary)

Your system prompt should encode these constraints:

```
You are the Exprs Account Scorer — a deterministic prospect classifier.

Core job:
1. Classify companies and contacts against the Exprs.io ICP
2. Provide evidence-based verdicts: Primary / Secondary / Tertiary / Disqualified
3. Estimate hiring volume and pain signals
4. Recommend a specific outreach pillar (A, B, or C)
5. Assign priority (Hot / Warm / Nurture / Disqualified) and next action

Rules:
- Be analytical, not a salesperson. No marketing language.
- Ground every classification in the ICP framework (IDENTITY.md).
- Flag missing data explicitly. Do not guess.
- If a prospect doesn't fit, disqualify cleanly. Honesty is higher value than soft maybes.
- Respect Brenan's time: short, decisive outputs.
- Temperature 0.1: deterministic classification, no randomness.

Output format: Use the scorecard template from IDENTITY.md.
Do not add fluff. No clichés. No qualifiers unless evidence-backed.
```

---

## Deployment & Usage

**How Brenan uses this:**

1. **Input:** Prospect context (company name, size, hiring velocity, current agency spend, contact title, pain signals, any other relevant data)
2. **Output:** Scorecard with ICP match, priority, and next action
3. **Workflow:** Likely batch classification (5-10 prospects per session) or single-prospect ad-hoc scoring

**Example session:**
```
Brenan: "Score these three prospects: [context on prospect A], [context on prospect B], [context on prospect C]"

You: [Scorecard A]

[Scorecard B]

[Scorecard C]

---

Priority: Score Scorecard A (Hot) first, then B (Warm). C is disqualified (only 18 people, not actively growing).
```

---

## Edge Cases & Handling

**Prospect is 19 employees, growing fast, explicitly frustrated with agency fees**
- Hard disqualify based on size (<20).
- Note: "Size-blocked, but pain signal is real. Consider nurturing for 12 months if team reaches 25."

**Prospect is 45 employees, but hiring only 2-3 people per year**
- ICP match: Tertiary (marginal financial case)
- Priority: Nurture
- Note: "Minimal hiring volume; infrastructure ROI is weak unless they plan to accelerate."

**Contact is HR coordinator, not founder or finance decision-maker**
- Flag: "Medium confidence — contact lacks direct budget authority. Need to identify founder/CFO before outreach."
- Recommend: "Confirm decision-maker before sending scorecard."

**Prospect information is sparse (only company name and headcount)**
- Classify with what you have, but flag gaps: "Primary size match, but hiring volume unknown. Recommend brief discovery call to estimate pace before committing to outreach."

---

## Testing & Validation

To validate Spacebot before going live:

1. **Test determinism:** Feed the same prospect data twice. Output should be identical.
2. **Test disqualification:** Feed a prospect with 18 employees. Verify hard disqualification (no exceptions).
3. **Test pain signal detection:** Feed context with explicit cost frustration. Verify High agency dependency signal.
4. **Test output format:** Verify every scorecard follows the template (ICP Match, Company Size, Hiring Volume, Agency Dependency, Pain Signals, Approach, Priority, Next Action, Notes).
5. **Tone check:** Read a scorecard aloud. Verify it sounds like a CFO, not a marketer. No clichés, no hype.

---

## Post-Launch Monitoring

- Track Brenan's feedback on classification accuracy
- If certain prospect types are being misclassified (e.g., Secondary matches that should be Primary), revisit IDENTITY.md and refine pain signal definitions
- Log disqualifications for quarterly review — ensure they're aligned with actual market feedback
- Monitor token usage; adjust default/expanded token limits if compaction is too aggressive
