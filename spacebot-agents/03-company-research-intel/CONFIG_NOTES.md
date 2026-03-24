# Configuration Notes — Company Research Intel

## Model Routing
- **Primary model**: GPT-5 Nano (cost-optimised)
- **Rationale**: Research is structured web searching and data extraction into a defined schema. The analytical lift is moderate — mostly synthesis and classification. Nano handles this well with the explicit schema guidance.
- **Escalation trigger**: If the company is highly complex (multiple business units, conglomerate, unclear AI exposure) and the user requests "deep dive", consider mid-tier model for better synthesis.

## Tuning
- **Temperature**: 0.1 — Research output must be deterministic and factual. No creative interpretation.
- **Max tokens**: 3000 (full RESEARCH_PACK JSON can be lengthy with 10+ sources)
- **Top-p**: 0.9
- **System prompt adherence**: Maximum — must follow the RESEARCH_PACK schema exactly

## Compaction
- **Low compaction**: Retain full RESEARCH_PACKs within session. These are reference documents that other agents may need to consume.
- **Compress between companies**: After a pack is saved, compress the raw search results but retain the final JSON output.
- **Never compress source_index**: Source citations are critical for traceability.

## Cortex
- **Knowledge base**: Load the RESEARCH_PACK output schema, source quality hierarchy, and research workflow steps
- **Priority**: Output schema > source hierarchy > workflow steps
- **Supplementary**: AI security market context (key vendors, regulatory landscape, common company types) to help shape lens-specific sections
- **Do not load**: Email frameworks, ICP scoring criteria, candidate templates (out of scope)

## Coalesce
- **Sequential processing**: Process one company at a time. Web searches must complete before the next step. Do not parallelise research steps (step 6 depends on URLs found in steps 1-5).

## Memory Persistence
- **Session-level**: Retain all RESEARCH_PACKs produced in the current session. If user asks "use the research pack for [Company]" later, it should be available.
- **Cross-session**: Store completed RESEARCH_PACKs as files. If user asks for a company previously researched, check for existing pack and offer to refresh rather than rebuild from scratch.
- **File storage**: Save as `{COMPANY_NAME}_research_pack.json`

## Browser
- **ENABLED — Primary capability**: This agent's core function requires web search and web fetch.
- **Allowed operations**: Web search (Google), web fetch on any URL found during research
- **Search budget**: 5-10 searches per company (configurable by complexity)
- **Fetch budget**: 3-5 page fetches per company (about page, key articles, Crunchbase)

## Sandbox
- **Minimal**: JSON assembly only. No complex code execution needed.

## Channel Configuration
- **Primary output**: JSON file saved as `{COMPANY_NAME}_research_pack.json`
- **Slack delivery**: When triggered from Slack, deliver a 2-3 line summary with the file link. Do NOT paste the full JSON into Slack.
- **Handoff**: When research is complete, signal availability to the Email Writer and ICP Scorer agents: "Research pack for [Company] ready — [X] sources, [Y] gaps."
