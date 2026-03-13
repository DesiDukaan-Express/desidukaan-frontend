/*import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, radius } from '../../styles/spacing';
import { shadows } from '../../styles/shadows';

export default function SearchScreen() {  // Change name for each file
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🛵</Text>   {/* 🔍 / 🛒 / 📦 / 👤 
      <Text style={styles.title}>Search</Text>  {/* Change title 
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary },
  sub: { fontSize: 14, color: colors.textLight, marginTop: 6 },
}); */ 

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';

// ── Dummy data (replace with real API/store later) ──────────────────────────
const PARTNER = { name: 'Ravi Patel', id: 'DP-00482', initials: 'RP' };

const METRICS = [
  { label: "Today's deliveries", value: '7',  sub: '+2 from yesterday' },
  { label: 'Earnings today',     value: '₹420', sub: '₹60 avg/delivery' },
  { label: 'Rating',             value: '4.8',  sub: 'Last 30 days' },
  { label: 'Acceptance rate',    value: '92%',  sub: 'Above target' },
];

const INITIAL_ORDERS = [
  {
    id: '#ORD-2841',
    status: 'new',
    pickup: 'Sharma Kirana',
    drop: 'Sector 12, B-44',
    meta: '1.2 km · ₹55 · 3 items',
  },
  {
    id: '#ORD-2839',
    status: 'transit',
    pickup: 'Green Grocers',
    drop: 'MG Road, Apt 7C',
    meta: '2.8 km · ₹70 · ETA 8 min',
  },
];

// ── Colors (white + green theme) ────────────────────────────────────────────
const C = {
  bg:           '#F5F7F5',
  white:        '#FFFFFF',
  primary:      '#2E7D32',       // deep green
  primaryLight: '#EAF3DE',       // light green bg
  primaryText:  '#27500A',       // dark green text
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

// ── Badge helper ─────────────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    new:       { bg: C.blueLight,    color: C.blueText,    label: 'New' },
    transit:   { bg: C.orange,       color: C.orangeText,  label: 'In transit' },
    accepted:  { bg: C.primaryLight, color: C.primaryText, label: 'Accepted' },
    delivered: { bg: C.primaryLight, color: C.primaryText, label: 'Delivered' },
    cancelled: { bg: C.redLight,     color: C.redText,     label: 'Cancelled' },
  };
  const s = map[status] || map.new;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

// ── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onAccept, onDecline, onDeliver }) {
  return (
    <View style={styles.orderCard}>
      {/* Top row */}
      <View style={styles.orderTop}>
        <Text style={styles.orderId}>{order.id}</Text>
        <Badge status={order.status} />
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: C.blue }]} />
        <Text style={styles.routeText}>{order.pickup}</Text>
        <View style={styles.routeLine} />
        <View style={[styles.dot, { backgroundColor: C.red }]} />
        <Text style={styles.routeText}>{order.drop}</Text>
      </View>

      {/* Bottom row */}
      <View style={styles.orderBottom}>
        <Text style={styles.orderMeta}>{order.meta}</Text>

        {order.status === 'new' && (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnOutline} onPress={() => onDecline(order.id)}>
              <Text style={styles.btnOutlineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => onAccept(order.id)}>
              <Text style={styles.btnPrimaryText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {order.status === 'accepted' && (
          <TouchableOpacity style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>Navigate ↗</Text>
          </TouchableOpacity>
        )}

        {order.status === 'transit' && (
          <TouchableOpacity style={styles.btnPrimary} onPress={() => onDeliver(order.id)}>
            <Text style={styles.btnPrimaryText}>Mark delivered ↗</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function ActiveDeliveryScreen() {
  const [isOnline, setIsOnline]   = useState(true);
  const [orders, setOrders]       = useState(INITIAL_ORDERS);
  const [deliveryCount, setDeliveryCount] = useState(7);
  const [earnings, setEarnings]   = useState(420);

  const handleAccept = (id) => {
    setOrders(prev =>
      prev.map(o => o.id === id ? { ...o, status: 'accepted' } : o)
    );
  };

  const handleDecline = (id) => {
    Alert.alert('Decline order?', 'This order will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => setOrders(prev => prev.filter(o => o.id !== id)),
      },
    ]);
  };

  const handleDeliver = (id) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    setDeliveryCount(c => c + 1);
    setEarnings(e => e + 65);
    Alert.alert('✅ Delivered!', 'Order marked as delivered. ₹65 added to earnings.');
  };

  const toggleOnline = () => setIsOnline(v => !v);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{PARTNER.initials}</Text>
          </View>
          <View>
            <Text style={styles.partnerName}>{PARTNER.name}</Text>
            <Text style={styles.partnerId}>Partner ID: {PARTNER.id}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusPill, isOnline ? styles.pillOnline : styles.pillOffline]}>
            <Text style={[styles.pillText, { color: isOnline ? C.primaryText : '#5F5E5A' }]}>
              ● {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: '#ccc', true: C.primary }}
            thumbColor={'#fff'}
          />
        </View>
      </View>

      {/* ── Metrics ── */}
      <View style={styles.metricsGrid}>
        {[
          { label: "Today's deliveries", value: String(deliveryCount), sub: '+2 from yesterday' },
          { label: 'Earnings today',     value: `₹${earnings}`,       sub: '₹60 avg/delivery' },
          { label: 'Rating',             value: '4.8',                 sub: 'Last 30 days' },
          { label: 'Acceptance rate',    value: '92%',                 sub: 'Above target' },
        ].map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricSub}>{m.sub}</Text>
          </View>
        ))}
      </View>

      {/* ── Map placeholder ── */}
      <View style={styles.mapBox}>
        <Text style={styles.mapPin}>📍</Text>
        <Text style={styles.mapLabel}>Live location tracking</Text>
      </View>

      {/* ── Active Orders ── */}
      <Text style={styles.sectionTitle}>Active orders</Text>

      {orders.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🛵</Text>
          <Text style={styles.emptyText}>No active orders right now</Text>
        </View>
      ) : (
        orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onDeliver={handleDeliver}
          />
        ))
      )}

    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },
  content:  { padding: 16, paddingBottom: 40 },

  // Top bar
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  avatarRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:       { width: 40, height: 40, borderRadius: 20, backgroundColor: C.blueLight, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 13, fontWeight: '600', color: C.blueText },
  partnerName:  { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  partnerId:    { fontSize: 11, color: C.textSecond, marginTop: 1 },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPill:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillOnline:   { backgroundColor: C.primaryLight },
  pillOffline:  { backgroundColor: '#F1EFE8' },
  pillText:     { fontSize: 11, fontWeight: '600' },

  // Metrics
  metricsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricCard:   { flex: 1, minWidth: '45%', backgroundColor: C.white, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: C.border },
  metricLabel:  { fontSize: 11, color: C.textSecond, marginBottom: 4 },
  metricValue:  { fontSize: 22, fontWeight: '600', color: C.textPrimary },
  metricSub:    { fontSize: 11, color: C.primary, marginTop: 2 },

  // Map
  mapBox:   { backgroundColor: C.white, borderRadius: 10, height: 90, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.border, marginBottom: 14 },
  mapPin:   { fontSize: 22, marginBottom: 4 },
  mapLabel: { fontSize: 11, color: C.textLight },

  // Section
  sectionTitle: { fontSize: 13, fontWeight: '600', color: C.textSecond, marginBottom: 10 },

  // Order card
  orderCard:  { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: C.border },
  orderTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId:    { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText:  { fontSize: 11, fontWeight: '600' },

  // Route
  routeRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dot:        { width: 7, height: 7, borderRadius: 4 },
  routeText:  { fontSize: 12, color: C.textPrimary, flexShrink: 1 },
  routeLine:  { flex: 1, height: 1, backgroundColor: C.border },

  // Order bottom
  orderBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderMeta:    { fontSize: 11, color: C.textLight },
  btnRow:       { flexDirection: 'row', gap: 8 },

  btnOutline:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 0.5, borderColor: C.border },
  btnOutlineText: { fontSize: 12, color: C.textPrimary, fontWeight: '500' },

  btnPrimary:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: C.primary },
  btnPrimaryText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  // Empty state
  emptyBox:   { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText:  { fontSize: 14, color: C.textLight },
});
