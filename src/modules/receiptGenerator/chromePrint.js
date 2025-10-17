import { ReceiptGenerationError } from './interface.js';
import { createReceipt } from '../../primitives/Receipt.js';

export function createChromePrintReceiptGenerator({ tabs, debugger: chromeDebugger, downloads }) {
  if (!tabs || !chromeDebugger || !downloads) {
    throw new Error('Full Chrome API adapter (tabs, debugger, downloads) is required');
  }

  return {
    /**
     * Generates a receipt for an order using Chrome's print-to-PDF functionality.
     * @param {import('../../primitives/Order.js').Order} order - The order to generate a receipt for.
     * @param {import('./interface.js').GenerateOptions} options - Generation options.
     * @returns {Promise<import('./interface.js').Receipt>} A promise that resolves to the generated receipt.
     * @throws {ReceiptGenerationError} If receipt generation fails.
     */
    async generate(order, options) {
      if (!order || !order.id || !order.detailsUrl) {
        throw new ReceiptGenerationError('Invalid order provided for receipt generation', { orderId: order?.id });
      }

      const { includeImages = true, method = 'print' } = options;

      let tabId;
      try {
        // 1. Create a new tab and navigate to the order details page
        const tab = await tabs.create({ url: order.detailsUrl, active: false });
        tabId = tab.id;

        // 2. Attach debugger to the tab
        await chromeDebugger.attach({ tabId }, '1.3');

        // 3. Send printToPDF command
        const pdf = await chromeDebugger.sendCommand({ tabId }, 'Page.printToPDF', {
          printBackground: includeImages,
        });

        // 4. Decode PDF data and create a Blob
        const pdfBlob = new Blob([Uint8Array.from(atob(pdf.data), c => c.charCodeAt(0))], { type: 'application/pdf' });

        // 5. Simulate download (or directly return blob)
        // For this implementation, we'll just return the blob in the Receipt object.
        // A real download would involve chrome.downloads.download.

        return createReceipt({
          orderId: order.id,
          filename: `staples-receipt-${order.id}.pdf`,
          blob: pdfBlob,
          generatedAt: new Date(),
          method: method,
          includesImages: includeImages,
        });

      } catch (error) {
        throw new ReceiptGenerationError('Failed to generate receipt using Chrome print API', {
          orderId: order.id,
          method: method,
          cause: error,
        });
      } finally {
        // 6. Detach debugger and remove the tab
        if (tabId) {
          try {
            await chromeDebugger.detach({ tabId });
            await tabs.remove(tabId);
          } catch (cleanupError) {
            console.error('Error during receipt generation cleanup:', cleanupError);
          }
        }
      }
    },
  };
}
