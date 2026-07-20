import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Animated, PanResponder, Dimensions,
  StatusBar, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

// Helper to open telephone dialer on both Native (Expo/React Native) and Web
const openPhoneCall = (phone) => {
  if (!phone) {
    Alert.alert('No Phone Number', 'Phone number is not available.');
    return;
  }
  const cleanPhone = phone.toString().replace(/[^0-9+]/g, '');
  const url = `tel:${cleanPhone}`;
  if (Platform.OS === 'web') {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch (e) {}
      }, 100);
    } catch (e) {
      console.error('Call failed', e);
      window.location.href = url;
    }
  } else {
    Linking.openURL(url).catch(() => {
      Alert.alert('Cannot Call', 'Unable to open the dialer app. Please call manually.');
    });
  }
};


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

// ──────────────────────────────────────────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'reach_pickup', label: 'Reach Pickup',  api: null,        btnLabel: 'Reached Pickup Location' },
  { key: 'pick_order',   label: 'Pick Order',    api: 'picked_up', btnLabel: 'Picked Order'            },
  { key: 'reach_drop',   label: 'Reach Drop',    api: null,        btnLabel: 'Reached Drop Location'   },
  { key: 'drop_order',   label: 'Drop Order',    api: 'delivered', btnLabel: 'Order Delivered'         },
];

