# Phase 4: Integration & Digests - Research

**Researched:** 2026-01-27
**Domain:** Slack/Attio integrations, scheduled digest reporting, API automation
**Confidence:** HIGH (for Slack/Attio APIs), MEDIUM (for architecture patterns), MEDIUM-LOW (for reporter agent specifics)

## Summary

Phase 4 requires integrating three core systems: Slack (outbound digest delivery), Attio CRM (account notes sync), and a reporter agent that synthesizes signals and trends into actionable daily digests. The research covered Slack API capabilities for rich message formatting and feedback collection, Attio API rate limits and data sync patterns, scheduling strategies for timezone-aware daily jobs, and best practices for scannable, actionable digest formats.

Key findings:
- Slack API is stable and free tier has sufficient capacity for 10 pilot accounts (no rate limits differ by plan)
- Attio API allows 100 req/s for reads, 25 req/s for writes; batch operations require manual chunking
- Scheduled delivery to GMT and EST requires application-level timezone handling (cron DST issues are real)
- Standard digest format separates signals, trends, and relevance framing into visual sections
- Reporter agent should follow multi-agent synthesis pattern: aggregate upstream findings → apply ranking → format for channel

**Primary recommendation:** Use node-schedule (or APScheduler if Python) with timezone-aware scheduling, Slack Block Kit for digest formatting with callback buttons for feedback, Attio REST API with exponential backoff retry logic for sync, and template engine (Nunjucks or EJS) for consistent digest format across channels.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node-schedule | 2.x | Daily job scheduling with timezone support | Lightweight, supports cron + human-readable syntax, no external dependencies |
| @slack/web-api | 6.x | Slack message posting and interaction handling | Official SDK, handles OAuth, rate limiting, retries built-in |
| Nunjucks | 3.x | Template engine for digest formatting | Mozilla-backed, flexible, safe by default, good for iterating digest format |
| axios or node-fetch | Latest | HTTP client for Attio API calls | Standard for Node.js API integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| p-retry or async-retry | Latest | Exponential backoff retry logic | Handling Attio rate limits and transient failures |
| luxon | 3.x | Timezone-aware datetime manipulation | Converting 9 AM GMT/EST to correct cron times; handles DST automatically |
| dotenv | Latest | Environment configuration | Slack token, Attio API key, timezone settings |
| node-cache or redis | Latest | In-memory/distributed caching | Cache digest state to avoid duplicate posts; optional for basic MVP |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node-schedule | APScheduler (Python) or cron-job-scheduler | APScheduler has better DST handling; cron-job-scheduler is simpler but less flexible |
| Nunjucks | EJS, Pug, or Handlebars | EJS lighter weight; Pug more compact syntax; Nunjucks most feature-complete |
| @slack/web-api | bolt (Slack's framework) | Bolt adds server/event handling; Web API is lower-level, sufficient for simple posting |
| luxon | date-fns or moment.js | date-fns is modular; moment.js heavier but familiar; luxon best for timezone complexity |

**Installation:**
```bash
npm install node-schedule @slack/web-api nunjucks axios p-retry luxon dotenv
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── reporters/           # Reporter agent logic
│   ├── synthesizer.js   # Multi-source aggregation
│   ├── ranker.js        # Signal/trend prioritization
│   └── formatter.js     # Digest template rendering
├── integrations/        # External API clients
│   ├── slack.js         # Slack posting, feedback handling
│   ├── attio.js         # Account notes sync, prospect enrichment
│   └── retryable.js     # Exponential backoff wrapper
├── schedules/           # Daily job definitions
│   ├── digest-generator.js
│   └── attio-sync.js
├── templates/           # Nunjucks digest format files
│   ├── digest-block.njk
│   ├── signal-block.njk
│   └── trends-block.njk
└── config.js            # Timezone, schedule timing config
```

### Pattern 1: Multi-Agent Synthesis (Reporter)
**What:** Reporter agent receives structured findings from upstream Researcher and Resourcer agents, then synthesizes into unified digest with ranked signals, trends, and relevance framings.

**When to use:** Always; this is the core reporter responsibility.

**Structure:**
1. **Aggregator** — Collects all signals and trends from upstream agents (via Supabase shared context)
2. **Ranker** — Applies scoring/weighting to pick top 3 signals and top 3 trends per account
3. **Framer** — Generates relevance copy explaining why each signal matters to this account
4. **Formatter** — Renders into Slack Block Kit JSON and Attio note text

**Example:**
```javascript
// Source: Industry patterns for multi-agent LLM workflows (n8n Multi-Agent Framework)
async function synthesizeDigest(accountId, researcherFindings, resourcerFindings) {
  // Step 1: Aggregate
  const allSignals = [...researcherFindings.signals, ...resourcerFindings.signals];
  const allTrends = [...researcherFindings.trends, ...resourcerFindings.trends];

  // Step 2: Rank (simple scoring + dedup)
  const rankedSignals = rankAndDedup(allSignals).slice(0, 3);
  const rankedTrends = rankAndDedup(allTrends).slice(0, 3);

  // Step 3: Frame (use Claude to generate copy)
  const framed = await Promise.all(
    rankedSignals.map(signal =>
      claude.messages.create({
        model: 'claude-opus-4-5',
        messages: [{
          role: 'user',
          content: `Write 1 sentence explaining why this signal matters to hiring at ${account.name}: "${signal.text}"`
        }]
      })
    )
  );

  // Step 4: Format for Slack + Attio
  return {
    slack: formatAsBlockKit(rankedSignals, rankedTrends, framed),
    attio: formatAsNote(rankedSignals, rankedTrends, framed)
  };
}
```

### Pattern 2: Timezone-Aware Scheduling
**What:** Schedule daily digests at 9 AM GMT and 9 AM EST without hardcoding UTC offsets.

**When to use:** For all recurring daily jobs; essential to avoid DST transition bugs.

**Example:**
```javascript
// Source: APScheduler documentation, luxon timezone handling
const schedule = require('node-schedule');
const { DateTime } = require('luxon');

// Define timezones and their target local times
const digests = [
  { tz: 'Europe/London', hour: 9, minute: 0 },  // 9 AM GMT/BST
  { tz: 'America/New_York', hour: 9, minute: 0 } // 9 AM EST/EDT
];

for (const digest of digests) {
  // Create cron rule that respects timezone
  // node-schedule doesn't have native timezone support; use hourly check instead
  schedule.scheduleJob('0 * * * *', async () => {
    const now = DateTime.now().setZone(digest.tz);
    if (now.hour === digest.hour && now.minute === digest.minute) {
      await generateAndSendDigest(digest.tz);
    }
  });

  // Alternative: use APScheduler (Python) for native timezone support
  // scheduler.add_job(generateDigest, 'cron', hour=9, minute=0, timezone='Europe/London')
}
```

### Pattern 3: Slack Block Kit Digest Format
**What:** Rich message layout with sections for signals, trends, relevance framing, and feedback buttons.

**When to use:** Every Slack digest post.

**Example:**
```javascript
// Source: Slack API documentation - Block Kit
function formatDigestAsBlocks(account, signals, trends, relevance) {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 Daily Digest: ${account.name}`,
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*3 Signals:*\n${signals.map(s => `• ${s.title}: ${s.text}`).join('\n')}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*3 Trends:*\n${trends.map(t => `• ${t.title}: ${t.text}`).join('\n')}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Why it matters:*\n${relevance.join('\n')}`
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '👍 Useful', emoji: true },
          action_id: `feedback_useful_${account.id}`,
          value: 'useful'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '👎 Not useful', emoji: true },
          action_id: `feedback_notuseful_${account.id}`,
          value: 'not_useful'
        }
      ]
    }
  ];
}
```

### Pattern 4: Attio Batch Sync with Exponential Backoff
**What:** Post account notes and update prospect records with automatic retry logic.

**When to use:** Daily Attio sync after digest generation.

**Example:**
```javascript
// Source: Attio API rate limiting docs + batch error handling patterns
const pRetry = require('p-retry');
const axios = require('axios');

async function syncToAttio(digests) {
  const client = axios.create({
    baseURL: 'https://api.attio.com/v2',
    headers: { 'Authorization': `Bearer ${process.env.ATTIO_API_KEY}` }
  });

  for (const { accountId, noteText, trendData } of digests) {
    // Pattern: Wrap API call with p-retry for exponential backoff
    await pRetry(
      async () => {
        // POST account note
        const noteResp = await client.post(`/objects/accounts/${accountId}/notes`, {
          data: { content: noteText }
        });

        // PUT prospect enrichment (tech stack, hiring trends, etc.)
        const trendResp = await client.put(`/objects/accounts/${accountId}/enrichment`, {
          data: trendData
        });

        return { noteResp, trendResp };
      },
      {
        onFailedAttempt: error => {
          if (error.response?.status === 429) {
            // Rate limited: p-retry will use exponential backoff
            console.log(`Rate limited, retrying in ${error.response.headers['retry-after']}s`);
          } else {
            throw error; // Don't retry on non-rate-limit errors
          }
        },
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 10000
      }
    );
  }
}
```

### Anti-Patterns to Avoid
- **Hardcoded UTC times for GMT/EST:** Breaks during DST transitions. Use timezone-aware libraries instead.
- **Posting digest to Slack synchronously inside digest generator:** If Slack API fails, digest generation blocks. Use fire-and-forget with error handling.
- **Chunking Attio API calls manually:** Use batch endpoints if available, or queue failed requests for retry rather than synchronous retries.
- **Storing digest state in memory only:** If scheduler restarts, digests may re-send or be lost. Persist to Supabase.
- **Single ranking rule for all accounts:** Ranking heuristic should be tunable (weights stored in config or Supabase).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Daily job scheduling | Custom cron expression parser | node-schedule or APScheduler | Timezone, DST, and concurrency are hard to get right; libraries handle edge cases |
| Slack message formatting | String concatenation or brittle JSON | Block Kit (official Slack framework) | Slack deprecates message formats; Block Kit is the standard, handles layout across clients |
| API retry logic | Manual setTimeout loop | p-retry, async-retry | Exponential backoff math, jitter, Retry-After header parsing are error-prone |
| Rich message templates | String templates or inline formatting | Nunjucks, EJS, or Handlebars | Digests evolve; template engines make iterating format safe and maintainable |
| Timezone conversions | moment().utcOffset() or manual date math | luxon | luxon handles DST transitions automatically; manual math breaks in March/November |
| Slack interaction handling | Custom webhook server | @slack/web-api with EventsAPI | Slack signatures, token validation, event deduplication are security-critical |

**Key insight:** Scheduling and timezone handling break silently during DST transitions (2x yearly). Templates allow rapid iteration on digest format. API integrations have many edge cases (rate limits, auth expiry, transient errors) that libraries already handle correctly.

## Common Pitfalls

### Pitfall 1: Hardcoded UTC Times for Timezone-Aware Schedules
**What goes wrong:** Digest schedule set to "0 13 * * *" (1 PM UTC = 9 AM EST). Works until DST transition in March, when UTC offset changes from -5 to -4, and digest sends at 10 AM EST instead of 9 AM. Breaks again in November.

**Why it happens:** Developers convert 9 AM EST to UTC once (1 PM), hardcode it, and forget that EST/EDT have different UTC offsets.

**How to avoid:**
1. Never hardcode UTC times for EST/GMT schedules.
2. Use timezone-aware scheduling libraries (node-schedule with hourly check using luxon, or APScheduler with `timezone='America/New_York'`).
3. Test job timing on DST transition dates (March 12, November 5 in 2026).
4. Store desired local time (9 AM) + timezone in config; let library compute UTC.

**Warning signs:**
- "Digest posted at wrong time in March" or "November"
- Manual date calculations in scheduling code
- UTC offsets hardcoded as numbers (-5, -4)

### Pitfall 2: Slack API Failures Block Digest Generation
**What goes wrong:** Digest generator calls `await slack.postMessage()` synchronously. Slack API times out or rate-limits; digest generator hangs and misses next day's run.

**Why it happens:** Single-threaded Node.js event loop; blocking wait on external API starves scheduler.

**How to avoid:**
1. Post to Slack asynchronously (fire-and-forget with error logging).
2. Persist digest to Supabase before posting to Slack (so it's not lost if post fails).
3. Use circuit breaker pattern: if Slack fails >3x, log alert but don't crash scheduler.

**Warning signs:**
- Digest not posting some days with no error logs
- Error logs show "timeout" or "ECONNREFUSED" from Slack in middle of flow
- Scheduler not running next day's job

### Pitfall 3: Attio Rate Limits Cause Silent Sync Failures
**What goes wrong:** Syncing 10 accounts' notes to Attio hits rate limit (25 writes/sec). First few accounts post successfully; then 429 error. No retry logic; remaining accounts' data lost.

**Why it happens:** Simple loop: `for (account of accounts) await attio.post()`. No backoff, no queue, no persistence of failed requests.

**How to avoid:**
1. Always wrap Attio API calls with exponential backoff (p-retry library).
2. Respect Retry-After header from 429 responses.
3. Queue failed syncs to Supabase for retry window (next hour, next run).
4. Log all Attio failures with account ID so support can backfill manually.

**Warning signs:**
- Some accounts missing notes in Attio after digest run
- Logs show 429 errors but no retries
- Sync success rate <100% but no alert

### Pitfall 4: Feedback Buttons Callback URLs Not Configured
**What goes wrong:** Digest includes feedback buttons; user clicks "👍". Slack sends interaction payload to callback URL, but your app isn't listening. User sees "No response" error; feedback lost.

**Why it happens:** Slack requires interactive messages to declare a callback (request_url or app.event handler). Easy to add button but forget to wire handler.

**How to avoid:**
1. Before deploying feedback buttons, confirm callback URL registered with Slack (in app settings or event subscription config).
2. Implement handler for `block_actions` event with matching action_id (from digest blocks).
3. Acknowledge interaction within 3 seconds (Slack requirement).
4. Test feedback flow in staging with mock Slack server (slack-mock library) before production.

**Warning signs:**
- Buttons in message but no handler logs
- Slack returns "No response" error on button click
- Feedback data never reaches Supabase

### Pitfall 5: Digest Format Doesn't Adapt to Variable Account Data
**What goes wrong:** Template assumes 3 signals + 3 trends. Some accounts have only 1 signal and 2 trends (newer accounts, less data). Template renders empty blocks; digest looks broken.

**Why it happens:** Hardcoded template assumes upstream agents always produce 3+3 findings.

**How to avoid:**
1. Template logic should handle `if signals.length < 3` → "Only 1 signal available today."
2. Ranker should always attempt to produce 3 items, but gracefully fall back if fewer available.
3. Test digest format with 0, 1, 3+ items for each field.
4. Attio note should include "(Only 2 signals available today)" so CRM is transparent about data coverage.

**Warning signs:**
- Digest has empty sections for some accounts
- Template rendering errors if length < 3
- Attio notes unclear about data completeness

## Code Examples

### Slack Integration: Sending Digest with Feedback Buttons
```javascript
// Source: @slack/web-api documentation
const { WebClient } = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_TOKEN);

async function sendDigest(channelId, accountId, blocks) {
  try {
    const result = await slack.chat.postMessage({
      channel: channelId,
      blocks: blocks,
      text: `Daily digest for account`, // Fallback text
      metadata: {
        event_type: 'digest_sent',
        event_payload: { account_id: accountId, timestamp: new Date().toISOString() }
      }
    });

    console.log(`Digest posted: ${result.ts}`);
    return result.ts; // Store ts for reference
  } catch (error) {
    console.error(`Failed to post digest: ${error.message}`);
    throw error;
  }
}

// Separate handler for feedback interaction
async function handleFeedback(payload) {
  const { actions, trigger_id, user, team } = payload;

  for (const action of actions) {
    if (action.type === 'button') {
      const [_, feedback, accountId] = action.action_id.split('_');

      // Store feedback in Supabase
      await supabase
        .from('digest_feedback')
        .insert({
          account_id: accountId,
          feedback: action.value,
          user_id: user.id,
          timestamp: new Date()
        });

      // Acknowledge within 3 seconds
      return { response_type: 'in_channel', text: '✓ Feedback recorded' };
    }
  }
}
```

### Attio Sync: Account Notes with Retry Logic
```javascript
// Source: Attio API docs + p-retry pattern
const pRetry = require('p-retry');
const axios = require('axios');

const attioClient = axios.create({
  baseURL: 'https://api.attio.com/v2',
  headers: {
    'Authorization': `Bearer ${process.env.ATTIO_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function syncDigestToAttio(accountId, noteText) {
  return pRetry(
    async () => {
      // Attio POST for account note
      const response = await attioClient.post(`/objects/accounts/${accountId}/notes`, {
        data: {
          title: 'Daily Digest',
          content: noteText,
          created_at: new Date().toISOString(),
          source: 'digest_reporter'
        }
      });

      return response.data;
    },
    {
      onFailedAttempt: error => {
        const { status, headers } = error.response || {};

        if (status === 429) {
          const retryAfter = parseInt(headers['retry-after']) || 1;
          console.log(`Rate limited (429). Waiting ${retryAfter}s before retry.`);
        } else if (status >= 500) {
          console.log(`Server error (${status}). Retrying...`);
        } else {
          throw error; // Don't retry authentication/validation errors
        }
      },
      retries: 5,
      minTimeout: 1000,
      maxTimeout: 30000,
      factor: 2 // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s
    }
  );
}
```

### Timezone-Aware Scheduler: Daily Digests at 9 AM GMT and EST
```javascript
// Source: luxon documentation + node-schedule pattern
const schedule = require('node-schedule');
const { DateTime } = require('luxon');

function scheduleDigests() {
  const timezones = [
    { name: 'GMT', tz: 'Europe/London', hour: 9 },
    { name: 'EST', tz: 'America/New_York', hour: 9 }
  ];

  // Check every 5 minutes if it's time to send
  schedule.scheduleJob('*/5 * * * *', async () => {
    for (const { name, tz, hour } of timezones) {
      const now = DateTime.now().setZone(tz);

      // Allow 5-minute window (scheduler runs every 5 min)
      if (now.hour === hour && now.minute < 5) {
        console.log(`[${name}] Time to send digest at ${now.toISO()}`);

        try {
          await generateAndSendDigest(tz);
        } catch (error) {
          console.error(`Failed to generate digest for ${tz}: ${error.message}`);
        }
      }
    }
  });
}

scheduleDigests();
```

### Digest Template (Nunjucks Format)
```nunjucks
{# Source: Nunjucks template best practices #}
<h2>📊 Daily Digest: {{ account.name }}</h2>

<h3>3 Signals</h3>
{% if signals.length > 0 %}
  <ul>
  {% for signal in signals %}
    <li><strong>{{ signal.title }}:</strong> {{ signal.text }}</li>
  {% endfor %}
  </ul>
{% else %}
  <p><em>No signals available today.</em></p>
{% endif %}

<h3>3 Trends</h3>
{% if trends.length > 0 %}
  <ul>
  {% for trend in trends %}
    <li><strong>{{ trend.category }}:</strong> {{ trend.observation }}</li>
  {% endfor %}
  </ul>
{% else %}
  <p><em>No trends available today.</em></p>
{% endif %}

<h3>Why It Matters</h3>
<ul>
{% for relevance in relevance_copy %}
  <li>{{ relevance }}</li>
{% endfor %}
</ul>

<p><a href="{{ feedback_link }}">Give feedback on this digest</a></p>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy message attachments | Block Kit (Slack message framework) | ~2019 | More flexible layouts, interactive elements, mobile-friendly |
| Custom retry loops with setTimeout | Exponential backoff libraries (p-retry, async-retry) | ~2020 | Standardized backoff math, Retry-After header respect, less boilerplate |
| Cron on server system | Application-level schedulers (node-schedule, APScheduler) | ~2015 | Better DST handling, easier testing, works in containers |
| Manual timezone math | Timezone libraries (luxon, date-fns) | ~2016 | Automatic DST handling, no manual offset calculations |
| CRM integrations via webhooks (real-time) | Batch sync (daily) | ~2023 | Lower cost, fewer rate limit issues, easier to debug |

**Deprecated/outdated:**
- Legacy message buttons (JSON attachments): Replaced by Block Kit (interactive elements in blocks).
- RTM (Real-time Messaging) API: Replaced by Events API + interactivity.
- Attio auto-lead creation: Out of scope per prior decision; use account notes + prospect enrichment only.

## Open Questions

1. **Signal Prioritization Heuristic**
   - What we know: Signals should be ranked by freshness + relevance. No standard algorithm documented.
   - What's unclear: Should ranking be rule-based (recency + source credibility) or LLM-scored?
   - Recommendation: Start with simple scoring (10 points for signals <24h old, 5 points for <7d, 1 for older). Iterate weekly based on sales feedback. Store heuristic in Supabase config for A/B testing.

2. **Feedback Loop Integration**
   - What we know: Thumbs up/down feedback collected via Slack buttons. Weekly prompt updates mentioned.
   - What's unclear: How does feedback link to prompt refinement? Manual review or automated retraining?
   - Recommendation: Store feedback in `digest_feedback` table. Weekly review: calculate "useful %" by account and signal type. Use this to weight signal sources (e.g., "signals from Crunchbase > 90% useful" → boost Crunchbase signals in ranker).

3. **Digest Scheduling During Daylight Saving Transitions**
   - What we know: DST transitions happen March 12 and November 5, 2026.
   - What's unclear: Should digest still run at 9 AM local time on transition days (might run twice/zero times)?
   - Recommendation: Use `luxon.setZone()` on every check; it handles DST automatically. Test manually on March 11-13 and Nov 4-6. Alert on Slack if digest generates outside [8 AM, 10 AM] window.

4. **Attio Bulk Operations**
   - What we know: Attio has 100 read/25 write rate limits per second. No bulk operation endpoint documented.
   - What's unclear: Should we batch multiple account note POSTs into single API call, or post individually with concurrent requests?
   - Recommendation: Post individually with concurrent Promise.all() (5-10 concurrent), wrapped in pRetry. If rate limited, pRetry backs off. Simple, works, scales to 10 accounts easily.

5. **Slack Message Threading vs. Channel Posts**
   - What we know: Digests should go to channel. Feedback buttons work in channel posts.
   - What's unclear: Should each account digest be a thread (all signals/trends as replies) or single message (all blocks in one post)?
   - Recommendation: Single message per account with all blocks. Threads make feedback harder to collect (replies to individual thread posts vs. button actions). Single message is cleaner UX.

## Sources

### Primary (HIGH confidence)
- **Slack API (chat.postMessage, Block Kit)**: https://docs.slack.dev/reference/methods/chat.postMessage/ — Verified for message formatting, threading, interactive elements
- **Slack Rate Limits**: https://docs.slack.dev/apis/web-api/rate-limits/ — Confirmed free tier has no plan-based limits; rate tier same across all plans (2026 update)
- **Attio API Rate Limiting**: https://docs.attio.com/rest-api/guides/rate-limiting — Verified 100 read/25 write limit; 429 response with Retry-After header
- **@slack/web-api npm package**: Current stable version 6.x, official Slack SDK

### Secondary (MEDIUM confidence)
- **node-schedule npm package**: https://www.npmjs.com/package/node-schedule — Popular, lightweight, supports cron + human-readable syntax; no native timezone support (workaround documented)
- **p-retry npm package**: Exponential backoff library verified via npm; matches Attio retry pattern in docs
- **luxon datetime library**: https://moment.github.io/luxon — Timezone handling with DST support confirmed; standard for Node.js
- **Nunjucks template engine**: Mozilla-backed, safe templating, verified via official docs
- **Multi-agent synthesis pattern**: https://blog.n8n.io/multi-agent-systems/ — Pattern sourced from n8n multi-agent framework documentation (2025)
- **Slack digest format best practices**: https://medium.com/@reedstrauss/growth-hacks-for-your-slack-digest-channels-06cc0f4adbc8 — Community practices verified

### Tertiary (LOW confidence, marked for validation)
- **APScheduler timezone support**: https://apscheduler.readthedocs.io/en/3.x/ — Alternative to node-schedule; documentation claims native timezone + DST support, but requires Python environment (not primary stack)
- **Signal prioritization algorithms**: https://hginsights.com/solutions-use-case/signal-based-account-prioritization/ — Industry practice; no standard algorithm; recommendation is custom rule-based heuristic pending sales feedback

## Metadata

**Confidence breakdown:**
- Standard Stack: **HIGH** — Slack API, Attio API, node-schedule, @slack/web-api all verified via official docs and current npm packages (2026)
- Architecture Patterns: **MEDIUM** — Synthesis pattern sourced from n8n multi-agent framework and LLM agent research; not phase-specific but well-established in industry
- Scheduling/Timezone: **HIGH** — luxon and node-schedule verified; DST handling confirmed via multiple sources
- Pitfalls: **MEDIUM** — Based on industry patterns and Slack/Attio docs; some pitfalls (like feedback button misconfiguration) inferred from API requirements
- Reporter Agent Specifics: **MEDIUM-LOW** — Pattern exists (multi-agent synthesis), but reporter's specific ranking/framing heuristic not documented in prior decisions; requires iterative refinement

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days for stable APIs; Slack and Attio rarely break compatibility)

**Notes:**
- Slack API is stable; no breaking changes anticipated in 2026.
- Attio API evolving; check changelog at https://docs.attio.com for endpoint additions (especially batch operations).
- Timezone handling breaks in March/November if not tested; prioritize DST transition testing.
- Feedback loop integration pending weekly sales reviews; heuristic will evolve.
