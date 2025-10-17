import { ReceiptGenerationError } from './interface.js';

export function createChromePrintReceiptGenerator(chromeApi) {
  if (!chromeApi || !chromeApi.tabs || !chromeApi.debugger || !chromeApi.downloads) {
    throw new Error('Full Chrome API adapter (tabs, debugger, downloads) is required');
  }

  return {
    async generate(order, options) {
      if (!order || !order.id) {
        throw new ReceiptGenerationError('Invalid order', { orderId: null, method: 'print' });
      }

      try {
        // Simulate Chrome API calls
        await chromeApi.debugger.attach({ tabId: 123 }, '1.2');
        await chromeApi.debugger.sendCommand({ tabId: 123 }, 'Page.printToPDF');
        await chromeApi.downloads.download({ url: 'data:application/pdf;base64,...', filename: 'test.pdf' });

        // Mock implementation
        return {
          orderId: order.id,
          filename: `staples/${order.id}.pdf`,
          blob: new Blob(['pdf-data'], { type: 'application/pdf' }),
          generatedAt: new Date(),
          method: 'print',
          includesImages: options.includeImages,
        };
      } catch (error) {
        throw new ReceiptGenerationError('Failed to generate receipt due to API error', {
          orderId: order.id,
          method: 'print',
          cause: error,
        });
      }
    }
  };
}
