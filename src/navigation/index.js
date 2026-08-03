import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SignupScreen from "../apps/customer/SignUpScreen";
import useAuthStore from "../store/authStore";
import { colors } from "../styles/colors";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

import LoginScreen from "../apps/customer/LoginScreen";
import CustomerTabs from "./CustomerTabs";
import VendorTabs from "./VendorTabs";
import DeliveryTabs from "./DeliveryTabs";
import CheckoutScreen from "../apps/customer/Checkout";
import OrderPlaced from "../apps/customer/OrderPlaced";
import PaymentScreen from "../apps/customer/PaymentScreen";
import VendorOnboardingScreen from "../apps/vendor/VendorOnboardingScreen";
import DashboardScreen from "../apps/vendor/DashboardScreen";
import DeliveryOnboardingScreen from "../apps/delivery/DeliveryOnboardingScreen";
import DeliveryPendingScreen from "../apps/delivery/DeliveryPendingScreen";
import RolePickerScreen from "../apps/RolePickerScreen";

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeRole      = useAuthStore((s) => s.activeRole);
  const isLoading       = useAuthStore((s) => s.isLoading);
  const token           = useAuthStore((s) => s.token);
  const setActiveRole   = useAuthStore((s) => s.setActiveRole);

  const [vendorOnboarded,    setVendorOnboarded]    = useState(null);
  const [deliveryOnboarded,  setDeliveryOnboarded]  = useState(null);
  const [checkingOnboard,    setCheckingOnboard]    = useState(false);
  const [vendorStatus,       setVendorStatus]       = useState(null);
  const [vendorMissingDocs,  setVendorMissingDocs]  = useState([]);

  // When the active role changes, check onboarding if needed
  useEffect(() => {
    if (isAuthenticated && activeRole) {
      if (activeRole === "vendor") {
        checkVendorProfile();
      } else if (activeRole === "delivery") {
        checkDeliveryProfile();
      }
    }
  }, [isAuthenticated, activeRole]);

  const checkVendorProfile = async () => {
    setCheckingOnboard(true);
    try {
      const res = await fetch(`${API_BASE}/vendors/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const vendor = data.data?.vendor;

      setVendorOnboarded(
        !!(vendor?.shop_name && vendor?.onboarding_status === "approved"),
      );
      console.log("Vendor check:", {
        shop_name: vendor?.shop_name,
        onboarding_status: vendor?.onboarding_status,
        vendorOnboarded: !!(vendor?.shop_name && vendor?.onboarding_status === "approved"),
      });
      setVendorStatus(vendor?.onboarding_status || null);
      setVendorMissingDocs(vendor?.missing_docs || []);
    } catch (err) {
      setVendorOnboarded(false);
    } finally {
      setCheckingOnboard(false);
    }
  };

  const checkDeliveryProfile = async () => {
    setCheckingOnboard(true);
    try {
      const res = await fetch(`${API_BASE}/delivery/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const profile = data.data?.profile;
      if (!profile?.onboarding_submitted) {
        setDeliveryOnboarded('not_submitted');
      } else if (profile?.is_certified) {
        setDeliveryOnboarded('approved');
      } else {
        setDeliveryOnboarded('pending');
      }
    } catch (err) {
      setDeliveryOnboarded('not_submitted');
    } finally {
      setCheckingOnboard(false);
    }
  };

  // ── Callback from RolePickerScreen once a role is chosen ──────────────────
  // Resets onboarding state so it's re-checked for the new role
  const handleRolePicked = (role) => {
    setVendorOnboarded(null);
    setDeliveryOnboarded(null);
    // setActiveRole is already called inside RolePickerScreen before this callback
    // The state change will trigger the navigation re-render automatically
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  // After role is picked, wait for onboarding check if needed
  if (
    isAuthenticated &&
    activeRole &&
    (checkingOnboard ||
      (activeRole === "vendor"   && vendorOnboarded   === null) ||
      (activeRole === "delivery" && deliveryOnboarded === null))
  ) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login"  component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : !activeRole ? (
          // ── Role picker: shown after every login / app open ──────────────
          <Stack.Screen name="RolePicker">
            {() => <RolePickerScreen onRolePicked={handleRolePicked} />}
          </Stack.Screen>
        ) : (
          // ── Routed app based on active role ──────────────────────────────
          <>
            {activeRole === "vendor" ? (
              vendorOnboarded ? (
                <Stack.Screen name="VendorApp" component={VendorTabs} />
              ) : (
                <>
                  <Stack.Screen name="Dashboard">
                    {(props) => (
                      <DashboardScreen
                        {...props}
                        vendorStatus={vendorStatus}
                        missingDocs={vendorMissingDocs}
                      />
                    )}
                  </Stack.Screen>
                  <Stack.Screen name="VendorOnboarding">
                    {(props) => (
                      <VendorOnboardingScreen
                        {...props}
                        onComplete={() => checkVendorProfile()}
                      />
                    )}
                  </Stack.Screen>
                </>
              )
            ) : activeRole === "delivery" ? (
              deliveryOnboarded === 'approved' ? (
                <Stack.Screen name="DeliveryApp" component={DeliveryTabs} />
              ) : deliveryOnboarded === 'pending' ? (
                <Stack.Screen name="DeliveryPending">
                  {() => (
                    <DeliveryPendingScreen
                      onRefresh={checkDeliveryProfile}
                      refreshing={checkingOnboard}
                    />
                  )}
                </Stack.Screen>
              ) : (
                <Stack.Screen name="DeliveryOnboarding">
                  {(props) => (
                    <DeliveryOnboardingScreen
                      {...props}
                      onComplete={() => setDeliveryOnboarded('pending')}
                    />
                  )}
                </Stack.Screen>
              )
            ) : (
              // Customer (default)
              <Stack.Screen name="CustomerApp" component={CustomerTabs} />
            )}

            {/* ── Shared screens accessible from any role app ─── */}
            <Stack.Screen name="Checkout"    component={CheckoutScreen} />
            <Stack.Screen name="Payment"     component={PaymentScreen} />
            <Stack.Screen name="OrderPlaced" component={OrderPlaced} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
