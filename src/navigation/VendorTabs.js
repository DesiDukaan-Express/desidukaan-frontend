import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from '../styles/colors';

import DashboardScreen from '../apps/vendor/DashboardScreen';
import InventoryScreen from '../apps/vendor/InventoryScreen';
import VendorOrdersScreen from '../apps/vendor/VendorOrdersScreen';
import EarningsScreen from '../apps/vendor/EarningsScreen';
import VendorProfileScreen from '../apps/vendor/VendorProfileScreen';   

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
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: () => <Text style={{fontSize:20}}>📊</Text> }}
      />

      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ tabBarIcon: () => <Text style={{fontSize:20}}>📦</Text> }}
      />

      <Tab.Screen
        name="Orders"
        component={VendorOrdersScreen}
        options={{ tabBarIcon: () => <Text style={{fontSize:20}}>🧾</Text> }}
      />

      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ tabBarIcon: () => <Text style={{fontSize:20}}>💰</Text> }}
      />

      {/* 👇 New Profile Tab */}
      <Tab.Screen
        name="Profile"
        component={VendorProfileScreen}
        options={{ tabBarIcon: () => <Text style={{fontSize:20}}>👤</Text> }}
      />

    </Tab.Navigator>
  );
}