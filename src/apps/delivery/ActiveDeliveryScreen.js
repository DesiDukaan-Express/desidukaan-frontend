import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Linking, Animated, PanResponder, Dimensions,
  StatusBar, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import { useFocusEffect } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';
import DeliveryMapView from '../../components/DeliveryMapView';
import IncomingOrderSheet from '../../components/IncomingOrderSheet';

const { width: SCREEN_W } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || (API_BASE.includes('/api') ? API_BASE.split('/api')[0] : 'http://localhost:3000');

const C = {
  bg: '#F5F7F5',
  white: '#FFFFFF',
  primary: '#2E7D32',
  primaryLight: '#EAF3DE',
  primaryText: '#27500A',
  primaryDark: '#1B5E20',
  blue: '#378ADD',
  blueLight: '#E6F1FB',
  blueText: '#0C447C',
  orange: '#FAEEDA',
  orangeText: '#633806',
  red: '#E24B4A',
  redLight: '#FCEBEB',
  redText: '#791F1F',
  textPrimary: '#1A1A1A',
  textSecond: '#666666',
  textLight: '#999999',
  border: '#E8EDE8',
};

// ── Delivery steps ────────────────────────────────────────────────────────────
// Maps to backend: assigned → picked_up → delivered
const STEPS = [
  { key: 'reach_pickup',  label: 'Reach Pickup',  api: null,       btnLabel: 'Reached Pickup Location' },
  { key: 'pick_order',    label: 'Pick Order',    api: 'picked_up', btnLabel: 'Picked Order' },
  { key: 'reach_drop',    label: 'Reach Drop',    api: null,        btnLabel: 'Reached Drop Location' },
  { key: 'drop_order',    label: 'Drop Order',    api: 'delivered', btnLabel: 'Order Delivered' },
];

// ── Slide-to-Action Button ────────────────────────────────────────────────────
const THUMB = 56;
const TRACK_W = SCREEN_W - 48; // 24px padding each side
const DRAG_RANGE = TRACK_W - THUMB - 4;

