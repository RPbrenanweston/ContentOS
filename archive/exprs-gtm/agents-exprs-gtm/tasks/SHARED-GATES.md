# Shared Collaboration Gates

**Purpose:** These gates are synchronisation points where both agents must align before proceeding. Neither agent advances past a gate until the other acknowledges.

---

## Gate Protocol

### How Gates Work

1. **Initiating agent** sends a gate message (using templates in ARCHITECTURE.md Appendix B)
2. **Reviewing agent** acknowledges receipt
3. **Reviewing agent** takes required action (review, approve, revise, integrate)
4. **Both agents** confirm the gate is cleared
5. **Downstream tasks** are unblocked

### Gate Statuses

- **OPEN** -- Gate triggered, awaiting response
- **IN REVIEW** -- Reviewing agent is working on it
- **CLEARED** -- Both agents confirmed, downstream tasks unblocked
- **BLOCKED** -- Issue found, requires resolution before clearing

---

## Gate Schedule

### Month 1

| Gate | ID | Owner | Reviewer | Target | Status |
|------|----|-------|----------|--------|--------|
| Pillar A Position Lock | G1a | CMO | CRO | Week 2 | -- |
| Pillar B Position Lock | G1b | CMO | CRO | Week 2 | -- |
| Pillar C Position Lock | G1c | CMO | CRO | Week 2 | -- |
| Sequence Voice Review | G2 | CRO | CMO | Week 3 | -- |
| Pricing Frame Alignment | G3 | Joint | Joint | Week 4 | -- |
| Call Script Review | G4 | CRO | CMO | Week 4 | -- |
| Month 1 Retrospective | G5 | Joint | Joint | End Month 1 | -- |

### Month 2

| Gate | ID | Owner | Reviewer | Target | Status |
|------|----|-------|----------|--------|--------|
| Content-Outbound Sync | G6 | Joint | Joint | Week 1 | -- |
| A/B Test Design Review | G7 | CRO | CMO | Week 2 | -- |

### Month 3

| Gate | ID | Owner | Reviewer | Target | Status |
|------|----|-------|----------|--------|--------|
| Segment Refinement | G8 | CRO | CMO | Week 1 | -- |
| Full Performance Review | G9 | Joint | RPBW | End Month 3 | -- |

---

## Ongoing Gates (triggered as needed)

| Gate Type | Initiator | Reviewer | Trigger |
|-----------|-----------|----------|---------|
| POSITION-READY | CMO | CRO | Pillar document finalised |
| CONTENT-PUBLISHED | CMO | CRO | Content goes live |
| VOICE-UPDATE | CMO | CRO | Tone adjustment needed |
| CALENDAR-SYNC | CMO | CRO | Monthly calendar published |
| PRICING-FRAME | CMO | CRO | Pricing narrative change |
| SEQUENCE-DRAFT | CRO | CMO | Sequence ready for voice review |
| OBJECTION-NEW | CRO | CMO | New objection needs response |
| SEGMENT-INSIGHT | CRO | CMO | Data pattern worth acting on |
| PRICING-FRICTION | CRO | CMO | Pricing objection pattern |
| HANDOFF-READY | CRO | CMO | Deal closing, needs onboarding narrative |

---

## Gate Log

Record all gate events here for audit trail.

```
[DATE] [GATE-ID] [STATUS] [AGENT] [NOTES]
---
2026-02-13 POSITION-READY ISSUED CMO All 3 pillars finalised. Positioning locked. See gate message below.
2026-02-13 G1a CLEARED CMO Pillar A (Steady-State Framework) whitepaper complete
2026-02-13 G1b CLEARED CMO Pillar B (Surgical vs. Systemic Map) whitepaper complete
2026-02-13 G1c CLEARED CMO Pillar C (Pragmatic Costing) whitepaper complete
2026-02-13 CALENDAR-SYNC ISSUED CMO 3-month content calendar published
```

---

## POSITION-READY Gate Message

```
[POSITION-READY]
Status: ISSUED
Issued By: CMO Agent
Timestamp: 2026-02-13T12:00:00Z
Summary: All 3 positioning pillars finalised. Messaging locked. No further changes without RPBW approval.

WHAT IS LOCKED:
1. Pillar A -- Steady-State Framework: Recruitment as infrastructure, not transaction.
   Key positions: compound efficiency, process ownership, cost predictability, culture debt analogy.
2. Pillar B -- Surgical vs. Systemic Map: Diagnostic framework for when agencies add value vs. when infrastructure wins.
   Key positions: 5-question diagnostic, 70-85% systemic for most ICP companies, consultative (not anti-agency).
3. Pillar C -- Pragmatic Costing: TCO analysis comparing variable (agency) and fixed (infrastructure) models.
   Key positions: 4-layer cost model, breakeven at ~4-5 hires/year, salary escalation protection, CPH decline curve.

SUPPORTING ASSETS:
- Pillar A Whitepaper: outputs/cmo/pillar-a/US-CMO-004-steady-state-whitepaper.md
- Pillar B Whitepaper: outputs/cmo/pillar-b/US-CMO-005-surgical-systemic-whitepaper.md
- Pillar C Whitepaper: outputs/cmo/pillar-c/US-CMO-007-pragmatic-costing-whitepaper.md
- Brand Voice Guide: outputs/cmo/US-CMO-008-brand-voice-guide.md
- Content Calendar: outputs/cmo/US-CMO-006-content-calendar.md
- Research (Pillar A): outputs/cmo/pillar-a/US-CMO-001-steady-state-research.md
- Research (Pillar B): outputs/cmo/pillar-b/US-CMO-002-surgical-systemic-research.md
- Research (Pillar C): outputs/cmo/pillar-c/US-CMO-003-pragmatic-costing-research.md

VOICE CONSTRAINTS FOR CRO:
- Use claim-backing template from Brand Voice Guide Section 4
- Avoid all terms on cliche avoidance list (Voice Guide Section 5)
- All email subject lines: data-focused or consultative (not competitive)
- CTAs: peer-level ("worth exploring?" not "book a demo")
- UK content: British English, GBP, understated register
- US content: American English, USD, direct but measured

Next: CRO can now begin US-CRO-001 (PP-Email Sequences), US-CRO-003 (Discovery Call Script).
CRO should confirm receipt: "Proceeding with sequence writing."
```
