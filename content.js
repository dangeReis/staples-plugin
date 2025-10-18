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

// Strategy 4: Listen for hashchange (some SPAs use this)
window.addEventListener('hashchange', () => {
  console.log('*** HASHCHANGE EVENT ***', location.href);
  handleUrlChange(location.href);
});

// Strategy 5: Watch for specific DOM elements that indicate page type change
const pageTypeObserver = new MutationObserver(() => {
  const currentUrl = location.href;

  // Check if we have in-store transaction elements
  const hasInstoreTransactions = document.querySelector('[id^="ph-order-ordernumber-POS"]');
  // Check if we have online order elements
  const hasOnlineOrders = document.querySelector('[id^="ph-order-container"]');

  // Determine expected URL based on DOM content
  let expectedUrlPattern = null;
  if (hasInstoreTransactions && !hasOnlineOrders) {
    expectedUrlPattern = '/ptd/myorders/instore';
  } else if (hasOnlineOrders && !hasInstoreTransactions) {
    expectedUrlPattern = '/ptd/myorders';
  }

  if (expectedUrlPattern) {
    const urlMatches = currentUrl.includes(expectedUrlPattern);

    if (!urlMatches) {
      console.log('*** DOM-BASED PAGE TYPE MISMATCH DETECTED ***');
      console.log('Expected URL pattern:', expectedUrlPattern);
      console.log('Current URL:', currentUrl);
      console.log('Has in-store transactions:', !!hasInstoreTransactions);
      console.log('Has online orders:', !!hasOnlineOrders);
      console.log('Forcing handleUrlChange...');

      // Force a URL change check
      handleUrlChange(currentUrl);
    }

    // Also force update if URL changed but lastUrl wasn't updated
    if (currentUrl !== lastUrl) {
      console.log('*** PAGE TYPE OBSERVER DETECTED URL MISMATCH ***');
      console.log('lastUrl:', lastUrl);
      console.log('currentUrl:', currentUrl);
      lastUrl = currentUrl;
      handleUrlChange(currentUrl);
    }
  }
});

// Observe the main content area for order elements
const mainContent = document.querySelector('main') || document.body;
pageTypeObserver.observe(mainContent, {
  subtree: true,
  childList: true,
  attributes: false
});

console.log('All URL detection strategies initialized (including hashchange and DOM-based)');

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

// Track whether we've already warned about runtime availability
let chromeRuntimeWarningIssued = false;

function handleUrlChange(currentUrl) {
  console.log('=== HANDLING URL CHANGE ===');
  console.log('URL:', currentUrl);
  console.log('Is in-store orders:', currentUrl.includes('/ptd/myorders/instore'));
  console.log('Is online orders:', currentUrl.includes('/ptd/myorders') && !currentUrl.includes('/ptd/myorders/instore'));
  const isOrderPage = currentUrl.includes('/ptd/myorders') || currentUrl.includes('/ptd/orderdetails');

  // Use a small delay to ensure the page context is ready
  setTimeout(() => {
    console.log('Checking chrome.runtime...');
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      if (chromeRuntimeWarningIssued) {
        console.log('Chrome runtime is now available.');
        chromeRuntimeWarningIssued = false;
      }

      console.log('Chrome runtime is valid');

      // Check if we're on an order page
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
    } else if (!chromeRuntimeWarningIssued) {
      console.warn('Chrome runtime not available; extension may be reloading or disabled on this page.');
      chromeRuntimeWarningIssued = true;
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
    } else if (!chromeRuntimeWarningIssued) {
      console.warn('Chrome runtime not available during initialization; icon state may be stale.');
      chromeRuntimeWarningIssued = true;
    }
  }
}

// Status tracking for popup
function createInitialStatusData() {
  return {
    isProcessing: false,
    currentPage: '-',
    transactionsFound: 0,
    scheduled: 0,
    completed: 0,
    failed: 0,
    total: 0
  };
}

let statusData = createInitialStatusData();

// Failed downloads tracking
let failedDownloads = [];
const MAX_RETRIES = 3;
const ONLINE_ORDER_DELAY_MS = 1500; // 1.5s spacing between online order downloads

