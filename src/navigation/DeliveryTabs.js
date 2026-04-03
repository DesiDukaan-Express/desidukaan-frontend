import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from '../styles/colors';

import ActiveDeliveryScreen from '../apps/delivery/ActiveDeliveryScreen';
import HistoryScreen        from '../apps/delivery/HistoryScreen';
import QueueScreen          from '../apps/delivery/QueueScreen';
import DeliveryHomeScreen   from '../apps/delivery/DeliveryHomeScreen';
import DeliveryOnboarding from '../apps/delivery/DeliveryOnboardingScreen';

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
      <Tab.Screen name="Home"    component={DeliveryHomeScreen}   options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text> }} />
      <Tab.Screen name="Queue"   component={QueueScreen}          options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text> }} />
      <Tab.Screen name="Active"  component={ActiveDeliveryScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>🛵</Text> }} />
      <Tab.Screen name="History" component={HistoryScreen}        options={{ tabBarIcon: () => <Text style={{ fontSize: 20 }}>🕐</Text> }} />
    </Tab.Navigator>
  );
}