import React, { useState, useEffect } from 'react';
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
import VendorOnboardingScreen from '../apps/vendor/VendorOnboardingScreen';

// ── NEW ──────────────────────────────────────────────────────────────────────
import DeliveryOnboarding from '../apps/delivery/OnBoardingScreen';
// ─────────────────────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { isAuthenticated, role, isLoading, token } = useAuthStore();
  const [vendorOnboarded,  setVendorOnboarded]  = useState(null);
  const [checkingOnboard,  setCheckingOnboard]  = useState(false);

  useEffect(() => {
    if (isAuthenticated && role?.toLowerCase() === 'vendor') {
      checkVendorProfile();
    }
  }, [isAuthenticated, role]);

  const checkVendorProfile = async () => {
    setCheckingOnboard(true);
    try {
      const res  = await fetch('http://localhost:3000/api/vendors/me/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('Vendor profile response:', JSON.stringify(data));
      setVendorOnboarded(!!(data.data?.vendor?.shop_name));
    } catch (err) {
      console.log('Vendor profile check failed:', err.message);
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

  if (
    isAuthenticated &&
    role?.toLowerCase() === 'vendor' &&
    (vendorOnboarded === null || checkingOnboard)
  ) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  const getMainNavigator = () => {
    const normalizedRole = role?.toLowerCase();

    if (normalizedRole === 'vendor') {
      if (!vendorOnboarded) {
        return (
          <Stack.Screen name="VendorOnboarding">
            {() => (
              <VendorOnboardingScreen onComplete={() => setVendorOnboarded(true)} />
            )}
          </Stack.Screen>
        );
      }
      return <Stack.Screen name="VendorApp" component={VendorTabs} />;
    }

    switch (normalizedRole) {
      case 'delivery':
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
            {/* ── Unauthenticated screens ── */}
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Signup"   component={SignupScreen} />

            {/*
              DeliveryOnboarding lives here (unauthenticated zone) because:
              - User navigates here BEFORE register() is called
              - register() is called inside DeliveryOnboarding on submit
              - After register(), isAuthenticated becomes true and navigator
                switches to the authenticated zone automatically
            */}
            <Stack.Screen name="DeliveryOnboarding" component={DeliveryOnboarding} />
          </>
        ) : (
          getMainNavigator()
        )}

        {/* ── Screens accessible from any role ── */}
        <Stack.Screen name="Checkout"    component={CheckoutScreen} />
        <Stack.Screen name="OrderPlaced" component={OrderPlaced} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
