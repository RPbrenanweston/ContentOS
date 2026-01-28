# RSS Feed Aggregator Guide

**Last Updated:** 2026-01-28
**Version:** 1.0.0

## Overview

The RSS Feed Aggregator is a zero-cost automated signal detection system that polls tech news, security industry sources, and LinkedIn company posts every 24 hours. It extracts signals (HIRING, COMPANY, INDIVIDUAL), classifies them with confidence scores, deduplicates intelligently, and stores them in the Supabase signals table linked to companies.

### Key Benefits

- **Zero-cost data acquisition**: RSS feeds are free
- **Daily automated updates**: Fresh signals every morning at 6am
- **Intelligent company matching**: Links signals to existing companies in database
- **Confidence scoring**: 0-100 score based on source quality, pattern matching, and company relevance
- **Deduplication**: Tracks multiple sources mentioning same opportunity without creating duplicates

## Architecture

```
┌─────────────────┐
│  RSS Feeds      │  8 sources (TechCrunch, SecurityWeek, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Aggregator     │  Fetches and parses feed items
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Classifier     │  Categorizes: HIRING/COMPANY/INDIVIDUAL
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Matcher        │  Links to companies (exact/domain/fuzzy)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Scorer         │  Calculates confidence 0-100
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deduplicator   │  Merges sources if duplicate found
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │  Stores in signals table
│  signals table  │
└─────────────────┘
```

## Feed Sources

### Tech News (Company Growth Signals)

| Source | URL | Priority | Confidence Boost | Signal Types |
|--------|-----|----------|-----------------|--------------|
| **TechCrunch** | https://techcrunch.com/feed/ | High | +10 | COMPANY, HIRING |
| **VentureBeat** | https://venturebeat.com/feed/ | High | +10 | COMPANY |
| **CRN** | https://www.crn.com/feed | Medium | +5 | COMPANY |

**Why these sources:**
- Cover major tech company news (funding, acquisitions, product launches)
- High credibility and broad industry coverage
- Include hiring announcements from fast-growing companies

### Security Industry (Sector-Specific)

| Source | URL | Priority | Confidence Boost | Signal Types |
|--------|-----|----------|-----------------|--------------|
| **Bleeping Computer** | https://www.bleepingcomputer.com/feed/ | High | +15 | COMPANY, INDIVIDUAL |
| **SecurityWeek** | https://www.securityweek.com/feed/ | High | +15 | COMPANY, HIRING |
| **Dark Reading** | https://www.darkreading.com/rss_simple.asp | Medium | +10 | COMPANY |
| **The Hacker News** | https://feeds.feedburner.com/TheHackersNews | Medium | +10 | COMPANY, INDIVIDUAL |

**Why these sources:**
- Most relevant to AI security recruitment niche
- Cover security-specific hiring, leadership changes, and company news
- Higher confidence boost (+15) reflects domain relevance

### LinkedIn (Direct Company Announcements)

| Source | URL | Priority | Confidence Boost | Signal Types |
|--------|-----|----------|-----------------|--------------|
| **LinkedIn Pulse** | https://www.linkedin.com/pulse/rss | High | +20 | COMPANY, HIRING, INDIVIDUAL |

**Note:** LinkedIn RSS may require alternative scraping approach if authentication is needed. Highest confidence boost (+20) because it's direct from companies.

## Signal Classification

### Signal Types

**HIRING**: Job postings, hiring announcements, team expansion
- Detected by keywords: "hiring", "recruiting", "job opening", "join our team", "we're hiring", etc.
- Tags: `hiring_urgency:high`, `hiring_urgency:medium`

**COMPANY**: Funding, acquisitions, product launches, partnerships
- Detected by keywords: "raises", "funding round", "series A/B/C", "acquires", "launches", "announces", etc.
- Tags: `funding_signal`, `expansion_signal`, `product_launch`

