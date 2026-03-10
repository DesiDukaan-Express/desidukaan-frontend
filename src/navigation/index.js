import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignupScreen from '../apps/customer/signup';
import useAuthStore from '../store/authStore';
import { USER_ROLES } from '../constants';
import { colors } from '../styles/colors';

import LoginScreen from '../apps/customer/LoginScreen';
import CustomerTabs from './CustomerTabs';
import VendorTabs from './VendorTabs';
import DeliveryTabs from './DeliveryTabs';
import CheckoutScreen from '../apps/customer/Checkout';
import OrderPlaced from '../apps/customer/OrderPlaced';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { isAuthenticated, role, isLoading } = useAuthStore();

  // Show spinner while checking stored token
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

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
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          getMainNavigator()
        )}
        
        
        {/* Customer Tabs */}
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name='OrderPlaced' component={OrderPlaced} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}