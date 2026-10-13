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
import Svg, { Polyline, Circle, G } from "react-native-svg";
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
  bg: "#F7F8FA",
  surface: "#FFFFFF",

  primary: "#16A34A",
  primaryDim: "#16A34A14",
  primaryMid: "#16A34A2A",
  primaryDark: "#15803D",

  accent: "#111827",
  accentMid: "#1F2937",

  text: "#111827",
  textSub: "#6B7280",
  textLight: "#9CA3AF",

  border: "#E5E7EB",

  warn: "#FFFBEB",
  warnBorder: "#F59E0B",
  warnText: "#92400E",

  danger: "#FFF1F2",
  dangerBorder: "#F43F5E",
  dangerText: "#9F1239",

  purple: "#7C3AED",
  purpleDim: "#7C3AED12",

  blue: "#2563EB",
  blueDim: "#2563EB12",

  orange: "#EA580C",
  orangeDim: "#EA580C12",

  // Pastel icon-chip backgrounds (matches reference dashboard design)
  purpleSoft: "#EDE9FE",
  blueSoft: "#DBEAFE",
  orangeSoft: "#FFEDD5",
  greenSoft: "#DCFCE7",
  redSoft: "#FEE2E2",
  heroDark: "#0B3D24",

  // Store performance donut palette
  donutColors: ["#16A34A", "#7C3AED", "#2563EB", "#F59E0B"],
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

