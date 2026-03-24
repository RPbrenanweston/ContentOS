# Framework Selection Update ✅

## What Changed

Updated the PP-Email skill to **default to Vanilla Ice Cream** instead of overusing Mouse Trap.

## The New Rule

**Vanilla Ice Cream is the default for general outreach.**

Mouse Trap should ONLY be used when the user explicitly mentions a high-intent signal (job posting, funding, expansion).

---

## Decision Logic (Updated)

### Before (Old Logic):
```
❌ "pp-email VP of People at Immuta" → Looked for ANY hiring signal → Mouse Trap
```
**Problem:** Too aggressive, used Mouse Trap for general outreach

### After (New Logic):
```
✅ "pp-email VP of People at Immuta" → No explicit signal mentioned → Vanilla Ice Cream
✅ "pp-email VP of People about their Enterprise AE role" → Job posting mentioned → Mouse Trap
```
**Benefit:** More appropriate framework selection, no user prompting needed

---

## Examples

### Example 1: General Outreach
```
User: "pp-email the CTO at Acme"
Framework: Vanilla Ice Cream (60-80 words)
Reason: No explicit signal, default to balanced approach
```

### Example 2: Explicit Signal
```
User: "pp-email the CTO about their Series B announcement"
Framework: Mouse Trap (20-40 words)
Reason: User explicitly mentioned funding
```

### Example 3: General with Context
```
User: "Write to the VP Engineering at fast-growing startup"
Framework: Vanilla Ice Cream (60-80 words)
Reason: "Fast-growing" is context, not an explicit signal
```

---

## Framework Selection Matrix (Updated)

| User Request | Framework | Why |
|-------------|-----------|-----|
| "pp-email VP Sales at Acme" | Vanilla Ice Cream | No signal mentioned |
| "Write to CTO at TechCo" | Vanilla Ice Cream | General outreach |
| "Email them about their VP Eng posting" | Mouse Trap | Job posting explicitly mentioned |
| "Reach out about their $50M Series C" | Mouse Trap | Funding explicitly mentioned |
| "Follow up with the CRO" | Neutral Insight | Follow-up context |
| "Light outreach to test interest" | Toe Dip | Light touch requested |

---

## No More User Prompting

**Before:**
```
Assistant: "I found a hiring signal. Would you like me to use Mouse Trap or Vanilla Ice Cream?"
User: [Has to make decision]
```

**After:**
```
Assistant: [Automatically selects appropriate framework based on explicit signals]
[Generates email without asking]
```

---

## Updated Files

1. ✅ `skills/pp-email/SKILL.md` - Updated selection logic
2. ✅ `skills/pp-email/references/email-frameworks.md` - Updated matrix with examples
3. ✅ `commands/pp-email.md` - Updated command instructions
4. ✅ `skills/pp-email/FRAMEWORK_SELECTION_GUIDE.md` - New detailed guide

---

## Quick Reference

**Default:** Vanilla Ice Cream (60-80 words)

**Mouse Trap ONLY when user explicitly mentions:**
- Job posting
- Funding announcement
- Expansion/acquisition
- Major public announcement

**Other frameworks:**
- Follow-up → Neutral Insight
- Transformation story → BAB
- Light touch → Toe Dip
- Been ghosted → Exec-to-Exec

**When in doubt → Vanilla Ice Cream**

---

## Testing

Try these to see the difference:

```bash
# Should use Vanilla Ice Cream (no explicit signal)
"pp-email the VP of People at Immuta"

# Should use Mouse Trap (explicit job posting reference)
"pp-email the VP of People at Immuta about their Enterprise AE role"

# Should use Vanilla Ice Cream (general context, not explicit signal)
"Write to the CRO at a fast-growing SaaS company"
```

---

## Why This Matters

**Vanilla Ice Cream:**
- Builds credibility with middle section
- Works for any general outreach
- 60-80 words allows for context + reframe
- Most versatile framework

**Mouse Trap:**
- Very short (20-40 words)
- Only works with high-intent urgency
- Falls flat without explicit signal
- Binary question needs priority context

**The fix:** Stop overusing Mouse Trap, default to Vanilla Ice Cream for balanced approach.

---

## Summary

✅ Vanilla Ice Cream is now the default (not Mouse Trap)
✅ Mouse Trap only for explicit signals in user request
✅ No more prompting user for framework selection
✅ Automatic, intelligent framework selection based on context

**Result:** Better-matched frameworks, no user interruptions, more appropriate emails for each situation.
