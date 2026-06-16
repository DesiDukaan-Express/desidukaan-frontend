import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Animated, PanResponder, Dimensions,
  StatusBar, Platform, ActivityIndicator,
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
  // Hero greens â€” matches DeliveryHomeScreen exactly
  heroBg:      '#228948',
  heroSubText: 'rgba(255,255,255,0.70)',
  heroStatBg:  'rgba(0,0,0,0.15)',
  white:       '#FFFFFF',

  // App bg
  bg:          '#F2F2F7',

  // Greens
  primary:     '#2E7D32',
  primaryLight:'#E8F8EE',
  primaryText: '#1A6B38',
  primaryDark: '#1B5E20',

  // Accents
  blue:        '#3B82F6',
  blueLight:   '#EFF6FF',
  blueText:    '#1D4ED8',
  red:         '#FF3B30',

  // Text
  textPrimary: '#111827',
  textSecond:  '#6B7280',
  textLight:   '#9CA3AF',

  // Borders
  border:      '#E5E7EB',
};

// â”€â”€ Delivery steps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STEPS = [
  { key: 'reach_pickup', label: 'Reach Pickup',  api: null,        btnLabel: 'Reached Pickup Location' },
  { key: 'pick_order',   label: 'Pick Order',    api: 'picked_up', btnLabel: 'Picked Order'            },
  { key: 'reach_drop',   label: 'Reach Drop',    api: null,        btnLabel: 'Reached Drop Location'   },
  { key: 'drop_order',   label: 'Drop Order',    api: 'delivered', btnLabel: 'Order Delivered'         },
];

// â”€â”€ Slide-to-Action Button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const THUMB      = 56;
const TRACK_W    = SCREEN_W - 32;
const DRAG_RANGE = TRACK_W - THUMB - 4;

