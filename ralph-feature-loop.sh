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

  # Build the prompt for this iteration
  NEXT_ID=$(jq -r '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0].id' "$PRD_FILE")
  NEXT_JSON=$(jq '[.userStories[] | select(.passes == false)] | sort_by(.priority) | .[0]' "$PRD_FILE")

  PROMPT="You are Ralph, an autonomous coding agent. Your job is to implement ONE user story from prd.json.

INSTRUCTIONS:
1. Read prd.json and progress.txt for context
2. Implement story $NEXT_ID (the highest priority incomplete story)
3. The story details: $NEXT_JSON
4. Write the code changes needed
5. After implementing, verify typecheck would pass (check for obvious errors)
6. Update prd.json: set passes=true for story $NEXT_ID
7. Append a summary to progress.txt with what you changed
8. Commit all changes with message: 'feat($NEXT_ID): <story title>'
9. Push to contentos remote: git push contentos HEAD:main

RULES:
- Only implement the ONE story listed above
- Follow existing code patterns (read progress.txt for codebase patterns)
- Do NOT modify other stories in prd.json
- Do NOT skip steps or combine stories
- If blocked, write why in progress.txt and output <promise>BLOCKED</promise>
- If ALL stories are done, output <promise>COMPLETE</promise>"

  OUTPUT=$(echo "$PROMPT" | claude --dangerously-skip-permissions --print 2>&1 | tee /dev/stderr) || true

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
