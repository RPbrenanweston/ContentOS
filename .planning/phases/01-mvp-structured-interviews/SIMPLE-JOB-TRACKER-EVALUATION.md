# Simple Job Tracker: Algorithm Agent Evaluation

**Evaluator:** Algorithm Agent (Vera Sterling)
**Date:** 2026-02-17
**Input:** Architect recommendation "Build Simple first. Ship fast. Let data guide complexity."
**Scope:** HOW to build it, WHEN, WITH WHAT SEQUENCE

---

## 1. FEASIBILITY ASSESSMENT

### Can one person build this in 2 weeks?

**YES.** With constraints.

The Simple Job Tracker is: capture job data from a browser page, store locally, export to CSV.

**Hard requirements for 2-week delivery:**

| Requirement | Justification |
|-------------|---------------|
| Builder has shipped a browser extension before | Extension APIs have gotchas (manifest v3 permissions, content script lifecycle). First-timer adds 3-5 days. |
| Scope freeze after Day 3 | Any feature addition after Day 3 pushes past 2 weeks. Hard cutoff. |
| No backend | The moment you add a server, you add auth, hosting, deployment, monitoring. That is a different project. |
| No user accounts | Local-only storage. Export is the "sync" mechanism. |
| Testing is manual + 3 core smoke tests | Full test suites are a Phase 2 concern. |

**Time breakdown (10 working days):**

| Days | Activity | Output |
|------|----------|--------|
| 1-2 | Extension scaffold + manifest v3 + permissions | Extension loads in Chrome, injects content script |
| 3-4 | Job data extraction (title, company, URL, date, salary range) | Popup shows captured job data from current page |
| 5-6 | Local storage (chrome.storage.local) + job list view | Saved jobs persist across sessions, list view works |
| 7-8 | CSV export + basic UI polish | One-click CSV download with all captured jobs |
| 9 | Edge cases: duplicate detection, LinkedIn vs Indeed vs generic | Handles top 3 job boards without crashing on unknown sites |
| 10 | Smoke testing + Chrome Web Store submission prep | Extension packaged, screenshots taken, listing draft ready |

**Verdict:** Feasible for a developer with extension experience. Add 1 week buffer for someone learning extension APIs.

### Dependencies

| Dependency | Type | Risk Level |
|------------|------|------------|
| Chrome Extension APIs (Manifest V3) | Platform | LOW -- stable, well-documented |
| Chrome Web Store developer account | Vendor | LOW -- $5 one-time fee, 1-2 day review |
| Job board DOM structures | External | MEDIUM -- LinkedIn/Indeed change DOM periodically |
| None: no external APIs, no databases, no auth providers | - | - |

**Zero external service dependencies.** This is the strongest argument for Simple.

---

## 2. TECH STACK RECOMMENDATION

### The Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Platform** | Chrome Extension (Manifest V3) | Direct access to the page the user is viewing. No copy-paste workflow. Lowest friction capture. |
| **Frontend** | Vanilla JS + minimal CSS (or Preact if builder prefers) | Extension popup is ~400x600px. React is overkill. Preact (3KB) acceptable if builder wants component model. |
| **Storage** | chrome.storage.local (10MB limit) | Persists across sessions. No server needed. 10MB holds ~50,000 job entries -- more than anyone needs. |
| **Export** | Client-side CSV generation | Zero dependencies. Blob + URL.createObjectURL + anchor click. 20 lines of code. |
| **Optional Sync** | Google Sheets API (Phase 2 consideration) | Only if user feedback demands it. Adds OAuth complexity. |
| **Hosting** | Chrome Web Store only | No server. No hosting costs. No DevOps. |
| **Build** | esbuild or none | Extensions can ship without a build step. esbuild if you want TypeScript. |

### Why NOT alternatives?

