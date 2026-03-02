import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import useAuthStore from '../store/authStore';
import { USER_ROLES } from '../constants';

// Auth Screens
import LoginScreen from '../apps/customer/LoginScreen';

// Customer Screens
import CustomerTabs from './CustomerTabs';

// Vendor Screens
import VendorTabs from './VendorTabs';

// Delivery Screens
import DeliveryTabs from './DeliveryTabs';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { isAuthenticated, role } = useAuthStore();

  const getMainNavigator = () => {
    switch (role) {
      case USER_ROLES.VENDOR:
        return <Stack.Screen name="VendorApp" component={VendorTabs} />;
      case USER_ROLES.DELIVERY:
        return <Stack.Screen name="DeliveryApp" component={DeliveryTabs} />;
      default:
        return <Stack.Screen name="CustomerApp" component={CustomerTabs} />;
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          getMainNavigator()
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}