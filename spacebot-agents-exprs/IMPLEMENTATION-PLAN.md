# Creative Ideas Campaign — Implementation Plan
## Clay Workflow → Spacebot + n8n

**Date:** 2026-03-17
**Status:** Planning
**Stack:** Spacebot agents + n8n + Smartlead + Supabase + Teable + Attio

---

## What Eric's Clay Table Actually Does

Strip away Clay's UI and there are 5 discrete jobs happening:

| Step | Clay Does This | What It Actually Is |
|------|---------------|---------------------|
| 1. **Enrich** | Company LinkedIn enrichment (1 credit) | API call → get employee count, industry, B2B/B2C, funding, subindustry, revenue |
| 2. **Qualify** | Conditional formula (must-haves) | IF employee_count > 30 AND business_type = "B2B" → qualified |
| 3. **Detect Signals** | Multiple enrichments + formulas | Funding raised? New in role? International employees? |
| 4. **Score & Route** | "Golden" formula + message assignment | Combine signals → priority tier → assign message template |
| 5. **Generate Ideas** | AI column (GPT-5 Nano, cached system prompt) | Company description → 3 constrained ideas → email variable |

Every one of these can be replicated — and in several cases improved — without Clay.

---

## Architecture: Your Stack vs Clay

```
┌─────────────────────────────────────────────────────────────┐
│                    CLAY (all-in-one)                         │
│  Enrichment → Formulas → AI → Export to Smartlead           │
└─────────────────────────────────────────────────────────────┘

                        ↓ becomes ↓

┌──────────┐   ┌───────────┐   ┌──────────────┐   ┌──────────┐
│  n8n     │   │ SPACEBOT  │   │  SUPABASE /  │   │SMARTLEAD │
│          │   │  AGENTS   │   │   TEABLE     │   │          │
│ Orchestr-│   │           │   │              │   │ Sending  │
│ ation +  │──▶│ 01 Score  │──▶│ Prospect DB  │──▶│ Campai-  │
│ Enrichm- │   │ 05 Ideas  │   │ + Signals    │   │ gns +    │
│ ent APIs │   │ 03 Research│   │ + Messages   │   │ Sequences│
│          │   │           │   │              │   │          │
└──────────┘   └───────────┘   └──────────────┘   └──────────┘
```

### Why This Is Better Than Clay

| Dimension | Clay | Your Stack |
|-----------|------|------------|
| **Cost per prospect** | $0.10-0.50 (enrichment credits) | $0.01-0.05 (direct API calls) |
| **AI cost** | Clay's AI pricing (opaque) | Direct Nano API ($0.001/prospect) |
| **Data ownership** | Clay retains | Your Supabase/Teable |
| **Customisation** | Formula language + basic prompts | Full agent configs + n8n logic |
| **Scale** | Credit-limited | API-rate-limited only |
| **Integration** | Export CSV → import to Smartlead | n8n webhook → Smartlead API direct |
| **Learning loop** | Manual — look at Clay table | Automated — reply signals flow back via Smartlead webhooks |

---

## Step-by-Step Implementation

### STEP 1: Prospect Ingestion (n8n)

**Trigger:** Manual upload, webhook from Attio, or scheduled LinkedIn Sales Navigator export

**n8n Workflow: `exprs-prospect-ingest`**

```
[Trigger]                    [Enrich]                [Store]
Webhook / CSV Upload    →    Enrichment APIs    →    Supabase table
or Attio new contact         (parallel calls)        `prospects`
```

