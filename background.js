// background.js
// This script handles the downloading of receipts.

chrome.runtime.onMessage.addListener(function(message, sender) {
    if (message.icon === 'active') {
      chrome.action.setIcon({ path: 'icon_active.png', tabId: sender.tab.id });
    }
  });
  
  chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, { message: 'iconClicked' });
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'downloadReceipt') {
      const { url, filename, delay } = request;
      setTimeout(() => {
        chrome.downloads.download({
          url: url,
          filename: filename
        });
      }, delay);
    }
  });
  