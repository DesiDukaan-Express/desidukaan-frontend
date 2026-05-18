import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View } from 'react-native';
import { colors } from '../styles/colors';
import useAuthStore from '../store/authStore';

import DashboardScreen    from '../apps/vendor/DashboardScreen';
import InventoryScreen    from '../apps/vendor/InventoryScreen';
import VendorOrdersScreen from '../apps/vendor/VendorOrdersScreen';
import EarningsScreen     from '../apps/vendor/EarningsScreen';
import VendorProfileScreen from '../apps/vendor/VendorProfileScreen';

// Self delivery wala screen — vendor khud pickup/drop manage karta hai
// Agar ye screen exist nahi karti toh VendorOrdersScreen use karo temporarily
let SelfDeliveryScreen;
try {
  SelfDeliveryScreen = require('../apps/vendor/SelfDeliveryScreen').default;
} catch {
  SelfDeliveryScreen = VendorOrdersScreen; // fallback
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const Tab = createBottomTabNavigator();

export default function VendorTabs() {
  const { token } = useAuthStore();
  const [deliveryType, setDeliveryType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendorProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/vendors/me/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setDeliveryType(data.data?.vendor?.delivery_type || 'self');
      } catch {
        setDeliveryType('self');
      } finally {
        setLoading(false);
      }
    };
    fetchVendorProfile();
  }, [token]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isSelfDelivery = deliveryType === 'self';

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
        options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text> }}
      />

      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>📦</Text> }}
      />

      <Tab.Screen
        name="Orders"
        component={VendorOrdersScreen}
        options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>🧾</Text> }}
      />

      {isSelfDelivery ? (
        // Self delivery wale vendors — apna delivery manage karo
        <Tab.Screen
          name="Delivery"
          component={SelfDeliveryScreen}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>🚚</Text>,
            tabBarLabel: 'My Delivery',
          }}
        />
      ) : (
        // Partner delivery wale vendors — delivery partners assign karo
        <Tab.Screen
          name="Delivery"
          component={SelfDeliveryScreen}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏍️</Text>,
            tabBarLabel: 'Assign Riders',
          }}
        />
      )}

      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>💰</Text> }}
      />

      <Tab.Screen
        name="Profile"
        component={VendorProfileScreen}
        options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}