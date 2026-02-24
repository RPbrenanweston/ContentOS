#!/bin/bash
# Ralph Launch Script — Shared AI Layer (Phase 2+)
# Sonnet sprint: S10, S12-S26
# Run from project root

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Increase output token limit to avoid truncation errors
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=100000

MAX_ITERATIONS=20
ITERATION=0

echo "================================================"
echo "  Ralph Sonnet Sprint (Phase 2+)"
echo "  Project: shared-ai-layer"
echo "  Max iterations: $MAX_ITERATIONS"
echo "  Started: $(date)"
echo "================================================"

while [ "$ITERATION" -lt "$MAX_ITERATIONS" ]; do
  REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' prd.json)

  if [ "$REMAINING" -eq 0 ]; then
    echo ""
    echo "🎉 All stories complete!"
    exit 0
  fi

  ITERATION=$((ITERATION + 1))
  echo ""
  echo "==============================================="
  echo "  Ralph Iteration $ITERATION of $MAX_ITERATIONS"
  echo "  Stories remaining: $REMAINING"
  echo "  Time: $(date)"
  echo "==============================================="

  # Use Sonnet for remaining complex stories (encryption, Stripe, etc.)
  # Do NOT exit on <promise>COMPLETE</promise> — only trust prd.json passes count
  OUTPUT=$(claude --dangerously-skip-permissions --print --model sonnet < RALPH_PROMPT.md 2>&1 | tee /dev/stderr) || true

  # Only check for BLOCKED — let the loop top handle actual completion via jq
  if echo "$OUTPUT" | grep -q "<promise>BLOCKED</promise>"; then
    echo ""
    echo "⚠️  Ralph reports BLOCKED at iteration $ITERATION"
    echo "Check progress.txt for details"
    exit 1
  fi

  echo "Iteration $ITERATION complete. Sleeping 2s..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS)"
echo "Stories remaining: $(jq '[.userStories[] | select(.passes == false)] | length' prd.json)"
echo "Check progress.txt for status"
