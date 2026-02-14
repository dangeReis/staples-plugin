/**
 * OrderDetails API implementation
 *
 * Fetches the Staples order details endpoint and parses the deeply nested
 * response into enriched Order primitives.
 *
 * API endpoint:
 *   GET https://www.staples.com/sdc/ptd/api/orderDetails/ptd/orderdetails
 *     ?enterpriseCode={enterpriseCode}
 *     &orderType={orderType}
 *     &tp_sid={orderUrlKey}
 *     &pgIntlO=Y
 *
 * Response nesting:
 *   response.ptdOrderDetails.orderDetails.orderDetails -> actual order data
 *
 * @module modules/orderDetails/api
 */

import { OrderDetailsError } from './interface.js';
import { createOrder } from '../../primitives/Order.js';
import { createOrderItem } from '../../primitives/OrderItem.js';
import { createReturnOrder } from '../../primitives/ReturnOrder.js';

const BASE_URL = 'https://www.staples.com/sdc/ptd/api/orderDetails/ptd/orderdetails';

/**
 * Creates an OrderDetails implementation backed by the Staples API.
 *
 * @param {Object} deps
 * @param {import('../../adapters/fetch.js').FetchAdapter} deps.fetch - The fetch adapter
 * @returns {{ enrich: (order: Order) => Promise<Order> }}
 */
export function createOrderDetailsApi({ fetch }) {
  if (!fetch) {
    throw new Error('OrderDetailsApi requires a fetch adapter');
  }

  return {
    async enrich(order) {
      // --- Validate input ---
      if (!order || !order.id) {
        throw new OrderDetailsError('enrich requires an order with an id', {});
      }
      if (!order.orderUrlKey) {
        throw new OrderDetailsError('enrich requires order.orderUrlKey (tp_sid)', {
          orderId: order.id,
        });
      }

      const orderType = order.orderType || 'in-store_instore';
      const enterpriseCode = order.enterpriseCode || 'RetailUS';

      const url = `${BASE_URL}?enterpriseCode=${encodeURIComponent(enterpriseCode)}`
        + `&orderType=${encodeURIComponent(orderType)}`
        + `&tp_sid=${encodeURIComponent(order.orderUrlKey)}`
        + `&pgIntlO=Y`;

      // --- Fetch ---
      let result;
      try {
        result = await fetch.get(url);
      } catch (err) {
        throw new OrderDetailsError(`API request failed for order ${order.id}`, {
          orderId: order.id,
          cause: err,
        });
      }

      if (!result.ok) {
        throw new OrderDetailsError(
          `API returned HTTP ${result.status} for order ${order.id}`,
          { orderId: order.id, status: result.status },
        );
      }

      // --- Navigate the triple-nested response ---
      const od = result.data?.ptdOrderDetails?.orderDetails?.orderDetails;
      if (!od) {
        throw new OrderDetailsError(
          `Unexpected response shape for order ${order.id} — could not find orderDetails`,
          { orderId: order.id },
        );
      }

      // --- Parse line items from shipments ---
      const items = parseShipmentItems(od.shipments || []);

      // --- Parse return orders ---
      const returns = parseReturnOrders(od.returnOrders || [], od.orderNumber);

      // --- Build financials ---
      const financials = {
        merchandiseTotal: od.merchandiseTotal ?? 0,
        discountsTotal: od.discountsTotal ?? 0,
        couponsTotal: od.couponsTotal ?? 0,
        shippingTotal: od.shippingAndHandlingFeeTotal ?? 0,
        taxesTotal: od.taxesTotal ?? 0,
        grandTotal: od.grandTotal ?? 0,
      };

      // --- Build storeInfo (may not exist for online orders) ---
      let storeInfo = null;
      if (od.storeNumber) {
        const addr = od.storeAddress || {};
        storeInfo = {
          storeNumber: String(od.storeNumber),
          addressLine1: addr.addressLine1 || '',
          city: addr.city || '',
          state: addr.state || '',
          zipCode: addr.zipCode || '',
        };
      }

      // --- Return enriched Order primitive ---
      return createOrder({
        id: od.orderNumber || order.id,
        date: od.orderDate || order.date,
        type: order.type,
        detailsUrl: order.detailsUrl,
        customerNumber: od.masterAccountNumber || order.customerNumber,
        orderUrlKey: od.orderUrlKey || order.orderUrlKey,
        orderType: order.orderType,
        enterpriseCode: od.enterpriseCode || enterpriseCode,
        items,
        returns,
        financials,
        storeInfo,
        transactionBarCode: od.transactionBarCode || null,
        isReturnable: Boolean(od.isReturnable),
      });
    },
  };
}

