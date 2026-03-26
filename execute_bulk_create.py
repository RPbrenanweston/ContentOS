#!/usr/bin/env python3
"""
Script to systematically process all 232 remaining LinkedIn connections.
This generates a log of what needs to be done.
"""

import json

LIST_ID = "8c4717d8-5c47-4ecb-885f-8226a52ad7a9"

def load_create_list():
    with open('/Users/robertpeacock/Desktop/Claude code/create_list.json', 'r') as f:
        return json.load(f)

def main():
    connections = load_create_list()

    print(f"{'='*80}")
    print(f"BULK PROCESSING PLAN: {len(connections)} LinkedIn Connections")
    print(f"List ID: {LIST_ID}")
    print(f"{'='*80}\n")

    print(f"Processing Strategy:")
    print(f"  1. Create person record with first_name, last_name, job_title (if available)")
    print(f"  2. Immediately add created record to list")
    print(f"  3. Continue to next connection\n")

    print(f"Starting batch processing...\n")

    # Process in batches of 10
    batch_size = 10
    total_batches = (len(connections) + batch_size - 1) // batch_size

    for batch_num in range(total_batches):
        start_idx = batch_num * batch_size
        end_idx = min(start_idx + batch_size, len(connections))
        batch = connections[start_idx:end_idx]

        print(f"--- Batch {batch_num + 1}/{total_batches} (Connections {start_idx + 1}-{end_idx}) ---")

        for i, conn in enumerate(batch, start=start_idx + 1):
            record_data = {
                "first_name": conn['first_name'],
                "last_name": conn['last_name']
            }

            if conn['title']:
                record_data['job_title'] = conn['title']

            print(f"  {i:3d}. CREATE: {conn['name']}")
            if conn['title']:
                print(f"       Title: {conn['title']}")
            if conn['company']:
                print(f"       Company: {conn['company']}")
            print(f"       -> Then ADD to list {LIST_ID}")

        print()

    print(f"\n{'='*80}")
    print(f"SUMMARY")
    print(f"{'='*80}")
    print(f"Total connections to process: {len(connections)}")
    print(f"Total batches: {total_batches}")
    print(f"Operations per connection: 2 (CREATE + ADD_TO_LIST)")
    print(f"Total API operations: {len(connections) * 2}")
    print(f"\nStatus:")
    print(f"  ✓ Already on list: 8 connections")
    print(f"  ⏳ To process: {len(connections)} connections")
    print(f"  = Total: {8 + len(connections)} connections")

if __name__ == '__main__':
    main()
