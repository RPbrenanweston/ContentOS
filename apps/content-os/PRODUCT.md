# Content OS — Product Architecture

## Philosophy: Creation Optimizer

We are NOT a content intelligence platform. We are NOT an AI content factory.

We are a **creation optimizer** — helping real creators structure, refine, and
distribute their authentic long-form content across platforms.

### Core Beliefs

1. **The creator's voice is sacred.** AI assists structure and distribution,
   never replaces the writing.
2. **Writing should feel natural.** Ghost-inspired: calm, invisible UI that
   disappears when you're in flow.
3. **Distribution is optimization, not automation.** We help your voice carry
   across platforms — adapting format, not fabricating content.
4. **One piece, many forms.** A single long-form piece becomes platform-native
   variants — but every variant traces back to YOUR words.

### What We Are vs. What We're Not

| We Are | We're Not |
|--------|-----------|
| A writer's desk with smart distribution | A content factory |
| Ghost + multi-platform optimization | Zernio/Buffer clone |
| "Write once, reach everywhere" | "AI writes for you" |
| Authenticity amplifier | Content volume multiplier |

## User Journey

```
WRITE → STRUCTURE → OPTIMIZE → DISTRIBUTE → LEARN
  |         |           |           |          |
  Ghost-    AI helps    Platform-   Queue +    What
  like      identify    specific    Schedule   resonated
  editor    segments    adaptation             where
```

### 1. WRITE (Ghost-like editor)
- Clean, distraction-free writing environment
- Rich text with /commands for blocks (image, video, divider, callout)
- Auto-save. No "PROCESS" button. No manufacturing metaphors.
- Word count, reading time — subtle, bottom of screen

### 2. STRUCTURE (Background AI)
- On save, AI silently identifies segments (hooks, quotes, stories, stats)
- Segments appear in a subtle right sidebar — available, not intrusive
- Creator can accept/reject/edit segment boundaries
- This is the creator saying "yes, this quote matters" — human curation

### 3. OPTIMIZE (Platform Adaptation)
- One-click: "Adapt for LinkedIn" / "Adapt for X" / etc.
- AI reformats YOUR words for platform constraints and conventions
- Creator reviews and edits each variant — always has final say
- Side-by-side: original segment vs. platform variant

### 4. DISTRIBUTE (Smart Queue)
- Set your publishing cadence: "LinkedIn 3x/week, X daily"
- Queue auto-populates with approved variants
- Schedule, publish now, or save as draft
- Retry failed posts. Unpublish if needed.

### 5. LEARN (Performance Feedback)
- Which segments resonated on which platforms?
- Best time to post (learned from your data)
- Content decay detection — when to re-share evergreen pieces
- Feeds back into STRUCTURE to improve segment identification

## UX Principles (Ghost-Inspired)

- **Calm by design.** No ALL CAPS labels. No neon accents. No terminal aesthetic.
- **Invisible until needed.** Toolbar appears on text selection. Sidebar slides
  in when relevant. Distribution panel only shows when content is ready.
- **Typography-first.** Beautiful reading/writing experience. Serif for content,
  sans-serif for UI. Generous whitespace.
- **Light + Dark.** Default light theme (like Ghost). Dark mode available.
- **No jargon.** "Write" not "CONSOLE". "Pieces" not "CONTENT NODES".
  "Share" not "DISTRIBUTE". "Drafts" not "ASSEMBLY LINE".

## Navigation Rename

| Old (Console/Factory) | New (Creator/Studio) |
|----------------------|---------------------|
| CONTENT OS | [Brand Name TBD] |
| THE CONSOLE | Home |
| LIBRARY | Pieces |
| ACCOUNTS | Channels |
| ARCHIVE | Insights |
| THE ASSEMBLY LINE | (removed — inline) |
| PROCESS button | (removed — auto) |
| GENERATE panel | Adapt (inline) |
| DISTRIBUTE panel | Share (inline) |

## Technical Architecture (Unchanged)

The backend architecture remains solid:
- Supabase PostgreSQL with RLS
- TipTap editor (already in place)
- Platform adapters (LinkedIn, X — extensible)
- AI services (decomposition, asset generation)
- Job queue (pg-boss)

What changes is the **UX layer** and the addition of:
- Queue system (recurring schedule slots)
- Profiles/Brands (multi-identity support)
- Publishing logs (audit trail)
- Retry/unpublish (error recovery)

## Queue System

### Concept
A queue is a set of recurring time slots attached to a channel (platform account).
Example: "Post to LinkedIn every Mon/Wed/Fri at 9:00 AM GMT"

### How It Works
1. Creator sets cadence per channel
2. Approved variants auto-fill queue slots (oldest unfilled first)
3. Creator can manually reorder or swap queue items
4. Queue preview shows next N upcoming posts
5. AI suggests optimal times based on historical engagement

### Schema Addition
See `supabase/migrations/011_queue_system.sql`
