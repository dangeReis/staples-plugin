// content.js
// This script runs in the context of the Staples order history page and extracts order information.

chrome.runtime.sendMessage({ icon: 'active' }); // Notify background script of activity

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message === 'iconClicked') {
    processOrders();
  }
});

function processOrders() {
  console.log('processOrders started');
  const orderContainers = document.querySelectorAll('[id^="ph-order-container"]'); // Selects order containers

  orderContainers.forEach((container, index) => {
    const orderData = extractOrderData(container);
    if (orderData) {
      sendDownloadRequest(orderData, index);
    } else {
      console.warn(`Could not extract data from order at index ${index}.`);
    }
  });
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

