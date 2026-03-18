import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignupScreen from '../apps/customer/SignUpScreen';
import useAuthStore from '../store/authStore';
import { USER_ROLES } from '../constants';
import { colors } from '../styles/colors';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

import LoginScreen        from '../apps/customer/LoginScreen';
import CustomerTabs       from './CustomerTabs';
import VendorTabs         from './VendorTabs';
import DeliveryTabs       from './DeliveryTabs';
import CheckoutScreen     from '../apps/customer/Checkout';
import OrderPlaced        from '../apps/customer/OrderPlaced';
import VendorOnboardingScreen from '../apps/vendor/VendorOnboardingScreen';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { isAuthenticated, role, isLoading, token } = useAuthStore();
  const [vendorOnboarded, setVendorOnboarded] = useState(null);
  const [checkingOnboard, setCheckingOnboard] = useState(false);

  useEffect(() => {
    if (isAuthenticated && role?.toLowerCase() === 'vendor') {
      checkVendorProfile();
    }
  }, [isAuthenticated, role]);

  const checkVendorProfile = async () => {
    setCheckingOnboard(true);
    try {
      const res = await fetch(`${API_BASE}/vendors/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVendorOnboarded(!!(data.data?.vendor?.shop_name));
    } catch (err) {
      setVendorOnboarded(false);
    } finally {
      setCheckingOnboard(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (isAuthenticated && role?.toLowerCase() === 'vendor' && (vendorOnboarded === null || checkingOnboard)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // ── Unauthenticated screens ──────────────────────────────────
          <>
            <Stack.Screen name="Login"  component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          // ── Authenticated screens ────────────────────────────────────
          // Checkout and OrderPlaced are here so they unmount on logout,
          // preventing navigation to those screens after logging out
          <>
            {role?.toLowerCase() === 'vendor' ? (
              vendorOnboarded
                ? <Stack.Screen name="VendorApp" component={VendorTabs} />
                : <Stack.Screen name="VendorOnboarding">
                    {() => <VendorOnboardingScreen onComplete={() => setVendorOnboarded(true)} />}
                  </Stack.Screen>
            ) : role === USER_ROLES.DELIVERY ? (
              <Stack.Screen name="DeliveryApp" component={DeliveryTabs} />
            ) : (
              <Stack.Screen name="CustomerApp" component={CustomerTabs} />
            )}
            <Stack.Screen name="Checkout"    component={CheckoutScreen} />
            <Stack.Screen name="OrderPlaced" component={OrderPlaced} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}