**INDIVIDUAL**: Promotions, new hires, leadership changes
- Detected by keywords: "appoints", "names", "promotes", "new CEO", "new CTO", "joins as", etc.
- Tags: `leadership_change`

### Classification Logic

1. **Keyword scoring**: Count matches across 5 keyword categories
   - hiring_signals (9 keywords)
   - expansion_signals (6 keywords)
   - funding_signals (9 keywords)
   - leadership_signals (9 keywords)
   - product_signals (7 keywords)

2. **Type detection**: Highest score wins
   - If hiring_score >= other scores → HIRING
   - Else if leadership_score > company_score → INDIVIDUAL
   - Else → COMPANY

3. **Tag extraction**:
   - Urgency: "urgently", "immediately", "asap" → `hiring_urgency:high`
   - Domain tags: "AI", "cybersecurity" → `ai_related`, `security_related`

4. **Pattern confidence**: 50 (base) + (keyword_count × 5) + (tag_count × 5), capped at 100

## Company Matching

### Matching Strategies (in priority order)

#### 1. Exact Name Match (Confidence: 100)

Searches for exact company name in feed item text with word boundaries.

```python
# Example
text = "Acme Corp raises $50M Series B funding"
company_name = "Acme Corp"
# Match: YES (exact)
```

#### 2. Domain Extraction (Confidence: 95)

Extracts domain names from text and matches to company.domain field.

```python
# Example
text = "Visit acme.com for more details"
company_domain = "acme.com"
# Match: YES (domain)
```

Filters out common news site domains (techcrunch.com, linkedin.com, etc.)

#### 3. Fuzzy Name Match (Confidence: 85-99)

Uses Levenshtein distance to find similar company names.

```python
# Example
text = "CyberSec Solutions expands operations"
company_name = "CyberSec Solutions"
similarity = 95  # Partial ratio
# Match: YES (fuzzy) if similarity > 85
```

#### 4. No Match (Confidence: 0)

If no company match found, signal is skipped (not stored).

**Future enhancement:** Store unmatched signals in separate table for manual review.

## Confidence Scoring Algorithm

### Formula

```
final_score = base + source_boost + pattern_score + match_score + match_type_boost
```

Where:
- **base**: 30 points (baseline)
- **source_boost**: 0-20 from feed config (source quality)
- **pattern_score**: pattern_confidence × 0.3 (keyword matching quality)
- **match_score**: match_confidence × 0.2 (company match quality)
- **match_type_boost**:
  - exact: 30 points
  - domain: 25 points
  - fuzzy: 15 points
  - none: 0 points

**Capped at 100**

### Example Calculation

**High-confidence signal:**
```
Source: SecurityWeek (boost: 15)
Pattern: 90 (strong keyword matches)
Match: 100 (exact company name)
Match type: exact

Score = 30 + 15 + (90 × 0.3) + (100 × 0.2) + 30
      = 30 + 15 + 27 + 20 + 30
      = 122 → capped at 100
```

**Low-confidence signal:**
```
Source: CRN (boost: 5)
Pattern: 50 (weak keyword matches)
Match: 0 (no company match)
Match type: none

Score = 30 + 5 + (50 × 0.3) + (0 × 0.2) + 0
      = 30 + 5 + 15 + 0 + 0
      = 50
```

## Deduplication Strategy

### Hybrid Approach

**Goal:** One signal record per opportunity, track all sources that mentioned it

### Deduplication Criteria

A signal is considered duplicate if:
1. Same `company_id`
2. Same `signal_type`
3. Title similarity > 80% (fuzzy match)
4. Within 7 days

### Source Tracking

When duplicate found:
- DO NOT create new signal record
- DO append source to `metadata.sources` array

```json
{
  "metadata": {
    "sources": [
      {
        "source": "TechCrunch",
        "url": "https://techcrunch.com/article-1",
        "detected_at": "2026-01-28T10:00:00Z"
      },
      {
        "source": "VentureBeat",
        "url": "https://venturebeat.com/article-2",
        "detected_at": "2026-01-28T14:00:00Z"
      }
    ]
  }
}
```