// ─── Internal Parsers ────────────────────────────────────────────────

/**
 * Extracts OrderItem[] from the shipments array.
 *
 * Path: shipments[].containerIdVsShipmentLinesMap["dummyKey"][]
 * The key "dummyKey" is a literal string used by the Staples API.
 */
function parseShipmentItems(shipments) {
  const items = [];
  for (const shipment of shipments) {
    const lineMap = shipment.containerIdVsShipmentLinesMap || {};
    const lines = lineMap['dummyKey'] || [];
    for (const line of lines) {
      items.push(createOrderItem({
        skuNumber: line.skuNumber || 'UNKNOWN',
        title: line.title || line.skuDescription || 'Unknown Item',
        image: line.image || '',
        unitPrice: line.unitPrice ?? 0,
        qtyOrdered: line.qtyOrdered ?? 0,
        qtyShipped: line.qtyShipped ?? 0,
        lineTotal: line.lineTotal ?? 0,
        couponTotal: line.couponTotal ?? 0,
        couponDetails: (line.couponDetails || []).map(c => ({
          chargeName: c.chargeName || '',
          chargeAmount: c.chargeAmount ?? 0,
        })),
        taxTotal: line.taxTotal ?? 0,
        status: line.status ?? 0,
        statusDescription: line.statusDescription || '',
      }));
    }
  }
  return items;
}

/**
 * Extracts ReturnOrder[] from the returnOrders array.
 *
 * Each return has returnShipments[], and within each shipment:
 *   containerIdVsShipmentLinesMap["dummyKey"][] -> returned line items
 */
function parseReturnOrders(returnOrders, masterOrderNumber) {
  const returns = [];
  for (const ret of returnOrders) {
    const returnShipments = ret.returnShipments || [];

    // Aggregate across all return shipments for this return order
    for (const rs of returnShipments) {
      const returnItems = [];
      const lineMap = rs.containerIdVsShipmentLinesMap || {};
      const lines = lineMap['dummyKey'] || [];

      for (const line of lines) {
        returnItems.push(createOrderItem({
          skuNumber: line.skuNumber || 'UNKNOWN',
          title: line.title || line.skuDescription || 'Unknown Item',
          image: line.image || '',
          unitPrice: line.unitPrice ?? 0,
          qtyOrdered: line.qtyOrdered ?? 0,
          qtyShipped: line.qtyShipped ?? 0,
          lineTotal: line.lineTotal ?? 0,
          couponTotal: line.couponTotal ?? 0,
          couponDetails: (line.couponDetails || []).map(c => ({
            chargeName: c.chargeName || '',
            chargeAmount: c.chargeAmount ?? 0,
          })),
          taxTotal: line.taxTotal ?? 0,
          status: line.status ?? 0,
          statusDescription: line.statusDescription || '',
        }));
      }

      returns.push(createReturnOrder({
        returnOrderNumber: ret.returnOrderNumber,
        masterOrderNumber: ret.masterOrderNumber || masterOrderNumber,
        returnedDate: ret.returnedDate,
        dispositionType: rs.returnDispositionType || 'UNKNOWN',
        statusCode: rs.trackingInfo?.statusCode ?? 0,
        statusDescription: rs.trackingInfo?.statusDescription || '',
        merchandiseTotal: rs.merchandiseTotal ?? 0,
        couponTotal: rs.couponTotal ?? 0,
        shippingRefund: rs.shippingFees ?? 0,
        taxRefund: rs.taxTotal ?? 0,
        refundTotal: rs.grandTotal ?? 0,
        items: returnItems,
        orderUrlKey: ret.orderUrlKey || null,
      }));
    }
  }
  return returns;
}
