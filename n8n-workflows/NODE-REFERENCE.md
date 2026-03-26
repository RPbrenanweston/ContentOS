# Exprs n8n Workflows — Node Reference
## Phase 1: Creative Ideas Campaign

---

## Environment Variables Required

Set these in n8n Settings → Variables (or `.env` for self-hosted):

| Variable | Description | Example |
|----------|-------------|---------|
| `LEADMAGIC_API_KEY` | LeadMagic API key | `lm_xxxxxxxxxxxxx` |
| `AIARK_API_TOKEN` | AI Ark API token (alternative enrichment) | `ark_xxxxxxxxxxxxx` |
| `SPACEBOT_BASE_URL` | Spacebot instance base URL (no trailing slash) | `https://spacebot.yourdomain.com` |
| `SPACEBOT_API_KEY` | Spacebot API bearer token | `sb_xxxxxxxxxxxxx` |
| `SMARTLEAD_API_KEY` | Smartlead API key | `sl_xxxxxxxxxxxxx` |
| `SMARTLEAD_CAMPAIGN_GOLDEN` | Campaign ID for golden-tier prospects | `12345` |
| `SMARTLEAD_CAMPAIGN_STRONG` | Campaign ID for strong-tier prospects | `12346` |
| `SMARTLEAD_CAMPAIGN_MUSTHAVE` | Campaign ID for must-have-tier prospects | `12347` |

---

## Credentials to Configure in n8n

1. **Supabase** — Create credential "Supabase Exprs" with your project URL + service role key
2. **LeadMagic** — Uses HTTP Header Auth (`X-API-Key`) via environment variable
3. **AI Ark** — Uses HTTP Header Auth (`X-TOKEN`) via environment variable
4. **Smartlead** — Uses query param auth (`api_key`) via environment variable
5. **Spacebot** — Uses Bearer token via environment variable

---

## Workflow 1: `exprs-prospect-ingest`

**Purpose:** Ingest prospects from CSV or webhook → enrich via LeadMagic → qualify against ICP → store in Supabase.

### Node Flow

```
Webhook Trigger ─┐
                 ├→ Merge Triggers → Validate & Normalize → Batch (Rate Limit)
CSV Upload ──────┘                        │                       │
  → Parse CSV                        [Rejected]            ┌─────┼──────┐
                                                           ▼     ▼      ▼
                                                     Company  Email   Funding
                                                     Enrich   Find    Data
                                                           │     │      │
                                                           └─────┼──────┘
                                                                 ▼
                                                        Merge Enrichment
                                                                 ▼
                                                        Classify B2B/B2C
                                                                 ▼
                                                        Qualify Prospect
                                                         │            │
                                                    [Qualified]  [Disqualified]
                                                         ▼            ▼
                                                    Store in       Store in
                                                    Supabase       Supabase
                                                         │
                                                         ▼
                                                    Respond to Webhook
```

### Nodes Detail

