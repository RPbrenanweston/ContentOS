# Phase 1: Data Foundation - Context

**Gathered:** 2025-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish zero-cost data ingestion pipeline (RSS feeds + CSV uploads), Supabase schema for companies/prospects/candidates/signals, and manual enrichment workflows. This phase delivers the data layer that agents will read from in Phase 2 and that syncs to Attio in Phase 4.

This phase does NOT include agent logic, Slack integrations, or CRM sync — those are separate phases.

</domain>

<decisions>
## Implementation Decisions

### CSV Upload & Enrichment
- **Three-table data model:** Companies, Prospects (decision makers), Candidates (supply-side talent)
- **Apollo CSV exports:** Import full Apollo contact exports with critical fields preserved:
  - Contact fields: name, email, title, seniority, departments (identify decision makers)
  - Company fields: name, domain, industry, employee count, funding, revenue (enrichment context)
  - Phone & location: included for outreach completeness
- **Data merge strategy:** New CSV uploads merge with existing records (new fields fill blanks, existing data preserved)
- **Source tracking:** Track CSV uploads as data source with timestamp (auditable, can track data freshness)
- **Candidate data model:** Detailed tracking with skills, compensation, availability, recruiter notes, interview history

### Supabase Schema & Relationships
- **Company → Prospects:** One-to-many (one company, many decision makers)
- **Signals:** Linked to both prospect AND company (supports both use cases: "person hired from X" and "company announced role")
- **Candidates:** Separate independent table (supply-side; different lifecycle from prospects)
- **Candidate-Prospect matches:** Separate matches table to track potential pairings (prepares for matching engine v2)
- **Schema independence:** Design independently of Attio, map to Attio fields on sync (flexibility to switch CRMs later)
- **Attio field mapping:** Map to Attio's standard fields (document during implementation)

### Audit & Metadata
- **Full audit trail:** All tables track created_at, updated_at, source_of_truth, confidence_level
- **Source tracking:** Which system created/modified each record (CSV upload, RSS, Attio sync, manual entry)
- **Deal lifecycle tracking:** Soft-delete signals (marked inactive, not removed) to track deal age, engagement status, conversion time, signal freshness impact

### RSS Feed Selection & Processing
- **Feed prioritization:** Focus on 3 signal types for MVP:
  1. **Tech news:** TechCrunch, CRN, VentureBeat (company growth signals)
  2. **Security industry:** Bleeping Computer, SecurityWeek, Dark Reading (sector-specific hiring)
  3. **LinkedIn company posts:** Direct company announcements (hiring, news)
- **Job boards deferred:** Not prioritized for MVP (too noisy without company filtering)
- **Poll frequency:** Every 24 hours (batch with daily digest, aligns with sales team cadence)
- **Deduplication strategy:** Hybrid — one signal record per opportunity, but track all sources that mentioned it (dedup strictly, preserve source trail)
- **RSS content storage:** Hybrid approach:
  - Store metadata: title, link, date, source (required)
  - Store AI-extracted summary: key points from full content (optional, for agent context)
  - Include link to full content (agents can fetch if needed)

### Signal Validation & Classification
- **Three-tier categorization:**
  1. **Primary categories:** HIRING (job postings), COMPANY (funding/news/launches), INDIVIDUAL (hires/promotions/activity)
  2. **Flexible tags:** enrichment layer (hiring_urgency=high, competitor_signal=true, expansion_signal=true)
  3. **Pattern-based confidence scoring:** Automatic validation based on signal source + pattern match
- **Confidence scoring:** Assign 0-100 score based on:
  - Source type (job board = high, social post = medium, news = high)
  - Pattern match (company name match = +20, keyword match = +10)
  - User feedback (thumbs up/down over time trains accuracy)
- **Signal-to-company matching:** Both name matching (exact/fuzzy) AND keyword matching
  - Increase confidence when both match (high relevance)
  - Flag for review if only one matches (medium relevance)
- **Relevance flagging:** Mark obviously irrelevant signals (store all, but flag) — agents see flags, feedback trains filtering accuracy
- **Signal aging & soft-delete:**
  - Mark signals inactive after 30 days (not deleted)
  - Track engagement status (when prospect contacted, deal won/lost)
  - Monitor "deal rot" — conversion time, signal freshness impact on success rate
  - Critical for learning: which signals → which outcomes → how long do we have to act

### Claude's Discretion
- Exact fuzzy-matching algorithm for company name deduplication
- How to handle person names with accents, special characters
- Supabase RLS (row-level security) policy design
- Specific regex patterns for extracting company info from RSS content
- Rate-limiting strategy for RSS feed polling and CSV uploads

</decisions>

<specifics>
## Specific Ideas

- **Three-table independence:** Candidates are NOT linked to prospects initially; candidates are "solutions looking for problems." Phase 2 agents will learn to match candidates to prospect hiring needs.
- **Deal tracking:** When you engage a prospect, mark the signal as "engaged" with contact date. Track outcomes (won/lost/stalled) and time-to-conversion. This is how agents learn signal quality.
- **Apollo data freshness:** Upload new Apollo exports monthly (or as needed). Schema supports versioning so you can see how prospect/company data evolved.
- **MVP simplicity:** Phase 1 is about collection and storage. No AI scoring yet — confidence scores are pattern-based (source + match). Agent learning comes in Phase 3.

</specifics>

<deferred>
## Deferred Ideas

- **Job board RSS feeds** — Initially skipped (too noisy without company filtering). Add in Phase 2+ once agents can classify relevance.
- **Real-time RSS polling** — MVP polls every 24h. Real-time triggering (every 1-2h) deferred to Phase 5 after proving ROI.
- **LinkedIn individual scraping** — Deferred. Phase 1 uses RSS; personal LinkedIn monitoring is Phase 2+ with stricter validation.
- **Automatic lead scoring** — Deferred to matching engine (v2). MVP is manual + pattern-based confidence scores.
- **Multi-recruiter profiles** — Phase 1 is single account. Multi-recruiter workspaces deferred to Phase 5 expansion.

</deferred>

---

*Phase: 01-data-foundation*
*Context gathered: 2025-01-27*
