// content.js
// This script runs in the context of the Staples order history page and extracts order information.

console.log('=== STAPLES EXTENSION CONTENT SCRIPT LOADED ===', location.href);
console.log('Document readyState:', document.readyState);
console.log('Chrome runtime exists:', typeof chrome !== 'undefined' && !!chrome.runtime);

// Initialize the page
initializePage();

// Also trigger URL change detection on initial load
// This ensures icon state is set correctly when page first loads
setTimeout(() => {
  handleUrlChange(location.href);
}, 1000);

// Watch for URL changes (SPA navigation) - Multiple strategies
let lastUrl = location.href;
console.log('Setting up URL change detection...');

// Strategy 1: MutationObserver
const observer = new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    console.log('*** MutationObserver detected URL change ***');
    lastUrl = currentUrl;
    handleUrlChange(currentUrl);
  }
});
observer.observe(document, { subtree: true, childList: true });
console.log('MutationObserver set up');

// Strategy 2: Polling (more reliable for SPAs)
console.log('Setting up polling for URL changes...');
setInterval(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    console.log('*** POLLING DETECTED URL CHANGE ***');
    console.log('Old URL:', lastUrl);
    console.log('New URL:', currentUrl);
    lastUrl = currentUrl;
    handleUrlChange(currentUrl);
  }
}, 500);

// Strategy 3: History API interception
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function() {
  console.log('*** HISTORY.PUSHSTATE CALLED ***', arguments);
  originalPushState.apply(this, arguments);
  handleUrlChange(location.href);
};

history.replaceState = function() {
  console.log('*** HISTORY.REPLACESTATE CALLED ***', arguments);
  originalReplaceState.apply(this, arguments);
  handleUrlChange(location.href);
};

// Listen for popstate events (back/forward)
window.addEventListener('popstate', () => {
  console.log('*** POPSTATE EVENT ***', location.href);
  handleUrlChange(location.href);
});

console.log('All URL detection strategies initialized');

// Strategy 4: Watch pagination element for changes (indicates page navigation in SPA)
let lastPaginationText = '';
const paginationObserver = new MutationObserver(() => {
  const paginationElement = document.querySelector('div[aria-label*="Viewing"][aria-label*="of"]');
  if (paginationElement) {
    const currentText = paginationElement.getAttribute('aria-label');
    if (currentText && currentText !== lastPaginationText) {
      console.log('*** PAGINATION CHANGE DETECTED ***');
      console.log('Old pagination:', lastPaginationText);
      console.log('New pagination:', currentText);
      lastPaginationText = currentText;

      // Give the DOM a moment to update, then check for auto-processing
      setTimeout(() => {
        console.log('Pagination changed, checking for auto-process...');
        checkAndAutoProcess();
      }, 500);
    }
  }
});

// Start observing the document for pagination changes
paginationObserver.observe(document.body, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['aria-label']
});

console.log('Pagination observer set up');

function handleUrlChange(currentUrl) {
  console.log('=== HANDLING URL CHANGE ===');
  console.log('URL:', currentUrl);

  // Use a small delay to ensure the page context is ready
  setTimeout(() => {
    console.log('Checking chrome.runtime...');
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      console.log('Chrome runtime is valid');

      // Check if we're on an order page
      const isOrderPage = currentUrl.includes('/ptd/myorders') || currentUrl.includes('/ptd/orderdetails');
      console.log(`Is order page: ${isOrderPage}`);

      if (isOrderPage) {
        console.log('✓ On order page, sending ACTIVE message');
        chrome.runtime.sendMessage({ icon: 'active' }).then(() => {
          console.log('Active icon message sent successfully');
        }).catch(err => {
          console.error('Failed to send active icon message:', err);
        });

        // Check if we should auto-process (for pagination or autonomous mode)
        checkAndAutoProcess();
      } else {
        console.log('✗ NOT on order page, sending INACTIVE message');
        chrome.runtime.sendMessage({ icon: 'inactive' }).then(() => {
          console.log('Inactive icon message sent successfully');
        }).catch(err => {
          console.error('Failed to send inactive icon message:', err);
        });
      }
    } else {
      console.error('Chrome runtime not available!');
    }
  }, 500); // Increased delay to 500ms to ensure page is fully loaded
}