// ─── Sparkline (mini trend line for weekly stat cards) ─────────
function Sparkline({ data = [], color = "#2563EB", width = 90, height = 36 }) {
  const vals = data.length >= 2 ? data : [0, 0];
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const stepX = width / (vals.length - 1 || 1);
  const points = vals
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastX = (vals.length - 1) * stepX;
  const lastY =
    height - ((vals[vals.length - 1] - min) / range) * (height - 6) - 3;

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points={`${lastX},${lastY} ${lastX},${lastY}`}
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

class ChartSafeBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  render() {
    if (this.state.crashed) {
      return (
        <View style={{ height: 170, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#94A3B8", fontSize: 12 }}>
            {this.props.t?.("vendor.chartUnavailable") || "Chart unavailable"}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);

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
            completedOrders: s.completed_orders ?? Math.max((s.today_orders ?? 0) - (s.pending_orders ?? 0), 0),
            cancelledOrders: s.cancelled_orders ?? 0,
            lowStockCount: s.low_stock_count ?? 0,
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
              repeatCustomers: s.today_repeat_customers ?? s.repeat_customers ?? 0,
            },
            weekly: {
              totalOrders: s.weekly_orders ?? 0,
              revenue: s.weekly_revenue ?? 0,
              avgPrepTime: s.delivery_efficiency?.avg_prep_time ?? 0,
              deliveryTime: s.delivery_efficiency?.avg_delivery_time ?? 0,
              repeatCustomers: s.weekly_repeat_customers ?? s.repeat_customers ?? 0,
            },
            monthly: {
              totalOrders: s.monthly_orders ?? 0,
              revenue: s.monthly_revenue ?? 0,
              avgPrepTime: s.delivery_efficiency?.avg_prep_time ?? 0,
              deliveryTime: s.delivery_efficiency?.avg_delivery_time ?? 0,
              repeatCustomers: s.monthly_repeat_customers ?? s.repeat_customers ?? 0,
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

        // ── Recent Orders (best-effort; falls back to empty state if the
        // endpoint isn't available on this backend yet) ──────────────────
        try {
          const ordersRes = await fetch(
            `${API_BASE}/vendors/me/orders?limit=5&sort=recent`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const ordersData = await ordersRes.json();
          if (ordersData.success && Array.isArray(ordersData.data)) {
            setRecentOrders(
              ordersData.data.map((o) => ({
                id: o.order_number || `#${o.id}`,
                customer: o.customer_name || o.customer?.name || "Customer",
                items: o.items_count ?? o.items?.length ?? 0,
                amount: o.total ?? o.amount ?? 0,
                status: o.status || "Pending",
              })),
            );
          }
        } catch (e) {
          console.warn("Recent orders fetch failed:", e);
        }

        // ── Low Stock Alert list ──────────────────────────────────────────
        try {
          const lowStockRes = await fetch(
            `${API_BASE}/vendors/me/inventory?lowStock=true&limit=4`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const lowStockData = await lowStockRes.json();
          if (lowStockData.success && Array.isArray(lowStockData.data)) {
            setLowStockItems(
              lowStockData.data.map((item) => ({
                name: item.product?.name || item.name || "Item",
                stockLeft: item.stock_qty ?? 0,
              })),
            );
          }
        } catch (e) {
          console.warn("Low stock fetch failed:", e);
        }

        // ── Store Performance category breakdown (derived from top
        // products' revenue share when categories are available) ─────────
        if (s?.top_products?.length) {
          const totals = {};
          let grand = 0;
          s.top_products.forEach((p) => {
            const cat = p.category?.name || p.category || null;
            const rev = Number(p.revenue || 0);
            if (!cat) return;
            totals[cat] = (totals[cat] || 0) + rev;
            grand += rev;
          });
          if (grand > 0) {
            const breakdown = Object.entries(totals)
              .map(([label, value]) => ({
                label,
                pct: Math.round((value / grand) * 100),
              }))
              .sort((a, b) => b.pct - a.pct);
            setCategoryBreakdown(breakdown);
          }
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

  // ── LineChart guard ──────────────────────────────────────────────────────
  // react-native-chart-kit's LineChart crashes (NaN in its y-axis math) when
  // given all-zero or empty data. This must stay safe no matter how often the
  // dashboard remounts or stats changes (e.g. rapid suspend/reactivate flips):
  // we only draw the chart when there are at least 2 labels, at least 2 values
  // and at least one value strictly > 0. Otherwise we show an empty state.
  const hasChartData = !!(
    stats.labels?.length >= 2 &&
    stats.chartValues?.length >= 2 &&
    stats.chartValues.some((v) => isFinite(Number(v)) && Number(v) > 0)
  );

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

  // Safe navigation helper — some sidebar destinations may not be
  // registered on every navigator, so this avoids a hard crash.
  const goTo = (routeName, params) => {
    try {
      navigation.navigate(routeName, params);
    } catch (e) {
      console.warn(`Route "${routeName}" is not available on this navigator.`);
    }
  };

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
            is_active: item.is_active ?? true,
            stockStatus: (item.is_active ?? true) ? "ok" : "out",
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
              is_active: p.is_active ?? true,
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

      {/* ── MAIN COLUMN ──────────────────────────────────────── */}
      <View style={{ flex: 1, minWidth: 0 }}>

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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: C.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="storefront" size={19} color="#FFFFFF" />
              </View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "900",
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  color: C.text,
                  letterSpacing: -0.4,
                }}
                numberOfLines={1}
              >
                Desi<Text style={{ color: C.primary }}>Dukaan</Text>
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
                paddingVertical: 11,
              }}
              activeOpacity={0.7}
              onPress={() => setSearchVisible(true)}
            >
              <MaterialIcons name="search" size={18} color={C.textLight} />
              <Text
                style={{ fontSize: 14, color: C.textLight, flex: 1 }}
                numberOfLines={1}
              >
                Search inventory, partners, earnings…
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: C.textLight }}>
                
                </Text>
              </View>
            </TouchableOpacity>

            {/* Bell */}
            <TouchableOpacity
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: C.surface,
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
                <View style={[styles.notifBadge, { backgroundColor: C.primary, top: -2, right: -2 }]}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Avatar pill */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 4,
                paddingVertical: 4,
              }}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.8}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: C.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff" }}>
                  {vendorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text
                  style={{ fontSize: 14, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text, maxWidth: 90 }}
                  numberOfLines={1}
                >
                  {vendorName.split(" ")[0]}
                </Text>
                <Text style={{ fontSize: 11, color: C.textSub, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" }}>
                  Admin
                </Text>
              </View>
              <MaterialIcons name="keyboard-arrow-down" size={18} color={C.textSub} />
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
              {/* Logo */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    width: rs(32, 36, 38),
                    height: rs(32, 36, 38),
                    borderRadius: rs(9, 10, 10),
                    backgroundColor: C.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="storefront" size={rs(16, 18, 19)} color="#FFFFFF" />
                </View>
                <Text
                  style={{
                    fontSize: rs(15, 16, 17),
                    fontWeight: "900",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: C.text,
                    letterSpacing: -0.4,
                  }}
                  numberOfLines={1}
                >
                  Desi<Text style={{ color: C.primary }}>Dukaan</Text>
                </Text>
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
                    <View style={[styles.notifBadge, { backgroundColor: C.primary, top: -2, right: -2 }]}>
                      <Text style={styles.notifBadgeText}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Avatar pill */}
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: rs(6, 7, 8),
                  }}
                  onPress={() => navigation.navigate("Profile")}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      width: rs(32, 34, 36),
                      height: rs(32, 34, 36),
                      borderRadius: rs(16, 17, 18),
                      backgroundColor: C.accent,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: rs(11, 12, 12),
                        fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff",
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
                  <View>
                    <Text
                      style={{
                        fontSize: rs(12, 13, 13),
                        fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text,
                        maxWidth: rs(48, 60, 70),
                      }}
                      numberOfLines={1}
                    >
                      {vendorName.split(" ")[0]}
                    </Text>
                    <Text style={{ fontSize: rs(9, 10, 10), color: C.textSub, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" }}>
                      Admin
                    </Text>
                  </View>
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: C.textLight }}>
                  Ctrl + K
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130, paddingTop: 4 }}
      >
        {/* ── GREETING TEXT + DATE ────────────────────────────── */}
        <Animated.View
          style={{
            opacity: greetFadeAnim,
            transform: [{ translateY: greetSlideAnim }],
            marginHorizontal: rs(20, 24, 28),
            marginTop: rs(20, 22, 24),
            flexDirection: SCREEN_W >= 640 ? "row" : "column",
            justifyContent: "space-between",
            alignItems: SCREEN_W >= 640 ? "center" : "flex-start",
            gap: 10,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: rs(19, 21, 23),
                fontWeight: "800",
                fontFamily: "PlusJakartaSans_800ExtraBold",
                color: C.text,
                letterSpacing: -0.4,
              }}
            >
              {greeting.text}, {vendorName.split(" ")[0]} 👋
            </Text>
            <Text
              style={{
                fontSize: rs(12, 13, 13),
                color: C.textSub,
                fontWeight: "500",
                fontFamily: "PlusJakartaSans_500Medium",
                marginTop: 3,
              }}
            >
              Here's what's happening with your business today.
            </Text>
          </View>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              alignSelf: SCREEN_W >= 640 ? "auto" : "flex-start",
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 1,
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="calendar-today" size={15} color={C.primary} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                fontFamily: "PlusJakartaSans_700Bold",
                color: C.text,
              }}
            >
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color={C.textSub} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── HERO CARD (dark green) ──────────────────────────── */}
        <Animated.View
          style={{
            transform: [{ scale: heroScaleAnim }],
            marginHorizontal: rs(20, 24, 28),
            marginTop: rs(14, 16, 18),
          }}
        >
          <View
            style={[
              styles.greetingCard,
              {
                paddingHorizontal: rs(22, 26, 30),
                paddingTop: rs(22, 24, 26),
                paddingBottom: rs(118, 124, 130),
              },
            ]}
          >
            {/* Decorative blobs */}
            <View style={[styles.greetingBlobTop, { backgroundColor: "rgba(255,255,255,0.06)" }]} />
            <View style={[styles.greetingBlobBot, { backgroundColor: "rgba(255,255,255,0.04)" }]} />

            {/* Decorative illustration icon, top-right */}
            <MaterialIcons
              name="inventory-2"
              size={rs(78, 88, 98)}
              color="rgba(255,255,255,0.10)"
              style={{ position: "absolute", top: rs(14, 16, 18), right: rs(14, 18, 22) }}
            />
            <MaterialIcons
              name="eco"
              size={rs(20, 22, 24)}
              color="rgba(255,255,255,0.18)"
              style={{ position: "absolute", top: rs(70, 76, 84), right: rs(78, 92, 108) }}
            />

            <View style={{ flexDirection: "row", alignItems: "center", gap: rs(12, 14, 16) }}>
              <View
                style={{
                  width: rs(52, 56, 60),
                  height: rs(52, 56, 60),
                  borderRadius: rs(16, 17, 18),
                  backgroundColor: "rgba(255,255,255,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.16)",
                }}
              >
                <MaterialIcons name={greeting.icon} size={rs(24, 26, 28)} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: rs(16, 18, 19),
                    fontWeight: "800",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: "#FFFFFF",
                  }}
                >
                  Keep growing, stay winning! 🚀
                </Text>
                <Text
                  style={{
                    fontSize: rs(12, 12.5, 13),
                    color: "rgba(255,255,255,0.72)",
                    fontWeight: "500",
                    fontFamily: "PlusJakartaSans_500Medium",
                    marginTop: 4,
                    maxWidth: "88%",
                  }}
                >
                  Track, manage and grow your business all in one place.
                </Text>
              </View>
            </View>

            {/* White stat strip, overlapping bottom of the hero card */}
            <View
              style={{
                position: "absolute",
                left: 22,
                right: 22,
                bottom: 18,
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                padding: rs(14, 16, 18),
                flexDirection: SCREEN_W >= 640 ? "row" : "column",
                gap: rs(14, 0, 0),
              }}
            >
              {[
                {
                  icon: "shopping-bag",
                  iconColor: C.primary,
                  iconBg: C.greenSoft,
                  value: stats.today.totalOrders,
                  label: "Today's Orders",
                },
                
                
                
              ].map((item, idx) => (
                <React.Fragment key={item.label}>
                  {idx > 0 && SCREEN_W >= 640 && (
                    <View style={{ width: 1, backgroundColor: C.border }} />
                  )}
                  <TouchableOpacity
                    activeOpacity={item.isLink ? 0.7 : 1}
                    disabled={!item.isLink}
                    onPress={() => goTo("Inventory")}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
                  >
                    <View
                      style={{
                        width: rs(38, 40, 42),
                        height: rs(38, 40, 42),
                        borderRadius: 12,
                        backgroundColor: item.iconBg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons name={item.icon} size={rs(18, 19, 20)} color={item.iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: rs(17, 18, 19),
                          fontWeight: "800",
                          fontFamily: "PlusJakartaSans_800ExtraBold",
                          color: C.text,
                        }}
                        numberOfLines={1}
                      >
                        {item.value}
                      </Text>
                      <Text
                        style={{
                          fontSize: rs(11, 11.5, 12),
                          color: C.text,
                          fontWeight: "600",
                          fontFamily: "PlusJakartaSans_600SemiBold",
                          marginTop: 1,
                        }}
                      >
                        {item.label}
                      </Text>
                      {item.isLink ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 1 }}>
                          <Text
                            style={{
                              fontSize: rs(10, 10.5, 11),
                              color: C.primary,
                              fontWeight: "700",
                              fontFamily: "PlusJakartaSans_700Bold",
                            }}
                          >
                            View Inventory
                          </Text>
                          <MaterialIcons name="arrow-forward" size={11} color={C.primary} />
                        </View>
                      ) : (
                        <Text
                          style={{
                            fontSize: rs(10, 10.5, 11),
                            color: C.textSub,
                            fontWeight: "500",
                            fontFamily: "PlusJakartaSans_500Medium",
                            marginTop: 1,
                          }}
                        >
                          — 0% vs yesterday
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── OVERVIEW · ORDERS · TOP SELLING PRODUCTS ────────── */}
        <View
          style={{
            marginHorizontal: rs(20, 24, 28),
            marginTop: rs(18, 20, 22),
            flexDirection: SCREEN_W >= 900 ? "row" : "column",
            alignItems: "flex-start",
            gap: rs(14, 16, 16),
          }}
        >
          {/* ── Overview card ── */}
          <View
            style={[
              styles.card,
              { flex: SCREEN_W >= 900 ? 1.7 : undefined, width: SCREEN_W >= 900 ? undefined : "100%" },
            ]}
          >
            <View style={[styles.cardHeader, { flexWrap: "wrap", gap: 8 }]}>
              <Text style={[styles.cardTitle, { fontSize: rs(15, 16, 17) }]}>
                Overview
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
                onPress={() => setCurrIndex((currIndex + 1) % STAT_TABS.length)}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text }}>
                  {currIndex === 0 ? "Today" : currIndex === 1 ? "This Week" : "This Month"}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={16} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 12,
                color: C.textSub,
                fontWeight: "600",
                fontFamily: "PlusJakartaSans_600SemiBold",
                marginTop: 10,
              }}
            >
              Total Revenue
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 }}>
              <Text
                style={{
                  fontSize: rs(30, 33, 36),
                  fontWeight: "900",
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  color: C.text,
                  letterSpacing: -1,
                }}
              >
                ₹{Number(currStats.revenue).toLocaleString("en-IN")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  backgroundColor: C.primaryDim,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <MaterialIcons name="trending-up" size={13} color={C.primary} />
                <Text style={{ fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.primary }}>
                  vs last {currIndex === 0 ? "yesterday" : currIndex === 1 ? "week" : "month"}
                </Text>
              </View>
            </View>

            {hasChartData ? (
              <LineChart
                data={{
                  labels: stats.labels,
                  datasets: [
                    { data: stats.chartValues.map((v) => (isFinite(Number(v)) ? Number(v) : 0)) },
                  ],
                }}
                width={chartW}
                height={rs(140, 160, 175)}
                yAxisSuffix="₹"
                chartConfig={{
                  backgroundGradientFrom: C.surface,
                  backgroundGradientTo: C.surface,
                  fillShadowGradientFrom: C.primary,
                  fillShadowGradientFromOpacity: 0.22,
                  fillShadowGradientTo: C.surface,
                  fillShadowGradientToOpacity: 0.02,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
                  labelColor: () => C.textLight,
                  propsForDots: {
                    r: "4",
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
                withInnerLines={false}
                style={{ borderRadius: 12, marginTop: 12, marginLeft: -8 }}
              />
            ) : (
              <View style={{ height: rs(140, 160, 175), justifyContent: "center", alignItems: "center", marginTop: 10 }}>
                <MaterialIcons name="show-chart" size={22} color={C.textLight} />
                <Text style={{ color: C.textLight, fontSize: rs(11, 12, 12), marginTop: 8 }}>
                  {t('vendor.noChartData') || 'No sales data yet'}
                </Text>
              </View>
            )}

            {/* Total Orders / Avg Delivery Time / Repeat Customers mini boxes */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              {[
                {
                  key: "orders",
                  icon: "shopping-cart",
                  iconColor: C.primary,
                  iconBg: C.greenSoft,
                  label: "Total Orders",
                  value: String(currStats.totalOrders),
                },
                {
                  key: "delivery",
                  icon: "electric-moped",
                  iconColor: C.purple,
                  iconBg: C.purpleSoft,
                  label: "Avg. Delivery Time",
                  value: `${currStats.deliveryTime}m`,
                },
                {
                  key: "repeat",
                  icon: "person",
                  iconColor: C.blue,
                  iconBg: C.blueSoft,
                  label: "Repeat Customers",
                  value: String(currStats.repeatCustomers ?? 0),
                },
              ].map((box) => (
                <View key={box.key} style={{ flex: 1, alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      backgroundColor: box.iconBg,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 6,
                    }}
                  >
                    <MaterialIcons name={box.icon} size={15} color={box.iconColor} />
                  </View>
                  <Text style={{ fontSize: rs(15, 16, 17), fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text }}>
                    {box.value}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: C.textSub, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 1 }} numberOfLines={1}>
                    {box.label}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 }}>
                    <MaterialIcons name="arrow-upward" size={10} color={C.primary} />
                    <Text style={{ fontSize: 9.5, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.primary }} numberOfLines={1}>
                      vs last month
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ── Orders breakdown card ── */}
          <View
            style={[
              styles.card,
              { flex: SCREEN_W >= 900 ? 1 : undefined, width: SCREEN_W >= 900 ? undefined : "100%", padding: 18 },
            ]}
          >
            <View style={[styles.cardHeader, { marginBottom: 4 }]}>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 15) }]}>Orders</Text>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
                onPress={() => goTo("Orders")}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.primary }}>
                  View All
                </Text>
                <MaterialIcons name="arrow-forward" size={13} color={C.primary} />
              </TouchableOpacity>
            </View>

            {[
              { icon: "shopping-cart", color: C.primary, bg: C.greenSoft, label: "Total Orders", value: stats.today.totalOrders },
              { icon: "schedule", color: C.orange, bg: C.orangeSoft, label: "Pending", value: stats.pendingOrders },
              { icon: "check-circle", color: C.primary, bg: C.greenSoft, label: "Completed", value: stats.completedOrders },
              { icon: "cancel", color: "#EF4444", bg: C.redSoft, label: "Cancelled", value: stats.cancelledOrders },
            ].map((row, i) => (
              <View
                key={row.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 11,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: C.border,
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    backgroundColor: row.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name={row.icon} size={15} color={row.color} />
                </View>
                <Text
                  style={{ flex: 1, fontSize: 13, color: C.textSub, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" }}
                  numberOfLines={1}
                >
                  {row.label}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text }}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Top Selling Products card ── */}
          <View
            style={[
              styles.card,
              { flex: SCREEN_W >= 900 ? 1.15 : undefined, width: SCREEN_W >= 900 ? undefined : "100%", padding: 18 },
            ]}
          >
            <View style={[styles.cardHeader, { marginBottom: 4 }]}>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 15) }]}>Top Selling Products</Text>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
                onPress={() => goTo("Reports")}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.primary }}>
                  View All
                </Text>
                <MaterialIcons name="arrow-forward" size={13} color={C.primary} />
              </TouchableOpacity>
            </View>

            {stats.topProducts?.length ? (
              stats.topProducts.slice(0, 4).map((p, i) => {
                const chipColors = [C.redSoft, C.orangeSoft, C.greenSoft, C.blueSoft];
                const chipIconColors = ["#EF4444", C.orange, C.primary, C.blue];
                const sold = p.sold ?? p.units_sold ?? p.quantity_sold ?? 0;
                return (
                  <View
                    key={p.id || p.name || i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 10,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: C.border,
                    }}
                  >
                    {p.image ? (
                      <Image source={{ uri: p.image }} style={{ width: 34, height: 34, borderRadius: 9 }} />
                    ) : (
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 9,
                          backgroundColor: chipColors[i % chipColors.length],
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialIcons name="shopping-bag" size={16} color={chipIconColors[i % chipIconColors.length]} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text }} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                        {sold} Orders
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <MaterialIcons name="shopping-bag" size={26} color={C.border} />
                <Text style={{ color: C.textLight, fontSize: 12, marginTop: 8 }}>No sales yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── RECENT ORDERS · LOW STOCK ALERT · STORE PERFORMANCE ── */}
        <View
          style={{
            marginHorizontal: rs(20, 24, 28),
            marginTop: rs(14, 16, 16),
            flexDirection: SCREEN_W >= 900 ? "row" : "column",
            alignItems: "flex-start",
            gap: rs(14, 16, 16),
          }}
        >
          {/* ── Recent Orders card ── */}
          <View
            style={[
              styles.card,
              { flex: SCREEN_W >= 900 ? 1.7 : undefined, width: SCREEN_W >= 900 ? undefined : "100%", padding: 18 },
            ]}
          >
            <View style={[styles.cardHeader, { marginBottom: 6 }]}>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 15) }]}>Recent Orders</Text>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
                onPress={() => goTo("Orders")}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.primary }}>
                  View All
                </Text>
                <MaterialIcons name="arrow-forward" size={13} color={C.primary} />
              </TouchableOpacity>
            </View>

            {recentOrders.length ? (
              <>
                {/* Table header — desktop only */}
                {SCREEN_W >= 640 && (
                  <View style={{ flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <Text style={[styles.tableHeadCell, { flex: 1.1 }]}>Order ID</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.3 }]}>Customer</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.7, textAlign: "center" }]}>Items</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.9, textAlign: "right" }]}>Amount</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1, textAlign: "right" }]}>Status</Text>
                  </View>
                )}
                {recentOrders.slice(0, 4).map((o, i) => {
                  const st = String(o.status || "").toLowerCase();
                  const statusColor = st === "completed" || st === "delivered"
                    ? C.primaryDark
                    : st === "pending" || st === "preparing"
                      ? "#B45309"
                      : "#B91C1C";
                  const statusBg = st === "completed" || st === "delivered"
                    ? C.primaryDim
                    : st === "pending" || st === "preparing"
                      ? "#FEF3C7"
                      : C.redSoft;
                  return (
                    <View
                      key={o.id || i}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        borderTopWidth: SCREEN_W >= 640 || i > 0 ? 1 : 0,
                        borderTopColor: C.border,
                        flexWrap: SCREEN_W >= 640 ? "nowrap" : "wrap",
                      }}
                    >
                      <Text style={{ flex: 1.1, fontSize: 12.5, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text }} numberOfLines={1}>
                        {o.id}
                      </Text>
                      <Text style={{ flex: 1.3, fontSize: 12.5, color: C.textSub }} numberOfLines={1}>
                        {o.customer}
                      </Text>
                      <Text style={{ flex: 0.7, fontSize: 12.5, color: C.textSub, textAlign: "center" }}>
                        {o.items}
                      </Text>
                      <Text style={{ flex: 0.9, fontSize: 12.5, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text, textAlign: "right" }}>
                        ₹{Number(o.amount).toLocaleString("en-IN")}
                      </Text>
                      <View style={{ flex: 1, alignItems: "flex-end" }}>
                        <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: statusBg }}>
                          <Text style={{ fontSize: 10.5, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: statusColor }}>
                            {o.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <MaterialIcons name="receipt-long" size={26} color={C.border} />
                <Text style={{ color: C.textLight, fontSize: 12, marginTop: 8 }}>No recent orders yet</Text>
              </View>
            )}
          </View>

          {/* ── Low Stock Alert card ── */}
          <View
            style={[
              styles.card,
              { flex: SCREEN_W >= 900 ? 1 : undefined, width: SCREEN_W >= 900 ? undefined : "100%", padding: 18 },
            ]}
          >
            <View style={[styles.cardHeader, { marginBottom: 4 }]}>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 15) }]}>Low Stock Alert</Text>
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
                onPress={() => goTo("Inventory")}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.primary }}>
                  View All
                </Text>
                <MaterialIcons name="arrow-forward" size={13} color={C.primary} />
              </TouchableOpacity>
            </View>

            {lowStockItems.length ? (
              lowStockItems.slice(0, 4).map((item, i) => {
                const chipColors = [C.redSoft, C.orangeSoft, C.greenSoft, C.blueSoft];
                const chipIconColors = ["#EF4444", C.orange, C.primary, C.blue];
                return (
                  <View
                    key={item.name + i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 10,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: C.border,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        backgroundColor: chipColors[i % chipColors.length],
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons name="inventory-2" size={16} color={chipIconColors[i % chipIconColors.length]} />
                    </View>
                    <Text style={{ flex: 1, fontSize: 12.5, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 11.5, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.orange }}>
                      {item.stockLeft} left
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <MaterialIcons name="check-circle-outline" size={26} color={C.border} />
                <Text style={{ color: C.textLight, fontSize: 12, marginTop: 8 }}>All stocked up</Text>
              </View>
            )}
          </View>

          {/* ── Store Performance donut card ── */}
          <View
            style={[
              styles.card,
              { flex: SCREEN_W >= 900 ? 1.1 : undefined, width: SCREEN_W >= 900 ? undefined : "100%", padding: 18 },
            ]}
          >
            <View style={[styles.cardHeader, { marginBottom: 6, flexWrap: "wrap", gap: 6 }]}>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 15) }]}>Store Performance</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  backgroundColor: C.bg,
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text }}>
                  This Month
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={14} color={C.textSub} />
              </View>
            </View>

            {categoryBreakdown.length ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 6 }}>
                {/* Donut */}
                <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
                  <Svg width={96} height={96} viewBox="0 0 96 96">
                    <G rotation={-90} origin="48, 48">
                      {(() => {
                        const r = 38;
                        const circumference = 2 * Math.PI * r;
                        let cumulative = 0;
                        return categoryBreakdown.map((c, i) => {
                          const dash = (c.pct / 100) * circumference;
                          const seg = (
                            <Circle
                              key={c.label}
                              cx={48}
                              cy={48}
                              r={r}
                              stroke={C.donutColors[i % C.donutColors.length]}
                              strokeWidth={13}
                              fill="none"
                              strokeDasharray={`${dash} ${circumference - dash}`}
                              strokeDashoffset={-((cumulative / 100) * circumference)}
                              strokeLinecap="butt"
                            />
                          );
                          cumulative += c.pct;
                          return seg;
                        });
                      })()}
                    </G>
                  </Svg>
                  <View style={{ position: "absolute", alignItems: "center" }}>
                    <Text style={{ fontSize: 13, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text }}>
                      ₹{Number(stats.today.revenue).toLocaleString("en-IN")}
                    </Text>
                    <Text style={{ fontSize: 9, color: C.textSub, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" }}>
                      Total Revenue
                    </Text>
                  </View>
                </View>

                {/* Legend */}
                <View style={{ flex: 1, gap: 8 }}>
                  {categoryBreakdown.slice(0, 4).map((c, i) => (
                    <View key={c.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.donutColors[i % C.donutColors.length] }} />
                      <Text style={{ flex: 1, fontSize: 11.5, color: C.textSub, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" }} numberOfLines={1}>
                        {c.label}
                      </Text>
                      <Text style={{ fontSize: 11.5, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text }}>
                        {c.pct}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <MaterialIcons name="pie-chart-outline" size={26} color={C.border} />
                <Text style={{ color: C.textLight, fontSize: 12, marginTop: 8, textAlign: "center" }}>
                  No category data yet
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── PRO TIP BANNER ───────────────────────────────────── */}
        <View
          style={[
            styles.proTip,
            { marginHorizontal: rs(20, 24, 28), marginTop: rs(16, 18, 18) },
          ]}
        >
          <View style={styles.proTipIcon}>
            <MaterialIcons name="star" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={styles.proTipTitle}>Pro Tip</Text>
            <Text style={styles.proTipText}>
              Complete your store profile to build trust and get more orders.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.proTipButton}
            onPress={() => navigation.navigate("VendorOnboarding")}
          >
            <Text style={styles.proTipButtonText}>Complete Profile</Text>
            <MaterialIcons name="arrow-forward" size={16} color={C.primaryDark} />
          </TouchableOpacity>
        </View>

      </ScrollView>



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
                      rightTop: (item.is_active ?? true) ? "Available" : "Unavailable",
                      rightTopColor: (item.is_active ?? true) ? C.green : C.red,
                      rightBottom: "",
                      rightBottomBg: "transparent",
                      rightBottomColor: "transparent",
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
                      rightBottom: (item.is_active ?? true) ? "Available" : "Unavailable",
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
      {/* ── end MAIN COLUMN ─────────────────────────────────── */}
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

  // ── Pro Tip banner ──
  proTip: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 18,
    padding: 16,
  },
  proTipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  proTipTitle: {
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: C.primaryDark,
  },
  proTipText: {
    fontSize: 12.5,
    color: "#166534",
    fontWeight: "500",
    fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 2,
    lineHeight: 18,
  },
  proTipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  proTipButtonText: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: C.primaryDark,
  },
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
  marginHorizontal: 20,
  marginTop: 16,
  paddingHorizontal: 18,
  paddingVertical: 16,
  borderRadius: 16,
  borderLeftWidth: 4,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 2,
},
  bannerTitle: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 13, marginBottom: 4 },
  bannerMsg: { fontSize: 12, lineHeight: 18 },
  bannerDoc: { fontSize: 12, marginTop: 2 },

  // ── Greeting ──
 greetingCard: {
  position: "relative",
  backgroundColor: "#0F3D24",
  borderRadius: 24,
  borderWidth: 1,
  borderColor: "#164E35",

  paddingHorizontal: 24,
  paddingTop: 24,
  paddingBottom: 120,
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
  backgroundColor: "#FFFFFF",
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
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
  color: "#6B7280",
  fontWeight: "700",
  fontFamily: "PlusJakartaSans_700Bold",
  letterSpacing: 0.8,
},