| # | Node Name | Type | Purpose |
|---|-----------|------|---------|
| 1 | **Webhook Trigger** | `webhook` | POST endpoint at `/exprs-prospect-ingest` — accepts JSON array of prospects |
| 2 | **CSV Upload Trigger** | `manualTrigger` | Manual trigger for CSV file upload processing |
| 3 | **Parse CSV** | `spreadsheetFile` | Converts uploaded CSV to JSON rows |
| 4 | **Merge Triggers** | `merge` | Combines webhook and CSV inputs into single stream |
| 5 | **Validate & Normalize** | `code` | Normalizes field names, derives domain from email, rejects incomplete records. **Two outputs:** validated → enrichment, rejected → stop |
| 6 | **Batch (Rate Limit)** | `splitInBatches` | Processes 1 prospect at a time to respect API rate limits |
| 7 | **LeadMagic: Company Enrich** | `httpRequest` | `POST api.leadmagic.io/v1/companies/company-search` — body: `{company_domain, company_name}` — returns `companyName, employeeCount, industry, description, revenue, total_funding, last_funding_amount, competitors` (1 credit) |
| 8 | **LeadMagic: Email Find** | `httpRequest` | `POST api.leadmagic.io/v1/people/email-finder` — body: `{first_name, last_name, domain, company_name}` — returns `email, status, employment_verified, mx_provider` (1 credit) |
| 9 | **LeadMagic: Funding Data** | `httpRequest` | `POST api.leadmagic.io/v1/companies/company-funding` — body: `{company_domain, company_name}` — detailed funding rounds (optional, Company Search includes headline data) |
| 10 | **Merge Enrichment** | `code` | Combines all 3 responses using verified camelCase field names (`companyName`, `employeeCount`, `revenue_formatted`, etc.) |
| 11 | **Classify B2B/B2C** | `code` | Heuristic B2B/B2C classifier using industry + description keywords. Swap for LLM call in production. |
| 12 | **Qualify Prospect** | `code` | ICP filter: 20-200 employees, B2B/B2B2C. **Two outputs:** qualified → Supabase, disqualified → Supabase (separate) |
| 13 | **Supabase: Store Qualified** | `supabase` | Inserts qualified prospect into `prospects` table |
| 14 | **Supabase: Store Disqualified** | `supabase` | Inserts disqualified prospect (for analytics — track why prospects fail) |
| 15 | **Respond to Webhook** | `respondToWebhook` | Returns processing summary to the webhook caller |

### AI Ark Integration Point (Verified Schemas)

The three LeadMagic HTTP Request nodes can be swapped for AI Ark. Here are the verified AI Ark endpoints:

**Company Search (replaces LeadMagic Company Enrich + Funding):**
```
POST https://api.ai-ark.com/api/developer-portal/v1/companies
Header: X-TOKEN: {your_token}
Body: {
  "account": {
    "domain": ["company.com"]    // or use name, linkedin, etc.
  },
  "page": 0,
  "size": 1
}
Response: {
  "content": [{
    "id": "uuid",
    "summary": {
      "name": "Company Inc",
      "description": "...",
      "overview": "...",
      "founded_year": 2015,
      "type": "PUBLIC_COMPANY",
      "industry": "technology"
    },
    "staff": { "total": 150, "range": { "start": 101, "end": 500 } },
    "link": { "website": "...", "domain": "...", "linkedin": "...", "twitter": "..." },
    "contact": { "email": "info@company.com", "phone": { "raw": "...", "sanitized": "..." } },
    "financial": {
      "funding": { "type": "SERIES_A", "total_amount": 5000000, "last_amount": 3000000, "num_investor": 5 }
    }
  }]
}
Rate Limits: 5 req/sec, 300/min, 18,000/hr
```

**People Search (replaces LeadMagic Email Find):**
```
POST https://api.ai-ark.com/api/developer-portal/v1/people
Header: X-TOKEN: {your_token}
Body: {
  "account": { "domain": ["company.com"] },
  "contact": { "name": "John Doe" },
  "page": 0,
  "size": 1
}
Rate Limits: 5 req/sec, 300/min, 18,000/hr
```

**Reverse Lookup (email → person profile):**
```
POST https://api.ai-ark.com/api/developer-portal/v1/people/reverse-lookup
Header: X-TOKEN: {your_token}
Body: { "search": "john@company.com" }
```

**Field mapping if using AI Ark in Merge Enrichment node:**
| AI Ark Field | Maps To |
|---|---|
| `content[0].summary.name` | `company_name` |
| `content[0].summary.description` | `company_description` |
| `content[0].staff.total` | `employee_count` |
| `content[0].summary.industry` | `industry` |
| `content[0].summary.founded_year` | `founded_year` |
| `content[0].financial.funding.total_amount` | `total_funding` |
| `content[0].financial.funding.last_amount` | `last_funding_amount` |
| `content[0].financial.funding.type` | `funding_stage` |
| `content[0].link.website` | `website` |
| `content[0].link.linkedin` | `linkedin_url` |

