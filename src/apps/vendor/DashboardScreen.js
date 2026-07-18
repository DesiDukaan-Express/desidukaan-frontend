import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  Animated,
  Platform,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Polyline } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import useAuthStore from "../../store/authStore";
import { LineChart } from "react-native-chart-kit";
import { useNavigation } from "@react-navigation/native";
import { TextInput } from "react-native";

import { io } from "socket.io-client";
import useOrderSound from "../../hooks/useOrderSound";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3000";
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Color Tokens ───────────────────────────────────────────────
const C = {
  bg: "#F0F4F8",
  surface: "#FFFFFF",
  primary: "#0EE627",
  primaryDim: "#0EE62718",
  primaryMid: "#0EE62740",
  primaryDark: "#09a81c",
  accent: "#0F172A",
  accentMid: "#1E293B",
  text: "#0F172A",
  textSub: "#64748B",
  textLight: "#94A3B8",
  border: "#E2E8F0",
  warn: "#FFFBEB",
  warnBorder: "#F59E0B",
  warnText: "#92400E",
  danger: "#FFF1F2",
  dangerBorder: "#F43F5E",
  dangerText: "#9F1239",
  purple: "#7C3AED",
  purpleDim: "#7C3AED15",
  blue: "#3B82F6",
  blueDim: "#3B82F615",
  orange: "#F97316",
  orangeDim: "#F9731615",
};

// ─── Greeting config ────────────────────────────────────────────
const getGreetingConfig = (t) => {
  const h = new Date().getHours();
  if (h < 12)
    return {
      text: t('vendor.goodMorning'),
      icon: "wb-sunny",
      gradient: ["#FEF3C7", "#FDE68A"],
      iconBg: "#F59E0B",
      sub: t('vendor.morningBoostSub'),
      badge: t('vendor.morningBoost'),
    };
  if (h < 17)
    return {
      text: t('vendor.goodAfternoon'),
      icon: "wb-cloudy",
      gradient: ["#DBEAFE", "#BFDBFE"],
      iconBg: "#3B82F6",
      sub: t('vendor.afternoonSub'),
      badge: t('vendor.peakHours'),
    };
  return {
    text: t('vendor.goodEvening'),
    icon: "nights-stay",
    gradient: ["#EDE9FE", "#DDD6FE"],
    iconBg: "#7C3AED",
    sub: t('vendor.eveningSub'),
    badge: t('vendor.windDown'),
  };
};

