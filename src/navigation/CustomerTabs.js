import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useCartStore from '../store/cartStore';

import HomeScreen from '../apps/customer/HomeScreen';
import SearchScreen from '../apps/customer/SearchScreen';
import CartScreen from '../apps/customer/CartScreen';
import OrdersScreen from '../apps/customer/OrdersScreen';
import ProfileScreen from '../apps/customer/ProfileScreen';
import VendorStoreScreen from '../apps/customer/VendorStoreScreen';
import TrackOrderScreen from '../apps/customer/TrackOrderScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
export default function CustomerTabs() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerTabNavigator" component={CustomerTabNavigator} />
      <Stack.Screen name="VendorStore" component={VendorStoreScreen} />
      <Stack.Screen name="TrackOrder"  component={TrackOrderScreen}  />
    </Stack.Navigator>
  );
}