**Enrichment API calls (replace Clay's 1-credit enrichment):**

| Data Point | API Source | Cost | Notes |
|-----------|-----------|------|-------|
| Employee count | LinkedIn API or Proxycurl | ~$0.01/call | Company profile endpoint |
| Industry / subindustry | Proxycurl or Clearbit | ~$0.01/call | Often bundled with above |
| B2B vs B2C | OpenAI classification on company description | ~$0.001/call | Nano prompt: "Is this B2B or B2C? Company: {description}" |
| Funding history | Crunchbase API or PredictLeads | ~$0.01/call | Total raised, last round, date |
| Company description | Website scrape or LinkedIn | ~$0.01/call | Used for Creative Ideas agent |
| Revenue estimate | Proxycurl derived data | Bundled | Approximate range |

**Alternative (cheaper):** Use Apollo.io enrichment ($0.01/contact) which returns most of these in one call.

**Supabase `prospects` table schema:**

```sql
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_description TEXT,
  contact_name TEXT,
  contact_title TEXT,
  contact_email TEXT,
  employee_count INTEGER,
  industry TEXT,
  subindustry TEXT,
  business_type TEXT, -- B2B, B2C, B2B2C
  total_funding NUMERIC,
  last_funding_date DATE,
  last_funding_amount NUMERIC,
  estimated_revenue TEXT,
  country TEXT,
  -- Enrichment metadata
  enriched_at TIMESTAMPTZ,
  enrichment_source TEXT,
  -- Will be populated by later steps
  qualified BOOLEAN DEFAULT FALSE,
  signals JSONB DEFAULT '{}',
  score TEXT, -- 'golden', 'must_have', 'disqualified'
  message_route TEXT, -- which template/ideas to use
  creative_ideas JSONB, -- output from agent 05
  smartlead_campaign_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### STEP 2: Qualification (n8n Formula Node)

**Eric's Clay equivalent:** `IF employee_count > 30 AND business_type = "B2B" → must_have`

**n8n implementation:** Function node after enrichment

```javascript
// n8n Function Node: Qualify Prospect
const prospect = $input.item.json;

// MUST-HAVES (Exprs ICP)
const employeeQualified = prospect.employee_count >= 20 && prospect.employee_count <= 200;
const isB2B = ['B2B', 'B2B2C'].includes(prospect.business_type);
const isGrowing = prospect.employee_count >= 20; // proxy for growth - refine with historical data

// DISQUALIFIERS
const tooSmall = prospect.employee_count < 20;
const tooLarge = prospect.employee_count > 200;

let qualification = 'disqualified';
let disqualify_reason = null;

if (tooSmall) {
  disqualify_reason = 'Under 20 employees — too early for infrastructure';
} else if (tooLarge) {
  disqualify_reason = 'Over 200 employees — likely has internal TA';
} else if (!isB2B) {
  disqualify_reason = 'Not B2B — ICP mismatch';
} else if (employeeQualified && isB2B) {
  qualification = 'must_have';
}

return {
  json: {
    ...prospect,
    qualified: qualification === 'must_have',
    qualification,
    disqualify_reason
  }
};
```

**Branch:** If `qualified = false` → stop. Don't waste enrichment credits or AI tokens on poor-fit prospects.

---

### STEP 3: Signal Detection (n8n + Enrichment APIs)

**Eric's Clay equivalent:** Three "nice-to-have" signals that change messaging

**Exprs signals (adapted for our ICP):**

| Signal | How to Detect | Data Source | Why It Matters |
|--------|--------------|-------------|----------------|
| **Recent funding** | `last_funding_date` within 12 months | Crunchbase / PredictLeads | Flush with cash, likely hiring. Lead with Pillar C (invest in infrastructure now). |
| **Hiring velocity** | Count open jobs or recent LinkedIn hires | LinkedIn Jobs API / Otta / Proxycurl | Active hiring = immediate pain. Lead with Pillar A (compound efficiency). |
| **New leadership** | New CEO/CTO/CFO in past 6 months | LinkedIn via Proxycurl | New leaders restructure. Lead with Pillar B (surgical vs systemic audit). |
| **Agency dependency** | Job posts mention "agency" or "recruiter" in careers page | Website scrape + Nano classification | Confirms they're currently paying agencies. Strong buying signal. |
| **International hiring** | Employees outside HQ country > 0 | Proxycurl employee distribution | More complex hiring = more infrastructure value. |

**n8n implementation:** Parallel enrichment branches after qualification

```
[Qualified Prospect]
    │
    ├──▶ [PredictLeads API] → funding signal
    ├──▶ [Proxycurl People Search] → hiring velocity + new leadership
    ├──▶ [Website Scrape + Nano] → agency dependency signal
    └──▶ [Proxycurl Company] → international employee distribution
    │
    ▼
[Merge Node] → combine all signals into JSONB
```

**Signal output (stored in `prospects.signals`):**

```json
{
  "recent_funding": {
    "detected": true,
    "amount": "5000000",
    "date": "2025-11-15",
    "round": "Series A"
  },
  "hiring_velocity": {
    "detected": true,
    "open_roles": 7,
    "recent_hires_6mo": 12
  },
  "new_leadership": {
    "detected": true,
    "role": "CTO",
    "name": "Sarah Chen",
    "start_date": "2025-09-01"
  },
  "agency_dependency": {
    "detected": false,
    "evidence": null
  },
  "international_hiring": {
    "detected": true,
    "countries": ["UK", "Germany", "India"],
    "international_employee_count": 15
  }
}
```

---

### STEP 4: Scoring & Message Routing (n8n + Spacebot Agent 01)

**Eric's Clay equivalent:** "Golden" formula combining all signals

**Two paths here:**

#### Path A: Simple scoring (n8n Function Node)

For speed, do the basic scoring in n8n without calling Spacebot:

```javascript
// n8n Function Node: Score & Route
const p = $input.item.json;
const signals = p.signals;

// Count active signals
const signalCount = [
  signals.recent_funding?.detected,
  signals.hiring_velocity?.detected,
  signals.new_leadership?.detected,
  signals.agency_dependency?.detected,
  signals.international_hiring?.detected
].filter(Boolean).length;

// Score
let score = 'must_have'; // already qualified from step 2
if (signalCount >= 3) score = 'golden';
else if (signalCount >= 2) score = 'strong';

// Message route — which pillar leads the email
let message_route = 'pillar_c_default'; // Pragmatic Costing as default lead
let lead_pillar = 'C';

if (signals.hiring_velocity?.detected && signals.hiring_velocity.open_roles >= 5) {
  message_route = 'pillar_a_compound';
  lead_pillar = 'A'; // Steady-State — they're hiring now, process matters
}
if (signals.new_leadership?.detected) {
  message_route = 'pillar_b_diagnostic';
  lead_pillar = 'B'; // Surgical vs Systemic — new leader = fresh audit
}
if (signals.recent_funding?.detected) {
  message_route = 'pillar_c_funding';
  lead_pillar = 'C'; // Pragmatic Costing — they have budget, show the maths
}
if (signals.agency_dependency?.detected) {
  message_route = 'pillar_c_agency_confirmed';
  lead_pillar = 'C'; // Confirmed agency user — direct comparison
}

// Golden gets special handling
if (score === 'golden') {
  message_route = 'golden_full_ideas'; // All 3 ideas, Format A
}

return {
  json: {
    ...p,
    score,
    signal_count: signalCount,
    message_route,
    lead_pillar
  }
};
```

#### Path B: Rich scoring (call Spacebot Agent 01)

For high-value prospects, pipe the enrichment data to the Account Scorer agent via Spacebot API for full ICP classification with recommended approach.

**n8n HTTP Request Node → Spacebot API:**

```
POST https://your-spacebot-instance/api/agents/01-account-scorer/chat
Body: {
  "message": "Score this prospect: {{company_name}}, {{employee_count}} employees, {{industry}}, {{business_type}}. Signals: {{signals_summary}}. Provide ICP match, priority, and recommended pillar."
}
```

**When to use Path A vs Path B:**
- Path A: Bulk processing (100+ prospects). Fast, cheap, deterministic.
- Path B: Prospects scoring `golden` or `strong`. Worth the extra agent call for nuanced classification.

---

### STEP 5: Creative Ideas Generation (Spacebot Agent 05)

**Eric's Clay equivalent:** AI column with cached system prompt + company description

**n8n implementation:** HTTP Request to Spacebot Agent 05

```
[Scored Prospect with score != 'disqualified']
    │
    ▼
[HTTP Request Node]
POST https://your-spacebot-instance/api/agents/05-creative-ideas/chat
Body: {
  "message": "Company: {{company_name}}\nDescription: {{company_description}}\nMarket: {{country == 'UK' ? 'UK' : 'US'}}\nFormat: {{score == 'golden' ? 'A' : 'B'}}"
}
    │
    ▼
[Parse Response] → Extract ideas from agent response
    │
    ▼
[Update Supabase] → Store in prospects.creative_ideas
```

**Format routing:**
- `golden` → Format A (full 3 bullets — these are your best prospects, give them the full email)
- `strong` → Format A or B (your call — test both)
- `must_have` → Format B (one-liner — volume play, keep it short)

**Batch processing note:** Process these sequentially with a 200ms delay between calls. Spacebot rate limits vary by plan. For 100 prospects, expect ~3-5 minutes total processing time.

---

### STEP 6: Email Assembly & Smartlead Push (n8n)

**n8n Workflow: `exprs-smartlead-push`**

Takes the scored, ideas-generated prospects and pushes them into Smartlead campaigns.

```
[Supabase Query: prospects WHERE score != 'disqualified' AND creative_ideas IS NOT NULL]
    │
    ├──▶ [golden] → Smartlead Campaign: "Exprs Golden - Full Ideas"
    │    Template: 3-bullet creative ideas email (Format A)
    │    Sequence: p1 (ideas) → p2 (Pillar A follow-up) → p3 (Pillar B) → p4 (CIPD data) → e1 (exit)
    │
    ├──▶ [strong] → Smartlead Campaign: "Exprs Strong - One-Liner Ideas"
    │    Template: One-liner creative ideas email (Format B)
    │    Sequence: p1 (one-liner) → p2 (relevant pillar) → e1 (exit)
    │
    └──▶ [must_have] → Smartlead Campaign: "Exprs Must-Have - Standard"
         Template: Standard PP-Email sequence (from Agent 02)
         Sequence: Standard p1→p4→e1

```

**Smartlead API call (n8n HTTP Request):**

```
POST https://server.smartlead.ai/api/v1/campaigns/{campaign_id}/leads
Headers: { "Content-Type": "application/json" }
Query: api_key={{SMARTLEAD_API_KEY}}
Body: {
  "lead_list": [
    {
      "email": "{{contact_email}}",
      "first_name": "{{contact_name.split(' ')[0]}}",
      "last_name": "{{contact_name.split(' ').slice(1).join(' ')}}",
      "company_name": "{{company_name}}",
      "custom_fields": {
        "creative_idea_1": "{{creative_ideas.idea_1}}",
        "creative_idea_2": "{{creative_ideas.idea_2}}",
        "creative_idea_3": "{{creative_ideas.idea_3}}",
        "one_liner": "{{creative_ideas.one_liner}}",
        "lead_pillar": "{{lead_pillar}}",
        "score": "{{score}}",
        "signal_summary": "{{signal_summary}}"
      }
    }
  ]
}
```

**Smartlead email template uses custom variables:**

```
{{first_name}}, I was looking at {{company_name}} and had three observations about how your hiring could work differently:

1. {{creative_idea_1}}

2. {{creative_idea_2}}

3. {{creative_idea_3}}

Any of those worth a conversation?

— Brenan
```

---

### STEP 7: Learning Loop (Smartlead → n8n → Supabase)

**You already have this partially built** (Smartlead webhook → Slack integration).

Extend it to close the feedback loop:

```
[Smartlead Webhook: EMAIL_REPLY]
    │
    ▼
[n8n Webhook Trigger]
    │
    ├──▶ [Slack Notification] (existing)
    │
    └──▶ [Supabase Update]
         UPDATE prospects SET
           reply_received = true,
           reply_date = NOW(),
           reply_sentiment = {{nano_classify(reply_text)}},
           reply_text = {{preview_text}}
         WHERE contact_email = {{lead_email}}
```

**Why this matters:** Over time, you can query Supabase to find:
- Which signals predict replies? (funding? new leadership? hiring velocity?)
- Which score tier gets the best response rate? (golden vs strong vs must_have)
- Which pillar leads to the most meetings? (A vs B vs C)
- Which creative ideas format works better? (3-bullet vs one-liner)

This is the compound efficiency Exprs sells — and you should be running it on your own outbound.

---

## Complete n8n Workflow Map

```
WORKFLOW 1: exprs-prospect-ingest (trigger: manual / Attio webhook / schedule)
  ┌─────────┐   ┌──────────┐   ┌───────────┐   ┌─────────┐
  │ Trigger │──▶│ Enrich   │──▶│ Qualify   │──▶│ Store   │
  │         │   │ (APIs)   │   │ (formula) │   │(Supabse)│
  └─────────┘   └──────────┘   └─────┬─────┘   └─────────┘
                                     │
                              [If disqualified → stop]

WORKFLOW 2: exprs-signal-detect (trigger: new qualified prospect in Supabase)
  ┌─────────┐   ┌──────────────────┐   ┌──────────┐   ┌─────────┐
  │ Supabase│──▶│ Signal Detection │──▶│ Score &  │──▶│ Update  │
  │ trigger │   │ (parallel APIs)  │   │ Route    │   │ Supabase│
  └─────────┘   └──────────────────┘   └──────────┘   └─────────┘

WORKFLOW 3: exprs-creative-ideas (trigger: scored prospect ready for ideas)
  ┌─────────┐   ┌──────────────────┐   ┌──────────┐   ┌─────────┐
  │ Supabase│──▶│ Spacebot         │──▶│ Parse    │──▶│ Update  │
  │ trigger │   │ Agent 05 API     │   │ Response │   │ Supabase│
  └─────────┘   └──────────────────┘   └──────────┘   └─────────┘

WORKFLOW 4: exprs-smartlead-push (trigger: manual / schedule)
  ┌─────────┐   ┌──────────────────┐   ┌──────────┐
  │ Supabase│──▶│ Route to correct │──▶│ Smartlead│
  │ query   │   │ Smartlead camp.  │   │ API push │
  └─────────┘   └──────────────────┘   └──────────┘

WORKFLOW 5: exprs-reply-loop (trigger: Smartlead webhook)
  ┌─────────┐   ┌──────────────────┐   ┌──────────┐
  │ Webhook │──▶│ Classify reply + │──▶│ Update   │
  │ trigger │   │ Slack notify     │   │ Supabase │
  └─────────┘   └──────────────────┘   └──────────┘
```

---

## Cost Comparison

### Clay (Eric's approach)

| Component | Cost |
|-----------|------|
| Clay enrichment | $0.10-0.50/prospect (credits) |
| Clay AI column | Included but opaque pricing |
| Smartlead | $94/month (Pro) |
| **Per 1,000 prospects** | **$100-500 (Clay) + $94 (Smartlead)** |

### Your Stack

| Component | Cost |
|-----------|------|
| Proxycurl/Apollo enrichment | $0.01-0.03/prospect |
| PredictLeads signals | $0.01/prospect |
| Spacebot Agent 05 (Nano) | $0.001-0.002/prospect |
| n8n (self-hosted) | $0 (already running) |
| Supabase (self-hosted) | $0 (already running) |
| Smartlead | $94/month (Pro) |
| **Per 1,000 prospects** | **$12-32 (enrichment) + $1-2 (AI) + $94 (Smartlead)** |

**Saving: 70-90% on variable costs vs Clay**

---

## Implementation Priority

### Phase 1: Get Ideas Flowing (Week 1)
- [ ] Create Supabase `prospects` table
- [ ] Build n8n Workflow 1 (manual CSV → enrich → qualify → store)
- [ ] Build n8n Workflow 3 (Spacebot Agent 05 integration)
- [ ] Build n8n Workflow 4 (Smartlead push — single campaign)
- [ ] Test with 10 hand-picked prospects
- **Goal:** 10 prospects from CSV to personalised emails in Smartlead

### Phase 2: Signal Detection (Week 2)
- [ ] Build n8n Workflow 2 (signal detection — start with funding + hiring velocity)
- [ ] Add scoring logic (golden/strong/must_have)
- [ ] Add message routing (which campaign based on score)
- [ ] Create 3 Smartlead campaigns (golden, strong, must_have)
- **Goal:** 100 prospects scored and routed to correct campaigns

### Phase 3: Learning Loop (Week 3)
- [ ] Extend existing Smartlead webhook (Workflow 5) to update Supabase
- [ ] Build reply analysis queries (which signals predict replies)
- [ ] Iterate: add more signals, refine scoring weights
- **Goal:** Data flowing back to inform future batches

### Phase 4: Scale (Week 4+)
- [ ] Attio webhook integration (new contacts auto-flow through pipeline)
- [ ] Add remaining signal types (new leadership, agency dependency, international)
- [ ] A/B test Format A vs Format B in Smartlead
- [ ] Dashboard in Teable showing pipeline status, reply rates by score
- **Goal:** Continuous flow, 100+ prospects/week fully automated

---

## Spacebot Agent Updates Required

### Agent 05 (Creative Ideas) — Already Built
No changes needed. Just needs to be accessible via HTTP API from n8n.

### Agent 01 (Account Scorer) — Minor Update
Add a "quick score" mode that accepts enrichment data and returns just: `{score, lead_pillar, message_route}` — no narrative, just the classification. For n8n integration, speed matters more than explanation.

### Agent 03 (Research Intel) — Optional Enhancement
For `golden` prospects, trigger a full RESEARCH_PACK. This feeds into Agent 02 (Email Writer) for the deep PP-Email sequence as a follow-up campaign after the Creative Ideas first-touch.

---

## Decision Points for Brenan

1. **Enrichment provider:** Apollo ($0.01/contact, most data in one call) vs Proxycurl + PredictLeads (more granular, slightly more expensive)?

2. **Signal priority:** Start with just funding + hiring velocity (cheapest), or add new leadership + agency dependency from day one?

3. **Spacebot API access:** How does your Spacebot instance expose agent APIs? HTTP endpoint? Webhook? This determines how n8n calls Agent 05.

4. **Smartlead campaign structure:** Three campaigns (golden/strong/must_have) or one campaign with conditional variables?

5. **Teable vs raw Supabase:** Use Teable as the visual "Clay table" interface for reviewing prospects before push, or fully automate with Supabase triggers?
