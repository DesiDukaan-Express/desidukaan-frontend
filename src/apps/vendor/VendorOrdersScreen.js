import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { colors } from '../../styles/colors';
import useAuthStore from '../../store/authStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function VendorOrdersScreen() {
  const { token } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      // Assuming vendor orders are at /api/orders/vendor or we can just fetch all orders if it's filtered by token
      const res = await fetch(`${API_BASE}/orders/vendor/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setOrders(result.data.orders || []);
      }
    } catch (err) {
      console.log('Error fetching vendor orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      fetchOrders();
    } catch (err) {
      console.log('Update status error:', err);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return { bg: '#FFF3CD', text: '#F39C12' };
      case 'accepted':
      case 'preparing':
      case 'ready': return { bg: '#E1F5FE', text: '#0288D1' };
      case 'picked_up':
      case 'delivered': return { bg: 'rgba(15,240,34,0.15)', text: '#0ac91c' };
      case 'cancelled':
      case 'rejected': return { bg: '#FDECEA', text: '#E74C3C' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#0ff022" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Recent Orders</Text>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emoji}>🧾</Text>
          <Text style={styles.title}>No Orders Yet</Text>
          <Text style={styles.sub}>When customers order, they will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>{item.order_number || `Order #${item.id}`}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status).bg }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status).text }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              
              {/* Customer info */}
              <Text style={styles.customerName}>
                👤 {item.customer?.name || 'Customer'} • {item.customer?.phone || ''}
              </Text>
              
              {/* Items */}
              <View style={styles.itemsList}>
                {(item.items || []).map((prod, idx) => (
                  <Text key={idx} style={styles.itemRow}>
                    • {prod.quantity}x {prod.product_name}
                  </Text>
                ))}
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.orderTotal}>₹{item.total}</Text>
                <Text style={styles.orderDate}>
                  {new Date(item.created_at).toLocaleString('en-IN', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
              </View>

              {item.status === 'pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => updateOrderStatus(item.id, 'accepted')}>
                    <Text style={styles.btnTextInfo}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => updateOrderStatus(item.id, 'cancelled')}>
                    <Text style={[styles.btnTextInfo, { color: '#E74C3C' }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { fontSize: 24, fontWeight: 'bold', padding: 16, paddingTop: 60, paddingBottom: 10, color: colors.textBase },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary },
  sub: { fontSize: 14, color: colors.textLight, marginTop: 6, textAlign: 'center', paddingHorizontal: 30 },
  orderCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontWeight: '800', color: '#111827', fontSize: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },

  customerName: { fontSize: 13, color: '#4B5563', fontWeight: '600', marginBottom: 10 },
  itemsList: { backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, marginBottom: 12 },
  itemRow: { fontSize: 13, color: '#374151', marginBottom: 4 },

  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  orderTotal: { fontSize: 18, fontWeight: '800', color: '#111827' },
  orderDate: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  actionRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnAccept: { backgroundColor: '#0ac91c' },
  btnReject: { backgroundColor: '#FDECEA' },
  btnTextInfo: { fontWeight: '800', color: '#fff' }
});