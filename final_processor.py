#!/usr/bin/env python3
"""
Final processor - generates processing status and next batch details.
"""

import json

def load_bulk_ops():
    with open('/Users/robertpeacock/Desktop/Claude code/bulk_ops.json', 'r') as f:
        return json.load(f)

if __name__ == '__main__':
    ops = load_bulk_ops()

    print(f"=== Processing Status ===")
    print(f"✓ Step 1 Complete: Added 8 existing records to list")
    print(f"  - Sofia Knauer")
    print(f"  - Gal Nakash")
    print(f"  - Kim Greenia")
    print(f"  - Nick Guldin")
    print(f"  - Ophir Dror")
    print(f"  - Jenn Castner")
    print(f"  - Omer Ashkenazi")
    print(f"  - Reut Tiger Zur")
    print(f"\n⏳ Step 2 In Progress: Create and add {len(ops['create_operations'])} new records")
    print(f"\nTotal to process: {len(ops['create_operations'])}")
    print(f"Batch size: 10 records at a time")
    print(f"Estimated batches: {(len(ops['create_operations']) + 9) // 10}")

    # Save create operations to separate file for easier processing
    with open('/Users/robertpeacock/Desktop/Claude code/create_list.json', 'w') as f:
        json.dump(ops['create_operations'], f, indent=2)

    print(f"\n✓ Create list saved to create_list.json")

    # Show first 20
    print(f"\nFirst 20 connections to create:")
    for i, op in enumerate(ops['create_operations'][:20], 1):
        title_str = f" - {op['title']}" if op['title'] else ""
        company_str = f" @ {op['company']}" if op['company'] else ""
        print(f"{i:3d}. {op['name']}{title_str}{company_str}")