---

## Workflow 3: `exprs-creative-ideas`

**Purpose:** Poll Supabase for qualified prospects without ideas → call Spacebot Agent 05 → parse response → store ideas.

### Node Flow

```
Schedule Trigger (15min)
       ▼
Supabase: Get Unprocessed (qualified=true, creative_ideas=null)
       ▼
Check Empty → [empty? stop]
       ▼
Batch (1 at a time)
       ▼
Build Spacebot Prompt (format A or B based on score)
       ▼
Spacebot: Agent 05 Ideas (HTTP POST)
       ▼
Parse Ideas Response (extract structured ideas from text)
       ▼
Supabase: Update Ideas
       │
       ├→ Wait 300ms → loop back to Batch
       └→ Processing Summary
```

### Nodes Detail

| # | Node Name | Type | Purpose |
|---|-----------|------|---------|
| 1 | **Schedule Trigger** | `scheduleTrigger` | Every 15 minutes — adjust based on prospect volume |
| 2 | **Supabase: Get Unprocessed** | `supabase` | Fetches up to 25 prospects where `qualified=true` AND `creative_ideas IS NULL` |
| 3 | **Check Empty** | `code` | Stops workflow if no prospects need processing |
| 4 | **Batch (1 at a time)** | `splitInBatches` | Sequential processing for Spacebot rate limits |
| 5 | **Build Spacebot Prompt** | `code` | Constructs the Agent 05 message with company context, format (A/B), and market (UK/US) |
| 6 | **Spacebot: Agent 05 Ideas** | `httpRequest` | `POST {SPACEBOT_BASE_URL}/api/agents/05-creative-ideas/chat` |
| 7 | **Parse Ideas Response** | `code` | Extracts structured ideas (idea_1, idea_2, idea_3, one_liner) from agent text response |
| 8 | **Supabase: Update Ideas** | `supabase` | Updates `creative_ideas` JSONB column on the prospect record |
| 9 | **Wait 300ms** | `wait` | Rate limit pause before next batch item |
| 10 | **Processing Summary** | `code` | Logs total processed, success/fail counts |

### Format Routing Logic

- `golden` score → Format A (3 full bullet ideas)
- `strong` score → Format A (can A/B test with B later)
- `must_have` score → Format B (one-liner)

---

## Workflow 4: `exprs-smartlead-push`

**Purpose:** Fetch prospects ready to send → route to correct Smartlead campaign by score → push via API → mark as sent.

### Node Flow

```
Schedule Trigger (hourly)
       ▼
Supabase: Get Ready Prospects (qualified, has ideas, not sent)
       ▼
Check Empty → [empty? stop]
       ▼
Build Smartlead Payload (name split, custom fields)
       ▼
Route by Score (switch node)
       │         │           │
  [golden]   [strong]   [must_have]
       ▼         ▼           ▼
  Smartlead  Smartlead   Smartlead
  Golden     Strong      Must-Have
  Campaign   Campaign    Campaign
       │         │           │
       └─────────┼───────────┘
                 ▼
          Merge Results
                 ▼
       Parse Smartlead Response
                 ▼
       Supabase: Mark as Sent
                 ▼
          Push Summary
```

### Nodes Detail

