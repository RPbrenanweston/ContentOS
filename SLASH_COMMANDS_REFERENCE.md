# Slash Commands & Skills Reference

**Generated:** 2026-02-07 | **Claude Code Version:** Current | **PAI Skills:** 29 installed (127 workflows)

---

## Table of Contents

1. [Built-in Claude Code Commands](#built-in-claude-code-commands)
2. [Custom Project Commands](#custom-project-commands)
3. [PAI Skills — Thinking & Analysis](#thinking--analysis)
4. [PAI Skills — Research & Intelligence](#research--intelligence)
5. [PAI Skills — Content & Documents](#content--documents)
6. [PAI Skills — Security & Testing](#security--testing)
7. [PAI Skills — Code & Development](#code--development)
8. [PAI Skills — Meta & System](#meta--system)
9. [PAI Skills — Integration & Utility](#integration--utility)
10. [PAI Skills — Social & Outreach](#social--outreach)
11. [Suggested New Commands (from usage patterns)](#suggested-new-commands)

---

## Built-in Claude Code Commands

These are native to Claude Code and always available.

| Command | What It Does |
|---------|-------------|
| `/help` | Get help with Claude Code features |
| `/compact` | Compress conversation history to free context window |
| `/clear` | Clear the entire conversation |
| `/config` | Open Claude Code settings |
| `/cost` | Show token usage and API costs for current session |
| `/doctor` | Run health check on Claude Code installation |
| `/init` | Initialize a CLAUDE.md project file in current directory |
| `/login` | Authenticate with Anthropic |
| `/logout` | Log out of current session |
| `/memory` | Open CLAUDE.md files for editing |
| `/mcp` | Manage MCP (Model Context Protocol) servers |
| `/permissions` | Manage tool permissions and allowed actions |
| `/review` | Review a GitHub pull request |
| `/status` | Show current session status |
| `/terminal-setup` | Configure terminal integration |
| `/vim` | Toggle vim keybinding mode |

---

## Custom Project Commands

Commands defined in the project `commands/` directory.

### `/pp-email`

**What it does:** Generates insight-led outbound emails using a structured reasoning chain (p1 > p2 > p3 > p4 > e1) and proven email frameworks for executive outreach.

**How to call it:**
```
/pp-email <company-name> <role-title>
/pp-email --mouse-trap <company-name> <role-title>
/pp-email <linkedin-url>
/pp-email --vanilla-ice-cream https://linkedin.com/in/example
```

**Framework options:**
| Flag | Style | Word Count |
|------|-------|-----------|
| `--mouse-trap` | High-intent signals | 20-40 words |
| `--neutral-insight` | Follow-ups, nurture | 50-70 words |
| `--vanilla-ice-cream` | Default balanced (most common) | 60-80 words |
| `--bab` | Before-After-Bridge storytelling | 60-80 words |
| `--toe-dip` | Light conversation starter | 30-50 words |
| `--exec-to-exec` | Late-stage, peer-level | 40-60 words |

**Output:** Saves to `{COMPANY_NAME}_pp_emails.md` in working directory.

**Notes:** Requires a research pack (`{company}_research_pack.json`). If missing, it will ask to run company research first. Supports multiple roles in one call: `/pp-email Coralogix "CRO, CTO, CPO"`

---

## PAI Skills

Skills are invoked by name (e.g., `/council`, `/redteam`) or triggered contextually by keywords in your prompt.

---

### Thinking & Analysis

#### Council
**What it does:** Multi-agent debate system. Spawns 3-7 agents with different perspectives to collaboratively-adversarially discuss a topic and reach synthesized conclusions.

**How to call it:**
```
/council [topic to debate]
```
**Triggers:** "council", "debate", "perspectives", "agents discuss", "multiple viewpoints"

**Workflows:** Debate (full multi-round), Quick (condensed 1-round)

---

#### RedTeam
**What it does:** Adversarial analysis using 32 parallel agents with a structured 5-phase attack protocol. Finds flaws, counterarguments, and failure modes in any idea or proposal.

**How to call it:**
```
/redteam [idea or proposal to stress-test]
```
**Triggers:** "red team", "attack idea", "counterarguments", "critique", "stress test", "find flaws"

**Workflows:** AdversarialValidation, ParallelAnalysis

---

#### FirstPrinciples
**What it does:** Three-step first principles analysis: Deconstruct (break into atoms) > Challenge (question assumptions) > Reconstruct (rebuild from truth).

**How to call it:**
```
/firstprinciples [problem or assumption to decompose]
```
**Triggers:** "first principles", "root cause", "fundamental", "decompose", "why does this work"

---

#### BeCreative
**What it does:** Extended thinking mode with Verbalized Sampling for 1.6-2.1x diversity increase. Generates 5+ diverse solution options instead of defaulting to the obvious answer.

**How to call it:**
```
/becreative [challenge or creative brief]
```
**Triggers:** "be creative", "deep thinking", "extended reasoning", "novel solutions", "brainstorm"

---

### Research & Intelligence

#### Research
**What it does:** Multi-mode research system with three depth levels and 240+ Fabric patterns for content analysis.

**How to call it:**
```
/research [topic]
```
**Triggers:** "research", "investigate", "find information", "look up", "study"

**Workflows:**

| Workflow | Use For |
|----------|---------|
| QuickResearch | Fast answers, single-source |
| StandardResearch | Balanced depth, multi-source |
| ExtensiveResearch | Deep dive, comprehensive |
| ClaudeResearch | Claude-powered web search |
| InterviewResearch | Research for interview prep |
| WebScraping | Scrape and process URLs |
| YoutubeExtraction | Extract from YouTube videos |
| ExtractKnowledge | Extract structured knowledge |
| ExtractAlpha | Extract investment-relevant insights |
| AnalyzeAiTrends | AI industry trend analysis |
| Enhance | Enhance existing research |
| Fabric | Apply Fabric patterns to content |

---

#### OSINT
**What it does:** Open source intelligence gathering for people, companies, and infrastructure. Requires authorization for active scanning.

**How to call it:**
```
/osint [target] [type]
```
**Triggers:** "OSINT", "due diligence", "background check", "company intel", "investigate"

---

#### PrivateInvestigator
**What it does:** Ethical people-finding using 15 parallel research agents. Public data only with strict authorization framework.

**How to call it:**
```
/privateinvestigator [name] [context]
```
**Triggers:** "find person", "locate", "reconnect", "people search", "skip trace"

**Workflows:** FindPerson, ReverseLookup, VerifyIdentity, SocialMediaSearch, PublicRecordsSearch

---

#### Recon
**What it does:** Infrastructure reconnaissance (domains, IPs, netblocks, ASNs). Passive by default, active requires authorization.

**How to call it:**
```
/recon [target domain or IP]
```
**Triggers:** "recon", "reconnaissance", "bug bounty", "attack surface", "enumerate subdomains"

---

#### SECUpdates
**What it does:** Aggregates security news from 6+ sources into 3 categories (News / Research / Ideas).

**How to call it:**
```
/secupdates
/secupdates [specific date]
```
**Triggers:** "security news", "security updates", "what's new in security", "breaches", "sec updates"

---

#### AnnualReports
**What it does:** Aggregates and analyzes 570+ annual security reports from the cybersecurity industry. Sources include CrowdStrike, Verizon DBIR, IBM, Mandiant, and more.

**How to call it:**
```
/annualreports update     # Fetch latest sources from GitHub
/annualreports analyze    # Analyze reports for trends
/annualreports fetch      # Download specific reports
```
**Triggers:** "annual reports", "security reports", "threat reports", "industry reports", "threat landscape"

---

### Content & Documents

#### Art
**What it does:** Complete visual content system for generating images, diagrams, flowcharts, mermaid diagrams, infographics, comics, timelines, maps, and more. Output to ~/Downloads/.

**How to call it:**
```
/art [description of visual]
```
**Triggers:** "create image", "art", "header image", "visualization", "mermaid", "flowchart", "technical diagram", "infographic"

**Workflows:** Visualize, Mermaid, TechnicalDiagrams, Comics, Timelines, Maps, Comparisons, RecipeCards, D3Dashboards, Stats, Frameworks, Taxonomies, EmbossedLogoWallpaper, ULWallpaper, CreatePAIPackIcon, AnnotatedScreenshots, Essay, Aphorisms, RemoveBackground

---

#### Documents
**What it does:** Document processing router. Delegates to specialized sub-skills based on file type.

**How to call it:**
```
/documents [command] [file]
```
**Triggers:** "document", "process file", "create doc"

**Sub-skills:**

| Sub-skill | Formats | Capabilities |
|-----------|---------|-------------|
| `/docx` | Word (.docx) | Create, Edit, Redline, Template |
| `/pdf` | PDF (.pdf) | Create, Merge/Split, Text extraction, Tables, Forms, OCR |
| `/pptx` | PowerPoint (.pptx) | Create, HTML convert, Template, Edit |
| `/xlsx` | Excel (.xlsx) | Create, Edit, Financial models, Data processing |

---

#### Aphorisms
**What it does:** Manage a curated database of wisdom quotes organized by theme and author.

**How to call it:**
```
/aphorisms find [topic]
/aphorisms add [quote]
/aphorisms search [keyword]
```
**Triggers:** "aphorism", "quote", "saying", "wisdom", "find quote"

---

### Security & Testing

#### WebAssessment
**What it does:** Full web security assessment with 6-phase pentest methodology and threat modeling. Authorization required.

**How to call it:**
```
/webassessment [target URL]
```
**Triggers:** "web assessment", "pentest", "security testing", "vulnerability scan"

---

#### PromptInjection
**What it does:** Prompt injection security testing for LLM applications. 5 workflows with authorization-first framework.

**How to call it:**
```
/promptinjection [target application]
```
**Triggers:** "prompt injection", "jailbreak", "LLM security", "AI security assessment", "test chatbot"

---

#### Evals
**What it does:** Agent evaluation framework with three grader types (code-based, model-based, human). Includes transcript capture, pass@k/pass^k metrics.

**How to call it:**
```
/evals [agent or task to evaluate]
```
**Triggers:** "eval", "evaluate", "test agent", "benchmark", "regression test"

**Workflows:** RunEval, CreateUseCase, CompareModels, ComparePrompts, ViewResults, CreateJudge

---

### Code & Development

#### CreateSkill
**What it does:** Create, validate, update, and canonicalize PAI skills with proper TitleCase naming and folder structure.

**How to call it:**
```
/createskill [SkillName] [description]
```
**Triggers:** "create skill", "new skill", "skill structure", "canonicalize"

**Workflows:** CreateSkill, UpdateSkill, ValidateSkill, CanonicalizeSkill

---

#### CreateCLI
**What it does:** Generate TypeScript CLIs using three-tier templates (llcli-style, Commander.js, oclif).

**How to call it:**
```
/createcli [CliName] [commands...]
```
**Triggers:** "create CLI", "build CLI", "command-line tool"

**Workflows:** CreateCli, AddCommand, UpgradeTier

---

### Meta & System

#### Prompting
**What it does:** Meta-prompting system with Handlebars templates for generating and optimizing prompts programmatically.

**How to call it:**
```
/prompting [task or template request]
```
**Triggers:** "meta-prompting", "template generation", "prompt optimization", "programmatic prompt"

---

#### Fabric
**What it does:** Intelligent prompt pattern system with 240+ specialized patterns for content analysis, extraction, and transformation.

**How to call it:**
```
/fabric [pattern_name] [input content]
```
**Triggers:** "use fabric", "fabric pattern", "run fabric", "extract wisdom", "summarize with fabric", "create threat model"

---

#### Telos
**What it does:** Life OS and project analysis. Manages life goals, challenges, predictions, books, movies, and project dependencies.

**How to call it:**
```
/telos [analysis type]
```
**Triggers:** "telos", "life goals", "projects", "dependencies", "goals", "challenges"

**Workflows:** Update, CreateNarrativePoints, InterviewExtraction, WriteReport

---

#### PAIUpgrade
**What it does:** Extracts system improvements from content AND monitors external sources (Anthropic ecosystem, YouTube) for relevant changes.

**How to call it:**
```
/paiupgrade [improvement area]
```
**Triggers:** "upgrade", "improve system", "system upgrade", "check Anthropic", "Anthropic changes", "new Claude features", "check YouTube"

**Workflows:** Upgrade, ResearchUpgrade, FindSources

---

#### Agents
**What it does:** Dynamic agent composition with personality traits, voice prosody, and parallel orchestration.

**How to call it:**
```
/agents [agent_type] [traits...]
```
**Triggers:** "create custom agents", "specialized agents", "agent personalities", "available traits", "agent voices"

---

### Integration & Utility

#### Browser
**What it does:** Debug-first browser automation with always-on console/network capture. Screenshots, interaction, testing.

**How to call it:**
```
/browser [action] [target URL]
```
**Triggers:** "browser", "screenshot", "debug web", "verify UI", "troubleshoot frontend"

---

#### BrightData
**What it does:** Progressive URL scraping with four-tier fallback strategy for robust data extraction.

**How to call it:**
```
/brightdata [url]
```
**Triggers:** "Bright Data", "scrape URL", "web scraping tiers"

---

#### Apify
**What it does:** Social media and business data scraping via 9 Apify actors covering Instagram, LinkedIn, TikTok, YouTube, Facebook, Google Maps, Amazon, and general web.

**How to call it:**
```
/apify [platform] [parameters]
```
**Triggers:** "Twitter scrape", "Instagram scrape", "LinkedIn scrape", "TikTok scrape", "YouTube scrape", "Google Maps scrape", "Amazon scrape"

---

#### VoiceServer
**What it does:** ElevenLabs TTS voice server with prosody settings (stability, similarity_boost, style, speed).

**How to call it:**
```
/voiceserver [action]
```
**Triggers:** "voice server", "TTS server", "voice notification", "prosody"

---

### Autonomous Coding

#### Ralph
**What it does:** PAI-adjusted Ralph Loop orchestration (Approach C). Runs an autonomous AI coding loop that implements user stories from a PRD, one per iteration, with fresh context each run. Uses FULL PAI depth on first iteration, ITERATION depth on continuations. Memory persists via git, progress.txt, and prd.json.

**How to call it:**
```
/ralph start [path-to-prd.json]     — Launch a PAI-adjusted Ralph loop
/ralph prd [description]            — Generate a PAI-formatted PRD with ISC criteria
/ralph status                       — Check Ralph loop progress and remaining stories
```
**Triggers:** "ralph loop", "ralph wiggum", "autonomous loop", "overnight coding", "run ralph", "start ralph", "AFK coding", "autonomous agent loop"

**Workflows:**

| Workflow | Trigger |
|----------|---------|
| Start | "start ralph", "run ralph", "launch ralph loop" |
| PRD | "create PRD", "generate PRD", "ralph PRD" |
| Status | "ralph status", "loop progress", "how many stories left" |

**Key features:**
- Approach C (PAI-Adjusted): Full Algorithm on first pass, ITERATION depth for continuations
- ISC criteria as acceptance criteria in PRD stories (8 words, binary testable)
- Completion signals: `<promise>COMPLETE</promise>` when all stories pass
- Circuit breaker: `<promise>BLOCKED</promise>` if stuck 2+ iterations
- Progress tracking via progress.txt with Codebase Patterns consolidation
- Configurable max iterations (default: 10)

**Plugin commands (from ralph-marketplace):**
- `/prd` — Plugin's built-in PRD generator
- `/ralph` — Plugin's built-in Ralph loop launcher

---

### Social & Outreach

#### LateApi
**What it does:** Post, schedule, and draft social media content via the LATE API. Supports 13+ platforms including LinkedIn, Twitter/X, Instagram, TikTok, Facebook, YouTube, Pinterest, Threads, Bluesky, Mastodon, Reddit, Telegram, and Discord.

**How to call it:**
```
/lateapi Post this to LinkedIn: [content]
/lateapi Schedule for tomorrow at 9am: [content]
/lateapi Draft: [content for review]
/lateapi What accounts do I have connected?
```
**Triggers:** "post to social", "publish to LinkedIn", "share on Twitter", "schedule post", "create draft", "social media posting"

**Workflows:**

| Workflow | Trigger |
|----------|---------|
| Post | "post to social", "publish to LinkedIn" |
| Draft | "create draft", "save as draft" |
| Schedule | "schedule post", "post tomorrow" |
| GetAccounts | "what accounts", "list platforms" |

**Default platform:** LinkedIn (for professional content). Specify others explicitly.

**Time parsing:** Understands natural language ("tomorrow at 9am", "in 2 hours", "Friday at 3pm", "next Monday morning").

---

## Suggested New Commands

Based on analysis of the PAI memory system, these recurring tasks could become slash commands:

### Tier 1 — High Value (frequent use, clear pattern)

| Proposed Command | What It Would Do | Why |
|-----------------|-----------------|-----|
| `/business [name]` | Switch active business context (BrenanWeston, ExpressRecruitment, Scorecrd, SalesBlock, EtsyShop, TravelAgent) | You constantly switch between 6 businesses. Currently manual via JSON file |
| `/projects` | Show all projects in current business context | 6 businesses x multiple projects = high friction to navigate |
| `/weekly-review` | Run a structured weekly review ritual (status, wins, blockers, priorities) | Mentioned in reminders but not automated |

### Tier 2 — Quick Wins (infrastructure exists, needs activation)

| Proposed Command | What It Would Do | Why |
|-----------------|-----------------|-----|
| `/status` | Show current status across all businesses or a specific one | Core to PAI philosophy but currently template-only |
| `/goals` | List and track life goals from Telos system | Telos system is comprehensive but needs easy access |
| `/pipeline [name]` | Execute a named multi-step workflow with verification gates | PipelineOrchestrator.ts already exists but no easy invocation |
| `/deep-work [hours]` | Block focus time, adjust notification settings | Productivity system mentions this but it's not automated |

### Tier 3 — Nice to Have

| Proposed Command | What It Would Do | Why |
|-----------------|-----------------|-----|
| `/reminders` | Show and manage active reminders | Reminders file exists but is static |
| `/capabilities [business]` | Show which PAI capabilities are configured per business | Each business has different capability needs |
| `/daily` | Run a daily check-in ritual | Daily review cadence mentioned but not automated |
| `/blockers` | Quick view of current blockers across all projects | Common question pattern in sessions |
| `/wins` | Log and review recent achievements | Useful for weekly reviews and motivation |

---

## Quick Reference Card

**Native commands:** Start with `/` in Claude Code prompt
**PAI skills:** Invoked by `/skillname` or triggered by keywords in your prompt
**Custom commands:** Defined in `commands/` directory in your project
**Skill location:** `~/.claude/skills/[SkillName]/SKILL.md`

**Total installed:**
- Built-in commands: 16
- Custom project commands: 1 (`/pp-email`)
- PAI skills: 30 (with 130 workflows)
- Plugin commands: 2 (`/prd`, `/ralph` from ralph-marketplace)
- **Grand total: 49 commands/skills**
