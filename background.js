chrome.runtime.onMessage.addListener(function(message, sender) {
    if (message.icon === 'active') {
      chrome.action.setIcon({path: 'icon_active.png', tabId: sender.tab.id});
    }
  });
  
  var functionToShowAlert = function() {
    console.log('functionToShowAlert called');
    let receiptButton = document.querySelector('div a[aria-label^="View receipt for order number"]');
    if (receiptButton) {
        let orderInfo = receiptButton.parentElement.textContent;
        let orderNumberMatch = orderInfo.match(/Order #(\d+)/);
        let orderDateMatch = orderInfo.match(/Order date(\d{2}\/\d{2}\/\d{2})/);
        if (orderNumberMatch && orderDateMatch) {
            let orderNumber = orderNumberMatch[1];
            let orderDate = new Date(orderDateMatch[1]);
            let formattedDate = orderDate.getFullYear() + '-' + (orderDate.getMonth() + 1).toString().padStart(2, '0') + '-' + orderDate.getDate().toString().padStart(2, '0');
            let link = receiptButton.getAttribute('href');
            fetch(link).then(resp => resp.blob()).then(blob => {
                let url = window.URL.createObjectURL(blob);
                // rest of your code...
            }).catch(() => alert('Failed to download receipt!'));
        } else {
            alert("Failed to extract order number or date!");
        }
    } else {
        alert("Receipt button not found!");
    }
}
// background.js
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, {message: 'iconClicked'});
});

// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'downloadReceipt') {
      // Delay the download by the specified amount of time
      setTimeout(() => {
          chrome.downloads.download({
              url: request.url,
              filename: request.filename,
              // saveAs: true
          });
      }, request.delay);
  }
});