import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import HomeScreen from '../apps/customer/HomeScreen';
import SearchScreen from '../apps/customer/SearchScreen';
import CartScreen from '../apps/customer/CartScreen';
import OrdersScreen from '../apps/customer/OrdersScreen';
import ProfileScreen from '../apps/customer/ProfileScreen';
import VendorStoreScreen from '../apps/customer/VendorStoreScreen';
import TrackOrderScreen from '../apps/customer/TrackOrderScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const GREEN      = '#16A34A';
const GREEN_DARK = '#15803D';
const WHITE      = '#FFFFFF';
const WHITE_DIM  = 'rgba(255,255,255,0.60)';

const TAB_ICONS = {
  Home:    'home',
  Search:  'search',
  Cart:    'shopping-cart',
  Orders:  'receipt-long',
  Profile: 'person',
};

// Single component renders icon + label inside the pill so both get highlighted
const TabIcon = ({ iconName, label, focused }) => (
  <View
    style={{
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 5,
      borderRadius: 22,
      backgroundColor: focused ? 'rgba(255,255,255,0.22)' : 'transparent',
      minWidth: 64,
    }}
  >
    <MaterialIcons
      name={iconName}
      size={22}
      color={focused ? WHITE : WHITE_DIM}
    />
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: focused ? WHITE : WHITE_DIM,
        marginTop: 2,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </Text>
  </View>
);

// Bottom tabs
function CustomerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // Hide the default label — we render it ourselves inside TabIcon
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon
            iconName={TAB_ICONS[route.name]}
            label={route.name}
            focused={focused}
          />
        ),
        tabBarStyle: {
          backgroundColor: GREEN,
          borderTopWidth: 0,
          // Balanced height for perfect vertical centering
          height: Platform.OS === 'ios' ? 76 : 64,
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: GREEN_DARK,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 16,
        },
        // Remove the default active indicator that react-navigation adds on web
        // Remove default tight bounds on the icon wrapper to prevent clipping
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