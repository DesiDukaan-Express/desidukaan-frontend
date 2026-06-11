import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Platform, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

import ActiveDeliveryScreen from '../apps/delivery/ActiveDeliveryScreen';
import HistoryScreen        from '../apps/delivery/HistoryScreen';
import QueueScreen          from '../apps/delivery/QueueScreen';
import DeliveryHomeScreen   from '../apps/delivery/DeliveryHomeScreen';
import DeliveryOnboarding from '../apps/delivery/DeliveryOnboardingScreen';

const Tab = createBottomTabNavigator();

export default function DeliveryTabs() {
  const { height, width } = useWindowDimensions();
  const isSmall = height < 700;
  const isNarrow = width < 360;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#50C878',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: isNarrow ? 9 : 11, fontWeight: '700', marginBottom: 2 },
        tabBarStyle: {
          paddingBottom: Platform.OS === 'ios' ? (isSmall ? 12 : 20) : 8,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? (isSmall ? 68 : 82) : (isSmall ? 56 : 64),
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
      <Tab.Screen name="Home"    component={DeliveryHomeScreen}   options={{ tabBarIcon: ({ color }) => <MaterialIcons name="home"             size={22} color={color} /> }} />
      <Tab.Screen name="Queue"   component={QueueScreen}          options={{ tabBarIcon: ({ color }) => <MaterialIcons name="list-alt"         size={22} color={color} /> }} />
      <Tab.Screen name="Active"  component={ActiveDeliveryScreen} options={{ tabBarIcon: ({ color }) => <MaterialIcons name="delivery-dining"  size={22} color={color} /> }} />
      <Tab.Screen name="History" component={HistoryScreen}        options={{ tabBarIcon: ({ color }) => <MaterialIcons name="history"          size={22} color={color} /> }} />
    </Tab.Navigator>
  );
}