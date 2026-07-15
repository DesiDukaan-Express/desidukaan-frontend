import React, { useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { io } from 'socket.io-client';
import { View, Text, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import useOrderStore from '../store/orderStore';

import HomeScreen from '../apps/customer/HomeScreen';
import SearchScreen from '../apps/customer/SearchScreen';
import CartScreen from '../apps/customer/CartScreen';
import OrdersScreen from '../apps/customer/OrdersScreen';
import ProfileScreen from '../apps/customer/ProfileScreen';
import VendorStoreScreen from '../apps/customer/VendorStoreScreen';
import TrackOrderScreen from '../apps/customer/TrackOrderScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

// ─── Palette matching the app ──────────────────────────────────────────────────
const C = {
  green:       '#16A34A',
  greenLight:  '#F0FDF4',
  orange:      '#F97316',
  surface:     '#FFFFFF',
  surfaceLow:  '#F8FAFC',
  border:      '#E5E7EB',
  gray400:     '#9CA3AF',
  gray600:     '#4B5563',
  gray900:     '#111827',
  greenDark:   '#15803D',
};

// Icon names per tab
const TAB_ICONS = {
  Home:    'home',
  Search:  'search',
  Cart:    'shopping-cart',
  Orders:  'receipt-long',
  Profile: 'person',
};

// ─── Tab icon component ────────────────────────────────────────────────────────
const TabIcon = ({ iconName, label, focused, cartCount }) => {
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
        // Active: green pill-like highlight
        backgroundColor: focused ? C.greenLight : 'transparent',
      }}
    >
      {/* Icon + optional cart badge */}
      <View style={{ position: 'relative' }}>
        <MaterialIcons
          name={iconName}
          size={24}
          color={focused ? C.green : C.gray400}
        />
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

      {/* Label */}
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

// ─── Tab bar with cart count from store ───────────────────────────────────────
function CartTabIcon({ focused }) {
  const cart = useCartStore();
  const cartCount = cart?.items?.reduce((s, i) => s + (i.qty || 1), 0) ?? 0;
  return (
    <TabIcon
      iconName={TAB_ICONS['Cart']}
      label="Cart"
      focused={focused}
      cartCount={cartCount}
    />
  );
}

// ─── Bottom tab navigator ──────────────────────────────────────────────────────
function CustomerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          if (route.name === 'Cart') {
            return <CartTabIcon focused={focused} />;
          }
          return (
            <TabIcon
              iconName={TAB_ICONS[route.name]}
              label={route.name}
              focused={focused}
            />
          );
        },
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopWidth: 1,
          borderTopColor: C.border,
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingBottom: Platform.OS === 'ios' ? 20 : 4,
          paddingTop: 4,
          // Rounded top corners like the HTML design
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          // Soft shadow going up
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 16,
          // Clip for rounded corners
          overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
        },
        tabBarIconStyle: {
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        },
        // Disable the default active indicator highlight on web
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.gray400,
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    />
      <Tab.Screen name="Search"  component={SearchScreen}  />
      <Tab.Screen name="Cart"    component={CartScreen}    />
      <Tab.Screen name="Orders"  component={OrdersScreen}  />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Stack wrapping tabs — allows pushing full screens like VendorStore