function SlideButton({ label, onComplete, color = C.primary, onDragStart, onDragEnd }) {
  const pan  = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false);
  const isDragging = useRef(false);

  useEffect(() => { setDone(false); pan.setValue(0); }, [label]);

  const responder = useRef(
    PanResponder.create({
      // Capture from the start so ScrollView cannot intercept
      onStartShouldSetPanResponder:         () => !done,
      onStartShouldSetPanResponderCapture:  () => !done,
      onMoveShouldSetPanResponder:          (_, g) => !done && Math.abs(g.dx) > 2,
      onMoveShouldSetPanResponderCapture:   (_, g) => !done && Math.abs(g.dx) > 2,
      onPanResponderGrant: () => {
        isDragging.current = true;
        onDragStart?.();
      },
      onPanResponderMove: (_, g) => {
        pan.setValue(Math.max(0, Math.min(g.dx, DRAG_RANGE)));
      },
      onPanResponderRelease: (_, g) => {
        isDragging.current = false;
        onDragEnd?.();
        if (g.dx >= DRAG_RANGE * 0.80) {
          Animated.spring(pan, { toValue: DRAG_RANGE, useNativeDriver: false }).start(() => {
            setDone(true);
            onComplete?.();
          });
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        onDragEnd?.();
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  const labelOpacity = pan.interpolate({
    inputRange: [0, DRAG_RANGE * 0.5], outputRange: [1, 0], extrapolate: 'clamp',
  });

  return (
    <View style={[sb.track, { backgroundColor: done ? color : C.primaryLight, borderColor: color }]}>
      <Animated.View style={[sb.fill, { width: Animated.add(pan, THUMB + 4), backgroundColor: color }]} />
      <Animated.Text style={[sb.label, { opacity: labelOpacity, color: done ? C.white : C.primaryText }]}>
        {done ? 'âœ“  Done' : `>> ${label}`}
      </Animated.Text>
      <Animated.View
        style={[sb.thumb, { transform: [{ translateX: pan }], backgroundColor: color }]}
        {...responder.panHandlers}
      >
        <Text style={sb.thumbIcon}>{done ? 'âœ“' : '>>'}</Text>
      </Animated.View>
    </View>
  );
}

const sb = StyleSheet.create({
  track:     {
    width: TRACK_W, height: THUMB + 4, borderRadius: (THUMB + 4) / 2,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, position: 'relative',
  },
  fill:      { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: (THUMB + 4) / 2 },
  label:     { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  thumb:     {
    position: 'absolute', left: 2,
    width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 4,
  },
  thumbIcon: { fontSize: 18, color: C.white, fontWeight: '800' },
});

// â”€â”€ Step Progress Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepBar({ currentStep }) {
  return (
    <View style={spb.row}>
      {STEPS.map((s, i) => {
        const past   = i < currentStep;
        const active = i === currentStep;
        return (
          <React.Fragment key={s.key}>
            <View style={spb.stepWrap}>
              <View style={[spb.dot, past && spb.dotDone, active && spb.dotActive]}>
                <Text style={[spb.dotNum, (past || active) && { color: C.white }]}>
                  {past ? 'âœ“' : i + 1}
                </Text>
              </View>
              <Text style={[spb.stepLabel, active && { color: C.primary, fontWeight: '700' }]} numberOfLines={1}>
                {s.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[spb.line, past && { backgroundColor: C.primary }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const spb = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 12, marginTop: 4 },
  stepWrap:  { alignItems: 'center', width: 56 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4, borderWidth: 1.5, borderColor: C.border,
  },
  dotDone:   { backgroundColor: C.primary, borderColor: C.primary },
  dotActive: { backgroundColor: C.primary, borderColor: C.primaryDark },
  dotNum:    { fontSize: 12, fontWeight: '700', color: C.textSecond },
  stepLabel: { fontSize: 9, color: C.textLight, textAlign: 'center', fontWeight: '600', letterSpacing: 0.2 },
  line:      { flex: 1, height: 2, backgroundColor: C.border, marginTop: 13, marginHorizontal: 2 },
});

// â”€â”€ Action Buttons (Call + Map) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ActionButtons({ onCall, onMap, phone }) {
  const handleCall = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() =>
        Alert.alert('Cannot Call', 'Unable to open the dialer. Please check the phone number.')
      );
    } else if (onCall) {
      onCall();
    } else {
      Alert.alert('No Phone Number', 'Phone number is not available for this contact.');
    }
  };

  return (
    <View style={ab.row}>
      <TouchableOpacity style={ab.btnCall} onPress={handleCall} activeOpacity={0.8}>
        <Text style={ab.callIcon}>ðŸ“ž</Text>
        <Text style={ab.callText}>Call</Text>
      </TouchableOpacity>
      <TouchableOpacity style={ab.btnMap} onPress={onMap} activeOpacity={0.8}>
        <Text style={ab.mapIcon}>ðŸ—ºï¸</Text>
        <Text style={ab.mapText}>Go to map</Text>
      </TouchableOpacity>
    </View>
  );
}

const ab = StyleSheet.create({
  row:     { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnCall: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white,
  },
  callIcon: { fontSize: 15 },
  callText: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  btnMap:  {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12, backgroundColor: C.blue,
  },
  mapIcon: { fontSize: 15 },
  mapText: { fontSize: 13, fontWeight: '700', color: C.white },
});

// â”€â”€ Meta row (small icon + text) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MetaRow({ icon, text }) {
  return (
    <View style={mr.row}>
      <Text style={mr.icon}>{icon}</Text>
      <Text style={mr.text}>{text}</Text>
    </View>
  );
}
const mr = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  icon: { fontSize: 14, color: C.textLight },
  text: { fontSize: 13, color: C.textSecond, fontWeight: '500' },
});

// â”€â”€ Order Items Accordion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ItemsAccordion({ items, vendorName }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={ac.wrap}>
      <TouchableOpacity style={ac.header} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={ac.iconWrap}><Text style={{ fontSize: 16 }}>ðŸ§¾</Text></View>
          <View>
            <Text style={ac.title}>Order details</Text>
            <Text style={ac.sub}>{vendorName}</Text>
          </View>
        </View>
        <Text style={ac.chevron}>{open ? 'âˆ§' : 'âˆ¨'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={ac.body}>
          {items?.map((item, i) => (
            <View key={i} style={ac.itemRow}>
              <Text style={ac.itemQty}>{item.quantity}x</Text>
              <Text style={ac.itemName}>{item.product_name}</Text>
              <Text style={ac.itemPrice}>â‚¹{item.subtotal}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const ac = StyleSheet.create({
  wrap:     { backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  sub:      { fontSize: 11, color: C.textSecond, fontWeight: '500', marginTop: 1 },
  chevron:  { fontSize: 16, color: C.textSecond, fontWeight: '600' },
  body:     { paddingHorizontal: 14, paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.border },
  itemRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8 },
  itemQty:  { fontSize: 12, fontWeight: '800', color: C.primary, width: 28 },
  itemName: { flex: 1, fontSize: 13, color: C.textPrimary, fontWeight: '500' },
  itemPrice:{ fontSize: 12, color: C.textSecond, fontWeight: '500' },
});

// â”€â”€ Step Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepContent({ step, activeOrder, myLocation }) {
  const vendorLoc = activeOrder?.vendorLoc;
  const dropLoc   = activeOrder?.dropLoc;

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

  const targetLoc = step <= 1 ? vendorLoc : dropLoc;
  const mapRegion = targetLoc?.latitude != null ? targetLoc : null;

  const openMap = (loc) => {
    if (loc) Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`);
  };

  return (
    <View>
      {/* Map */}
      <View style={styles.stepMap}>
        <DeliveryMapView currentRegion={mapRegion || myLocation} markers={getMarkers()} />
      </View>

      {/* Drag handle pill */}
      <View style={styles.dragHandle} />

      {/* â”€â”€ Step 0 â€“ Reach Pickup â”€â”€ */}
      {step === 0 && (
        <View style={styles.stepCard}>
          <Text style={styles.locationLabel}>PICKUP FROM</Text>
          <Text style={styles.locationName}>{activeOrder?.pickup || 'â€”'}</Text>
          {vendorLoc && (
            <Text style={styles.locationAddress}>
              {vendorLoc.latitude?.toFixed(4)}, {vendorLoc.longitude?.toFixed(4)}
            </Text>
          )}
          <ActionButtons
            phone={activeOrder?.vendorPhone}
            onMap={() => openMap(vendorLoc)}
          />
          <View style={styles.metaDivider} />
          <MetaRow icon="ðŸ“‹" text={`Order: ${activeOrder?.displayId || 'â€”'}`} />
          <MetaRow icon="ðŸ‘¤" text={`Customer: ${activeOrder?.customerName || 'â€”'}`} />
        </View>
      )}

      {/* â”€â”€ Step 1 â€“ Pick Order â”€â”€ */}
      {step === 1 && (
        <View>
          <View style={styles.orderIdCard}>
            <Text style={styles.orderIdLabel}>ORDER ID</Text>
            <Text style={styles.orderIdValue}>{activeOrder?.displayId || 'â€”'}</Text>
          </View>
          <ItemsAccordion items={activeOrder?.items} vendorName={activeOrder?.pickup} />
          <View style={ac.wrap}>
            <View style={ac.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={ac.iconWrap}><Text style={{ fontSize: 16 }}>ðŸª</Text></View>
                <View>
                  <Text style={ac.title}>Restaurant details</Text>
                  <Text style={ac.sub}>{activeOrder?.pickup}</Text>
                </View>
              </View>
              {vendorLoc && (
                <TouchableOpacity onPress={() => openMap(vendorLoc)}>
                  <Text style={{ fontSize: 12, color: C.blue, fontWeight: '700' }}>Go to map</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={ac.wrap}>
            <View style={ac.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={ac.iconWrap}><Text style={{ fontSize: 16 }}>ðŸ‘¤</Text></View>
                <View>
                  <Text style={ac.title}>Customer details</Text>
                  <Text style={ac.sub}>{activeOrder?.customerName || 'â€”'}</Text>
                </View>
              </View>
              {activeOrder?.customerPhone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${activeOrder.customerPhone}`)}>
                  <Text style={{ fontSize: 12, color: C.blue, fontWeight: '700' }}>ðŸ“ž Call</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* â”€â”€ Step 2 â€“ Reach Drop â”€â”€ */}
      {step === 2 && (
        <View style={styles.stepCard}>
          <Text style={styles.locationName}>{activeOrder?.customerName || 'â€”'}</Text>
          <Text style={styles.locationAddress}>{activeOrder?.drop || 'â€”'}</Text>
          <ActionButtons
            phone={activeOrder?.customerPhone}
            onMap={() => openMap(dropLoc)}
          />
          <View style={styles.metaDivider} />
          <MetaRow icon="ðŸ“‹" text={`Order: ${activeOrder?.displayId || 'â€”'}`} />
          <MetaRow icon="ðŸª" text={`Pickup: ${activeOrder?.pickup || 'â€”'}`} />
        </View>
      )}

      {/* â”€â”€ Step 3 â€“ Drop Order â”€â”€ */}
      {step === 3 && (
        <View>
          <View style={styles.stepCard}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentCheck}>
                <Text style={{ color: C.white, fontSize: 12, fontWeight: '800' }}>âœ“</Text>
              </View>
              <View>
                <Text style={styles.paymentTitle}>Paid online</Text>
                <Text style={styles.paymentSub}>Order: {activeOrder?.displayId || 'â€”'}</Text>
              </View>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.customerRow}>
              <View style={styles.customerIconWrap}>
                <Text style={{ fontSize: 18 }}>ðŸ‘¤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{activeOrder?.customerName || 'â€”'}</Text>
                <Text style={styles.customerAddress}>{activeOrder?.drop || 'â€”'}</Text>
              </View>
            </View>
            <ActionButtons
              phone={activeOrder?.customerPhone}
              onMap={() => openMap(dropLoc)}
            />
          </View>
          <ItemsAccordion items={activeOrder?.items} vendorName={activeOrder?.pickup} />
        </View>
      )}
    </View>
  );
}

