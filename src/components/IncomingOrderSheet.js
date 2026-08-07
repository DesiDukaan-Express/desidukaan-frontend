
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions, Platform
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const SLIDER_TRACK_W = SCREEN_W - 80; // 40px padding each side
const THUMB_SIZE = 56;
const SLIDER_INNER_W = SLIDER_TRACK_W - THUMB_SIZE - 4; // draggable range

const C = {
  primary: '#1B6B28',
  primaryMid: '#2E7D32',
  primaryLight: '#EAF3DE',
  primaryText: '#27500A',
  red: '#E24B4A',
  redLight: '#FCEBEB',
  redText: '#791F1F',
  blue: '#378ADD',
  blueLight: '#E6F1FB',
  blueText: '#0C447C',
  bg: '#F5F7F5',
  border: '#E8EDE8',
  textPrimary: '#1A1A1A',
  textSecond: '#666666',
  textLight: '#999999',
  white: '#FFFFFF',
};

function CountdownRing({ seconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) { onExpire?.(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const pct = remaining / seconds;
  const color = pct > 0.5 ? C.primaryMid : pct > 0.25 ? '#F59E0B' : C.red;

  return (
    <View style={ring.wrap}>
      <Text style={[ring.num, { color }]}>{remaining}</Text>
      <Text style={ring.label}>sec</Text>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 16, fontWeight: '800', lineHeight: 18 },
  label: { fontSize: 9, color: C.textLight, fontWeight: '600' },
});

// ── Slide-to-Accept Slider ────────────────────────────────────────────────────
function SlideToAccept({ onAccept }) {
  const pan = useRef(new Animated.Value(0)).current;
  const [accepted, setAccepted] = useState(false);
  const isDragging = useRef(false);
  const dragRange = useRef(0);
  const trackRef = useRef(null);

  // Remake states for premium interactions
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Animated values for micro-interactions
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const donePopAnim = useRef(new Animated.Value(0)).current;

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
    if (accepted) return;
    const chevron = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronAnim, { toValue: 5, duration: 800, useNativeDriver: false }),
        Animated.timing(chevronAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    );
    chevron.start();
    return () => chevron.stop();
  }, [accepted]);

  // Gentle pulse on label text to indicate interactivity
  useEffect(() => {
    if (accepted) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.65, duration: 1200, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [accepted]);

  // Pop animation when accepted is triggered
  useEffect(() => {
    if (accepted) {
      Animated.spring(donePopAnim, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: false,
      }).start();
    } else {
      donePopAnim.setValue(0);
    }
  }, [accepted]);

  const onLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    const newRange = Math.max(w - THUMB_SIZE - 10, 0); // track padding 5 on each side
    dragRange.current = newRange;
    if (accepted) {
      pan.setValue(newRange);
    } else {
      const cur = pan.__getValue ? pan.__getValue() : 0;
      if (cur > newRange) {
        pan.setValue(newRange);
      }
    }
  };

  // Helper to get clientX for mouse/touch events on web
  const getClientX = (e) => {
    if (e.touches && e.touches.length > 0) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientX;
    return e.clientX;
  };

  // ── Native touch (mobile) ──────────────────────────────────────────
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !accepted,
      onStartShouldSetPanResponderCapture: () => !accepted,
      onMoveShouldSetPanResponder: (_, g) => !accepted && Math.abs(g.dx) > 2,
      onMoveShouldSetPanResponderCapture: (_, g) => !accepted && Math.abs(g.dx) > 2,
      onPanResponderGrant: () => {
        isDragging.current = true;
        setPressed(true);
      },
      onPanResponderMove: (_, g) => {
        pan.setValue(Math.max(0, Math.min(g.dx, dragRange.current)));
      },
      onPanResponderRelease: (_, g) => {
        isDragging.current = false;
        setPressed(false);
        if (g.dx >= dragRange.current * 0.80) {
          Animated.spring(pan, { toValue: dragRange.current, useNativeDriver: false })
            .start(() => { setAccepted(true); onAccept?.(); });
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        setPressed(false);
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  // Multiply fade out logic with general pulsing animation
  const labelOpacity = Animated.multiply(
    pulseAnim,
    pan.interpolate({
      inputRange: [0, 80],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    })
  );

  // ── Web / PC mouse & touch support ──
  const webStartDrag = (e) => {
    if (accepted) return;
    if (e.cancelable) e.preventDefault();

    let currentDragRange = dragRange.current;
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect?.();
      if (rect && rect.width > 0) {
        currentDragRange = Math.max(rect.width - THUMB_SIZE - 10, 0);
        dragRange.current = currentDragRange;
      }
    }
    if (currentDragRange <= 0) {
      currentDragRange = 300;
    }

    const startX = getClientX(e);
    isDragging.current = true;
    setPressed(true);

    const onMove = (mv) => {
      if (!isDragging.current) return;
      const currentX = getClientX(mv);
      const dx = currentX - startX;
      pan.setValue(Math.max(0, Math.min(dx, currentDragRange)));
    };

    const onUp = (mu) => {
      isDragging.current = false;
      setPressed(false);

      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);

      const currentX = getClientX(mu);
      const dx = currentX - startX;
      if (dx >= currentDragRange * 0.80) {
        Animated.spring(pan, { toValue: currentDragRange, useNativeDriver: false })
          .start(() => { setAccepted(true); onAccept?.(); });
      } else {
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
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
      cursor: accepted ? 'default' : 'grab',
      userSelect: 'none',
      transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.15s ease',
    }
    : {};

  const trackBgColor = accepted ? C.primaryMid : 'rgba(234, 243, 222, 0.6)';
  const trackBorderColor = accepted ? C.primaryMid : 'rgba(46, 125, 50, 0.18)';
  const labelColor = accepted ? C.white : C.primaryText;

  return (
    <View
      ref={trackRef}
      onLayout={onLayout}
      style={[
        sl.track,
        {
          backgroundColor: trackBgColor,
          borderColor: trackBorderColor,
        }
      ]}
    >
      {/* Dynamic expanding gradient fill */}
      <Animated.View style={[sl.fillContainer, { width: Animated.add(pan, THUMB_SIZE + 10) }]}>
        <LinearGradient
          colors={['#1B5E20', '#2E7D32', '#4CAF50']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={sl.fillGradient}
        />
      </Animated.View>

      {/* Label Text */}
      <Animated.Text style={[sl.label, { opacity: labelOpacity, color: labelColor }]}>
        {accepted ? 'Accepted ✓' : 'Slide to Accept Order'}
      </Animated.Text>

      {/* Slide Thumb */}
      <Animated.View
        style={[
          sl.thumb,
          {
            transform: [
              { translateX: pan },
              { scale: scaleAnim }
            ],
            shadowColor: C.primaryMid,
          },
          webStyle
        ]}
        {...responder.panHandlers}
        {...thumbWebProps}
      >
        <LinearGradient
          colors={accepted ? ['#388E3C', '#1B5E20'] : ['#81C784', C.primaryMid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={sl.thumbGradient}
        >
          {accepted ? (
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

const sl = StyleSheet.create({
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
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    zIndex: 2,
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  thumbGradient: {
    flex: 1,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
// ── Main Component ─────────────────────────────────────────────────────────────
export default function IncomingOrderSheet({ order, onAccept, onDecline, onIgnore }) {
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (order) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [order]);

  const handleDecline = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onDecline?.());
  };

  const handleIgnore = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 250,
      useNativeDriver: true,
    }).start(() => (onIgnore || onDecline)?.());
  };

  if (!order) return null;

  return (
    <Modal transparent animationType="none" visible={!!order} onRequestClose={handleDecline}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={handleDecline} />

        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle bar */}
          <View style={s.handle} />

          {/* Header row */}
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerTitle}>New Delivery Request</Text>
              <Text style={s.headerSub}>{order.orderNumber}</Text>
            </View>
            <CountdownRing seconds={60} onExpire={handleIgnore} />
          </View>

          {/* Route card */}
          <View style={s.routeCard}>
            {/* Pickup */}
            <View style={s.routeItem}>
              <View style={[s.routeDot, { backgroundColor: C.blue }]} />
              <View style={s.routeInfo}>
                <Text style={s.routeTagText}>PICKUP</Text>
                <Text style={s.routeName}>{order.pickup?.name}</Text>
                <Text style={s.routeAddr}>{order.pickup?.address}</Text>
              </View>
            </View>

            {/* Dashed connector */}
            <View style={s.connector}>
              <View style={s.connectorLine} />
            </View>

            {/* Dropoff */}
            <View style={s.routeItem}>
              <View style={[s.routeDot, { backgroundColor: C.red }]} />
              <View style={s.routeInfo}>
                <Text style={s.routeTagText}>DROPOFF</Text>
                <Text style={s.routeName}>{order.dropoff?.address}</Text>
                <Text style={s.routeAddr}>{order.dropoff?.city}</Text>
              </View>
            </View>
          </View>

          {/* Meta pills */}
          <View style={s.pillRow}>
            <View style={[s.pill, { backgroundColor: C.primaryLight }]}>
              <Text style={[s.pillText, { color: C.primaryText, fontWeight: '700' }]}>
                ₹{order.deliveryFee} fee
              </Text>
            </View>
            <View style={s.pill}>
              <Text style={s.pillText}>{order.itemCount} items</Text>
            </View>
            <View style={s.pill}>
              <Text style={s.pillText}>₹{order.total} total</Text>
            </View>
          </View>

          {/* Slider */}
          <View style={s.sliderWrap}>
            <SlideToAccept onAccept={onAccept} />
          </View>

          {/* Decline */}
          <TouchableOpacity style={s.declineBtn} onPress={handleDecline}>
            <Text style={s.declineText}>Decline Order</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  headerSub: { fontSize: 12, color: C.textLight, marginTop: 2 },

  routeCard: { backgroundColor: C.bg, borderRadius: 14, padding: 14, marginBottom: 14 },
  routeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  routeInfo: { flex: 1 },
  routeTagText: { fontSize: 9, fontWeight: '800', color: C.textLight, letterSpacing: 1, marginBottom: 1 },
  routeName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  routeAddr: { fontSize: 11, color: C.textSecond, marginTop: 1 },

  connector: { paddingLeft: 4, marginVertical: 6 },
  connectorLine: { width: 2, height: 14, backgroundColor: C.border, marginLeft: 3 },

  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.bg, borderWidth: 0.5, borderColor: C.border },
  pillText: { fontSize: 12, color: C.textSecond },

  sliderWrap: { alignItems: 'stretch', marginBottom: 14, alignSelf: 'stretch' },

  declineBtn: { alignItems: 'center', paddingVertical: 12 },
  declineText: { fontSize: 14, fontWeight: '600', color: C.red },
});