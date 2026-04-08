import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { colors } from '../styles/colors';

import HomeScreen from '../apps/customer/HomeScreen';
import SearchScreen from '../apps/customer/SearchScreen';
import CartScreen from '../apps/customer/CartScreen';
import OrdersScreen from '../apps/customer/OrdersScreen';
import ProfileScreen from '../apps/customer/ProfileScreen';
import VendorStoreScreen from '../apps/customer/VendorStoreScreen';
import TrackOrderScreen from '../apps/customer/TrackOrderScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const icon = (label) => ({ focused }) => (
  <Text style={{ fontSize: 20 }}>
    {label === 'Home' ? '🏠'
      : label === 'Search' ? '🔍'
      : label === 'Cart' ? '🛒'
      : label === 'Orders' ? '📦'
      : '👤'}
  </Text>
);

// Bottom tabs
function CustomerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: { paddingBottom: 8, paddingTop: 4, height: 60 },
      }}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ tabBarIcon: icon('Home') }} />
      <Tab.Screen name="Search"  component={SearchScreen}  options={{ tabBarIcon: icon('Search') }} />
      <Tab.Screen name="Cart"    component={CartScreen}    options={{ tabBarIcon: icon('Cart') }} />
      <Tab.Screen name="Orders"  component={OrdersScreen}  options={{ tabBarIcon: icon('Orders') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: icon('Profile') }} />
    </Tab.Navigator>
  );
}

// Stack wrapping tabs — allows pushing full screens like VendorStore
export default function CustomerTabs() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerTabNavigator" component={CustomerTabNavigator} />
      <Stack.Screen name="VendorStore" component={VendorStoreScreen} />
      <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
    </Stack.Navigator>
  );
}