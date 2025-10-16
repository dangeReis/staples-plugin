// content.js
// This script runs in the context of the Staples order history page and extracts order information.

// Initialize the page
initializePage();

// Watch for URL changes (SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    console.log('URL changed to:', currentUrl);
    // Re-initialize when URL changes
    initializePage();
  }
}).observe(document, { subtree: true, childList: true });

function initializePage() {
  console.log('Initializing page:', location.href);
  // Notify background script of activity
  chrome.runtime.sendMessage({ icon: 'active' }).catch(err => {
    console.log('Could not send icon message (extension may be reloading):', err.message);
  });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === 'iconClicked') {
    const pageType = detectPageType();
    if (pageType === 'orderList') {
      processOrders();
    }
    // Order details pages are now handled automatically by background.js
    // No manual interaction needed
  }
});

function detectPageType() {
  const url = window.location.href;
  if (url.includes('/ptd/orderdetails')) {
    return 'orderDetails';
  } else if (url.includes('/ptd/myorders')) {
    return 'orderList';
  }
  return 'unknown';
}

// Track transactions across pages to maintain proper delays
let globalTransactionIndex = 0;

function processOrders() {
  console.log('processOrders started');

  // Process online orders
  const onlineOrderContainers = document.querySelectorAll('[id^="ph-order-container"]');
  onlineOrderContainers.forEach((container, index) => {
    const orderData = extractOrderData(container);
    if (orderData) {
      sendDownloadRequest(orderData, index);
    } else {
      console.warn(`Could not extract data from online order at index ${index}.`);
    }
  });

  // Process in-store transactions on current page
  const instoreTransactions = document.querySelectorAll('[id^="ph-order-ordernumber-POS"]');
  console.log(`Found ${instoreTransactions.length} in-store transactions on this page`);

  instoreTransactions.forEach((container, index) => {
    console.log(`Processing in-store transaction ${index}:`, container.id);
    const transactionData = extractInStoreTransactionData(container);
    if (transactionData) {
      console.log(`Extracted transaction data:`, transactionData);
      // Use global index to maintain proper delays across pages
      openOrderDetailsPage(transactionData, globalTransactionIndex);
      globalTransactionIndex++;
    } else {
      console.warn(`Could not extract data from in-store transaction at index ${index}.`);
    }
  });

  // Check if there's a next page button
  const nextPageButton = document.querySelector('a[aria-label="Next page of results"]:not([aria-disabled="true"])');
  if (nextPageButton) {
    console.log('Found next page button, will navigate after current page completes');
    // Schedule navigation to next page after all current transactions are queued
    // Wait enough time for all current transactions to be sent
    const delayBeforeNextPage = (instoreTransactions.length * 5000) + 5000;
    setTimeout(() => {
      console.log('Navigating to next page...');
      nextPageButton.click();

      // Wait for page to load and process next page
      setTimeout(() => {
        processOrders();
      }, 3000);
    }, delayBeforeNextPage);
  } else {
    console.log('No more pages to process');
    globalTransactionIndex = 0; // Reset for next run
  }
}


function extractOrderData(orderContainer) {
  try {
    const orderNumber = extractOrderNumber(orderContainer);
    const orderDate = extractOrderDate(orderContainer);
    const receiptLink = extractReceiptLink(orderContainer);

    if (!orderNumber || !orderDate || !receiptLink) {
      return null; // Return null if any data is missing
    }

    return { orderNumber, orderDate, receiptLink };
  } catch (error) {
    console.error("Error extracting order data:", error);
    return null;
  }
}

function extractOrderNumber(orderContainer) {
  const orderNumberElement = orderContainer.querySelector('a[aria-label^="Order number"]');
  return orderNumberElement ? orderNumberElement.textContent : null;
}

function extractOrderDate(orderContainer) {
  const orderDateElement = orderContainer.querySelector('div[aria-label^="Order date"]');
  let orderDate = orderDateElement ? orderDateElement.textContent.trim().replace('Order date', '') : null;
  if (orderDate) {
    orderDate = formatDate(parseDate(orderDate));
  }
  return orderDate;
}

function extractReceiptLink(orderContainer) {
  const receiptLinkElement = orderContainer.querySelector('a[aria-label^="View receipt for order number"]');
  return receiptLinkElement ? receiptLinkElement.href : null;
}

function parseDate(dateString) {
  const [month, day, year] = dateString.split('/');
  const fourDigitYear = year.length === 2 ? `20${year}` : year;
  return new Date(Date.parse(`${month}/${day}/${fourDigitYear}`));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}


function extractInStoreTransactionData(transactionContainer) {
  try {
    // Extract transaction number from the container ID
    // Format: ph-order-ordernumber-POS.542.20251004.4.23365
    const containerId = transactionContainer.id;
    const transactionNumber = containerId.replace('ph-order-ordernumber-', '');

    // Extract transaction date from the transaction number
    // Format: POS.542.20251004.4.23365
    const datePart = transactionNumber.split('.')[2]; // Gets "20251004"
    const transactionDate = formatDateFromString(datePart);

    // Find the transaction link
    const linkElement = transactionContainer.querySelector('a[href*="orderdetails"]');
    const detailsLink = linkElement ? linkElement.href : null;

    if (!transactionNumber || !transactionDate || !detailsLink) {
      return null;
    }

    return { transactionNumber, transactionDate, detailsLink };
  } catch (error) {
    console.error("Error extracting in-store transaction data:", error);
    return null;
  }
}

function formatDateFromString(dateString) {
  // Convert "20251004" to "2025-10-04"
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  return `${year}-${month}-${day}`;
}

function openOrderDetailsPage(transactionData, index) {
  const { transactionNumber, transactionDate, detailsLink } = transactionData;

  // Construct the print page URL directly
  // Add print=true parameter to go straight to print view
  const printUrl = detailsLink.includes('?')
    ? `${detailsLink}&print=true&xsmall=false`
    : `${detailsLink}?print=true&xsmall=false`;

  // Use shorter delays - 5 seconds between each
  const delay = index * 5000;

  console.log(`Scheduling capturePDF for ${transactionNumber} with ${delay}ms delay`);
  console.log(`Print URL: ${printUrl}`);

  // Handle the delay on the content script side to avoid service worker timeouts
  setTimeout(() => {
    console.log(`Now sending capturePDF message for ${transactionNumber}`);

    // Send message to background script to open the print page and capture PDF
    chrome.runtime.sendMessage({
      message: 'capturePDF',
      url: printUrl,
      transactionNumber: transactionNumber,
      transactionDate: transactionDate,
      delay: 0  // No delay in background, we already delayed here
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(`Error sending message for ${transactionNumber}:`, chrome.runtime.lastError);
      } else {
        console.log(`Message sent successfully for ${transactionNumber}`);
      }
    });
  }, delay);
}

function sendDownloadRequest(orderData, index) {
  const { orderNumber, orderDate, receiptLink } = orderData;
  const filename = `staples/${orderDate}-${orderNumber}.pdf`;
  chrome.runtime.sendMessage({
    message: 'downloadReceipt',
    url: receiptLink,
    filename: filename,
    delay: index * 2000
  });
}