function checkAndAutoProcess() {
  console.log('Checking if auto-process is needed...');

  // Check for pagination flag (page 2+)
  const shouldAutoProcess = sessionStorage.getItem('autoProcessNextPage');
  if (shouldAutoProcess === 'true') {
    console.log('Auto-processing next page from pagination...');
    const savedIndex = sessionStorage.getItem('globalTransactionIndex');
    if (savedIndex) {
      globalTransactionIndex = parseInt(savedIndex, 10);
      console.log(`Continuing from transaction index: ${globalTransactionIndex}`);
    }
    sessionStorage.removeItem('autoProcessNextPage');

    // Wait for DOM to be ready
    setTimeout(() => {
      processOrders();
    }, 1500);
    return;
  }

  // Check for autonomous mode flag
  const autonomousMode = localStorage.getItem('staplesAutonomousMode');
  if (autonomousMode === 'true' && !isProcessing) {
    console.log('Autonomous mode enabled - starting download automatically...');

    // Wait for DOM to be ready
    setTimeout(() => {
      processOrders();
    }, 2000);
  }
}

function initializePage() {
  console.log('Initializing page:', location.href);

  // Check if we're on the order list page
  const pageType = detectPageType();

  if (pageType === 'orderList') {
    // Notify background script of activity - check if chrome.runtime exists
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ icon: 'active' }).catch(err => {
        console.log('Could not send icon message (extension may be reloading):', err.message);
      });
    }
  }
}

// Status tracking for popup
let statusData = {
  isProcessing: false,
  currentPage: '1',
  transactionsFound: 0,
  scheduled: 0,
  completed: 0,
  failed: 0,
  total: 0
};

// Failed downloads tracking
let failedDownloads = [];
const MAX_RETRIES = 3;

function sendStatusUpdate() {
  chrome.runtime.sendMessage({
    type: 'statusUpdate',
    data: statusData
  }).catch(err => {
    // Popup might not be open, that's okay
    console.log('Status update not sent (popup may be closed)');
  });
}

function sendActivity(type, message) {
  chrome.runtime.sendMessage({
    type: 'activityUpdate',
    activity: {
      type,
      message,
      time: new Date().toLocaleTimeString()
    }
  }).catch(err => {
    console.log('Activity not sent (popup may be closed)');
  });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === 'iconClicked') {
    const pageType = detectPageType();
    if (pageType === 'orderList') {
      if (isProcessing) {
        // Stop processing
        stopProcessing();
        sendResponse({ action: 'stopped' });
      } else {
        // Start processing
        processOrders();
        sendResponse({ action: 'started' });
      }
    }
    // Order details pages are now handled automatically by background.js
    // No manual interaction needed
  } else if (request.message === 'toggleAutonomous') {
    const currentMode = localStorage.getItem('staplesAutonomousMode') === 'true';
    const newMode = !currentMode;
    localStorage.setItem('staplesAutonomousMode', newMode.toString());
    console.log(`Autonomous mode ${newMode ? 'ENABLED' : 'DISABLED'}`);
    sendResponse({ autonomousMode: newMode });
  } else if (request.message === 'getAutonomousStatus') {
    const autonomousMode = localStorage.getItem('staplesAutonomousMode') === 'true';
    sendResponse({ autonomousMode });
  } else if (request.message === 'getStatus') {
    // Send current status to popup
    sendResponse({...statusData, failedDownloads});
  } else if (request.message === 'retryFailed') {
    retryFailedDownloads();
    sendResponse({ action: 'retrying' });
  } else if (request.message === 'togglePrintWithImages') {
    const currentMode = localStorage.getItem('staplesPrintWithImages') !== 'false';
    const newMode = !currentMode;
    localStorage.setItem('staplesPrintWithImages', newMode.toString());
    console.log(`Print with images ${newMode ? 'ENABLED' : 'DISABLED'}`);
    sendResponse({ printWithImages: newMode });
  } else if (request.message === 'toggleOnlineOrderPrint') {
    const currentMode = localStorage.getItem('staplesOnlineOrderPrint') === 'true';
    const newMode = !currentMode;
    localStorage.setItem('staplesOnlineOrderPrint', newMode.toString());
    console.log(`Online order print mode ${newMode ? 'ENABLED' : 'DISABLED'}`);
    sendResponse({ onlineOrderPrint: newMode });
  } else if (request.message === 'downloadComplete') {
    // Notification from background that a download completed
    statusData.completed++;
    sendStatusUpdate();
    sendActivity('success', `Downloaded ${request.filename}`);
  } else if (request.message === 'downloadFailed') {
    // Notification from background that a download failed
    const failedItem = {
      ...request.data,
      retries: (request.data.retries || 0) + 1,
      lastError: request.error
    };

    if (failedItem.retries < MAX_RETRIES) {
      failedDownloads.push(failedItem);
      statusData.failed = failedDownloads.length;
      sendStatusUpdate();
      sendActivity('error', `Failed: ${request.data.transactionNumber} (retry ${failedItem.retries}/${MAX_RETRIES})`);
    } else {
      sendActivity('error', `Failed permanently: ${request.data.transactionNumber}`);
    }
  }
  return true; // Keep message channel open for async response
});

