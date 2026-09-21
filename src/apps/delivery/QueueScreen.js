import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Vibration, Animated, StatusBar, Platform,
} from 'react-native';
import { io } from 'socket.io-client';
import {
  useFonts,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import useAuthStore from '../../store/authStore';
import { useTranslation } from 'react-i18next';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

const C = {
  bg: '#F2F2F7',
  white: '#FFFFFF',
  green: '#50C878',
  greenDark: '#2EA85A',
  greenLight: '#E8F8EE',
  greenText: '#1A6B38',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  red: '#FF3B30',
  redLight: '#FFEAEA',
  redText: '#B91C1C',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  blueText: '#1D4ED8',
  amber: '#F59E0B',
  amberLight: '#FFFBEB',
  amberText: '#92400E',
};
// ── Sound helper ──────────────────────────────────────────────────────────────
// Migrated from expo-av to expo-audio (createAudioPlayer is the imperative API
// for on-demand sound playback outside of a React component lifecycle).
let currentSound = null;

async function playOrderSound() {
  try {
    const { Audio } = require('expo-av');
    if (!Audio || !Audio.Sound) return;
    const { sound } = await Audio.Sound.createAsync(
      require('../../../assets/sounds/new_order.mp3'),
      { shouldPlay: true, volume: 1.0 }
    );
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.didJustFinish) sound.unloadAsync();
    });
  } catch (_) { }
}

// ── Timer bar ─────────────────────────────────────────────────────────────────
function TimerBar({ seconds, onComplete }) {
  const [remaining, setRemaining] = useState(seconds);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (remaining <= 0) { onCompleteRef.current?.(); return; }
    const id = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const pct = Math.max(0, (remaining / seconds) * 100);
  const color = pct > 50 ? C.green : pct > 20 ? C.amber : C.red;

  return (
    <View style={tb.row}>
      <View style={tb.track}>
        <View style={[tb.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[tb.label, { color, fontFamily: 'PlusJakartaSans_800ExtraBold' }]}>
        {remaining}s
      </Text>
    </View>
  );
}

const tb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  track: { flex: 1, height: 5, backgroundColor: C.gray200, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  label: { fontSize: 12, minWidth: 32, textAlign: 'right' },
});

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, valueColor }) {
  return (
    <View style={sp.pill}>
      <Text style={[sp.value, valueColor && { color: valueColor }]}>{value}</Text>
      <Text style={sp.label}>{label}</Text>
    </View>
  );
}

const sp = StyleSheet.create({
  pill: {
    flex: 1, backgroundColor: C.white, borderRadius: 16, paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  value: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900, marginBottom: 2 },
  label: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },
});

