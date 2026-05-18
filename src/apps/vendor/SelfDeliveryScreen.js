import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import useAuthStore from '../../store/authStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const PRIMARY = '#1ca049';

const STATUS_FLOW = {
  accepted:  { next: 'preparing', label: 'Start Preparing', color: '#f97316' },
  preparing: { next: 'ready',     label: 'Mark Ready',      color: '#8b5cf6' },
  ready:     { next: 'picked_up', label: 'Picked Up',       color: '#3b82f6' },
  picked_up: { next: 'delivered', label: 'Mark Delivered',  color: '#22c55e' },
};

const STATUS_COLORS = {
  pending:   { bg: '#fff7ed', text: '#c2410c' },
  accepted:  { bg: '#eff6ff', text: '#1d4ed8' },
  preparing: { bg: '#f5f3ff', text: '#7c3aed' },
  ready:     { bg: '#ecfdf5', text: '#065f46' },
  picked_up: { bg: '#fff7ed', text: '#c2410c' },
  delivered: { bg: '#f0fdf4', text: '#15803d' },
  cancelled: { bg: '#fef2f2', text: '#dc2626' },
};

export default function SelfDeliveryScreen() {
  const { token } = useAuthStore();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(null);
  const [vendorType, setVendorType] = useState('self');

  useEffect(() => {
    fetchVendorAndOrders();
  }, []);

  const fetchVendorAndOrders = async () => {
    try {
      // Get vendor profile first to determine delivery_type
      const profileRes = await fetch(`${API_BASE}/vendors/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileData = await profileRes.json();
      setVendorType(profileData.data?.vendor?.delivery_type || 'self');

      // Get active orders
      const ordersRes = await fetch(`${API_BASE}/orders/vendor/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ordersData = await ordersRes.json();
      // Show only accepted/preparing/ready/picked_up orders for delivery management
      const deliveryOrders = (ordersData.data?.orders || []).filter(
        o => ['accepted', 'preparing', 'ready', 'picked_up'].includes(o.status)
      );
      setOrders(deliveryOrders);
    } catch (err) {
      console.error('SelfDelivery fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.msg || 'Update failed');
      }
      await fetchVendorAndOrders();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(null);
    }
  };

  const renderOrder = ({ item: order }) => {
    const flow    = STATUS_FLOW[order.status];
    const statusC = STATUS_COLORS[order.status] || { bg: '#f3f4f6', text: '#374151' };

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View>
            <Text style={s.orderNum}>{order.order_number}</Text>
            <Text style={s.customerName}>{order.customer?.name || order.customer?.phone || '—'}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusC.bg }]}>
            <Text style={[s.statusText, { color: statusC.text }]}>{order.status.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Delivery address */}
        {order.delivery_address && (
          <View style={s.addressRow}>
            <Text style={s.addressIcon}>📍</Text>
            <Text style={s.addressText} numberOfLines={2}>
              {order.delivery_address.address_line}, {order.delivery_address.city}
            </Text>
          </View>
        )}

        {/* Order items summary */}
        <Text style={s.itemsText}>
          {order.items?.length || 0} item(s) · ₹{order.total}
        </Text>

        {/* Action button — only for self delivery vendors */}
        {flow && vendorType === 'self' && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: flow.color }, updating === order.id && { opacity: 0.6 }]}
            onPress={() => handleStatusUpdate(order.id, flow.next)}
            disabled={updating === order.id}
          >
            {updating === order.id
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.actionBtnText}>{flow.label} →</Text>
            }
          </TouchableOpacity>
        )}

        {/* For partner delivery vendors — show assign rider info */}
        {vendorType === 'partner' && order.status === 'ready' && !order.delivery?.partner_id && (
          <View style={[s.actionBtn, { backgroundColor: '#6366f1' }]}>
            <Text style={s.actionBtnText}>🏍️ Waiting for delivery partner...</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>
          {vendorType === 'self' ? '🚚 My Deliveries' : '🏍️ Delivery Partners'}
        </Text>
        <Text style={s.headerSub}>
          {vendorType === 'self'
            ? 'Manage pickup & drop yourself'
            : 'Delivery partners handle your orders'}
        </Text>
      </View>

      {orders.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48 }}>📦</Text>
          <Text style={{ fontSize: 16, color: '#888', marginTop: 12 }}>No active deliveries</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          renderItem={renderOrder}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshing={loading}
          onRefresh={fetchVendorAndOrders}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9f7' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:    { backgroundColor: PRIMARY, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#eaeaea', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderNum: { fontSize: 14, fontWeight: '800', color: '#111', fontFamily: 'monospace' },
  customerName: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 8 },
  addressIcon: { fontSize: 13 },
  addressText: { fontSize: 12, color: '#374151', flex: 1, lineHeight: 18 },

  itemsText: { fontSize: 12, color: '#6b7280', marginBottom: 12 },

  actionBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});