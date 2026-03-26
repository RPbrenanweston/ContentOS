# Configuration Notes — ICP Account Scorer

## Model Routing
- **Primary model**: GPT-5 Nano (cost-optimised)
- **Rationale**: Classification is pattern-matching against well-defined criteria. Does not require creative reasoning or long-form generation. Nano is ideal.
- **Fallback**: Only escalate to a larger model if the user asks for deep strategic analysis (Golden Circle pathway design, complex multithreading across 4+ stakeholders)

## Tuning
- **Temperature**: 0.1 — Classification should be deterministic and consistent. Same input = same output.
- **Max tokens**: 800 (default concise), 2000 (expanded mode)
- **Top-p**: 0.9
- **System prompt adherence**: Maximum — this agent must follow the tier/ring/category frameworks exactly as defined

## Compaction
- **Aggressive compaction**: Yes — this agent handles short, stateless interactions. Each classification is independent. Compress aggressively between turns.
- **Retain**: Current classification context only. No need to remember previous prospects unless user explicitly references them.

## Cortex
- **Knowledge base**: Load the ICP frameworks reference (tier definitions, ring criteria, client categories, disqualification criteria, market triggers, objection handling)
- **Priority**: Framework definitions > market triggers > objection handling
- **Do not load**: Email frameworks, research pack schemas, candidate evaluation templates (out of scope)

## Coalesce
- **Multi-message handling**: If user sends multiple messages quickly (e.g., pasting several prospects), batch them into a single classification output rather than responding to each individually.

## Memory Persistence
- **Short-term only**: Remember the current scoring session (if user is scoring multiple prospects at the same company, retain the company context)
- **No long-term memory needed**: Each scoring interaction is independent. Don't build up a prospect database in memory.
- **Exception**: If user says "remember this account as [Platinum/Gold]" — store that preference for the session only

## Browser
- **Disabled**: This agent does not need web access. It classifies based on information provided by the user or passed from the Research Intel agent.

## Sandbox
- **Minimal**: No code execution needed. Pure text classification and recommendation.

## Channel Configuration
- **Primary channel**: Slack
- **Format constraints**: Plain text, <2000 chars default, simple bullets, URLs on own lines
- **Threading**: Respond in-thread when scoring is part of a longer conversation
