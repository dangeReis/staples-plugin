# Staples Receipt Downloader Chrome Extension

A Chrome extension that helps you download receipts from your Staples account, supporting both online orders and in-store purchases.

## Features

- **Online Order Receipts**: Automatically downloads PDF receipts for online orders
- **In-Store Transaction Receipts**: Navigates to in-store transaction details and prepares them for printing to PDF
- **Batch Processing**: Handles multiple receipts at once with staggered downloads to prevent connection issues
- **Organized Storage**: Saves receipts with standardized filenames: `staples/YYYY-MM-DD-{order-number}.pdf`

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the `plugin` directory

## Usage

### For Online Orders

1. Navigate to your Staples order history page: `https://www.staples.com/ptd/myorders`
2. The extension icon will become active (highlighted)
3. Click the extension icon
4. The extension will automatically download all online order receipts as PDFs

### For In-Store Transactions

1. Navigate to your Staples order history page: `https://www.staples.com/ptd/myorders`
2. The extension icon will become active (highlighted)
3. Click the extension icon
4. The extension will **automatically**:
   - Open each in-store transaction in a background tab
   - Navigate to the print page
   - Capture the page as a PDF using Chrome's debugger API
   - Download the PDF with the correct filename
   - Close the background tab

**No manual interaction required!** All PDFs are downloaded automatically.

## File Naming Convention

Receipts are saved with the following format:

- **Online orders**: `staples/YYYY-MM-DD-{order-number}.pdf`
  - Example: `staples/2025-10-04-123456789.pdf`

- **In-store transactions**: `staples/YYYY-MM-DD-POS.{transaction-id}.pdf`
  - Example: `staples/2025-10-04-POS.542.20251004.4.23365.pdf`

The date in the filename is extracted from the order/transaction information for easy organization.

## How It Works

### Online Orders
1. Scans the order history page for order containers
2. Extracts order number, date, and receipt link from each order
3. Downloads PDFs directly with appropriate filenames

### In-Store Transactions
1. Scans the order history page for in-store transaction containers
2. Extracts transaction number and date from the container ID
3. Constructs the direct print page URL with parameters
4. Opens the print page in a background tab
5. Uses Chrome's debugger API to programmatically generate a PDF
6. Downloads the PDF automatically with the correct filename
7. Closes the background tab after completion

## Technical Details

### Permissions Required
- `activeTab`: To interact with the Staples website
- `tabs`: To manage navigation and background tabs
- `scripting`: To inject content scripts
- `downloads`: To download receipt PDFs
- `debugger`: To programmatically generate PDFs from in-store transaction pages

### Supported URLs
- Order history: `https://www.staples.com/ptd/myorders*`
- Order details: `https://www.staples.com/ptd/orderdetails*`

## Limitations

- The extension only works on Staples.com order pages
- Requires active internet connection to access Staples website
- Chrome may show a notification that "Staples Page Indicator started debugging this browser" - this is normal and required for PDF generation
- In-store receipts take slightly longer to download (2-4 seconds each) as the page needs to fully render before PDF capture

## Troubleshooting

### Extension icon not appearing
- Make sure you're on the Staples order history page
- Check that the extension is enabled in `chrome://extensions/`

### Receipts not downloading
- Check your Chrome download settings
- Ensure you have write permissions to the download directory
- Check the browser console for error messages (F12 → Console tab)

### In-store receipts not working
- Verify the page structure matches the expected format
- Check console logs for detailed error messages
- Ensure JavaScript is enabled

## Privacy

This extension:
- Only activates on Staples.com pages
- Does not collect or transmit any personal data
- Does not store any information outside your local downloads folder
- All processing happens locally in your browser

## Development

### File Structure
```
plugin/
├── manifest.json       # Extension configuration
├── background.js       # Background service worker
├── content.js         # Content script for page interaction
├── icon.png           # Default icon
├── icon_active.png    # Active state icon
└── README.md          # This file
```

### Key Functions

**content.js**:
- `detectPageType()`: Determines if on order list or order details page
- `processOrders()`: Main function to process both online and in-store orders
- `extractOrderData()`: Extracts online order information
- `extractInStoreTransactionData()`: Extracts in-store transaction information and constructs print URLs
- `openOrderDetailsPage()`: Sends request to background script to capture PDF

**background.js**:
- Manages icon state
- Handles PDF downloads for online orders
- `capturePDFFromUrl()`: Uses Chrome debugger API to:
  - Open print page in background tab
  - Wait for page to fully render
  - Attach Chrome debugger
  - Execute `Page.printToPDF` command
  - Convert base64 PDF data to blob
  - Download with correct filename
  - Clean up and close tab

## License

MIT License - Feel free to modify and distribute as needed.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