export default function StoreDashboard({ vendorStatus, missingDocs = [] }) {
  const { token, user } = useAuthStore();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { width: SCREEN_W } = useWindowDimensions();
  const [newOrderBanner, setNewOrderBanner] = useState(null);
  const bannerAnim = useRef(new Animated.Value(-120)).current;
  const bannerTimer = useRef(null);
  const { playOrderSound } = useOrderSound();

  // Responsive helpers (recalculate on every render)
  const isSmall = SCREEN_W < 360;
  const isMedium = SCREEN_W >= 360 && SCREEN_W < 420;
  const rs = (sm, md, lg) => (isSmall ? sm : isMedium ? md : lg);

  // ─── State ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [currIndex, setCurrIndex] = useState(0);
  const [stats, setStats] = useState(null);
  const [noProfile, setNoProfile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifVisible, setNotifVisible] = useState(false);
  const [reviewsModal, setReviewsModal] = useState(false);
  const [allReviews, setAllReviews] = useState([]);
  const [partnersModal, setPartnersModal] = useState(false);
  const [allPartners, setAllPartners] = useState([]);
  const [vendorLocation, setVendorLocation] = useState(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [locModalVisible, setLocModalVisible] = useState(false);
  const [locInput, setLocInput] = useState("");

  // Animations
  const greetFadeAnim = useRef(new Animated.Value(0)).current;
  const greetSlideAnim = useRef(new Animated.Value(20)).current;
  const heroScaleAnim = useRef(new Animated.Value(0.95)).current;

  const vendorName = user?.name || "Vendor";
  const greeting = getGreetingConfig(t);

  // ─── Banner Handlers (defined before early-returns so socket effect can use them) ───
  const showNewOrderBanner = (data) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setNewOrderBanner(data);
    Animated.spring(bannerAnim, {
      toValue: 0,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    bannerTimer.current = setTimeout(() => {
      Animated.timing(bannerAnim, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setNewOrderBanner(null));
    }, 6000);
  };

  const dismissBanner = () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    Animated.timing(bannerAnim, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setNewOrderBanner(null));
  };

  // ─── Animations start ───────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(greetFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(greetSlideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(heroScaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ─── Fetch Stats ─────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await fetch(`${API_BASE}/vendors/me/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.status === 404) {
          setNoProfile(true);
          setLoading(false);
          return;
        }

        let s = null;
        if (data.success && data.data?.stats) {
          s = data.data.stats;
          setStats({
            pendingOrders: s.pending_orders ?? 0,
            labels: s.weekly_chart_data?.map((d) =>
              new Date(d.date).toLocaleDateString("en-IN", {
                weekday: "short",
              }),
            ) || ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "Today"],
            today: {
              totalOrders: s.today_orders ?? 0,
              revenue: s.today_revenue ?? 0,
              avgPrepTime: s.delivery_efficiency?.avg_prep_time ?? 0,
              deliveryTime: s.delivery_efficiency?.avg_delivery_time ?? 0,
            },
            weekly: {
              totalOrders: s.weekly_orders ?? 0,
              revenue: s.weekly_revenue ?? 0,
              avgPrepTime: s.delivery_efficiency?.avg_prep_time ?? 0,
              deliveryTime: s.delivery_efficiency?.avg_delivery_time ?? 0,
            },
            monthly: {
              totalOrders: s.monthly_orders ?? 0,
              revenue: s.monthly_revenue ?? 0,
              avgPrepTime: s.delivery_efficiency?.avg_prep_time ?? 0,
              deliveryTime: s.delivery_efficiency?.avg_delivery_time ?? 0,
            },
            chartValues: s.weekly_chart_data?.map((d) => d.revenue || 0) || [
              0, 0, 0, 0, 0, 0, 0,
            ],
            topProducts: s.top_products || [],
            recentReviews: s.recent_reviews || [],
            allReviews: s.all_reviews || [],
            deliveryPartners: s.delivery_partners || [],
            allDeliveryPartners: s.all_delivery_partners || [],
          });
          setAllReviews(s.all_reviews || s.recent_reviews || []);
          setAllPartners(s.all_delivery_partners || s.delivery_partners || []);
        }

        const profileRes = await fetch(`${API_BASE}/vendors/me/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileData = await profileRes.json();
        if (profileData.success && profileData.data?.vendor) {
          const v = profileData.data.vendor;
          const addr = v.address_line || v.landmark;
          if (addr) setVendorLocation(addr);
        }

        // Build notifications from stats data instead of a missing endpoint
        const builtNotifs = [];

        if (s) {
          if (s.pending_orders > 0) {
            builtNotifs.push({
              type: "order",
              title: `${s.pending_orders} order${s.pending_orders > 1 ? "s" : ""} waiting for your response`,
              body: "Tap to go to Orders and respond.",
              time: "Just now",
              read: false,
            });
          }

          if (s.low_stock_count > 0) {
            builtNotifs.push({
              type: "system",
              title: `${s.low_stock_count} product${s.low_stock_count > 1 ? "s" : ""} running low on stock`,
              body: "Check your inventory before accepting more orders.",
              time: "Today",
              read: false,
            });
          }

          if (s.today_revenue > 0) {
            builtNotifs.push({
              type: "order",
              title: `₹${Number(s.today_revenue).toLocaleString("en-IN")} earned today`,
              body: `${s.today_orders} orders completed successfully.`,
              time: "Today",
              read: true,
            });
          }
        }

        setNotifications(builtNotifs);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => console.log("Dashboard socket connected"));

    socket.on("order:new", (data) => {
      playOrderSound();
      showNewOrderBanner(data);
      setNotifications((prev) => [
        {
          type: "order",
          title: `New order ${data.order_number || "#" + data.order_id} received!`,
          body: `₹${data.total || ""} · Tap Orders to respond.`,
          time: "Just now",
          read: false,
          action: "orders",
        },
        ...prev,
      ]);
      setStats((prev) =>
        prev
          ? {
              ...prev,
              pendingOrders: (prev.pendingOrders || 0) + 1,
              today: {
                ...prev.today,
                totalOrders: (prev.today?.totalOrders || 0) + 1,
              },
            }
          : prev,
      );
    });

    socket.on("phone:request", (data) => {
      playOrderSound();
      setNotifications((prev) => [
        {
          type: "system",
          title: "New phone number request",
          body: "A customer wants to see your phone number.",
          time: "Just now",
          read: false,
          action: "requests",
        },
        ...prev,
      ]);
      showNewOrderBanner({
        order_number: null,
        order_id: null,
        total: null,
        _type: "phone",
      });
    });

    return () => socket.disconnect();
  }, [token]);

  // ─── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: C.bg }]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>{t('vendor.loadingDashboard')}</Text>
        </View>
      </View>
    );
  }


  if (noProfile) {
    return (
      <View style={[styles.centered, { backgroundColor: C.bg, padding: 24 }]}>
        <View style={styles.emptyIconWrap}>
          <MaterialIcons name="store-mall-directory" size={52} color={C.primary} />
        </View>
        <Text style={styles.emptyTitle}>{t('vendor.welcomeTitle')}</Text>
        <Text style={styles.emptySubtitle}>{t('vendor.welcomeSub')}</Text>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate("VendorOnboarding")}
        >
          <Text style={styles.ctaBtnText}>{t('vendor.completeRegistration')}</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#000" />
        </TouchableOpacity>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={[styles.centered, { backgroundColor: C.bg }]}>
        <Text style={{ color: C.textSub }}>{t('common.error')}</Text>
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const currStats = [stats.today, stats.weekly, stats.monthly][currIndex];
  const chartW = SCREEN_W - 64;

  const displayReviews = stats.recentReviews?.length ? stats.recentReviews : [];
  const displayPartners = stats.deliveryPartners?.length
    ? stats.deliveryPartners
    : [];

  const goalPct =
    stats.monthly.totalOrders > 0
      ? Math.min(
          Math.round(
            (stats.today.totalOrders / stats.monthly.totalOrders) * 100,
          ),
          100,
        )
      : 0;

  const STAT_TABS = [t('vendor.tabToday'), t('vendor.tabWeek'), t('vendor.tabMonth')];

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const q = query.toLowerCase().trim();
      let results = [];

      // ── 1. Search Inventory (with stock levels) ──────────────────
      try {
        const invRes = await fetch(
          `${API_BASE}/vendors/me/inventory?search=${encodeURIComponent(query)}&limit=50`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const invData = await invRes.json();
        if (invData.success && Array.isArray(invData.data)) {
          const inventoryItems = invData.data.map((item) => ({
            _type: "inventory",
            id: item.id,
            name: item.product?.name || item.name || "Unknown Item",
            stock_qty: item.stock_qty ?? 0,
            low_stock_threshold: item.low_stock_threshold ?? 5,
            price: item.product?.price ?? item.price ?? 0,
            unit: item.product?.unit || item.unit || "",
            category: item.product?.category?.name || "",
            stockStatus:
              item.stock_qty <= 0
                ? "out"
                : item.stock_qty <= (item.low_stock_threshold ?? 5)
                  ? "low"
                  : "ok",
          }));
          results = [...results, ...inventoryItems];
        }
      } catch (e) {
        console.warn("Inventory search failed:", e);
      }

      // ── 2. Search Products (if inventory search returns nothing) ──
      if (results.length === 0) {
        try {
          const prodRes = await fetch(
            `${API_BASE}/vendors/me/products?search=${encodeURIComponent(query)}&limit=50`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const prodData = await prodRes.json();
          if (prodData.success && Array.isArray(prodData.data)) {
            const productItems = prodData.data.map((p) => ({
              _type: "product",
              id: p.id,
              name: p.name || "Product",
              price: p.price ?? 0,
              unit: p.unit || "",
              category: p.category?.name || "",
              stock_qty: p.inventory?.stock_qty ?? null,
            }));
            results = [...results, ...productItems];
          }
        } catch (e) {
          console.warn("Product search failed:", e);
        }
      }

      // ── 3. Search Delivery Partners (from loaded stats) ───────────
      if (stats?.deliveryPartners?.length) {
        const partnerHits = stats.deliveryPartners.filter((p) =>
          (p.name || "").toLowerCase().includes(q),
        );
        results = [
          ...results,
          ...partnerHits.map((p) => ({
            _type: "partner",
            name: p.name,
            status: p.status || "Offline",
            orders_count: p.orders_count ?? 0,
            rating: p.rating ?? 0,
          })),
        ];
      }

      // ── 4. Search Top Products (from loaded stats) ────────────────
      if (stats?.topProducts?.length) {
        const topHits = stats.topProducts.filter((p) =>
          (p.name || "").toLowerCase().includes(q),
        );
        results = [
          ...results,
          ...topHits.map((p) => ({
            _type: "top_product",
            name: p.name,
            sold: p.sold ?? 0,
            revenue: p.revenue ?? 0,
          })),
        ];
      }

      // ── 5. Earnings / Revenue keywords ───────────────────────────
      const earningsKeywords = [
        "earn",
        "revenue",
        "income",
        "profit",
        "money",
        "sales",
        "today",
        "weekly",
        "monthly",
        "₹",
      ];
      if (earningsKeywords.some((k) => q.includes(k))) {
        results = [
          ...results,
          {
            _type: "earnings",
            name: "Today's Revenue",
            detail: `₹${Number(stats?.today?.revenue || 0).toLocaleString("en-IN")}`,
            sub: `${stats?.today?.totalOrders ?? 0} orders today`,
          },
          {
            _type: "earnings",
            name: "Weekly Revenue",
            detail: `₹${Number(stats?.weekly?.revenue || 0).toLocaleString("en-IN")}`,
            sub: `${stats?.weekly?.totalOrders ?? 0} orders this week`,
          },
          {
            _type: "earnings",
            name: "Monthly Revenue",
            detail: `₹${Number(stats?.monthly?.revenue || 0).toLocaleString("en-IN")}`,
            sub: `${stats?.monthly?.totalOrders ?? 0} orders this month`,
          },
        ];
      }

      // ── 6. Order count keywords ───────────────────────────────────
      const orderKeywords = ["order", "pending", "preparing", "delivered"];
      if (orderKeywords.some((k) => q.includes(k))) {
        results = [
          ...results,
          {
            _type: "orders",
            name: "Pending Orders",
            detail: String(stats?.pendingOrders ?? 0),
            sub: "Awaiting your action",
          },
          {
            _type: "orders",
            name: "Today's Orders",
            detail: String(stats?.today?.totalOrders ?? 0),
            sub: "Orders placed today",
          },
        ];
      }

      setSearchResults(results);
    } catch (e) {
      console.error("Search error:", e);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };


  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 52 : 40,
          paddingHorizontal: rs(20, 24, 28),
          backgroundColor: C.surface,
          paddingBottom: rs(10, 12, 12),
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        {SCREEN_W >= 768 ? (
          /* ── TABLET / WEB: single row ── */
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Logo */}
            <View style={styles.logoWrap}>
              <View
                style={[
                  styles.logoIconBox,
                  { width: 38, height: 38, borderRadius: 10 },
                ]}
              >
                <MaterialIcons name="shopping-cart" size={20} color="#147538" />
              </View>
              <Text style={[styles.logoText, { fontSize: 21, color: C.text }]}>
                Kwik<Text style={{ color: C.primary }}>Pik</Text>
              </Text>
            </View>

            {/* Search */}
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: C.bg,
                borderColor: C.border,
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}
              activeOpacity={0.7}
              onPress={() => setSearchVisible(true)}
            >
              <MaterialIcons name="search" size={16} color={C.textLight} />
              <Text
                style={{ fontSize: 13, color: C.textLight, flex: 1 }}
                numberOfLines={1}
              >
                Search inventory, partners, earnings…
              </Text>
            </TouchableOpacity>

            {/* Bell */}
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                backgroundColor: C.bg,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
              onPress={() => {
                setNotifVisible(true);
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              }}
            >
              <MaterialIcons name="notifications-none" size={22} color={C.text} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Avatar pill */}
            <TouchableOpacity
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
                elevation: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: C.bg,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.8}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: C.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#000" }}>
                  {vendorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text
                style={{ fontSize: 13, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text, maxWidth: 70 }}
                numberOfLines={1}
              >
                {vendorName.split(" ")[0]}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={16} color={C.textSub} />
            </TouchableOpacity>
          </View>
        ) : (
          /* ── MOBILE: two rows ── */
          <>
            {/* Row 1: Logo + Bell + Avatar */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              {/* Logo block */}
              <View style={styles.logoWrap}>
                <View
                  style={[
                    styles.logoIconBox,
                    {
                      width: rs(32, 36, 38),
                      height: rs(32, 36, 38),
                      borderRadius: rs(9, 10, 10),
                    },
                  ]}
                >
                  <MaterialIcons
                    name="shopping-cart"
                    size={rs(17, 19, 20)}
                    color="#147538"
                  />
                </View>
                <View>
                  {/* <Text
                    style={{
                      fontSize: rs(8, 9, 10),
                      color: C.textSub,
                      fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"}}
                  >
                    Welcome back
                  </Text> */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text
                      style={[
                        styles.logoText,
                        { fontSize: rs(15, 17, 19), color: C.text },
                      ]}
                      numberOfLines={1}
                    >
                      Kwik<Text style={{ color: C.primary }}>Pik</Text>
                    </Text>
                    {/* <MaterialIcons
                      name="keyboard-arrow-down"
                      size={rs(14, 15, 16)}
                      color={C.textSub}
                    /> */}
                  </View>
                </View>
              </View>

              {/* Right: Bell + Avatar */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: rs(6, 8, 10) }}>
                {/* Bell */}
                <TouchableOpacity
                  style={{
                    width: rs(36, 40, 42),
                    height: rs(36, 40, 42),
                    borderRadius: rs(10, 11, 12),
                    backgroundColor: C.bg,
                    borderWidth: 1,
                    borderColor: C.border,
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                  onPress={() => {
                    setNotifVisible(true);
                    setNotifications((prev) =>
                      prev.map((n) => ({ ...n, read: true }))
                    );
                  }}
                >
                  <MaterialIcons
                    name="notifications-none"
                    size={rs(20, 22, 22)}
                    color={C.text}
                  />
                  {unreadCount > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Avatar pill */}
                <TouchableOpacity
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 3,
                    elevation: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: rs(5, 6, 6),
                    backgroundColor: C.bg,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 999,
                    paddingHorizontal: rs(8, 10, 10),
                    paddingVertical: rs(5, 6, 6),
                  }}
                  onPress={() => navigation.navigate("Profile")}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      width: rs(22, 24, 26),
                      height: rs(22, 24, 26),
                      borderRadius: rs(11, 12, 13),
                      backgroundColor: C.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: rs(9, 10, 11),
                        fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#000",
                      }}
                    >
                      {vendorName
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: rs(11, 12, 13),
                      fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text,
                      maxWidth: rs(48, 60, 70),
                    }}
                    numberOfLines={1}
                  >
                    {vendorName.split(" ")[0]}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Row 2: Search bar full width */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: C.bg,
                borderColor: C.border,
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: rs(12, 14, 14),
                paddingVertical: rs(9, 10, 10),
                width: "100%",
              }}
              activeOpacity={0.7}
              onPress={() => setSearchVisible(true)}
            >
              <MaterialIcons
                name="search"
                size={rs(15, 16, 16)}
                color={C.textLight}
              />
              <Text
                style={{
                  fontSize: rs(12, 13, 13),
                  color: C.textLight,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                Search inventory, partners, earnings…
              </Text>
              <MaterialIcons
                name="mic"
                size={rs(15, 16, 16)}
                color={C.primary}
              />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ── STATUS BANNERS ──────────────────────────────────── */}
      {vendorStatus === "pending" && (
        <StatusBanner
          title={`⏳ ${t('vendor.verificationPending')}`}
          message={t('vendor.verificationPendingMsg')}
          bg={C.warn}
          border={C.warnBorder}
          textColor={C.warnText}
          missingDocs={missingDocs}
        />
      )}
      {vendorStatus === "rejected" && (
        <StatusBanner
          title={t('vendor.applicationRejected')}
          message={t('vendor.applicationRejectedMsg')}
          bg={C.danger}
          border={C.dangerBorder}
          textColor={C.dangerText}
          missingDocs={missingDocs}
        />
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130, paddingTop: 4 }}
      >
        {/* ── GREETING ──────────────────────────────────────── */}
        <Animated.View
  style={{
    opacity: greetFadeAnim,
    transform: [{ translateY: greetSlideAnim }],
    marginHorizontal: rs(20, 24, 28),
    marginTop: rs(24, 28, 32),
  }}
>
  <LinearGradient
    // colors={["#14B87A", "#0F9B5F", "#0A6B42", "#053D26"]}
    // colors={["#14B87A", "#0F9B5F", "#0A6B42", "#053D26"]}
    // colors={["#2ECC71", "#0F9B5F", "#1B5E3F", "#0A3D26"]}
    colors={["#58b468", "#48BF59", "#2F9645", "#1E6B31"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[
      styles.greetingCard,
      {
        paddingHorizontal: rs(22, 26, 30),
        paddingVertical: rs(26, 30, 34),
      },
    ]}
  >
    {/* Background accent blobs — lighter on green */}
    <View style={[styles.greetingBlobTop, { backgroundColor: "rgba(255,255,255,0.06)" }]} />
    <View style={[styles.greetingBlobBot, { backgroundColor: "rgba(255,255,255,0.04)" }]} />

    <View
      style={{
        position: "absolute",
        top: -20,
        left: -40,
        width: "70%",
        height: 200,
        backgroundColor: "rgba(255,255,255,0.10)",
        transform: [{ rotate: "-20deg" }],
        borderRadius: 100,
      }}
    />
    <View
      style={{
        position: "absolute",
        top: 10,
        left: -10,
        width: "40%",
        height: 140,
        backgroundColor: "rgba(255,255,255,0.06)",
        transform: [{ rotate: "-20deg" }],
        borderRadius: 100,
      }}
    />

    <View style={{ flexDirection: "row", alignItems: "center", gap: rs(12, 14, 16) }}>
      {/* Emoji bubble — white glass on green */}
      <View
        style={{
          width: rs(56, 60, 66),
          height: rs(56, 60, 66),
          borderRadius: rs(18, 19, 20),
          backgroundColor: "rgba(255,255,255,0.2)",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.45)",
        }}
      >
        <MaterialIcons name={greeting.icon} size={rs(24, 26, 30)} color="#fff" />
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "nowrap" }}>
          <Text
            style={{ fontSize: rs(11, 12, 13), color: "rgba(255,255,255,0.85)", fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" }}
          >
            {greeting.text}
          </Text>
          <View style={{ backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ color: "#fff", fontSize: rs(9, 10, 10), fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" }}>
              {greeting.badge}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: rs(24, 27, 30), fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff" }}>
          {vendorName.split(" ")[0]}
        </Text>
        <Text style={{ fontSize: rs(11, 12, 12), color: "rgba(255,255,255,0.9)", fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 2 }}>
          {greeting.sub}
        </Text>
      </View>
    </View>

    {/* Mini stat strip — glass effect on green */}
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 18,
        marginTop: 20,
        padding: 16,
      }}
    >
      <View style={styles.greetingStripItem}>
        <Text style={{ fontSize: 17, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff" }}>
          {stats.today.totalOrders}
        </Text>
        <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 2, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" }}>
          Today's Orders
        </Text>
      </View>
      <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.45)", marginHorizontal: 8 }} />
      <View style={styles.greetingStripItem}>
        <Text style={{ fontSize: 17, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff" }}>
          ₹{Number(stats.today.revenue).toLocaleString("en-IN")}
        </Text>
        <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 2, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" }}>
          Today's Revenue
        </Text>
      </View>
      <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.45)", marginHorizontal: 8 }} />
      <View style={styles.greetingStripItem}>
        <Text style={{ fontSize: 17, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff" }}>
          {stats.today.avgPrepTime}m
        </Text>
        <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 2, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" }}>
          Avg. Prep
        </Text>
      </View>
    </View>
  </LinearGradient>
</Animated.View>

        {/* ── HERO STAT ROW ─────────────────────────────────── */}
        <Animated.View
          style={{
            transform: [{ scale: heroScaleAnim }],
            paddingHorizontal: rs(20, 24, 28),
            marginTop: rs(20, 22, 24),
            flexDirection: "row",
            gap: rs(10, 12, 14),
          }}
        >
          {/* Big dark card */}
          <View
            style={[
              styles.heroCard,
              {
                flex: 1.5,
                padding: rs(18, 20, 22),
                borderRadius: rs(18, 20, 22),
              },
            ]}
          >
            <View style={styles.heroGlowDot} />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <View style={styles.heroPulse} />
              <Text style={[styles.heroTopLabel, { fontSize: rs(10, 11, 11) }]}>
                {t('vendor.monthlyOrders')}
              </Text>
            </View>
            <Text style={[styles.heroValue, { fontSize: rs(28, 32, 36) }]}>
              {stats.monthly.totalOrders.toLocaleString()}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 4,
              }}
            >
              <View style={styles.heroChangeBadge}>
                <MaterialIcons name="trending-up" size={10} color={C.primary} />
                <Text style={[styles.heroChangeTxt, { fontSize: rs(9, 10, 10) }]}>
                  +24%
                </Text>
              </View>
              <Text style={[styles.heroSubTxt, { fontSize: rs(10, 10, 11) }]}>
                {t('vendor.vsLastMonth')}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={{ flexDirection: "row", gap: rs(12, 14, 16) }}>
              <View>
                <Text style={[styles.heroSmallLabel, { fontSize: rs(9, 10, 10) }]}>
                  {t('vendor.revenue')}
                </Text>
                <Text style={[styles.heroSmallVal, { fontSize: rs(13, 14, 15) }]}>
                  ₹
                  {Number(stats.monthly.revenue).toLocaleString("en-IN", {
                    notation: "compact",
                  })}
                </Text>
              </View>
              <View>
                <Text style={[styles.heroSmallLabel, { fontSize: rs(9, 10, 10) }]}>
                  {t('vendor.prepAvg')}
                </Text>
                <Text style={[styles.heroSmallVal, { fontSize: rs(13, 14, 15) }]}>
                  {stats.monthly.avgPrepTime}m
                </Text>
              </View>
            </View>
          </View>

          {/* Right mini cards */}
          <View style={{ flex: 1, gap: rs(12, 14, 16) }}>
            <MiniMetricCard
              label={t('vendor.weeklyOrders')}
              value={stats.weekly.totalOrders.toString()}
              icon="receipt-long"
              iconColor={C.blue}
              iconBg={C.blueDim}
              rs={rs}
            />
            <MiniMetricCard
              label={t('vendor.weeklyRevenue')}
              value={`₹${Number(stats.weekly.revenue).toLocaleString("en-IN", { notation: "compact" })}`}
              icon="payments"
              iconColor={C.orange}
              iconBg={C.orangeDim}
              rs={rs}
            />
            <MiniMetricCard
              label={t('vendor.deliveryTime')}
              value={`${stats.monthly.deliveryTime}m`}
              icon="moped"
              iconColor={C.purple}
              iconBg={C.purpleDim}
              rs={rs}
            />
          </View>
        </Animated.View>

        {/* ── SALES CHART ───────────────────────────────────── */}
        <View
          style={[
            styles.card,
            { marginHorizontal: rs(20, 24, 28), marginTop: rs(18, 20, 22) },
          ]}
        >
          <View style={[styles.cardHeader, { flexWrap: "wrap", gap: 8 }]}>
            <View>
              <Text style={[styles.cardOverline, { fontSize: rs(9, 10, 10) }]}>
                {t('vendor.salesOverview')}
              </Text>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 16) }]}>
                {t('vendor.revenueChart')}
              </Text>
            </View>
            <View style={[styles.tabRow, { flexShrink: 0 }]}>
              {STAT_TABS.map((t, i) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setCurrIndex(i)}
                  style={[
                    styles.tabPill,
                    currIndex === i && styles.tabPillActive,
                    {
                      paddingHorizontal: rs(20, 24, 28),
                      paddingVertical: rs(4, 5, 6),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { fontSize: rs(9, 10, 11) },
                      currIndex === i && styles.tabTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Active period stats */}
          <View style={styles.chartStatRow}>
            <View style={styles.chartStatItem}>
              <Text style={[styles.chartStatVal, { fontSize: rs(16, 18, 20), color: C.primary }]}>
                {currStats.totalOrders}
              </Text>
              <Text style={[styles.chartStatLabel, { fontSize: rs(10, 11, 11) }]}>
                {t('vendor.orders')}
              </Text>
            </View>
            <View style={styles.chartStatItem}>
              <Text style={[styles.chartStatVal, { fontSize: rs(16, 18, 20), color: C.blue }]}>
                ₹{Number(currStats.revenue).toLocaleString("en-IN")}
              </Text>
              <Text style={[styles.chartStatLabel, { fontSize: rs(10, 11, 11) }]}>
                {t('vendor.revenue')}
              </Text>
            </View>
            <View style={styles.chartStatItem}>
              <Text style={[styles.chartStatVal, { fontSize: rs(16, 18, 20), color: C.orange }]}>
                {currStats.avgPrepTime}m
              </Text>
              <Text style={[styles.chartStatLabel, { fontSize: rs(10, 11, 11) }]}>
                {t('vendor.avgPrep')}
              </Text>
            </View>
          </View>

          <LineChart
            data={{
              labels: stats.labels,
              datasets: [
                { data: stats.chartValues.length ? stats.chartValues : [0] },
              ],
            }}
            width={chartW}
            height={rs(150, 170, 185)}
            yAxisSuffix="₹"
            chartConfig={{
              backgroundGradientFrom: C.surface,
              backgroundGradientTo: C.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(14, 230, 39, ${opacity})`,
              labelColor: () => C.textLight,
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: C.primary,
                fill: C.surface,
              },
              propsForBackgroundLines: {
                stroke: C.border,
                strokeDasharray: "4",
              },
            }}
            bezier
            style={{ borderRadius: 12, marginTop: 10, marginLeft: -8 }}
          />
        </View>

        {/* ── GOAL + EFFICIENCY ─────────────────────────────── */}
        <View
          style={[
            styles.twoCol,
            {
              marginHorizontal: rs(20, 24, 28),
              marginTop: rs(20, 22, 24),
              gap: rs(10, 12, 14),
            },
          ]}
        >
          {/* Goal */}
          <View
            style={[
              styles.card,
              { flex: 1, marginHorizontal: 0, marginTop: 0 },
              SCREEN_W < 768 && { alignItems: "center" },
            ]}
          >
            <Text style={[styles.cardTitle, { fontSize: rs(13, 14, 15), marginBottom: 12 }]}>
              {t('vendor.goalOverview')}
            </Text>
            <View style={styles.goalRingWrap}>
              <View
                style={[
                  styles.goalRing,
                  {
                    width: rs(76, 86, 96),
                    height: rs(76, 86, 96),
                    borderRadius: rs(38, 43, 48),
                    borderWidth: rs(7, 8, 10),
                  },
                ]}
              >
                <Text style={[styles.goalPct, { fontSize: rs(15, 17, 19) }]}>
                  {goalPct}%
                </Text>
              </View>
            </View>
            <View style={{ gap: 8, marginTop: 12, alignItems: SCREEN_W >= 768 ? "stretch" : "center" }}>
              <View style={[styles.goalRow, SCREEN_W < 768 && { justifyContent: "center" }]}>
                <View
                  style={[styles.goalDot, { backgroundColor: C.primary }]}
                />
                <Text style={[styles.goalLabel, { fontSize: rs(10, 11, 11) }]}>
                  Monthly Total
                </Text>
                <Text style={[styles.goalNum, { fontSize: rs(11, 12, 12) }]}>
                  {stats.monthly.totalOrders}
                </Text>
              </View>
              <View style={[styles.goalRow, SCREEN_W < 768 && { justifyContent: "center" }]}>
                <View style={[styles.goalDot, { backgroundColor: C.blue }]} />
                <Text style={[styles.goalLabel, { fontSize: rs(10, 11, 11) }]}>
                  Today
                </Text>
                <Text style={[styles.goalNum, { fontSize: rs(11, 12, 12) }]}>
                  {stats.today.totalOrders}
                </Text>
              </View>
            </View>
          </View>

          {/* Efficiency */}
          <View
            style={[
              styles.card,
              { flex: 1, marginHorizontal: 0, marginTop: 0 },
              SCREEN_W < 768 && { alignItems: "center" },
            ]}
          >
            <Text
              style={[
                styles.cardTitle,
                { fontSize: rs(13, 14, 15), marginBottom: 12 },
              ]}
            >
              {t('vendor.efficiency')}
            </Text>
            <View style={styles.effBlock}>
              <View
                style={[
                  styles.effIcon,
                  {
                    backgroundColor: C.primaryDim,
                    width: rs(38, 42, 46),
                    height: rs(38, 42, 46),
                    borderRadius: rs(11, 12, 13),
                  },
                ]}
              >
                <MaterialIcons
                  name="schedule"
                  size={rs(18, 20, 22)}
                  color={C.primaryDark}
                />
              </View>
              <Text style={[styles.effLabel, { fontSize: rs(10, 10, 11) }]}>
                {t('vendor.avgPrepTime')}
              </Text>
              <Text
                style={[
                  styles.effVal,
                  { fontSize: rs(18, 20, 22), color: C.primaryDark },
                ]}
              >
                {stats.monthly.avgPrepTime}
                <Text style={{ fontSize: rs(11, 12, 13) }}> min</Text>
              </Text>
            </View>
            <View style={styles.effDivider} />
            <View style={styles.effBlock}>
              <View
                style={[
                  styles.effIcon,
                  {
                    backgroundColor: C.purpleDim,
                    width: rs(38, 42, 46),
                    height: rs(38, 42, 46),
                    borderRadius: rs(11, 12, 13),
                  },
                ]}
              >
                <MaterialIcons
                  name="moped"
                  size={rs(18, 20, 22)}
                  color={C.purple}
                />
              </View>
              <Text style={[styles.effLabel, { fontSize: rs(10, 10, 11) }]}>
                {t('vendor.avgDelivery')}
              </Text>
              <Text
                style={[
                  styles.effVal,
                  { fontSize: rs(18, 20, 22), color: C.purple },
                ]}
              >
                {stats.monthly.deliveryTime}
                <Text style={{ fontSize: rs(11, 12, 13) }}> min</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* ── TOP PRODUCTS ──────────────────────────────────── */}
        <View
          style={[
            styles.card,
            { marginHorizontal: rs(20, 24, 28), marginTop: rs(20, 22, 24) },
          ]}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardOverline, { fontSize: rs(9, 10, 10) }]}>
                {t('vendor.performance')}
              </Text>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 16) }]}>
                {t('vendor.topSellingProducts')}
              </Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: C.primaryDim }]}>
              <MaterialIcons
                name="trending-up"
                size={12}
                color={C.primaryDark}
              />
              <Text
                style={[
                  styles.badgePillText,
                  { color: C.primaryDark, fontSize: rs(9, 10, 10) },
                ]}
              >
                {t('vendor.live')}
              </Text>
            </View>
          </View>
          {stats.topProducts && stats.topProducts.length > 0 ? (
            stats.topProducts.map((p, i) => (
              <ProductRow
                key={i}
                rank={i + 1}
                name={p.name}
                sold={p.sold}
                revenue={p.revenue}
                tag={i === 0 ? t('vendor.bestSeller') : i < 3 ? t('vendor.trending') : null}
                image={
                  p.image ||
                  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80"
                }
                rs={rs}
              />
            ))
          ) : (
            <EmptyState icon="bar-chart" message={t('vendor.noSalesData')} />
          )}
        </View>

        {/* ── LATEST REVIEWS ────────────────────────────────── */}
        <View
          style={[
            styles.card,
            { marginHorizontal: rs(20, 24, 28), marginTop: rs(20, 22, 24) },
          ]}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardOverline, { fontSize: rs(9, 10, 10) }]}>
                {t('vendor.feedback')}
              </Text>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 16) }]}>
                {t('vendor.latestReviews')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.viewMoreBtn]}
              onPress={() => setReviewsModal(true)}
            >
              <Text style={[styles.viewMoreText, { fontSize: rs(11, 12, 12) }]}>
                {t('vendor.viewAll')}
              </Text>
              <MaterialIcons
                name="arrow-forward-ios"
                size={10}
                color={C.primary}
              />
            </TouchableOpacity>
          </View>
          {displayReviews.length > 0
            ? displayReviews
                .slice(0, 3)
                .map((r, i) => <ReviewRow key={i} review={r} rs={rs} />)
            : null}
        </View>

        {/* ── DELIVERY PARTNERS ─────────────────────────────── */}
        <View
          style={[
            styles.card,
            { marginHorizontal: rs(20, 24, 28), marginTop: rs(20, 22, 24) },
          ]}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardOverline, { fontSize: rs(9, 10, 10) }]}>
                {t('vendor.network')}
              </Text>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 16) }]}>
                {t('vendor.deliveryPartners')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewMoreBtn}
              onPress={() => setPartnersModal(true)}
            >
              <Text style={[styles.viewMoreText, { fontSize: rs(11, 12, 12) }]}>
                {t('vendor.seeAll')}
              </Text>
              <MaterialIcons
                name="arrow-forward-ios"
                size={10}
                color={C.primary}
              />
            </TouchableOpacity>
          </View>
          {displayPartners.length > 0
            ? displayPartners
                .slice(0, 3)
                .map((d, i) => (
                  <DeliveryRow key={i} index={i} partner={d} rs={rs} />
                ))
            : null}
        </View>
      </ScrollView>

      {/* ── NOTIFICATIONS MODAL ─────────────────────────────── */}
      <Modal
        visible={notifVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotifVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setNotifVisible(false)}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Platform.OS === "ios" ? 34 : 20 },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <Text style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                  {unreadCount} unread
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setNotifVisible(false)}
              style={styles.closeIconBtn}
            >
              <MaterialIcons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>
          {notifications.length > 0 ? (
            <FlatList
              data={notifications}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <NotifItem
                  item={item}
                  onPress={(action) => {
                    setNotifVisible(false);
                    navigation.navigate("Orders", { initialTab: action });
                  }}
                />
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          ) : (
            <EmptyState
              icon="notifications-none"
              message="You're all caught up!"
            />
          )}
        </View>
      </Modal>

      {/* ── ALL REVIEWS MODAL ───────────────────────────────── */}
      <Modal
        visible={reviewsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewsModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setReviewsModal(false)}
        />
        <View
          style={[
            styles.sheet,
            {
              maxHeight: "80%",
              paddingBottom: Platform.OS === "ios" ? 34 : 20,
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>All Reviews</Text>
            <TouchableOpacity
              onPress={() => setReviewsModal(false)}
              style={styles.closeIconBtn}
            >
              <MaterialIcons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={allReviews}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 18 }}>
                <ReviewRow review={item} rs={(sm, md, lg) => md} />
              </View>
            )}
            ListEmptyComponent={
              <EmptyState icon="star-border" message="No reviews yet" />
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      </Modal>

      {/* ── ALL PARTNERS MODAL ──────────────────────────────── */}
      <Modal
        visible={partnersModal}
        animationType="slide"
        transparent
        onRequestClose={() => setPartnersModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setPartnersModal(false)}
        />
        <View
          style={[
            styles.sheet,
            {
              maxHeight: "80%",
              paddingBottom: Platform.OS === "ios" ? 34 : 20,
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>All Delivery Partners</Text>
            <TouchableOpacity
              onPress={() => setPartnersModal(false)}
              style={styles.closeIconBtn}
            >
              <MaterialIcons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={allPartners}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item, index }) => (
              <View style={{ paddingHorizontal: 18 }}>
                <DeliveryRow
                  index={index}
                  partner={item}
                  rs={(sm, md, lg) => md}
                />
              </View>
            )}
            ListEmptyComponent={
              <EmptyState icon="moped" message="No partners yet" />
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      </Modal>

      {/* ── SEARCH MODAL ────────────────────────────────────── */}
      <Modal
        visible={searchVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setSearchVisible(false);
          setSearchQuery("");
          setSearchResults([]);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}>
          <View style={styles.searchModal}>
            <View style={styles.searchModalHeader}>
              <View style={styles.searchInputRow}>
                <MaterialIcons name="search" size={18} color={C.textLight} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search inventory, products, earnings…"
                  placeholderTextColor={C.textLight}
                  autoFocus
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                  >
                    <MaterialIcons name="close" size={18} color={C.textLight} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.searchCancelBtn}
                onPress={() => {
                  setSearchVisible(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                <Text
                  style={{ color: C.primary, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 14 }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>

            {searchLoading ? (
              <ActivityIndicator color={C.primary} style={{ marginTop: rs(20, 22, 24) }} />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(_, i) => i.toString()}
                renderItem={({ item }) => {
                  // ── Config map ──────────────────────────────────────────────
                  const stockColor =
                    item.stockStatus === "out"
                      ? "#EF4444"
                      : item.stockStatus === "low"
                        ? C.orange
                        : "#16A34A";

                  const stockLabel =
                    item.stockStatus === "out"
                      ? "Out of Stock"
                      : item.stockStatus === "low"
                        ? "Low Stock"
                        : "In Stock";

                  const stockBg =
                    item.stockStatus === "out"
                      ? "#FEF2F2"
                      : item.stockStatus === "low"
                        ? C.orangeDim
                        : C.primaryDim;

                  const typeMap = {
                    inventory: {
                      icon: "inventory",
                      iconColor: C.primaryDark,
                      iconBg: C.primaryDim,
                      badgeLabel: "Inventory",
                      badgeColor: C.primaryDark,
                      badgeBg: C.primaryDim,
                      mainText: item.name,
                      subText: `${item.unit || ""}${item.category ? " · " + item.category : ""}`,
                      rightTop: `${item.stock_qty ?? 0} units`,
                      rightTopColor: stockColor,
                      rightBottom: stockLabel,
                      rightBottomBg: stockBg,
                      rightBottomColor: stockColor,
                    },
                    product: {
                      icon: "shopping-bag",
                      iconColor: C.blue,
                      iconBg: C.blueDim,
                      badgeLabel: "Product",
                      badgeColor: C.blue,
                      badgeBg: C.blueDim,
                      mainText: item.name,
                      subText: `${item.unit || ""}${item.category ? " · " + item.category : ""}`,
                      rightTop: `₹${item.price}`,
                      rightTopColor: C.blue,
                      rightBottom:
                        item.stock_qty != null
                          ? `Stock: ${item.stock_qty}`
                          : "",
                      rightBottomBg: C.blueDim,
                      rightBottomColor: C.blue,
                    },
                    partner: {
                      icon: "moped",
                      iconColor: C.purple,
                      iconBg: C.purpleDim,
                      badgeLabel: "Partner",
                      badgeColor: C.purple,
                      badgeBg: C.purpleDim,
                      mainText: item.name,
                      subText: `${item.orders_count ?? 0} orders delivered`,
                      rightTop: `⭐ ${item.rating ?? 0}`,
                      rightTopColor: C.orange,
                      rightBottom: item.status,
                      rightBottomBg:
                        item.status === "Online" ? C.primaryDim : "#F1F5F9",
                      rightBottomColor:
                        item.status === "Online" ? C.primaryDark : C.textSub,
                    },
                    top_product: {
                      icon: "trending-up",
                      iconColor: C.orange,
                      iconBg: C.orangeDim,
                      badgeLabel: "Top Seller",
                      badgeColor: C.orange,
                      badgeBg: C.orangeDim,
                      mainText: item.name,
                      subText: `${item.sold ?? 0} units sold`,
                      rightTop: `₹${Number(item.revenue ?? 0).toLocaleString("en-IN")}`,
                      rightTopColor: C.orange,
                      rightBottom: "Revenue",
                      rightBottomBg: C.orangeDim,
                      rightBottomColor: C.orange,
                    },
                    earnings: {
                      icon: "payments",
                      iconColor: "#16A34A",
                      iconBg: "#ECFDF5",
                      badgeLabel: "Earnings",
                      badgeColor: "#16A34A",
                      badgeBg: "#ECFDF5",
                      mainText: item.name,
                      subText: item.sub || "",
                      rightTop: item.detail,
                      rightTopColor: "#16A34A",
                      rightBottom: "",
                      rightBottomBg: "transparent",
                      rightBottomColor: "transparent",
                    },
                    orders: {
                      icon: "receipt-long",
                      iconColor: C.blue,
                      iconBg: C.blueDim,
                      badgeLabel: "Orders",
                      badgeColor: C.blue,
                      badgeBg: C.blueDim,
                      mainText: item.name,
                      subText: item.sub || "",
                      rightTop: item.detail,
                      rightTopColor: C.blue,
                      rightBottom: "",
                      rightBottomBg: "transparent",
                      rightBottomColor: "transparent",
                    },
                  };

                  const cfg = typeMap[item._type] || typeMap.product;

                  return (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingHorizontal: 18,
                        paddingVertical: 13,
                        borderBottomWidth: 1,
                        borderBottomColor: C.border,
                      }}
                    >
                      {/* Icon */}
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: cfg.iconBg,
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <MaterialIcons
                          name={cfg.icon}
                          size={20}
                          color={cfg.iconColor}
                        />
                      </View>

                      {/* Middle: name + sub + badge */}
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text,
                              flexShrink: 1,
                            }}
                            numberOfLines={1}
                          >
                            {cfg.mainText}
                          </Text>
                          <View
                            style={{
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 999,
                              backgroundColor: cfg.badgeBg,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: cfg.badgeColor,
                              }}
                            >
                              {cfg.badgeLabel}
                            </Text>
                          </View>
                        </View>
                        {cfg.subText ? (
                          <Text
                            style={{
                              fontSize: 11,
                              color: C.textSub,
                              marginTop: 8,
                            }}
                            numberOfLines={1}
                          >
                            {cfg.subText}
                          </Text>
                        ) : null}
                      </View>

                      {/* Right: value + status pill */}
                      <View
                        style={{
                          alignItems: "flex-end",
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: cfg.rightTopColor,
                          }}
                        >
                          {cfg.rightTop}
                        </Text>
                        {cfg.rightBottom ? (
                          <View
                            style={{
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 999,
                              backgroundColor: cfg.rightBottomBg,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: cfg.rightBottomColor,
                              }}
                            >
                              {cfg.rightBottom}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 40 }}
              />
            ) : searchQuery.length > 0 ? (
              <View style={styles.empty}>
                <MaterialIcons name="search-off" size={40} color={C.border} />
                <Text style={styles.emptyText}>
                  No results for "{searchQuery}"
                </Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <MaterialIcons
                  name="manage-search"
                  size={40}
                  color={C.border}
                />
                <Text style={styles.emptyText}>
                  Search your inventory or products
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── LOCATION MODAL ──────────────────────────────────── */}
      <Modal
        visible={locModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setLocModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setLocModalVisible(false)}
        />
        <View style={styles.locModal}>
          <Text style={styles.sheetTitle}>Store Location</Text>
          <Text style={{ color: C.textSub, fontSize: 13, marginBottom: 14 }}>
            This is pulled from your store profile. To change it permanently,
            update your store address in Settings.
          </Text>
          <View style={styles.locCurrentRow}>
            <MaterialIcons name="location-on" size={18} color={C.primary} />
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text,
                flex: 1,
              }}
            >
              {vendorLocation || "Not set"}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.ctaBtn,
              { marginTop: 20, alignSelf: "stretch", justifyContent: "center" },
            ]}
            onPress={() => {
              setLocModalVisible(false);
              navigation.navigate("VendorOnboarding");
            }}
          >
            <MaterialIcons name="edit" size={16} color="#000" />
            <Text style={styles.ctaBtnText}>Edit in Store Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginTop: 18, alignSelf: "center" }}
            onPress={() => setLocModalVisible(false)}
          >
            <Text style={{ color: C.textSub, fontSize: 14 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      {/* ── NEW ORDER BANNER ── */}
      <Animated.View
        pointerEvents={newOrderBanner ? "auto" : "none"}
        style={[
          bannerStyles.wrap,
          {
            transform: [{ translateY: bannerAnim }],
            opacity: newOrderBanner ? 1 : 0,
          },
        ]}
      >
        <View style={bannerStyles.iconWrap}>
          <MaterialIcons name="shopping-bag" size={22} color="#147538" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={bannerStyles.title}>
            {newOrderBanner?._type === "phone"
              ? "Phone Request!"
              : "New Order Received!"}
          </Text>
          <Text style={bannerStyles.sub} numberOfLines={1}>
            {newOrderBanner?._type === "phone"
              ? "A customer wants your contact number."
              : newOrderBanner?.order_number
                ? `Order ${newOrderBanner.order_number}`
                : `Order #${newOrderBanner?.order_id ?? ""}`}
            {newOrderBanner?._type !== "phone" && newOrderBanner?.total
              ? `  ·  ₹${newOrderBanner.total}`
              : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={bannerStyles.actionBtn}
          onPress={() => {
            dismissBanner();
            navigation.navigate("Orders", {
              initialTab:
                newOrderBanner?._type === "phone" ? "requests" : "orders",
            });
          }}
        >
          <Text style={bannerStyles.actionText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={dismissBanner} style={bannerStyles.closeBtn}>
          <MaterialIcons name="close" size={16} color="#64748B" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function StatusBanner({ title, message, bg, border, textColor, missingDocs }) {
  return (
    <View
      style={[styles.banner, { backgroundColor: bg, borderLeftColor: border }]}
    >
      <Text style={[styles.bannerTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.bannerMsg, { color: textColor }]}>{message}</Text>
      {missingDocs.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <MaterialIcons name="description" size={14} color={textColor} />
            <Text
              style={[styles.bannerTitle, { color: textColor, marginBottom: 0 }]}
            >
              Missing Documents:
            </Text>
          </View>
          {missingDocs.map((doc) => (
            <Text key={doc} style={[styles.bannerDoc, { color: textColor }]}>
              • {doc}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function MiniMetricCard({ label, value, icon, iconColor, iconBg, rs }) {
  return (
    <View
      style={[
        styles.miniCard,
        { padding: rs(12, 14, 16), borderRadius: rs(14, 16, 18) },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <View
          style={[
            styles.miniIcon,
            {
              width: rs(24, 26, 28),
              height: rs(24, 26, 28),
              borderRadius: rs(12, 13, 14),
              backgroundColor: iconBg,
              flexShrink: 0,
            },
          ]}
        >
          <MaterialIcons name={icon} size={rs(12, 13, 14)} color={iconColor} />
        </View>
        <Text
          style={[styles.miniLabel, { fontSize: rs(9, 9.5, 10), flex: 1 }]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.miniValue,
          { fontSize: rs(14, 15, 16), color: iconColor },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function ProductRow({ rank, name, sold, revenue, tag, image, rs }) {
  return (
    <View style={styles.productRow}>
      <Text style={[styles.productRank, { fontSize: rs(11, 12, 12) }]}>
        #{rank}
      </Text>
      <Image
        source={{ uri: image }}
        style={[
          styles.productImg,
          {
            width: rs(38, 42, 46),
            height: rs(38, 42, 46),
            borderRadius: rs(14, 16, 18),
          },
        ]}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.productName, { fontSize: rs(12, 13, 14) }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text style={[styles.productSold, { fontSize: rs(10, 11, 11) }]}>
          {sold} units sold
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: rs(10, 12, 14) }}>
        <Text style={[styles.productRevenue, { fontSize: rs(12, 13, 14) }]}>
          ₹{Number(revenue).toLocaleString()}
        </Text>
        {tag && (
          <View
            style={[
              styles.tagPill,
              {
                backgroundColor:
                  tag === "Best Seller" ? C.primaryDim : C.orangeDim,
              },
            ]}
          >
            <Text
              style={[
                styles.tagText,
                {
                  color: tag === "Best Seller" ? C.primaryDark : C.orange,
                  fontSize: rs(8, 9, 9),
                },
              ]}
            >
              {tag}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ReviewRow({ review, rs }) {
  const name = review.customer_name || review.name || "Customer";
  const rating = review.rating || 0;
  const comment = review.comment || review.quote || "";
  const positive = rating >= 3;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={styles.reviewRow}>
      <View
        style={[
          styles.reviewAvatar,
          {
            width: rs(34, 36, 40),
            height: rs(34, 36, 40),
            borderRadius: rs(17, 18, 20),
            backgroundColor: positive ? C.primaryDim : "#FEF2F2",
          },
        ]}
      >
        <Text
          style={[
            styles.reviewInitials,
            {
              fontSize: rs(11, 12, 13),
              color: positive ? C.primaryDark : "#EF4444",
            },
          ]}
        >
          {initials}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.reviewName, { fontSize: rs(12, 13, 14) }]}>
          {name}
        </Text>
        <Text
          style={[styles.reviewQuote, { fontSize: rs(10, 11, 11) }]}
          numberOfLines={1}
        >
          {comment}
        </Text>
      </View>
      <View
        style={[
          styles.ratingBadge,
          { backgroundColor: positive ? C.primaryDim : "#FEF2F2" },
        ]}
      >
        <Text style={{ fontSize: 10 }}>⭐</Text>
        <Text
          style={[
            styles.ratingText,
            {
              color: positive ? C.primaryDark : "#EF4444",
              fontSize: rs(11, 12, 12),
            },
          ]}
        >
          {Number(rating).toFixed(1)}
        </Text>
      </View>
    </View>
  );
}

function StaticReviewRow({ data, rs }) {
  return (
    <View style={styles.reviewRow}>
      <View
        style={[
          styles.reviewAvatar,
          {
            width: rs(34, 36, 40),
            height: rs(34, 36, 40),
            borderRadius: rs(17, 18, 20),
            backgroundColor: data.positive ? C.primaryDim : "#FEF2F2",
          },
        ]}
      >
        <Text
          style={[
            styles.reviewInitials,
            {
              fontSize: rs(11, 12, 13),
              color: data.positive ? C.primaryDark : "#EF4444",
            },
          ]}
        >
          {data.initials}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.reviewName, { fontSize: rs(12, 13, 14) }]}>
          {data.name}
        </Text>
        <Text
          style={[styles.reviewQuote, { fontSize: rs(10, 11, 11) }]}
          numberOfLines={1}
        >
          {data.quote}
        </Text>
      </View>
      <View
        style={[
          styles.ratingBadge,
          { backgroundColor: data.positive ? C.primaryDim : "#FEF2F2" },
        ]}
      >
        <Text style={{ fontSize: 10 }}>⭐</Text>
        <Text
          style={[
            styles.ratingText,
            {
              color: data.positive ? C.primaryDark : "#EF4444",
              fontSize: rs(11, 12, 12),
            },
          ]}
        >
          {data.rating.toFixed(1)}
        </Text>
      </View>
    </View>
  );
}

function DeliveryRow({ index, partner, rs }) {
  const name = partner.name || partner.driver_name || "Driver";
  const status = partner.status || (partner.is_online ? "Online" : "Offline");
  const orders = partner.orders_count ?? partner.deliveries_today ?? 0;
  const score = partner.rating ?? partner.score ?? 0;
  const scoreColor =
    score >= 4 ? "#059669" : score >= 3 ? "#F59E0B" : "#EF4444";
  const scoreBg = score >= 4 ? "#ECFDF5" : score >= 3 ? "#FFFBEB" : "#FEF2F2";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={styles.deliveryRow}>
      <Text style={[styles.deliveryRank, { fontSize: rs(10, 11, 12) }]}>
        {index + 1}
      </Text>
      <View
        style={[
          styles.deliveryAvatar,
          {
            width: rs(34, 36, 40),
            height: rs(34, 36, 40),
            borderRadius: rs(17, 18, 20),
          },
        ]}
      >
        <Text style={[styles.deliveryInitials, { fontSize: rs(11, 12, 13) }]}>
          {initials}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.deliveryName, { fontSize: rs(12, 13, 14) }]}>
          {name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: status === "Online" ? "#22c55e" : "#94a3b8" },
            ]}
          />
          <Text style={[styles.deliverySub, { fontSize: rs(10, 11, 11) }]}>
            {status} · {orders} orders
          </Text>
        </View>
      </View>
      <View style={[styles.scoreBadge, { backgroundColor: scoreBg }]}>
        <Text style={{ fontSize: 10 }}>⭐</Text>
        <Text
          style={[
            styles.scoreText,
            { color: scoreColor, fontSize: rs(11, 11, 12) },
          ]}
        >
          {score}
        </Text>
      </View>
    </View>
  );
}

function StaticDeliveryRow({ index, data, rs }) {
  return (
    <View style={styles.deliveryRow}>
      <Text style={[styles.deliveryRank, { fontSize: rs(10, 11, 12) }]}>
        {index + 1}
      </Text>
      <View
        style={[
          styles.deliveryAvatar,
          {
            width: rs(34, 36, 40),
            height: rs(34, 36, 40),
            borderRadius: rs(17, 18, 20),
          },
        ]}
      >
        <Text style={[styles.deliveryInitials, { fontSize: rs(11, 12, 13) }]}>
          {data.initials}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.deliveryName, { fontSize: rs(12, 13, 14) }]}>
          {data.name}
        </Text>
        <Text style={[styles.deliverySub, { fontSize: rs(10, 11, 11) }]}>
          {data.sub}
        </Text>
      </View>
      <View style={[styles.scoreBadge, { backgroundColor: data.color + "18" }]}>
        <Text style={{ fontSize: 10 }}>⭐</Text>
        <Text
          style={[
            styles.scoreText,
            { color: data.color, fontSize: rs(11, 11, 12) },
          ]}
        >
          {data.score}
        </Text>
      </View>
    </View>
  );
}

function NotifItem({ item, onPress }) {
  const typeMap = {
    order: { icon: "receipt", color: "#059669", bg: "#ECFDF5" },
    delivery: { icon: "moped", color: "#6366F1", bg: "#EEF2FF" },
    review: { icon: "star", color: "#F59E0B", bg: "#FFFBEB" },
    system: { icon: "info-outline", color: "#3B82F6", bg: "#EFF6FF" },
  };
  const t = typeMap[item.type] || typeMap.system;

  const Wrapper = item.action ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[
        styles.notifItem,
        !item.read && { backgroundColor: C.primaryDim },
      ]}
      onPress={item.action ? () => onPress(item.action) : undefined}
      activeOpacity={0.75}
    >
      <View style={[styles.notifIcon, { backgroundColor: t.bg }]}>
        <MaterialIcons name={t.icon} size={18} color={t.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.notifTitle}>{item.title || item.message}</Text>
        {item.body && <Text style={styles.notifBody}>{item.body}</Text>}
        <Text style={styles.notifTime}>
          {item.time || item.created_at || ""}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
      {item.action && (
        <MaterialIcons name="chevron-right" size={18} color={C.textLight} />
      )}
    </Wrapper>
  );
}

function EmptyState({ icon, message }) {
  return (
    <View style={styles.empty}>
      <MaterialIcons name={icon} size={40} color={C.border} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  loadingCard: {
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    padding: 32,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  loadingText: { color: C.textSub, fontSize: 14, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logoWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoIconBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
  },
  logoImg: { width: "100%", height: "100%" },
  logoText: { fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text, letterSpacing: -0.5 },

  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.primaryDim,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 120,
  },
  locationChipText: { color: C.text, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", flexShrink: 1 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.bg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  searchText: { color: C.textLight, flex: 1 },

  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F43F5E",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  notifBadgeText: { fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff" },

  avatarBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primaryDim,
  },
  avatarInitials: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.primaryDark },

  // ── Banner ──
  banner: {
    marginHorizontal: 14,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
  },
  bannerTitle: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 13, marginBottom: 4 },
  bannerMsg: { fontSize: 12, lineHeight: 18 },
  bannerDoc: { fontSize: 12, marginTop: 2 },

  // ── Greeting ──
  greetingCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  greetingBlobTop: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.primaryDim,
  },
  greetingBlobBot: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3B82F608",
  },
  greetingEmojiBubble: { alignItems: "center", justifyContent: "center" },
  greetingTimeText: { fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  greetingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  greetingBadgeText: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 0.3 },
  greetingName: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text, letterSpacing: -0.5 },
  greetingSub: { fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 2 },

  greetingStrip: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderRadius: 14,
    marginTop: 14,
    padding: 12,
  },
  greetingStripItem: { flex: 1, alignItems: "center" },
  greetingStripDivider: {
    width: 1,
    backgroundColor: C.border,
    marginHorizontal: 8,
  },
  greetingStripVal: { fontSize: 16, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: -0.3 },
  greetingStripLabel: {
    fontSize: 10,
    color: C.textSub,
    marginTop: 2,
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},

  // ── Hero ──
  heroCard: {
    backgroundColor: C.accent,
    borderRadius: 22,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  heroGlowDot: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(14,230,39,0.07)",
  },
  heroPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },
  heroTopLabel: {
    color: "rgba(255,255,255,0.5)",
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 0.8,
  },
  heroValue: { fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff", letterSpacing: -1 },
  heroChangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.primaryDim,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroChangeTxt: { color: C.primary, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},
  heroSubTxt: { color: "rgba(255,255,255,0.4)", fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 10,
  },
  heroSmallLabel: {
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", marginBottom: 2,
  },
  heroSmallVal: { color: "#fff", fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},

  miniCard: {
    backgroundColor: C.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  miniIcon: { alignItems: "center", justifyContent: "center" },
  miniLabel: { color: C.textSub, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium", marginBottom: 1 },
  miniValue: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},

  // ── Chart ──
  chartStatRow: {
    flexDirection: "row",
    marginTop: 14,
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 12,
  },
  chartStatItem: { flex: 1, alignItems: "center" },
  chartStatVal: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: -0.3 },
  chartStatLabel: { color: C.textSub, marginTop: 2, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},

  tabRow: { flexDirection: "row", gap: 4 },
  tabPill: {
    borderRadius: 999,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabPillActive: { backgroundColor: C.accent, borderColor: C.accent },
  tabText: { fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: C.textSub },
  tabTextActive: { color: "#fff" },

  // ── Two Col ──
  twoCol: { flexDirection: "row" },

  // ── Card ──
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardOverline: {
    color: C.textLight,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  cardTitle: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text, letterSpacing: -0.3 },

  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgePillText: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},

  viewMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  viewMoreText: { color: C.primaryDark, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},

  // ── Goal ──
  goalRingWrap: { alignItems: "center", marginTop: 8 },
  goalRing: {
    borderColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  goalPct: { fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  goalDot: { width: 8, height: 8, borderRadius: 4 },
  goalLabel: { flex: 1, color: C.textSub, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  goalNum: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text },

  // ── Efficiency ──
  effBlock: { alignItems: "center", gap: 4 },
  effIcon: { alignItems: "center", justifyContent: "center" },
  effLabel: { color: C.textSub, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  effVal: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  effDivider: {
    width: "80%",
    alignSelf: "center",
    height: 1,
    backgroundColor: C.border,
    marginVertical: 10,
  },

  // ── Products ──
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  productRank: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.textLight, width: 20 },
  productImg: { resizeMode: "cover" },
  productName: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text },
  productSold: { color: C.textSub, marginTop: 2 },
  productRevenue: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text },
  tagPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagText: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},

  // ── Reviews ──
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  reviewAvatar: { alignItems: "center", justifyContent: "center" },
  reviewInitials: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  reviewName: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text },
  reviewQuote: { color: C.textSub, marginTop: 2 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ratingText: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},

  // ── Delivery ──
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  deliveryRank: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.textLight, width: 14 },
  deliveryAvatar: {
    backgroundColor: C.purpleDim,
    alignItems: "center",
    justifyContent: "center",
  },
  deliveryInitials: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.purple },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  deliveryName: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text },
  deliverySub: { color: C.textSub, marginTop: 2 },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  scoreText: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},

  // ── Notification item ──
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  notifIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  notifTitle: { fontSize: 14, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text },
  notifBody: { fontSize: 12, color: C.textSub, marginTop: 2, lineHeight: 17 },
  notifTime: { fontSize: 11, color: C.textLight, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
    marginTop: 6,
  },

  // ── Sheet / Modal ──
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minHeight: 300,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 999,
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 2,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Empty ──
  empty: { alignItems: "center", paddingVertical: 36, gap: 10 },
  emptyText: { color: C.textLight, fontSize: 13, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},

  // ── No Profile ──
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: C.primaryDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text,
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.textSub,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.primary,
    paddingVertical: 16,
    paddingHorizontal: 34,
    borderRadius: 999,
  },
  ctaBtnText: { color: "#000", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 15 },
  headerRow1: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    marginBottom: 10,
  },
  searchBarFull: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.bg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "100%",
  },
  searchModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: Platform.OS === "ios" ? 56 : 44,
    paddingBottom: 20,
    minHeight: 300,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  searchModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.bg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
  },
  searchCancelBtn: { paddingHorizontal: 4 },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultName: { fontSize: 14, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text },
  searchResultSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  searchResultTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  locModal: {
    position: "absolute",
    top: "30%",
    left: 20,
    right: 20,
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
  },
  locCurrentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.primaryDim,
    borderRadius: 12,
    padding: 12,
  },
});

const bannerStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 42,
    left: 12,
    right: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 9999,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#1F2937",
  },
  sub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  actionBtn: {
    backgroundColor: "#147538",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
});
