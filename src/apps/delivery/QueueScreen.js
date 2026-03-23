import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
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
  orange:       '#F59E0B',
  orangeLight:  '#FAEEDA',
  orangeText:   '#633806',
  red:          '#E24B4A',
  redLight:     '#FCEBEB',
  redText:      '#791F1F',
  textPrimary:  '#1A1A1A',
  textSecond:   '#666666',
  textLight:    '#999999',
  border:       '#E8EDE8',
};

// ── Dummy Queue Data ──────────────────────────────────────────────────────────
const INITIAL_QUEUE = [
  {
    id: '#ORD-2845',
    pickup: 'Sharma Kirana',
    drop: 'Sector 12, B-44',
    distance: '1.2 km',
    earning: '₹55',
    items: 3,
    eta: '5 min',
    priority: 'high',
    expiresIn: 30,
  },
  {
    id: '#ORD-2846',
    pickup: 'Green Grocers',
    drop: 'MG Road, Apt 7C',
    distance: '2.8 km',
    earning: '₹70',
    items: 5,
    eta: '10 min',
    priority: 'normal',
    expiresIn: 45,
  },
  {
    id: '#ORD-2847',
    pickup: 'Fresh Basket',
    drop: 'Park Street, C-11',
    distance: '0.9 km',
    earning: '₹45',
    items: 2,
    eta: '4 min',
    priority: 'normal',
    expiresIn: 25,
  },
  {
    id: '#ORD-2848',
    pickup: 'Vijay Fruits',
    drop: 'Hill Road, E-22',
    distance: '3.5 km',
    earning: '₹90',
    items: 8,
    eta: '14 min',
    priority: 'high',
    expiresIn: 60,
  },
];

// ── Priority Badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const isHigh = priority === 'high';
  return (
    <View style={[styles.badge, { backgroundColor: isHigh ? C.orangeLight : C.blueLight }]}>
      <Text style={[styles.badgeText, { color: isHigh ? C.orangeText : C.blueText }]}>
        {isHigh ? '🔥 High demand' : '🆕 New'}
      </Text>
    </View>
  );
}

// ── Timer Bar ─────────────────────────────────────────────────────────────────
function TimerBar({ seconds }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const pct = Math.max(0, (remaining / seconds) * 100);
  const barColor = pct > 50 ? C.primary : pct > 20 ? C.orange : C.red;

  return (
    <View style={styles.timerWrap}>
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.timerText, { color: barColor }]}>
        {remaining}s
      </Text>
    </View>
  );
}

// ── Queue Card ────────────────────────────────────────────────────────────────
function QueueCard({ order, onAccept, onDecline }) {
  return (
    <View style={styles.queueCard}>

      {/* Top row */}
      <View style={styles.cardTop}>
        <Text style={styles.orderId}>{order.id}</Text>
        <PriorityBadge priority={order.priority} />
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: C.blue }]} />
        <Text style={styles.routeText} numberOfLines={1}>{order.pickup}</Text>
        <View style={styles.routeLine} />
        <View style={[styles.dot, { backgroundColor: C.red }]} />
        <Text style={styles.routeText} numberOfLines={1}>{order.drop}</Text>
      </View>

      {/* Info pills */}
      <View style={styles.infoRow}>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillText}>📍 {order.distance}</Text>
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillText}>🕐 {order.eta}</Text>
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillText}>📦 {order.items} items</Text>
        </View>
        <View style={[styles.infoPill, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.infoPillText, { color: C.primaryText, fontWeight: '700' }]}>
            {order.earning}
          </Text>
        </View>
      </View>

      {/* Timer bar */}
      <TimerBar seconds={order.expiresIn} />

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.btnDecline}
          onPress={() => onDecline(order.id)}
        >
          <Text style={styles.btnDeclineText}>✕  Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnAccept}
          onPress={() => onAccept(order.id)}
        >
          <Text style={styles.btnAcceptText}>✓  Accept</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function QueueScreen() {
  const [queue, setQueue] = useState(INITIAL_QUEUE);
  const [accepted, setAccepted] = useState(0);
  const [declined, setDeclined] = useState(0);

  const handleAccept = (id) => {
    const order = queue.find(o => o.id === id);
    Alert.alert(
      '✅ Order Accepted!',
      `${order.id} from ${order.pickup} → ${order.drop}\nEarning: ${order.earning}`,
      [{ text: 'OK' }]
    );
    setQueue(prev => prev.filter(o => o.id !== id));
    setAccepted(a => a + 1);
  };

  const handleDecline = (id) => {
    Alert.alert('Decline order?', 'This order will be removed from your queue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => {
          setQueue(prev => prev.filter(o => o.id !== id));
          setDeclined(d => d + 1);
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Header ── */}
      <Text style={styles.screenTitle}>Order Queue</Text>
      <Text style={styles.screenSub}>Incoming orders waiting for your response</Text>

      {/* ── Session Stats ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{queue.length}</Text>
          <Text style={styles.statLabel}>In queue</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: C.primary }]}>{accepted}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: C.red }]}>{declined}</Text>
          <Text style={styles.statLabel}>Declined</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {accepted + declined === 0
              ? '—'
              : `${Math.round((accepted / (accepted + declined)) * 100)}%`}
          </Text>
          <Text style={styles.statLabel}>Accept rate</Text>
        </View>
      </View>

      {/* ── Queue Cards ── */}
      {queue.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🛵</Text>
          <Text style={styles.emptyTitle}>Queue is empty</Text>
          <Text style={styles.emptyText}>New orders will appear here when available</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>
            {queue.length} order{queue.length !== 1 ? 's' : ''} waiting
          </Text>
          {queue.map(order => (
            <QueueCard
              key={order.id}
              order={order}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          ))}
        </>
      )}

    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: C.bg },
  content:      { padding: 16, paddingBottom: 40 },

  screenTitle:  { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  screenSub:    { fontSize: 12, color: C.textLight, marginBottom: 14 },

  // Stats
  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard:     { flex: 1, backgroundColor: C.white, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: C.border },
  statValue:    { fontSize: 20, fontWeight: '700', color: C.textPrimary },
  statLabel:    { fontSize: 10, color: C.textSecond, marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: '600', color: C.textSecond, marginBottom: 10 },

  // Queue card
  queueCard:    { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: C.border },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId:      { fontSize: 13, fontWeight: '700', color: C.textPrimary },

  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText:    { fontSize: 11, fontWeight: '600' },

  // Route
  routeRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dot:          { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  routeText:    { fontSize: 12, color: C.textPrimary, flexShrink: 1, maxWidth: '35%' },
  routeLine:    { flex: 1, height: 1, backgroundColor: C.border },

  // Info pills
  infoRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  infoPill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: C.bg, borderWidth: 0.5, borderColor: C.border },
  infoPillText: { fontSize: 11, color: C.textSecond },

  // Timer
  timerWrap:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  timerTrack:   { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  timerFill:    { height: 4, borderRadius: 4 },
  timerText:    { fontSize: 11, fontWeight: '700', minWidth: 30, textAlign: 'right' },

  // Buttons
  btnRow:       { flexDirection: 'row', gap: 10 },
  btnDecline:   { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 0.5, borderColor: C.border, alignItems: 'center', backgroundColor: C.bg },
  btnDeclineText: { fontSize: 13, fontWeight: '600', color: C.red },
  btnAccept:    { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center' },
  btnAcceptText:{ fontSize: 13, fontWeight: '600', color: C.white },

  // Empty state
  emptyBox:     { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptyText:    { fontSize: 13, color: C.textLight, textAlign: 'center' },
});