import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { io } from 'socket.io-client';
import useAuthStore from '../../store/authStore';
import { colors } from '../../styles/colors';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

export default function DeliveryHomeScreen() {
  const { token, user } = useAuthStore();

  const [stats, setStats] = useState({
    todayEarnings: 0,
    todayDeliveries: 0,
    totalDeliveries: 0,
    acceptanceRate: 100,
    isAvailable: true,
  });
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/delivery/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) {
      console.log('Stats fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Socket for real-time earnings updates
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socket.on('delivery_status_update', () => fetchStats());
    return () => socket.disconnect();
  }, [token]);

  const toggleAvailability = async () => {
    const nextState = !stats.isAvailable;
    setStats(s => ({ ...s, isAvailable: nextState }));
    try {
      await fetch(`${API_BASE}/delivery/toggle-availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_available: nextState }),
      });
    } catch (e) {
      // Revert on error
      setStats(s => ({ ...s, isAvailable: !nextState }));
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const partnerName = user?.name || 'Delivery Partner';
  const initials = partnerName.substring(0, 2).toUpperCase();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{partnerName}</Text>
            <Text style={styles.headerSub}>Delivery Partner</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.onlineBadge, { backgroundColor: stats.isAvailable ? colors.successLight : '#F1EFE8' }]}
            onPress={toggleAvailability}
          >
            <View style={[styles.onlineDot, { backgroundColor: stats.isAvailable ? colors.success : '#999' }]} />
            <Text style={[styles.onlineText, { color: stats.isAvailable ? colors.success : '#999' }]}>
              {stats.isAvailable ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Earnings Card */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsSubtitle}>TODAY'S EARNINGS</Text>
            <Text style={{ fontSize: 16 }}>📈</Text>
          </View>
          <View style={styles.earningsAmountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Text style={styles.earningsAmount}>{stats.todayEarnings.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.earningsFooterRow}>
            <View style={styles.liveUpdateBadge}>
              <Text style={styles.liveUpdateText}>LIVE UPDATE</Text>
            </View>
            <Text style={styles.earningsChange}>
              {stats.todayDeliveries} deliveries today
            </Text>
          </View>
        </View>

        {/* Bento Grid Mini Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TODAY</Text>
            <Text style={styles.statValue}>{stats.todayDeliveries}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ALL-TIME</Text>
            <Text style={styles.statValue}>{stats.totalDeliveries}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ACCEPT</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.acceptanceRate}%</Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusTitle}>
                {stats.isAvailable ? '🟢 You are Online' : '⚫ You are Offline'}
              </Text>
              <Text style={styles.statusSub}>
                {stats.isAvailable
                  ? 'Ready to receive delivery requests'
                  : 'Go online to receive orders'}
              </Text>
            </View>
            <Switch
              value={stats.isAvailable}
              onValueChange={toggleAvailability}
              trackColor={{ false: '#ccc', true: colors.success }}
            />
          </View>
        </View>

        {/* Today's Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.todayDeliveries}</Text>
              <Text style={styles.summaryLabel}>Deliveries</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>₹{stats.todayEarnings}</Text>
              <Text style={styles.summaryLabel}>Earned</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.acceptanceRate}%</Text>
              <Text style={styles.summaryLabel}>Acceptance</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.actionHint}>
            💡 Go to <Text style={{ fontWeight: '700', color: colors.text }}>Queue</Text> tab to see incoming orders from vendors
          </Text>
          <Text style={[styles.actionHint, { marginTop: 8 }]}>
            🗺️ Go to <Text style={{ fontWeight: '700', color: colors.text }}>Active</Text> tab to manage your current delivery
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerProfile: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.infoLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginLeft: 12 },
  headerSub: { fontSize: 11, color: colors.textSecondary, marginLeft: 12, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  onlineText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  scrollContent: { padding: 16, paddingBottom: 120 },

  // Earnings card
  earningsCard: {
    backgroundColor: colors.surface, borderRadius: 24, padding: 24,
    marginBottom: 16, borderColor: colors.border, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  earningsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  earningsSubtitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  earningsAmountRow: { flexDirection: 'row', alignItems: 'baseline' },
  currencySymbol: { fontSize: 24, color: colors.primary, fontWeight: '800', marginRight: 4 },
  earningsAmount: { fontSize: 52, fontWeight: '900', color: colors.text, letterSpacing: -1.5 },
  earningsFooterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  liveUpdateBadge: { backgroundColor: colors.infoLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 10 },
  liveUpdateText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  earningsChange: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },

  // Stats grid
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  statBox: {
    backgroundColor: colors.surface, flex: 1, padding: 16,
    borderRadius: 20, alignItems: 'center', borderColor: colors.border, borderWidth: 1,
  },
  statLabel: { fontSize: 10, fontWeight: 'bold', color: colors.textLight, letterSpacing: 1, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },

  // Status card
  statusCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 20,
    marginBottom: 16, borderColor: colors.border, borderWidth: 1,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  statusSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },

  // Summary card
  summaryCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 20,
    marginBottom: 16, borderColor: colors.border, borderWidth: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 16, letterSpacing: -0.3 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.border },

  // Actions card
  actionsCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 20,
    marginBottom: 16, borderColor: colors.border, borderWidth: 1,
  },
  actionHint: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
