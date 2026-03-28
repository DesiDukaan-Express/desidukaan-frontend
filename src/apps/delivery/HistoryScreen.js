import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import useAuthStore from '../../store/authStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const C = {
  bg:           '#F5F7F5',
  white:        '#FFFFFF',
  primary:      '#2E7D32',
  primaryLight: '#EAF3DE',
  primaryText:  '#27500A',
  blue:         '#378ADD',
  blueLight:    '#E6F1FB',
  blueText:     '#0C447C',
  orange:       '#FAEEDA',
  orangeText:   '#633806',
  red:          '#E24B4A',
  redLight:     '#FCEBEB',
  redText:      '#791F1F',
  textPrimary:  '#1A1A1A',
  textSecond:   '#666666',
  textLight:    '#999999',
  border:       '#E8EDE8',
};

const TABS = ['Today', 'This Week', 'This Month'];

function StatusBadge({ status }) {
  const isDelivered = status === 'delivered';
  return (
    <View style={[styles.badge, { backgroundColor: isDelivered ? C.primaryLight : C.redLight }]}>
      <Text style={[styles.badgeText, { color: isDelivered ? C.primaryText : C.redText }]}>
        {isDelivered ? '✓ Delivered' : '✕ Failed'}
      </Text>
    </View>
  );
}

function HistoryCard({ delivery }) {
  const isDelivered = delivery.status === 'delivered';
  const earnings = delivery.partner_earnings || 0;
  const pickupName = delivery.order?.vendor?.shop_name || 'Unknown Store';
  const dropCity = delivery.order?.delivery_address?.city || delivery.order?.delivery_address?.address_line || 'Local';
  const orderTime = delivery.delivered_at || delivery.created_at;
  const timeStr = orderTime
    ? new Date(orderTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <View style={styles.historyCard}>
      <View style={styles.cardTop}>
        <Text style={styles.orderId}>{delivery.order?.order_number || `#${delivery.id}`}</Text>
        <Text style={[styles.amount, { color: isDelivered ? C.primary : C.red }]}>
          {isDelivered ? `+₹${Math.round(earnings)}` : '—'}
        </Text>
      </View>

      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: C.blue }]} />
        <Text style={styles.routeText} numberOfLines={1}>{pickupName}</Text>
        <View style={styles.routeLine} />
        <View style={[styles.dot, { backgroundColor: C.red }]} />
        <Text style={styles.routeText} numberOfLines={1}>{dropCity}</Text>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.timeText}>🕐 {timeStr}</Text>
        <StatusBadge status={delivery.status} />
      </View>
    </View>
  );
}

function EarningsRow({ label, value, isBonus, isDanger, isLast }) {
  return (
    <View style={[styles.earningsRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.earningsLabel}>{label}</Text>
      <Text style={[styles.earningsValue, isBonus && { color: C.primary }, isDanger && { color: C.red }]}>
        {value}
      </Text>
    </View>
  );
}

export default function HistoryScreen() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('Today');
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/delivery/history?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/delivery/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const historyData = await historyRes.json();
      const statsData = await statsRes.json();

      if (historyData.success) {
        setAllDeliveries(historyData.data || []);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (e) {
      console.log('History fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Filter deliveries based on active tab
  const filterDeliveries = () => {
    const now = new Date();
    return allDeliveries.filter(d => {
      const date = new Date(d.delivered_at || d.created_at);
      if (activeTab === 'Today') {
        return date.toDateString() === now.toDateString();
      }
      if (activeTab === 'This Week') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return date >= weekAgo;
      }
      if (activeTab === 'This Month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const filteredDeliveries = filterDeliveries();
  const deliveredCount = filteredDeliveries.filter(d => d.status === 'delivered').length;
  const failedCount = filteredDeliveries.filter(d => d.status === 'failed').length;
  const totalEarnings = filteredDeliveries.reduce((sum, d) => sum + (d.status === 'delivered' ? (d.partner_earnings || 0) : 0), 0);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      {/* ── Header ── */}
      <Text style={styles.screenTitle}>Delivery History</Text>

      {/* ── Tabs ── */}
      <View style={styles.tabsRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Summary Cards ── */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{deliveredCount}</Text>
          <Text style={styles.summaryLabel}>Deliveries</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: C.red }]}>{failedCount}</Text>
          <Text style={styles.summaryLabel}>Failed</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats?.totalDeliveries || 0}</Text>
          <Text style={styles.summaryLabel}>All-time</Text>
        </View>
      </View>

      {/* ── Earnings Breakdown ── */}
      <View style={styles.earningsBox}>
        <View style={styles.earningsHeader}>
          <Text style={styles.sectionTitle}>Earnings breakdown</Text>
          <Text style={styles.earningsTotal}>₹{Math.round(totalEarnings)}</Text>
        </View>
        <EarningsRow label="Base pay (80% of fee)" value={`₹${Math.round(totalEarnings)}`} />
        <EarningsRow label="Acceptance rate" value={`${stats?.acceptanceRate || 100}%`} isBonus />
        <EarningsRow label="Total deliveries" value={String(stats?.totalDeliveries || 0)} isLast />
      </View>

      {/* ── Orders List ── */}
      <Text style={styles.sectionTitle}>
        {filteredDeliveries.length} {activeTab === 'Today' ? "today" : activeTab === 'This Week' ? "this week" : "this month"}
      </Text>

      {filteredDeliveries.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>No deliveries {activeTab.toLowerCase()}</Text>
        </View>
      ) : (
        filteredDeliveries.map(delivery => (
          <HistoryCard key={delivery.id} delivery={delivery} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: C.bg },
  content:      { padding: 16, paddingBottom: 40 },
  screenTitle:  { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 14 },
  tabsRow:      { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tab:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: 'transparent' },
  tabActive:    { backgroundColor: C.white, borderColor: C.border },
  tabText:      { fontSize: 12, color: C.textSecond },
  tabTextActive:{ fontWeight: '600', color: C.textPrimary },
  summaryRow:   { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard:  { flex: 1, backgroundColor: C.white, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: C.border },
  summaryValue: { fontSize: 22, fontWeight: '700', color: C.primary },
  summaryLabel: { fontSize: 11, color: C.textSecond, marginTop: 2 },
  earningsBox:    { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 0.5, borderColor: C.border },
  earningsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  earningsTotal:  { fontSize: 18, fontWeight: '700', color: C.primary },
  earningsRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.border },
  earningsLabel:  { fontSize: 13, color: C.textSecond },
  earningsValue:  { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  sectionTitle:   { fontSize: 13, fontWeight: '600', color: C.textSecond, marginBottom: 10 },
  historyCard:  { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: C.border },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId:      { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  amount:       { fontSize: 14, fontWeight: '700' },
  routeRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dot:          { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  routeText:    { fontSize: 12, color: C.textPrimary, flexShrink: 1, maxWidth: '35%' },
  routeLine:    { flex: 1, height: 1, backgroundColor: C.border },
  cardBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText:     { fontSize: 11, color: C.textLight },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText:    { fontSize: 11, fontWeight: '600' },
  emptyBox:     { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji:   { fontSize: 40, marginBottom: 10 },
  emptyTitle:   { fontSize: 14, color: C.textLight },
});