# RPBW's Business Lines

**Current Context:** See `../STATE/current-business.json` for active business

---

## Active Businesses

| Business | Type | Stage | Revenue Model | Primary Capabilities |
|----------|------|-------|---------------|---------------------|
| **BrenanWeston** | B2B Service | Operational | Recruitment fees | Research (AI/security trends), Architect (client solutions) |
| **ExpressRecruitment** | B2B Service | Development | Subscription | Engineer (workflow automation), Design (customer UX), QA |
| **Scorecrd** | B2B Product | Early-stage | SaaS | Engineer (feature dev), Analyst (user feedback), QA |
| **SalesBlock** | B2B Product | Early-stage | SaaS | Engineer (feature dev), Research (sales enablement), Architect |
| **EtsyShop** | B2C Product | Planning | Transaction | Design (digital assets), Research (market trends) |
| **TravelAgent** | B2C Service | Planning | Commission | Research (destinations/vendors), Analyst (itinerary planning) |

---

## Business Clusters

### 🎯 **Recruitment Cluster** (Core Operational)
- **BrenanWeston** — Specialist cybersecurity AI recruitment. Focus: GTM + Engineering roles for AI security applications. Client base: Meta, Amazon, Nestle, Gymshark. Team expertise: 20 years combined internal recruitment.
- **ExpressRecruitment** — Embedded recruitment subscription for businesses under 100 staff. Human-in-the-loop + AI augmentation. Solves: Senior leaders stuck recruiting without dedicated HR/recruiter resources.

### 🚀 **Product Cluster** (SaaS Development)
- **Scorecrd** (scorecrd.io) — Interview scorecard product. Early-stage SaaS.
- **SalesBlock** (salesblock.io) — Sales enablement product. Early-stage SaaS.

### 🌴 **Lifestyle Cluster** (Partnership/Side Ventures)
- **EtsyShop** — Digital asset creation and sales. Platform: Etsy marketplace.
- **TravelAgent** — Partnership venture (with girlfriend). Commission-based travel planning.

---

## Context Routing Rules

| User Says | Routes To | Rationale |
|-----------|-----------|-----------|
| "recruitment" (ambiguous) | **Ask which** (Brennan vs. Express) | Two recruitment businesses with different models |
| "cybersecurity recruitment" / "AI recruitment" | BrenanWeston | Specialist focus |
| "subscription recruitment" / "embedded recruitment" | ExpressRecruitment | Business model keyword |
| "product" / "SaaS" (ambiguous) | **Ask which** (Scorecrd vs. SalesBlock) | Two SaaS products |
| "scorecard" / "interview" | Scorecrd | Product domain |
| "sales enablement" | SalesBlock | Product domain |
| "Etsy" / "digital assets" | EtsyShop | Platform/domain |
| "travel" / "itinerary" | TravelAgent | Domain |
| No context | BrenanWeston (default) | Primary operational business |

---

## Typical Project Types by Business

### BrenanWeston
- Client project tracking (e.g., "Meta AI Security Eng search")
- Market research on AI/cybersecurity trends
- Candidate pipeline management
- Client proposal development

### ExpressRecruitment
- Product feature development (subscription platform)
- Customer onboarding workflow automation
- AI/human-in-the-loop process design
- Marketing site development

### Scorecrd
- Feature development (interview scorecards)
- User feedback analysis
- Integration work (ATS systems, APIs)
- Engineering roadmap planning

### SalesBlock
- Feature development (sales enablement tools)
- GTM research and strategy
- Customer use case analysis
- Product positioning work

### EtsyShop
- Digital asset creation (templates, graphics, etc.)
- Listing optimization
- Inventory and catalog management
- Market trend research

### TravelAgent
- Client itinerary planning
- Destination and vendor research
- Booking coordination
- Partnership business planning

---

## Migration Notes

**Structure:** Each business has isolated `PROJECTS/`, `WORKFLOWS/`, and `CREDENTIALS/` directories to prevent context contamination.

**Default Business:** `BrenanWeston` (primary operational revenue source)

**Backward Compatibility:** `USER/PROJECTS/` symlinks to `BUSINESSES/_DEFAULT/PROJECTS/` for uncategorized projects.

---

**Document Status:** Master index for RPBW's business portfolio
**Last Updated:** 2026-02-04
**Purpose:** Route PAI context to correct business based on user intent