// â”€â”€ Available Order Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AvailableOrderCard({ order, onAccept }) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <Text style={styles.orderId}>{order.displayId}</Text>
        <View style={styles.newBadge}><Text style={styles.newBadgeText}>New</Text></View>
      </View>
      <View style={styles.routeRow}>
        <View style={[styles.routeDot, { backgroundColor: C.blue }]} />
        <Text style={styles.routeText} numberOfLines={1}>{order.pickup}</Text>
        <View style={styles.routeLine} />
        <View style={[styles.routeDot, { backgroundColor: C.red }]} />
        <Text style={styles.routeText} numberOfLines={1}>{order.drop}</Text>
      </View>
      <View style={styles.orderBottom}>
        <Text style={styles.orderMeta}>{order.meta}</Text>
        <TouchableOpacity style={styles.btnAccept} onPress={() => onAccept(order.orderIdRaw)} activeOpacity={0.85}>
          <Text style={styles.btnAcceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function ActiveDeliveryScreen({ navigation }) {
  const { token, user } = useAuthStore();



  const [activeOrder, setActiveOrder]         = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [partner, setPartner]                 = useState({ name: 'Loading...', id: '...', initials: '' });
  const [myLocation, setMyLocation]           = useState(null);
  const [deliveryCount, setDeliveryCount]     = useState(0);
  const [earnings, setEarnings]               = useState(0);
  const [incomingOrder, setIncomingOrder]     = useState(null);
  const [step, setStep]                       = useState(0);
  const socketRef = useRef(null);

  // â”€â”€ Fetch & parse orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchOrders = async () => {
    try {
      const [actRes, avlRes] = await Promise.all([
        fetch(`${API_BASE}/delivery/active`,    { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/delivery/available`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const actResult = await actRes.json();
      const avlResult = await avlRes.json();

      if (actResult.success && actResult.data.delivery) {
        const d = actResult.data.delivery;
        const backendStatus = d.status;
        setActiveOrder({
          id: d.id,
          orderIdRaw: d.order_id,
          displayId: d.order?.order_number,
          backendStatus,
          pickup: d.order?.vendor?.shop_name,
          drop: d.order?.delivery_address?.address_line || d.order?.delivery_address?.city || 'Local',
          meta: `â‚¹${d.order?.total} Â· ${d.order?.items?.length || 0} items`,
          vendorLoc: d.order?.vendor ? { latitude: d.order.vendor.latitude, longitude: d.order.vendor.longitude } : null,
          dropLoc: d.order?.delivery_address ? { latitude: d.order.delivery_address.latitude, longitude: d.order.delivery_address.longitude } : null,
          customerName: d.order?.customer?.name || null,
          customerPhone: d.order?.customer?.phone || d.order?.customer?.mobile || null,
          vendorPhone: d.order?.vendor?.phone || d.order?.vendor?.mobile || null,
          items: d.order?.items || [],
        });
        setStep(prev => {
          if (backendStatus === 'picked_up') return Math.max(prev, 2);
          return prev;
        });
      } else {
        setActiveOrder(null);
        setStep(0);
      }

      if (avlResult.success && avlResult.data.orders) {
        setAvailableOrders(avlResult.data.orders.map(o => ({
          id: o.id,
          orderIdRaw: o.id,
          displayId: o.order_number,
          pickup: o.vendor.shop_name,
          drop: o.delivery_address?.address_line || o.delivery_address?.city || 'Local',
          meta: `â‚¹${o.total} Â· ${o._count?.items || 0} items`,
        })));
      }
    } catch (err) {
      console.log('fetchOrders error', err);
    }
  };

  useFocusEffect(React.useCallback(() => { fetchOrders(); }, [token]));

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

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('order:new', fetchOrders);
    socket.on('order:incoming', (data) => setIncomingOrder(data));
    socket.on('delivery_status_update', fetchOrders);
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);

  useEffect(() => {
  let sub; let active = true;
  const start = async () => {
    if (!token) return;
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
}, [token]);

  const handleAccept = async (orderId) => {
    try {
      const res  = await fetch(`${API_BASE}/delivery/accept/${orderId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { fetchOrders(); }
      else Alert.alert('Error', data.message);
    } catch (e) { console.log(e); }
  };

  const handleAcceptIncoming = async () => {
    if (!incomingOrder) return;
    try {
      const res  = await fetch(`${API_BASE}/delivery/accept/${incomingOrder.orderId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setIncomingOrder(null);
      if (data.success) fetchOrders();
      else Alert.alert('Error', data.message || 'Could not accept order');
    } catch (e) { setIncomingOrder(null); }
  };

  const handleStepComplete = async () => {
    const currentStepDef = STEPS[step];
    if (currentStepDef.api) {
      try {
        const res  = await fetch(`${API_BASE}/delivery/${activeOrder.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: currentStepDef.api }),
        });
        const data = await res.json();
        if (!data.success) { Alert.alert('Error', data.message); return; }
        if (currentStepDef.api === 'delivered') {
          setDeliveryCount(c => c + 1);
          setEarnings(e => e + (activeOrder?.deliveryFee || 65));
          setTimeout(() => { setActiveOrder(null); setStep(0); fetchOrders(); }, 800);
          return;
        }
      } catch (e) { Alert.alert('Error', 'Network error'); return; }
    }
    if (step < STEPS.length - 1) {
      setTimeout(() => setStep(s => s + 1), 400);
    }
  };

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const [scrollEnabled, setScrollEnabled] = useState(true);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={C.heroBg} />
      <IncomingOrderSheet
        order={incomingOrder}
        onAccept={handleAcceptIncoming}
        onDecline={() => setIncomingOrder(null)}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >

        {/* â”€â”€ Green hero header â”€â”€ */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{partner.initials}</Text>
              </View>
              <View>
                <Text style={styles.partnerName}>{partner.name}</Text>
                <Text style={styles.partnerId}>{partner.id}</Text>
              </View>
            </View>
          </View>

          {/* Stats bar */}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{deliveryCount}</Text>
              <Text style={styles.heroStatLabel}>Deliveries</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>â‚¹{earnings}</Text>
              <Text style={styles.heroStatLabel}>Earned today</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
  <Text style={styles.heroStatValue}>{partner.id}</Text>
  <Text style={styles.heroStatLabel}>Partner ID</Text>
</View>
          </View>
        </View>

        {/* â”€â”€ Active delivery stepper â”€â”€ */}
        {activeOrder ? (
          <View style={styles.stepperWrap}>
            {/* Header */}
            <View style={styles.stepperHeader}>
              <View>
                <Text style={styles.stepperTitle}>Active Delivery</Text>
                <Text style={styles.stepperSub}>{activeOrder.displayId} Â· {activeOrder.meta}</Text>
              </View>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{step + 1}/4</Text>
              </View>
            </View>

            {/* Step label */}
            <View style={styles.stepLabelRow}>
              <Text style={styles.stepChevron}>âˆ¨</Text>
              <Text style={styles.stepLabelText}>{STEPS[step].label}</Text>
            </View>

            {/* Progress dots */}
            <StepBar currentStep={step} />

            {/* Step content */}
            <StepContent step={step} activeOrder={activeOrder} myLocation={myLocation} />

            {/* Slide button */}
            <View style={styles.slideWrap}>
              <SlideButton
                key={`slide-${step}`}
                label={STEPS[step].btnLabel}
                onComplete={handleStepComplete}
                color={step === 3 ? '#1B5E20' : C.primary}
                onDragStart={() => setScrollEnabled(false)}
                onDragEnd={() => setScrollEnabled(true)}
              />
            </View>
          </View>
        ) : (
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
                <Text style={styles.emptyEmoji}>ðŸ›µ</Text>
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

// â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 80 },

  // Hero
  hero: {
    backgroundColor: C.heroBg,
    paddingTop: Platform.OS === 'android' ? 32 : 56,
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:          { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800', color: C.white },
  partnerName: { fontSize: 15, fontWeight: '700', color: C.white },
  partnerId: { fontSize: 11, fontWeight: '500', color: C.heroSubText, marginTop: 1 },
  toggleRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPill:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText:  { fontSize: 11, fontWeight: '700', color: C.white },
  heroStats:       { flexDirection: 'row', backgroundColor: C.heroStatBg, borderRadius: 14, paddingVertical: 14 },
  heroStat:        { flex: 1, alignItems: 'center' },
  heroStatValue:   { fontSize: 20, fontWeight: '800', color: C.white, marginBottom: 2 },
  heroStatLabel:   { fontSize: 10, fontWeight: '500', color: C.heroSubText },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  // Stepper card
  stepperWrap: {
    backgroundColor: C.white, marginHorizontal: 16, marginTop: 16,
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  stepperHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  stepperTitle:   { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  stepperSub: { fontSize: 11, fontWeight: '500', color: C.textSecond, marginTop: 2 },
  stepBadge:      { backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stepBadgeText:  { fontSize: 12, fontWeight: '700', color: C.primaryText },
  stepLabelRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 },
  stepChevron:    { fontSize: 14, color: C.textSecond },
  stepLabelText:  { fontSize: 17, fontWeight: '800', color: C.textPrimary },

  // Map + drag handle
  stepMap:    { height: 210, backgroundColor: C.border },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginVertical: 10 },

  // Step content
  stepCard:        { paddingHorizontal: 16, paddingBottom: 6 },
  locationLabel: { fontSize: 10, fontWeight: '800', color: C.textLight, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  locationName:    { fontSize: 20, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  locationAddress: { fontSize: 13, fontWeight: '500', color: C.textSecond, lineHeight: 18 },
  metaDivider:     { height: 1, backgroundColor: C.border, marginVertical: 12 },

  // Step 3 payment
  paymentRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentCheck:    { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  paymentTitle:    { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  paymentSub:      { fontSize: 11, fontWeight: '500', color: C.textSecond, marginTop: 2 },

  // Step 3 customer
  customerRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 4 },
  customerIconWrap:{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  customerName:    { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  customerAddress: { fontSize: 13, fontWeight: '500', color: C.textSecond, lineHeight: 18, marginTop: 3 },

  // Order ID (step 1)
  orderIdCard:  { margin: 16, padding: 16, backgroundColor: C.bg, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  orderIdLabel: { fontSize: 10, fontWeight: '800', color: C.textLight, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  orderIdValue: { fontSize: 34, fontWeight: '800', color: C.textPrimary, letterSpacing: -1 },

  // Slide button
  slideWrap: { alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border },

  // No-active-order state
  mapBox:       { margin: 16, backgroundColor: C.white, borderRadius: 16, height: 180, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: C.textSecond, marginBottom: 10, paddingHorizontal: 16 },
  orderCard:    { backgroundColor: C.white, borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  orderTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId:      { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  newBadge:     { backgroundColor: C.blueLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  newBadgeText: { fontSize: 11, fontWeight: '700', color: C.blueText },
  routeRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  routeDot:     { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  routeText:    { fontSize: 12, fontWeight: '500', color: C.textPrimary, flexShrink: 1, maxWidth: '40%' },
  routeLine:    { flex: 1, height: 1, backgroundColor: C.border },
  orderBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderMeta:    { fontSize: 11, fontWeight: '500', color: C.textLight, flex: 1 },
  btnAccept:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: C.primary },
  btnAcceptText:{ fontSize: 12, color: C.white, fontWeight: '700' },
  emptyBox:     { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji:   { fontSize: 40, marginBottom: 10 },
  emptyText:    { fontSize: 14, fontWeight: '500', color: C.textLight },
});