function stopProcessing() {
  console.log('Stopping all scheduled downloads...');
  isProcessing = false;
  statusData.isProcessing = false;

  // Clear all scheduled timeouts
  scheduledTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  scheduledTimeouts = [];

  // Clear navigation timeout
  if (navigationTimeout) {
    clearTimeout(navigationTimeout);
    navigationTimeout = null;
  }

  // Clear sessionStorage flags
  sessionStorage.removeItem('autoProcessNextPage');
  sessionStorage.removeItem('globalTransactionIndex');

  // Reset global index
  globalTransactionIndex = 0;

  // Request cancellation of active PDF captures in background
  chrome.runtime.sendMessage({ message: 'cancelActiveCapturesRequested' }, (response) => {
    if (response && response.cancelled > 0) {
      console.log(`Cancelled ${response.cancelled} active PDF captures`);
      sendActivity('info', `Cancelled ${response.cancelled} active downloads`);
    }
  });

  // Update icon back to normal
  chrome.runtime.sendMessage({ icon: 'active' });
  sendStatusUpdate();
  sendActivity('info', 'All downloads cancelled');

  console.log('All downloads cancelled');
}

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
let isProcessing = false;
let scheduledTimeouts = [];
let navigationTimeout = null;

function processOrders() {
  console.log('processOrders started');
  isProcessing = true;
  statusData.isProcessing = true;

  // Update icon to show processing state
  chrome.runtime.sendMessage({ icon: 'processing' });

  // Get pagination info
  const paginationElement = document.querySelector('div[aria-label*="Viewing"][aria-label*="of"]');
  if (paginationElement) {
    const paginationText = paginationElement.getAttribute('aria-label');
    const match = paginationText.match(/Viewing (\d+)-(\d+) of (\d+)/);
    if (match) {
      statusData.currentPage = `${match[1]}-${match[2]}`;
      statusData.total = parseInt(match[3]);
    }
  }

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
  console.log(`Starting from global transaction index: ${globalTransactionIndex}`);

  statusData.transactionsFound = instoreTransactions.length;
  sendStatusUpdate();
  sendActivity('info', `Found ${instoreTransactions.length} transactions on this page`);

  instoreTransactions.forEach((container, index) => {
    console.log(`Processing in-store transaction ${index}:`, container.id);
    const transactionData = extractInStoreTransactionData(container);
    if (transactionData) {
      console.log(`Extracted transaction data:`, transactionData);
      // Use local page index for delays (0, 5s, 10s per page)
      // But pass global index for tracking/logging
      openOrderDetailsPage(transactionData, index, globalTransactionIndex);
      globalTransactionIndex++;
      statusData.scheduled++;
      sendStatusUpdate();
    } else {
      console.warn(`Could not extract data from in-store transaction at index ${index}.`);
    }
  });

  // Check if there's a next page button
  const nextPageButton = document.querySelector('a[aria-label="Next page of results"]:not([aria-disabled="true"])');
  if (nextPageButton) {
    console.log('Found next page button, will navigate after current page transactions are scheduled');

    // Store flag in sessionStorage to auto-process next page
    sessionStorage.setItem('autoProcessNextPage', 'true');
    sessionStorage.setItem('globalTransactionIndex', globalTransactionIndex.toString());

    // Calculate how long we need to wait for all transactions on this page to be scheduled
    // Each transaction is scheduled with a 5-second delay, so we need to wait for the last one
    // Plus a small buffer to ensure the message is sent
    const lastTransactionDelay = (instoreTransactions.length - 1) * 5000;
    const delayBeforeNextPage = lastTransactionDelay + 3000; // Last transaction delay + 3 second buffer

    console.log(`Waiting ${delayBeforeNextPage}ms before navigating to next page`);

    navigationTimeout = setTimeout(() => {
      // Check if still processing before navigating
      if (!isProcessing) {
        console.log('Navigation cancelled - processing stopped');
        return;
      }
      console.log('All transactions scheduled, navigating to next page...');
      nextPageButton.click();
      // The new page will auto-process thanks to sessionStorage flag
    }, delayBeforeNextPage);
  } else {
    console.log('No more pages to process');
    isProcessing = false;
    globalTransactionIndex = 0; // Reset for next run
    sessionStorage.removeItem('autoProcessNextPage');
    sessionStorage.removeItem('globalTransactionIndex');

    // Update icon back to normal
    chrome.runtime.sendMessage({ icon: 'active' });
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

function openOrderDetailsPage(transactionData, pageIndex, globalIndex) {
  const { transactionNumber, transactionDate, detailsLink } = transactionData;

  // Construct the print page URL directly
  // Add print=true parameter to go straight to print view
  const printUrl = detailsLink.includes('?')
    ? `${detailsLink}&print=true&xsmall=false`
    : `${detailsLink}?print=true&xsmall=false`;

  // Use page index for delays (resets to 0 on each page)
  // This ensures delays are 0s, 5s, 10s, 15s... on EACH page
  const delay = pageIndex * 5000;

  console.log(`Scheduling capturePDF for ${transactionNumber} (global #${globalIndex}, page #${pageIndex}) with ${delay}ms delay`);
  console.log(`Print URL: ${printUrl}`);

  // Handle the delay on the content script side to avoid service worker timeouts
  const timeoutId = setTimeout(() => {
    // Check if still processing before sending
    if (!isProcessing) {
      console.log(`Skipping ${transactionNumber} - processing stopped`);
      return;
    }

    console.log(`Now sending capturePDF message for ${transactionNumber}`);

    // Get print with images setting
    const printWithImages = localStorage.getItem('staplesPrintWithImages') !== 'false';

    // Send message to background script to open the print page and capture PDF
    chrome.runtime.sendMessage({
      message: 'capturePDF',
      url: printUrl,
      transactionNumber: transactionNumber,
      transactionDate: transactionDate,
      printWithImages: printWithImages,
      delay: 0  // No delay in background, we already delayed here
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(`Error sending message for ${transactionNumber}:`, chrome.runtime.lastError);
      } else {
        console.log(`Message sent successfully for ${transactionNumber}`);
      }
    });
  }, delay);

  // Store timeout ID so we can cancel it later
  scheduledTimeouts.push(timeoutId);
}

function sendDownloadRequest(orderData, index) {
  const { orderNumber, orderDate, receiptLink } = orderData;

  // Check if user wants to print online orders instead of direct download
  const useOnlineOrderPrint = localStorage.getItem('staplesOnlineOrderPrint') === 'true';

  if (useOnlineOrderPrint) {
    // Treat online orders like in-store: navigate to print page
    const printUrl = receiptLink.includes('?')
      ? `${receiptLink}&print=true&xsmall=false`
      : `${receiptLink}?print=true&xsmall=false`;

    const printWithImages = localStorage.getItem('staplesPrintWithImages') !== 'false';

    chrome.runtime.sendMessage({
      message: 'capturePDF',
      url: printUrl,
      transactionNumber: orderNumber,
      transactionDate: orderDate,
      printWithImages,
      delay: index * 2000
    });
  } else {
    // Direct PDF download (original behavior)
    // Add -direct suffix to indicate this is a direct download
    const filename = `staples/${orderDate}-${orderNumber}-direct.pdf`;

    chrome.runtime.sendMessage({
      message: 'downloadReceipt',
      url: receiptLink,
      filename: filename,
      delay: index * 2000
    });
  }
}

function retryFailedDownloads() {
  console.log(`Retrying ${failedDownloads.length} failed downloads...`);
  sendActivity('info', `Retrying ${failedDownloads.length} failed downloads`);

  const toRetry = [...failedDownloads];
  failedDownloads = [];
  statusData.failed = 0;
  sendStatusUpdate();

  toRetry.forEach((item, index) => {
    const delay = index * 5000; // 5 second delay between retries

    setTimeout(() => {
      const printWithImages = localStorage.getItem('staplesPrintWithImages') !== 'false';

      chrome.runtime.sendMessage({
        message: 'capturePDF',
        url: item.url,
        transactionNumber: item.transactionNumber,
        transactionDate: item.transactionDate,
        printWithImages,
        retries: item.retries,
        delay: 0
      });
    }, delay);
  });
}