### Benefits

- No duplicate signals cluttering dashboard
- Source trail preserved (know which outlets covered the story)
- Signal strength indicated by multiple sources

## Daily Polling Schedule

### Schedule: 6:00 AM Daily

**Why 6am?**
- Aligns with sales team workflow
- Fresh signals available when team starts work (8-9am)
- Overnight news captured before business day

### Scheduler Implementation

```python
# Uses schedule library
schedule.every().day.at("06:00").do(run_daily_signal_collection)
```

### Execution Flow

1. Fetch all 8 RSS feeds
2. Parse feed items (title, link, date, summary)
3. For each item:
   - Classify signal
   - Match to company
   - Score confidence
   - Check for duplicates
   - Insert or merge
4. Log statistics:
   - New signals created
   - Duplicates merged
   - Unmatched signals
   - Errors

### Running Manually

```bash
# Run once immediately
python -m backend.scheduler --once

# Start daemon (runs continuously)
python -m backend.scheduler
```

## Relevance Flagging

### Current Approach: Store All, Skip Unmatched

**Stored:**
- Signals matched to companies in database

**Skipped:**
- Signals with no company match (company_id = None)

### Future Enhancement: Unmatched Signals Table

Create separate table for unmatched signals:

```sql
CREATE TABLE unmatched_signals (
  id UUID PRIMARY KEY,
  title TEXT,
  source TEXT,
  source_url TEXT,
  detected_at TIMESTAMPTZ,
  classification JSONB,
  review_status TEXT DEFAULT 'pending'
);
```

Benefits:
- Manual review of missed opportunities
- Improve company matching over time
- Add missing companies to database

## Adding New RSS Feeds

### Step 1: Update feed_config.yaml

```yaml
feeds:
  security_industry:
    - name: "New Security Blog"
      url: "https://newsecurityblog.com/feed/"
      category: "security"
      signal_types: ["COMPANY", "HIRING"]
      priority: "medium"
      confidence_boost: 10
```

### Step 2: Test Feed Parsing

```python
from backend.rss_aggregator import RSSAggregator

aggregator = RSSAggregator()
feed_config = {
    'name': 'New Security Blog',
    'url': 'https://newsecurityblog.com/feed/',
    'category': 'security',
    'confidence_boost': 10
}

items = aggregator.fetch_feed(feed_config)
print(f"Fetched {len(items)} items")
```

### Step 3: Run Pipeline

No code changes needed - scheduler will automatically include new feed on next run.

## Troubleshooting

### Issue: Feed Fetch Fails

**Symptoms:** Error log: "Failed to fetch [Feed Name]"

**Causes:**
- Feed URL changed or removed
- Network timeout
- Feed requires authentication

**Solutions:**
1. Check feed URL in browser
2. Update URL in feed_config.yaml if changed
3. Increase timeout in rss_aggregator.py (default: 10s)
4. For auth-required feeds: implement authentication header

### Issue: No Signals Created

**Symptoms:** Pipeline runs but processed count = 0

**Causes:**
- No company matches found
- All signals are duplicates
- Companies table empty

**Solutions:**
1. Check company count: `SELECT COUNT(*) FROM companies`
2. Add companies via CSV upload (Plan 01-02)
3. Review unmatched signal logs
4. Lower fuzzy match threshold (current: 85%)

### Issue: High Duplicate Rate

**Symptoms:** duplicate_count >> processed_count

**Causes:**
- Feed includes old articles
- Same stories across multiple feeds
- Title similarity threshold too high

**Solutions:**
- This is normal and expected
- Multiple sources = higher signal confidence
- Adjust title similarity threshold in deduplicator.py (current: 80%)

### Issue: Low Confidence Scores

**Symptoms:** Most signals have confidence < 60