| Alternative | Why Not |
|-------------|---------|
| **Web app** | Requires user to leave the job posting, copy-paste data, switch tabs. Friction kills usage. |
| **Bookmarklet** | No persistent storage. No popup UI. Can't run in background. Dead end. |
| **Firefox/Safari extension** | Chrome has 65%+ desktop market share. Start with one platform. Port later if demand exists. |
| **Electron app** | Massive overhead for a capture tool. Extension is 100x lighter. |
| **React/Vue/Angular** | Extension popup is tiny. Framework bundle > application code. Preact (3KB) or vanilla is the right fit. |

### Architecture Decision Record

**Decision:** Chrome Extension with local storage and CSV export.

**Context:** Need lowest-friction job capture for a single user or small group. No revenue model yet. Must validate demand before investing in infrastructure.

**Consequences:**
- PRO: Zero ongoing costs. Zero server maintenance. Ships in 2 weeks.
- PRO: Extension can be enhanced incrementally (add features without rearchitecting).
- CON: Chrome-only initially.
- CON: No cross-device sync without a future persistence layer.
- CON: Chrome Web Store review process adds 1-3 days to each release.

---

## 3. PHASED ROADMAP

### Phase 1: Ship Simple (Weeks 1-2)

**Goal:** Working Chrome extension that captures, stores, and exports job data.

**Deliverables:**
- Chrome extension published to Web Store (or loaded unpacked for private use)
- Captures: job title, company, URL, salary (if visible), date captured, user notes
- Lists saved jobs in popup
- Exports all jobs to CSV
- Handles LinkedIn, Indeed, Glassdoor (best effort on other sites)

**Success metric:** RPBW uses it for their own job search for 2 weeks.

**Definition of done:** Extension installed, 10+ jobs captured, CSV exported successfully.

### Phase 2: First Enhancement (Weeks 3-5)

**What to add first:** NOT a backend. Add these based on self-use friction:

| Enhancement | Effort | Why First |
|-------------|--------|-----------|
| **Job status tracking** (Applied/Interviewed/Rejected/Offer) | 2 days | Most requested feature in every job tracker. Dropdown in the list view. |
| **Basic search/filter** in the job list | 1 day | Once you have 30+ jobs, scrolling fails. |
| **Duplicate detection** improvement | 1 day | Same job reposted on 3 boards = 3 entries unless caught. |
| **Google Sheets export** (optional) | 3 days | Adds OAuth flow but enables sharing and pivot tables. Only if CSV feels limiting. |

