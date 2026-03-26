---
name: smartlead
description: Manage Smartlead email outreach campaigns and Attio CRM leads. Use when asked to "smartlead", "show campaigns", "add leads", "filter contacts", "campaign stats", or when managing email outreach workflows. Provides filtering by persona (Product/Engineering, People/TA, Security/Risk), company, and connection date. Supports dry-run preview before adding leads to campaigns.
version: 1.0.0
---

# Smartlead Campaign Management

Interact with Smartlead email outreach campaigns and manage leads from Attio CRM.

## Available Tools and Scripts

You have access to these Python scripts in `/Users/robertpeacock/Desktop/Claude code/`:

1. **smartlead_client.py** - Direct API client for Smartlead
2. **attio_smartlead_integration.py** - Integration helper for filtering and processing Attio contacts
3. **matched_linkedin_connections.json** - 53 contacts matched between LinkedIn and Attio

## Configuration

- **API Key**: `ca060959-8077-45dd-b024-c103a4713a55_7513a27`
- **Working Directory**: `/Users/robertpeacock/Desktop/Claude code`
- **Python**: Use `python3` for all scripts

## Capabilities

### Campaign Management
- List all Smartlead campaigns with status
- Get details of a specific campaign
- Create new campaigns
- Get campaign statistics and analytics
- View campaign leads

### Lead Management
- Filter Attio contacts by persona (Product/Engineering, People/TA, Security/Risk, etc.)
- Filter contacts by company
- Filter contacts by connection date (recent connections)
- Preview leads before adding to campaigns (dry run)
- Add leads to campaigns
- Get existing leads from campaigns

### Email & Analytics
- Get email replies from campaigns
- View campaign performance stats
- List email accounts

## Common User Requests

### "Show me my campaigns"
```python
from smartlead_client import SmartleadClient
client = SmartleadClient("ca060959-8077-45dd-b024-c103a4713a55_7513a27")
campaigns = client.get_campaigns()
# Display campaigns with status, name, and ID
```

### "Show me all [persona] contacts"
```python
from attio_smartlead_integration import AttioSmartleadIntegration
integration = AttioSmartleadIntegration("ca060959-8077-45dd-b024-c103a4713a55_7513a27")
integration.load_attio_contacts("/Users/robertpeacock/Desktop/Claude code/matched_linkedin_connections.json")
contacts = integration.filter_contacts_by_persona("Product/Engineering")
# Display contacts with name, company, title
```

### "Show me contacts from the last N days"
```python
integration = AttioSmartleadIntegration("ca060959-8077-45dd-b024-c103a4713a55_7513a27")
integration.load_attio_contacts("/Users/robertpeacock/Desktop/Claude code/matched_linkedin_connections.json")
recent = integration.filter_contacts_recent(days=7)
# Display recent contacts
```

### "Add [contact] to [campaign]"
```python
client = SmartleadClient("ca060959-8077-45dd-b024-c103a4713a55_7513a27")
client.add_lead(
    campaign_id=2679636,
    lead_data={
        "email": "contact@example.com",
        "first_name": "Jane",
        "last_name": "Smith",
        "company_name": "Tech Corp",
        "title": "Engineering Manager"
    }
)
```

### "Get stats for [campaign]"
```python
client = SmartleadClient("ca060959-8077-45dd-b024-c103a4713a55_7513a27")
stats = client.get_campaign_stats(campaign_id=2679636)
# Display stats
```

### "Show me replies from [campaign]"
```python
client = SmartleadClient("ca060959-8077-45dd-b024-c103a4713a55_7513a27")
replies = client.get_replies(campaign_id=2679636)
# Display replies
```

## Important Notes

1. **Email Addresses**: The Attio data currently lacks email addresses. When adding leads, you'll need to provide emails separately.

2. **Dry Run First**: Always preview what would be added to campaigns before actually adding leads.

3. **Persona Types**: Common personas in the data:
   - Product/Engineering
   - People/TA
   - Security/Risk

4. **Campaign Status**: Campaigns can be ACTIVE, PAUSED, COMPLETED, DRAFTED, or ARCHIVED.

## Workflow

When the user invokes /smartlead:
1. Understand their request (list campaigns, filter contacts, add leads, get stats, etc.)
2. Execute the appropriate Python commands
3. Display results in a clear, readable format
4. Ask for confirmation before making changes (adding leads, creating campaigns, etc.)

## Response Format

- Be concise and show relevant data in a readable format
- For lists, show key information (ID, name, status)
- For contacts, show name, company, title, persona
- For stats, highlight key metrics
- Always ask for confirmation before adding leads to campaigns

## Example Interactions

**User**: "Show me all my active campaigns"
**Response**: Execute `get_campaigns()`, filter by status=ACTIVE, display in table format

**User**: "Show me Product/Engineering contacts from last week"
**Response**: Load Attio data, filter by persona and last 7 days, display results

**User**: "Add these 3 contacts to campaign X"
**Response**: Show preview, ask for confirmation with emails, then execute additions

**User**: "How is my Acuity campaign performing?"
**Response**: Get stats for Acuity campaign, display key metrics (opens, replies, bounces, etc.)
