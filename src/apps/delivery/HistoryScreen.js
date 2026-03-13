/*import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, radius } from '../../styles/spacing';
import { shadows } from '../../styles/shadows';

export default function SearchScreen() {  // Change name for each file
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🕐</Text>   {/* 🔍 / 🛒 / 📦 / 👤 
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
} from 'react-native';

// ── Colors (same white + green theme) ────────────────────────────────────────
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

// ── Dummy Data ────────────────────────────────────────────────────────────────
const TABS = ['Today', 'This Week', 'This Month'];

const HISTORY_DATA = {
  Today: [
    { id: '#ORD-2836', pickup: 'Sharma Kirana',  drop: 'Sector 12, B-44',  amount: 60,  time: '2:10 PM', status: 'delivered' },
    { id: '#ORD-2831', pickup: 'Green Grocers',  drop: 'MG Road, Apt 7C',  amount: 55,  time: '12:45 PM', status: 'delivered' },
    { id: '#ORD-2828', pickup: 'Fresh Basket',   drop: 'Park Street, C-11', amount: 75, time: '11:20 AM', status: 'delivered' },
    { id: '#ORD-2821', pickup: 'Raj Stores',     drop: 'Lake View, D-3',   amount: 50,  time: '10:05 AM', status: 'delivered' },
    { id: '#ORD-2815', pickup: 'Vijay Fruits',   drop: 'Hill Road, E-22',  amount: 60,  time: '9:30 AM',  status: 'cancelled' },
  ],
  'This Week': [
    { id: '#ORD-2800', pickup: 'Sharma Kirana',  drop: 'Sector 5, A-10',   amount: 65,  time: 'Mon 3:00 PM', status: 'delivered' },
    { id: '#ORD-2790', pickup: 'Fresh Basket',   drop: 'MG Road, Apt 2B',  amount: 80,  time: 'Mon 1:15 PM', status: 'delivered' },
    { id: '#ORD-2775', pickup: 'Green Grocers',  drop: 'Park Street, B-7', amount: 55,  time: 'Sun 4:30 PM', status: 'delivered' },
    { id: '#ORD-2760', pickup: 'Raj Stores',     drop: 'Lake View, C-9',   amount: 70,  time: 'Sun 2:00 PM', status: 'cancelled' },
    { id: '#ORD-2745', pickup: 'Vijay Fruits',   drop: 'Hill Road, A-14',  amount: 60,  time: 'Sat 11:00 AM', status: 'delivered' },
    { id: '#ORD-2730', pickup: 'Sharma Kirana',  drop: 'Sector 9, D-5',    amount: 75,  time: 'Sat 9:45 AM', status: 'delivered' },
  ],
  'This Month': [
    { id: '#ORD-2700', pickup: 'Fresh Basket',   drop: 'MG Road, Apt 5C',  amount: 90,  time: '10 Mar',  status: 'delivered' },
    { id: '#ORD-2680', pickup: 'Green Grocers',  drop: 'Park Street, A-3', amount: 65,  time: '9 Mar',   status: 'delivered' },
    { id: '#ORD-2660', pickup: 'Raj Stores',     drop: 'Lake View, B-11',  amount: 55,  time: '8 Mar',   status: 'cancelled' },
    { id: '#ORD-2640', pickup: 'Vijay Fruits',   drop: 'Hill Road, C-6',   amount: 70,  time: '7 Mar',   status: 'delivered' },
    { id: '#ORD-2620', pickup: 'Sharma Kirana',  drop: 'Sector 3, E-2',    amount: 80,  time: '6 Mar',   status: 'delivered' },
    { id: '#ORD-2600', pickup: 'Fresh Basket',   drop: 'MG Road, Apt 1A',  amount: 60,  time: '5 Mar',   status: 'delivered' },
    { id: '#ORD-2580', pickup: 'Green Grocers',  drop: 'Park Street, D-9', amount: 75,  time: '4 Mar',   status: 'delivered' },
  ],
};

const EARNINGS_DATA = {
  Today:        { total: '₹300',  base: '₹240',  tips: '₹40',  bonus: '₹20',  deductions: '₹0' },
  'This Week':  { total: '₹2,340', base: '₹1,800', tips: '₹340', bonus: '₹200', deductions: '₹0' },
  'This Month': { total: '₹9,810', base: '₹7,200', tips: '₹1,560', bonus: '₹1,050', deductions: '₹0' },
};

const SUMMARY_DATA = {
  Today:        { deliveries: 4, cancelled: 1, km: '12.4' },
  'This Week':  { deliveries: 34, cancelled: 3, km: '98.2' },
  'This Month': { deliveries: 127, cancelled: 8, km: '389.5' },
};

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const isDelivered = status === 'delivered';
  return (
    <View style={[styles.badge, { backgroundColor: isDelivered ? C.primaryLight : C.redLight }]}>
      <Text style={[styles.badgeText, { color: isDelivered ? C.primaryText : C.redText }]}>
        {isDelivered ? '✓ Delivered' : '✕ Cancelled'}
      </Text>
    </View>
  );
}

// ── History Row Card ──────────────────────────────────────────────────────────
function HistoryCard({ order }) {
  const isDelivered = order.status === 'delivered';
  return (
    <View style={styles.historyCard}>
      <View style={styles.cardTop}>
        <Text style={styles.orderId}>{order.id}</Text>
        <Text style={[styles.amount, { color: isDelivered ? C.primary : C.red }]}>
          {isDelivered ? `+₹${order.amount}` : '—'}
        </Text>
      </View>

      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: C.blue }]} />
        <Text style={styles.routeText} numberOfLines={1}>{order.pickup}</Text>
        <View style={styles.routeLine} />
        <View style={[styles.dot, { backgroundColor: C.red }]} />
        <Text style={styles.routeText} numberOfLines={1}>{order.drop}</Text>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.timeText}>🕐 {order.time}</Text>
        <StatusBadge status={order.status} />
      </View>
    </View>
  );
}

// ── Earnings Row ──────────────────────────────────────────────────────────────
function EarningsRow({ label, value, isBonus, isDanger, isLast }) {
  return (
    <View style={[styles.earningsRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.earningsLabel}>{label}</Text>
      <Text style={[
        styles.earningsValue,
        isBonus && { color: C.primary },
        isDanger && { color: C.red },
      ]}>
        {value}
      </Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState('Today');

  const orders   = HISTORY_DATA[activeTab];
  const earnings = EARNINGS_DATA[activeTab];
  const summary  = SUMMARY_DATA[activeTab];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

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
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Summary Cards ── */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.deliveries}</Text>
          <Text style={styles.summaryLabel}>Deliveries</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: C.red }]}>{summary.cancelled}</Text>
          <Text style={styles.summaryLabel}>Cancelled</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.km}</Text>
          <Text style={styles.summaryLabel}>km covered</Text>
        </View>
      </View>

      {/* ── Earnings Breakdown ── */}
      <View style={styles.earningsBox}>
        <View style={styles.earningsHeader}>
          <Text style={styles.sectionTitle}>Earnings breakdown</Text>
          <Text style={styles.earningsTotal}>{earnings.total}</Text>
        </View>
        <EarningsRow label="Base pay"         value={earnings.base} />
        <EarningsRow label="Tips"             value={earnings.tips} isBonus />
        <EarningsRow label="Peak hour bonus"  value={earnings.bonus} isBonus />
        <EarningsRow label="Deductions"       value={earnings.deductions} isDanger isLast />
      </View>

      {/* ── Orders List ── */}
      <Text style={styles.sectionTitle}>
        {activeTab === 'Today' ? "Today's orders" : `${activeTab}'s orders`}
      </Text>

      {orders.map(order => (
        <HistoryCard key={order.id} order={order} />
      ))}

    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: C.bg },
  content:      { padding: 16, paddingBottom: 40 },

  screenTitle:  { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 14 },

  // Tabs
  tabsRow:      { flexDirection: 'row', gap: 6, marginBottom: 14 },
  tab:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: 'transparent' },
  tabActive:    { backgroundColor: C.white, borderColor: C.border },
  tabText:      { fontSize: 12, color: C.textSecond },
  tabTextActive:{ fontWeight: '600', color: C.textPrimary },

  // Summary
  summaryRow:   { flexDirection: 'row', gap: 10, marginBottom: 14 },
  summaryCard:  { flex: 1, backgroundColor: C.white, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: C.border },
  summaryValue: { fontSize: 22, fontWeight: '700', color: C.primary },
  summaryLabel: { fontSize: 11, color: C.textSecond, marginTop: 2 },

  // Earnings box
  earningsBox:    { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 0.5, borderColor: C.border },
  earningsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  earningsTotal:  { fontSize: 18, fontWeight: '700', color: C.primary },
  earningsRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.border },
  earningsLabel:  { fontSize: 13, color: C.textSecond },
  earningsValue:  { fontSize: 13, fontWeight: '600', color: C.textPrimary },

  sectionTitle:   { fontSize: 13, fontWeight: '600', color: C.textSecond, marginBottom: 10 },

  // History card
  historyCard:  { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: C.border },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId:      { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  amount:       { fontSize: 14, fontWeight: '700' },

  // Route
  routeRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dot:          { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  routeText:    { fontSize: 12, color: C.textPrimary, flexShrink: 1, maxWidth: '35%' },
  routeLine:    { flex: 1, height: 1, backgroundColor: C.border },

  cardBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText:     { fontSize: 11, color: C.textLight },

  // Badge
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText:    { fontSize: 11, fontWeight: '600' },
});