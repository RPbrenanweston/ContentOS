#!/bin/bash
# Ralph Feature Loop — Content Platform Feature Work
# Runs Claude Code autonomously to implement feature stories from prd.json
# Usage: ./ralph-feature-loop.sh [max_iterations]

set -e

MAX_ITERATIONS=${1:-15}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
LOG_FILE="$SCRIPT_DIR/ralph-output.log"

cd "$SCRIPT_DIR"

echo "Starting Ralph Feature Loop"
echo "  Working dir: $SCRIPT_DIR"
echo "  Branch: $(git branch --show-current)"
echo "  Max iterations: $MAX_ITERATIONS"
echo "  Stories remaining: $(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")"
echo ""

for i in $(seq 1 $MAX_ITERATIONS); do
  REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")

  if [ "$REMAINING" -eq 0 ]; then
    echo ""
    echo "All stories complete! Finished at iteration $i."
    exit 0
  fi

  NEXT_STORY=$(jq -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0] | "\(.id): \(.title)"' "$PRD_FILE")

  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS"
  echo "  Stories remaining: $REMAINING"
  echo "  Next: $NEXT_STORY"
  echo "  $(date)"
  echo "==============================================================="

  OUTPUT=$(claude --dangerously-skip-permissions --print < "$SCRIPT_DIR/CLAUDE.md" 2>&1 | tee /dev/stderr) || true

  # Log output
  echo "=== Iteration $i — $(date) ===" >> "$LOG_FILE"
  echo "$OUTPUT" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"

  # Check for completion
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "Ralph completed all tasks at iteration $i!"
    exit 0
  fi

  # Check for blocked
  if echo "$OUTPUT" | grep -q "<promise>BLOCKED</promise>"; then
    echo ""
    echo "Ralph is BLOCKED at iteration $i. Check progress.txt for details."
    exit 1
  fi

  echo "Iteration $i complete. Continuing in 5s..."
  sleep 5
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS)."
echo "Stories remaining: $(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")"
echo "Check progress.txt and ralph-output.log for details."
exit 1
