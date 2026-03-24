#!/usr/bin/env python3
"""
Generate a processing plan for all LinkedIn connections.
This creates a structured list of operations to perform.
"""

import json

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

def generate_operations():
    """Generate complete operation list."""
    connections = load_connections()
    operations = []

    # Skip first connection (Sofia Knauer) as already processed
    for i, conn in enumerate(connections[1:], start=2):
        first_name, last_name = parse_name(conn['name'])

        op = {
            'index': i,
            'name': conn['name'],
            'first_name': first_name,
            'last_name': last_name,
            'title': conn['title'],
            'company': conn['company'],
            'persona': conn['persona'],
            'connected_on': conn['connected_on'],
            'headline': conn['headline'],
            'steps': [
                f"Search for '{conn['name']}'",
                f"Create if not found (first: '{first_name}', last: '{last_name}')",
                "Add to list 8c4717d8-5c47-4ecb-885f-8226a52ad7a9"
            ]
        }
        operations.append(op)

    return operations

if __name__ == '__main__':
    operations = generate_operations()

    print(f"Total operations to process: {len(operations)}")
    print(f"Already processed: 1 (Sofia Knauer)")
    print(f"Remaining: {len(operations)}")

    # Save operations plan
    with open('/Users/robertpeacock/Desktop/Claude code/operations_plan.json', 'w') as f:
        json.dump(operations, f, indent=2)

    print(f"\n✓ Operations plan saved to operations_plan.json")

    # Show summary
    print(f"\n=== Summary ===")
    print(f"Next 5 to process:")
    for op in operations[:5]:
        print(f"{op['index']}. {op['name']} - {op['company'] or 'No company'}")
