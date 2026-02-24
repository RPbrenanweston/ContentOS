#!/bin/bash
# Ralph Launch Script — Shared AI Layer
# Haiku foundation sprint: S01-S06, S09-S10
# Run from project root

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

MAX_ITERATIONS=15
ITERATION=0

echo "================================================"
echo "  Ralph Haiku Foundation Sprint"
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
  
  OUTPUT=$(claude --dangerously-skip-permissions --print --model haiku < RALPH_PROMPT.md 2>&1 | tee /dev/stderr) || true
  
  # Check for completion
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "🎉 Ralph reports ALL COMPLETE at iteration $ITERATION"
    exit 0
  fi
  
  # Check for blocked
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
