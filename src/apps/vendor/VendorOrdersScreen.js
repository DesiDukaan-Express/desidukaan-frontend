import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
  TextInput,
  Dimensions,
  Alert,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { Linking } from "react-native";

import VendorMapView from "../../components/VendorMapView";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { io } from "socket.io-client";
import useOrderSound from "../../hooks/useOrderSound";
import { useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");

import useAuthStore from "../../store/authStore";
import { deliveryAPI, slotsAPI } from "../../services/api";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3000";

export default function VendorOrdersScreen() {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const { playOrderSound } = useOrderSound();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [isDeliveryModalVisible, setIsDeliveryModalVisible] = useState(false);

  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [liveRiderLocations, setLiveRiderLocations] = useState({});
  const [nearbyRiders, setNearbyRiders] = useState([]);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState(null); // { count, message }
  const [declinedOrders, setDeclinedOrders] = useState({}); // { [order_id]: { partnerName, partnerPhone, declinedAt, message } }

  const route = useRoute?.() || {};
  const [activeTab, setActiveTab] = useState(
    route.params?.initialTab || "orders",
  );
  const [requests, setRequests] = useState({ phones: [], slots: [] });
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [acceptedModalVisible, setAcceptedModalVisible] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState({});

  // Vendor review delivery partner
  const [vendorReviewOrder, setVendorReviewOrder] = useState(null);
  const [viewVendorRatingOrder, setViewVendorRatingOrder] = useState(null);
  const [viewVendorRatingLoading, setViewVendorRatingLoading] = useState(false);
  const [fetchedVendorRating, setFetchedVendorRating] = useState(null);
  const [vendorReviewRating, setVendorReviewRating] = useState(0);
  const [vendorReviewComment, setVendorReviewComment] = useState("");
  const [vendorReviewLoading, setVendorReviewLoading] = useState(false);

  const handleOpenViewVendorRating = async (order) => {
    setViewVendorRatingOrder(order);
    setViewVendorRatingLoading(true);
    const initialRating = order.vendor_rating || (order.reviews?.[0]?.vendor_review_rating) || 5;
    const initialComment = order.vendor_review_comment || (order.reviews?.[0]?.vendor_review_comment) || (order.reviews?.[0]?.comment) || "";
    setFetchedVendorRating({ rating: initialRating, comment: initialComment });

    try {
      const res = await fetch(`${API_BASE}/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const o = data.data?.order || data.order;
      if (o) {
        setFetchedVendorRating({
          rating: o.vendor_rating ?? o.reviews?.[0]?.vendor_review_rating ?? initialRating,
          comment: o.vendor_review_comment ?? o.reviews?.[0]?.vendor_review_comment ?? o.reviews?.[0]?.comment ?? initialComment,
        });
      }
    } catch (e) {
      console.error("Fetch vendor rating error:", e);
    } finally {
      setViewVendorRatingLoading(false);
    }
  };

  const ordersRef = useRef(orders);
  const selectedOrderRef = useRef(selectedOrder);
  const updateOrderStatusRef = useRef(null);

  const toggleCustomer = (name) => {
    setExpandedCustomers((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // ── Toast notification ──────────────────────────────────────────────────────
  const [vendorToast, setVendorToast] = useState({
    visible: false,
    message: "",
    type: "info",
  });
  const vendorToastTimer = React.useRef(null);
  const showVendorToast = (message, type = "info") => {
    if (vendorToastTimer.current) clearTimeout(vendorToastTimer.current);
    setVendorToast({ visible: true, message, type });
    vendorToastTimer.current = setTimeout(
      () => setVendorToast((t) => ({ ...t, visible: false })),
      4000,
    );
  };

  // Fetch nearby riders + check for decline notifications when modal opens
  useEffect(() => {
    if (isDeliveryModalVisible && storeLocation) {
      fetchNearbyRiders();
      setBroadcastStatus(null);
      setAssignedPartnerIds(new Set());

      // Check DB for a recent decline on this order
      if (selectedOrder?.id) {
        fetch(`${API_BASE}/delivery/vendor-notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.json())
          .then(data => {
            if (data.success && data.data?.notifications?.length) {
              const decline = data.data.notifications.find(
                n => n.type === "delivery_declined" && Number(n.order_id) === Number(selectedOrder.id)
              );
              if (decline) {
                const declinedAt = new Date(decline.created_at).toLocaleTimeString([], {
                  hour: "2-digit", minute: "2-digit",
                });
                setDeclinedOrders(prev => ({
                  ...prev,
                  [String(decline.order_id)]: {
                    partnerName: decline.body?.split(" declined")[0]?.trim() || "A delivery partner",
                    partnerPhone: null,
                    declinedAt,
                    message: decline.body || decline.title || "Delivery request declined",
                  },
                }));
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [isDeliveryModalVisible]);

  const fetchNearbyRiders = async () => {
    try {
      const result = await deliveryAPI.getNearbyRiders(
        storeLocation.latitude,
        storeLocation.longitude,
        10,
        token
      );
      if (result.success) {
        setNearbyRiders(result.data.riders || []);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const storeLocation = {
    latitude: selectedOrder?.vendor?.latitude || 28.6139,
    longitude: selectedOrder?.vendor?.longitude || 77.209,
  };

  // Dynamic riders list derived from backend + sockets instead of mocks
  const riders = selectedOrder?.delivery?.partner
    ? [
        {
          id: selectedOrder.delivery.partner.id,
          name: selectedOrder.delivery.partner.user?.name || "Partner",
          status:
            selectedOrder.delivery.status === "assigned"
              ? "On the way to pickup"
              : "Out for delivery",
          image: "https://cdn-icons-png.flaticon.com/512/3208/3208726.png",
          coordinate: liveRiderLocations[selectedOrder.delivery.id] || {
            latitude: selectedOrder.delivery.partner.current_lat || 28.6149,
            longitude: selectedOrder.delivery.partner.current_lng || 77.21,
          },
          distance: "Live",
          fastest: true,
        },
      ]
    : nearbyRiders.map((r, i) => ({
        id: r.id,
        name: r.name || "Partner",
        status: r.is_busy ? `On Delivery (${r.active_deliveries})` : "Available",
        is_busy: r.is_busy,
        active_deliveries: r.active_deliveries || 0,
        image: "https://cdn-icons-png.flaticon.com/512/3208/3208726.png",
        coordinate: {
          latitude: r.latitude,
          longitude: r.longitude,
        },
        distance: `${r.distance_km} km`,
        fastest: i === 0,
      }));

  const [assignedPartnerIds, setAssignedPartnerIds] = useState(new Set());

  const handleAssignRider = async (partnerId) => {
    try {
      const res = await fetch(
        `${API_BASE}/delivery/assign/${selectedOrder.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ partnerId }),
        },
      );
      const result = await res.json();
      if (result.success) {
        setAssignedPartnerIds(prev => new Set([...prev, partnerId]));
        Alert.alert("Success", result.message || "Request sent to rider. They will see it in their Queue tab.");
        // Don't close modal — vendor may want to assign to more riders
      } else {
        Alert.alert("Error", result.message || "Failed to send request");
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Something went wrong while assigning");
    }
  };

  const handleAutoAssign = async () => {
    if (!selectedOrder) return;
    setAutoAssigning(true);
    setBroadcastStatus(null);
    try {
      const res = await fetch(
        `${API_BASE}/delivery/auto-assign/${selectedOrder.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ radius_km: 10 }),
        },
      );
      const result = await res.json();
      if (result.success) {
        setBroadcastStatus({
          count: result.data.broadcastCount,
          message: `Sent to ${result.data.broadcastCount} nearby rider${result.data.broadcastCount !== 1 ? "s" : ""}. Waiting for acceptance...`,
        });
      } else {
        Alert.alert(
          "Auto Assign Failed",
          result.message || "No available riders found nearby",
        );
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Could not broadcast to riders");
    } finally {
      setAutoAssigning(false);
    }
  };

  const [counterItems, setCounterItems] = useState([]);
  const [counterDeliveryFee, setCounterDeliveryFee] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [counterSlotInput, setCounterSlotInput] = useState(""); // Keeping as fallback or for display
  const [counterSlotDay, setCounterSlotDay] = useState("today"); // today | tomorrow
  const [counterSlotStart, setCounterSlotStart] = useState("");
  const [counterSlotEnd, setCounterSlotEnd] = useState("");

  const getItemQty = (item) => {
    if (!item) return 1;
    if (item.quantity && Number(item.quantity) > 0) return Number(item.quantity);
    if (item.qty && Number(item.qty) > 0) return Number(item.qty);
    if (item.new_quantity && Number(item.new_quantity) > 0) return Number(item.new_quantity);
    const price = parseFloat(item.product_price || 0);
    const subtotal = parseFloat(item.subtotal || 0);
    if (price > 0 && subtotal > 0) return Math.round(subtotal / price);
    return 1;
  };

  // Helper to parse simple slot strings
  const parseSlotLocally = (input) => {
    if (!input?.trim()) return null;
    const txt = input.trim().toLowerCase();
    const now = new Date();
    const baseDate = new Date(now);
    let explicitTomorrow = txt.includes("tomorrow");
    if (explicitTomorrow) baseDate.setDate(baseDate.getDate() + 1);

    const timeRe = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g;
    const times = [];
    let m;
    while ((m = timeRe.exec(txt)) !== null) {
      let h = parseInt(m[1]);
      const min = parseInt(m[2] || "0");
      const ap = m[3];
      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      times.push({ h, min });
    }
    if (times.length < 2) return null;
    const [s, e] = times;

    let start = new Date(baseDate);
    start.setHours(s.h, s.min, 0, 0);

    let end = new Date(baseDate);
    end.setHours(e.h, e.min, 0, 0);

    // If both times are in the past for today and not explicitly tomorrow, assume tomorrow
    if (!explicitTomorrow && start <= now) {
      start.setDate(start.getDate() + 1);
      end.setDate(end.getDate() + 1);
    }

    if (end <= start) return null;
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const constructSlotISO = (day, start, end) => {
    if (!start || !end) return null;
    try {
      const now = new Date();
      const base = new Date();
      if (day === "tomorrow") base.setDate(base.getDate() + 1);

      const [sH, sM] = start.split(":").map(Number);
      const [eH, eM] = end.split(":").map(Number);

      if (isNaN(sH) || isNaN(eH)) return null;

      const startDate = new Date(base);
      startDate.setHours(sH, sM || 0, 0, 0);

      const endDate = new Date(base);
      endDate.setHours(eH, eM || 0, 0, 0);

      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }

      return { start: startDate.toISOString(), end: endDate.toISOString() };
    } catch (e) {
      console.error("constructSlotISO error:", e);
      return null;
    }
  };

  // Always-current refs so socket handlers (which close over stale state)
  // can call the latest functions without going stale.
  const fetchOrdersRef = useRef(null);
  const fetchHistoryRef = useRef(null);
  const fetchRequestsRef = useRef(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/vendor/active?_t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      const result = await res.json();
      console.log('[fetchOrders] result.success:', result.success, '| orders count:', result.data?.orders?.length);

      if (result.success) {
        const fetchedOrders = result.data.orders || [];
        setOrders(fetchedOrders);
        setSelectedOrder((currentSelected) => {
          if (!currentSelected) return null;
          const updated = fetchedOrders.find((o) => Number(o.id) === Number(currentSelected.id));
          return updated || null;
        });
        // Auto-expand all customer groups so no orders are hidden
        const expanded = {};
        fetchedOrders.forEach((o) => {
          const key = o.customer?.name || `Customer #${o.customer_id}`;
          expanded[key] = true;
        });
        setExpandedCustomers(expanded);
      }
    } catch (err) {
      console.log('[fetchOrders] error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Keep refs always pointing to the latest fetch functions
  useEffect(() => {
    fetchOrdersRef.current = fetchOrders;
  }, [fetchOrders]);

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const result = await slotsAPI.getVendorRequests(token);
      if (result.data) {
        setRequests(result.data);
      }
    } catch (err) {
      console.log("fetchRequests err:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchHistory = async (page = 1) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `${API_BASE}/orders/vendor/history?page=${page}&limit=30&_t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );
      const result = await res.json();
      if (result.success) {
        const responseData = result.data || {};
        const orders = responseData.orders || responseData.data || [];
        setHistoryTotal(responseData.total || result.pagination?.total || 0);
        if (page === 1) {
          setHistory(orders);
        } else {
          setHistory((prev) => [...prev, ...orders]);
        }
        setHistoryPage(page);
      }
    } catch (err) {
      console.log("fetchHistory err:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistoryRef.current = fetchHistory;
  }, [fetchHistory]);

  useEffect(() => {
    fetchRequestsRef.current = fetchRequests;
  }, [fetchRequests]);

  useEffect(() => {
    fetchOrders();
    fetchRequests();
    fetchHistory();
    // Fetch recent decline notifications on mount
    fetch(`${API_BASE}/delivery/vendor-notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.notifications?.length) {
          const map = {};
          data.data.notifications.forEach(n => {
            if (n.type !== "delivery_declined" || n.order_id == null) return;
            const key = String(n.order_id);
            const declinedAt = new Date(n.created_at).toLocaleTimeString([], {
              hour: "2-digit", minute: "2-digit",
            });
            const titleMatch = n.title?.match(/(\d+)\s+riders?\s+declined/i);
            const bodyCountMatch = n.body?.match(/^(\d+)\s+riders?\s+have\s+declined/i);
            const parsedDeclineCount = titleMatch
              ? parseInt(titleMatch[1], 10)
              : bodyCountMatch
                ? parseInt(bodyCountMatch[1], 10)
                : 1;
            const entry = {
              partnerName: parsedDeclineCount === 1
                ? (n.body?.split(" declined")[0]?.trim() || "A delivery partner")
                : null,
              partnerPhone: null,
              declineCount: parsedDeclineCount,
              declinedAt,
              message: n.body || n.title || "Delivery request declined",
            };
            // Only keep the latest notification per order (by created_at)
            if (!map[key] || new Date(n.created_at) > new Date(map[key]._rawCreatedAt)) {
              map[key] = { ...entry, _rawCreatedAt: n.created_at };
            }
          });
          // Strip internal _rawCreatedAt before setting state
          const cleaned = {};
          Object.entries(map).forEach(([k, v]) => {
            const { _rawCreatedAt, ...rest } = v;
            cleaned[k] = rest;
          });
          setDeclinedOrders(prev => ({ ...prev, ...cleaned }));
        }
      })
      .catch(() => {});
  }, [token]);

  // Socket setup for real-time negotiation
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("delivery:declined", (data) => {
      console.log("[VendorOrdersScreen] ★★★ delivery:declined ★★★", JSON.stringify(data));
      fetchOrdersRef.current?.();
      const declinedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const count = data.decline_count || 1;
      setDeclinedOrders(prev => ({
        ...prev,
        [String(data.order_id)]: {
          partnerName: data.partner_name,
          partnerPhone: data.partner_phone,
          declineCount: count,
          declinedAt,
          message: count > 1
            ? `${count} riders have declined this delivery request.`
            : data.message || `${data.partner_name} declined the delivery request`,
        },
      }));

      let customerPhone = null;
      let customerName = "the customer";
      const ordersList = ordersRef.current || [];
      const order = ordersList.find(o => Number(o.id) === Number(data.order_id)) || selectedOrderRef.current;
      if (order && Number(order.id) === Number(data.order_id) && order.customer) {
        customerPhone = order.customer.phone;
        customerName = order.customer.name || customerName;
      }

      const alertMsg = count > 1
        ? `${count} riders have declined. You can assign another rider or deliver the order yourself.`
        : `${data.partner_name} has declined. You can move on to another delivery partner of that area or deliver the order yourself.`;

      Alert.alert(
        "Delivery Request Declined",
        alertMsg,
        [
          ...(count <= 1 && data.partner_phone && data.partner_phone !== 'N/A' ? [{
            text: `Call Partner (${data.partner_name})`,
            onPress: () => Linking.openURL(`tel:${data.partner_phone}`),
          }] : []),
          {
            text: `Call Customer (${customerName})`,
            onPress: () => {
              if (customerPhone && customerPhone !== 'N/A') {
                Linking.openURL(`tel:${customerPhone}`);
              } else {
                Alert.alert("Error", "No phone number available for this customer.");
              }
            }
          },
          {
            text: "Deliver Myself",
            onPress: () => {
              updateOrderStatusRef.current?.(data.order_id, "picked_up");
            }
          },
          { text: "Dismiss", style: "cancel" }
        ],
        { cancelable: true }
      );
    });
    socket.on("connect", () => console.log("Vendor Socket Connected"));

    // Real-time order notifications
    socket.on("order:new", (data) => {
      console.log("New Order:", data);
      playOrderSound();
      // Use ref so we always call the latest fetchOrders, not a stale one
      fetchOrdersRef.current?.();
      showVendorToast(
        `🛒 New order ${data.order_number || "#" + data.order_id} — ₹${data.total || ""}`,
        "info",
      );
    });

    // Real-time order status updates (customer accepted/rejected counter, etc.)
    socket.on("order:update", (data) => {
      console.log("Order update:", data);
      fetchOrdersRef.current?.();
      if (data.status) {
        showVendorToast(
          `Order ${data.order_number || "#" + data.order_id} updated: ${data.status}`,
          data.status === "accepted" ? "success" : "info",
        );
      }
    });

    // Slot & Fee Negotiation updates
    socket.on("slot:request", () => {
      fetchOrdersRef.current?.();
      fetchRequestsRef.current?.();
      showVendorToast("📅 New delivery slot request from a customer!", "info");
    });
    socket.on("fee:request", () => fetchOrdersRef.current?.());
    socket.on("phone:request", () => {
      playOrderSound();
      fetchRequestsRef.current?.();
      showVendorToast("📞 New phone number request from a customer!", "info");
    });

    // Customer responses
    socket.on("slot:confirmed", () => {
      fetchOrdersRef.current?.();
      showVendorToast("✅ Customer confirmed the delivery slot.", "success");
    });
    socket.on("fee:confirmed", () => fetchOrdersRef.current?.());

    // Delivery Updates
    socket.on("order_assigned_to_delivery", (data) => {
      fetchOrdersRef.current?.();
      if (data?.order_id || data?.orderId) {
        const oId = data.order_id || data.orderId;
        setSelectedOrder((prev) => {
          if (prev && prev.id === oId) {
            return {
              ...prev,
              delivery: data.delivery || data,
            };
          }
          return prev;
        });
      }
    });
    socket.on("delivery_status_update", (data) => {
      fetchOrdersRef.current?.();
      fetchHistoryRef.current?.(1);
      if (data?.order_id || data?.orderId) {
        const oId = data.order_id || data.orderId;
        setSelectedOrder((prev) => {
          if (prev && prev.id === oId) {
            return {
              ...prev,
              delivery: data.delivery || { ...prev.delivery, status: data.status },
            };
          }
          return prev;
        });
      }
    });
    socket.on("delivery_location_update", (data) => {
      if (data.deliveryId) {
        setLiveRiderLocations((prev) => ({
          ...prev,
          [data.deliveryId]: {
            latitude: data.latitude,
            longitude: data.longitude,
          },
        }));
      }
    });

    return () => socket.disconnect();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateOrderStatus = async (id, status, reason = null) => {
    console.log('[updateOrderStatus] called with id:', id, 'status:', status);
    try {
      const body = { status };
      if (reason) body.reason = reason;

      const res = await fetch(`${API_BASE}/orders/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      console.log('[updateOrderStatus] response:', res.status, result.success, result.message);

      if (res.ok && result.success) {
        // ── 1. Instantly update the orders LIST so the card re-renders NOW ──
        if (status === "rejected" || status === "cancelled" || status === "delivered") {
          // Remove from active list immediately — these go to history
          setOrders((prev) => {
            console.log('[updateOrderStatus] removing order from list, prev length:', prev.length);
            return prev.filter((o) => Number(o.id) !== Number(id));
          });
          // Refresh order history immediately so it appears there
          fetchHistory(1);
        } else {
          // Update the status badge on the card
          setOrders((prev) => {
            console.log('[updateOrderStatus] updating order status in list, prev length:', prev.length);
            return prev.map((o) => (Number(o.id) === Number(id) ? { ...o, status } : o));
          });
        }

        // ── 2. Update the modal's selectedOrder so button set changes ──
        setSelectedOrder((prev) =>
          prev && Number(prev.id) === Number(id) ? { ...prev, status } : prev,
        );

        // Auto-expand the customer group
        if (selectedOrder) {
          const customerName =
            selectedOrder.customer?.name ||
            `Customer #${selectedOrder.customer_id}`;
          setExpandedCustomers((prev) => ({ ...prev, [customerName]: true }));
        }

        // ── 3. Feedback ──
        if (status === "preparing" || status === "ready") {
          Alert.alert(
            "✓ Success",
            `Order marked as ${status === "preparing" ? "Preparing" : "Ready"}!`,
          );
        } else {
          showVendorToast(`Order ${status} ✓`, "success");
        }

        // ── 4. Background refresh to sync with server (after slight delay to avoid overwriting optimistic state) ──
        setTimeout(() => fetchOrdersRef.current?.(), 800);
      } else {
        Alert.alert(
          "Error",
          result.msg || result.message || "Failed to update status",
        );
      }
    } catch (err) {
      console.log('[updateOrderStatus] catch error:', err);
      Alert.alert("Error", "Something went wrong while updating status.");
    }
  };

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    selectedOrderRef.current = selectedOrder;
    if (selectedOrder?.delivery?.partner) {
      setBroadcastStatus(null);
    }
  }, [selectedOrder]);

  useEffect(() => {
    updateOrderStatusRef.current = updateOrderStatus;
  }, [updateOrderStatus]);

  useEffect(() => {
    if (selectedOrder) {
      setCounterItems(
        (selectedOrder.items || []).map((i) => ({
          ...i,
          new_quantity: getItemQty(i),
          available: true,
        })),
      );

      setCounterDeliveryFee(
        selectedOrder.delivery_fee ? String(selectedOrder.delivery_fee) : "",
      );

      if (
        selectedOrder.delivery_slot &&
        selectedOrder.delivery_slot.slot_start
      ) {
        const start = new Date(selectedOrder.delivery_slot.slot_start);
        const end = new Date(selectedOrder.delivery_slot.slot_end);

        const st = `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`;
        const ed = `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;

        setCounterSlotStart(st);
        setCounterSlotEnd(ed);

        const isToday = start.toDateString() === new Date().toDateString();
        setCounterSlotDay(isToday ? "today" : "tomorrow");
        setCounterSlotInput(`${st} to ${ed}`);
      } else {
        setCounterSlotStart("");
        setCounterSlotEnd("");
        setCounterSlotDay("today");
        setCounterSlotInput("");
      }
    }
  }, [selectedOrder]);

  const updateItemQty = (index, qty) => {
    const items = [...counterItems];

    items[index].new_quantity = Math.max(0, qty);

    setCounterItems(items);
  };

  const sendCounterOffer = async () => {
    try {
      let slot_start, slot_end;

      const structuredSlot = constructSlotISO(
        counterSlotDay,
        counterSlotStart,
        counterSlotEnd,
      );
      if (structuredSlot) {
        slot_start = structuredSlot.start;
        slot_end = structuredSlot.end;
      } else if (counterSlotInput) {
        const parsed = parseSlotLocally(counterSlotInput);
        if (parsed) {
          slot_start = parsed.start;
          slot_end = parsed.end;
        }
      }

      // Guard against NaN delivery fee
      const deliveryFeeValue = parseFloat(counterDeliveryFee);
      const safeDeliveryFee = isNaN(deliveryFeeValue)
        ? selectedOrder?.delivery_fee || 0
        : deliveryFeeValue;

      const res = await fetch(
        `${API_BASE}/orders/${selectedOrder.id}/counter`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: counterItems,
            delivery_fee: safeDeliveryFee,
            note: counterNote,
            slot_start,
            slot_end,
          }),
        },
      );

      const result = await res.json();

      if (res.ok && result.success) {
        showVendorToast("Counter offer sent to customer ✓", "success");

        // Update selectedOrder with the full response to prevent loss of details
        setSelectedOrder(result.data.order);
        setCounterModalVisible(false);
        setModalVisible(false);

        fetchOrders();
      } else {
        Alert.alert(
          "Error",
          result.message || result.msg || "Failed to send counter offer",
        );
      }
    } catch (err) {
      console.error("sendCounterOffer error:", err);
      Alert.alert("Error", "Something went wrong while sending counter offer.");
    }
  };

  const formatOrderTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return "";
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isSlotActive = (slot) => {
    if (!slot) return true;
    // Use vendor's confirmed start if available, else customer's requested start
    const start = slot.vendor_slot_start || slot.slot_start || slot.start;
    if (!start) return true;
    return new Date() >= new Date(start);
  };
  const formatStatus = (status) => {
    if (!status) return "";
    const keyMap = {
      pending: t('vendor.statusPending', 'Pending'),
      accepted: t('vendor.statusAccepted', 'Accepted'),
      preparing: t('vendor.statusPreparing', 'Preparing'),
      ready: t('vendor.statusReady', 'Ready'),
      picked_up: t('vendor.statusPickedUp', 'Picked Up'),
      delivered: t('vendor.statusDelivered', 'Delivered'),
      cancelled: t('vendor.statusCancelled', 'Cancelled'),
      rejected: t('vendor.statusRejected', 'Rejected'),
      countered: t('vendor.statusCountered', 'Countered'),
    };
    return keyMap[status] || (status.charAt(0).toUpperCase() + status.slice(1));
  };

  // Groups a flat order array by customer name, sorted by most recent activity
  const groupByCustomer = (orders) => {
    const map = {};
    orders.forEach((order) => {
      const key = order.customer?.name || `Customer #${order.customer_id}`;
      if (!map[key]) map[key] = { name: key, orders: [], total: 0, latestAt: null };
      map[key].orders.push(order);
      map[key].total += order.total || 0;
      // Track the most recent order timestamp for this customer group
      const orderTime = order.created_at ? new Date(order.created_at) : null;
      if (orderTime && (!map[key].latestAt || orderTime > new Date(map[key].latestAt))) {
        map[key].latestAt = order.created_at;
      }
    });
    return Object.values(map)
      .map(group => ({
        ...group,
        // Sort individual orders within each group by most recent first
        orders: [...group.orders].sort((a, b) =>
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
        ),
      }))
      // Sort customer groups by the most recent order across all their orders
      .sort((a, b) => new Date(b.latestAt || 0) - new Date(a.latestAt || 0));
  };

  const groupPhoneRequestsByCustomer = (phones) => {
    const map = {};
    phones.forEach((p) => {
      const key = p.customer?.name || `Customer #${p.customer_id}`;
      if (!map[key])
        map[key] = { name: key, requests: [], latestAt: p.created_at };
      map[key].requests.push(p);
      if (new Date(p.created_at) > new Date(map[key].latestAt)) {
        map[key].latestAt = p.created_at;
      }
    });
    return Object.values(map).sort(
      (a, b) => new Date(b.latestAt) - new Date(a.latestAt),
    );
  };

  const handlePhoneRequest = async (id, status) => {
    try {
      await fetch(`${API_BASE}/slots/phone-request/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchRequests();
    } catch (err) {
      console.log(err);
    }
  };

  const handleSlotRequest = async (id, action) => {
    try {
      await fetch(`${API_BASE}/slots/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      fetchRequests();
      fetchOrders();
    } catch (err) {
      console.log(err);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>{t('vendor.orders')}</Text>
          <Text style={styles.screenSubtitle}>
            Manage incoming & active orders
          </Text>
        </View>
        <View style={styles.headerBadgeWrap}>
          {orders.filter((o) => o.status === "pending").length > 0 && (
            <View style={styles.headerPendingBadge}>
              <View style={styles.headerPendingDot} />
              <Text style={styles.headerPendingText}>
                {orders.filter((o) => o.status === "pending").length} New
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "orders" && styles.activeTab]}
          onPress={() => setActiveTab("orders")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "orders" && styles.activeTabText,
            ]}
          >
            {t('vendor.activeOrders')}
          </Text>
          {(() => {
            const pendingOrdersCount = orders.filter(o => o.status === "pending" || o.status === "countered").length;
            const activeOrdersCount = orders.filter(o => o.status !== "pending" && o.status !== "countered").length;
            return activeOrdersCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeOrdersCount}</Text>
              </View>
            ) : null;
          })()}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "requests" && styles.activeTab]}
          onPress={() => setActiveTab("requests")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "requests" && styles.activeTabText,
            ]}
          >
            {t('vendor.requests')}
          </Text>
          {(() => {
            const pendingOrdersCount = orders.filter(o => o.status === "pending" || o.status === "countered").length;
            const totalRequestsCount = pendingOrdersCount + requests.phones.length + requests.slots.length;
            return totalRequestsCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: "#D97706" }]}>
                <Text style={styles.badgeText}>
                  {totalRequestsCount}
                </Text>
              </View>
            ) : null;
          })()}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            {t('vendor.history')}
          </Text>
          {historyTotal > 0 && (
            <View style={[styles.badge, { backgroundColor: "#6B7280" }]}>
              <Text style={styles.badgeText}>
                {historyTotal > 99 ? "99+" : historyTotal}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        extraData={{ orders, requests, history, activeTab }}
        data={
          activeTab === "orders"
            ? groupByCustomer(orders.filter(o => o.status !== "pending" && o.status !== "countered"))
            : activeTab === "requests"
              ? [
                  ...orders
                    .filter((o) => o.status === "pending" || o.status === "countered")
                    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                    .map((o) => ({ ...o, type: "order_request" })),
                  ...groupPhoneRequestsByCustomer(requests.phones).map((g) => ({
                    ...g,
                    type: "phone_group",
                  })),
                  ...requests.slots.map((s) => ({ ...s, type: "slot" })),
                ]
              : groupByCustomer(history)
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 100,
        }}
        keyExtractor={(item) =>
          activeTab === "history" || activeTab === "orders"
            ? `group-${item.name}`
            : item.type === "phone_group"
              ? `phone_group-${item.name}`
              : item.type
                ? `${item.type}-${item.id}`
                : String(item.id)
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loadingRequests || loadingHistory}
            onRefresh={() => {
              if (activeTab === "orders") onRefresh();
              else if (activeTab === "requests") {
                onRefresh();
                fetchRequests();
              }
              else fetchHistory();
            }}
          />
        }
        ListEmptyComponent={
          activeTab === "requests" ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <MaterialIcons name="notifications-off"
                size={48}
                color="#D1D5DB"
              />
              <Text
                style={{ marginTop: 12, color: "#6B7280", fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"}}
              >
                {t('vendor.noRequests')}
              </Text>
            </View>
          ) : activeTab === "history" ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <MaterialIcons name="access-time" size={48} color="#D1D5DB" />
              <Text
                style={{ marginTop: 12, color: "#6B7280", fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"}}
              >
                No order history yet
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) =>
          activeTab === "history" ? (
            // ── Customer group card ──
            <View style={styles.customerGroupCard}>
              <View style={styles.customerGroupHeader}>
                <View style={styles.customerGroupAvatar}>
                  <Text style={styles.customerGroupAvatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerGroupName}>{item.name}</Text>
                  <Text style={styles.customerGroupMeta}>
                    {item.orders.length} order
                    {item.orders.length !== 1 ? "s" : ""} · ₹
                    {Number(item.total).toLocaleString("en-IN")} total
                  </Text>
                </View>
                <View style={styles.customerGroupBadge}>
                  <Text style={styles.customerGroupBadgeText}>
                    {item.orders.length}
                  </Text>
                </View>
              </View>

              {item.orders.map((order, idx) => (
                <View
                  key={order.id}
                  style={[
                    styles.historyOrderRow,
                    idx === item.orders.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text style={styles.historyOrderNumber}>
                        {order.order_number || `#${order.id}`}
                      </Text>
                      <View
                        style={[
                          styles.historyStatusPill,
                          order.status === "delivered" && {
                            backgroundColor: "#DCFCE7",
                          },
                          order.status === "cancelled" && {
                            backgroundColor: "#FEE2E2",
                          },
                          order.status === "rejected" && {
                            backgroundColor: "#FEE2E2",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.historyStatusText,
                            order.status === "delivered" && {
                              color: "#16A34A",
                            },
                            order.status === "cancelled" && {
                              color: "#DC2626",
                            },
                            order.status === "rejected" && { color: "#DC2626" },
                          ]}
                        >
                          {formatStatus(order.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyOrderItems} numberOfLines={1}>
                      {(order.items || [])
                        .map((i) => `${getItemQty(i)}× ${i.product_name}`)
                        .join(" · ")}
                    </Text>
                    <Text style={styles.historyOrderTime}>
                      {formatOrderTime(order.created_at)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={styles.historyOrderTotal}>₹{order.total}</Text>
                    {order.can_rate_partner && !order.has_rated_partner && (
                      <TouchableOpacity
                        style={styles.ratePartnerBtn}
                        onPress={() => {
                          if (order.delivery?.partner) {
                            setVendorReviewOrder(order);
                            setVendorReviewRating(0);
                            setVendorReviewComment("");
                          }
                        }}
                      >
                        <Text style={styles.ratePartnerBtnText}>Rate Partner</Text>
                      </TouchableOpacity>
                    )}
                    {order.can_rate_partner && order.has_rated_partner && (
                      <TouchableOpacity
                        style={[styles.ratePartnerBtn, { backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#CBD5E1" }]}
                        onPress={() => handleOpenViewVendorRating(order)}
                        activeOpacity={0.7}
                      >
                        {(() => {
                          const ratingVal = order.vendor_rating || (order.reviews?.[0]?.vendor_review_rating);
                          const num = ratingVal ? parseInt(ratingVal, 10) || 5 : 5;
                          const starsText = "★".repeat(Math.max(1, Math.min(5, num)));
                          return (
                            <Text style={[styles.ratePartnerBtnText, { color: "#4B5563" }]}>
                              You rated <Text style={{ color: "#F59E0B", fontWeight: "900" }}>{starsText}</Text>
                            </Text>
                          );
                        })()}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : activeTab === "orders" ? (
            <View style={styles.customerGroupCard}>
              <TouchableOpacity
                style={styles.customerGroupHeader}
                onPress={() => toggleCustomer(item.name)}
                activeOpacity={0.75}
              >
                <View style={styles.customerGroupAvatar}>
                  <Text style={styles.customerGroupAvatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerGroupName}>{item.name}</Text>
                  <Text style={styles.customerGroupMeta}>
                    {item.orders.length} active order
                    {item.orders.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <View style={styles.customerGroupBadge}>
                  <Text style={styles.customerGroupBadgeText}>
                    {item.orders.length}
                  </Text>
                </View>
                <MaterialIcons
                  name={
                    expandedCustomers[item.name] ? "expand-less" : "expand-more"
                  }
                  size={20}
                  color="#6B7280"
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>

              {expandedCustomers[item.name] &&
                item.orders.map((order, idx) => (
                  <TouchableOpacity
                    key={order.id}
                    style={[
                      styles.activeOrderRow,
                      idx === item.orders.length - 1 && {
                        borderBottomWidth: 0,
                      },
                      order.status === "pending" && {
                        backgroundColor: "#FFFBEB",
                      },
                    ]}
                    onPress={() => {
                      setSelectedOrder(order);
                      setModalVisible(true);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {order.status === "pending" && (
                          <View style={styles.pendingDot} />
                        )}
                        {declinedOrders[String(order.id)] &&
                          !order.delivery?.partner && (
                            <View style={styles.declinedDot}>
                              <MaterialIcons
                                name="error"
                                size={9}
                                color="#fff"
                              />
                            </View>
                          )}
                        <Text
                          style={[
                            styles.historyOrderNumber,
                            order.status === "pending" && { color: "#D97706" },
                            declinedOrders[String(order.id)] &&
                              !order.delivery?.partner && { color: "#DC2626" },
                          ]}
                        >
                          {order.order_number || `#${order.id}`}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            order.status === "pending" &&
                              styles.statusBadgePending,
                            order.status === "accepted" &&
                              styles.statusBadgeAccepted,
                            order.status === "preparing" &&
                              styles.statusBadgePreparing,
                            order.status === "ready" && styles.statusBadgeReady,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              order.status === "pending" &&
                                styles.statusTextPending,
                              order.status === "accepted" &&
                                styles.statusTextAccepted,
                              order.status === "preparing" &&
                                styles.statusTextPreparing,
                              order.status === "ready" &&
                                styles.statusTextReady,
                            ]}
                          >
                            {formatStatus(order.status)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.historyOrderItems} numberOfLines={1}>
                        {(order.items || [])
                          .map((i) => `${getItemQty(i)}× ${i.product_name}`)
                          .join(" · ")}
                      </Text>
                      <Text style={styles.orderTime}>
                        {formatOrderTime(order.created_at)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <Text style={styles.totalPillText}>₹{order.total}</Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: "#ECFDF5",
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                          borderWidth: 1,
                          borderColor: "#A7F3D0",
                        }}
                        onPress={() => {
                          setSelectedOrder(order);
                          setModalVisible(true);
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#047857" }}>
                          {t('vendor.showMore', 'Show More')}
                        </Text>
                        <MaterialIcons
                          name="chevron-right"
                          size={14}
                          color="#047857"
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          ) : item.type === "order_request" ? (
            <TouchableOpacity
              style={styles.requestCard}
              onPress={() => {
                setSelectedOrder(item);
                setModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <View style={styles.requestHeader}>
                <View style={[styles.requestIcon, { backgroundColor: "#FEF3C7" }]}>
                  <MaterialIcons name="shopping-bag" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.requestTitle, { color: "#D97706" }]}>
                    {t('vendor.requests', 'New Order Request')}
                  </Text>
                  <Text style={styles.requestCustomer}>
                    {item.customer?.name || `Customer #${item.customer_id}`}
                  </Text>
                </View>
                <Text style={styles.orderTime}>
                  {formatOrderTime(item.created_at)}
                </Text>
              </View>

              <View style={[styles.requestDetails, { alignItems: "center", justifyContent: "space-between" }]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.slotRange} numberOfLines={1}>
                    {(item.items || []).map((i) => `${getItemQty(i)}× ${i.product_name}`).join(" · ")}
                  </Text>
                </View>
                <Text style={styles.slotDay}>
                  ₹{item.total}
                </Text>
              </View>

              <View style={{ marginTop: 10, alignItems: "flex-end" }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#ECFDF5",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    borderWidth: 1,
                    borderColor: "#A7F3D0",
                  }}
                  onPress={() => {
                    setSelectedOrder(item);
                    setModalVisible(true);
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#047857" }}>
                    {t('vendor.showMore', 'Show More')}
                  </Text>
                  <MaterialIcons name="chevron-right" size={16} color="#047857" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ) : item.type === "phone_group" ? (
            <View style={styles.customerGroupCard}>
              <View style={styles.customerGroupHeader}>
                <View style={styles.customerGroupAvatar}>
                  <Text style={styles.customerGroupAvatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerGroupName}>{item.name}</Text>
                  <Text style={styles.customerGroupMeta}>
                    {item.requests.length} phone request
                    {item.requests.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <View style={styles.customerGroupBadge}>
                  <Text style={styles.customerGroupBadgeText}>
                    {item.requests.length}
                  </Text>
                </View>
              </View>
              {item.requests.map((req, idx) => (
                <View
                  key={req.id}
                  style={[
                    styles.historyOrderRow,
                    idx === item.requests.length - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View
                        style={[
                          styles.historyStatusPill,
                          {
                            backgroundColor:
                              req.status === "approved"
                                ? "#DCFCE7"
                                : req.status === "rejected"
                                  ? "#FEE2E2"
                                  : "#FEF3C7",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.historyStatusText,
                            {
                              color:
                                req.status === "approved"
                                  ? "#16A34A"
                                  : req.status === "rejected"
                                    ? "#DC2626"
                                    : "#D97706",
                            },
                          ]}
                        >
                          {req.status === "approved"
                            ? t('vendor.statusAccepted', 'Accepted')
                            : req.status === "rejected"
                              ? t('vendor.statusRejected', 'Rejected')
                              : t('vendor.statusPending', 'Pending')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyOrderTime}>
                      {formatOrderTime(req.created_at)}
                    </Text>
                  </View>
                  {req.status === "pending" && (
                    <View
                      style={{ flexDirection: "row", gap: 6, flexShrink: 1 }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.rejectBtn,
                          {
                            flex: 1,
                            minWidth: 64,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                          },
                        ]}
                        onPress={() => handlePhoneRequest(req.id, "rejected")}
                      >
                        <Text style={[styles.rejectBtnText, { fontSize: 12 }]}>
                          {t('vendor.reject', 'Reject')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.approveBtn,
                          {
                            flex: 1,
                            minWidth: 70,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                          },
                        ]}
                        onPress={() => handlePhoneRequest(req.id, "approved")}
                      >
                        <Text style={[styles.approveBtnText, { fontSize: 12 }]}>
                          {t('vendor.accept', 'Accept')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestIcon}>
                  <MaterialIcons name="alarm" size={20} color="#1F2937" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.requestTitle}>
                    {item.type === "phone"
                      ? "Phone Request"
                      : "Delivery Slot Request"}
                  </Text>
                  <Text style={styles.requestCustomer}>
                    {item.customer?.name}
                  </Text>
                </View>
                <Text style={styles.orderTime}>
                  {formatOrderTime(item.created_at)}
                </Text>
              </View>

              {item.type === "slot" && (
                <View style={styles.requestDetails}>
                  <Text style={styles.slotRange}>
                    {new Date(item.slot_start || item.start).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" },
                    )}{" "}
                    -
                    {new Date(item.slot_end || item.end).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </Text>
                  <Text style={styles.slotDay}>
                    {new Date(item.start).toDateString() ===
                    new Date().toDateString()
                      ? t('vendor.today', 'Today')
                      : t('vendor.tomorrow', 'Tomorrow')}
                  </Text>
                </View>
              )}

              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() =>
                    item.type === "phone"
                      ? handlePhoneRequest(item.id, "rejected")
                      : handleSlotRequest(item.id, "reject")
                  }
                >
                  <Text style={styles.rejectBtnText}>{t('vendor.reject', 'Reject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() =>
                    item.type === "phone"
                      ? handlePhoneRequest(item.id, "approved")
                      : handleSlotRequest(item.id, "confirm")
                  }
                >
                  <Text style={styles.approveBtnText}>{t('vendor.accept', 'Accept')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }
      />

      <Modal
        visible={isDeliveryModalVisible}
        animationType="slide"
        transparent={false}
      >
        <View style={dmStyles.root}>
          {/* ── HEADER ── */}
          <View style={dmStyles.header}>
            <TouchableOpacity
              style={dmStyles.backBtn}
              onPress={() => setIsDeliveryModalVisible(false)}
            >
              <MaterialIcons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={dmStyles.headerTitle}>{t('vendor.assignRider', 'Assign Rider')}</Text>
              <Text style={dmStyles.headerSub}>
                {selectedOrder?.order_number}
              </Text>
            </View>
            <View style={dmStyles.headerBadge}>
              <View style={dmStyles.headerBadgeDot} />
              <Text style={dmStyles.headerBadgeText}>{t('vendor.live', 'LIVE')}</Text>
            </View>
          </View>

          {/* ── ORDER SUMMARY STRIP ── */}
          <View style={dmStyles.orderStrip}>
            <View style={dmStyles.orderStripLeft}>
              <View style={dmStyles.orderStripAvatar}>
                <Text style={dmStyles.orderStripAvatarText}>
                  {(selectedOrder?.customer?.name || "C")
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={dmStyles.orderStripName}>
                  {selectedOrder?.customer?.name}
                </Text>
                <Text style={dmStyles.orderStripItems} numberOfLines={1}>
                  {(selectedOrder?.items || [])
                    .slice(0, 2)
                    .map((i) => `${getItemQty(i)}× ${i.product_name}`)
                    .join(" · ")}
                  {(selectedOrder?.items || []).length > 2
                    ? ` +${(selectedOrder?.items || []).length - 2} more`
                    : ""}
                </Text>
              </View>
            </View>
            <View style={dmStyles.orderStripRight}>
              <Text style={dmStyles.orderStripTotal}>
                ₹{selectedOrder?.total}
              </Text>
            </View>
          </View>

            {/* ── MAP (outside ScrollView for Android touch handling) ── */}
            <View style={dmStyles.mapCard}>
              <VendorMapView
                storeLocation={storeLocation}
                riders={riders}
                silverMapStyle={silverMapStyle}
                destinationLocation={
                  selectedOrder?.delivery_address?.latitude
                    ? {
                        latitude: selectedOrder.delivery_address.latitude,
                        longitude: selectedOrder.delivery_address.longitude,
                      }
                    : null
                }
              />
              <View style={dmStyles.mapOverlayBadge}>
                <MaterialIcons name="people" size={14} color="#147538" />
                <Text style={dmStyles.mapOverlayText}>
                  {t('vendor.partnersNearby', '{{count}} partners nearby', { count: riders.length })}
                </Text>
              </View>
            </View>

          <ScrollView
            bounces={false}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── RIDERS SECTION ── */}
            <View style={dmStyles.section}>
              <View style={dmStyles.sectionHeader}>
                <Text style={dmStyles.sectionTitle}>{t('vendor.availableRiders', 'Available Riders')}</Text>
                <View style={dmStyles.liveChip}>
                  <View style={dmStyles.liveDot} />
                  <Text style={dmStyles.liveText}>{t('vendor.live', 'LIVE')}</Text>
                </View>
              </View>

              {/* Slot status banner */}
              {selectedOrder?.delivery_slot &&
                !isSlotActive(selectedOrder?.delivery_slot) && (
                  <View style={dmStyles.slotBannerLocked}>
                    <MaterialIcons
                      name="lock-clock"
                      size={18}
                      color="#D97706"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={dmStyles.slotBannerTitle}>
                        {t('vendor.slotNotStartedYet', 'Slot not started yet')}
                      </Text>
                      <Text style={dmStyles.slotBannerSub}>
                        {t('vendor.startsAt', 'Starts at {{time}}', {
                          time: new Date(
                            selectedOrder.delivery_slot.vendor_slot_start ||
                              selectedOrder.delivery_slot.slot_start,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                        })}
                      </Text>
                    </View>
                  </View>
                )}

              {selectedOrder?.delivery_slot &&
                isSlotActive(selectedOrder?.delivery_slot) && (
                  <View style={dmStyles.slotBannerActive}>
                    <View style={dmStyles.slotBannerActiveDot} />
                    <Text style={dmStyles.slotBannerActiveText}>
                      {t('vendor.slotIsActiveAssignNow', 'Slot is active — assign a rider now')}
                    </Text>
                  </View>
                )}

              {/* Auto Assign */}
              {!selectedOrder?.delivery?.partner && (
                <TouchableOpacity
                  style={[
                    dmStyles.autoBtn,
                    (autoAssigning ||
                      !isSlotActive(selectedOrder?.delivery_slot)) &&
                      dmStyles.autoBtnDisabled,
                  ]}
                  onPress={handleAutoAssign}
                  disabled={
                    autoAssigning || !isSlotActive(selectedOrder?.delivery_slot)
                  }
                  activeOpacity={0.85}
                >
                  <View style={dmStyles.autoBtnIcon}>
                    {autoAssigning ? (
                      <ActivityIndicator size="small" color="#147538" />
                    ) : (
                      <MaterialIcons name="near-me" size={18} color="#147538" />
                    )}
                  </View>
                  <Text style={dmStyles.autoBtnText}>
                    {autoAssigning
                      ? t('vendor.broadcastingToRiders', 'Broadcasting to riders…')
                      : t('vendor.autoAssignNearbyRider', 'Auto Assign Nearby Rider')}
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color="#147538"
                  />
                </TouchableOpacity>
              )}

              {selectedOrder && declinedOrders[String(selectedOrder.id)] && (
                <View style={dmStyles.declinedCard}>
                  <View style={dmStyles.declinedCardAccent} />
                  <View style={dmStyles.declinedCardHeader}>
                    <View style={dmStyles.declinedCardIconWrap}>
                      <MaterialIcons name="error-outline" size={18} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={dmStyles.declinedCardTitle}>Delivery Declined</Text>
                      <Text style={dmStyles.declinedCardTime}>
                        {declinedOrders[String(selectedOrder.id)].declinedAt}
                      </Text>
                    </View>
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() =>
                        setDeclinedOrders(prev => {
                          const next = { ...prev };
                          delete next[String(selectedOrder.id)];
                          return next;
                        })
                      }
                    >
                      <MaterialIcons name="close" size={18} color="#9F1239" />
                    </TouchableOpacity>
                  </View>
                  <Text style={dmStyles.declinedCardMsg}>
                    {declinedOrders[String(selectedOrder.id)].declineCount > 1
                      ? `${declinedOrders[String(selectedOrder.id)].declineCount} riders have declined this delivery request.`
                      : `${declinedOrders[String(selectedOrder.id)].partnerName} declined this delivery request.`}
                  </Text>
                  {declinedOrders[String(selectedOrder.id)].declineCount <= 1 &&
                    declinedOrders[String(selectedOrder.id)].partnerPhone &&
                    declinedOrders[String(selectedOrder.id)].partnerPhone !== "N/A" && (
                      <View style={dmStyles.declinedCardPhoneRow}>
                        <MaterialIcons name="phone" size={12} color="#9F1239" />
                        <Text style={dmStyles.declinedCardPhone}>
                          {declinedOrders[String(selectedOrder.id)].partnerPhone}
                        </Text>
                      </View>
                    )}
                  <View style={dmStyles.declinedCardDivider} />
                  <View style={dmStyles.declinedCardFooter}>
                    <MaterialIcons name="info-outline" size={14} color="#9F1239" />
                    <Text style={dmStyles.declinedCardFooterText}>
                      Assign a new rider below to get this order moving again.
                    </Text>
                  </View>
                </View>
              )}

              {broadcastStatus && broadcastStatus.type !== "declined" && (
                <View
                  style={[dmStyles.broadcastBanner]}
                >
                  <View style={[dmStyles.broadcastDot]} />
                  <Text style={[dmStyles.broadcastText]}>
                    {broadcastStatus.message}
                  </Text>
                </View>
              )}

              {/* Rider Cards */}
              {riders.length > 0 ? (
                riders.map((rider, index) => (
                  <View
                    key={rider.id}
                    style={[
                      dmStyles.riderCard,
                      index === 0 && dmStyles.riderCardFirst,
                    ]}
                  >
                    {index === 0 && (
                      <View style={dmStyles.riderTopBadge}>
                        <MaterialIcons name="bolt" size={11} color="#fff" />
                        <Text style={dmStyles.riderTopBadgeText}>FASTEST</Text>
                      </View>
                    )}
                    <View style={dmStyles.riderRow}>
                      <Image
                        source={{ uri: rider.image }}
                        style={dmStyles.riderAvatar}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={dmStyles.riderName}>{rider.name}</Text>
                        <View style={dmStyles.riderMeta}>
                          <MaterialIcons
                            name="location-on"
                            size={12}
                            color="#147538"
                          />
                          <Text style={dmStyles.riderDist}>
                            {rider.distance}
                          </Text>
                          <Text style={dmStyles.riderStatus}>
                            {" "}
                            · {rider.status}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={dmStyles.callBtn}
                        onPress={() =>
                          Alert.alert("Call", `Calling ${rider.name}...`)
                        }
                      >
                        <MaterialIcons name="phone"
                          size={16}
                          color="#147538"
                        />
                      </TouchableOpacity>
                      {rider.status === "Available" || rider.is_busy ? (
                        <TouchableOpacity
                          style={[
                            dmStyles.assignBtn,
                            assignedPartnerIds.has(rider.id) && { backgroundColor: '#147538' },
                            rider.is_busy && !assignedPartnerIds.has(rider.id) && { backgroundColor: '#F59E0B' },
                            !isSlotActive(selectedOrder?.delivery_slot) &&
                              dmStyles.assignBtnDisabled,
                          ]}
                          onPress={() => handleAssignRider(rider.id)}
                          disabled={!isSlotActive(selectedOrder?.delivery_slot) || assignedPartnerIds.has(rider.id)}
                        >
                          <Text style={dmStyles.assignBtnText}>
                            {!isSlotActive(selectedOrder?.delivery_slot)
                              ? "Locked"
                              : assignedPartnerIds.has(rider.id)
                                ? "Sent ✓"
                                : rider.is_busy
                                  ? "Queue"
                                  : "Assign"}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <View style={dmStyles.emptyRiders}>
                  {selectedOrder?.delivery?.partner ? (
                    <>
                      <MaterialIcons
                        name="check-circle"
                        size={32}
                        color="#147538"
                      />
                      <Text style={dmStyles.emptyRidersText}>
                        Rider is on the way
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialIcons
                        name="delivery-dining"
                        size={32}
                        color="#9CA3AF"
                      />
                      <Text style={dmStyles.emptyRidersText}>
                        No riders nearby
                      </Text>
                      <Text style={dmStyles.emptyRidersSub}>
                        Use Auto Assign to broadcast to all available riders
                      </Text>
                    </>
                  )}
                </View>
              )}

              {/* Mark Ready fallback */}
              {!selectedOrder?.delivery?.partner &&
                selectedOrder?.status !== "ready" && (
                  <TouchableOpacity
                    style={dmStyles.markReadyBtn}
                    onPress={() => updateOrderStatus(selectedOrder.id, "ready")}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={18}
                      color="#147538"
                    />
                    <Text style={dmStyles.markReadyText}>
                      Mark Order as Ready
                    </Text>
                  </TouchableOpacity>
                )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ORDER MODAL */}

      {/* ORDER MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Handle bar */}
            <View style={omStyles.handle} />

            {/* Header */}
            <View style={omStyles.header}>
              <View style={omStyles.headerLeft}>
                <Text style={omStyles.orderNum}>
                  {selectedOrder?.order_number}
                </Text>
                <View
                  style={[
                    omStyles.statusChip,
                    selectedOrder?.status === "pending" && {
                      backgroundColor: "#FEF3C7",
                    },
                    selectedOrder?.status === "accepted" && {
                      backgroundColor: "#DCFCE7",
                    },
                    selectedOrder?.status === "countered" && {
                      backgroundColor: "#DBEAFE",
                    },
                  ]}
                >
                  <Text
                    style={[
                      omStyles.statusChipText,
                      selectedOrder?.status === "pending" && {
                        color: "#D97706",
                      },
                      selectedOrder?.status === "accepted" && {
                        color: "#16A34A",
                      },
                      selectedOrder?.status === "countered" && {
                        color: "#2563EB",
                      },
                    ]}
                  >
                    {formatStatus(selectedOrder?.status)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={omStyles.closeBtn}
              >
                <MaterialIcons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              {/* Customer Card */}
              <View style={omStyles.customerCard}>
                <View style={omStyles.customerAvatarLg}>
                  <Text style={omStyles.customerAvatarText}>
                    {(selectedOrder?.customer?.name || "C")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={omStyles.customerName}>
                    {selectedOrder?.customer?.name}
                  </Text>
                  <Text style={omStyles.customerPhone}>
                    {selectedOrder?.customer?.phone}
                  </Text>
                </View>
                <Text style={omStyles.orderTimeText}>
                  {formatOrderTime(selectedOrder?.created_at)}
                </Text>
              </View>

              {/* Items */}
              <View style={omStyles.section}>
                <Text style={omStyles.sectionLabel}>{t('vendor.orderItems', 'Order Items')}</Text>
                {(selectedOrder?.items || []).map((item, i) => (
                  <View key={i} style={omStyles.itemRow}>
                    <Image
                      source={{
                        uri:
                          item.product?.image_url ||
                          "https://cdn-icons-png.flaticon.com/512/1046/1046784.png",
                      }}
                      style={omStyles.itemImage}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={omStyles.itemName}>{item.product_name}</Text>
                      <Text style={omStyles.itemQty}>
                        {getItemQty(item)} × ₹{item.product_price}
                      </Text>
                    </View>
                    <Text style={omStyles.itemTotal}>₹{(getItemQty(item) * parseFloat(item.product_price || 0)).toFixed(2).replace(/\.00$/, '')}</Text>
                  </View>
                ))}
              </View>

              {/* Price Breakdown */}
              <View style={omStyles.priceCard}>
                <View style={omStyles.priceRow}>
                  <Text style={omStyles.priceLabel}>{t('vendor.subtotal', 'Subtotal')}</Text>
                  <Text style={omStyles.priceValue}>
                    ₹{selectedOrder?.subtotal}
                  </Text>
                </View>
                <View style={omStyles.priceRow}>
                  <Text style={omStyles.priceLabel}>{t('vendor.deliveryFee', 'Delivery Fee')}</Text>
                  <Text style={omStyles.priceValue}>
                    ₹{selectedOrder?.delivery_fee}
                  </Text>
                </View>
                {selectedOrder?.discount > 0 && (
                  <View style={omStyles.priceRow}>
                    <Text style={[omStyles.priceLabel, { color: "#16A34A" }]}>
                      {t('orders.discount', 'Discount')}
                    </Text>
                    <Text style={[omStyles.priceValue, { color: "#16A34A" }]}>
                      -₹{selectedOrder?.discount}
                    </Text>
                  </View>
                )}
                <View style={omStyles.priceDivider} />
                <View style={omStyles.priceRow}>
                  <Text style={omStyles.priceTotalLabel}>{t('vendor.orderTotal', 'Total')}</Text>
                  <Text style={omStyles.priceTotalValue}>
                    ₹{selectedOrder?.total}
                  </Text>
                </View>
              </View>

              {/* Delivery Slot if present */}
              {selectedOrder?.delivery_slot && (
                <View style={omStyles.slotCard}>
                  <MaterialIcons name="schedule" size={18} color="#059669" />
                  <View style={{ flex: 1 }}>
                    <Text style={omStyles.slotLabel}>
                      {t('vendor.deliverySlotRequested', 'Requested Delivery Slot')}
                    </Text>
                    <Text style={omStyles.slotTime}>
                      {new Date(
                        selectedOrder.delivery_slot.slot_start,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {new Date(
                        selectedOrder.delivery_slot.slot_end,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Special Instructions */}
              {selectedOrder?.special_instructions && (
                <View style={omStyles.noteCard}>
                  <MaterialIcons
                    name="sticky-note-2"
                    size={16}
                    color="#D97706"
                  />
                  <Text style={omStyles.noteText}>
                    {selectedOrder.special_instructions}
                  </Text>
                </View>
              )}

              {/* Declined delivery notice */}
              {declinedOrders[String(selectedOrder?.id)] &&
                !selectedOrder?.delivery?.partner && (
                  <View style={omStyles.declinedNotice}>
                    <View style={omStyles.declinedNoticeIconWrap}>
                      <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={omStyles.declinedNoticeTitle}>
                        Delivery Declined
                      </Text>
                      <Text style={omStyles.declinedNoticeMsg}>
                        {declinedOrders[String(selectedOrder.id)].declineCount > 1
                          ? `${declinedOrders[String(selectedOrder.id)].declineCount} riders declined the delivery request at `
                          : `${declinedOrders[String(selectedOrder.id)].partnerName} declined the delivery request at `}
                        {declinedOrders[String(selectedOrder.id)].declinedAt}.
                      </Text>
                      <TouchableOpacity
                        style={omStyles.declinedNoticeBtn}
                        onPress={() => {
                          setModalVisible(false);
                          setIsDeliveryModalVisible(true);
                        }}
                        activeOpacity={0.85}
                      >
                        <MaterialIcons name="replay" size={14} color="#fff" />
                        <Text style={omStyles.declinedNoticeBtnText}>
                          {t('vendor.reassignNow', 'Reassign a Rider Now')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              {/* Rate delivery partner — for delivered orders */}
              {selectedOrder?.status === "delivered" && selectedOrder?.delivery?.partner && (
                <View style={omStyles.actionsWrap}>
                  <Text style={omStyles.actionsLabel}>Delivery Partner</Text>
                  <TouchableOpacity
                    style={[omStyles.acceptBtn, { backgroundColor: "#D97706" }]}
                    onPress={() => {
                      setModalVisible(false);
                      setVendorReviewOrder(selectedOrder);
                      setVendorReviewRating(0);
                      setVendorReviewComment("");
                    }}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="star" size={20} color="#fff" />
                    <Text style={omStyles.acceptBtnText}>
                      Rate {selectedOrder?.delivery?.partner?.user?.name || "Delivery Partner"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Actions — for accepted/preparing/ready */}
              {["accepted", "preparing", "ready", "picked_up"].includes(
                selectedOrder?.status,
              ) && (
                <View style={omStyles.actionsWrap}>
                  <Text style={omStyles.actionsLabel}>
                    {declinedOrders[String(selectedOrder?.id)]
                      ? declinedOrders[String(selectedOrder.id)].declineCount > 1
                        ? t('vendor.manageOrderDeclinedMultiple', { count: declinedOrders[String(selectedOrder.id)].declineCount }, `${declinedOrders[String(selectedOrder.id)].declineCount} delivery partners declined`)
                        : t('vendor.manageOrderDeclinedSingle', { name: declinedOrders[String(selectedOrder.id)].partnerName }, `${declinedOrders[String(selectedOrder.id)].partnerName} delivery partner declined`)
                      : t('vendor.manageOrder', 'Manage Order')
                    }
                  </Text>
                  <TouchableOpacity
                    style={omStyles.acceptBtn}
                    onPress={() => {
                      setModalVisible(false);
                      setIsDeliveryModalVisible(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="person-pin" size={20} color="#fff" />
                    <Text style={omStyles.acceptBtnText}>{t('vendor.manageDelivery', 'Manage Delivery')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 12,
                      marginTop: 2,
                      width: "100%",
                      minHeight: 44,
                      borderRadius: 12,
                      backgroundColor: "#F8FAFC",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color: "#64748B",
                        fontSize: 14,
                        fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"}}
                    >
                      {t('vendor.assignLater', "I'll assign later")}
                    </Text>
                  </TouchableOpacity>

                  {selectedOrder?.status === "accepted" && (
                    <View style={omStyles.secondaryActions}>
                      <TouchableOpacity
                        style={omStyles.counterBtn}
                        onPress={() =>
                          updateOrderStatus(selectedOrder.id, "preparing")
                        }
                        activeOpacity={0.85}
                      >
                        <MaterialIcons
                          name="restaurant"
                          size={18}
                          color="#2563EB"
                        />
                        <Text style={omStyles.counterBtnText}>
                          {t('vendor.markPreparing', 'Mark Preparing')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          omStyles.counterBtn,
                          {
                            backgroundColor: "#F0FDF4",
                            borderColor: "#BBF7D0",
                          },
                        ]}
                        onPress={() =>
                          updateOrderStatus(selectedOrder.id, "ready")
                        }
                        activeOpacity={0.85}
                      >
                        <MaterialIcons
                          name="check-circle"
                          size={18}
                          color="#16A34A"
                        />
                        <Text
                          style={[
                            omStyles.counterBtnText,
                            { color: "#16A34A" },
                          ]}
                        >
                          {t('vendor.markReady', 'Mark Ready')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedOrder?.status === "preparing" && (
                    <TouchableOpacity
                      style={[
                        omStyles.acceptBtn,
                        { backgroundColor: "#16A34A", marginTop: 0 },
                      ]}
                      onPress={() =>
                        updateOrderStatus(selectedOrder.id, "ready")
                      }
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color="#fff"
                      />
                      <Text style={omStyles.acceptBtnText}>{t('vendor.markReady', 'Mark as Ready')}</Text>
                    </TouchableOpacity>
                  )}
                  {['accepted', 'preparing', 'ready'].includes(selectedOrder?.status) && (
                    <TouchableOpacity
                      style={[
                        omStyles.acceptBtn,
                        { backgroundColor: "#D97706", marginTop: 8 },
                      ]}
                      onPress={() => {
                        updateOrderStatus(selectedOrder.id, "picked_up");
                        setModalVisible(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name="directions-run"
                        size={20}
                        color="#fff"
                      />
                      <Text style={omStyles.acceptBtnText}>{t('vendor.deliverMyselfSelf', 'Deliver It Yourself (Self Delivery)')}</Text>
                    </TouchableOpacity>
                  )}

                  {selectedOrder?.status === "picked_up" && (
                    <TouchableOpacity
                      style={[
                        omStyles.acceptBtn,
                        { backgroundColor: "#16A34A", marginTop: 8 },
                      ]}
                      onPress={async () => {
                        await updateOrderStatus(selectedOrder.id, "delivered");
                        setModalVisible(false);
                        // Show rating modal for delivery partner if one was assigned
                        if (selectedOrder?.delivery?.partner) {
                          setVendorReviewOrder(selectedOrder);
                          setVendorReviewRating(0);
                          setVendorReviewComment("");
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name="done-all"
                        size={20}
                        color="#fff"
                      />
                      <Text style={omStyles.acceptBtnText}>{t('vendor.markAsDelivered', 'Mark as Delivered')}</Text>
                    </TouchableOpacity>
                  )}

                </View>
              )}

              {/* Actions — only for pending */}
              {selectedOrder?.status === "pending" && (
                <View style={omStyles.actionsWrap}>
                  <Text style={omStyles.actionsLabel}>{t('vendor.respondToOrder', 'Respond to Order')}</Text>

                  {/* Accept */}
                  <TouchableOpacity
                    style={omStyles.acceptBtn}
                    onPress={() => {
                      updateOrderStatus(selectedOrder.id, "accepted");
                      setModalVisible(false);
                      setAcceptedModalVisible(true);
                      // Expand this customer's group so the accepted order stays visible
                      if (selectedOrder) {
                        const customerName =
                          selectedOrder.customer?.name ||
                          `Customer #${selectedOrder.customer_id}`;
                        setExpandedCustomers((prev) => ({
                          ...prev,
                          [customerName]: true,
                        }));
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="check-circle" size={20} color="#fff" />
                    <Text style={omStyles.acceptBtnText}>{t('vendor.acceptOrder', 'Accept Order')}</Text>
                  </TouchableOpacity>

                  {/* Counter + Decline row */}
                  <View style={omStyles.secondaryActions}>
                    <TouchableOpacity
                      style={omStyles.counterBtn}
                      onPress={() => setCounterModalVisible(true)}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name="swap-horiz"
                        size={18}
                        color="#2563EB"
                      />
                      <Text style={omStyles.counterBtnText}>{t('vendor.counterOffer', 'Counter Offer')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={omStyles.declineBtn}
                      onPress={() => {
                        setModalVisible(false);
                        setRejectModalVisible(true);
                        setRejectReason("");
                        setRejectLoading(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons name="cancel" size={18} color="#E11D48" />
                      <Text style={omStyles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── ORDER ACCEPTED CONFIRMATION MODAL ── */}
      <Modal visible={acceptedModalVisible} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { paddingBottom: 32, maxHeight: "92%" },
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <View style={amStyles.handle} />

              {/* Success icon */}
              <View style={amStyles.iconCircle}>
                <MaterialIcons name="check-circle" size={52} color="#147538" />
              </View>

              <Text style={amStyles.title}>{t('vendor.orderAcceptedTitle', 'Order Accepted!')}</Text>
              <Text style={amStyles.subtitle}>
                {t('vendor.orderAcceptedSubtitle', '{{orderNumber}} has been confirmed.\nThe customer has been notified.', { orderNumber: selectedOrder?.order_number })}
              </Text>

              {/* Slot info */}
              {selectedOrder?.delivery_slot ? (
                <View style={amStyles.slotCard}>
                  <View style={amStyles.slotIconWrap}>
                    <MaterialIcons name="schedule" size={20} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={amStyles.slotCardLabel}>
                      {t('vendor.deliverySlotRequested', 'Delivery Slot Requested')}
                    </Text>
                    <Text style={amStyles.slotCardTime}>
                      {new Date(
                        selectedOrder.delivery_slot.slot_start,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {new Date(
                        selectedOrder.delivery_slot.slot_end,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Text style={amStyles.slotCardDate}>
                      {new Date(
                        selectedOrder.delivery_slot.slot_start,
                      ).toDateString() === new Date().toDateString()
                        ? t('vendor.today', 'Today')
                        : t('vendor.tomorrow', 'Tomorrow')}
                    </Text>
                  </View>
                  {/* Live countdown */}
                  {!isSlotActive(selectedOrder?.delivery_slot) && (
                    <View style={amStyles.slotLockBadge}>
                      <MaterialIcons
                        name="lock-clock"
                        size={14}
                        color="#D97706"
                      />
                      <Text style={amStyles.slotLockText}>{t('vendor.notYet', 'Not yet')}</Text>
                    </View>
                  )}
                  {isSlotActive(selectedOrder?.delivery_slot) && (
                    <View style={amStyles.slotActiveBadge}>
                      <View style={amStyles.slotActiveDot} />
                      <Text style={amStyles.slotActiveText}>{t('vendor.active', 'Active')}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View
                  style={[
                    amStyles.slotCard,
                    { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
                  ]}
                >
                  <View
                    style={[
                      amStyles.slotIconWrap,
                      { backgroundColor: "#F1F5F9" },
                    ]}
                  >
                    <MaterialIcons
                      name="delivery-dining"
                      size={20}
                      color="#64748B"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[amStyles.slotCardLabel, { color: "#64748B" }]}
                    >
                      {t('vendor.noSlotRequested', 'No specific slot requested')}
                    </Text>
                    <Text
                      style={[
                        amStyles.slotCardTime,
                        { color: "#1F2937", fontSize: 13 },
                      ]}
                    >
                      {t('vendor.deliverAsap', 'Deliver as soon as possible')}
                    </Text>
                  </View>
                </View>
              )}

              {/* What happens next */}
              <View style={amStyles.nextStepsCard}>
                <Text style={amStyles.nextStepsTitle}>{t('vendor.whatHappensNext', 'What happens next?')}</Text>
                <View style={amStyles.nextStep}>
                  <View style={amStyles.nextStepDot} />
                  <Text style={amStyles.nextStepText}>
                    {t('vendor.stepPrepareItems', 'Prepare the order items')}
                  </Text>
                </View>
                <View style={amStyles.nextStep}>
                  <View style={amStyles.nextStepDot} />
                  <Text style={amStyles.nextStepText}>
                    {selectedOrder?.delivery_slot &&
                    !isSlotActive(selectedOrder?.delivery_slot)
                      ? t('vendor.stepAssignRiderSlot', 'Assign a rider once the slot begins')
                      : t('vendor.stepAssignRiderNow', 'Assign a delivery rider now')}
                  </Text>
                </View>
                <View style={amStyles.nextStep}>
                  <View style={amStyles.nextStepDot} />
                  <Text style={amStyles.nextStepText}>
                    {t('vendor.stepMarkReady', 'Mark order ready when packed')}
                  </Text>
                </View>
              </View>

              {/* Buttons */}
              <TouchableOpacity
                style={amStyles.primaryBtn}
                onPress={() => {
                  setAcceptedModalVisible(false);
                  setIsDeliveryModalVisible(true);
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="person-pin" size={18} color="#fff" />
                <Text style={amStyles.primaryBtnText}>
                  {t('vendor.assignDeliveryRider', 'Assign Delivery Rider')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={amStyles.secondaryBtn}
                onPress={() => {
                  setAcceptedModalVisible(false);
                  if (selectedOrder) {
                    const customerName =
                      selectedOrder.customer?.name ||
                      `Customer #${selectedOrder.customer_id}`;
                    setExpandedCustomers((prev) => ({
                      ...prev,
                      [customerName]: true,
                    }));
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={amStyles.secondaryBtnText}>{t('vendor.assignLater', "I'll assign later")}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── VENDOR REVIEW DELIVERY PARTNER MODAL ── */}
      <Modal
        visible={!!vendorReviewOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setVendorReviewOrder(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setVendorReviewOrder(null)}
        >
          <Pressable
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
            onPress={() => {}}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#E2E8F0",
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                fontFamily: "PlusJakartaSans_800ExtraBold",
                color: "#0F172A",
                marginBottom: 4,
              }}
            >
              Rate Delivery Partner
            </Text>
            <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
              {vendorReviewOrder?.delivery?.partner?.user?.name || "Delivery Partner"}
            </Text>

            {/* Star picker */}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginBottom: 20,
                justifyContent: "center",
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setVendorReviewRating(star)}
                >
                  <Text
                    style={{
                      fontSize: 36,
                      opacity: star <= vendorReviewRating ? 1 : 0.25,
                    }}
                  >
                    ⭐
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Comment input */}
            <TextInput
              style={{
                backgroundColor: "#F3F4F6",
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                color: "#111827",
                minHeight: 80,
                textAlignVertical: "top",
                marginBottom: 20,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
              placeholder="Tell us about the delivery experience (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
              value={vendorReviewComment}
              onChangeText={setVendorReviewComment}
            />

            <TouchableOpacity
              onPress={async () => {
                if (vendorReviewRating === 0) {
                  Alert.alert("Please select a rating");
                  return;
                }
                setVendorReviewLoading(true);
                try {
                  const res = await fetch(
                    `${API_BASE}/orders/${vendorReviewOrder.id}/vendor-review`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        vendor_review_rating: vendorReviewRating,
                        vendor_review_comment: vendorReviewComment,
                      }),
                    }
                  );
                  const data = await res.json();
                  if (data.success) {
                    const submittedRating = vendorReviewRating;
                    const submittedComment = vendorReviewComment;
                    setHistory((prev) =>
                      prev.map((o) =>
                        o.id === vendorReviewOrder.id
                          ? {
                              ...o,
                              has_rated_partner: true,
                              vendor_rating: submittedRating,
                              vendor_review_comment: submittedComment,
                            }
                          : o
                      )
                    );
                    setVendorReviewOrder(null);
                    setVendorReviewRating(0);
                    setVendorReviewComment("");
                    fetchHistory(1);
                    Alert.alert("Thank you!", "Your review has been submitted.");
                  }
                } catch (e) {
                  Alert.alert("Error", "Failed to submit review.");
                } finally {
                  setVendorReviewLoading(false);
                }
              }}
              disabled={vendorReviewLoading}
              style={{
                backgroundColor: vendorReviewLoading ? "#E5E7EB" : "#16A34A",
                borderRadius: 14,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "800",
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                }}
              >
                {vendorReviewLoading ? "Submitting..." : "Submit Review"}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── VIEW SUBMITTED VENDOR RATING SLIDE-UP MODAL ── */}
      <Modal
        visible={!!viewVendorRatingOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setViewVendorRatingOrder(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setViewVendorRatingOrder(null)}
        >
          <Pressable
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
            onPress={() => {}}
          >
            {/* Handle */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#E2E8F0",
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#0F172A" }}>
                Your Submitted Rating
              </Text>
              <TouchableOpacity onPress={() => setViewVendorRatingOrder(null)} style={{ padding: 4 }}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: "#94A3B8", fontFamily: "PlusJakartaSans_500Medium", marginBottom: 20 }}>
              {viewVendorRatingOrder?.delivery?.partner?.user?.name || "Delivery Partner"} · {formatOrderTime(viewVendorRatingOrder?.created_at)}
            </Text>

            {/* Rating Stars & Details Card */}
            {viewVendorRatingLoading ? (
              <View style={{ padding: 30, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color="#16A34A" size="small" />
                <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 10 }}>Fetching your review…</Text>
              </View>
            ) : (() => {
              const ratingVal = fetchedVendorRating?.rating || viewVendorRatingOrder?.vendor_rating || 5;
              const num = typeof ratingVal === "number" ? ratingVal : parseInt(ratingVal, 10) || 5;
              const comment = fetchedVendorRating?.comment || viewVendorRatingOrder?.vendor_review_comment || "";

              return (
                <View
                  style={{
                    backgroundColor: "#F8FAFC",
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    borderRadius: 16,
                    padding: 20,
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, justifyContent: "center" }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Text
                        key={star}
                        style={{
                          fontSize: 36,
                          opacity: star <= num ? 1 : 0.25,
                        }}
                      >
                        ⭐
                      </Text>
                    ))}
                  </View>

                  <Text style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#0F172A", marginBottom: comment ? 12 : 0 }}>
                    {num} out of 5 stars
                  </Text>

                  {comment ? (
                    <View
                      style={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        width: "100%",
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#1F2937", lineHeight: 20 }}>
                        {comment}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", marginTop: 4 }}>
                      No written comment provided
                    </Text>
                  )}
                </View>
              );
            })()}

            <TouchableOpacity
              onPress={() => setViewVendorRatingOrder(null)}
              style={{
                backgroundColor: "#16A34A",
                borderRadius: 14,
                padding: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFFFFF" }}>
                Close
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* COUNTER MODAL */}

      <Modal visible={counterModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              { paddingHorizontal: 0, paddingTop: 0 },
            ]}
          >
            {/* Handle */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: "#E2E8F0",
                borderRadius: 999,
                alignSelf: "center",
                marginTop: 12,
                marginBottom: 0,
              }}
            />

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F1F5F9",
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#0F172A",
                    letterSpacing: -0.3,
                  }}
                >
                  {t('vendor.counterOffer', 'Counter Offer')}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                  {selectedOrder?.order_number}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCounterModalVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#F1F5F9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Live Total Card */}
              <View
                style={{
                  margin: 16,
                  padding: 16,
                  backgroundColor: "#0F172A",
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                      fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    {t('vendor.newTotal', 'New Total')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff",
                      letterSpacing: -1,
                      marginTop: 2,
                    }}
                  >
                    ₹
                    {(
                      counterItems.reduce(
                        (sum, item) =>
                          item.available
                            ? sum + item.new_quantity * item.product_price
                            : sum,
                        0,
                      ) + parseFloat(counterDeliveryFee || 0)
                    ).toFixed(0)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <View
                    style={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text
                      style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
                    >
                      {t('vendor.items', 'Items')}: ₹
                      {counterItems
                        .reduce(
                          (sum, item) =>
                            item.available
                              ? sum + item.new_quantity * item.product_price
                              : sum,
                          0,
                        )
                        .toFixed(0)}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text
                      style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
                    >
                      {t('vendor.deliveryFee', 'Delivery')}: ₹
                      {parseFloat(counterDeliveryFee || 0).toFixed(0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Section: Items */}
              <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#94A3B8",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  {t('vendor.adjustItems', 'Adjust Items')}
                </Text>
                {counterItems.map((item, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1.5,
                      borderColor:
                        item.new_quantity === 0
                          ? "#FCA5A5"
                          : item.new_quantity < item.quantity
                            ? "#FDE68A"
                            : "#E2E8F0",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Image
                        source={{
                          uri:
                            item.product?.image_url ||
                            "https://cdn-icons-png.flaticon.com/512/1046/1046784.png",
                        }}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 10,
                          backgroundColor: "#F1F5F9",
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            {
                              fontSize: 14,
                              fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#1F2937",
                            },
                            item.new_quantity === 0 && {
                              textDecorationLine: "line-through",
                              color: "#9CA3AF",
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.product_name}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 3,
                          }}
                        >
                          <Text style={{ fontSize: 12, color: "#64748B" }}>
                            ₹{item.product_price}/{item.unit || "unit"}
                          </Text>
                          <View
                            style={{
                              width: 3,
                              height: 3,
                              borderRadius: 2,
                              backgroundColor: "#CBD5E1",
                            }}
                          />
                          <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                            {t('vendor.orig', 'Orig')}: {item.quantity}
                          </Text>
                        </View>
                        {item.new_quantity > 0 && (
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#059669",
                              marginTop: 2,
                            }}
                          >
                            {t('vendor.subtotal', 'Subtotal')}: ₹
                            {(item.new_quantity * item.product_price).toFixed(
                              0,
                            )}
                          </Text>
                        )}
                        {item.new_quantity === 0 && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 3,
                            }}
                          >
                            <MaterialIcons
                              name="cancel"
                              size={12}
                              color="#EF4444"
                            />
                            <Text
                              style={{
                                fontSize: 11,
                                color: "#EF4444",
                                fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"}}
                            >
                              {t('vendor.removedFromOrder', 'Removed from order')}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Qty controls */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 0,
                          backgroundColor: "#F8FAFC",
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          overflow: "hidden",
                        }}
                      >
                        <TouchableOpacity
                          style={{
                            width: 40,
                            height: 40,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor:
                              item.new_quantity <= 0 ? "#F1F5F9" : "#FEF2F2",
                          }}
                          onPress={() =>
                            updateItemQty(index, item.new_quantity - 1)
                          }
                        >
                          <MaterialIcons
                            name={
                              item.new_quantity <= 1
                                ? "delete-outline"
                                : "remove"
                            }
                            size={18}
                            color={
                              item.new_quantity <= 0 ? "#CBD5E1" : "#EF4444"
                            }
                          />
                        </TouchableOpacity>
                        <View
                          style={{
                            paddingHorizontal: 20,
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 52,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#1F2937",
                            }}
                          >
                            {item.new_quantity}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{
                            width: 40,
                            height: 40,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#F0FDF4",
                          }}
                          onPress={() =>
                            updateItemQty(index, item.new_quantity + 1)
                          }
                        >
                          <MaterialIcons name="add" size={18} color="#16A34A" />
                        </TouchableOpacity>
                      </View>

                      {item.new_quantity !== item.quantity && (
                        <TouchableOpacity
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            backgroundColor: "#F1F5F9",
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                          onPress={() => updateItemQty(index, item.quantity)}
                        >
                          <MaterialIcons
                            name="refresh"
                            size={13}
                            color="#64748B"
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#64748B",
                              fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"}}
                          >
                            {t('vendor.reset', 'Reset')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Delivery Fee */}
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#94A3B8",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  {t('vendor.deliveryFee', 'Delivery Fee')}
                </Text>
                <View
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: "#E2E8F0",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    gap: 10,
                    minHeight: 52,
                  }}
                >
                  <MaterialIcons
                    name="delivery-dining"
                    size={20}
                    color="#147538"
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#374151",
                    }}
                  >
                    ₹
                  </Text>
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 18,
                      fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#1F2937",
                      paddingVertical: 14,
                    }}
                    value={counterDeliveryFee}
                    onChangeText={setCounterDeliveryFee}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#CBD5E1"
                  />
                  {counterDeliveryFee !== "" &&
                    parseFloat(counterDeliveryFee) !==
                      (selectedOrder?.delivery_fee || 0) && (
                      <View
                        style={{
                          backgroundColor: "#FEF3C7",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          flexShrink: 0,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#D97706",
                            fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"}}
                        >
                          {t('vendor.wasFee', 'Was ₹{{fee}}', { fee: selectedOrder?.delivery_fee })}
                        </Text>
                      </View>
                    )}
                </View>
              </View>

              {/* Delivery Slot */}
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#94A3B8",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {t('vendor.deliverySlot', 'Delivery Slot')}
                </Text>
                {selectedOrder?.delivery_slot?.slot_start && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: "#FEF3C7",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: "#FDE68A",
                    }}
                  >
                    <MaterialIcons name="person" size={14} color="#D97706" />
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#92400E",
                        fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", flex: 1,
                      }}
                    >
                      {t('vendor.customerRequested', 'Customer requested')}:{" "}
                      <Text style={{ fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"}}>
                        {new Date(
                          selectedOrder.delivery_slot.slot_start,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" – "}
                        {new Date(
                          selectedOrder.delivery_slot.slot_end,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: "#E2E8F0",
                    overflow: "hidden",
                  }}
                >
                  {/* Day Selector */}
                  <View
                    style={{
                      flexDirection: "row",
                      backgroundColor: "#F8FAFC",
                      borderBottomWidth: 1,
                      borderBottomColor: "#F1F5F9",
                    }}
                  >
                    {["today", "tomorrow"].map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          alignItems: "center",
                          backgroundColor:
                            counterSlotDay === day ? "#fff" : "transparent",
                          borderBottomWidth: counterSlotDay === day ? 2 : 0,
                          borderBottomColor: "#147538",
                        }}
                        onPress={() => setCounterSlotDay(day)}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: counterSlotDay === day ? "800" : "600",
                            color:
                              counterSlotDay === day ? "#147538" : "#64748B",
                          }}
                        >
                          {day === "today" ? t('vendor.today', 'Today') : t('vendor.tomorrow', 'Tomorrow')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Time Row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#94A3B8",
                          fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {t('vendor.start', 'Start')}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#F8FAFC",
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          paddingHorizontal: 12,
                        }}
                      >
                        <MaterialIcons
                          name="access-time"
                          size={16}
                          color="#94A3B8"
                          style={{ marginRight: 6 }}
                        />
                        <TextInput
                          style={{
                            flex: 1,
                            fontSize: 16,
                            fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#1F2937",
                            paddingVertical: 10,
                          }}
                          value={counterSlotStart}
                          onChangeText={setCounterSlotStart}
                          placeholder="HH:MM"
                          placeholderTextColor="#CBD5E1"
                          keyboardType="numbers-and-punctuation"
                        />
                      </View>
                    </View>
                    <View style={{ alignItems: "center", paddingTop: 20 }}>
                      <MaterialIcons
                        name="arrow-forward"
                        size={18}
                        color="#CBD5E1"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#94A3B8",
                          fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", marginBottom: 6,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {t('vendor.end', 'End')}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#F8FAFC",
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: "#E2E8F0",
                          paddingHorizontal: 12,
                        }}
                      >
                        <MaterialIcons
                          name="access-time"
                          size={16}
                          color="#94A3B8"
                          style={{ marginRight: 6 }}
                        />
                        <TextInput
                          style={{
                            flex: 1,
                            fontSize: 16,
                            fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#1F2937",
                            paddingVertical: 10,
                          }}
                          value={counterSlotEnd}
                          onChangeText={setCounterSlotEnd}
                          placeholder="HH:MM"
                          placeholderTextColor="#CBD5E1"
                          keyboardType="numbers-and-punctuation"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Quick Slots */}
                  <View
                    style={{
                      flexDirection: "row",
                      paddingHorizontal: 14,
                      paddingBottom: 14,
                      gap: 8,
                    }}
                  >
                    {[
                      { label: "+30m", value: 30 },
                      { label: "+1h", value: 60 },
                      { label: "+2h", value: 120 },
                      { label: "+3h", value: 180 },
                    ].map((slot, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={{
                          flex: 1,
                          backgroundColor: "#ECFDF5",
                          borderRadius: 8,
                          paddingVertical: 7,
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: "#BBF7D0",
                        }}
                        onPress={() => {
                          const now = new Date();
                          const start = new Date(now.getTime() + 10 * 60000);
                          const end = new Date(
                            start.getTime() + slot.value * 60000,
                          );
                          const fmt = (d) =>
                            `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
                          setCounterSlotStart(fmt(start));
                          setCounterSlotEnd(fmt(end));
                          setCounterSlotDay("today");
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#059669",
                          }}
                        >
                          {slot.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: "#F1F5F9",
                        borderRadius: 8,
                        paddingVertical: 7,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                      }}
                      onPress={() => {
                        setCounterSlotStart("");
                        setCounterSlotEnd("");
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#6B7280",
                        }}
                      >
                        {t('vendor.clear', 'Clear')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Note */}
              <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#94A3B8",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  {t('vendor.noteToCustomer', 'Note to Customer (Optional)')}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: "#E2E8F0",
                    padding: 14,
                    fontSize: 14,
                    color: "#1F2937",
                    minHeight: 90,
                    textAlignVertical: "top",
                    lineHeight: 20,
                  }}
                  value={counterNote}
                  onChangeText={setCounterNote}
                  multiline
                  placeholder={t('vendor.notePlaceholder', 'E.g. Some items are out of stock, adjusted quantities accordingly...')}
                  placeholderTextColor="#CBD5E1"
                  numberOfLines={3}
                />
              </View>

              {/* Send Button */}
              <View style={{ paddingHorizontal: 16 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#147538",
                    borderRadius: 14,
                    paddingVertical: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    shadowColor: "#147538",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                  onPress={sendCounterOffer}
                >
                  <MaterialIcons name="swap-horiz" size={20} color="#fff" />
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"}}
                  >
                    {t('vendor.sendCounterOffer', 'Send Counter Offer')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* REJECT MODAL */}
      <Modal visible={rejectModalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { paddingBottom: 40 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('vendor.rejectOrderTitle', 'Reject Order')}</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ marginBottom: 12, color: "#4B5563", fontSize: 15 }}>
              {t('vendor.rejectReasonInstruction', 'Please provide a reason for declining this order.')}
            </Text>
            <TextInput
              style={styles.note}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              placeholder={t('vendor.rejectReasonPlaceholder', 'e.g. Items out of stock, shop closing soon...')}
              numberOfLines={4}
              maxLength={200}
            />
            <TouchableOpacity
              style={{
                backgroundColor: rejectLoading ? "#F87171" : "#EF4444",
                marginTop: 10,
                borderRadius: 10,
                paddingVertical: 14,
                paddingHorizontal: 16,
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                opacity: rejectLoading ? 0.7 : 1,
              }}
              disabled={rejectLoading}
              onPress={() => {
                console.log('[VendorDecline] >>> Button pressed, rejectReason:', JSON.stringify(rejectReason), 'selectedOrder:', selectedOrder?.id);
                Keyboard.dismiss();
                if (!rejectReason || rejectReason.trim().length === 0) {
                  console.log('[VendorDecline] No reason provided, showing alert');
                  Alert.alert(
                    t('vendor.reasonRequired', 'Reason Required'),
                    t('vendor.pleaseProvideReason', 'Please provide a reason for rejecting.'),
                  );
                  return;
                }
                setRejectLoading(true);
                console.log(`[VendorDecline] Vendor declining order #${selectedOrder?.id} (${selectedOrder?.order_number}) — reason: "${rejectReason.trim()}"`);
                setTimeout(async () => {
                  try {
                    const res = await updateOrderStatus(
                      selectedOrder.id,
                      "rejected",
                      rejectReason.trim(),
                    );
                    console.log('[VendorDecline] API response:', res);
                    setRejectModalVisible(false);
                    setRejectReason("");
                    setModalVisible(false);
                  } catch (e) {
                    console.log('[VendorDecline] Error:', e);
                  } finally {
                    setRejectLoading(false);
                  }
                }, 300);
              }}
            >
              <Text
                style={[styles.rejectText, { color: "#fff", fontSize: 16 }]}
              >
                {rejectLoading ? t('vendor.rejecting', 'Rejecting...') : t('vendor.confirmRejection', 'Confirm Rejection')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Vendor Toast Notification ──────────────────────────────────── */}
      {vendorToast.visible && (
        <View
          style={[
            vendorToastStyles.wrap,
            vendorToast.type === "success" && vendorToastStyles.success,
            vendorToast.type === "error" && vendorToastStyles.error,
          ]}
          pointerEvents="none"
        >
          <Text style={vendorToastStyles.text}>{vendorToast.message}</Text>
        </View>
      )}
    </View>
  );
}

const PRIMARY = "#0FF022"; // neon green
const ACCENT = "#F59E0B"; // amber
const PRIMARY_SOFT = "#E9FFE9"; // soft green bg (important)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    fontSize: 26,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", padding: 20,
  },

  orderCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "transparent",
  },

  orderCardPending: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },

  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
    marginRight: 8,
  },

  declinedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },

  orderId: {
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 15,
    color: "#1F2937",
  },

  orderIdPending: {
    color: "#D97706",
  },

  orderTime: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"},

  customer: {
    marginTop: 6,
    fontSize: 14,
    color: "#4B5563",
  },

  items: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 13,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },

  totalContainer: {
    flexDirection: "column",
  },

  totalLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 2,
  },

  total: {
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 18,
    color: "#1F2937",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },

  statusBadgePending: {
    backgroundColor: "#FEF3C7",
  },

  statusBadgeAccepted: {
    backgroundColor: "#DCFCE7",
  },

  statusBadgeCompleted: {
    backgroundColor: "#DCFCE7",
  },

  statusBadgeCancelled: {
    backgroundColor: "#FEE2E2",
  },

  status: {
    color: "#6B7280",
  },

  statusText: {
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 12,
    color: "#6B7280",
  },
  negotiationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: "flex-start",
    gap: 4,
  },
  negotiationText: {
    fontSize: 10,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#D97706",
    letterSpacing: 0.5,
  },

  statusTextPending: {
    color: "#D97706",
  },

  statusTextAccepted: {
    color: "#16A34A",
  },

  statusTextCompleted: {
    color: "#6B7280",
  },

  statusTextCancelled: {
    color: "#DC2626",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},

  sectionTitle: {
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", marginTop: 12,
    marginBottom: 6,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },

  modalTotal: {
    fontSize: 24,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold"},

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  acceptBtn: {
    flex: 1,
    backgroundColor: PRIMARY,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},

  rejectBtn: {
    flex: 1,
    backgroundColor: "#FDECEA",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  rejectText: {
    color: "#E74C3C",
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},

  counterBtn: {
    flex: 1,
    backgroundColor: "#DBEAFE",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  counterText: {
    color: "#2563EB",
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},

  // ── Auto Assign ──
  autoAssignSection: {
    marginBottom: 14,
  },
  autoAssignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
  },
  autoAssignBtnText: {
    color: "#fff",
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 14,
    letterSpacing: 0.3,
  },
  broadcastStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  broadcastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  broadcastText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", flex: 1,
  },

  declinedCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    marginHorizontal: 16,
  },
  declinedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  declinedCardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  declinedCardTitle: {
    fontSize: 14,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#991B1B",
  },
  declinedCardTime: {
    fontSize: 11,
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#B91C1C",
    marginTop: 1,
  },
  declinedCardMsg: {
    fontSize: 13,
    color: "#991B1B",
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 10,
    lineHeight: 19,
  },
  declinedCardPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  declinedCardPhone: {
    fontSize: 12,
    color: "#9F1239",
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold",
  },
  declinedCardDivider: {
    height: 1,
    backgroundColor: "#FECACA",
    marginVertical: 10,
  },
  declinedCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  declinedCardFooterText: {
    flex: 1,
    fontSize: 11,
    color: "#9F1239",
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium",
  },

  counterItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  qtyBtn: {
    backgroundColor: "#F3F4F6",
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  qtyText: {
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 16,
  },

  availabilityBtn: {
    marginTop: 6,
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#E6FFFA",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },

  inputSmall: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#F9FAFB",
    fontSize: 15,
    color: "#1F2937",
  },

  inputLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"},

  slotDayContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 4,
    borderRadius: 10,
    marginBottom: 12,
  },

  slotDayTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },

  slotDayTabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  slotDayTabText: {
    fontSize: 13,
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: "#6B7280",
  },

  slotDayTabActiveText: {
    color: "#111827",
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},

  slotTimeContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },

  quickSlotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  quickSlotChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },

  quickSlotText: {
    fontSize: 12,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#059669",
  },

  note: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    height: 100,
    marginBottom: 20,
    backgroundColor: "#FAFAFA",
  },

  closeBtn: {
    fontSize: 24,
    color: "#6B7280",
    fontWeight: "300",
  },

  counterItemImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },

  counterItemContent: {
    flex: 1,
    marginLeft: 12,
  },

  counterItemName: {
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 14,
    marginBottom: 4,
  },

  counterItemNameStriked: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },

  counterItemNameUnavailable: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },

  counterItemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  originalQty: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  itemPrice: {
    fontSize: 12,
    color: "#6B7280",
  },

  qtyValueContainer: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 40,
    alignItems: "center",
  },

  qtyBtnText: {
    fontSize: 18,
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: "#374151",
  },

  availableBtn: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
  },

  unavailableBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#EF4444",
  },

  availableText: {
    color: "#059669",
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 11,
  },

  unavailableText: {
    color: "#DC2626",
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 11,
  },

  counterItemUnavailable: {
    opacity: 0.6,
  },

  summaryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },

  summaryAmount: {
    fontSize: 28,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#1F2937",
  },

  summaryDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  summaryDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  summaryDetailLabel: {
    color: "#6B7280",
    fontSize: 13,
  },

  summaryDetailValue: {
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 13,
  },

  sendCounterBtn: {
    backgroundColor: PRIMARY,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  deliveryModalOverlay: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  deliveryModalContent: {
    flex: 1,
  },
  assignHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#F8FAFC",
  },

  assignTitle: {
    fontSize: 22,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#1F2937",
  },

  callRiderBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  assignBtnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0F172A",
  },
  assignBtnTextSmall: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  mapWrapper: {
    height: 220,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    marginTop: 10,
  },
  activeStatusBar: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderColor: "#F3F4F6",
  },
  partnersCount: {
    fontSize: 11,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#6B7280",
    letterSpacing: 0.5,
  },
  activeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
    marginRight: 6,
  },
  activeTextStatus: {
    fontSize: 10,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#16A34A",
  },

  // NEW STYLES
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: "#64748B",
  },
  activeTabText: {
    color: "#0F172A",
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  badge: {
    backgroundColor: "#1D4ED8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  slotBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
    gap: 4,
  },
  slotBadgeText: {
    fontSize: 12,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#059669",
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#1F2937",
  },
  requestCustomer: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  requestDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slotRange: {
    fontSize: 14,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#0F172A",
  },
  slotDay: {
    fontSize: 12,
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: "#64748B",
  },
  requestActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  rejectBtnText: {
    color: "#E11D48",
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 14,
  },
  approveBtn: {
    backgroundColor: "#0F172A",
  },
  approveBtnText: {
    color: "#fff",
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 14,
  },

  riderListContainer: {
    padding: 16,
    backgroundColor: "#F8FAFC",
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  riderListTitle: {
    fontSize: 18,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#0F172A",
  },
  liveUpdatesText: {
    fontSize: 10,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#16A34A",
    letterSpacing: 1,
  },
  riderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  firstRiderCard: {
    borderColor: "#22C55E",
    backgroundColor: "#F0FDF4",
  },
  riderInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  riderAvatar: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  riderDetails: {
    flex: 1,
    marginLeft: 14,
  },
  riderName: {
    fontSize: 15,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#1F2937",
  },

  riderStatus: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fastestText: {
    color: "#16A34A",
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},
  callRiderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  assignToOrderBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  assignBtnText: {
    color: "#fff",
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 14,
  },

  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: "#147538",
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  headerBadgeWrap: {
    alignItems: "flex-end",
  },
  headerPendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  headerPendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  headerPendingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  orderCardAccepted: {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  statusBadgePreparing: {
    backgroundColor: "#FEF9C3",
  },
  statusBadgeReady: {
    backgroundColor: "#DCFCE7",
  },
  statusTextPreparing: {
    color: "#CA8A04",
  },
  statusTextReady: {
    color: "#16A34A",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  customerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#147538",
    alignItems: "center",
    justifyContent: "center",
  },
  customerAvatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  customerName: {
    fontSize: 14,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#1F2937",
  },
  totalPill: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  totalPillText: {
    fontSize: 15,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#15803D",
  },
  itemsPreview: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  itemsPreviewText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  actionHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    paddingVertical: 7,
    gap: 4,
    marginTop: 2,
  },
  actionHintText: {
    fontSize: 12,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#D97706",
  },
  customerGroupCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  customerGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  customerGroupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#147538",
    alignItems: "center",
    justifyContent: "center",
  },
  customerGroupAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  customerGroupName: {
    fontSize: 15,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#1F2937",
  },
  customerGroupMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  customerGroupBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#147538",
    alignItems: "center",
    justifyContent: "center",
  },
  customerGroupBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  historyOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
    flexWrap: "nowrap",
  },
  historyOrderNumber: {
    fontSize: 13,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#1F2937",
  },
  historyStatusPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#64748B",
  },
  historyOrderItems: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  historyOrderTime: {
    fontSize: 11,
    color: "#CBD5E1",
    marginTop: 2,
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  historyOrderTotal: {
    fontSize: 15,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#1F2937",
  },
  ratePartnerBtn: {
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  ratePartnerBtnText: {
    fontSize: 11,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#D97706",
  },
  ratedBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  ratedBadgeText: {
    fontSize: 11,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#16A34A",
  },
  activeOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 8,
  },
});

const silverMapStyle = [
  {
    elementType: "geometry",
    stylers: [
      {
        color: "#f5f5f5",
      },
    ],
  },
  {
    elementType: "labels.icon",
    stylers: [
      {
        visibility: "off",
      },
    ],
  },
  {
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#616161",
      },
    ],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [
      {
        color: "#f5f5f5",
      },
    ],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#bdbdbd",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [
      {
        color: "#eeeeee",
      },
    ],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [
      {
        color: "#e5e5e5",
      },
    ],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9e9e9e",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [
      {
        color: "#ffffff",
      },
    ],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#757575",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#dadada",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#616161",
      },
    ],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9e9e9e",
      },
    ],
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [
      {
        color: "#e5e5e5",
      },
    ],
  },
  {
    featureType: "transit.station",
    elementType: "geometry",
    stylers: [
      {
        color: "#eeeeee",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [
      {
        color: "#c9c9c9",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#9e9e9e",
      },
    ],
  },
];

// ─── Vendor Toast StyleSheet ──────────────────────────────────────────────────
const vendorToastStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    maxWidth: 400,
    backgroundColor: "#1F2937",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    zIndex: 9999,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  success: { backgroundColor: "#16A34A" },
  error: { backgroundColor: "#DC2626" },
  info: { backgroundColor: "#1D4ED8" },
  text: { color: "#fff", fontSize: 14, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", lineHeight: 20 },
});

const dmStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#147538",
    paddingTop: Platform.OS === "ios" ? 56 : Platform.OS === "web" ? 24 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  headerBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff",
    letterSpacing: 0.8,
  },
  orderStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  orderStripLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  orderStripAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#147538",
    alignItems: "center",
    justifyContent: "center",
  },
  orderStripAvatarText: {
    color: "#fff",
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 15,
  },
  orderStripName: {
    fontSize: 14,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#1F2937",
  },
  orderStripItems: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium", maxWidth: 220,
  },
  orderStripRight: {
    alignItems: "flex-end",
  },
  orderStripTotal: {
    fontSize: 17,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#147538",
  },
  mapCard: {
    margin: 16,
    borderRadius: 18,
    overflow: "hidden",
    height: 200,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: "relative",
  },
  mapOverlayBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  mapOverlayText: {
    fontSize: 12,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#147538",
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#0F172A",
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#16A34A",
    letterSpacing: 0.8,
  },
  slotBannerLocked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  slotBannerTitle: {
    fontSize: 13,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#92400E",
  },
  slotBannerSub: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  slotBannerActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  slotBannerActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  slotBannerActiveText: {
    fontSize: 13,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#166534",
  },
  autoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#147538",
    shadowColor: "#147538",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  autoBtnDisabled: {
    borderColor: "#E2E8F0",
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.5,
  },
  autoBtnIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  autoBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#147538",
  },
  broadcastBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  broadcastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  broadcastText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", flex: 1,
  },
  declinedCard: {
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  declinedCardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#DC2626",
  },
  declinedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  declinedCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  declinedCardTitle: {
    fontSize: 15,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#991B1B",
    letterSpacing: -0.2,
  },
  declinedCardTime: {
    fontSize: 12,
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#B91C1C",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  declinedCardMsg: {
    fontSize: 13,
    color: "#7F1D1D",
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 10,
    lineHeight: 20,
  },
  declinedCardPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  declinedCardPhone: {
    fontSize: 12,
    color: "#9F1239",
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold",
  },
  declinedCardDivider: {
    height: 1,
    backgroundColor: "#FECDD3",
    marginVertical: 10,
  },
  declinedCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFE4E6",
    padding: 8,
    borderRadius: 8,
  },
  declinedCardFooterText: {
    flex: 1,
    fontSize: 11,
    color: "#9F1239",
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold",
    lineHeight: 16,
  },
  riderCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
    overflow: "hidden",
  },
  riderCardFirst: {
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  riderTopBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#147538",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  riderTopBadgeText: {
    fontSize: 9,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff",
    letterSpacing: 0.5,
  },
  riderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  riderAvatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  riderName: {
    fontSize: 15,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#1F2937",
  },
  riderMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  riderDist: {
    fontSize: 12,
    color: "#147538",
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", marginLeft: 2,
  },
  riderStatus: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  assignBtn: {
    backgroundColor: "#147538",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: "#147538",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  assignBtnDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  assignBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  emptyRiders: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyRidersText: {
    fontSize: 15,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#374151",
  },
  emptyRidersSub: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 24,
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  markReadyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  markReadyText: {
    fontSize: 14,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#147538",
  },
});

const omStyles = StyleSheet.create({
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orderNum: {
    fontSize: 18,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#0F172A",
    letterSpacing: -0.3,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    margin: 16,
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  customerAvatarLg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#147538",
    alignItems: "center",
    justifyContent: "center",
  },
  customerAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  customerName: {
    fontSize: 15,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#1F2937",
  },
  customerPhone: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  orderTimeText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"},
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#94A3B8",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#1F2937",
  },
  itemQty: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#1F2937",
  },
  priceCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  priceValue: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"},
  priceDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 8,
  },
  priceTotalLabel: {
    fontSize: 15,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#0F172A",
  },
  priceTotalValue: {
    fontSize: 18,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#147538",
  },
  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  slotLabel: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"},
  slotTime: {
    fontSize: 14,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#065F46",
    marginTop: 2,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  noteText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium", flex: 1,
    lineHeight: 20,
  },
  declinedNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  declinedNoticeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  declinedNoticeTitle: {
    fontSize: 13,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#991B1B",
  },
  declinedNoticeMsg: {
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 2,
    lineHeight: 18,
  },
  declinedNoticeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#DC2626",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
    marginTop: 10,
  },
  declinedNoticeBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold",
  },
  actionsWrap: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  actionsLabel: {
    fontSize: 11,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#94A3B8",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#147538",
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#147538",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    width: "100%",
  },
  acceptBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", flexShrink: 1,
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  counterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    minWidth: 0,
  },
  counterBtnText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", flexShrink: 1,
    textAlign: "center",
  },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF1F2",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECDD3",
    minWidth: 0,
  },
  declineBtnText: {
    color: "#E11D48",
    fontSize: 13,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", flexShrink: 1,
    textAlign: "center",
  },
});

const amStyles = StyleSheet.create({
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 16,
    shadowColor: "#147538",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  slotIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  slotCardLabel: {
    fontSize: 11,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  slotCardTime: {
    fontSize: 16,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#065F46",
    marginTop: 2,
  },
  slotCardDate: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 2,
  },
  slotLockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  slotLockText: {
    fontSize: 11,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#D97706",
  },
  slotActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  slotActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  slotActiveText: {
    fontSize: 11,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "#16A34A",
  },
  nextStepsCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  nextStepsTitle: {
    fontSize: 12,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  nextStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nextStepDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#147538",
  },
  nextStepText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", flex: 1,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#147538",
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#147538",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"},
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginHorizontal: 16,
  },
  secondaryBtnText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"},
});
