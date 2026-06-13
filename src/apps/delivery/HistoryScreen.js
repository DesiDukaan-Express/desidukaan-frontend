import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Platform,
} from 'react-native';
import {
  useFonts,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import useAuthStore from '../../store/authStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const C = {
  heroBg:     '#228948',
  heroSub:    'rgba(255,255,255,0.70)',
  heroStatBg: 'rgba(0,0,0,0.15)',
  white:      '#FFFFFF',
  bg:         '#F2F2F7',
  green:      '#50C878',
  greenDark:  '#228948',
  greenLight: '#E8F8EE',
  greenText:  '#1A6B38',
  gray100:    '#F3F4F6',
  gray200:    '#E5E7EB',
  gray300:    '#D1D5DB',
  gray400:    '#9CA3AF',
  gray500:    '#6B7280',
  gray700:    '#374151',
  gray800:    '#1F2937',
  gray900:    '#111827',
  red:        '#FF3B30',
  redLight:   '#FFEAEA',
  redText:    '#B91C1C',
  blue:       '#3B82F6',
};

const TABS = ['Today', 'This Week', 'This Month'];

function HistoryCard({ delivery }) {
  const isDelivered = delivery.status === 'delivered';
  const earnings = delivery.partner_earnings || 0;
  const pickupName = delivery.order?.vendor?.shop_name || 'Unknown Store';
  const dropCity = delivery.order?.delivery_address?.city
    || delivery.order?.delivery_address?.address_line
    || 'Local';
  const orderTime = delivery.delivered_at || delivery.created_at;
  const timeStr = orderTime
    ? new Date(orderTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '—';
  const dateStr = orderTime
    ? new Date(orderTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  return (
    <View style={s.card}>
      <View style={s.cardLeft}>
        <View style={[s.cardIcon, { backgroundColor: isDelivered ? C.greenLight : C.redLight }]}>
          <Text style={[s.cardIconText, { color: isDelivered ? C.greenText : C.redText }]}>
            {isDelivered ? '↓' : '✕'}
          </Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.cardRow}>
          <Text style={s.cardOrderId} numberOfLines={1}>
            {delivery.order?.order_number || `#${delivery.id}`}
          </Text>
          <Text style={[s.cardEarnings, { color: isDelivered ? C.greenDark : C.gray400 }]}>
            {isDelivered ? `+₹${Math.round(earnings)}` : '—'}
          </Text>
        </View>
        <View style={s.cardRouteRow}>
          <View style={[s.dot, { backgroundColor: C.blue }]} />
          <Text style={s.routeText} numberOfLines={1}>{pickupName}</Text>
          <View style={s.routeLine} />
          <View style={[s.dot, { backgroundColor: C.red }]} />
          <Text style={s.routeText} numberOfLines={1}>{dropCity}</Text>
        </View>
        <View style={s.cardMeta}>
          <Text style={s.metaTime}>{dateStr}  {timeStr}</Text>
          <View style={[s.statusPill, { backgroundColor: isDelivered ? C.greenLight : C.redLight }]}>
            <Text style={[s.statusPillText, { color: isDelivered ? C.greenText : C.redText }]}>
              {isDelivered ? 'Delivered' : 'Failed'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { token } = useAuthStore();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [activeTab, setActiveTab] = useState('Today');
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/delivery/history?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/delivery/stats`,             { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const historyData = await historyRes.json();
      const statsData   = await statsRes.json();
      if (historyData.success) setAllDeliveries(historyData.data?.deliveries || historyData.data || []);
      if (statsData.success)   setStats(statsData.data);
    } catch (e) {
      console.log('History fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filterDeliveries = () => {
    const now = new Date();
    return allDeliveries.filter(d => {
      const date = new Date(d.delivered_at || d.created_at);
      if (activeTab === 'Today')      return date.toDateString() === now.toDateString();
      if (activeTab === 'This Week')  { const wa = new Date(now); wa.setDate(now.getDate() - 7); return date >= wa; }
      if (activeTab === 'This Month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const filtered      = filterDeliveries();
  const deliveredCount = filtered.filter(d => d.status === 'delivered').length;
  const failedCount    = filtered.filter(d => d.status === 'failed').length;
  const totalEarnings  = filtered.reduce((sum, d) =>
    sum + (d.status === 'delivered' ? (d.partner_earnings || 0) : 0), 0);

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.heroBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.heroBg} />

      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroTitle}>History</Text>
            <Text style={s.heroSub}>Your delivery record</Text>
          </View>
          <View style={s.heroEarningBox}>
            <Text style={s.heroEarningLabel}>PERIOD EARNINGS</Text>
            <Text style={s.heroEarningValue}>₹{Math.round(totalEarnings).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{deliveredCount}</Text>
            <Text style={s.heroStatLabel}>Delivered</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatValue, { color: '#FCA5A5' }]}>{failedCount}</Text>
            <Text style={s.heroStatLabel}>Failed</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{stats?.totalDeliveries || 0}</Text>
            <Text style={s.heroStatLabel}>All-time</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{stats?.acceptanceRate ?? 100}%</Text>
            <Text style={s.heroStatLabel}>Accept rate</Text>
          </View>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabsWrap}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />}
      >
        {/* ── Earnings breakdown card ── */}
        <View style={s.earningsCard}>
          <View style={s.earningsCardHeader}>
            <Text style={s.earningsCardTitle}>Earnings breakdown</Text>
            <Text style={s.earningsCardTotal}>₹{Math.round(totalEarnings).toLocaleString('en-IN')}</Text>
          </View>
          <View style={s.earningsRow}>
            <Text style={s.earningsLabel}>Base pay (80% of fee)</Text>
            <Text style={s.earningsValue}>₹{Math.round(totalEarnings * 0.8).toLocaleString('en-IN')}</Text>
          </View>
          <View style={s.earningsRow}>
            <Text style={s.earningsLabel}>Acceptance rate bonus</Text>
            <Text style={[s.earningsValue, { color: C.greenDark }]}>{stats?.acceptanceRate ?? 100}%</Text>
          </View>
          <View style={[s.earningsRow, { borderBottomWidth: 0 }]}>
            <Text style={s.earningsLabel}>Total deliveries (all-time)</Text>
            <Text style={s.earningsValue}>{stats?.totalDeliveries || 0}</Text>
          </View>
        </View>

        {/* ── List header ── */}
        <Text style={s.listHeader}>
          {filtered.length} {activeTab === 'Today' ? 'today' : activeTab === 'This Week' ? 'this week' : 'this month'}
        </Text>

        {/* ── List ── */}
        {filtered.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>📭</Text>
            <Text style={s.emptyTitle}>No deliveries {activeTab.toLowerCase()}</Text>
            <Text style={s.emptySub}>Pull down to refresh</Text>
          </View>
        ) : (
          <View style={s.listCard}>
            {filtered.map((delivery, idx) => (
              <React.Fragment key={delivery.id}>
                <HistoryCard delivery={delivery} />
                {idx < filtered.length - 1 && <View style={s.divider} />}
              </React.Fragment>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },

  hero: {
    backgroundColor: C.heroBg,
    paddingTop: Platform.OS === 'android' ? 36 : 58,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: C.white, letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium',
    color: C.heroSub, marginTop: 4,
  },
  heroEarningBox: { alignItems: 'flex-end' },
  heroEarningLabel: {
    fontSize: 9, fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: 'rgba(255,255,255,0.60)', letterSpacing: 1.1, marginBottom: 4,
  },
  heroEarningValue: {
    fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: C.white,
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: C.heroStatBg,
    borderRadius: 16, paddingVertical: 14,
  },
  heroStat:        { flex: 1, alignItems: 'center' },
  heroStatValue:   { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.white, marginBottom: 2 },
  heroStatLabel:   { fontSize: 10, fontFamily: 'PlusJakartaSans_500Medium', color: 'rgba(255,255,255,0.60)' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  tab:          { flex: 1, paddingVertical: 7, borderRadius: 20, alignItems: 'center', backgroundColor: C.gray100 },
  tabActive:    { backgroundColor: C.heroBg },
  tabText:      { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray500 },
  tabTextActive:{ color: C.white },

  earningsCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  earningsCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  earningsCardTitle:  { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900, letterSpacing: 0.2 },
  earningsCardTotal:  { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.greenDark },
  earningsRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: C.gray200 },
  earningsLabel:  { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray500 },
  earningsValue:  { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray900 },

  listHeader: {
    fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: C.gray400, letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 10,
  },
  listCard: {
    backgroundColor: C.white, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  divider: { height: 1, backgroundColor: C.gray100 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  cardLeft: {},
  cardIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cardIconText: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardOrderId: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900, flex: 1 },
  cardEarnings: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  cardRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  dot:  { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  routeText: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray700, flexShrink: 1, maxWidth: '38%' },
  routeLine: { flex: 1, height: 1, backgroundColor: C.gray200 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaTime: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },

  emptyWrap:  { alignItems: 'center', paddingVertical: 56 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray700, marginBottom: 6 },
  emptySub:   { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },
});