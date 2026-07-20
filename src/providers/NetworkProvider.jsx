import React, { useEffect, useState, useRef } from "react";
import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { View, StyleSheet, Platform, AppState } from "react-native";
import OfflineScreen from "../components/OfflineScreen";

if (Platform.OS !== "web") {
  NetInfo.configure({
    reachabilityUrl: "https://www.google.com/generate_204",
    reachabilityTest: async (response) => response.status === 204 || response.status === 200,
    reachabilityLongTimeout: 60 * 1000,
    reachabilityShortTimeout: 15 * 1000,
    reachabilityRequestTimeout: 15 * 1000,
  });
}
const POLL_INTERVAL = 5000; // check every 5s
const OFFLINE_CONFIRM_DELAY = 3000;

const NetworkProvider = ({ children }) => {
  const netInfo = useNetInfo();
  const [isOffline, setIsOffline] = useState(false);
  const offlineTimerRef = useRef(null);
  const [webReachable, setWebReachable] = useState(true);

const REACHABILITY_CHECK_URL = "https://www.gstatic.com/generate_204";

  // --- Web-only: actively poll our own backend to detect real internet loss ---
  useEffect(() => {
    if (Platform.OS !== "web") return;

    let cancelled = false;

    const checkReachability = async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    await fetch(REACHABILITY_CHECK_URL, {
      method: "GET",
      mode: "no-cors",      
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!cancelled) setWebReachable(true);
  } catch (e) {
    if (!cancelled) setWebReachable(false);
  }
};

    checkReachability(); // run immediately on mount
    const interval = setInterval(checkReachability, POLL_INTERVAL);

  
    const handleOnline = () => checkReachability();
    const handleOffline = () => setWebReachable(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (netInfo.isConnected === null) return;

    const looksOffline =
      Platform.OS === "web"
        ? netInfo.isConnected === false || webReachable === false
        : netInfo.isConnected === false || netInfo.isInternetReachable === false;

    if (looksOffline) {
      if (!offlineTimerRef.current) {
        offlineTimerRef.current = setTimeout(() => {
          console.log("Network changed: OFFLINE (confirmed)");
          setIsOffline(true);
          offlineTimerRef.current = null;
        }, OFFLINE_CONFIRM_DELAY);
      }
    } else {
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      console.log("Network changed: ONLINE");
      setIsOffline(false);
    }

    return () => {
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
    };
  }, [netInfo.isConnected, netInfo.isInternetReachable, webReachable]);

  const handleRetry = () => {
    console.log("Retrying connection...");
    NetInfo.refresh();
  };

  return (
    <View style={styles.container}>
      {children}
      {isOffline && <OfflineScreen onRetry={handleRetry} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default NetworkProvider;