**Causes:**
- Weak keyword matches
- Fuzzy company matches
- Low-quality sources

**Solutions:**
1. Add more relevant keywords to feed_config.yaml
2. Improve company data (add more companies)
3. Adjust confidence formula weights in confidence_scorer.py

## Performance Optimization

### Current Performance

- **8 feeds**: ~2-3 minutes total fetch time
- **100 items**: ~30 seconds processing time
- **Database**: <10ms per query (with indexes)

### Optimization Tips

**1. Company Cache**
- Companies loaded once per pipeline run
- Refresh cache after CSV uploads: `matcher.refresh_companies()`

**2. Batch Insertions**
- Future: Insert signals in batches vs one-by-one
- Use Supabase batch insert: `table.insert([...]).execute()`

**3. Parallel Feed Fetching**
- Future: Fetch feeds concurrently using asyncio
- Current: Sequential (simpler, adequate for 8 feeds)

## Security Considerations

### Rate Limiting

- RSS feeds: No rate limits (public)
- Respect robots.txt and feed guidelines
- User-Agent header: "RSS Aggregator Bot/1.0"

### Data Privacy

- Store only public information from RSS feeds
- No PII collection
- Supabase RLS enabled (future: per-user access control)

### API Keys

Required environment variables:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Store in `.env` file (gitignored)

## Cost Analysis

### Monthly Cost: $0

**Breakdown:**
- RSS feeds: Free
- Supabase storage: ~100 signals/day × 30 days = 3,000 signals
  - Supabase free tier: 500MB (enough for ~100K signals)
- Compute: Runs on VPS/local machine (already allocated)

**Scaling:**
- 10 accounts: $0/month
- 100 accounts: $0/month (still within free tier)
- 1,000 accounts: ~$5/month (Supabase paid tier)

## Monitoring and Logs

### Daily Summary Log

```
2026-01-28 06:00:00 - Starting daily RSS signal collection
2026-01-28 06:01:23 - Fetched 45 items from TechCrunch
2026-01-28 06:01:45 - Fetched 38 items from SecurityWeek
...
2026-01-28 06:05:12 - Daily signal collection complete:
  - New signals created: 12
  - Duplicates merged: 8
  - Unmatched signals: 25
  - Errors: 0
  - Total feed items: 150
```

### Error Alerts

High error rate warning (>50% failures):
```
WARNING: High error rate: 80/150 items failed
```

### Future: Dashboard Metrics

- Signals per day (trend chart)
- Top signal sources
- Average confidence score
- Company match rate
- Duplicate rate

## Next Steps

### Phase 1 Complete ✅
- ✅ RSS aggregator built
- ✅ Signal classification working
- ✅ Company matching implemented
- ✅ Daily scheduler running

### Phase 2: Agent Architecture (Next)
- Orchestrator agent (distributes work)
- Company enrichment agent (adds context)
- Candidate matching agent (links supply to demand)
- Insight generation agent (creates personalized talking points)

### Phase 3: Agent Learning Loop
- Feedback collection (thumbs up/down)
- Prompt refinement based on feedback
- Confidence score calibration

---

## Quick Reference Commands

### Run Pipeline Once
```bash
python -m backend.scheduler --once
```

### Start Scheduler Daemon
```bash
python -m backend.scheduler
```

### Run Tests
```bash
pytest tests/test_rss_processing.py -v
```

### Check Pipeline Status
```sql
-- Recent signals
SELECT COUNT(*) AS new_signals
FROM signals
WHERE detected_at > NOW() - INTERVAL '1 day'
  AND is_active = TRUE;

-- Signal type breakdown
SELECT signal_type, COUNT(*) AS count
FROM signals
WHERE is_active = TRUE
GROUP BY signal_type;

-- Top sources
SELECT source, COUNT(*) AS count
FROM signals
WHERE is_active = TRUE
GROUP BY source
ORDER BY count DESC;
```

---

**End of Guide**