heroValue: {
  fontWeight: "900",
  fontFamily: "PlusJakartaSans_800ExtraBold",
  color: "#111827",
  letterSpacing: -1,
},

heroChangeBadge: {
  flexDirection: "row",
  alignItems: "center",
  gap: 3,
  backgroundColor: C.primaryDim,
  paddingHorizontal: 7,
  paddingVertical: 3,
  borderRadius: 999,
},

heroChangeTxt: {
  color: C.primary,
  fontWeight: "700",
  fontFamily: "PlusJakartaSans_700Bold",
},

heroSubTxt: {
  color: "#6B7280",
  fontWeight: "500",
  fontFamily: "PlusJakartaSans_500Medium",
},

heroDivider: {
  height: 1,
  backgroundColor: "#E5E7EB",
  marginVertical: 7,
},

heroSmallLabel: {
  color: "#6B7280",
  fontWeight: "600",
  fontFamily: "PlusJakartaSans_600SemiBold",
  marginBottom: 2,
},

heroSmallVal: {
  color: "#111827",
  fontWeight: "700",
  fontFamily: "PlusJakartaSans_700Bold",
},

miniCard: {
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "#EEF2F1",
  borderRadius: 18,

  minHeight: 100,

  padding: 18,

  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 12,

  elevation: 2,
},

miniIcon: {
  alignItems: "center",
  justifyContent: "center",
},

miniLabel: {
  color: C.textSub,
  fontWeight: "500",
  fontFamily: "PlusJakartaSans_500Medium",
  marginBottom: 1,
},

miniValue: {
  fontWeight: "800",
  fontFamily: "PlusJakartaSans_800ExtraBold",
},
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

  tableHeadCell: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: C.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

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