// Helper to get clientX for mouse/touch events on web
const getClientX = (e) => {
  if (e.touches && e.touches.length > 0) {
    return e.touches[0].clientX;
  }
  if (e.changedTouches && e.changedTouches.length > 0) {
    return e.changedTouches[0].clientX;
  }
  return e.clientX;
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
const THUMB = 54;

function SlideButton({ label, onComplete, color = C.primary, onDragStart, onDragEnd }) {
  const pan             = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false);
  const isDragging      = useRef(false);
  const dragRange       = useRef(0);
  const startXRef       = useRef(0);
  const trackRef        = useRef(null);

  // Always hold the latest onComplete so PanResponder (created once via useRef)
  // never calls a stale closure from the first render.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Remake states for premium interactions
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Animated values for micro-interactions
  const scaleAnim     = useRef(new Animated.Value(1)).current;
  const chevronAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const donePopAnim   = useRef(new Animated.Value(0)).current;

  // Reset when the step changes
  useEffect(() => {
    setDone(false);
    pan.setValue(0);
    donePopAnim.setValue(0);
  }, [label]);

  // Spring animations for Hover & Press states
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: pressed ? 0.93 : hovered ? 1.05 : 1,
      friction: 5,
      tension: 140,
      useNativeDriver: false,
    }).start();
  }, [hovered, pressed]);

  // Loop chevron micro-movement (visual cue to slide)
  useEffect(() => {
    if (done) return;
    const chevron = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronAnim, { toValue: 5, duration: 800, useNativeDriver: false }),
        Animated.timing(chevronAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    );
    chevron.start();
    return () => chevron.stop();
  }, [done]);

  // Gentle pulse on label text to indicate interactivity
  useEffect(() => {
    if (done) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.65, duration: 1200, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [done]);

  // Pop animation when done is triggered
  useEffect(() => {
    if (done) {
      Animated.spring(donePopAnim, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: false,
      }).start();
    } else {
      donePopAnim.setValue(0);
    }
  }, [done]);

  const onLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    const newRange = Math.max(w - THUMB - 10, 0); // track height 64, thumb 54, padding 5 => w - THUMB - 10
    dragRange.current = newRange;
    if (done) {
      pan.setValue(newRange);
    } else {
      const cur = pan.__getValue ? pan.__getValue() : 0;
      if (cur > newRange) {
        pan.setValue(newRange);
      }
    }
  };

  // ── Native touch (mobile) ──────────────────────────────────────────
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => !done,
      onStartShouldSetPanResponderCapture: () => !done,
      onMoveShouldSetPanResponder:         (_, g) => !done && Math.abs(g.dx) > 2,
      onMoveShouldSetPanResponderCapture:  (_, g) => !done && Math.abs(g.dx) > 2,
      onPanResponderGrant: () => {
        isDragging.current = true;
        setPressed(true);
        onDragStart?.();
      },
      onPanResponderMove: (_, g) => {
        pan.setValue(Math.max(0, Math.min(g.dx, dragRange.current)));
      },
      onPanResponderRelease: (_, g) => {
        isDragging.current = false;
        setPressed(false);
        onDragEnd?.();
        if (g.dx >= dragRange.current * 0.80) {
          Animated.spring(pan, { toValue: dragRange.current, useNativeDriver: false })
            .start(async () => {
              try {
                const ok = await onCompleteRef.current?.();
                if (ok === false) {
                  // Action rejected — reset slider back to start
                  setDone(false);
                  Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
                } else {
                  setDone(true);
                }
              } catch (_) {
                setDone(false);
                Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
              }
            });
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        setPressed(false);
        onDragEnd?.();
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  // Multiply fade out logic with general pulsing animation
  const labelOpacity = Animated.multiply(
    pulseAnim,
    pan.interpolate({
      inputRange:  [0, 80],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    })
  );

  // ── Web / PC mouse & touch support (Delta based - extremely smooth, no snapping) ──
  const webStartDrag = (e) => {
    if (done) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    
    let currentDragRange = dragRange.current;
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect?.();
      if (rect && rect.width > 0) {
        currentDragRange = Math.max(rect.width - THUMB - 10, 0);
        dragRange.current = currentDragRange;
      }
    }
    if (currentDragRange <= 0) {
      currentDragRange = 300;
    }

    const startX = getClientX(e);
    isDragging.current = true;
    setPressed(true);
    onDragStart?.();

    const onMove = (mv) => {
      if (!isDragging.current) return;
      const currentX = getClientX(mv);
      const dx = currentX - startX;
      pan.setValue(Math.max(0, Math.min(dx, currentDragRange)));
    };

    const onUp = async (mu) => {
      isDragging.current = false;
      setPressed(false);
      onDragEnd?.();
      
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);

      const currentX = getClientX(mu);
      const dx = currentX - startX;
      if (dx >= currentDragRange * 0.80) {
        Animated.spring(pan, { toValue: currentDragRange, useNativeDriver: false })
          .start(async () => {
            try {
              const ok = await onComplete?.();
              if (ok === false) {
                // Action rejected — reset slider back to start
                setDone(false);
                Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
              } else {
                setDone(true);
              }
            } catch (_) {
              setDone(false);
              Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
            }
          });
      } else {
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
  };

  const thumbWebProps = Platform.OS === 'web'
    ? { 
        onMouseDown: webStartDrag, 
        onTouchStart: webStartDrag,
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => { setHovered(false); setPressed(false); },
      }
    : {};

  const webStyle = Platform.OS === 'web'
    ? { 
        cursor: done ? 'default' : 'grab', 
        userSelect: 'none',
        transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.15s ease',
      }
    : {};

  const trackBgColor = done ? color : 'rgba(232, 248, 238, 0.45)';
  const trackBorderColor = done ? color : 'rgba(46, 125, 50, 0.18)';
  const labelColor = done ? C.white : '#1A6B38';

  return (
    <View
      ref={trackRef}
      onLayout={onLayout}
      style={[
        sb.track,
        {
          backgroundColor: trackBgColor,
          borderColor: trackBorderColor,
        }
      ]}
    >
      {/* Dynamic expanding gradient fill */}
      <Animated.View style={[sb.fillContainer, { width: Animated.add(pan, THUMB + 10) }]}>
        <LinearGradient
          colors={['#1B5E20', '#2E7D32', '#4CAF50']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={sb.fillGradient}
        />
      </Animated.View>

      {/* Label Text */}
      <Animated.Text style={[sb.label, { opacity: labelOpacity, color: labelColor }]}>
        {done ? 'Done ✓' : label}
      </Animated.Text>

      {/* Slide Thumb */}
      <Animated.View
        style={[
          sb.thumb,
          {
            transform: [
              { translateX: pan },
              { scale: scaleAnim }
            ],
            shadowColor: color,
          },
          webStyle
        ]}
        {...responder.panHandlers}
        {...thumbWebProps}
      >
        <LinearGradient
          colors={done ? ['#388E3C', '#1B5E20'] : [color === '#1B5E20' ? '#2E7D32' : '#81C784', color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={sb.thumbGradient}
        >
          {done ? (
            <Animated.View style={{ transform: [{ scale: donePopAnim }] }}>
              <MaterialIcons name="check" size={24} color={C.white} />
            </Animated.View>
          ) : (
            <Animated.View style={{ flexDirection: 'row', alignItems: 'center', transform: [{ translateX: chevronAnim }] }}>
              <MaterialIcons name="keyboard-arrow-right" size={22} color={C.white} style={{ marginRight: -10 }} />
              <MaterialIcons name="keyboard-arrow-right" size={22} color={C.white} />
            </Animated.View>
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const sb = StyleSheet.create({
  track: {
    alignSelf: 'stretch',
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {}),
  },
  fillContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32,
  },
  fillGradient: {
    width: SCREEN_W,
    height: '100%',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    zIndex: 1,
    textTransform: 'uppercase',
  },
  thumb: {
    position: 'absolute',
    left: 5,
    top: 5,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    zIndex: 2,
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  thumbGradient: {
    flex: 1,
    borderRadius: THUMB / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
                {past
                  ? <MaterialIcons name="check" size={14} color={C.white} />
                  : <Text style={[spb.dotNum, active && { color: C.white }]}>{i + 1}</Text>}
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
function ActionButtons({ onCall, onMap, phone, hideCall = false }) {
  const handleCall = () => {
    if (phone) {
      openPhoneCall(phone);
    } else if (onCall) {
      onCall();
    } else {
      Alert.alert('No Phone Number', 'Phone number is not available for this contact.');
    }
  };

  return (
    <View style={ab.row}>
      {!hideCall && (
        <TouchableOpacity style={ab.btnCall} onPress={handleCall} activeOpacity={0.8}>
          <MaterialIcons name="call" size={16} color={C.textPrimary} />
          <Text style={ab.callText}>Call</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[ab.btnMap, hideCall && { flex: 1 }]} onPress={onMap} activeOpacity={0.8}>
        <MaterialIcons name="map" size={16} color={C.white} />
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
  callText: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  btnMap:  {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12, backgroundColor: C.blue,
  },
  mapText: { fontSize: 13, fontWeight: '700', color: C.white },
});

// â”€â”€ Meta row (small icon + text) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MetaRow({ icon, text }) {
  return (
    <View style={mr.row}>
      <MaterialIcons name={icon} size={15} color={C.textLight} />
      <Text style={mr.text}>{text}</Text>
    </View>
  );
}
const mr = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  text: { fontSize: 13, color: C.textSecond, fontWeight: '500' },
});

// â”€â”€ Order Items Accordion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ItemsAccordion({ items, vendorName }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={ac.wrap}>
      <TouchableOpacity style={ac.header} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={ac.iconWrap}><MaterialIcons name="receipt" size={18} color={C.textSecond} /></View>
          <View>
            <Text style={ac.title}>Order details</Text>
            <Text style={ac.sub}>{vendorName}</Text>
          </View>
        </View>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color={C.textSecond} />
      </TouchableOpacity>
      {open && (
        <View style={ac.body}>
          {items?.map((item, i) => (
            <View key={i} style={ac.itemRow}>
              <Text style={ac.itemQty}>{item.quantity}x</Text>
              <Text style={ac.itemName}>{item.product_name}</Text>
              <Text style={ac.itemPrice}>Rs.{item.subtotal}</Text>
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
            hideCall
            onMap={() => openMap(vendorLoc)}
          />
          <View style={styles.metaDivider} />
          <MetaRow icon="assignment" text={`Order: ${activeOrder?.displayId || '—'}`} />
          <MetaRow icon="person" text={`Customer: ${activeOrder?.customerName || '—'}`} />
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
                <View style={ac.iconWrap}><MaterialIcons name="store" size={18} color={C.textSecond} /></View>
                <View>
                  <Text style={ac.title}>Restaurant details</Text>
                  <Text style={ac.sub}>{activeOrder?.pickup}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {activeOrder?.vendorPhone && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={() => openPhoneCall(activeOrder.vendorPhone)}
                  >
                    <MaterialIcons name="call" size={14} color={C.blue} />
                    <Text style={{ fontSize: 12, color: C.blue, fontWeight: '700' }}>Call</Text>
                  </TouchableOpacity>
                )}
                {vendorLoc && (
                  <TouchableOpacity onPress={() => openMap(vendorLoc)}>
                    <Text style={{ fontSize: 12, color: C.blue, fontWeight: '700' }}>Go to map</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          <View style={ac.wrap}>
            <View style={ac.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={ac.iconWrap}><MaterialIcons name="person" size={18} color={C.textSecond} /></View>
                <View>
                  <Text style={ac.title}>Customer details</Text>
                  <Text style={ac.sub}>{activeOrder?.customerName || 'â€”'}</Text>
                </View>
              </View>
              {activeOrder?.customerPhone && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => openPhoneCall(activeOrder.customerPhone)}
                >
                  <MaterialIcons name="call" size={14} color={C.blue} />
                  <Text style={{ fontSize: 12, color: C.blue, fontWeight: '700' }}>Call</Text>
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
          <MetaRow icon="assignment" text={`Order: ${activeOrder?.displayId || '—'}`} />
          <MetaRow icon="store" text={`Pickup: ${activeOrder?.pickup || '—'}`} />
        </View>
      )}

      {/* â”€â”€ Step 3 â€“ Drop Order â”€â”€ */}
      {step === 3 && (
        <View>
          <View style={styles.stepCard}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentCheck}>
                <MaterialIcons name="check" size={16} color={C.white} />
              </View>
              <View>
                <Text style={styles.paymentTitle}>Paid online</Text>
                <Text style={styles.paymentSub}>Order: {activeOrder?.displayId || 'â€”'}</Text>
              </View>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.customerRow}>
              <View style={styles.customerIconWrap}>
                <MaterialIcons name="person" size={22} color={C.textSecond} />
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

// ── Queued Order Card ──
function QueuedOrderCard({ order, onAccept, isAccepting }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const updateElapsed = () => {
      if (!order.assignedAt) return '';
      const diff = Math.floor((Date.now() - new Date(order.assignedAt).getTime()) / 1000);
      if (diff < 60) return `${diff}s ago`;
      const min = Math.floor(diff / 60);
      if (min < 60) return `${min}m ago`;
      const hr = Math.floor(min / 60);
      return `${hr}h ago`;
    };
    setElapsed(updateElapsed());
    const id = setInterval(() => setElapsed(updateElapsed()), 15000);
    return () => clearInterval(id);
  }, [order.assignedAt]);

  return (
    <View style={qoc.card}>
      <View style={qoc.top}>
        <View style={qoc.topLeft}>
          <Text style={qoc.orderId}>{order.orderNumber}</Text>
          <Text style={qoc.timeText}>{elapsed}</Text>
        </View>
        <View style={qoc.badge}>
          <Text style={qoc.badgeText}>Queued</Text>
        </View>
      </View>
      <View style={qoc.routeRow}>
        <View style={[qoc.dot, { backgroundColor: C.blue }]} />
        <Text style={qoc.routeText} numberOfLines={1}>{order.pickup?.shop_name || '\u2014'}</Text>
        <View style={qoc.routeLine} />
        <View style={[qoc.dot, { backgroundColor: C.red }]} />
        <Text style={qoc.routeText} numberOfLines={1}>{order.dropoff?.city || order.dropoff?.address_line || '\u2014'}</Text>
      </View>
      <View style={qoc.bottom}>
        <Text style={qoc.meta}>{'\u20B9'}{order.total} · {order.itemCount} items</Text>
        <TouchableOpacity
          style={[qoc.btn, isAccepting && { opacity: 0.6 }]}
          onPress={() => onAccept(order.orderId)}
          disabled={isAccepting}
          activeOpacity={0.85}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <Text style={qoc.btnText}>Accept</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const qoc = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  timeText: { fontSize: 11, fontWeight: '600', color: '#F59E0B' },
  badge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  routeText: { fontSize: 12, fontWeight: '500', color: C.textPrimary, flexShrink: 1, maxWidth: '38%' },
  routeLine: { flex: 1, height: 1, backgroundColor: C.border },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 11, fontWeight: '500', color: C.textLight, flex: 1 },
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: C.primary },
  btnText: { fontSize: 12, color: C.white, fontWeight: '700' },
});

// ── Main Component ──
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
  const [queuedOrders, setQueuedOrders]       = useState([]);
  const [flashMsg, setFlashMsg]               = useState(null);
  const flashTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  // Flash toast auto-hide
  const showFlash = (msg) => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashMsg(msg);
    flashTimeoutRef.current = setTimeout(() => setFlashMsg(null), 4000);
  };


  // -- AsyncStorage helpers: persist the local UI step per delivery --
  const STEP_KEY = (id) => `delivery_step_${id}`;
  const saveStep = async (id, s) => {
    try { await AsyncStorage.setItem(STEP_KEY(id), String(s)); } catch (_) {}
  };
  const loadStep = async (id) => {
    try {
      const v = await AsyncStorage.getItem(STEP_KEY(id));
      return v !== null ? parseInt(v, 10) : null;
    } catch (_) { return null; }
  };
  const clearStep = async (id) => {
    try { await AsyncStorage.removeItem(STEP_KEY(id)); } catch (_) {}
  };
  // ── Fetch queued orders ──
  const fetchQueuedOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/delivery/queued`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && data.data.orders) {
        setQueuedOrders(data.data.orders);
      }
    } catch (err) {
      console.log('fetchQueuedOrders error', err);
    }
  };

  // ── Fetch & parse orders ──
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
        // Restore persisted step, always respecting backend status as minimum floor
        const backendFloor = backendStatus === 'picked_up' ? 2 : 0;
        const cached = await loadStep(d.id);
        setStep(Math.max(cached ?? backendFloor, backendFloor));
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

  useFocusEffect(React.useCallback(() => { fetchOrders(); fetchQueuedOrders(); }, [token]));

  useEffect(() => {
    if (user) {
      setPartner({
        name: user.name || 'Partner',
        id: `DP-${user.id}`,
        initials: (user.name || 'DP').substring(0, 2).toUpperCase(),
      });
    }
    fetchOrders();
    fetchQueuedOrders();
  }, [user]);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('order:new', () => { fetchOrders(); fetchQueuedOrders(); });
    socket.on('order:incoming', (data) => setIncomingOrder(data));
    socket.on('delivery_status_update', () => { fetchOrders(); fetchQueuedOrders(); });
    socket.on('order:assigned_flash', (data) => {
      const msg = data.isQueued
        ? `Queued: ${data.shopName} \u00B7 ${data.itemCount} items \u00B7 \u20B9${data.total}`
        : `New order: ${data.shopName} \u00B7 ${data.itemCount} items \u00B7 \u20B9${data.total}`;
      showFlash(msg);
      fetchQueuedOrders();
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);

  // Auto-expire queued orders client-side (5 min timer)
  useEffect(() => {
    if (queuedOrders.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const QUEUE_EXPIRY_MS = 5 * 60 * 1000;
      setQueuedOrders(prev => {
        const stillValid = prev.filter(o => {
          const age = now - new Date(o.assignedAt).getTime();
          return age < QUEUE_EXPIRY_MS;
        });
        return stillValid;
      });
    }, 10000); // check every 10s
    return () => clearInterval(interval);
  }, [queuedOrders.length]);

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
      if (data.success) { fetchOrders(); fetchQueuedOrders(); }
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



const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371e3; // Earth radius in meters
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};


  const handleDeclineActiveOrder = () => {
    Alert.alert(
      "Decline Delivery",
      "Are you sure you want to decline this delivery request? It will be unassigned from you.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/delivery/decline/${activeOrder.orderIdRaw}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert("Declined", "You have successfully declined this delivery.");
                if (activeOrder?.id) {
                  await clearStep(activeOrder.id);
                }
                setActiveOrder(null);
                setStep(0);
                fetchOrders();
              } else {
                Alert.alert("Error", data.message || "Failed to decline delivery.");
              }
            } catch (e) {
              Alert.alert("Error", "Network error.");
            }
          }
        }
      ]
    );
  };

  const handleStepComplete = async () => {
    const displayStep = Math.min(Math.max(step, 0), STEPS.length - 1);
    
    // Distance check for Reach Pickup (0) and Reach Drop (2)
    // Skip on web — browser GPS is unreliable for proximity enforcement.
    if (Platform.OS !== 'web' && (displayStep === 0 || displayStep === 2)) {
      const targetLoc = displayStep === 0 ? activeOrder?.vendorLoc : activeOrder?.dropLoc;
      if (targetLoc && targetLoc.latitude && targetLoc.longitude) {
        if (!myLocation) {
          Alert.alert("Location Error", "Unable to determine your current location. Please ensure location services are enabled.");
          return false; // Signal slider to reset
        }
        const distMeters = calculateDistanceMeters(
          myLocation.latitude,
          myLocation.longitude,
          targetLoc.latitude,
          targetLoc.longitude
        );
        
        if (distMeters > 200) {
          Alert.alert(
            "Too Far Away",
            `You must be within 200 meters of the location to slide. (Current distance: ${Math.round(distMeters)} meters)`,
            [
              { text: "OK", style: "cancel" },
              {
                text: "Mock Arrival (Test)",
                onPress: () => {
                  setMyLocation({
                    latitude: targetLoc.latitude,
                    longitude: targetLoc.longitude,
                  });
                  proceedStepComplete(displayStep);
                }
              }
            ]
          );
          return false; // Signal slider to reset
        }
      }
    }

    await proceedStepComplete(displayStep);
    return true; // Signal slider to stay done
  };

  const proceedStepComplete = async (displayStep) => {
    const currentStepDef = STEPS[displayStep];
    if (!currentStepDef) return;

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
          if (activeOrder?.id) await clearStep(activeOrder.id);
          setDeliveryCount(c => c + 1);
          setEarnings(e => e + (activeOrder?.deliveryFee || 65));
          setTimeout(() => { setActiveOrder(null); setStep(0); fetchOrders(); }, 800);
          return;
        }
      } catch (e) { Alert.alert('Error', 'Network error'); return; }
    }
    if (displayStep < STEPS.length - 1) {
      const nextStep = displayStep + 1;
      if (activeOrder?.id) await saveStep(activeOrder.id, nextStep);
      setTimeout(() => setStep(nextStep), 400);
    }
  };


  // ── Render ──
  const [scrollEnabled, setScrollEnabled] = useState(true);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={C.heroBg} />
      <IncomingOrderSheet
        order={incomingOrder}
        onAccept={handleAcceptIncoming}
        onDecline={() => setIncomingOrder(null)}
      />

      {/* Flash Toast */}
      {flashMsg ? (
        <View style={flashStyles.toast}>
          <MaterialIcons name="notifications-active" size={18} color="#fff" />
          <Text style={flashStyles.text}>{flashMsg}</Text>
        </View>
      ) : null}

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
          <>
          <View style={styles.stepperWrap}>
            {/* Header */}
            <View style={styles.stepperHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepperTitle}>Active Delivery</Text>
                <Text style={styles.stepperSub}>{activeOrder.displayId} · {activeOrder.meta}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {step < 2 && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#FEF2F2',
                      borderColor: '#FCA5A5',
                      borderWidth: 1,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                    onPress={handleDeclineActiveOrder}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Decline</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{step + 1}/4</Text>
                </View>
              </View>
            </View>

            {/* Step label */}
            <View style={styles.stepLabelRow}>
              <MaterialIcons name="expand-more" size={22} color={C.textSecond} />
              <Text style={styles.stepLabelText}>{STEPS[Math.min(Math.max(step, 0), STEPS.length - 1)]?.label}</Text>
            </View>

            {/* Progress dots */}
            <StepBar currentStep={step} />

            {/* Step content */}
            <StepContent step={step} activeOrder={activeOrder} myLocation={myLocation} />

            {/* Slide button */}
            <View style={styles.slideWrap}>
              <SlideButton
                key={`slide-${Math.min(Math.max(step, 0), STEPS.length - 1)}`}
                label={STEPS[Math.min(Math.max(step, 0), STEPS.length - 1)]?.btnLabel}
                onComplete={handleStepComplete}
                color={Math.min(Math.max(step, 0), STEPS.length - 1) === 3 ? '#1B5E20' : C.primary}
                onDragStart={() => setScrollEnabled(false)}
                onDragEnd={() => setScrollEnabled(true)}
              />
            </View>
          </View>

          {/* ── Queued Orders Section ── */}
          {queuedOrders.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionTitle}>
                Queued orders ({queuedOrders.length})
              </Text>
              {queuedOrders.map(order => (
                <QueuedOrderCard
                  key={order.orderId}
                  order={order}
                  onAccept={handleAccept}
                  isAccepting={false}
                />
              ))}
            </View>
          )}
          </>
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
                <MaterialIcons name="delivery-dining" size={48} color={C.textLight} />
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
  slideWrap: {
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.border
  },

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

const flashStyles = StyleSheet.create({
  toast: {
    position: 'absolute', top: Platform.OS === 'android' ? 40 : 60, left: 16, right: 16, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1B5E20', paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  text: { fontSize: 13, fontWeight: '700', color: '#fff', flex: 1 },
});
