import { ReceiptGeneratorInterface, ReceiptGenerationError } from '../../src/modules/receiptGenerator/interface.js';
import { createReceipt } from '../../src/primitives/Receipt.js';

export function createStubReceiptGenerator() {
  return {
    /**
     * @implements {ReceiptGeneratorInterface.generate}
     */
    async generate(order, options) {
      if (!order || order.id === 'invalid') {
        throw new ReceiptGenerationError('Invalid order in stub', { orderId: order ? order.id : 'null' });
      }
      return createReceipt({
        orderId: order.id,
        filename: `stub-receipt-${order.id}.pdf`,
        blob: new Blob(['stub PDF data for ' + order.id], { type: 'application/pdf' }),
        generatedAt: new Date(),
        method: options.method || 'print',
        includesImages: options.includesImages || false,
      });
    },
  };
}
