
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { ReceiptGeneratorInterface, ReceiptGenerationError } from '../../src/modules/receiptGenerator/interface';
import { createChromePrintReceiptGenerator } from '../../src/modules/receiptGenerator/chromePrint';
import { createOrder } from '../../src/primitives/Order';

global.Blob = class Blob extends global.Blob {};

describe('ReceiptGenerator Interface Contract', () => {
  /** @type {ReceiptGenerator} */
  let receiptGenerator;

  // Mock dependencies for the generator
  const mockChromeApi = {
    tabs: { create: jest.fn(), remove: jest.fn(), onUpdated: { addListener: jest.fn(), removeListener: jest.fn() } },
    debugger: { attach: jest.fn(), detach: jest.fn(), sendCommand: jest.fn() },
    downloads: { download: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Happy-path defaults — prevents unhandled rejections when tests
    // don't await the promise (e.g. Test 2 only checks toBeInstanceOf).
    mockChromeApi.tabs.create.mockResolvedValue({ id: 1, url: '', active: false, status: 'complete' });
    mockChromeApi.tabs.remove.mockResolvedValue(undefined);
    mockChromeApi.debugger.attach.mockResolvedValue(undefined);
    mockChromeApi.debugger.detach.mockResolvedValue(undefined);
    mockChromeApi.debugger.sendCommand.mockResolvedValue({ data: btoa('fake-pdf-content') });
    mockChromeApi.downloads.download.mockResolvedValue(1);

    receiptGenerator = createChromePrintReceiptGenerator(mockChromeApi);
  });

  // Test 1: Ensure the implementation has the 'generate' method
  test('should have a generate method', () => {
    expect(typeof receiptGenerator.generate).toBe('function');
  });

  // Test 2: Ensure 'generate' returns a Promise
  test('generate should return a promise', () => {
    const order = createOrder({ id: '123', date: '2025-10-17', type: 'online', detailsUrl: 'https://www.staples.com/ptd/myorders/details/123' });
    const result = receiptGenerator.generate(order, { includeImages: true });
    expect(result).toBeInstanceOf(Promise);
  });

  // Test 3: Ensure 'generate' resolves with a Receipt object
  test('generate should resolve with a Receipt object', async () => {
    const order = createOrder({ id: '456', date: '2025-10-18', type: 'online', detailsUrl: 'https://www.staples.com/ptd/myorders/details/456' });
    
    // Mock underlying APIs to return a successful result (must be valid base64 for atob())
    mockChromeApi.debugger.sendCommand.mockResolvedValue({ data: btoa('pdf-binary-content') });
    mockChromeApi.downloads.download.mockResolvedValue(1);

    const receipt = await receiptGenerator.generate(order, { includeImages: false, method: 'print' });

    expect(receipt).toBeDefined();
    expect(receipt).toHaveProperty('orderId', order.id);
    expect(receipt).toHaveProperty('filename');
    expect(receipt).toHaveProperty('blob');
    expect(receipt).toHaveProperty('generatedAt');
    expect(receipt).toHaveProperty('method', 'print');
    expect(receipt.blob).toBeInstanceOf(Blob);
  });

  // Test 4: Ensure 'generate' throws ReceiptGenerationError for invalid order
  test('generate should throw ReceiptGenerationError for invalid order', async () => {
    await expect(receiptGenerator.generate(null, { includeImages: true })).rejects.toThrow(ReceiptGenerationError);
    await expect(receiptGenerator.generate({}, { includeImages: true })).rejects.toThrow(ReceiptGenerationError);
  });

  // Test 5: Ensure 'generate' throws ReceiptGenerationError on API failure
  test('generate should throw ReceiptGenerationError on API failure', async () => {
    const order = createOrder({ id: '789', date: '2025-10-19', type: 'online', detailsUrl: 'https://www.staples.com/ptd/myorders/details/789' });

    // Mock a failure in one of the Chrome APIs
    mockChromeApi.debugger.attach.mockRejectedValue(new Error('Attach failed'));

    await expect(receiptGenerator.generate(order, { includeImages: true })).rejects.toThrow(ReceiptGenerationError);
  });

  // Test 6: Ensure the returned Receipt object has a valid shape
  test('generate should return a receipt with a valid shape', async () => {
    const order = createOrder({ id: '101', date: '2025-10-20', type: 'online', detailsUrl: 'https://www.staples.com/ptd/myorders/details/101' });
    mockChromeApi.debugger.sendCommand.mockResolvedValue({ data: btoa('pdf-binary-shape-test') });
    mockChromeApi.downloads.download.mockResolvedValue(2);

    const receipt = await receiptGenerator.generate(order, { includeImages: true, method: 'print' });

    expect(typeof receipt.orderId).toBe('string');
    expect(receipt.orderId).toBe(order.id);

    expect(typeof receipt.filename).toBe('string');
    expect(receipt.filename.endsWith('.pdf')).toBe(true);

    expect(receipt.blob).toBeInstanceOf(Blob);
    expect(receipt.blob.type).toBe('application/pdf');

    expect(receipt.generatedAt).toBeInstanceOf(Date);

    expect(['print', 'direct']).toContain(receipt.method);

    expect(typeof receipt.includesImages).toBe('boolean');
  });
});
