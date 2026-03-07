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
// import VendorScreen from '../apps/customer/VendorScreen';
// import CheckoutScreen from '../apps/customer/CheckoutScreen';

const Tab = createBottomTabNavigator();

export default function DeliveryTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: { paddingBottom: 8, paddingTop: 4, height: 60 },
      }}
    >
      <Tab.Screen name="Queue" component={QueueScreen} options={{ tabBarIcon: () => <Text style={{fontSize:20}}>📋</Text> }} />
      <Tab.Screen name="Active" component={ActiveDeliveryScreen} options={{ tabBarIcon: () => <Text style={{fontSize:20}}>🛵</Text> }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarIcon: () => <Text style={{fontSize:20}}>🕐</Text> }} />
    </Tab.Navigator>
  );
}