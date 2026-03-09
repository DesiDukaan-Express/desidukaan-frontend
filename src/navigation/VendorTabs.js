import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { colors } from '../styles/colors';

// import VendorScreen from '../apps/customer/VendorScreen';
// import CheckoutScreen from '../apps/customer/CheckoutScreen';
import DashboardScreen from '../apps/vendor/DashboardScreen';
import InventoryScreen from '../apps/vendor/InventoryScreen';
import VendorOrdersScreen from '../apps/vendor/VendorOrdersScreen';
import EarningsScreen from '../apps/vendor/EarningsScreen';

const Tab = createBottomTabNavigator();

export default function VendorTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: { paddingBottom: 8, paddingTop: 4, height: 60 },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: () => <Text style={{fontSize:20}}>📊</Text> }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} options={{ tabBarIcon: () => <Text style={{fontSize:20}}>📦</Text> }} />
      <Tab.Screen name="Orders" component={VendorOrdersScreen} options={{ tabBarIcon: () => <Text style={{fontSize:20}}>🧾</Text> }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ tabBarIcon: () => <Text style={{fontSize:20}}>💰</Text> }} />
    </Tab.Navigator>
  );
}