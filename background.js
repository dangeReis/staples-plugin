// background.js
// This script handles the downloading of receipts and opening order details pages.

// Store transaction data for later use when printing
const transactionDataMap = new Map();

chrome.runtime.onMessage.addListener(function(message, sender) {
    if (message.icon === 'active') {
      // Only set icon if sender has a tab
      if (sender.tab && sender.tab.id) {
        chrome.action.setIcon({ path: 'icon_active.png', tabId: sender.tab.id }).catch(err => {
          console.log('Could not set icon (tab may be closed):', err.message);
        });
      }
    }
  });

  chrome.action.onClicked.addListener(async (tab) => {
    // Check if we're on a Staples order page
    if (!tab.url || (!tab.url.includes('/ptd/myorders') && !tab.url.includes('/ptd/orderdetails'))) {
      console.log('Not on a Staples order page, ignoring click');
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { message: 'iconClicked' });
    } catch (err) {
      console.log('Could not send iconClicked message (content script may not be loaded):', err.message);
      // Try to inject the content script manually
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        // Try sending the message again after injection
        await chrome.tabs.sendMessage(tab.id, { message: 'iconClicked' });
      } catch (injectErr) {
        console.error('Could not inject or communicate with content script:', injectErr.message);
      }
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);

    // Handle icon state message
    if (request.icon === 'active') {
      console.log('Setting icon to active for tab:', sender.tab.id);
      return; // Already handled in another listener
    }

    if (request.message === 'downloadReceipt') {
      const { url, filename, delay } = request;
      console.log(`Scheduling online receipt download: ${filename}, delay: ${delay}ms`);
      setTimeout(() => {
        chrome.downloads.download({
          url: url,
          filename: filename
        });
      }, delay);
    } else if (request.message === 'capturePDF') {
      const { url, transactionNumber, transactionDate } = request;
      console.log(`Received capturePDF request for ${transactionNumber}`);
      console.log(`Starting capturePDFFromUrl immediately for ${transactionNumber}`);

      // Start the PDF capture immediately - delay is handled in content script
      capturePDFFromUrl(url, transactionNumber, transactionDate);

      // Send response to keep the message channel open
      sendResponse({ status: 'started', transactionNumber });
      return true; // Keep message channel open for async response
    } else if (request.message) {
      console.log('Unknown message type:', request.message);
    }
  });

  async function capturePDFFromUrl(url, transactionNumber, transactionDate) {
    let tabId = null;
    try {
      console.log(`Starting PDF capture for ${transactionNumber} from ${url}`);

      // Create a new tab in the background
      const tab = await chrome.tabs.create({ url: url, active: false });
      tabId = tab.id;
      console.log(`Created tab ${tabId} for ${transactionNumber}`);

      // Wait for the page to fully load with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Page load timeout'));
        }, 30000); // 30 second timeout

        chrome.tabs.onUpdated.addListener(function listener(updatedTabId, info) {
          if (updatedTabId === tabId && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            clearTimeout(timeout);
            console.log(`Tab ${tabId} loaded completely`);
            // Give it extra time to render images and other content
            setTimeout(resolve, 5000); // Increased from 3s to 5s
          }
        });
      });

      // Enable "Print with images" toggle by injecting a script
      console.log(`Enabling 'Print with images' for tab ${tabId}`);
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            // Try multiple selectors and wait for the element
            const selectors = [
              'button[role="switch"][aria-checked="false"]',
              'button[role="switch"]',
              '.sc-98zsgj-1',
              'button.klsXa-d'
            ];

            let toggleButton = null;
            let selectorUsed = null;

            for (const selector of selectors) {
              toggleButton = document.querySelector(selector);
              if (toggleButton) {
                selectorUsed = selector;
                break;
              }
            }

            if (toggleButton) {
              const isChecked = toggleButton.getAttribute('aria-checked');
              console.log(`Found toggle with selector: ${selectorUsed}, aria-checked: ${isChecked}`);

              if (isChecked === 'false') {
                console.log('Clicking toggle to enable images');
                toggleButton.click();

                // Verify it was clicked
                setTimeout(() => {
                  const newState = toggleButton.getAttribute('aria-checked');
                  console.log(`Toggle state after click: ${newState}`);
                }, 100);

                return { success: true, clicked: true, selector: selectorUsed };
              } else {
                console.log('Toggle already enabled');
                return { success: true, clicked: false, alreadyEnabled: true };
              }
            } else {
              console.log('Toggle button not found with any selector');
              // Log what's actually on the page
              const printSection = document.querySelector('section[aria-labelledby="print-options-heading"]');
              return {
                success: false,
                error: 'Toggle not found',
                sectionFound: !!printSection,
                html: printSection ? printSection.innerHTML.substring(0, 500) : 'Section not found'
              };
            }
          }
        });

        console.log(`Toggle script result for tab ${tabId}:`, result[0].result);
      } catch (error) {
        console.error(`Error executing toggle script:`, error);
      }

      // Wait for toggle action to take effect and images to load
      console.log(`Waiting for images to load for tab ${tabId}`);
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log(`Attaching debugger to tab ${tabId}`);
      // Attach debugger to the tab
      await chrome.debugger.attach({ tabId }, '1.3');
      console.log(`Debugger attached to tab ${tabId}`);

      // Use the Page.printToPDF command
      console.log(`Generating PDF for tab ${tabId}`);
      const pdfData = await chrome.debugger.sendCommand(
        { tabId },
        'Page.printToPDF',
        {
          printBackground: true,
          preferCSSPageSize: false, // Use our custom page size
          displayHeaderFooter: false,
          marginTop: 0,
          marginBottom: 0,
          marginLeft: 0,
          marginRight: 0,
          paperWidth: 8.5,  // Letter size in inches
          paperHeight: 11,
          scale: 1.0,
          transferMode: 'ReturnAsBase64'  // Explicitly request base64
        }
      );
      console.log(`PDF generated for tab ${tabId}, size: ${pdfData.data.length} bytes`);

      // Detach debugger
      await chrome.debugger.detach({ tabId });
      console.log(`Debugger detached from tab ${tabId}`);

      // Download the PDF using data URL (blob URLs don't work in service workers)
      const filename = `staples/${transactionDate}-${transactionNumber}.pdf`;
      console.log(`Downloading ${filename}`);

      // Create a data URL from the base64 PDF data
      const dataUrl = `data:application/pdf;base64,${pdfData.data}`;

      await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      });

      // Close the tab
      await chrome.tabs.remove(tabId);
      console.log(`Successfully captured PDF: ${filename}`);

    } catch (error) {
      console.error(`Error capturing PDF for ${transactionNumber}:`, error);
      console.error('Error details:', error.message, error.stack);

      // Try to detach debugger if still attached
      if (tabId) {
        try {
          await chrome.debugger.detach({ tabId });
          console.log(`Debugger detached after error for tab ${tabId}`);
        } catch (e) {
          console.log(`Could not detach debugger for tab ${tabId}:`, e.message);
        }

        // Try to close the tab
        try {
          await chrome.tabs.remove(tabId);
          console.log(`Tab ${tabId} closed after error`);
        } catch (e) {
          console.log(`Could not close tab ${tabId}:`, e.message);
        }
      }
    }
  }