**What NOT to add in Phase 2:**
- User accounts (no demand signal yet)
- Backend/database (local storage is sufficient for <1000 jobs)
- AI features (salary analysis, match scoring -- these are Phase 4+)
- Multi-browser support (Chrome-only until there's demand)

### Phase 3: Graduate to Detailed Architecture (Weeks 8-16, CONDITIONAL)

**Trigger:** Phase 3 only begins when graduation criteria are met (see Section 4).

**What changes:**
- Add a lightweight backend (Supabase or Firebase -- see graduation criteria for which)
- User accounts with email auth
- Cross-device sync
- Sharing/collaboration features
- Analytics dashboard

**Architecture shift:** Extension becomes a client that talks to an API. Local storage becomes a cache/offline fallback. This is a rewrite of the storage layer, not the capture layer.

### Phase 4+: Data-Driven Features (Month 4+)

**Only possible with real user data:**
- Salary range analysis by role/location (requires aggregate data)
- Application success rate tracking (requires status data over time)
- Job market trend detection (requires volume across users)
- AI-powered job matching (requires job descriptions + user preferences)
- Resume tailoring suggestions (requires job description parsing at scale)

**Key insight:** Phase 4 features are IMPOSSIBLE to build well without Phase 1-3 data. This validates the "ship simple, let data guide" approach.

---

## 4. GRADUATION CRITERIA

### From Simple to Detailed: The Metrics

**You graduate to Detailed architecture when ANY TWO of these are true:**

| Metric | Threshold | Why This Number |
|--------|-----------|-----------------|
| **Jobs captured per month (personal use)** | >100 jobs/month | Means the tool is genuinely useful, not a novelty |
| **CSV exports per month** | >4 exports/month | Means the data is being used downstream |
| **Other users requesting access** | >5 people asking | Demand signal that justifies multi-user infrastructure |
| **Feature requests logged** | >10 unique requests | Indicates the tool is hitting real workflow needs |
| **chrome.storage.local approaching 5MB** | >50% of 10MB limit | Technical ceiling forcing persistence layer decision |
| **User needs cross-device access** | Explicit request | Cannot be solved without a backend |

### Signals That Say "Stay Simple"

- Using it sporadically (<20 jobs/month) -- the problem isn't tool-shaped
- CSV export is sufficient for downstream use -- no sync needed
- No one else is asking for it -- single-user tool, keep it single-user
- Feature requests are all cosmetic (colors, fonts) not structural -- the architecture is fine

### Anti-Graduation Signals (DO NOT build Detailed if)

- Building it because "it would be cool" rather than because data demands it
- Adding features for hypothetical users who don't exist yet
- Investing in infrastructure before validating personal daily use

---

## 5. FALLBACK PLAN

### If Simple Does Not Gain Traction

**Sunk cost analysis:**

| Item | Time Invested | Dollar Cost |
|------|---------------|-------------|
| Extension development | 10 working days | $0 (personal time) |
| Chrome Web Store fee | - | $5 |
| Hosting/infrastructure | - | $0 |
| External services | - | $0 |
| **Total** | **10 days** | **$5** |

**Verdict:** Maximum sunk cost is 10 days of development time and $5. This is the cheapest possible validation of the idea.

### Code Reusability If Building Detailed Later

| Component | Reusable? | Percentage |
|-----------|-----------|------------|
| **Job data extraction logic** (DOM parsing per site) | YES -- identical in any extension-based capture | 100% |
| **Content scripts** (page injection, data scraping) | YES -- same scripts, different storage target | 90% |
| **Popup UI components** | PARTIAL -- would need redesign for full app, but interaction patterns transfer | 40% |
| **CSV export logic** | YES -- same code, additional export targets | 100% |
| **chrome.storage.local logic** | NO -- replaced by API calls to backend | 0% |
| **Extension manifest and permissions** | YES -- same extension, expanded permissions | 80% |

**Overall code reusability: ~60-70%.** The capture layer (the hard part) transfers entirely. Only the storage layer gets replaced.

**Design/UX reusability: ~80%.** Field names, data model, interaction patterns, job board parsing rules all carry forward.

---

## 6. TOP 5 RISKS (Ranked by Impact x Likelihood)

### Risk Matrix

| Rank | Risk | Impact (1-5) | Likelihood (1-5) | Score | Mitigation |
|------|------|:------------:|:-----------------:|:-----:|------------|
| **1** | **Job board DOM changes break extraction** | 4 | 4 | **16** | Use resilient selectors (aria-labels, data attributes, semantic HTML) over brittle CSS paths. Build a "generic fallback" extractor that grabs page title + URL + visible salary patterns via regex. Test monthly against top 3 boards. |
| **2** | **Scope creep past Day 3 kills the 2-week timeline** | 5 | 3 | **15** | Write the 10-feature list on Day 1. Freeze it on Day 3. Everything else goes in a PHASE-2-IDEAS.md file. Treat the file as a backlog, not a todo list. |
| **3** | **Chrome Web Store review rejection** | 3 | 3 | **9** | Read the Chrome Web Store developer policies before writing code. Common rejection reasons: excessive permissions, missing privacy policy, unclear extension purpose. Have a one-page privacy policy ready. Request only activeTab + storage permissions (minimal). |
| **4** | **Builder unfamiliar with Manifest V3 changes** | 3 | 3 | **9** | Manifest V3 replaced background pages with service workers and restricted remote code execution. Budget 1 day to read the migration guide if builder has only shipped MV2 extensions. Use the Chrome Extension Getting Started tutorial as scaffold. |
| **5** | **User abandons tool after initial novelty** | 4 | 2 | **8** | This is the core validation question. Mitigate by: (a) using it yourself for 2 full weeks, (b) capturing the friction points you actually experience, (c) only proceeding to Phase 2 if you open the extension >3x per week naturally. If not, the idea itself needs pivoting. |

### Risk Not Ranked (Low Impact, Low Likelihood)

| Risk | Why Low | Mitigation |
|------|---------|------------|
| chrome.storage.local data loss | Chrome storage is reliable; data loss requires extension uninstall or clear-all-data action | Remind users to export CSV periodically. Add "last export date" display. |
| Security vulnerability in extension | Extension only reads DOM and writes to local storage. No network calls. Minimal attack surface. | Follow Chrome Extension security best practices. No eval(), no remote code loading. |
| Competitor launches better tool | Market validation -- if competitors exist, the problem is real. Simple version is your wedge. | Focus on speed and simplicity as differentiators. Don't compete on features. |

---

## EXECUTION CHECKLIST: Start Tomorrow

### Day 0 (Today/Tonight)

- [ ] Install Chrome Extension development tools
- [ ] Create a new directory: `job-tracker-extension/`
- [ ] Read: https://developer.chrome.com/docs/extensions/get-started
- [ ] Create `PHASE-2-IDEAS.md` -- empty file, ready to capture scope creep
- [ ] Decide: Vanilla JS or Preact? (Recommendation: Vanilla JS for speed)

### Day 1

- [ ] Create `manifest.json` (Manifest V3)
- [ ] Permissions: `activeTab`, `storage` only
- [ ] Create content script scaffold
- [ ] Create popup HTML/CSS scaffold
- [ ] Verify: Extension loads in Chrome without errors

### Day 2

- [ ] Implement job data extraction for LinkedIn
- [ ] Implement job data extraction for Indeed
- [ ] Implement generic fallback (page title + URL + salary regex)
- [ ] Verify: Popup shows extracted data from current page

### Day 3 -- SCOPE FREEZE

- [ ] Write the final feature list (anything not on this list is Phase 2)
- [ ] Implement chrome.storage.local save/load
- [ ] Verify: Jobs persist across browser restarts

### Days 4-6

- [ ] Build job list view in popup
- [ ] Add delete/edit capability
- [ ] Implement CSV export

### Days 7-8

- [ ] Duplicate detection (URL-based)
- [ ] UI polish (spacing, typography, colors)
- [ ] Add user notes field

### Day 9

- [ ] Smoke test on LinkedIn, Indeed, Glassdoor
- [ ] Test edge cases: no salary visible, very long titles, non-English pages
- [ ] Fix any blockers found

### Day 10

- [ ] Write Chrome Web Store listing (description, screenshots)
- [ ] Write one-page privacy policy
- [ ] Package and submit (or load unpacked for personal use first)

---

## SUMMARY

| Question | Answer |
|----------|--------|
| Can one person build this in 2 weeks? | **Yes**, with scope discipline and extension experience |
| What tech stack? | **Chrome Extension + Vanilla JS + chrome.storage.local + CSV export** |
| What comes after Simple? | **Status tracking + search/filter** (not a backend) |
| When to graduate to Detailed? | **When 2+ graduation metrics hit threshold** (100+ jobs/month, 5+ users asking, etc.) |
| What if it fails? | **$5 and 10 days sunk. 60-70% code reusable.** |
| Biggest risk? | **Job board DOM changes** -- mitigate with resilient selectors and generic fallback |

**Bottom line:** The risk/reward ratio is exceptional. Maximum downside is 10 days and $5. Maximum upside is a validated product with real usage data driving every subsequent decision. Ship it.
