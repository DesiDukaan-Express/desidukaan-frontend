import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { io } from 'socket.io-client';
import { View, Text, Platform, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import useOrderStore from '../store/orderStore';
import { useTheme } from '../theme/ThemeContext';

import HomeScreen from '../apps/customer/HomeScreen';
import SearchScreen from '../apps/customer/SearchScreen';
import CartScreen from '../apps/customer/CartScreen';
import OrdersScreen from '../apps/customer/OrdersScreen';
import ProfileScreen from '../apps/customer/ProfileScreen';
import VendorStoreScreen from '../apps/customer/VendorStoreScreen';
import TrackOrderScreen from '../apps/customer/TrackOrderScreen';
import WishlistScreen from '../apps/customer/WishlistScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

// ─── Palette matching the app (light / dark) ────────────────────────────────
const LIGHT_COLORS = {
  green:       '#16A34A',
  greenLight:  '#F0FDF4',
  orange:      '#F97316',
  orangeDark:  '#EA580C',
  purple:      '#7C3AED',
  surface:     '#FFFFFF',
  surfaceLow:  '#F8FAFC',
  border:      '#E5E7EB',
  gray400:     '#9CA3AF',
  gray600:     '#4B5563',
  gray900:     '#111827',
  greenDark:   '#15803D',
  red:         '#DC2626',
};
const DARK_COLORS = {
  green:       '#27E26C',
  greenLight:  '#0A481D',
  orange:      '#F97316',
  orangeDark:  '#F36216',
  purple:      '#9F7AEA',
  surface:     '#14212F',
  surfaceLow:  '#0D161F',
  border:      '#383E49',
  gray400:     '#6D7787',
  gray600:     '#9EA8B6',
  gray900:     '#EDF0F7',
  greenDark:   '#2DDC6E',
  red:         '#EF4444',
};

const TAB_ICONS = {
  Home:    'home',
  // Search:  'search',
  Cart:    'shopping-cart',
  Orders:  'receipt-long',
  Profile: 'person',
};

// ─── Tab icon component ────────────────────────────────────────────────────────
const TabIcon = ({ iconName, label, focused, cartCount }) => {
  const { isDark } = useTheme();
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;
  const isCart = label === 'Cart';
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        minWidth: 56,
        backgroundColor: focused ? C.greenLight : 'transparent',
      }}
    >
      <View style={{ position: 'relative' }}>
        <MaterialIcons name={iconName} size={24} color={focused ? C.green : C.gray400} />
        {isCart && cartCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              backgroundColor: C.orange,
              borderRadius: 9,
              minWidth: 16,
              height: 16,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 3,
              borderWidth: 1.5,
              borderColor: C.surface,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>
              {cartCount > 9 ? '9+' : cartCount}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{
          fontSize: 10,
          fontWeight: focused ? '700' : '500',
          color: focused ? C.green : C.gray400,
          marginTop: 2,
          letterSpacing: 0.1,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

// ─── Cart tab with live badge ──────────────────────────────────────────────────
function CartTabIcon({ focused, label }) {
  const cart = useCartStore();
  const cartCount = cart?.items?.reduce((s, i) => s + (i.qty || 1), 0) ?? 0;
  return <TabIcon iconName={TAB_ICONS['Cart']} label={label} focused={focused} cartCount={cartCount} />;
}

// ─── Bottom tab navigator ──────────────────────────────────────────────────────
function CustomerTabNavigator() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

  const TAB_LABELS = {
    Home:    t('home.tab'),
    Search:  t('search.title'),
    Cart:    t('cart.title_short'),
    Orders:  t('orders.title'),
    Profile: t('profile.title'),
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          const label = TAB_LABELS[route.name] || route.name;
          if (route.name === 'Cart') return <CartTabIcon focused={focused} label={label} />;
          return <TabIcon iconName={TAB_ICONS[route.name]} label={label} focused={focused} />;
        },
        // ProfileScreen renders its own custom bottom nav, so hide this
        // navigator's built-in tab bar just for that route to avoid a
        // duplicate nav bar. All other tabs keep the normal styled bar.
        tabBarStyle: route.name === 'Profile'
          ? { display: 'none' }
          : {
            backgroundColor: C.surface,
            borderTopWidth: 1,
            borderTopColor: C.border,
            height: Platform.OS === 'ios' ? 82 : 64,
            paddingBottom: Platform.OS === 'ios' ? 20 : 4,
            paddingTop: 4,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 16,
            overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
          },
        tabBarIconStyle: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center', height: '100%' },
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.gray400,
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    />
      {/* <Tab.Screen name="Search"  component={SearchScreen}  /> */}
      <Tab.Screen name="Cart"    component={CartScreen}    />
      <Tab.Screen name="Orders"  component={OrdersScreen}  />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Persistent Pending Order Notification ─────────────────────────────────────
// Stays visible above the tab bar while customer browses after sending an order.
// Shows a live countdown. Tap → back to Checkout (re-opens modal).
function PendingOrderMonitor() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;
  const ms = useMemo(() => makeMs(C), [C]);
  const navigation = useNavigation();
  const { token } = useAuthStore();
  const pendingOrder  = useOrderStore((s) => s.pendingOrder);
  const updatePending = useOrderStore((s) => s.updatePendingOrder);
  const clearPending  = useOrderStore((s) => s.clearPendingOrder);

  const ORDER_TIMEOUT = 300; // seconds (5 minutes) — must match Checkout.js and backend
  const [countdown, setCountdown] = useState(ORDER_TIMEOUT);
  const timerRef     = useRef(null);
  const startRef     = useRef(null);
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  // Transient toast for accepted / rejected / countered alerts
  const [toast, setToast] = useState(null);
  const toastTimerRef  = useRef(null);
  const handledRef     = useRef({});

  // ── Helpers ────────────────────────────────────────────────────────────
  const showToast = (message, type = 'info', onPress = null, duration = 8000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, onPress });
    if (duration) toastTimerRef.current = setTimeout(() => setToast(null), duration);
  };

  const openCheckout = (statusOverride) => {
    const order = useOrderStore.getState().pendingOrder;
    if (!order?.id) return;
    const root = navigation.getParent?.() || navigation;
    const effectiveStatus = statusOverride || order.status || 'pending';

    // If accepted, go directly to PaymentScreen with all final order data
    if (effectiveStatus === 'accepted') {
      const counterOffer = order.counter_offer || null;
      const rawSlot = counterOffer?.slot || order.confirmedSlot || order.slot || order.delivery_slot || null;
      const finalSlot = rawSlot ? {
        start: rawSlot.vendor_slot_start || rawSlot.slot_start || rawSlot.start,
        end: rawSlot.vendor_slot_end || rawSlot.slot_end || rawSlot.end
      } : null;
      const finalFee  = counterOffer?.delivery_fee != null
        ? counterOffer.delivery_fee
        : (order.confirmedFee ?? order.delivery_fee ?? null);
      const finalTotal = counterOffer?.total != null
        ? counterOffer.total
        : (order.total ?? null);

      root.navigate('Payment', {
        orderId:          order.id,
        orderNumber:      order.order_number || `ORD-${order.id}`,
        vendorName:       order.vendorName || order.vendor?.shop_name || 'Store',
        items:            order.snapshotItems || order.items || [],
        subtotal:         order.snapshotSubtotal ?? order.subtotal ?? 0,
        deliveryFee:      finalFee ?? 0,
        total:            finalTotal ?? 0,
        confirmedSlot:    finalSlot,
        deliveryTypePref: order.deliveryTypePref || order.delivery_type_pref || 'standard',
        vendorPhone:      order.vendorPhone || null,
        phoneStatus:      order.phoneStatus  || null,
        preSelectedPay:   order.selectedPay  || null,
      });
      return;
    }

    // For pending / countered — go back to Checkout
    root.navigate('Checkout', {
      resumePendingOrder: true,
      pendingOrder: order,
      orderId: order.id,
      initialOrderStatus: effectiveStatus,
      confirmedSlot:    order.confirmedSlot || order.slot || null,
      selectedPay:      order.selectedPay || null,
      snapshotItems:    order.snapshotItems || order.items || [],
      snapshotSubtotal: order.snapshotSubtotal ?? order.subtotal ?? 0,
      vendorId:         order.vendor_id || order.vendorId,
      vendorName:       order.vendorName || order.vendor?.shop_name || 'Store',
      deliveryTypePref: order.deliveryTypePref || order.delivery_type_pref || 'standard',
      proposedFee:      order.proposedFee ?? null,
      confirmedFee:     order.confirmedFee ?? order.delivery_fee ?? null,
    });
  };

  // ── Countdown timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (pendingOrder?.status === 'pending') {
      // Use placedAt from store so countdown is accurate even after re-mounts
      const placedAt = pendingOrder.placedAt || Date.now();
      startRef.current = placedAt;

      const tick = () => {
        const elapsed   = Math.floor((Date.now() - placedAt) / 1000);
        const remaining = Math.max(0, ORDER_TIMEOUT - elapsed);
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          updatePending({ status: 'expired' });
        }
      };
      tick(); // fire immediately so display is right on mount
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(tick, 1000);
    } else {
      startRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pendingOrder?.status, pendingOrder?.id, pendingOrder?.placedAt]);

  // ── Pulse animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (pendingOrder?.status === 'pending') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.14, duration: 650, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 650, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [pendingOrder?.status]);

  // ── Socket listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });

    socket.on('order:update', (data) => {
      const current = useOrderStore.getState().pendingOrder;
      if (!current?.id || String(data.order_id) !== String(current.id)) return;
      const key = `${data.order_id}:${data.status}`;
      if (handledRef.current[key]) return;
      handledRef.current[key] = true;

      updatePending({ status: data.status, order_number: data.order_number });

      if (data.status === 'accepted') {
        showToast(t('orders.orderAcceptedTapToPayToast', '✅ Order accepted! Tap to pay.'), 'success', () => openCheckout('accepted'), null);
      } else if (data.status === 'rejected' || data.status === 'cancelled') {
        const declineNote = data.reason || data.cancellation_reason;
        const msg = declineNote
          ? `❌ Order Declined: "${declineNote}"`
          : t('orders.storeDeclinedOrderToast', '❌ Store declined your order.');
        showToast(msg, 'danger', null, 8000);
        setTimeout(() => clearPending(), 8000);
      }
    });

    socket.on('order:countered', (data) => {
      const current = useOrderStore.getState().pendingOrder;
      if (!current?.id || String(data.order_id) !== String(current.id)) return;
      const key = `${data.order_id}:countered`;
      if (handledRef.current[key]) return;
      handledRef.current[key] = true;

      updatePending({ status: 'countered', counter_offer: data.counter_offer });
      showToast(t('orders.storeSuggestedChangesToast', '🔄 Store suggested changes. Tap to review.'), 'countered', () => openCheckout('countered'), null);
    });

    socket.on('delivery_assigned', (data) => {
      console.log('[CustomerTabs WS] delivery_assigned received', data);
      const partnerName = data.partner?.user?.name || 'A delivery partner';
      const orderId = data.order_id || data.orderId;

      showToast(
        t('orders.deliveryPartnerAssignedToast', { defaultValue: `🛵 ${partnerName} has been assigned as your delivery partner! Tap to track.`, partnerName }),
        'success',
        () => {
          const root = navigation.getParent?.() || navigation;
          root.navigate('TrackOrder', { orderId, orderNumber: `ORD-${orderId}` });
        },
        10000
      );
    });

    socket.on('delivery:declined', (data) => {
      const current = useOrderStore.getState().pendingOrder;
      const orderId = data.order_id || data.orderId;
      if (current?.id && String(orderId) !== String(current.id)) return;

      showToast(
        t('orders.deliveryPartnerDeclinedToast', '🛵 Delivery partner declined. Finding a new partner...'),
        'warning',
        null,
        5000
      );
    });

    return () => socket.disconnect();
  }, [token]);

  // ── Polling fallback ───────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !pendingOrder?.id) return;
    if (!['pending', 'countered'].includes(pendingOrder?.status)) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/orders/${pendingOrder.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        const order = d.data?.order || d.order;
        if (order?.status && order.status !== pendingOrder.status) {
          updatePending({ status: order.status });
        }
      } catch (_) { /* silent */ }
    }, 10000);

    return () => clearInterval(poll);
  }, [token, pendingOrder?.id, pendingOrder?.status]);

  // ── Cleanup ────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (timerRef.current)      clearInterval(timerRef.current);
  }, []);

  const status     = pendingOrder?.status;
  const vendor     = pendingOrder?.vendorName || pendingOrder?.vendor?.shop_name || 'Store';
  const isPersist  = pendingOrder?.id && ['pending', 'countered', 'expired', 'accepted'].includes(status);

  if (!isPersist && !toast) return null;

  return (
    <>
      {/* ── Persistent live-timer banner ─────────────────────────────── */}
      {isPersist && (
        <TouchableOpacity
          style={[
            ms.banner,
            status === 'pending'   && ms.bPending,
            status === 'accepted'  && ms.bAccepted,
            status === 'countered' && ms.bCountered,
            status === 'expired'   && ms.bExpired,
          ]}
          onPress={() => openCheckout(status)}
          activeOpacity={0.88}
        >
          {/* Timer / icon bubble */}
      {status === 'pending' ? (
            <Animated.View style={[ms.bubble, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={ms.bubbleText}>{countdown}s</Text>
            </Animated.View>
          ) : status === 'accepted' ? (
            <View style={ms.bubble}>
              <Feather name="credit-card" size={17} color="#fff" />
            </View>
          ) : (
            <View style={ms.bubble}>
              <Feather
                name={status === 'countered' ? 'edit-3' : 'clock'}
                size={17}
                color="#fff"
              />
            </View>
          )}

          {/* Text */}
          <View style={{ flex: 1 }}>
            <Text style={ms.bannerTitle} numberOfLines={1}>
              {status === 'pending'
                ? t('checkout.waitingForVendor', { defaultValue: `Waiting for ${vendor}…`, vendor })
                : status === 'accepted'
                ? t('checkout.orderConfirmedProceedPay', 'Order Confirmed — Proceed to Pay')
                : status === 'countered'
                ? t('checkout.vendorSuggestedChanges', { defaultValue: `${vendor} suggested changes`, vendor })
                : t('checkout.requestExpired', 'Request expired')}
            </Text>
            <Text style={ms.bannerSub}>
              {status === 'pending'
                ? t('checkout.remainingTapToView', { defaultValue: `${countdown}s remaining · tap to view`, seconds: countdown })
                : status === 'accepted'
                ? t('checkout.tapToCompletePayment', 'Tap to complete payment')
                : status === 'countered'
                ? t('checkout.tapToReviewRespond', 'Tap to review & respond')
                : t('checkout.tapForDetails', 'Tap for details')}
            </Text>
          </View>

          <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      )}

      {/* ── Transient toast (accepted / rejected / countered flash) ──── */}
      {toast && (
        <TouchableOpacity
          style={[
            ms.toast,
            toast.type === 'success'   && ms.tSuccess,
            toast.type === 'danger'    && ms.tDanger,
            toast.type === 'countered' && ms.tCountered,
            isPersist && { bottom: BOTTOM + 74 }, // stack above banner
          ]}
          onPress={toast.onPress || (() => setToast(null))}
          activeOpacity={0.9}
        >
          <MaterialIcons
            name={toast.type === 'danger' ? 'error-outline' : 'check-circle'}
            size={18}
            color="#fff"
          />
          <Text style={ms.toastText}>{toast.message}</Text>
          <TouchableOpacity onPress={() => setToast(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={15} color="rgba(255,255,255,0.65)" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </>
  );
}

// ─── Root export ───────────────────────────────────────────────────────────────
export default function CustomerTabs() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CustomerTabNavigator" component={CustomerTabNavigator} />
        <Stack.Screen name="VendorStore" component={VendorStoreScreen} />
        <Stack.Screen name="Wishlist"    component={WishlistScreen}    />
        <Stack.Screen name="TrackOrder"  component={TrackOrderScreen}  />
        <Stack.Screen name="Search"      component={SearchScreen}      />
        <Stack.Screen name="Wishlist"    component={WishlistScreen}    />
      </Stack.Navigator>
      <PendingOrderMonitor />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const BOTTOM = Platform.OS === 'ios' ? 98 : 76;

const makeMs = (C) => StyleSheet.create({
  // Persistent banner
  banner: {
    position:        'absolute',
    left:            12,
    right:           12,
    bottom:          BOTTOM,
    zIndex:          9999,
    elevation:       20,
    borderRadius:    18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.25,
    shadowRadius:    14,
    backgroundColor: C.orangeDark,
  },
  bPending:   { backgroundColor: C.orangeDark },
  bAccepted:  { backgroundColor: C.green },
  bCountered: { backgroundColor: C.purple },
  bExpired:   { backgroundColor: C.gray600 },

  bubble: {
    width:            46,
    height:           46,
    borderRadius:     23,
    backgroundColor:  'rgba(255,255,255,0.2)',
    borderWidth:      2,
    borderColor:      'rgba(255,255,255,0.38)',
    alignItems:       'center',
    justifyContent:   'center',
  },
  bubbleText: {
    fontSize:    14,
    fontWeight:  '900',
    color:       '#fff',
    letterSpacing: -0.5,
  },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  bannerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontWeight: '500' },

  // Transient toast
  toast: {
    position:        'absolute',
    left:            12,
    right:           12,
    bottom:          BOTTOM,
    zIndex:          10000,
    elevation:       21,
    backgroundColor: C.gray900,
    borderRadius:    14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             10,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.2,
    shadowRadius:    10,
  },
  tSuccess:   { backgroundColor: C.green },
  tDanger:    { backgroundColor: C.red },
  tCountered: { backgroundColor: C.purple },
  toastText:  { flex: 1, color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 19 },
});