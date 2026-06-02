// src/utils/orderUtils.js

/**
 * Groups a flat orders array by customer.
 * Returns: [{ customer_id, customer_name, customer_phone, orders: [...], totalSpent, latestAt }]
 */
export function groupOrdersByCustomer(orders = []) {
  const map = {};
  for (const order of orders) {
    const cid = order.customer_id;
    if (!map[cid]) {
      map[cid] = {
        customer_id: cid,
        customer_name: order.customer?.name || 'Customer',
        customer_phone: order.customer?.phone || '',
        orders: [],
        totalSpent: 0,
        latestAt: order.created_at,
      };
    }
    map[cid].orders.push(order);
    map[cid].totalSpent += order.total || 0;
    if (new Date(order.created_at) > new Date(map[cid].latestAt)) {
      map[cid].latestAt = order.created_at;
    }
  }
  // Sort customers by most recent order
  return Object.values(map).sort(
    (a, b) => new Date(b.latestAt) - new Date(a.latestAt)
  );
}

export const ACTIVE_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'countered'];
export const DONE_STATUSES   = ['delivered', 'cancelled', 'rejected'];

export function getStatusConfig(status) {
  const map = {
    pending:    { label: 'Pending',    bg: '#FEF3C7', color: '#D97706', border: '#F59E0B' },
    accepted:   { label: 'Accepted',   bg: '#DCFCE7', color: '#16A34A', border: '#22C55E' },
    preparing:  { label: 'Preparing',  bg: '#DBEAFE', color: '#2563EB', border: '#3B82F6' },
    ready:      { label: 'Ready',      bg: '#EDE9FE', color: '#7C3AED', border: '#8B5CF6' },
    picked_up:  { label: 'Picked Up',  bg: '#FEF9C3', color: '#CA8A04', border: '#EAB308' },
    delivered:  { label: 'Delivered',  bg: '#F0FDF4', color: '#15803D', border: '#86EFAC' },
    cancelled:  { label: 'Cancelled',  bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' },
    rejected:   { label: 'Rejected',   bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' },
    countered:  { label: 'Countered',  bg: '#FFF7ED', color: '#EA580C', border: '#FB923C' },
  };
  return map[status] || { label: status, bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' };
}