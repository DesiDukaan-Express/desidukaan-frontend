import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { io } from 'socket.io-client';
import useAuthStore from '../../store/authStore';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

// ── Colors ────────────────────────────────────────────────────────────────────
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

// ── Priority Badge ────────────────────────────────────────────────────────────
function PriorityBadge({ label }) {
  return (
    <View style={[styles.badge, { backgroundColor: C.blueLight }]}>
      <Text style={[styles.badgeText, { color: C.blueText }]}>🆕 {label}</Text>
    </View>
  );
}

// ── Timer Bar ─────────────────────────────────────────────────────────────────
function TimerBar({ seconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire && onExpire();
      return;
    }
    const interval = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  const pct = Math.max(0, (remaining / seconds) * 100);
  const barColor = pct > 50 ? C.primary : pct > 20 ? C.orange : C.red;

  return (
    <View style={styles.timerWrap}>
      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.timerText, { color: barColor }]}>{remaining}s</Text>
    </View>
  );
}

// ── Queue Card ────────────────────────────────────────────────────────────────
function QueueCard({ order, onAccept, onDecline }) {
  return (
    <View style={styles.queueCard}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <Text style={styles.orderId}>{order.orderNumber}</Text>
        <PriorityBadge label="New Order" />
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: C.blue }]} />
        <Text style={styles.routeText} numberOfLines={1}>{order.pickup?.name}</Text>
        <View style={styles.routeLine} />
        <View style={[styles.dot, { backgroundColor: C.red }]} />
        <Text style={styles.routeText} numberOfLines={1}>{order.dropoff?.city || order.dropoff?.address}</Text>
      </View>

      {/* Info pills */}
      <View style={styles.infoRow}>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillText}>📍 {order.pickup?.address}</Text>
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillText}>📦 {order.itemCount} items</Text>
        </View>
        <View style={[styles.infoPill, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.infoPillText, { color: C.primaryText, fontWeight: '700' }]}>
            ₹{order.deliveryFee} fee
          </Text>
        </View>
        <View style={styles.infoPill}>
          <Text style={styles.infoPillText}>🛒 ₹{order.total} total</Text>
        </View>
      </View>

      {/* Timer bar — 60 seconds to decide */}
      <TimerBar seconds={60} onExpire={() => onDecline(order.orderId)} />

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btnDecline} onPress={() => onDecline(order.orderId)}>
          <Text style={styles.btnDeclineText}>✕  Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnAccept} onPress={() => onAccept(order.orderId)}>
          <Text style={styles.btnAcceptText}>✓  Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function QueueScreen() {
  const { token } = useAuthStore();
  const [queue, setQueue] = useState([]);
  const [accepted, setAccepted] = useState(0);
  const [declined, setDeclined] = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);

  // ── Connect socket to listen for incoming orders ──
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log('QueueScreen socket connected'));

    // Real-time: vendor broadcasts auto-assign to this partner
    socket.on('order:incoming', (data) => {
      setQueue(prev => {
        // Avoid duplicate entries
        if (prev.find(o => o.orderId === data.orderId)) return prev;
        return [data, ...prev];
      });
    });

    // If someone else accepts this order, remove from queue
    socket.on('order_assigned_to_delivery', (data) => {
      setQueue(prev => prev.filter(o => o.orderId !== data.order?.id));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const handleAccept = async (orderId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/delivery/accept/${orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setQueue(prev => prev.filter(o => o.orderId !== orderId));
        setAccepted(a => a + 1);
        Alert.alert('✅ Order Accepted!', 'Head to the pickup location.');
      } else {
        Alert.alert('Error', data.message || 'Could not accept order');
        // Remove from queue if it's no longer available
        setQueue(prev => prev.filter(o => o.orderId !== orderId));
      }
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = (orderId) => {
    setQueue(prev => prev.filter(o => o.orderId !== orderId));
    setDeclined(d => d + 1);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <Text style={styles.screenTitle}>Order Queue</Text>
      <Text style={styles.screenSub}>
        {queue.length > 0 ? 'New orders waiting for your response' : 'Listening for incoming orders...'}
      </Text>

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
      {loading && (
        <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 8 }} />
      )}

      {queue.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🛵</Text>
          <Text style={styles.emptyTitle}>Queue is empty</Text>
          <Text style={styles.emptyText}>
            When a vendor auto-assigns, orders will appear here in real-time
          </Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LISTENING LIVE</Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>
            {queue.length} order{queue.length !== 1 ? 's' : ''} waiting
          </Text>
          {queue.map(order => (
            <QueueCard
              key={order.orderId}
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
  emptyText:    { fontSize: 13, color: C.textLight, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  liveBadge:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  liveDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, marginRight: 6 },
  liveText:     { fontSize: 11, fontWeight: '800', color: C.primaryText, letterSpacing: 1 },
});