function resetStatusCounters(options = {}) {
  const { keepProcessingState = false, silent = false } = options;
  const processingState = keepProcessingState && statusData.isProcessing;

  statusData = {
    ...createInitialStatusData(),
    isProcessing: processingState
  };

  failedDownloads = [];

  if (!silent) {
    sendActivity('info', 'Progress counters reset');
  }

  sendStatusUpdate();
}

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
  } else if (request.message === 'processFromJSON') {
    // Process orders from JSON files that were already downloaded
    processOrdersFromJSON();
    sendResponse({ action: 'processing_json' });
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
  } else if (request.message === 'fetchOrderDetails') {
    fetchOrderDetails();
    sendResponse({ action: 'fetching' });
  } else if (request.message === 'resetProgress') {
    resetStatusCounters();
    isProcessing = false;

    // Clear any pending timeouts/navigation from previous runs
    scheduledTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    scheduledTimeouts = [];

    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
      navigationTimeout = null;
    }

    sessionStorage.removeItem('autoProcessNextPage');
    sessionStorage.removeItem('globalTransactionIndex');
    globalTransactionIndex = 0;
    orderMetadataByNumber.clear();

    // Ensure icon reflects idle state
    chrome.runtime.sendMessage({ icon: 'active' });

    sendResponse({ action: 'reset' });
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
  } else if (request.message === 'toggleAutoExportJson') {
    const currentMode = localStorage.getItem('staplesAutoExportJson') !== 'false';
    const newMode = !currentMode;
    localStorage.setItem('staplesAutoExportJson', newMode.toString());
    console.log(`Auto-export JSON ${newMode ? 'ENABLED' : 'DISABLED'}`);
    sendResponse({ autoExportJson: newMode });
  } else if (request.message === 'downloadComplete') {
    // Notification from background that a download completed
    statusData.completed++;
    sendStatusUpdate();
    sendActivity('success', `Downloaded ${request.filename}`);
    checkForProcessingCompletion('download-complete');
  } else if (request.message === 'downloadFailed') {
    const { data = {}, error } = request;

    if (data.mode === 'direct') {
      const fallbackMeta =
        orderMetadataByNumber.get(data.transactionNumber) || {
          orderNumber: data.transactionNumber,
          orderDate: data.transactionDate,
          receiptLink: data.url || null,
          detailsLink: data.detailsLink || null,
          customerNumber: data.customerNumber || customerNumberMap.get(data.transactionNumber)
        };
      triggerPrintFallback(fallbackMeta, `direct-download-failed:${error || 'unknown'}`);
      return;
    }

    // Notification from background that a download failed (non-direct)
    const failedItem = {
      ...data,
      retries: (data.retries || 0) + 1,
      lastError: error
    };

    if (failedItem.retries < MAX_RETRIES) {
      failedDownloads.push(failedItem);
      statusData.failed = failedDownloads.length;
      sendStatusUpdate();
      sendActivity('error', `Failed: ${data.transactionNumber} (retry ${failedItem.retries}/${MAX_RETRIES})`);
    } else {
      statusData.failed += 1;
      sendStatusUpdate();
      sendActivity('error', `Failed permanently: ${data.transactionNumber}`);
    }
    checkForProcessingCompletion('download-failed');
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

  if (completionTimeout) {
    clearTimeout(completionTimeout);
    completionTimeout = null;
  }

  // Clear sessionStorage flags
  sessionStorage.removeItem('autoProcessNextPage');
  sessionStorage.removeItem('globalTransactionIndex');

  // Reset global index
  globalTransactionIndex = 0;
  orderMetadataByNumber.clear();

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
let completionTimeout = null;
const orderMetadataByNumber = new Map();

function removeScheduledTimeout(timeoutId) {
  scheduledTimeouts = scheduledTimeouts.filter(id => id !== timeoutId);
}

// Store customer numbers mapped by order/transaction number
const customerNumberMap = new Map();

async function processOrders() {
  console.log('processOrders started');
  const isNewRun = !isProcessing;
  const isInStorePage = window.location.href.includes('/ptd/myorders/instore');

  if (isNewRun) {
    resetStatusCounters({ silent: true });
    globalTransactionIndex = 0;
    customerNumberMap.clear();
    orderMetadataByNumber.clear();
    scheduledTimeouts = [];
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
      navigationTimeout = null;
    }
  }

  isProcessing = true;
  statusData.isProcessing = true;

  if (completionTimeout) {
    clearTimeout(completionTimeout);
    completionTimeout = null;
  }

  // Update icon to show processing state
  chrome.runtime.sendMessage({ icon: 'processing' });

  // Get pagination info
  const paginationElement = document.querySelector('div[aria-label*="Viewing"][aria-label*="of"]');
  let currentPageNum = 1;
  if (paginationElement) {
    const paginationText = paginationElement.getAttribute('aria-label');
    const match = paginationText.match(/Viewing (\d+)-(\d+) of (\d+)/);
    if (match) {
      statusData.currentPage = `${match[1]}-${match[2]}`;
      statusData.total = parseInt(match[3]);
      // Calculate current page number (e.g., 1-25 = page 1, 26-50 = page 2)
      const startItem = parseInt(match[1]);
      currentPageNum = Math.ceil(startItem / 25);
    }
  }

  // Fetch API data for the current page (also saves JSON if enabled)
  const autoExportJson = localStorage.getItem('staplesAutoExportJson') !== 'false'; // Default true
  const apiOrderDetails = await fetchCurrentPageOrderDetails(currentPageNum, { saveJson: autoExportJson });
  const onlineOrdersFromApi = !isInStorePage ? normalizeOnlineOrdersFromApi(apiOrderDetails) : [];

  // Process online orders
  const onlineOrderContainers = document.querySelectorAll('[id^="ph-order-container"]');
  let onlineOrders = [];

  if (onlineOrdersFromApi.length > 0) {
    console.log(`Using API data for ${onlineOrdersFromApi.length} online orders on this page`);
    if (onlineOrdersFromApi.length !== onlineOrderContainers.length) {
      console.log(`API/DOM online order count mismatch (API: ${onlineOrdersFromApi.length}, DOM: ${onlineOrderContainers.length})`);
    }
    onlineOrders = onlineOrdersFromApi;
  } else {
    console.log(`API returned no online orders; falling back to DOM extraction (${onlineOrderContainers.length} containers).`);
    onlineOrderContainers.forEach((container, index) => {
      console.log(`Processing online order ${index}:`, container.id);
      const orderData = extractOrderData(container);
      if (orderData) {
        console.log('Extracted online order data:', orderData);
        onlineOrders.push(orderData);
      } else {
        console.error(`Could not extract data from online order at index ${index}.`);
        // Debug: Log what we found for each field
        const orderNumberElement = container.querySelector('a[aria-label^="Order number"]');
        const orderDateElement = container.querySelector('div[aria-label^="Order date"]');
        const receiptLinkElement = container.querySelector('a[aria-label^="View receipt for order number"]');
        console.error('Debug extraction:', {
          containerId: container.id,
          orderNumber: orderNumberElement ? orderNumberElement.textContent : 'NOT FOUND',
          orderDate: orderDateElement ? orderDateElement.textContent : 'NOT FOUND',
          receiptLink: receiptLinkElement ? receiptLinkElement.href : 'NOT FOUND',
          containerHTML: container.innerHTML.substring(0, 500) // First 500 chars
        });
      }
    });
  }

  const onlineSourceLabel = onlineOrdersFromApi.length > 0 ? 'API' : 'DOM';
  console.log(`Scheduling ${onlineOrders.length} online orders from ${onlineSourceLabel} data`);
  onlineOrders.forEach((orderData, index) => {
    sendDownloadRequest(orderData, index, onlineOrders.length);
    statusData.scheduled++;
    sendStatusUpdate();
  });

  // Process in-store transactions on current page
  const instoreTransactions = document.querySelectorAll('[id^="ph-order-ordernumber-POS"]');
  console.log(`Found ${instoreTransactions.length} in-store transactions on this page`);
  console.log(`Starting from global transaction index: ${globalTransactionIndex}`);

  const totalTransactions = instoreTransactions.length + onlineOrders.length;
  statusData.transactionsFound = totalTransactions;
  sendStatusUpdate();
  sendActivity('info', `Found ${totalTransactions} transactions on this page (${onlineOrders.length} online, ${instoreTransactions.length} in-store)`);

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
    const lastInstoreDelay = instoreTransactions.length > 0 ? (instoreTransactions.length - 1) * 5000 : 0;
    const lastOnlineDelay = onlineOrders.length > 0 ? (onlineOrders.length - 1) * ONLINE_ORDER_DELAY_MS : 0;
    const delayBeforeNextPage = Math.max(lastInstoreDelay, lastOnlineDelay) + 3000; // Buffer after the longest queue

    console.log(`Waiting ${delayBeforeNextPage}ms before navigating to next page (instore delay ${lastInstoreDelay}ms, online delay ${lastOnlineDelay}ms)`);

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
    console.log('No more pages to process - this is the last page');

    // Calculate total time needed for all orders on this final page
    // Consider both in-store transactions (5s delay each) and online orders (configured delay each)
    const lastInstoreDelay = instoreTransactions.length > 0 ? (instoreTransactions.length - 1) * 5000 : 0;
    const lastOnlineDelay = onlineOrders.length > 0 ? (onlineOrders.length - 1) * ONLINE_ORDER_DELAY_MS : 0;
    const maxDelay = Math.max(lastInstoreDelay, lastOnlineDelay);
    const totalProcessingTime = maxDelay + 10000; // Add extra buffer for PDF capture/downloads

    const totalOrders = instoreTransactions.length + onlineOrders.length;
    console.log(`Final page: waiting ${totalProcessingTime}ms for all ${totalOrders} orders to complete`);
    console.log(`  - In-store: ${instoreTransactions.length} (last at ${lastInstoreDelay}ms)`);
    console.log(`  - Online: ${onlineOrders.length} (last at ${lastOnlineDelay}ms)`);

    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
      navigationTimeout = null;
    }

    // Schedule a generous fallback completion in case some download callbacks never fire
    const fallbackDelay = totalProcessingTime + 60000; // Add an extra minute of buffer
    if (completionTimeout) {
      clearTimeout(completionTimeout);
    }
    completionTimeout = setTimeout(() => {
      console.warn(`Final page fallback reached after ${fallbackDelay}ms; forcing completion.`);
      finalizeProcessing('final-page-timeout');
    }, fallbackDelay);

    checkForProcessingCompletion('final-page');
  }
}


