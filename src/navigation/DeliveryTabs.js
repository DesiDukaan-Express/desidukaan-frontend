import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Platform, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../styles/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ActiveDeliveryScreen from '../apps/delivery/ActiveDeliveryScreen';
import HistoryScreen        from '../apps/delivery/HistoryScreen';
import QueueScreen          from '../apps/delivery/QueueScreen';
import DeliveryHomeScreen   from '../apps/delivery/DeliveryHomeScreen';
import DeliveryOnboarding from '../apps/delivery/DeliveryOnboardingScreen';
import DeliveryProfileScreen from '../apps/delivery/DeliveryProfileScreen';

const Tab = createBottomTabNavigator();

export default function DeliveryTabs() {
  const { height, width } = useWindowDimensions();
  const isSmall = height < 700;
  const isNarrow = width < 360;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#50C878',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: isNarrow ? 9 : 10, fontWeight: '700' },
        tabBarStyle: {
  paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
  paddingTop: 8,
  height: 64 + (insets.bottom > 0 ? insets.bottom : 10),
  backgroundColor: '#FFFFFF',
  borderTopWidth: 1,
  borderTopColor: '#E5E7EB',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -3 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 10,
},
      })}
    >
      <Tab.Screen name="Home"    component={DeliveryHomeScreen}   options={{ tabBarLabel: t('delivery.home'),           tabBarIcon: ({ color }) => <MaterialIcons name="home"             size={22} color={color} /> }} />
      <Tab.Screen name="Queue"   component={QueueScreen}          options={{ tabBarLabel: t('delivery.queue'),          tabBarIcon: ({ color }) => <MaterialIcons name="list-alt"         size={22} color={color} /> }} />
      <Tab.Screen name="Active"  component={ActiveDeliveryScreen} options={{ tabBarLabel: t('delivery.activeDelivery'), tabBarIcon: ({ color }) => <MaterialIcons name="delivery-dining"  size={22} color={color} /> }} />
      <Tab.Screen name="History" component={HistoryScreen}        options={{ tabBarLabel: t('delivery.history'),        tabBarIcon: ({ color }) => <MaterialIcons name="history"          size={22} color={color} /> }} />
      <Tab.Screen name="Profile" component={DeliveryProfileScreen} options={{ tabBarLabel: t('profile.title'),          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={22} color={color} /> }} />
    </Tab.Navigator>
  );
}