// ── Queue card ────────────────────────────────────────────────────────────────
function QueueCard({ order, onAccept, onDecline, onIgnore, isAccepting }) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[qc.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Header */}
      <View style={qc.header}>
        <View>
          <Text style={qc.orderNum}>{order.orderNumber}</Text>
          <Text style={qc.orderSub}>{t('delivery.newDeliveryRequest', 'New delivery request')}</Text>
        </View>
        <View style={qc.newPill}>
          <View style={qc.newDot} />
          <Text style={qc.newPillText}>{t('delivery.live', 'LIVE')}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={qc.divider} />

      {/* Route: vendor → customer city */}
      <View style={qc.routeWrap}>
        <View style={qc.routeStop}>
          <View style={[qc.routeDot, { backgroundColor: C.blue }]} />
          <View style={{ flex: 1 }}>
            <Text style={qc.routeStopLabel}>{t('delivery.pickup', 'PICKUP')}</Text>
            <Text style={qc.routeStopName} numberOfLines={1}>{order.pickup?.name || '—'}</Text>
          </View>
        </View>
        <View style={qc.routeLineWrap}>
          <View style={qc.routeVertLine} />
        </View>
        <View style={qc.routeStop}>
          <View style={[qc.routeDot, { backgroundColor: C.red }]} />
          <View style={{ flex: 1 }}>
            <Text style={qc.routeStopLabel}>{t('delivery.drop', 'DROP')}</Text>
            <Text style={qc.routeStopName} numberOfLines={1}>
              {order.dropoff?.city || order.dropoff?.address || '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={qc.divider} />

      {/* Earning row */}
      <View style={qc.earningRow}>
        <View style={qc.earningBox}>
          <Text style={qc.earningLabel}>{t('delivery.yourEarning', 'YOUR EARNING')}</Text>
          <Text style={qc.earningValue}>₹{order.deliveryFee || 0}</Text>
        </View>
        <View style={[qc.earningBox, { borderLeftWidth: 1, borderLeftColor: C.gray200 }]}>
          <Text style={qc.earningLabel}>{t('delivery.orderValue', 'ORDER VALUE')}</Text>
          <Text style={[qc.earningValue, { color: C.gray700 }]}>₹{order.total || 0}</Text>
        </View>
      </View>

      {/*  Req will disappear after 15 minutes */}
      <TimerBar seconds={900} onComplete={() => onIgnore(order.orderId)} />

      {/* Buttons */}
      <View style={qc.btnRow}>
        <TouchableOpacity
          style={qc.btnDecline}
          onPress={() => onDecline(order.orderId)}
          activeOpacity={0.8}
        >
          <Text style={qc.btnDeclineText}>{t('delivery.decline', 'Decline')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[qc.btnAccept, isAccepting && { opacity: 0.7 }]}
          onPress={() => onAccept(order.orderId)}
          disabled={isAccepting}
          activeOpacity={0.85}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <Text style={qc.btnAcceptText}>{t('delivery.acceptOrder', 'Accept order')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const qc = StyleSheet.create({
  card: {
    backgroundColor: C.white, borderRadius: 20, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  orderNum: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900 },
  orderSub: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400, marginTop: 2 },
  newPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.greenLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  newDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  newPillText: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.greenText, letterSpacing: 0.8 },
  divider: { height: 1, backgroundColor: C.gray200, marginBottom: 14 },
  routeWrap: { marginBottom: 14 },
  routeStop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  routeStopLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray400, letterSpacing: 0.8 },
  routeStopName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray900, marginTop: 1 },
  routeLineWrap: { paddingLeft: 4, paddingVertical: 4 },
  routeVertLine: { width: 1.5, height: 14, backgroundColor: C.gray200, marginLeft: 3 },
  earningRow: { flexDirection: 'row', marginBottom: 14 },
  earningBox: { flex: 1, paddingVertical: 4 },
  earningLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray400, letterSpacing: 0.8, marginBottom: 4, paddingLeft: 2 },
  earningValue: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.green, paddingLeft: 2 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnDecline: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.gray200,
    alignItems: 'center', backgroundColor: C.white,
  },
  btnDeclineText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: C.red },
  btnAccept: {
    flex: 2, paddingVertical: 13, borderRadius: 14,
    backgroundColor: C.green, alignItems: 'center',
  },
  btnAcceptText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: C.white },
});

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={es.wrap}>
      <View style={es.dotWrap}>
        <Animated.View style={[es.ring, { transform: [{ scale: pulseAnim }] }]} />
        <View style={es.dot} />
      </View>
      <Text style={es.title}>{t('delivery.listeningForOrdersTitle', 'Listening for orders')}</Text>
      <Text style={es.sub}>{t('delivery.listeningForOrdersSub', "When a vendor dispatches an order your way,\nit'll appear here instantly.")}</Text>
      <View style={es.liveBadge}>
        <View style={es.liveDot} />
        <Text style={es.liveText}>{t('delivery.connectedLive', 'CONNECTED LIVE')}</Text>
      </View>
    </View>
  );
}

const es = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  ring: {
    position: 'absolute',
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: C.green, opacity: 0.35,
  },
  dotWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.greenLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.green },
  title: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900, marginBottom: 8 },
  sub: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.greenLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  liveText: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.greenText, letterSpacing: 1 },
});