| # | Node Name | Type | Purpose |
|---|-----------|------|---------|
| 1 | **Schedule Trigger** | `scheduleTrigger` | Hourly check for new prospects to push |
| 2 | **Supabase: Get Ready Prospects** | `supabase` | Fetches all prospects where `qualified=true`, `creative_ideas IS NOT NULL`, `sent_at IS NULL` |
| 3 | **Check Empty** | `code` | Stops if nothing to push |
| 4 | **Build Smartlead Payload** | `code` | Splits contact name, maps custom fields (idea_1-3, one_liner, pillar, score, signals) |
| 5 | **Route by Score** | `switch` | 3 outputs: golden → output 0, strong → output 1, must_have → output 2 |
| 6 | **Smartlead: Golden Campaign** | `httpRequest` | `POST server.smartlead.ai/api/v1/campaigns/{id}/leads` |
| 7 | **Smartlead: Strong Campaign** | `httpRequest` | Same endpoint, different campaign ID |
| 8 | **Smartlead: Must-Have Campaign** | `httpRequest` | Same endpoint, different campaign ID |
| 9 | **Merge Results** | `merge` | Combines all three campaign push responses |
| 10 | **Parse Smartlead Response** | `code` | Extracts success/failure status, campaign ID |
| 11 | **Supabase: Mark as Sent** | `supabase` | Updates `sent_at` and `smartlead_campaign_id` on prospect record |
| 12 | **Push Summary** | `code` | Aggregates push stats by score tier |

---

## Smartlead Custom Variables (set in Smartlead email templates)

| Variable | Source | Used In |
|----------|--------|---------|
| `{{first_name}}` | Contact name (first) | All templates |
| `{{company_name}}` | Company name | All templates |
| `{{creative_idea_1}}` | Agent 05 output | Golden template |
| `{{creative_idea_2}}` | Agent 05 output | Golden template |
| `{{creative_idea_3}}` | Agent 05 output | Golden template |
| `{{one_liner}}` | Agent 05 output | Strong template |
| `{{lead_pillar}}` | Scoring logic (A/B/C) | Follow-up templates |
| `{{score}}` | Prospect score tier | Internal tracking |
| `{{signal_summary}}` | Detected signals list | Personalisation |

---

## Supabase Table (create before running)

```sql
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_description TEXT,
  contact_name TEXT,
  contact_title TEXT,
  contact_email TEXT UNIQUE,
  employee_count INTEGER,
  industry TEXT,
  subindustry TEXT,
  business_type TEXT,
  total_funding NUMERIC,
  last_funding_date DATE,
  last_funding_amount NUMERIC,
  funding_stage TEXT,
  estimated_revenue TEXT,
  country TEXT,
  linkedin_url TEXT,
  website TEXT,
  -- Enrichment metadata
  enriched_at TIMESTAMPTZ,
  enrichment_source TEXT,
  -- Qualification
  qualified BOOLEAN DEFAULT FALSE,
  qualification TEXT,
  disqualify_reason TEXT,
  -- Signals & Scoring (populated by Phase 2 workflows)
  signals JSONB DEFAULT '{}',
  score TEXT,
  lead_pillar TEXT,
  message_route TEXT,
  -- Creative Ideas
  creative_ideas JSONB,
  -- Smartlead
  smartlead_campaign_id TEXT,
  sent_at TIMESTAMPTZ,
  -- Learning Loop (populated by Phase 3 workflows)
  reply_received BOOLEAN DEFAULT FALSE,
  reply_date TIMESTAMPTZ,
  reply_sentiment TEXT,
  reply_text TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for workflow queries
CREATE INDEX idx_prospects_qualified_unsent ON prospects (qualified, sent_at) WHERE qualified = true AND sent_at IS NULL;
CREATE INDEX idx_prospects_needs_ideas ON prospects (qualified, creative_ideas) WHERE qualified = true AND creative_ideas IS NULL;
CREATE INDEX idx_prospects_email ON prospects (contact_email);
```

---

## Setup Checklist

- [ ] Create Supabase `prospects` table (SQL above)
- [ ] Set all environment variables in n8n
- [ ] Create Supabase credential in n8n
- [ ] Import Workflow 1 → test with 1 manual prospect via webhook
- [ ] Verify LeadMagic endpoints return data (check response field mappings)
- [ ] Import Workflow 3 → test with 1 qualified prospect in Supabase
- [ ] Verify Spacebot Agent 05 API URL and response format
- [ ] Create 3 Smartlead campaigns with custom variable templates
- [ ] Import Workflow 4 → test with 1 prospect that has creative ideas
- [ ] Run end-to-end: 10 prospects from CSV → emails in Smartlead
