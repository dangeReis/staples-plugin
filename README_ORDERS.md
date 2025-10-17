# Order Data Converter

This Python script converts Staples order JSON data into TSV and XLSX formats for easy analysis.

## Features

- ✅ Processes both in-store and online order formats
- ✅ Generates TSV (Tab-Separated Values) files
- ✅ Generates XLSX (Excel) files with formatting (if openpyxl is installed)
- ✅ Handles multiple JSON files in the data directory
- ✅ Flattens nested order data into a tabular format
- ✅ Includes comprehensive order and product information

## Installation

### Required
```bash
# Python 3.6 or higher (already installed on macOS)
python3 --version
```

### Optional (for XLSX support)
```bash
# Install openpyxl for Excel file generation
pip3 install openpyxl
```

## Usage

### Basic Usage
```bash
# Run the script (it will automatically find JSON files in the data/ folder)
python3 convert_orders.py
```

### Alternative Usage
```bash
# Make it executable and run directly
chmod +x convert_orders.py
./convert_orders.py
```

## Input

The script expects JSON files in the `data/` directory with the following structure:

```json
{
  "orderDetailsList": [
    {
      "orderNumber": "...",
      "orderDate": "...",
      "orderLines": [...]
    }
  ]
}
```

Currently supported files:
- `data/instore.json` - In-store orders
- `data/online.json` - Online orders
- `data/online0.json` - Additional online orders

## Output

The script generates timestamped files in the current directory:

- `orders_YYYYMMDD_HHMMSS.tsv` - Tab-separated values (always generated)
- `orders_YYYYMMDD_HHMMSS.xlsx` - Excel file with formatting (if openpyxl installed)

### Output Columns

| Column | Description |
|--------|-------------|
| Order Number | Unique order identifier |
| Order Date | Date/time order was placed |
| Order Type | Type of order (SALES, etc.) |
| Order Channel | Channel (WEB, MOBILE_APP, etc.) |
| Customer Number | Customer identifier |
| Order Status | Current order status |
| Grand Total | Total order amount |
| Points Issued | Rewards points issued |
| Points Redeemed | Rewards points redeemed |
| Store Number | Store number (in-store orders) |
| Store Address | Store address |
| Store City | Store city |
| Store State | Store state |
| Product SKU | Product SKU/ID |
| Product Name | Short product name |
| Product Description | Full product description |
| Model | Product model number |
| Unit Price | Price per unit |
| Quantity | Quantity ordered |
| Original Quantity | Original quantity (if changed) |
| Line Total | Line item total |
| Line Status | Status of this line item |
| Product URL | Link to product page |
| Out of Stock | Whether product is out of stock |
| BOPIS Eligible | Buy Online Pick up In Store eligible |
| Delivery In Stock | Whether available for delivery |

## Examples

### View TSV file
```bash
# Open in default spreadsheet app
open orders_20251016_123456.tsv

# View in terminal
cat orders_20251016_123456.tsv | column -t -s $'\t' | less -S
```

### View XLSX file
```bash
# Open in Excel or Numbers
open orders_20251016_123456.xlsx
```

## Troubleshooting

### No XLSX files generated
Install openpyxl:
```bash
pip3 install openpyxl
```

### Permission denied
Make the script executable:
```bash
chmod +x convert_orders.py
```

### No JSON files found
Ensure your JSON files are in the `data/` directory relative to the script.

## Data Privacy

⚠️ The generated TSV/XLSX files contain personal information (customer numbers, order details). Handle appropriately and do not commit to public repositories.
