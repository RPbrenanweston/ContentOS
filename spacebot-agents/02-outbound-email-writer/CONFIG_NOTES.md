# Configuration Notes — Outbound Email Writer

## Model Routing
- **Primary model**: GPT-5 Nano (cost-optimised)
- **Rationale**: The chain (p1→p4) is structured analytical reasoning against defined inputs. e1 is short-form writing within tight frameworks. Nano handles both well given the explicit structure.
- **Escalation trigger**: If user requests "premium mode" or the company is a Ring 1 Platinum account, consider escalating to a mid-tier model for more nuanced p3/p4 outputs. But Nano is the default.

## Tuning
- **Temperature**: 0.3 — Slightly more creative than the Scorer (emails need voice variation) but still controlled. The chain steps (p1-p4) should use 0.1, and only e1 uses 0.3.
- **Max tokens**: 1500 (full chain + email), 400 (email only if chain was pre-computed)
- **Top-p**: 0.9
- **Frequency penalty**: 0.3 — Prevent repetitive phrasing across emails for the same company

## Compaction
- **Moderate compaction**: Retain the current RESEARCH_PACK and chain outputs (p1-p4) within a session. If writing multiple emails for the same company, reuse p1 and compress completed emails.
- **Clear between companies**: When user switches to a new company, compress everything from the previous company.

## Cortex
- **Knowledge base**: Load email frameworks reference (all 8 frameworks with structures, word counts, examples), chain prompt instructions (p1-p4-e1 exact formats), and framework selection matrix
- **Priority**: Framework structures > chain prompts > selection logic
- **Do not load**: ICP scoring criteria, candidate evaluation templates, research methodology (out of scope)

## Coalesce
- **Sequential processing**: Process one email at a time, even if user requests multiple. The chain must complete fully before email generation. Do not parallelise chain steps.

## Memory Persistence
- **Session-level**: Remember the current company's RESEARCH_PACK and chain outputs. If user asks for a second email to a different role at the same company, reuse p1 without re-running.
- **Cross-session**: No persistence needed. Each outbound campaign starts fresh.
- **Exception**: If user says "use the same research pack as last time for [Company]" — attempt to retrieve from the Research Intel agent's outputs.

## Browser
- **Limited**: Enable only for LinkedIn URL extraction when user pastes a profile URL. Do NOT conduct general web research (that's the Research Intel agent's job).
- **Allowed domains**: linkedin.com only

## Sandbox
- **Minimal**: No code execution needed. Pure analytical chain and text generation.

## Channel Configuration
- **Primary output**: Markdown file saved as `{COMPANY_NAME}_pp_emails.md`
- **Slack delivery**: When triggered from Slack, deliver the email body inline (no markdown file) with TRACE in a thread reply
- **Format**: Clean text, no excessive formatting, subject line clearly labeled
