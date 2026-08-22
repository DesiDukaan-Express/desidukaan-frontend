import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, ActivityIndicator, AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { io } from "socket.io-client";
import SignupScreen from "../apps/customer/SignUpScreen";
import useAuthStore from "../store/authStore";
import { colors } from "../styles/colors";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http:localhost:3000/api";
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3000";

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
import AccountDeactivatedScreen from "../apps/AccountDeactivatedScreen";
import AccountSuspendedScreen from "../apps/AccountSuspendedScreen";

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeRole      = useAuthStore((s) => s.activeRole);
  const isLoading       = useAuthStore((s) => s.isLoading);
  const token           = useAuthStore((s) => s.token);
  const setActiveRole   = useAuthStore((s) => s.setActiveRole);
  const accountDeactivated = useAuthStore((s) => s.accountDeactivated);
  const checkAccountStatus = useAuthStore((s) => s.checkAccountStatus);
  const flagDeactivated     = useAuthStore((s) => s.flagDeactivated);
  const clearDeactivation   = useAuthStore((s) => s.clearDeactivation);
  const vendorSuspended = useAuthStore((s) => s.vendorSuspended);
  const checkVendorStatus = useAuthStore((s) => s.checkVendorStatus);
  const flagVendorSuspended = useAuthStore((s) => s.flagVendorSuspended);
  const clearVendorSuspended = useAuthStore((s) => s.clearVendorSuspended);

  const activeRoleRef = useRef(activeRole);
  useEffect(() => { activeRoleRef.current = activeRole; }, [activeRole]);

  const [vendorOnboarded,    setVendorOnboarded]    = useState(null);
  const [deliveryOnboarded,  setDeliveryOnboarded]  = useState(null);
  const [checkingOnboard,    setCheckingOnboard]    = useState(false);
  const [vendorStatus,       setVendorStatus]       = useState(null);
  const [vendorMissingDocs,  setVendorMissingDocs]  = useState([]);

  // Fetch the vendor profile. Also acts as the login-time / reload fallback:
  // if the vendor is suspended, it flags the full-screen block so the app
  // never opens the vendor dashboard. Declared before the effects below so
  // the socket/poll effects can reference it (via useCallback, stable).
  const checkVendorProfile = useCallback(async () => {
    setCheckingOnboard(true);
    try {
      const res = await fetch(`${API_BASE}/vendors/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const vendor = data.data?.vendor;

      if (vendor) {
        useAuthStore.getState().addEnabledRole("vendor");
      }

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

      // Suspended vendors get the full-screen block instead of the app.
      if (
        vendor?.is_active === false ||
        vendor?.onboarding_status === "suspended"
      ) {
        flagVendorSuspended();
      } else {
        clearVendorSuspended();
      }
    } catch (err) {
      setVendorOnboarded(false);
    } finally {
      setCheckingOnboard(false);
    }
  }, [token, flagVendorSuspended, clearVendorSuspended]);

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

  // ── Live account-status check (admin deactivation / vendor suspension) ────
  // Polls /auth/me (and the vendor profile when the vendor role is active)
  // while authenticated so a deactivated customer or a suspended vendor is
  // blocked immediately (no reload required). Stops once the account itself
  // is deactivated.
  useEffect(() => {
    if (!isAuthenticated || accountDeactivated) return;
    checkAccountStatus();
    if (activeRole === "vendor") checkVendorStatus();
    const interval = setInterval(() => {
      checkAccountStatus();
      if (activeRole === "vendor") checkVendorStatus();
    }, 25000);
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkAccountStatus();
        if (activeRole === "vendor") checkVendorStatus();
      }
    });
    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [isAuthenticated, accountDeactivated, activeRole, checkAccountStatus, checkVendorStatus]);

  // ── Real-time account push (Socket.io) ──────────────────────────────────
  // Uses the same connection pattern as every other socket in the app. The
  // backend auto-joins this socket to user:{id}; when an admin deactivates
  // the account it emits 'account:deactivated' to that room and we block the
  // app immediately — and 'account:reactivated' returns to normal. This
  // socket deliberately stays connected even while the block screen is shown
  // (accountDeactivated is NOT a dependency), so reactivation is received
  // live without a reload.
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let socket = null;
    try {
      socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
      socket.on("account:deactivated", () => {
        flagDeactivated();
      });
      socket.on("account:reactivated", () => {
        clearDeactivation();
      });
      // Vendor suspend/unsuspend: the backend auto-joins this socket to the
      // vendor:{id} room. The block only applies to the vendor role, so we
      // ignore it while the same user is using the customer/delivery role.
      socket.on("vendor:suspended", () => {
        if (activeRoleRef.current === "vendor") {
          flagVendorSuspended();
          checkVendorProfile();
        }
      });
      socket.on("vendor:reactivated", () => {
        clearVendorSuspended();
        if (activeRoleRef.current === "vendor") checkVendorProfile();
      });
    } catch (err) {
      // Socket init failed — poll + login/refresh checks still cover both directions.
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [isAuthenticated, token, flagDeactivated, clearDeactivation, flagVendorSuspended, clearVendorSuspended, checkVendorProfile]);

  const checkDeliveryProfile = async () => {
    setCheckingOnboard(true);
    try {
      const res = await fetch(`${API_BASE}/delivery/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const profile = data.data?.profile;
      if (profile) {
        useAuthStore.getState().addEnabledRole("delivery");
      }
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

  // ── Hard gate: account deactivated → block the entire app ────────────────
  if (accountDeactivated) {
    return <AccountDeactivatedScreen />;
  }

  // ── Hard gate: vendor shop suspended → block the vendor app ──────────────
  if (vendorSuspended && activeRole === "vendor") {
    return <AccountSuspendedScreen />;
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
