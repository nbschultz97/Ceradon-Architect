#!/usr/bin/env python3
"""
Convert customer inventory spreadsheet to COTS Architect multi-category CSV format.

Usage:
    python convert_customer_inventory.py input.xlsx output.csv
"""

import sys
import csv
import openpyxl
from pathlib import Path


def map_category(category_str, component_str):
    """
    Map customer category/component to COTS Architect categories.

    Args:
        category_str: Category from Column A (UAS, FAB, MISC)
        component_str: Component from Column B (ESC, Battery, Frame, etc.)

    Returns:
        Normalized category name for COTS Architect
    """
    category_lower = category_str.lower().strip()
    component_lower = component_str.lower().strip()

    # Category mapping based on component type
    component_map = {
        'esc': 'esc',
        'battery': 'battery',
        'frame': 'airframe',
        'controller': 'flight_controller',
        'propellers': 'accessory',
        'props': 'accessory',
        'motors': 'motor',
        'motor': 'motor',
        'radio': 'radio',
        'receiver': 'radio',
        'tools': 'accessory',
        'glue': 'accessory',
        'misc': 'accessory',
        'parts': 'accessory',
        'camera': 'sensor',
        'vtx': 'accessory',
        'antenna': 'accessory',
        'filament': 'accessory',
        'wire': 'accessory',
        'activator': 'accessory'
    }

    # Check component first
    for key, value in component_map.items():
        if key in component_lower:
            return value

    # Fallback to generic mapping
    if category_lower == 'uas':
        return 'accessory'
    elif category_lower == 'fab':
        return 'accessory'
    else:
        return 'accessory'


def convert_inventory(input_path, output_path):
    """
    Convert customer inventory Excel to multi-category CSV.

    Args:
        input_path: Path to input .xlsx file
        output_path: Path to output .csv file
    """
    print(f"Reading inventory from: {input_path}")

    # Load workbook
    wb = openpyxl.load_workbook(input_path)
    ws = wb.active

    # Prepare output CSV
    output_rows = []

    # Process each row (skip header if present)
    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not row or len(row) < 4:
            continue

        category_raw = row[0] if row[0] else ''
        component_raw = row[1] if row[1] else ''
        item_name = row[2] if row[2] else ''
        quantity_raw = row[3] if row[3] else ''
        link = row[4] if len(row) > 4 and row[4] else ''

        # Skip empty rows
        if not item_name or not category_raw:
            continue

        # Map to COTS Architect category
        category = map_category(category_raw, component_raw)

        # Parse quantity
        try:
            quantity = int(float(quantity_raw)) if quantity_raw else 1
        except (ValueError, TypeError):
            quantity = 1

        # Clean up item name (remove color codes if present)
        item_name_clean = str(item_name).strip()

        # Build output row
        output_row = {
            'category': category,
            'name': item_name_clean,
            'manufacturer': '',  # Not in source data
            'part_number': '',  # Not in source data
            'quantity': quantity,
            'weight_g': '',  # Not in source data
            'cost_usd': '',  # Not in source data
            'link': link if link else '',
            'notes': f"{category_raw}/{component_raw}"  # Preserve original categorization
        }

        output_rows.append(output_row)
        print(f"Row {row_idx}: {category_raw}/{component_raw} -> {category} | {item_name_clean[:50]}")

    # Write CSV
    print(f"\nWriting {len(output_rows)} parts to: {output_path}")

    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['category', 'name', 'manufacturer', 'part_number', 'quantity', 'weight_g', 'cost_usd', 'link', 'notes']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()
        writer.writerows(output_rows)

    print(f"[SUCCESS] Conversion complete!")
    print(f"\nImport this file into COTS Architect:")
    print(f"1. Go to Parts Library")
    print(f"2. Click 'Import Multi-Category CSV'")
    print(f"3. Select: {output_path}")

    # Print category breakdown
    category_counts = {}
    for row in output_rows:
        cat = row['category']
        category_counts[cat] = category_counts.get(cat, 0) + 1

    print("\nCategory breakdown:")
    for cat, count in sorted(category_counts.items()):
        print(f"  {cat}: {count} parts")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python convert_customer_inventory.py input.xlsx output.csv")
        sys.exit(1)

    input_file = Path(sys.argv[1])
    output_file = Path(sys.argv[2])

    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)

    if not input_file.suffix.lower() in ['.xlsx', '.xls']:
        print(f"Error: Input file must be .xlsx or .xls")
        sys.exit(1)

    convert_inventory(input_file, output_file)
