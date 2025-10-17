export function createOrder({ id, date, type, detailsUrl, customerNumber }) {
  if (!id || !date || !type || !detailsUrl) {
    throw new Error('Order requires id, date, type, and detailsUrl');
  }
  return Object.freeze({ id, date, type, detailsUrl, customerNumber: customerNumber || null });
}