function extractOrderData(orderContainer) {
  try {
    const orderNumber = extractOrderNumber(orderContainer);
    const orderDate = extractOrderDate(orderContainer);
    const receiptLink = extractReceiptLink(orderContainer);
    const detailsLink = extractOrderDetailsLink(orderContainer);

    if (!orderNumber || !orderDate || !receiptLink) {
      return null; // Return null if any data is missing
    }

    return { orderNumber, orderDate, receiptLink, detailsLink };
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

function extractOrderDetailsLink(orderContainer) {
  const detailsLinkElement = orderContainer.querySelector('a[href*="orderdetails"]');
  return detailsLinkElement ? detailsLinkElement.href : null;
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

async function fetchCurrentPageOrderDetails(pageNumber, options = {}) {
  const { saveJson = true } = options;
  console.log(`Fetching order details for page ${pageNumber} from API...`);

  // Determine if we're on in-store or online orders page
  const isInStore = window.location.href.includes('/ptd/myorders/instore');
  console.log(`Page type: ${isInStore ? 'In-Store' : 'Online'} orders`);

  try {
    const requestBody = isInStore ? {
      request: {
        criteria: {
          sortBy: '',
          pageNumber: pageNumber,
          pageSize: 25
        },
        isRetailUS: true,
        approvalOrdersOnly: false,
        includeDeclinedOrders: false,
        standAloneMode: false,
        testOrdersOnly: false,
        origin: '',
        viewAllOrders: false,
        isOrderManagementDisabled: false,
        is3PP: false
      }
    } : {
      request: {
        criteria: {
          sortBy: 'orderdate',
          sortOrder: 'asc',
          pageNumber: pageNumber,
          esdOrdersOnly: false,
          autoRestockOrdersOnly: false,
          filterForOrdersWithBreakroomItems: false,
          pageSize: 25
        },
        isRetailUS: false,
        approvalOrdersOnly: false,
        includeDeclinedOrders: false,
        standAloneMode: false,
        testOrdersOnly: false,
        origin: '',
        viewAllOrders: false,
        isOrderManagementDisabled: false,
        is3PP: false
      }
    };

    const response = await fetch('https://www.staples.com/sdc/ptd/api/mmxPTD/mmxSearchOrder', {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json;charset=UTF-8'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`Failed to fetch page ${pageNumber}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (data.orderDetailsList && data.orderDetailsList.length > 0) {
      console.log(`Fetched ${data.orderDetailsList.length} ${isInStore ? 'in-store' : 'online'} orders from page ${pageNumber}`);

      // Store customer numbers for each order
      data.orderDetailsList.forEach(order => {
        const customerNumber = order.customerNumber;
        const orderNumber = order.orderNumber;
        if (customerNumber && orderNumber) {
          customerNumberMap.set(orderNumber, customerNumber);
          console.log(`Stored customer number ${customerNumber} for order ${orderNumber}`);
        }
      });

      if (saveJson) {
        // Save to a JSON file
        const orderType = isInStore ? 'instore' : 'online';
        const jsonData = JSON.stringify({
          page: pageNumber,
          orderType: orderType,
          orders: data.orderDetailsList,
          totalResults: data.totalResults,
          fetchedAt: new Date().toISOString()
        }, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const filename = `staples/orders-${orderType}-page-${pageNumber}.json`;

        // Download the JSON file
        chrome.runtime.sendMessage({
          message: 'downloadJSON',
          url: url,
          filename: filename
        });

        sendActivity('success', `Saved ${orderType} page ${pageNumber} (${data.orderDetailsList.length} orders)`);
      } else {
        console.log('Auto-export disabled; skipping JSON download for this page.');
      }

      return data.orderDetailsList;
    }

    return [];
  } catch (error) {
    console.error(`Error fetching order details for page ${pageNumber}:`, error);
    return [];
  }
}

function normalizeOnlineOrdersFromApi(orderDetailsList = []) {
  return orderDetailsList.map(order => {
    const key = order.keyForOrderDetails;
    const receiptLink = key ? `https://www.staples.com/ptd/Transactions?tp_sid=${encodeURIComponent(key)}` : null;
    const detailsLink = key ? `https://www.staples.com/ptd/orderdetails?orderType=online_online&tp_sid=${encodeURIComponent(key)}` : null;
    const orderDate = order.orderDate ? formatDate(new Date(order.orderDate)) : null;

    return {
      orderNumber: order.orderNumber || null,
      orderDate,
      receiptLink,
      detailsLink,
      customerNumber: order.customerNumber || null
    };
  }).filter(order => order.orderNumber && order.orderDate && order.receiptLink);
}

async function fetchOrderDetails() {
  console.log('Fetching ALL order details from API...');

  // Determine if we're on in-store or online orders page
  const isInStore = window.location.href.includes('/ptd/myorders/instore');
  const orderType = isInStore ? 'instore' : 'online';
  console.log(`Fetching all ${orderType} orders...`);

  try {
    // Get pagination info to fetch all orders
    const paginationElement = document.querySelector('div[aria-label*="Viewing"][aria-label*="of"]');
    let totalPages = 1;

    if (paginationElement) {
      const paginationText = paginationElement.getAttribute('aria-label');
      const match = paginationText.match(/Viewing (\d+)-(\d+) of (\d+)/);
      if (match) {
        const totalOrders = parseInt(match[3]);
        const pageSize = 25; // Default page size from the API
        totalPages = Math.ceil(totalOrders / pageSize);
      }
    }

    console.log(`Fetching ${totalPages} page(s) of ${orderType} orders...`);

    const allOrders = [];

    // Fetch all pages
    for (let page = 1; page <= totalPages; page++) {
      console.log(`Fetching page ${page}/${totalPages}...`);

      const requestBody = isInStore ? {
        request: {
          criteria: {
            sortBy: '',
            pageNumber: page,
            pageSize: 25
          },
          isRetailUS: true,
          approvalOrdersOnly: false,
          includeDeclinedOrders: false,
          standAloneMode: false,
          testOrdersOnly: false,
          origin: '',
          viewAllOrders: false,
          isOrderManagementDisabled: false,
          is3PP: false
        }
      } : {
        request: {
          criteria: {
            sortBy: 'orderdate',
            sortOrder: 'asc',
            pageNumber: page,
            esdOrdersOnly: false,
            autoRestockOrdersOnly: false,
            filterForOrdersWithBreakroomItems: false,
            pageSize: 25
          },
          isRetailUS: false,
          approvalOrdersOnly: false,
          includeDeclinedOrders: false,
          standAloneMode: false,
          testOrdersOnly: false,
          origin: '',
          viewAllOrders: false,
          isOrderManagementDisabled: false,
          is3PP: false
        }
      };

      const response = await fetch('https://www.staples.com/sdc/ptd/api/mmxPTD/mmxSearchOrder', {
        method: 'POST',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json;charset=UTF-8'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.error(`Failed to fetch page ${page}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (data.orderDetailsList && data.orderDetailsList.length > 0) {
        allOrders.push(...data.orderDetailsList);
        console.log(`Fetched ${data.orderDetailsList.length} orders from page ${page}`);
      }
    }

    console.log(`Total ${orderType} orders fetched: ${allOrders.length}`);

    // Save to a JSON file
    const jsonData = JSON.stringify({
      orderType: orderType,
      orders: allOrders,
      totalResults: allOrders.length,
      fetchedAt: new Date().toISOString()
    }, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = `staples/orders-all-${orderType}-${new Date().toISOString().split('T')[0]}.json`;

    // Download the JSON file
    chrome.runtime.sendMessage({
      message: 'downloadJSON',
      url: url,
      filename: filename
    });

    sendActivity('success', `Saved ${allOrders.length} ${orderType} orders to file`);

    return allOrders;
  } catch (error) {
    console.error('Error fetching order details:', error);
    sendActivity('error', `Failed to fetch order details: ${error.message}`);
    return [];
  }
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
    removeScheduledTimeout(timeoutId);

    // Check if still processing before sending
    if (!isProcessing) {
      console.log(`Skipping ${transactionNumber} - processing stopped`);
      return;
    }

    console.log(`Now sending capturePDF message for ${transactionNumber}`);

    // Get print with images setting
    const printWithImages = localStorage.getItem('staplesPrintWithImages') !== 'false';

    // Get customer number from map (may be undefined if not found)
    const customerNumber = customerNumberMap.get(transactionNumber);

    // Send message to background script to open the print page and capture PDF
    chrome.runtime.sendMessage({
      message: 'capturePDF',
      url: printUrl,
      transactionNumber: transactionNumber,
      transactionDate: transactionDate,
      customerNumber: customerNumber,
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
  checkForProcessingCompletion(`scheduled-inst-${transactionNumber}`);
}

function sendDownloadRequest(orderData, index, totalOnlineCount) {
  const { orderNumber, orderDate, receiptLink, detailsLink, customerNumber: directCustomerNumber } = orderData;

  if (!receiptLink) {
    console.warn(`Skipping online order ${orderNumber || index} - missing receipt link`);
    return;
  }

  // Apply spacing between online orders to balance speed and rate limits
  const delay = index * ONLINE_ORDER_DELAY_MS;

  console.log(`Scheduling online order ${orderNumber} (index ${index + 1}/${totalOnlineCount}) with ${delay}ms delay`);

  // Check if user wants to print online orders instead of direct download
  const useOnlineOrderPrint = localStorage.getItem('staplesOnlineOrderPrint') === 'true';

  // Schedule the download with proper delay
  const timeoutId = setTimeout(() => {
    removeScheduledTimeout(timeoutId);

    if (!isProcessing) {
      console.log(`Skipping online order ${orderNumber} - processing stopped`);
      return;
    }

    console.log(`Now processing online order ${orderNumber}`);

    // Get customer number from map (may be undefined if not found)
    const customerNumber = directCustomerNumber || customerNumberMap.get(orderNumber);
    const orderMeta = {
      orderNumber,
      orderDate,
      receiptLink,
      detailsLink,
      customerNumber
    };
    orderMetadataByNumber.set(orderNumber, orderMeta);

    if (useOnlineOrderPrint) {
      dispatchPrintCapture(orderMeta, 'print');
    } else {
      // Direct PDF download (original behavior)
      // Format: customerNumber-date-orderNumber-direct.pdf
      const customerPrefix = customerNumber ? `${customerNumber}-` : '';
      const filename = `staples/${customerPrefix}${orderDate}-${orderNumber}-direct.pdf`;

      chrome.runtime.sendMessage({
        message: 'downloadReceipt',
        url: receiptLink,
        filename: filename,
        customerNumber,
        orderNumber,
        orderDate,
        mode: 'direct',
        delay: 0 // Delay already handled here
      });
    }
  }, delay);

  // Store timeout ID so we can cancel it later
  scheduledTimeouts.push(timeoutId);
  checkForProcessingCompletion(`scheduled-online-${orderNumber}`);
}

function dispatchPrintCapture(orderMeta, mode = 'print') {
  const { orderNumber, orderDate, receiptLink, detailsLink, customerNumber } = orderMeta;
  const baseLink = detailsLink || receiptLink;
  if (!baseLink) {
    console.warn(`Cannot capture print for ${orderNumber} - missing details link`);
    return;
  }

  const printUrl = baseLink.includes('?')
    ? `${baseLink}&print=true&xsmall=false`
    : `${baseLink}?print=true&xsmall=false`;

  const printWithImages = localStorage.getItem('staplesPrintWithImages') !== 'false';

  chrome.runtime.sendMessage({
    message: 'capturePDF',
    url: printUrl,
    transactionNumber: orderNumber,
    transactionDate: orderDate,
    customerNumber,
    printWithImages,
    mode,
    delay: 0
  });
}

function triggerPrintFallback(orderMeta, reason = 'direct-download-failed') {
  if (!orderMeta) {
    console.warn(`No metadata available for fallback (${reason})`);
    return;
  }

  orderMetadataByNumber.set(orderMeta.orderNumber, orderMeta);

  if (!isProcessing) {
    console.log(`Skipping fallback for ${orderMeta.orderNumber} - processing stopped`);
    return;
  }

  console.log(`Falling back to print capture for ${orderMeta.orderNumber} (${reason})`);
  sendActivity('info', `Retrying ${orderMeta.orderNumber} via print capture (${reason})`);
  dispatchPrintCapture(orderMeta, 'print-fallback');
  checkForProcessingCompletion(`fallback-dispatch-${orderMeta.orderNumber}`);
}

function checkForProcessingCompletion(context = 'unknown') {
  if (!isProcessing) {
    return;
  }

  const totalScheduled = statusData.scheduled;
  const expectedTotal = statusData.total || totalScheduled;
  const completedCount = statusData.completed;
  const failedCount = statusData.failed;
  const pendingTimeouts = scheduledTimeouts.length;
  const pendingRetries = failedDownloads.length;

  if (expectedTotal === 0) {
    return;
  }

  if (completedCount + failedCount < expectedTotal) {
    return;
  }

  if (totalScheduled < expectedTotal) {
    return;
  }

  if (pendingTimeouts > 0) {
    return;
  }

  if (pendingRetries > 0) {
    return;
  }

  finalizeProcessing(`completion-check:${context}`);
}

function finalizeProcessing(reason = 'completed') {
  if (!isProcessing) {
    return;
  }

  console.log(`Finalizing processing (${reason})`);
  isProcessing = false;
  statusData.isProcessing = false;
  globalTransactionIndex = 0;

  sessionStorage.removeItem('autoProcessNextPage');
  sessionStorage.removeItem('globalTransactionIndex');
  customerNumberMap.clear();
  orderMetadataByNumber.clear();

  scheduledTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  scheduledTimeouts = [];

  if (navigationTimeout) {
    clearTimeout(navigationTimeout);
    navigationTimeout = null;
  }

  if (completionTimeout) {
    clearTimeout(completionTimeout);
    completionTimeout = null;
  }

  chrome.runtime.sendMessage({ icon: 'active' });
  sendActivity('success', 'All pages processed - downloads complete');
  sendStatusUpdate();
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
        customerNumber: item.customerNumber,
        printWithImages,
        mode: 'print-retry',
        retries: item.retries,
        delay: 0
      });
    }, delay);
  });
}
