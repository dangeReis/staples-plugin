import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { createChromePrintReceiptGenerator } from '../../src/modules/receiptGenerator/chromePrint.js';
import { createStubReceiptGenerator } from '../stubs/receiptGenerator.stub.js';
import { createOrder } from '../../src/primitives/Order.js';

describe('ReceiptGenerator Swap Integration Test', () => {
  let realReceiptGenerator;
  let stubReceiptGenerator;
  let testOrder;

  // Mock dependencies for the real generator
  const mockChromeApi = {
    tabs: { create: jest.fn().mockResolvedValue({ id: 1 }), remove: jest.fn(), onUpdated: { addListener: jest.fn(), removeListener: jest.fn() } },
    debugger: { attach: jest.fn(), detach: jest.fn(), sendCommand: jest.fn(), onEvent: { addListener: jest.fn(), removeListener: jest.fn() } },
    downloads: { download: jest.fn() },
  };

  beforeEach(() => {
    // Reset mocks for each test
    jest.clearAllMocks();
    mockChromeApi.tabs.create.mockResolvedValue({ id: 1 }); // Set mock after clearing
    mockChromeApi.debugger.sendCommand.mockResolvedValue({ data: 'SGVsbG8gV29ybGQh' });
    mockChromeApi.downloads.download.mockResolvedValue(1);

    realReceiptGenerator = createChromePrintReceiptGenerator(mockChromeApi);
    stubReceiptGenerator = createStubReceiptGenerator();
    testOrder = createOrder({ id: 'test-order-1', date: '2025-10-17', type: 'online', detailsUrl: 'https://www.staples.com/test/order/1' });
  });

  test('should be able to swap ReceiptGenerator implementations', async () => {
    // Test with real implementation
    const realReceipt = await realReceiptGenerator.generate(testOrder, { includeImages: true });
    expect(realReceipt).toBeDefined();
    expect(realReceipt.orderId).toBe(testOrder.id);
    expect(mockChromeApi.debugger.sendCommand).toHaveBeenCalled();

    // Reset mock calls before testing the stub
    jest.clearAllMocks(); // This will clear the call count for sendCommand

    // Test with stub implementation
    const stubReceipt = await stubReceiptGenerator.generate(testOrder, { includeImages: false });
    expect(stubReceipt).toBeDefined();
    expect(stubReceipt.orderId).toBe(testOrder.id);
    expect(stubReceipt.filename).toContain('stub-receipt');
    expect(mockChromeApi.debugger.sendCommand).not.toHaveBeenCalled(); // Should not call real API
  });
});
