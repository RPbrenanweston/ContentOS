---
description: Generate insight-led outbound emails using the PP-Email skill with structured reasoning chain
argument-hint: [--framework] <company-name> <role-title> or <linkedin-url>
allowed-tools: [Read, Write, Glob, WebFetch, Bash]
---

# PP-Email Command

Generate Problem-Prompt emails for executive outreach using a structured reasoning chain (p1→p2→p3→p4→e1) and proven email frameworks.

## Usage

```bash
/pp-email <company-name> <role-title>
/pp-email --mouse-trap <company-name> <role-title>
/pp-email <linkedin-url>
/pp-email --vanilla-ice-cream https://linkedin.com/in/example
```

## Arguments

The user invoked this command with: $ARGUMENTS

## Framework Options

Available framework flags:
- `--mouse-trap` - High-intent signals (20-40 words)
- `--neutral-insight` - Follow-ups, nurture (50-70 words)
- `--vanilla-ice-cream` - Default balanced approach (60-80 words)
- `--bab` - Before-After-Bridge storytelling (60-80 words)
- `--toe-dip` - Light conversation starter (30-50 words)
- `--exec-to-exec` - Late-stage, peer-level (40-60 words)

If no framework specified, auto-select based on context signals.

## Instructions

When this command is invoked:

1. **Parse arguments**:
   - Extract framework flag (if present)
   - Identify company name OR LinkedIn URL
   - Identify role title (if provided)
   - Extract prospect name (if provided)

2. **Check for RESEARCH_PACK**:
   - Look for `{company-name}_research_pack.json` or similar in working directory
   - If not found, ask: "I need the research pack for {COMPANY_NAME} first. Want me to run company research?"

3. **Extract LinkedIn details** (if URL provided):
   - Use WebFetch to retrieve LinkedIn profile
   - Extract: full name, current job title, company name, headline
   - If restricted/incomplete, ask user to fill gaps

4. **Select email framework** (automatic, do not prompt user):
   - If user specified flag: use that framework exactly
   - If user explicitly mentioned high-intent signal (job posting, funding, expansion): Mouse Trap
   - If follow-up context: Neutral Insight
   - **Default (most common)**: Vanilla Ice Cream

   **IMPORTANT:** Only use Mouse Trap when the user's request explicitly references a hiring, funding, or expansion signal. Otherwise default to Vanilla Ice Cream. Do not ask user which framework to use.

5. **Run the chain** (refer to pp-email skill):
   - **p1**: Strategy Objectives (once per company)
   - **p2**: Role Execution Constraints (per role)
   - **p3**: Status Quo Behaviours (per role)
   - **p4**: Reframes (per role)
   - **e1**: Final Email (per role, framework-adapted)

6. **Output format**:
   Save to `{COMPANY_NAME}_pp_emails.md` in working directory:
   ```markdown
   # PP-Emails — {COMPANY_NAME}
   **Generated**: {date}
   **Framework used**: {FRAMEWORK_NAME}

   ---

   ## {PROSPECT_NAME or ROLE_TITLE}
   **Role**: {ROLE_TITLE} | **Company**: {COMPANY_NAME}

   **FRAMEWORK**: {FRAMEWORK_NAME}
   **SUBJECT**: ...
   **EMAIL**: ...

   <details><summary>TRACE (internal only)</summary>
   - Framework: {FRAMEWORK_NAME}
   - Objective referenced: # (p1)
   - Constraint referenced: # (p2)
   - Status quo behaviour referenced: # (p3)
   - Reframe referenced: (p4)
   - Source IDs: [S#, S#]
   </details>
   ```

7. **Display to user**:
   - Show the final email (SUBJECT + EMAIL body)
   - Confirm output file location
   - Word count check (ensure framework compliance)

## Guardrails

- **No invention**: Every factual claim must trace to RESEARCH_PACK sources
- **No recruiting language**: Never use "hiring", "recruitment", "agency", "candidates", "talent acquisition"
- **Uncertainty framing**: Use "not sure if...", "often...", "some teams..." beyond p1
- **Framework word limits**: Enforce framework-specific word counts
- **No greetings/closings**: Do not add "Hi [Name]" or "Best, [Name]" unless framework specifies
- **TRACE is internal**: Never include in the email shown to user for sending

## Multi-Role Support

If user provides multiple roles for same company:
```bash
/pp-email Coralogix "CRO, CTO, CPO"
```

Run p1 once, then fork p2→p3→p4→e1 for each role. Output all emails to single file.

## Examples

```bash
# Basic usage with auto-framework selection
/pp-email Immuta "VP People"

# Specify Mouse Trap framework
/pp-email --mouse-trap Coralogix CRO

# LinkedIn URL input
/pp-email https://linkedin.com/in/ariel-assaraf

# Multiple roles at same company
/pp-email Fortanix "CEO, CPO"

# Follow-up with Neutral Insight framework
/pp-email --neutral-insight Immuta "Director of People"
```

## Output Location

Emails saved to: `{WORKING_DIRECTORY}/{COMPANY_NAME}_pp_emails.md`

## Related Skills

- **pp-email**: The underlying skill with full chain logic and framework reference
- **company-research**: Generate RESEARCH_PACK required for pp-email chain

## Notes

- Requires existing RESEARCH_PACK or will prompt to create one
- Framework selection can be manual (flag) or automatic (context-based)
- Each email includes TRACE for internal QA (not sent to prospect)
- Output file can contain multiple emails (multi-persona outreach)