function SlideButton({ label, onComplete, color = C.primary }) {
  const pan = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false);

  // Reset when label changes (new step)
  useEffect(() => {
    setDone(false);
    pan.setValue(0);
  }, [label]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !done,
      onMoveShouldSetPanResponder: () => !done,
      onPanResponderMove: (_, g) => {
        pan.setValue(Math.max(0, Math.min(g.dx, DRAG_RANGE)));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx >= DRAG_RANGE * 0.82) {
          Animated.spring(pan, { toValue: DRAG_RANGE, useNativeDriver: false }).start(() => {
            setDone(true);
            onComplete?.();
          });
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const labelOpacity = pan.interpolate({ inputRange: [0, DRAG_RANGE * 0.5], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={[sb.track, { backgroundColor: done ? color : C.primaryLight, borderColor: color }]}>
      <Animated.View style={[sb.fill, { width: Animated.add(pan, THUMB + 4), backgroundColor: color }]} />
      <Animated.Text style={[sb.label, { opacity: labelOpacity, color: done ? C.white : C.primaryText }]}>
        {done ? '✓  Done' : `>> ${label}`}
      </Animated.Text>
      <Animated.View
        style={[sb.thumb, { transform: [{ translateX: pan }], backgroundColor: color }]}
        {...responder.panHandlers}
      >
        <Text style={sb.thumbIcon}>{done ? '✓' : '>>'}</Text>
      </Animated.View>
    </View>
  );
}

const sb = StyleSheet.create({
  track: {
    width: TRACK_W, height: THUMB + 4, borderRadius: (THUMB + 4) / 2,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, position: 'relative',
  },
  fill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    borderRadius: (THUMB + 4) / 2,
  },
  label: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  thumb: {
    position: 'absolute', left: 2,
    width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
  },
  thumbIcon: { fontSize: 18, color: C.white, fontWeight: '800' },
});

// ── Step Progress Bar ─────────────────────────────────────────────────────────
function StepBar({ currentStep }) {
  return (
    <View style={sp.row}>
      {STEPS.map((s, i) => {
        const past = i < currentStep;
        const active = i === currentStep;
        return (
          <React.Fragment key={s.key}>
            <View style={sp.stepWrap}>
              <View style={[sp.dot, past && sp.dotDone, active && sp.dotActive]}>
                <Text style={[sp.dotNum, (past || active) && { color: C.white }]}>
                  {past ? '✓' : i + 1}
                </Text>
              </View>
              <Text style={[sp.stepLabel, active && { color: C.primary, fontWeight: '700' }]} numberOfLines={1}>
                {s.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[sp.line, past && { backgroundColor: C.primary }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const sp = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 8, marginBottom: 16 },
  stepWrap: { alignItems: 'center', width: 56 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    borderWidth: 1.5, borderColor: C.border,
  },
  dotDone: { backgroundColor: C.primary, borderColor: C.primary },
  dotActive: { backgroundColor: C.primary, borderColor: C.primaryDark },
  dotNum: { fontSize: 12, fontWeight: '700', color: C.textSecond },
  stepLabel: { fontSize: 9, color: C.textLight, textAlign: 'center', fontWeight: '600', letterSpacing: 0.2 },
  line: { flex: 1, height: 2, backgroundColor: C.border, marginTop: 13, marginHorizontal: 2 },
});

// ── Info Row (icon + label + value) ──────────────────────────────────────────
function InfoRow({ icon, label, value, onPress }) {
  const inner = (
    <View style={ir.row}>
      <Text style={ir.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={ir.label}>{label}</Text>
        <Text style={ir.value}>{value}</Text>
      </View>
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress}>{inner}</TouchableOpacity>;
  return inner;
}

const ir = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  icon: { fontSize: 20, width: 28, textAlign: 'center' },
  label: { fontSize: 10, color: C.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 14, color: C.textPrimary, fontWeight: '600', marginTop: 1 },
});

// ── Order Items Accordion ─────────────────────────────────────────────────────
function ItemsAccordion({ items, vendorName }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={ac.wrap}>
      <TouchableOpacity style={ac.header} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 18 }}>🧾</Text>
          <View>
            <Text style={ac.title}>Order details</Text>
            <Text style={ac.sub}>{vendorName}</Text>
          </View>
        </View>
        <Text style={ac.chevron}>{open ? '∧' : '∨'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={ac.body}>
          {items?.map((item, i) => (
            <View key={i} style={ac.itemRow}>
              <Text style={ac.itemQty}>{item.quantity}x</Text>
              <Text style={ac.itemName}>{item.product_name}</Text>
              <Text style={ac.itemPrice}>₹{item.subtotal}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const ac = StyleSheet.create({
  wrap: { backgroundColor: C.white, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  title: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  sub: { fontSize: 11, color: C.textSecond, marginTop: 1 },
  chevron: { fontSize: 16, color: C.textSecond, fontWeight: '600' },
  body: { paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 0.5, borderTopColor: C.border },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  itemQty: { fontSize: 12, fontWeight: '700', color: C.primary, width: 28 },
  itemName: { flex: 1, fontSize: 13, color: C.textPrimary },
  itemPrice: { fontSize: 12, color: C.textSecond },
});

// ── Step Content ──────────────────────────────────────────────────────────────
function StepContent({ step, activeOrder, myLocation }) {
  const vendorLoc = activeOrder?.vendorLoc;
  const dropLoc = activeOrder?.dropLoc;

  // Map markers per step
  const getMarkers = () => {
    if (!myLocation) return [];
    const me = { coordinate: myLocation, title: 'You' };
    if (step === 0 || step === 1) {
      const markers = [me];
      if (vendorLoc?.latitude) markers.push({ coordinate: vendorLoc, title: activeOrder.pickup });
      return markers;
    }
    if (step === 2 || step === 3) {
      const markers = [me];
      if (dropLoc?.latitude) markers.push({ coordinate: dropLoc, title: activeOrder.drop });
      return markers;
    }
    return [me];
  };

  const mapRegion = step <= 1 ? vendorLoc : dropLoc;

  return (
    <View>
      {/* Map */}
      <View style={styles.stepMap}>
        <DeliveryMapView currentRegion={mapRegion || myLocation} markers={getMarkers()} />
      </View>

      {/* Step 0 – Reach Pickup */}
      {step === 0 && (
        <View style={styles.stepCard}>
          <Text style={styles.stepCardTitle}>📍 Pickup From</Text>
          <View style={{ height: 0.5, backgroundColor: C.border, marginVertical: 8 }} />
          <InfoRow icon="🏪" label="Vendor" value={activeOrder?.pickup || '—'} />
          <View style={{ height: 0.5, backgroundColor: C.border }} />
          <InfoRow
            icon="🗺️"
            label="Open in Maps"
            value={vendorLoc ? `${vendorLoc.latitude?.toFixed(4)}, ${vendorLoc.longitude?.toFixed(4)}` : 'Location unavailable'}
            onPress={vendorLoc ? () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${vendorLoc.latitude},${vendorLoc.longitude}`) : null}
          />
          <View style={{ height: 0.5, backgroundColor: C.border }} />
          <InfoRow icon="📋" label="Order" value={activeOrder?.displayId || '—'} />
          <View style={{ height: 0.5, backgroundColor: C.border }} />
          <InfoRow icon="👤" label="Customer" value={activeOrder?.customerName || '—'} />
        </View>
      )}

      {/* Step 1 – Pick Order */}
      {step === 1 && (
        <View>
          {/* Big Order ID */}
          <View style={styles.orderIdCard}>
            <Text style={styles.orderIdLabel}>ORDER ID</Text>
            <Text style={styles.orderIdValue}>{activeOrder?.displayId || '—'}</Text>
          </View>

          <ItemsAccordion items={activeOrder?.items} vendorName={activeOrder?.pickup} />

          {/* Restaurant details accordion */}
          <View style={ac.wrap}>
            <View style={ac.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>🏪</Text>
                <View>
                  <Text style={ac.title}>Restaurant details</Text>
                  <Text style={ac.sub}>{activeOrder?.pickup}</Text>
                </View>
              </View>
              {vendorLoc && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${vendorLoc.latitude},${vendorLoc.longitude}`)}
                >
                  <Text style={{ fontSize: 12, color: C.blue, fontWeight: '600' }}>Go to map</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Step 2 – Reach Drop */}
      {step === 2 && (
        <View style={styles.stepCard}>
          <Text style={styles.stepCardTitle}>📦 Drop To</Text>
          <View style={{ height: 0.5, backgroundColor: C.border, marginVertical: 8 }} />
          <InfoRow icon="👤" label="Customer" value={activeOrder?.customerName || '—'} />
          <View style={{ height: 0.5, backgroundColor: C.border }} />
          <InfoRow icon="📍" label="Address" value={activeOrder?.drop || '—'} />
          <View style={{ height: 0.5, backgroundColor: C.border }} />
          <InfoRow
            icon="🗺️"
            label="Open in Maps"
            value={dropLoc ? `${dropLoc.latitude?.toFixed(4)}, ${dropLoc.longitude?.toFixed(4)}` : 'Location unavailable'}
            onPress={dropLoc ? () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${dropLoc.latitude},${dropLoc.longitude}`) : null}
          />
          <View style={{ height: 0.5, backgroundColor: C.border }} />
          <InfoRow icon="📋" label="Order" value={activeOrder?.displayId || '—'} />
          <View style={{ height: 0.5, backgroundColor: C.border }} />
          <InfoRow icon="🏪" label="Pickup From" value={activeOrder?.pickup || '—'} />
        </View>
      )}

      {/* Step 3 – Drop Order */}
      {step === 3 && (
        <View>
          <View style={styles.stepCard}>
            <Text style={styles.stepCardTitle}>✅ Deliver To</Text>
            <View style={{ height: 0.5, backgroundColor: C.border, marginVertical: 8 }} />
            <InfoRow icon="💳" label="Payment" value="Paid online" />
            <View style={{ height: 0.5, backgroundColor: C.border }} />
            <InfoRow icon="📋" label="Order" value={activeOrder?.displayId || '—'} />
            <View style={{ height: 0.5, backgroundColor: C.border }} />
            <InfoRow icon="👤" label="Customer" value={activeOrder?.customerName || '—'} />
            <View style={{ height: 0.5, backgroundColor: C.border }} />
            <InfoRow icon="📍" label="Address" value={activeOrder?.drop || '—'} />
            <View style={{ height: 0.5, backgroundColor: C.border }} />
            <InfoRow
              icon="🗺️"
              label="Open in Maps"
              value="Navigate to drop"
              onPress={dropLoc ? () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${dropLoc.latitude},${dropLoc.longitude}`) : null}
            />
          </View>

          <ItemsAccordion items={activeOrder?.items} vendorName={activeOrder?.pickup} />
        </View>
      )}
    </View>
  );
}

// ── No active order view ──────────────────────────────────────────────────────
function Badge({ status }) {
  const map = {
    new: { bg: C.blueLight, color: C.blueText, label: 'New' },
    transit: { bg: C.orange, color: C.orangeText, label: 'Picked Up' },
    accepted: { bg: C.primaryLight, color: C.primaryText, label: 'Assigned' },
    delivered: { bg: C.primaryLight, color: C.primaryText, label: 'Delivered' },
    cancelled: { bg: C.redLight, color: C.redText, label: 'Cancelled' },
  };
  const s = map[status] || map.new;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function AvailableOrderCard({ order, onAccept }) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <Text style={styles.orderId}>{order.displayId}</Text>
        <Badge status="new" />
      </View>
      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: C.blue }]} />
        <Text style={styles.routeText} numberOfLines={1}>{order.pickup}</Text>
        <View style={styles.routeLine} />
        <View style={[styles.dot, { backgroundColor: C.red }]} />
        <Text style={styles.routeText} numberOfLines={1}>{order.drop}</Text>
      </View>
      <View style={styles.orderBottom}>
        <Text style={styles.orderMeta}>{order.meta}</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => onAccept(order.orderIdRaw)}>
          <Text style={styles.btnPrimaryText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
export default function ActiveDeliveryScreen({ navigation }) {
  const { token, user } = useAuthStore();

  const [isOnline, setIsOnline] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);   // the assigned delivery
  const [availableOrders, setAvailableOrders] = useState([]);
  const [partner, setPartner] = useState({ name: 'Loading...', id: '...', initials: '' });
  const [myLocation, setMyLocation] = useState(null);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [incomingOrder, setIncomingOrder] = useState(null);
  // step: 0=reach_pickup 1=pick_order 2=reach_drop 3=drop_order
  const [step, setStep] = useState(0);
  const socketRef = useRef(null);

  // ── Fetch & parse orders ──
  const fetchOrders = async () => {
    try {
      const [actRes, avlRes] = await Promise.all([
        fetch(`${API_BASE}/delivery/active`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/delivery/available`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const actResult = await actRes.json();
      const avlResult = await avlRes.json();

      // Sync online status
      if (actResult.success && actResult.data.partner) {
        setIsOnline(actResult.data.partner.is_available ?? true);
      }

      // Active delivery → drive the stepper
      if (actResult.success && actResult.data.delivery) {
        const d = actResult.data.delivery;
        const backendStatus = d.status; // 'assigned' | 'picked_up'
        // Map backend status to stepper step
        // assigned  → step 0 (reach pickup) or 1 (pick order) — we preserve higher step
        // picked_up → step 2 (reach drop) or 3 (drop order)
        setActiveOrder({
          id: d.id,
          orderIdRaw: d.order_id,
          displayId: d.order?.order_number,
          backendStatus,
          pickup: d.order?.vendor?.shop_name,
          drop: d.order?.delivery_address?.address_line || d.order?.delivery_address?.city || 'Local',
          meta: `₹${d.order?.total} · ${d.order?.items?.length || 0} items`,
          vendorLoc: d.order?.vendor ? { latitude: d.order.vendor.latitude, longitude: d.order.vendor.longitude } : null,
          dropLoc: d.order?.delivery_address ? { latitude: d.order.delivery_address.latitude, longitude: d.order.delivery_address.longitude } : null,
          customerName: d.order?.customer?.name || null,
          items: d.order?.items || [],
        });
        // Restore step from backend status without going backwards
        setStep(prev => {
          if (backendStatus === 'picked_up') return Math.max(prev, 2);
          return prev; // keep user's local progress within 'assigned' phase
        });
      } else {
        setActiveOrder(null);
        setStep(0);
      }

      // Available orders
      if (avlResult.success && avlResult.data.orders) {
        setAvailableOrders(avlResult.data.orders.map(o => ({
          id: o.id,
          orderIdRaw: o.id,
          displayId: o.order_number,
          pickup: o.vendor.shop_name,
          drop: o.delivery_address?.address_line || o.delivery_address?.city || 'Local',
          meta: `₹${o.total} · ${o._count?.items || 0} items`,
        })));
      }
    } catch (err) {
      console.log('fetchOrders error', err);
    }
  };

  useFocusEffect(
    React.useCallback(() => { fetchOrders(); }, [token])
  );

  useEffect(() => {
    if (user) {
      setPartner({
        name: user.name || 'Delivery Partner',
        id: `DP-${user.id}`,
        initials: (user.name || 'DP').substring(0, 2).toUpperCase(),
      });
    }
    fetchOrders();
  }, [user]);

  // Socket
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('order:new', fetchOrders);
    socket.on('order:incoming', (data) => setIncomingOrder(data));
    socket.on('delivery_status_update', fetchOrders);
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);

  // Location watch
  useEffect(() => {
    let sub; let active = true;
    const start = async () => {
      if (!isOnline || !token) return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !active) return;
      sub = await Location.watchPositionAsync(
        { distanceInterval: 10, timeInterval: 5000 },
        (loc) => {
          setMyLocation(loc.coords);
          if (socketRef.current?.connected) {
            socketRef.current.emit('driver_location', { latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        }
      );
    };
    start();
    return () => {
      active = false;
      if (sub?.remove) setTimeout(() => { try { sub.remove(); } catch (_) {} }, 0);
    };
  }, [isOnline, token]);

  // ── Actions ──
  const toggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    await fetch(`${API_BASE}/delivery/toggle-availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_available: next }),
    });
  };

  const handleAccept = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/delivery/accept/${orderId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { fetchOrders(); }
      else Alert.alert('Error', data.message);
    } catch (e) { console.log(e); }
  };

  const handleAcceptIncoming = async () => {
    if (!incomingOrder) return;
    try {
      const res = await fetch(`${API_BASE}/delivery/accept/${incomingOrder.orderId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setIncomingOrder(null);
      if (data.success) fetchOrders();
      else Alert.alert('Error', data.message || 'Could not accept order');
    } catch (e) { setIncomingOrder(null); }
  };

  // Called by SlideButton when user completes slide gesture for current step
  const handleStepComplete = async () => {
    const currentStepDef = STEPS[step];

    if (currentStepDef.api) {
      // Needs a backend call
      try {
        const res = await fetch(`${API_BASE}/delivery/${activeOrder.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: currentStepDef.api }),
        });
        const data = await res.json();
        if (!data.success) {
          Alert.alert('Error', data.message);
          return;
        }
        if (currentStepDef.api === 'delivered') {
          setDeliveryCount(c => c + 1);
          setEarnings(e => e + (activeOrder?.deliveryFee || 65));
          // Delivery done — reset
          setTimeout(() => { setActiveOrder(null); setStep(0); fetchOrders(); }, 800);
          return;
        }
      } catch (e) {
        Alert.alert('Error', 'Network error');
        return;
      }
    }

    // Advance to next step
    if (step < STEPS.length - 1) {
      setTimeout(() => setStep(s => s + 1), 400);
    }
  };

  // ── Render ──
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <IncomingOrderSheet
        order={incomingOrder}
        onAccept={handleAcceptIncoming}
        onDecline={() => setIncomingOrder(null)}
      />

      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{partner.initials}</Text></View>
            <View>
              <Text style={styles.partnerName}>{partner.name}</Text>
              <Text style={styles.partnerId}>{partner.id}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, isOnline ? styles.pillOnline : styles.pillOffline]}>
              <Text style={[styles.pillText, { color: isOnline ? C.primaryText : '#5F5E5A' }]}>
                ● {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Switch value={isOnline} onValueChange={toggleOnline} trackColor={{ false: '#ccc', true: C.primary }} />
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsGrid}>
          {[
            { label: "Today's deliveries", value: String(deliveryCount), sub: 'Active session' },
            { label: 'Earnings today', value: `₹${earnings}`, sub: 'Updating live' },
          ].map((m, i) => (
            <View key={i} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricSub}>{m.sub}</Text>
            </View>
          ))}
        </View>

        {/* ── Active delivery stepper ── */}
        {activeOrder ? (
          <View style={styles.stepperWrap}>
            {/* Header */}
            <View style={styles.stepperHeader}>
              <View>
                <Text style={styles.stepperTitle}>Active Delivery</Text>
                <Text style={styles.stepperSub}>{activeOrder.displayId} · {activeOrder.meta}</Text>
              </View>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{step + 1}/4</Text>
              </View>
            </View>

            {/* Progress bar */}
            <StepBar currentStep={step} />

            {/* Step title */}
            <View style={styles.stepTitleRow}>
              <Text style={styles.stepTitleChevron}>∨</Text>
              <Text style={styles.stepTitleText}>{STEPS[step].label}</Text>
            </View>

            {/* Step content (map + info) */}
            <StepContent step={step} activeOrder={activeOrder} myLocation={myLocation} />

            {/* Slide button */}
            <View style={styles.slideWrap}>
              <SlideButton
                key={`slide-${step}`}
                label={STEPS[step].btnLabel}
                onComplete={handleStepComplete}
                color={step === 3 ? '#1B5E20' : C.primary}
              />
            </View>
          </View>
        ) : (
          /* ── No active order ── */
          <>
            <View style={styles.mapBox}>
              <DeliveryMapView
                currentRegion={myLocation}
                markers={myLocation ? [{ coordinate: myLocation, title: 'You' }] : []}
              />
            </View>

            <Text style={styles.sectionTitle}>Available orders</Text>

            {availableOrders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🛵</Text>
                <Text style={styles.emptyText}>No orders right now</Text>
              </View>
            ) : (
              availableOrders.map(order => (
                <AvailableOrderCard key={order.id} order={order} onAccept={handleAccept} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 60 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.blueLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '600', color: C.blueText },
  partnerName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  partnerId: { fontSize: 11, color: C.textSecond, marginTop: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillOnline: { backgroundColor: C.primaryLight },
  pillOffline: { backgroundColor: '#F1EFE8' },
  pillText: { fontSize: 11, fontWeight: '600' },

  metricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metricCard: { flex: 1, backgroundColor: C.white, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: C.border },
  metricLabel: { fontSize: 11, color: C.textSecond, marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: '600', color: C.textPrimary },
  metricSub: { fontSize: 11, color: C.primary, marginTop: 2 },

  // Stepper wrapper
  stepperWrap: { backgroundColor: C.white, borderRadius: 16, borderWidth: 0.5, borderColor: C.border, overflow: 'hidden' },
  stepperHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  stepperTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  stepperSub: { fontSize: 11, color: C.textSecond, marginTop: 2 },
  stepBadge: { backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stepBadgeText: { fontSize: 12, fontWeight: '700', color: C.primaryText },

  // Step bar lives inside stepperWrap with padding
  // (StepBar already has its own paddingHorizontal)

  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingBottom: 10 },
  stepTitleChevron: { fontSize: 14, color: C.textSecond },
  stepTitleText: { fontSize: 16, fontWeight: '700', color: C.textPrimary },

  stepMap: { height: 200, backgroundColor: C.border },

  stepCard: { padding: 14 },
  stepCardTitle: { fontSize: 12, fontWeight: '800', color: C.textSecond, textTransform: 'uppercase', letterSpacing: 0.8 },

  orderIdCard: {
    margin: 14, padding: 16, backgroundColor: C.bg, borderRadius: 12,
    alignItems: 'center', borderWidth: 0.5, borderColor: C.border,
  },
  orderIdLabel: { fontSize: 10, fontWeight: '800', color: C.textLight, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  orderIdValue: { fontSize: 32, fontWeight: '800', color: C.textPrimary, letterSpacing: -1 },

  slideWrap: { alignItems: 'center', paddingVertical: 16, borderTopWidth: 0.5, borderTopColor: C.border },

  // No-active-order views
  mapBox: { backgroundColor: C.white, borderRadius: 10, height: 180, overflow: 'hidden', borderWidth: 0.5, borderColor: C.border, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: C.textSecond, marginBottom: 10 },
  orderCard: { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: C.border },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  routeText: { fontSize: 12, color: C.textPrimary, flexShrink: 1, maxWidth: '40%' },
  routeLine: { flex: 1, height: 1, backgroundColor: C.border },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderMeta: { fontSize: 11, color: C.textLight, flex: 1 },
  btnPrimary: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: C.primary },
  btnPrimaryText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14, color: C.textLight },
});