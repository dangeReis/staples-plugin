chrome.runtime.sendMessage({icon: 'active'});
// content.js
function functionToShowAlert() {
    console.log('functionToShowAlert called');

    // Select the containers for each order
    const orderContainers = document.querySelectorAll('[id^="ptd.ph.ordertile.container"]');

    orderContainers.forEach((container, index) => {
        // Select the element containing the order number within this container
        const orderNumberElement = container.querySelector('a[aria-label^="Order number"]');
        const orderNumber = orderNumberElement ? orderNumberElement.textContent : 'Order number not found';

        // Select the element containing the order date within this container
        const orderDateElement = container.querySelector('div[aria-label^="Order date"]');
        let orderDate = orderDateElement ? orderDateElement.textContent : 'Order date not found';

        if (orderDate !== 'Order date not found') {
            // Remove the "Order date" prefix
            orderDate = orderDate.replace('Order date', '');
        
            // Convert the date string into a Date object
            const dateParts = orderDate.split('/');
            // Convert two-digit year to four-digit year
            const year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
            const month = dateParts[0];
            const day = dateParts[1];
            const dateObject = new Date(Date.parse(`${month}/${day}/${year}`));
        
            // Format the date as YYYY-MM-DD
            orderDate = dateObject.toISOString().split('T')[0];
        }
        // Select the element containing the receipt link within this container
        const receiptLinkElement = container.querySelector('a[aria-label^="View receipt for order number"]');
        const receiptLink = receiptLinkElement ? receiptLinkElement.href : 'Receipt link not found';

        console.log(`Order Number: ${orderNumber}`);
        console.log(`Order Date: ${orderDate}`);
        console.log(`Receipt Link: ${receiptLink}`);

        // Send a message to the background script to download the receipt
        if (receiptLink !== 'Receipt link not found') {
            const filename = `staples/${orderDate}-${orderNumber}.pdf`;
            chrome.runtime.sendMessage({
                message: 'downloadReceipt',
                url: receiptLink,
                filename: filename,
                delay: index * 2000
            });
       
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'iconClicked') {
        functionToShowAlert();
    }
});