// ════════════════════════════════════════════════════════════════════════════════
export default function QueueScreen({ navigation }) {
  const { token } = useAuthStore();
  const { t } = useTranslation();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [queue, setQueue] = useState([]);
  const [acceptingId, setAcceptingId] = useState(null);
  const socketRef = useRef(null);

  // Session stats — refs to survive socket re-renders, state to trigger re-render
  const acceptedRef = useRef(0);
  const declinedRef = useRef(0);
  const [sessionStats, setSessionStats] = useState({ accepted: 0, declined: 0 });

  // Fade-in animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    if (fontsLoaded) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();
    }
  }, [fontsLoaded]);

  // Socket
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('order:incoming', (data) => {
      setQueue(prev => {
        if (prev.find(o => o.orderId === data.orderId)) return prev;
        Vibration.vibrate([0, 200, 100, 200]);
        playOrderSound();
        return [data, ...prev];
      });
    });

    socket.on('order:assigned', (data) => {
      Vibration.vibrate([0, 200, 100, 200]);
      playOrderSound();
      fetchQueuedOrders();
    });

    socket.on('order:assigned_flash', (data) => {
      if (data.isQueued) {
        Vibration.vibrate([0, 200, 100, 200]);
        playOrderSound();
        fetchQueuedOrders();
      }
    });

    socket.on('order_assigned_to_delivery', (data) => {
      setQueue(prev => prev.filter(o => o.orderId !== data.order?.id));
    });

    socket.on('order:removed', (data) => {
      setQueue(prev => prev.filter(o => o.orderId !== data.orderId));
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);

  const fetchQueuedOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/delivery/queued`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.orders) {
        const mapped = data.data.orders.map((d) => ({
          orderId: d.orderId,
          orderNumber: d.orderNumber || `#${d.orderId}`,
          total: d.total,
          deliveryFee: d.deliveryFee,
          pickup: {
            name: d.pickup?.shop_name || '',
            latitude: d.pickup?.latitude,
            longitude: d.pickup?.longitude,
          },
          dropoff: {
            address: d.dropoff?.address_line || '',
            city: d.dropoff?.city || '',
          },
          items: d.items || [],
          itemCount: d.itemCount || 0,
          status: d.source === 'assigned' ? 'assigned' : 'available',
        }));
        setQueue((prev) => {
          const existingIds = new Set(prev.map((o) => o.orderId));
          const newOrders = mapped.filter((o) => o.orderId && !existingIds.has(o.orderId));
          return [...newOrders, ...prev];
        });
      }
    } catch (err) {
      console.log('[QueueScreen] fetchQueuedOrders error:', err);
    }
  };

  useEffect(() => {
    if (token) fetchQueuedOrders();
  }, [token]);

  const handleAccept = async (orderId) => {
    setAcceptingId(orderId);
    try {
      const res = await fetch(`${API_BASE}/delivery/accept/${orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setQueue(prev => prev.filter(o => o.orderId !== orderId));
        acceptedRef.current += 1;
        setSessionStats({ accepted: acceptedRef.current, declined: declinedRef.current });
        navigation?.navigate('Active');
      } else {
        setQueue(prev => prev.filter(o => o.orderId !== orderId));
      }
    } catch (_) {
      setQueue(prev => prev.filter(o => o.orderId !== orderId));
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDecline = async (orderId) => {
    console.log(`[QueueScreen] Declining order ${orderId}`);
    try {
      const res = await fetch(`${API_BASE}/delivery/decline/${orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log(`[QueueScreen] Decline response:`, JSON.stringify(data));
      if (!data.success) {
        console.log(`[QueueScreen] Decline FAILED:`, data.message);
      }
    } catch (err) {
      console.log('[QueueScreen] decline error:', err);
    }
    setQueue(prev => prev.filter(o => o.orderId !== orderId));
    declinedRef.current += 1;
    setSessionStats({ accepted: acceptedRef.current, declined: declinedRef.current });
  };

  const handleIgnore = async (orderId) => {
    try {
      await fetch(`${API_BASE}/delivery/ignore/${orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.log('[QueueScreen] ignore error:', err);
    }
    setQueue(prev => prev.filter(o => o.orderId !== orderId));
  };

  const acceptRate = sessionStats.accepted + sessionStats.declined === 0
    ? '—'
    : `${Math.round((sessionStats.accepted / (sessionStats.accepted + sessionStats.declined)) * 100)}%`;

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#228948" />

      {/* ── Green header ── */}
      <Animated.View style={[s.hero, { opacity: fadeAnim }]}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroTitle}>{t('delivery.orderQueue', 'Order Queue')}</Text>
            <Text style={s.heroSub}>
              {queue.length > 0
                ? `${queue.length} ${t('delivery.ordersWaiting', 'order(s) waiting')}`
                : t('delivery.listeningForOrders', 'Listening for incoming orders')}
            </Text>
          </View>
          <View style={s.livePill}>
            <View style={s.liveDotHero} />
            <Text style={s.livePillText}>{t('delivery.live', 'LIVE')}</Text>
          </View>
        </View>

        {/* Stats row inside hero */}
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{queue.length}</Text>
            <Text style={s.heroStatLabel}>{t('delivery.inQueue', 'In queue')}</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatValue, { color: '#A8F0C0' }]}>{sessionStats.accepted}</Text>
            <Text style={s.heroStatLabel}>{t('delivery.accepted', 'Accepted')}</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatValue, { color: '#FCA5A5' }]}>{sessionStats.declined}</Text>
            <Text style={s.heroStatLabel}>{t('delivery.declined', 'Declined')}</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{acceptRate}</Text>
            <Text style={s.heroStatLabel}>{t('delivery.acceptRate', 'Accept rate')}</Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Queue or empty ── */}
        {queue.length === 0 ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={s.emptyCard}>
              <EmptyState />
            </View>
          </Animated.View>
        ) : (
          queue.map(order => (
            <QueueCard
              key={order.orderId}
              order={order}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onIgnore={handleIgnore}
              isAccepting={acceptingId === order.orderId}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 },

  // Hero header
  hero: {
    backgroundColor: '#228948',
    paddingTop: Platform.OS === 'android' ? 36 : 58,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#FFFFFF', letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium',
    color: 'rgba(255,255,255,0.70)', marginTop: 4,
  },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  liveDotHero: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A8F0C0' },
  livePillText: {
    fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#FFFFFF', letterSpacing: 1,
  },

  // Stats inside hero
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 16, paddingVertical: 14,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: {
    fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#FFFFFF', marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 10, fontFamily: 'PlusJakartaSans_500Medium',
    color: 'rgba(255,255,255,0.60)',
  },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  emptyCard: {
    backgroundColor: C.white, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
});