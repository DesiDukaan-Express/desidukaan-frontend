import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Switch, Animated,
  StatusBar, Platform, Modal, Pressable, TextInput, Alert,
} from 'react-native';
import Svg, { G, Path, Rect, Circle, Ellipse, Polygon } from 'react-native-svg';
import { io } from 'socket.io-client';
import { useFocusEffect } from '@react-navigation/native';
import {
  useFonts,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import IncomingOrderSheet from '../../components/IncomingOrderSheet';

const API_BASE   = process.env.EXPO_PUBLIC_API_URL    || 'http://localhost:3000/api';
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

const C = {
  heroBg:      '#B8EFC8',   // lighter tint of #50C878 for hero bg
  green:       '#50C878',
  greenSwitch: '#50C878',
  greenDark:   '#2EA85A',   // darker shade for text on light bg
  white:       '#FFFFFF',
  bg:          '#F2F2F7',
  card:        '#FFFFFF',
  gray100:     '#F3F4F6',
  gray200:     '#E5E7EB',
  gray300:     '#D1D5DB',
  gray400:     '#9CA3AF',
  gray500:     '#6B7280',
  gray700:     '#374151',
  gray800:     '#1F2937',
  gray900:     '#111827',
  red:         '#FF3B30',
  pink:        '#FF2D92',
  pinkLight:   '#FFF0F7',
};

function getLevelFromDeliveries(total) {
  if (total >= 500) return 5;
  if (total >= 200) return 4;
  if (total >= 100) return 3;
  if (total >= 30)  return 2;
  return 1;
}

// ── SVG Scooter Illustration ──────────────────────────────────────────────────
function ScooterIllustration({ width = 180, height = 160 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 210 185">
      <Ellipse cx="115" cy="162" rx="68" ry="9" fill="rgba(0,0,0,0.10)" />
      <Rect x="108" y="36" width="58" height="50" rx="5" fill="#1C1C1E" />
      <Polygon points="108,36 132,22 166,22 142,36" fill="#2C2C2E" />
      <Polygon points="166,22 166,72 142,72 142,36" fill="#141414" />
      <Circle cx="135" cy="54" r="9" fill="#0EE627" />
      <Circle cx="135" cy="52" r="3.5" fill="#FFFFFF" />
      <Path d="M135 60 L135 68" stroke="#0EE627" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <Path d="M55 112 Q50 90 72 82 L132 80 Q148 80 153 96 L158 112 Z" fill="#F5C542" />
      <Path d="M50 112 L162 112 L157 122 L55 122 Z" fill="#E6B32A" />
      <Rect x="86" y="73" width="52" height="13" rx="6.5" fill="#2C2C2E" />
      <Rect x="54" y="113" width="40" height="7" rx="3.5" fill="#D4A520" />
      <Rect x="144" y="65" width="9" height="22" rx="4" fill="#555555" />
      <Rect x="136" y="63" width="26" height="6" rx="3" fill="#2C2C2E" />
      <Circle cx="76" cy="130" r="24" fill="#2C2C2E" />
      <Circle cx="76" cy="130" r="15" fill="#555555" />
      <Circle cx="76" cy="130" r="6" fill="#F5C542" />
      <Path d="M76 115 L76 145" stroke="#666" strokeWidth="1.5" fill="none" />
      <Path d="M61 130 L91 130" stroke="#666" strokeWidth="1.5" fill="none" />
      <Path d="M65 119 L87 141" stroke="#666" strokeWidth="1.2" fill="none" />
      <Path d="M87 119 L65 141" stroke="#666" strokeWidth="1.2" fill="none" />
      <Circle cx="150" cy="130" r="22" fill="#2C2C2E" />
      <Circle cx="150" cy="130" r="13" fill="#555555" />
      <Circle cx="150" cy="130" r="5" fill="#F5C542" />
      <Path d="M150 117 L150 143" stroke="#666" strokeWidth="1.5" fill="none" />
      <Path d="M137 130 L163 130" stroke="#666" strokeWidth="1.5" fill="none" />
      <Path d="M102 80 Q94 92 88 100" stroke="#3B4ABF" strokeWidth="9" strokeLinecap="round" fill="none" />
      <Path d="M118 80 Q120 93 122 100" stroke="#3B4ABF" strokeWidth="9" strokeLinecap="round" fill="none" />
      <Ellipse cx="86" cy="103" rx="8" ry="4.5" fill="#1C1C1E" />
      <Ellipse cx="124" cy="103" rx="8" ry="4.5" fill="#1C1C1E" />
      <Path d="M100 58 Q95 72 97 82 L122 82 Q127 70 120 56 Z" fill="#2E7D32" />
      <Path d="M100 63 Q88 68 84 76" stroke="#2E7D32" strokeWidth="9" strokeLinecap="round" fill="none" />
      <Path d="M118 63 Q134 66 142 70" stroke="#2E7D32" strokeWidth="9" strokeLinecap="round" fill="none" />
      <Rect x="107" y="46" width="9" height="13" rx="4.5" fill="#FFCC99" />
      <Circle cx="111" cy="40" r="15" fill="#FFCC99" />
      <Path d="M96 38 Q96 20 111 18 Q126 18 126 38 Q120 33 111 33 Q102 33 96 38 Z" fill="#F5C542" />
      <Rect x="96" y="37" width="30" height="7" rx="3.5" fill="#D4A520" />
      <Rect x="99" y="38" width="24" height="5" rx="2.5" fill="rgba(0,0,0,0.25)" />
      <Circle cx="106" cy="42" r="2.2" fill="#333" />
      <Circle cx="116" cy="42" r="2.2" fill="#333" />
      <Path d="M108 48 Q111 52 114 48" stroke="#AA7755" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Svg>
  );
}
function ScooterOfflineIllustration({ width = 180, height = 160 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 210 185">
      <Ellipse cx="115" cy="162" rx="68" ry="9" fill="rgba(0,0,0,0.10)" />
      {/* Body / fairing — red tones */}
      <Path d="M55 112 Q50 90 72 82 L132 80 Q148 80 153 96 L158 112 Z" fill="#EF4444" />
      <Path d="M50 112 L162 112 L157 122 L55 122 Z" fill="#DC2626" />
      {/* Seat / handlebar area */}
      <Rect x="86" y="73" width="52" height="13" rx="6.5" fill="#2C2C2E" />
      <Rect x="54" y="113" width="40" height="7" rx="3.5" fill="#B91C1C" />
      <Rect x="144" y="65" width="9" height="22" rx="4" fill="#555555" />
      <Rect x="136" y="63" width="26" height="6" rx="3" fill="#2C2C2E" />
      {/* Front wheel */}
      <Circle cx="76" cy="130" r="24" fill="#2C2C2E" />
      <Circle cx="76" cy="130" r="15" fill="#555555" />
      <Circle cx="76" cy="130" r="6" fill="#EF4444" />
      <Path d="M76 115 L76 145" stroke="#666" strokeWidth="1.5" fill="none" />
      <Path d="M61 130 L91 130" stroke="#666" strokeWidth="1.5" fill="none" />
      <Path d="M65 119 L87 141" stroke="#666" strokeWidth="1.2" fill="none" />
      <Path d="M87 119 L65 141" stroke="#666" strokeWidth="1.2" fill="none" />
      {/* Rear wheel */}
      <Circle cx="150" cy="130" r="22" fill="#2C2C2E" />
      <Circle cx="150" cy="130" r="13" fill="#555555" />
      <Circle cx="150" cy="130" r="5" fill="#EF4444" />
      <Path d="M150 117 L150 143" stroke="#666" strokeWidth="1.5" fill="none" />
      <Path d="M137 130 L163 130" stroke="#666" strokeWidth="1.5" fill="none" />
      {/* Footpeg bars */}
      <Path d="M102 80 Q94 92 88 100" stroke="#6B7280" strokeWidth="9" strokeLinecap="round" fill="none" />
      <Path d="M118 80 Q120 93 122 100" stroke="#6B7280" strokeWidth="9" strokeLinecap="round" fill="none" />
      <Ellipse cx="86" cy="103" rx="8" ry="4.5" fill="#1C1C1E" />
      <Ellipse cx="124" cy="103" rx="8" ry="4.5" fill="#1C1C1E" />
      {/* Offline X mark on side */}
      <Circle cx="111" cy="60" r="18" fill="#7F1D1D" />
      <Path d="M103 52 L119 68" stroke="#FECACA" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <Path d="M119 52 L103 68" stroke="#FECACA" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

// ── Transaction Row ────────────────────────────────────────────────────────────
function TxRow({ item, isLast }) {
  const date    = new Date(item.delivered_at || item.created_at);
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const today   = new Date().toDateString() === date.toDateString() ? 'Today, ' : '';
  const rawTitle = item.description || (item.order_number ? `Single Delivery · ${item.order_number}` : 'Delivery completed');
  const dist    = item.distance_km != null ? ` · ${Number(item.distance_km).toFixed(1)} km` : '';
  const isTip   = rawTitle.toLowerCase().includes('tip');
  const isBatch = rawTitle.toLowerCase().includes('batch');

  return (
    <View>
      <View style={tx.row}>
        <View style={[tx.icon, isTip && { backgroundColor: '#FFF0F7' }]}>
          <Text style={[tx.iconChar, isTip && { color: '#FF2D92' }]}>
            {isTip ? '♥' : isBatch ? '↙' : '↓'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={tx.title} numberOfLines={1}>{rawTitle.toUpperCase()}</Text>
          <Text style={tx.sub}>{today}{timeStr}{dist}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={tx.amt}>
            + ₹{Number(item.partner_earnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          {item.tip_amount > 0 && (
            <Text style={tx.tip}>+ ₹{Number(item.tip_amount).toFixed(2)} Tips</Text>
          )}
        </View>
      </View>
      {!isLast && <View style={tx.divider} />}
    </View>
  );
}

const tx = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  icon:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  iconChar: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: '#4B5563' },
  title:    { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#111827', letterSpacing: 0.2 },
  sub:      { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: '#9CA3AF', marginTop: 2 },
  amt:      { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#111827' },
  tip:      { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: '#9CA3AF', marginTop: 2 },
  divider:  { height: 1, backgroundColor: '#F3F4F6' },
});

// ── Stat Column ────────────────────────────────────────────────────────────────
function StatCol({ label, value, noBorder }) {
  return (
    <View style={[s.statCol, !noBorder && { borderRightWidth: 1, borderRightColor: C.gray200 }]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function DeliveryHomeScreen({ navigation, route }) {
  const { token, user } = useAuthStore();
  const { t } = useTranslation();

  const [partnerReviewOrder, setPartnerReviewOrder] = useState(null);
  const [partnerReviewRating, setPartnerReviewRating] = useState(0);
  const [partnerReviewComment, setPartnerReviewComment] = useState("");
  const [partnerReviewLoading, setPartnerReviewLoading] = useState(false);

  useEffect(() => {
    if (route?.params?.reviewOrder) {
      setPartnerReviewOrder(route.params.reviewOrder);
      setPartnerReviewRating(0);
      setPartnerReviewComment("");
      navigation.setParams({ reviewOrder: null });
    }
  }, [route?.params?.reviewOrder]);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [stats, setStats] = useState(null);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling,     setToggling]     = useState(false);
  const [incomingOrder, setIncomingOrder] = useState(null);
  const socketRef = useRef(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(22)).current;
  const heroBgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading && fontsLoaded) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, fontsLoaded]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${API_BASE}/delivery/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
  setStats(data.data);
  Animated.timing(heroBgAnim, {
    toValue: data.data.isAvailable ? 0 : 1,
    duration: 400,
    useNativeDriver: false,
  }).start();
}
    } catch (e) {
      console.log('Stats error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${API_BASE}/delivery/history?limit=3`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
  const deliveries = Array.isArray(data.data)
    ? data.data
    : (data.data?.deliveries || []);
  setRecentDeliveries(deliveries);
}
    } catch (e) {
      console.log('History error', e);
    }
  }, [token]);

  useEffect(() => { fetchStats(); fetchHistory(); }, [fetchStats, fetchHistory]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socket.on('delivery_status_update', () => { fetchStats(); fetchHistory(); });
    socket.on('new_delivery_request', fetchStats);
    socket.on('order:incoming', (data) => setIncomingOrder(data));
    socket.on('order:removed', (data) => {
      setIncomingOrder(prev => prev?.orderId === data.orderId ? null : prev);
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);

  const toggleAvailability = async () => {
    if (toggling || !stats) return;
    const next = !stats.isAvailable;
    setToggling(true);
    setStats(s => ({ ...s, isAvailable: next }));
    Animated.timing(heroBgAnim, {
      toValue: next ? 0 : 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
    try {
      await fetch(`${API_BASE}/delivery/toggle-availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_available: next }),
      });
      if (next) {
        // Send default/current location if online so nearby query picks rider up
        const lat = 28.6139; // Delhi / NCR default fallback or navigator geolocation
        const lng = 77.2090;
        navigator.geolocation?.getCurrentPosition(
          (pos) => {
            fetch(`${API_BASE}/delivery/location`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            }).catch(() => {});
          },
          () => {
            fetch(`${API_BASE}/delivery/location`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ latitude: lat, longitude: lng }),
            }).catch(() => {});
          }
        );
      }
    } catch {
      setStats(s => ({ ...s, isAvailable: !next }));
    } finally {
      setToggling(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchStats(); fetchHistory(); };

  const handleAcceptIncoming = async () => {
    if (!incomingOrder) return;
    try {
      const res = await fetch(`${API_BASE}/delivery/accept/${incomingOrder.orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setIncomingOrder(null);
        fetchStats();
        navigation?.navigate('Active');
      } else {
        setIncomingOrder(null);
      }
    } catch { setIncomingOrder(null); }
  };

  const handleDeclineIncoming = () => setIncomingOrder(null);

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.heroBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  // Safe destructure with zero-fallbacks — nothing hardcoded
  const {
    todayEarnings    = 0,
    todayDeliveries  = 0,
    totalDeliveries  = 0,
    completionRate,
    acceptanceRate,
    totalDistanceKm  = null,
    rating           = null,
    isAvailable      = false,
    pendingOrders    = 0,
  } = stats || {};

  const firstName = user?.name?.trim().split(' ')[0] || 'Partner';
  const level     = getLevelFromDeliveries(totalDeliveries);

  const displayCompletionRate = completionRate != null
    ? `${completionRate}%`
    : acceptanceRate != null
      ? `${acceptanceRate}%`
      : '—';

  const displayDistance = totalDistanceKm != null
    ? `${Math.round(totalDistanceKm)} km`
    : '—';

  const totalRatings = stats?.totalRatings ?? 0;
  const displayRating = totalRatings > 0
    ? `${Number(rating || 0).toFixed(1)} ★`
    : '— ★';

  const displayEarnings = todayEarnings.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.heroBg} />
      <IncomingOrderSheet
        order={incomingOrder}
        onAccept={handleAcceptIncoming}
        onDecline={handleDeclineIncoming}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />
        }
      >
        {/* ══ HERO ════════════════════════════════════════════════════════ */}
        <Animated.View style={[s.hero, {
          backgroundColor: heroBgAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['#228948', '#B91C1C'],
          }),
        }]}>
          <View style={s.heroLeft}>
            {/* Shield + level */}
            <View style={s.shieldRow}>
              <View style={s.shieldWrap}>
                <Svg width={20} height={22} viewBox="0 0 20 22">
                  <Path d="M10 0 L20 4 L20 11 Q20 17 10 22 Q0 17 0 11 L0 4 Z" fill={C.greenDark} />
                </Svg>
                <Text style={s.shieldNum}>{level}</Text>
              </View>
              <View style={s.levelPill}>
                <Text style={s.levelPillText}>Level {level}</Text>
              </View>
            </View>

            <Text style={s.heroName}>Partner {firstName}</Text>
            <Text style={s.earningsLabel}>{t('delivery.totalEarningsLabel')}</Text>
            <View style={s.earningsRow}>
              <Text style={s.earningsCurrency}>₹</Text>
              <Text style={s.earningsAmt}>{displayEarnings}</Text>
            </View>

            {/* Sparkline dots */}
            <View style={s.sparkRow}>
              {[0, 1, 2, 3, 4].map(i => (
                <View key={i} style={[s.dot, i === 4 && s.dotActive]} />
              ))}
            </View>
          </View>

          <View style={s.heroRight}>
            {isAvailable ? (
              <ScooterIllustration width={180} height={162} />
            ) : (
              <ScooterOfflineIllustration width={180} height={162} />
            )}
          </View>
        </Animated.View>

        {/* ══ BODY ════════════════════════════════════════════════════════ */}
        <Animated.View style={[s.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* ── Status toggle ── */}
          <View style={s.card}>
            <View style={s.statusRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.statusTitle}>
                  {isAvailable ? t('delivery.statusOnline') : t('delivery.statusOffline')}
                </Text>
                <Text style={s.statusSub}>
                  {isAvailable ? t('delivery.availableForDeliveries') : t('delivery.goOnlineToReceive')}
                </Text>
              </View>
              <Switch
                value={isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ false: C.gray300, true: C.greenSwitch }}
                thumbColor={C.white}
                ios_backgroundColor={C.gray300}
                disabled={toggling}
              />
            </View>
          </View>

          {/* ── Active orders ── */}
          <View style={s.card}>
            <View style={s.ordersRow}>
              <View style={s.bagWrap}>
                <Svg width={70} height={74} viewBox="0 0 70 74">
                  <Path d="M8 24 Q6 20 10 18 L60 18 Q64 20 62 24 L58 64 Q57 68 52 68 L18 68 Q13 68 12 64 Z" fill="#F4A93A" />
                  <Path d="M10 18 Q8 12 16 10 L54 10 Q62 12 60 18 Z" fill="#E69520" />
                  <Path d="M26 30 L26 54 M22 30 L22 38 Q22 44 26 44" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <Path d="M40 30 L40 54 M36 30 Q36 36 40 38" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <Path d="M14 26 Q14 22 18 22 L18 32 Q14 32 14 26 Z" fill="rgba(255,255,255,0.18)" />
                </Svg>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.activePill}>
                  <Text style={s.activePillText}>{t('delivery.activeOrders')}</Text>
                  <Svg width={18} height={13} viewBox="0 0 20 14">
                    <Circle cx="4" cy="11" r="3" fill="#FF3B30" />
                    <Circle cx="16" cy="11" r="3" fill="#FF3B30" />
                    <Path d="M6 8 Q8 3 13 3 L16 3 L16 8 Z" fill="#FF3B30" />
                    <Path d="M2 8 L15 8" stroke="#FF3B30" strokeWidth="1.5" fill="none" />
                  </Svg>
                </View>
                <Text style={s.ordersCount}>
                  {pendingOrders} {t('delivery.deliveryOrdersFound')}
                </Text>
                <TouchableOpacity
                  style={s.viewDetailsBtn}
                  onPress={() => navigation?.navigate('Queue')}
                  activeOpacity={0.8}
                >
                  <Text style={s.viewDetailsBtnText}>{t('delivery.viewDetails')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Performance stats ── */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>{t('delivery.performanceStats')}</Text>
            <View style={s.statsGrid}>
              <StatCol label={t('delivery.totalDeliveriesLabel')}   value={String(totalDeliveries)} />
              <StatCol label={t('delivery.completionRateLabel')}    value={displayCompletionRate} />
              <StatCol label={t('delivery.distanceCoveredLabel')}   value={displayDistance} />
              <StatCol label={t('delivery.profileRatingLabel')}     value={displayRating} noBorder />
            </View>
          </View>

          {/* ── Recent transactions ── */}
          <View style={s.txHeader}>
            <Text style={s.txTitle}>{t('delivery.recentTransactions')}</Text>
            <TouchableOpacity onPress={() => navigation?.navigate('History')} activeOpacity={0.7}>
              <Text style={s.txLink}>{t('delivery.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.txCard}>
            {recentDeliveries.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 }}>
                  {t('delivery.noDeliveriesYet')}
                </Text>
              </View>
            ) : (
              recentDeliveries.map((item, idx) => (
                <TxRow
                  key={item.id || idx}
                  item={item}
                  isLast={idx === recentDeliveries.length - 1}
                />
              ))
            )}
          </View>

        </Animated.View>
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── PARTNER REVIEW CUSTOMER MODAL ── */}
      <Modal
        visible={!!partnerReviewOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setPartnerReviewOrder(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setPartnerReviewOrder(null)}
        >
          <Pressable
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
            onPress={() => {}}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#E2E8F0",
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: "#111827",
                marginBottom: 4,
              }}
            >
              Rate Customer
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>
              {partnerReviewOrder?.customerName || "Customer"}
            </Text>

            {/* Star picker */}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginBottom: 20,
                justifyContent: "center",
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setPartnerReviewRating(star)}
                >
                  <Text
                    style={{
                      fontSize: 36,
                      opacity: star <= partnerReviewRating ? 1 : 0.25,
                    }}
                  >
                    ⭐
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Comment input */}
            <TextInput
              style={{
                backgroundColor: "#F3F4F6",
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                color: "#111827",
                minHeight: 80,
                textAlignVertical: "top",
                marginBottom: 20,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
              placeholder="Tell us about the customer experience (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
              value={partnerReviewComment}
              onChangeText={setPartnerReviewComment}
            />

            <TouchableOpacity
              onPress={async () => {
                if (partnerReviewRating === 0) {
                  Alert.alert("Please select a rating");
                  return;
                }
                setPartnerReviewLoading(true);
                try {
                  const res = await fetch(
                    `${API_BASE}/orders/${partnerReviewOrder.orderIdRaw || partnerReviewOrder.id}/partner-review`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        partner_review_rating: partnerReviewRating,
                        partner_review_comment: partnerReviewComment,
                      }),
                    }
                  );
                  const data = await res.json();
                  if (data.success) {
                    setPartnerReviewOrder(null);
                    setPartnerReviewRating(0);
                    setPartnerReviewComment("");
                  }
                } catch (e) {
                  console.log("Partner review error", e);
                } finally {
                  setPartnerReviewLoading(false);
                }
              }}
              disabled={partnerReviewLoading}
              style={{
                backgroundColor: partnerReviewLoading ? "#E5E7EB" : "#2E7D32",
                borderRadius: 14,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "800",
                }}
              >
                {partnerReviewLoading ? "Submitting..." : "Submit Review"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPartnerReviewOrder(null);
              }}
              style={{
                alignItems: "center",
                paddingVertical: 12,
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#6B7280", fontSize: 14, fontWeight: "600" }}>
                Skip
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  hero: {
    backgroundColor:  'transparent', //228948
    paddingTop:       Platform.OS === 'android' ? 30 : 56,
    paddingLeft:      22,
    paddingRight:     0,
    paddingBottom:    26,
    flexDirection:    'row',
    alignItems:       'flex-end',
    overflow:         'hidden',
  },
  heroLeft:  { flex: 1 },
  heroRight: { width: 184, justifyContent: 'flex-end', alignItems: 'flex-end' },

  shieldRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  shieldWrap:    { width: 24, height: 26, alignItems: 'center', justifyContent: 'center' },
  shieldNum:     { position: 'absolute', top: 7, fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#FFFFFF', width: 24, textAlign: 'center' },
  levelPill:     { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  levelPillText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#FFFFFF' },

  heroName:         { fontSize: 30, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 10 },
  earningsLabel:    { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 4 },
  earningsRow:      { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  earningsCurrency: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#FFFFFF' },
  earningsAmt:      { fontSize: 38, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#FFFFFF', letterSpacing: -1 },
  sparkRow:         { flexDirection: 'row', gap: 5, marginTop: 12, alignItems: 'center' },
  dot:              { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.30)' },
  dotActive:        { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#FFFFFF' },

  body: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius:    20,
    padding:         18,
    marginBottom:    0,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       2,
  },

  statusRow:   { flexDirection: 'row', alignItems: 'center' },
  statusTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#111827', marginBottom: 2 },
  statusSub:   { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B7280' },

  ordersRow:  { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bagWrap:    { width: 74 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFEAEA', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 8,
  },
  activePillText:     { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#FF3B30', letterSpacing: 0.8 },
  ordersCount:        { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#111827', marginBottom: 12 },
  viewDetailsBtn:     {
    borderRadius: 999, borderWidth: 1.5, borderColor: '#D1D5DB',
    paddingVertical: 10, paddingHorizontal: 22, alignSelf: 'flex-start',
  },
  viewDetailsBtnText: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#1F2937', letterSpacing: 1.1 },

  sectionLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#1F2937', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 },
  statsGrid:    { flexDirection: 'row' },
  statCol:      { flex: 1, alignItems: 'flex-start', paddingHorizontal: 4 },
  statLabel:    { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B7280', lineHeight: 16, marginBottom: 6 },
  statValue:    { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#111827', letterSpacing: -0.3 },

  txHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, paddingHorizontal: 2,
  },
  txTitle: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#111827', letterSpacing: -0.4 },
  txLink:  { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#50C878' },
  txCard:  {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
});