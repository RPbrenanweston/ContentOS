# CRO Task List

**Owner:** CRO Agent
**Status tracking:** Update status as tasks complete. Use [DONE], [IN PROGRESS], [BLOCKED], [WAITING].

---

## Month 1: Sequence Foundation

### Blockers (must clear before sequence writing)

- [ ] **CRO-1.1** WAIT for CMO POSITION-READY (Pillar A: Steady-State Framework)
  - Status: WAITING
  - Cannot proceed with sequences until this clears

- [ ] **CRO-1.2** WAIT for CMO POSITION-READY (Pillar B: Surgical vs. Systemic)
  - Status: WAITING

- [ ] **CRO-1.3** WAIT for CMO POSITION-READY (Pillar C: Pragmatic Costing)
  - Status: WAITING

### Preparation (while waiting for POSITION-READY)

- [ ] **CRO-1.0a** Review existing UK Founders campaign (`exprs_uk_founders_campaign.md`)
- [ ] **CRO-1.0b** Review PP-Email skill (`skills/pp-email/SKILL.md`)
- [ ] **CRO-1.0c** Review email frameworks (`skills/pp-email/references/email-frameworks.md`)
- [ ] **CRO-1.0d** Review Smartlead skill (`skills/smartlead/SKILL.md`)
- [ ] **CRO-1.0e** Review existing A/B test framework (`exprs_ab_test_framework.md`)
- [ ] **CRO-1.0f** Review shared context document (`CONTEXT.md`)

### Sequence Writing (unlocked after all three POSITION-READY gates)

- [ ] **CRO-1.4** [P] Write Founder segment email sequence (UK variant)
  - Depends: CRO-1.1, CRO-1.2, CRO-1.3
  - 4-step sequence, PP-Email compliant
  - British English, UK pricing (GBP 3K/month)
  - Use existing UK campaign as tone reference
  - Output: `outputs/cro/sequences/founders-uk.md`

- [ ] **CRO-1.5** [P] Write Founder segment email sequence (US variant)
  - Depends: CRO-1.1, CRO-1.2, CRO-1.3
  - 4-step sequence, PP-Email compliant
  - American English, US pricing (USD 4K/month)
  - Output: `outputs/cro/sequences/founders-us.md`

- [ ] **CRO-1.6** [P] Write CTO segment email sequence
  - Depends: CRO-1.1, CRO-1.2
  - Focus: process ownership, compound learning, technical screening time drain
  - Output: `outputs/cro/sequences/cto-segment.md`

- [ ] **CRO-1.7** [P] Write CFO segment email sequence
  - Depends: CRO-1.1, CRO-1.3
  - Focus: cost predictability, fixed vs. variable budgeting, total cost of ownership
  - Output: `outputs/cro/sequences/cfo-segment.md`

### Voice Review Gate

- [ ] **CRO-1.8** >> GATE: Send SEQUENCE-DRAFT for all sequences to CMO
  - Depends: CRO-1.4, CRO-1.5, CRO-1.6, CRO-1.7
  - CMO reviews for voice compliance
  - Address CMO feedback and resubmit if needed

### Scripts and Playbooks

- [ ] **CRO-1.9** Write discovery call script
  - Depends: CMO Pillar B approved
  - 15-minute framework
  - Opens with prospect context, not pitch
  - Uses Surgical vs. Systemic Map as diagnostic tool
  - Output: `outputs/cro/call-scripts/discovery-call.md`

- [ ] **CRO-1.10** Write objection handling playbook
  - Depends: All three pillars approved
  - 10-15 common objections
  - Each response maps to a CMO pillar
  - Output: `outputs/cro/objection-playbook/playbook.md`

- [ ] **CRO-1.11** >> GATE: CMO reviews and approves all scripts
  - Depends: CRO-1.9, CRO-1.10

---

## Month 2: Activation and Optimisation

### Launch

- [ ] **CRO-2.1** Launch Founder sequences in Smartlead
  - Depends: CMO approval of sequences
  - UK variant first, US variant second
  - Campaign settings per existing UK campaign template

- [ ] **CRO-2.2** Launch CTO and CFO sequences in Smartlead
  - Depends: CMO approval of sequences

### Frameworks and Templates

- [ ] **CRO-2.3** Write pricing conversation framework
  - Depends: CMO Pillar C
  - Step-by-step pricing presentation
  - "Fixed cost" narrative throughout
  - Handles edge cases (more/less, comparison, trial)
  - Output: `outputs/cro/meeting-templates/pricing-framework.md`

- [ ] **CRO-2.4** Write meeting structure templates
  - Discovery (15 min): Agenda, questions, next steps
  - Qualification (30 min): Agenda, diagnostic questions, decision criteria
  - Implementation Planning (45 min): Agenda, onboarding preview, timeline
  - Output: `outputs/cro/meeting-templates/`

- [ ] **CRO-2.5** Set up A/B test framework
  - Test matrix: subject lines, hooks, CTAs
  - Minimum 50 sends per variant
  - Statistical significance thresholds
  - Output: `outputs/cro/ab-test-plan.md`

- [ ] **CRO-2.6** Write onboarding handoff template
  - Standardised document template
  - Fields: buyer pain, pricing justification, objections, expectations, milestones
  - Output: `outputs/cro/handoff-docs/template.md`

### Reporting

- [ ] **CRO-2.7** >> GATE: First weekly pipeline report to CMO
  - Metrics: open rate, reply rate, meeting rate, pipeline value
  - By segment

### Execution

- [ ] **CRO-2.8** [P] Execute discovery calls using approved scripts
  - Log all objections
  - Update objection playbook as needed

- [ ] **CRO-2.9** >> GATE: OBJECTION-NEW for any unhandled objections
  - Send to CMO for positioning-aligned response

---

## Month 3: Scale and Refine

- [ ] **CRO-3.1** Segment refinement report
  - Which segments respond best
  - Which angles resonate
  - Which pricing frames convert
  - Output: `outputs/cro/pipeline-reports/segment-refinement.md`

- [ ] **CRO-3.2** >> GATE: SEGMENT-INSIGHT to CMO
  - Data-driven recommendations for content calendar adjustment

- [ ] **CRO-3.3** Iterate email sequences based on A/B test results
  - Update winning variants
  - Retire losing variants
  - Document learnings

- [ ] **CRO-3.4** Scale winning sequences
  - Increase daily send volume for top performers
  - Expand to new prospect lists

- [ ] **CRO-3.5** Build referral pathway
  - Document process for happy customers to become future case study pipeline
  - NOTE: Not for current use (CMO-C1 constraint). Future asset only.

- [ ] **CRO-3.6** >> GATE: Month 3 joint performance review with CMO
  - Full pipeline and content performance review
  - Present to RPBW
