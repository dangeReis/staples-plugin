#!/usr/bin/env python3
"""
Convert Staples order JSON data to TSV and XLSX formats.
Handles both in-store and online order formats.
"""

import json
import csv
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

try:
    import openpyxl
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill
    XLSX_AVAILABLE = True
except ImportError:
    XLSX_AVAILABLE = False
    print("Warning: openpyxl not installed. Install with: pip install openpyxl")
    print("Only TSV output will be generated.")


def parse_order_lines(order: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Parse order lines from both in-store and online formats."""
    rows = []

    # Common order fields
    order_number = order.get('orderNumber', '')
    order_date = order.get('orderDate', '')
    order_type = order.get('orderType', '')
    order_channel = order.get('orderChannel', order_type)  # Use orderType if channel missing
    customer_number = order.get('customerNumber', '')
    status_desc = order.get('statusDesc', '')
    grand_total = order.get('grandTotal', 0)
    points_issued = order.get('pointsIssued', 0)
    points_redeemed = order.get('pointsRedeemed', 0)

    # Store information (for in-store orders)
    store_number = order.get('storeNumber', '')
    store_address = order.get('storeAddressLine1', '')
    store_city = order.get('storeCity', '')
    store_state = order.get('storeState', '')

    # Process each order line
    for line in order.get('orderLines', []):
        row = {
            'Order Number': order_number,
            'Order Date': order_date,
            'Order Type': order_type,
            'Order Channel': order_channel,
            'Customer Number': customer_number,
            'Order Status': status_desc,
            'Grand Total': grand_total,
            'Points Issued': points_issued,
            'Points Redeemed': points_redeemed,
            'Store Number': store_number,
            'Store Address': store_address,
            'Store City': store_city,
            'Store State': store_state,
            'Product SKU': line.get('productSku', ''),
            'Product Name': line.get('productName', ''),
            'Product Description': line.get('productDesc', ''),
            'Model': line.get('model', ''),
            'Unit Price': line.get('unitPrice', 0),
            'Quantity': line.get('orderQty', 0),
            'Original Quantity': line.get('originalOrderedQty', 0),
            'Line Total': line.get('total', 0),
            'Line Status': line.get('statuses', [{}])[0].get('statusDesc', '') if line.get('statuses') else '',
            'Product URL': line.get('productURL', ''),
            'Out of Stock': line.get('isOutOfStock', False),
            'BOPIS Eligible': line.get('bopisEligible', False),
            'Delivery In Stock': line.get('isDeliveryInstock', False),
        }
        rows.append(row)

    # If no order lines, create a single row with order info
    if not rows:
        rows.append({
            'Order Number': order_number,
            'Order Date': order_date,
            'Order Type': order_type,
            'Order Channel': order_channel,
            'Customer Number': customer_number,
            'Order Status': status_desc,
            'Grand Total': grand_total,
            'Points Issued': points_issued,
            'Points Redeemed': points_redeemed,
            'Store Number': store_number,
            'Store Address': store_address,
            'Store City': store_city,
            'Store State': store_state,
            'Product SKU': '',
            'Product Name': '',
            'Product Description': '',
            'Model': '',
            'Unit Price': 0,
            'Quantity': 0,
            'Original Quantity': 0,
            'Line Total': 0,
            'Line Status': '',
            'Product URL': '',
            'Out of Stock': False,
            'BOPIS Eligible': False,
            'Delivery In Stock': False,
        })

    return rows


def load_json_file(file_path: Path) -> Dict[str, Any]:
    """Load and parse a JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return {}


def write_tsv(rows: List[Dict[str, Any]], output_file: Path):
    """Write rows to a TSV file."""
    if not rows:
        print("No data to write to TSV")
        return

    # Get all unique keys from all rows
    fieldnames = list(rows[0].keys())

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter='\t')
        writer.writeheader()
        writer.writerows(rows)

    print(f"✓ Wrote {len(rows)} rows to {output_file}")


def write_xlsx(rows: List[Dict[str, Any]], output_file: Path):
    """Write rows to an XLSX file with formatting."""
    if not XLSX_AVAILABLE:
        print("Skipping XLSX generation (openpyxl not installed)")
        return

    if not rows:
        print("No data to write to XLSX")
        return

    wb = Workbook()
    ws = wb.active
    ws.title = "Orders"

    # Header styling
    header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    header_alignment = Alignment(horizontal="center", vertical="center")

    # Write headers
    fieldnames = list(rows[0].keys())
    for col_idx, field in enumerate(fieldnames, 1):
        cell = ws.cell(row=1, column=col_idx, value=field)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = header_alignment

    # Write data
    for row_idx, row in enumerate(rows, 2):
        for col_idx, field in enumerate(fieldnames, 1):
            value = row.get(field, '')
            cell = ws.cell(row=row_idx, column=col_idx, value=value)

            # Align numbers to the right
            if isinstance(value, (int, float)):
                cell.alignment = Alignment(horizontal="right")

    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)  # Cap at 50 characters
        ws.column_dimensions[column_letter].width = adjusted_width

    # Freeze header row
    ws.freeze_panes = 'A2'

    wb.save(output_file)
    print(f"✓ Wrote {len(rows)} rows to {output_file}")


def main():
    # Setup paths
    data_dir = Path(__file__).parent / 'data'
    output_dir = Path(__file__).parent

    if not data_dir.exists():
        print(f"Error: Data directory not found: {data_dir}")
        sys.exit(1)

    # Find all JSON files in data directory
    json_files = list(data_dir.glob('*.json'))

    if not json_files:
        print(f"Error: No JSON files found in {data_dir}")
        sys.exit(1)

    print(f"Found {len(json_files)} JSON file(s):")
    for f in json_files:
        print(f"  - {f.name}")

    # Process all orders from all files
    all_rows = []

    for json_file in json_files:
        print(f"\nProcessing {json_file.name}...")
        data = load_json_file(json_file)

        if not data:
            continue

        # Extract orders from the JSON structure (handle both old and new formats)
        # Old format: { "orderDetailsList": [...] }
        # New format: { "page": 2, "orders": [...], "fetchedAt": "..." }
        orders = data.get('orderDetailsList', [])
        if not orders:
            orders = data.get('orders', [])

        if not orders:
            print(f"  No orders found in {json_file.name}")
            continue

        # Parse each order
        for order in orders:
            rows = parse_order_lines(order)
            all_rows.extend(rows)

        print(f"  Extracted {len(orders)} orders")

    if not all_rows:
        print("\nNo order data found to export")
        sys.exit(1)

    # Generate timestamp for output files
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Write outputs
    print(f"\nGenerating output files with {len(all_rows)} total rows...")

    tsv_file = output_dir / f'orders_{timestamp}.tsv'
    write_tsv(all_rows, tsv_file)

    if XLSX_AVAILABLE:
        xlsx_file = output_dir / f'orders_{timestamp}.xlsx'
        write_xlsx(all_rows, xlsx_file)

    print("\n✅ Conversion complete!")


if __name__ == '__main__':
    main()