function PendingOrderMonitor() {
  const navigation = useNavigation();
  const { token } = useAuthStore();
  const pendingOrder = useOrderStore((s) => s.pendingOrder);
  const updatePendingOrder = useOrderStore((s) => s.updatePendingOrder);
  const clearPendingOrder = useOrderStore((s) => s.clearPendingOrder);
  const [banner, setBanner] = useState(null);
  const bannerTimer = useRef(null);
  const handledStatusRef = useRef({});

  const showBanner = (message, type = 'info', onPress = null, duration = 6000) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner({ message, type, onPress });
    if (duration) {
      bannerTimer.current = setTimeout(() => setBanner(null), duration);
    }
  };

  const openPayment = (orderData = pendingOrder) => {
    if (!orderData?.id) return;
    const rootNavigation = navigation.getParent?.() || navigation;
    rootNavigation.navigate('Checkout', {
      resumePendingOrder: true,
      pendingOrder: orderData,
      orderId: orderData.id,
      initialOrderStatus: 'accepted',
      confirmedSlot: orderData.confirmedSlot || orderData.slot || null,
      selectedPay: orderData.selectedPay || null,
      snapshotItems: orderData.snapshotItems || orderData.items || [],
      snapshotSubtotal: orderData.snapshotSubtotal ?? orderData.subtotal ?? 0,
      vendorId: orderData.vendor_id || orderData.vendorId,
      vendorName: orderData.vendorName || orderData.vendor?.shop_name || 'Store',
      deliveryTypePref: orderData.deliveryTypePref || orderData.delivery_type_pref || 'standard',
      proposedFee: orderData.proposedFee ?? null,
      confirmedFee: orderData.confirmedFee ?? orderData.delivery_fee ?? null,
    });
  };

  const handleOrderUpdate = (data) => {
    const activeOrder = useOrderStore.getState().pendingOrder;
    const activeId = activeOrder?.id || activeOrder?.order_id;
    if (!activeId || String(data.order_id) !== String(activeId)) return;

    const nextOrder = {
      ...activeOrder,
      id: activeOrder.id || data.order_id,
      status: data.status,
      order_number: data.order_number || activeOrder.order_number,
      cancellation_reason: data.reason || activeOrder.cancellation_reason,
    };
    updatePendingOrder(nextOrder);

    const handledKey = `${data.order_id}:${data.status}`;
    if (handledStatusRef.current[handledKey]) return;
    handledStatusRef.current[handledKey] = true;

    if (data.status === 'accepted') {
      showBanner('Your order was accepted. Tap to continue to payment.', 'success', () => openPayment(nextOrder), null);
    } else if (data.status === 'rejected') {
      showBanner(data.reason || 'The store declined your order.', 'danger');
      clearPendingOrder();
    }
  };

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!token || !pendingOrder?.id || !['pending', 'countered'].includes(pendingOrder.status)) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('order:update', handleOrderUpdate);
    socket.on('order:countered', (data) => {
      if (String(data.order_id) !== String(pendingOrder.id)) return;
      updatePendingOrder({
        ...pendingOrder,
        status: 'countered',
        counter_offer: data.counter_offer,
      });
      showBanner('The store suggested changes to your order.', 'info');
    });

    return () => socket.disconnect();
  }, [token, pendingOrder?.id, pendingOrder?.status]);

  useEffect(() => {
    if (!pendingOrder?.id) return;
    const handledKey = `${pendingOrder.id}:${pendingOrder.status}:local`;
    if (handledStatusRef.current[handledKey]) return;
    handledStatusRef.current[handledKey] = true;

    if (pendingOrder.status === 'pending') {
      showBanner('Order request sent. You can keep browsing while the store responds.', 'info');
    } else if (pendingOrder.status === 'accepted') {
      showBanner('Your order was accepted. Tap to continue to payment.', 'success', () => openPayment(pendingOrder), null);
    }
  }, [pendingOrder?.id, pendingOrder?.status]);

  useEffect(() => {
    if (!token || !pendingOrder?.id || !['pending', 'countered'].includes(pendingOrder.status)) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/orders/${pendingOrder.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const order = data.data?.order || data.order;
        if (order?.status && order.status !== pendingOrder.status) {
          handleOrderUpdate({
            order_id: order.id,
            order_number: order.order_number,
            status: order.status,
            reason: order.cancellation_reason,
          });
        }
      } catch (e) {
        // Socket is primary; polling is only a silent fallback.
      }
    }, 10000);

    return () => clearInterval(poll);
  }, [token, pendingOrder?.id, pendingOrder?.status]);

  if (!banner) return null;

  return (
    <TouchableOpacity
      style={[
        monitorStyles.banner,
        banner.type === 'success' && monitorStyles.success,
        banner.type === 'danger' && monitorStyles.danger,
      ]}
      onPress={banner.onPress || (() => setBanner(null))}
      activeOpacity={0.9}
    >
      <MaterialIcons
        name={banner.type === 'danger' ? 'error-outline' : 'check-circle'}
        size={18}
        color="#fff"
      />
      <Text style={monitorStyles.text}>{banner.message}</Text>
    </TouchableOpacity>
  );
}

export default function CustomerTabs() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CustomerTabNavigator" component={CustomerTabNavigator} />
        <Stack.Screen name="VendorStore" component={VendorStoreScreen} />
        <Stack.Screen name="TrackOrder"  component={TrackOrderScreen}  />
      </Stack.Navigator>
      <PendingOrderMonitor />
    </View>
  );
}

const monitorStyles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 96 : 76,
    zIndex: 9999,
    elevation: 20,
    backgroundColor: C.gray900,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  success: { backgroundColor: C.green },
  danger: { backgroundColor: '#DC2626' },
  text: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 20 },
});
