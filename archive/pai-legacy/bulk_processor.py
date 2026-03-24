#!/usr/bin/env python3
"""
Bulk processor for LinkedIn connections.
Generates batched operations for Claude to execute.
"""

import json

LIST_ID = "8c4717d8-5c47-4ecb-885f-8226a52ad7a9"

def load_connections():
    with open('/Users/robertpeacock/Desktop/Claude code/connections_data.json', 'r') as f:
        return json.load(f)

def parse_name(full_name):
    """Split full name into first and last name."""
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], ""
    elif len(parts) == 2:
        return parts[0], parts[1]
    else:
        return parts[0], " ".join(parts[1:])

def generate_bulk_operations():
    """Generate all operations needed."""
    connections = load_connections()

    # Track processed IDs
    processed = {
        "Sofia Knauer": "80b15615-76ec-4a8e-b2b0-cc3871983891",
        "Gal Nakash": "3f7b1c3f-2415-44b1-8659-b13cb5a6eb66",
        "Kim Greenia": "a94196d8-2e60-4a53-9c2e-15f05b556312",
        "Nick Guldin": "9be54549-5277-427d-8da9-1ea513ffa9a3",
        "Ophir Dror": "3c7e5f3d-339c-47aa-a342-2f269a804ad4",
        "Jenn Castner": "42839a99-9f68-479f-aa45-f4ca05e34ead",
        "Omer Ashkenazi": "e849ecee-71c3-426e-99c9-7a9c645b3869",  # Already exists
        "Reut Tiger Zur": "f7ca2596-3268-567d-9d5a-a9197b8f5202"   # Already exists (as Reut Zur)
    }

    create_operations = []
    add_to_list_operations = []

    # First, add all processed records to list
    for name, record_id in processed.items():
        add_to_list_operations.append({
            'name': name,
            'record_id': record_id,
            'operation': 'add_to_list'
        })

    # Generate create operations for remaining
    for conn in connections:
        if conn['name'] not in processed:
            first_name, last_name = parse_name(conn['name'])
            create_operations.append({
                'name': conn['name'],
                'first_name': first_name,
                'last_name': last_name,
                'title': conn['title'],
                'company': conn['company'],
                'persona': conn['persona'],
                'headline': conn['headline'],
                'connected_on': conn['connected_on']
            })

    return {
        'already_processed': len(processed),
        'to_create': len(create_operations),
        'total': len(connections),
        'add_to_list_first': add_to_list_operations,
        'create_operations': create_operations
    }

if __name__ == '__main__':
    ops = generate_bulk_operations()

    print(f"=== Bulk Processing Plan ===")
    print(f"Total connections: {ops['total']}")
    print(f"Already processed: {ops['already_processed']}")
    print(f"Need to create: {ops['to_create']}")
    print(f"\nStep 1: Add {len(ops['add_to_list_first'])} existing records to list")
    print(f"Step 2: Create and add {ops['to_create']} new records")

    # Save to file
    with open('/Users/robertpeacock/Desktop/Claude code/bulk_ops.json', 'w') as f:
        json.dump(ops, f, indent=2)

    print(f"\n✓ Bulk operations saved to bulk_ops.json")

    # Show next 10 to create
    print(f"\nNext 10 to create:")
    for i, op in enumerate(ops['create_operations'][:10], 1):
        print(f"{i}. {op['name']} - {op['title'] or 'No title'} @ {op['company'] or 'No company'}")
