#!/bin/bash

# API endpoint and site ID
API_URL="https://www.wixapis.com/blog/v3/draft-posts"
SITE_ID="c0554f76-5c84-4ad9-b1c6-93a2622e3efb"
TOKEN=$(cat /Users/robertpeacock/Desktop/Claude\ code/.wix-api-token)

# Array of post titles (skipping first one already created)
posts=(
  "Why async interviews save time (and improve candidate experience)"
  "The 75th percentile rule for pre-screening senior candidates"
  "Five email outreach templates that get replies"
  "How to set up an ATS in Notion (free template)"
  "What to include on a candidate landing page"
  "How to coordinate hiring across Slack without losing candidates"
  "Salary benchmarking for UK startups (2026 data)"
  "Three signs your hiring process is broken (and how to fix it)"
  "How to write a role intake brief that actually works"
  "Why posting jobs on LinkedIn isn't enough"
  "How to run a 30-minute pre-screen interview"
)

echo "Creating ${#posts[@]} blog posts..."
echo ""

for i in "${!posts[@]}"; do
  num=$((i + 2))
  echo "[$num/12] Creating: ${posts[$i]}"
  
  # Use jq to extract the specific post from the JSON file
  payload=$(jq ".draftPosts[$num - 1]" /Users/robertpeacock/Desktop/Claude\ code/blog-posts-payload.json)
  
  # Wrap in draftPost object
  request=$(echo "$payload" | jq '{draftPost: .}')
  
  # Make API call
  curl -s -X POST "$API_URL" \
    -H "Authorization: $TOKEN" \
    -H "Content-Type: application/json" \
    -H "wix-site-id: $SITE_ID" \
    -d "$request" > /dev/null
  
  if [ $? -eq 0 ]; then
    echo "  ✓ Created successfully"
  else
    echo "  ✗ Failed"
  fi
  
  # Small delay to avoid rate limiting
  sleep 0.5
done

echo ""
echo "All posts created!"
