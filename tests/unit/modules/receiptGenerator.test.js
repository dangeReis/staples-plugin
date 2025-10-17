import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createChromePrintReceiptGenerator } from '../../../src/modules/receiptGenerator/chromePrint.js';
import { ReceiptGenerationError } from '../../../src/modules/receiptGenerator/interface.js';

function createMockChromeApis({ pdfData = 'UEZERGFUQQ==' } = {}) {
  const tabs = {
    create: jest.fn().mockResolvedValue({ id: 42 }),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const debuggerApi = {
    attach: jest.fn().mockResolvedValue(undefined),
    detach: jest.fn().mockResolvedValue(undefined),
    sendCommand: jest.fn().mockImplementation(async (target, method, params) => {
      if (method !== 'Page.printToPDF') {
        throw new Error('Unexpected method');
      }
      return { data: pdfData };
    }),
  };

  const downloads = {
    download: jest.fn(),
  };

  return { tabs, debugger: debuggerApi, downloads };
}

describe('createChromePrintReceiptGenerator', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    globalThis.atob = (value) => Buffer.from(value, 'base64').toString('binary');
  });

  it('generates a receipt using the Chrome APIs and returns structured data', async () => {
    const pdfContent = Buffer.from('PDF-DATA');
    const pdfData = pdfContent.toString('base64');
    const chromeApis = createMockChromeApis({ pdfData });
    const generator = createChromePrintReceiptGenerator(chromeApis);

    const result = await generator.generate({ id: '123', detailsUrl: 'https://example.test/order' }, {
      includeImages: false,
      method: 'direct',
    });

    expect(chromeApis.tabs.create).toHaveBeenCalledWith({ url: 'https://example.test/order', active: false });
    expect(chromeApis.debugger.attach).toHaveBeenCalledWith({ tabId: 42 }, '1.3');
    expect(chromeApis.debugger.sendCommand).toHaveBeenCalledWith({ tabId: 42 }, 'Page.printToPDF', {
      printBackground: false,
    });
    expect(chromeApis.debugger.detach).toHaveBeenCalledWith({ tabId: 42 });
    expect(chromeApis.tabs.remove).toHaveBeenCalledWith(42);

    expect(result).toMatchObject({
      orderId: '123',
      filename: 'staples-receipt-123.pdf',
      method: 'direct',
      includesImages: false,
    });
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it('throws ReceiptGenerationError when order is invalid', async () => {
    const chromeApis = createMockChromeApis();
    const generator = createChromePrintReceiptGenerator(chromeApis);

    await expect(generator.generate({ id: undefined }, {})).rejects.toThrow(ReceiptGenerationError);
  });

  it('cleans up the debugger and tab even when printing fails', async () => {
    const chromeApis = createMockChromeApis();
    chromeApis.debugger.sendCommand.mockRejectedValue(new Error('print failed'));
    const generator = createChromePrintReceiptGenerator(chromeApis);

    await expect(generator.generate({ id: 'ABC', detailsUrl: 'https://example.test' }, {})).rejects.toThrow(ReceiptGenerationError);

    expect(chromeApis.debugger.detach).toHaveBeenCalledWith({ tabId: 42 });
    expect(chromeApis.tabs.remove).toHaveBeenCalledWith(42);
  });
});
