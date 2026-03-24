# Smartlead Skill

Slash command for managing Smartlead campaigns and Attio contacts.

## Installation

This skill is located at: `/Users/robertpeacock/Desktop/Claude code/skills/smartlead`

To use it, simply type `/smartlead` in the Claude Code CLI.

## Usage

```bash
/smartlead
```

Then you can ask Claude to:
- "Show me all my campaigns"
- "List Product/Engineering contacts"
- "Show contacts from the last 7 days"
- "Add John Doe to campaign X"
- "Get stats for my Acuity campaign"
- "Show me recent replies"

## Examples

### List all campaigns
```
/smartlead
> Show me all my campaigns
```

### Filter contacts by persona
```
/smartlead
> Show me all Product/Engineering contacts from the last 7 days
```

### Get campaign stats
```
/smartlead
> Get the stats for campaign ID 2679636
```

### Add a lead
```
/smartlead
> Add Jane Smith (jane@example.com) from Tech Corp to the Acuity campaign
```

## Files Used

- `smartlead_client.py` - Smartlead API client
- `attio_smartlead_integration.py` - Integration helper
- `matched_linkedin_connections.json` - Contact data (53 contacts)

## API Key

Configured: `ca060959-8077-45dd-b024-c103a4713a55_7513a27`
