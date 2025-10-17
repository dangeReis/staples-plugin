export function createReceipt({ orderId, filename, blob, generatedAt, method, includesImages }) {
  if (!orderId || !filename || !blob || !generatedAt || !method || includesImages === undefined) {
    throw new Error('Receipt requires orderId, filename, blob, generatedAt, method, and includesImages');
  }
  if (!filename.endsWith('.pdf')) {
    throw new Error('Filename must end with .pdf');
  }
  if (blob.type !== 'application/pdf') {
    throw new Error('Blob must be of type application/pdf');
  }
  if (method !== 'print' && method !== 'direct') {
    throw new Error('Method must be either "print" or "direct"');
  }

  return Object.freeze({
    orderId,
    filename,
    blob,
    generatedAt,
    method,
    includesImages,
  });
}