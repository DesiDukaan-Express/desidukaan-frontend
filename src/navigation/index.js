import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SignupScreen from "../apps/customer/SignUpScreen";
import useAuthStore from "../store/authStore";
import { USER_ROLES } from "../constants";
import { colors } from "../styles/colors";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http:localhost:3000/api";

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
import HomeScreen from "../apps/customer/HomeScreen";

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const isLoading = useAuthStore((s) => s.isLoading);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [vendorOnboarded, setVendorOnboarded] = useState(null);
  const [deliveryOnboarded, setDeliveryOnboarded] = useState(null);
  const [checkingOnboard, setCheckingOnboard] = useState(false);
  const [vendorStatus, setVendorStatus] = useState(null);
  const [vendorMissingDocs, setVendorMissingDocs] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      if (role?.toLowerCase() === "vendor") {
        checkVendorProfile();
      } else if (role?.toLowerCase() === "delivery") {
        checkDeliveryProfile();
      }
    }
  }, [isAuthenticated, role]);

  const checkVendorProfile = async () => {
    setCheckingOnboard(true);
    try {
      const res = await fetch(`${API_BASE}/vendors/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const vendor = data.data?.vendor; // ← pehle variable banao

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

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary,
        }}
      >
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (
    isAuthenticated &&
    (checkingOnboard ||
      (role?.toLowerCase() === "vendor" && vendorOnboarded === null) ||
      (role?.toLowerCase() === "delivery" && deliveryOnboarded === null))
  ) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary,
        }}
      >
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (

    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {
          !isAuthenticated ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
            </>
          ) : (
            <>
              {role?.toLowerCase() === "vendor" ? (
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
              ) : role?.toLowerCase() === "delivery" ? (
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
                <Stack.Screen name="CustomerApp" component={CustomerTabs} />
              )}
              <Stack.Screen name="Checkout" component={CheckoutScreen} />
              <Stack.Screen name="Payment" component={PaymentScreen} />
              <Stack.Screen name="OrderPlaced" component={OrderPlaced} />
            </>
          )}
      </Stack.Navigator>
    </NavigationContainer >
  );
}
