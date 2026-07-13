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
} from "react-native";
import { Linking } from "react-native";

import VendorMapView from "../../components/VendorMapView";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { io } from "socket.io-client";
import useOrderSound from "../../hooks/useOrderSound";
import { useRoute } from "@react-navigation/native";

const { width } = Dimensions.get("window");

import useAuthStore from "../../store/authStore";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3000";

export default function VendorOrdersScreen() {
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
  const [liveRiderLocations, setLiveRiderLocations] = useState({});
  const [nearbyRiders, setNearbyRiders] = useState([]);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState(null); // { count, message }

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

  // ── Demand Surcharge (vendor can set surge % for rain/peak hours) ─────────
  const [demandSurcharge, setDemandSurcharge] = useState(0);   // current %
  const [surchargeInput, setSurchargeInput] = useState('0');
  const [surchargeLoading, setSurchargeLoading] = useState(false);
  const [showSurchargeEdit, setShowSurchargeEdit] = useState(false);
  const [vendorId, setVendorId] = useState(null);

  const ordersRef = useRef(orders);
  const selectedOrderRef = useRef(selectedOrder);
  const updateOrderStatusRef = useRef(null);

  // Fetch vendor profile to read current demand_surcharge_pct
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/vendors/me/profile`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        const v = json.data?.vendor || json.vendor;
        if (v) {
          setVendorId(v.id);
          const pct = v.demand_surcharge_pct ?? 0;
          setDemandSurcharge(pct);
          setSurchargeInput(String(pct));
        }
      } catch (e) { console.warn('vendor profile fetch:', e.message); }
    })();
  }, [token]);

  const saveDemandSurcharge = async (pct) => {
    if (!vendorId) return;
    setSurchargeLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ demand_surcharge_pct: parseFloat(pct) || 0 }),
      });
      if (res.ok) {
        setDemandSurcharge(parseFloat(pct) || 0);
        setShowSurchargeEdit(false);
        setVendorToast({ visible: true, message: `Demand surcharge set to ${pct}%`, type: 'success' });
      }
    } catch (e) { console.warn('save surcharge:', e.message); }
    finally { setSurchargeLoading(false); }
  };

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

  // Fetch nearby riders when modal opens and storeLocation is available
  useEffect(() => {
    if (isDeliveryModalVisible && storeLocation) {
      fetchNearbyRiders();
      setBroadcastStatus(null);
    }
  }, [isDeliveryModalVisible]);

  const fetchNearbyRiders = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/delivery/nearby?latitude=${storeLocation.latitude}&longitude=${storeLocation.longitude}&radius_km=10&_t=${Date.now()}`,
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
        status: "Available",
        image: "https://cdn-icons-png.flaticon.com/512/3208/3208726.png",
        coordinate: {
          latitude: r.latitude,
          longitude: r.longitude,
        },
        distance: `${r.distance_km} km`,
        fastest: i === 0,
      }));

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
        Alert.alert("Success", "Rider assigned successfully");
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrder.id
              ? { ...o, delivery: result.data.delivery }
              : o,
          ),
        );
        setSelectedOrder((prev) => ({
          ...prev,
          delivery: result.data.delivery,
        }));
      } else {
        Alert.alert("Error", result.message || "Failed to assign rider");
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
      const res = await fetch(`${API_BASE}/slots/vendor/requests?_t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
      const result = await res.json();
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
        const orders = result.data?.data || result.data?.orders || [];
        setHistoryTotal(result.data?.total || 0);
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
  }, []);

  // Socket setup for real-time negotiation
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("delivery:declined", (data) => {
      console.log("Delivery declined:", data);
      fetchOrdersRef.current?.();
      if (selectedOrderRef.current && Number(selectedOrderRef.current.id) === Number(data.order_id)) {
        setBroadcastStatus({
          count: 0,
          message: `${data.partner_name} has declined this request.`,
          type: "declined",
        });
      }

      let customerPhone = null;
      let customerName = "the customer";
      const ordersList = ordersRef.current || [];
      const order = ordersList.find(o => Number(o.id) === Number(data.order_id)) || selectedOrderRef.current;
      if (order && Number(order.id) === Number(data.order_id) && order.customer) {
        customerPhone = order.customer.phone;
        customerName = order.customer.name || customerName;
      }

      Alert.alert(
        "Delivery Request Declined",
        `${data.partner_name} has declined. You can move on to another delivery partner of that area or deliver the order yourself.`,
        [
          {
            text: `Call Partner (${data.partner_name})`,
            onPress: () => {
              if (data.partner_phone && data.partner_phone !== 'N/A') {
                Linking.openURL(`tel:${data.partner_phone}`);
              } else {
                Alert.alert("Error", "No phone number available for this partner.");
              }
            }
          },
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
    socket.on("order_assigned_to_delivery", () => fetchOrdersRef.current?.());
    socket.on("delivery_status_update", () => {
      fetchOrdersRef.current?.();
      fetchHistoryRef.current?.(1);
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
          new_quantity: i.quantity,
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
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Groups a flat order array by customer name
  const groupByCustomer = (orders) => {
    const map = {};
    orders.forEach((order) => {
      const key = order.customer?.name || `Customer #${order.customer_id}`;
      if (!map[key]) map[key] = { name: key, orders: [], total: 0 };
      map[key].orders.push(order);
      map[key].total += order.total || 0;
    });
    return Object.values(map).sort((a, b) => b.orders.length - a.orders.length);
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
          <Text style={styles.screenTitle}>Orders</Text>
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

      {/* ── DEMAND SURCHARGE BANNER ── */}
      <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
        {showSurchargeEdit ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#FDE68A' }}>
            <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '700', flex: 1 }}>Set surge %</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, fontSize: 14, fontWeight: '700', width: 64, textAlign: 'center', backgroundColor: '#FFF' }}
              keyboardType="numeric"
              value={surchargeInput}
              onChangeText={setSurchargeInput}
              maxLength={3}
            />
            <TouchableOpacity
              style={{ backgroundColor: '#D97706', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
              onPress={() => saveDemandSurcharge(surchargeInput)}
              disabled={surchargeLoading}
            >
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>{surchargeLoading ? '...' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSurchargeEdit(false)}>
              <Text style={{ color: '#92400E', fontSize: 18, fontWeight: '700' }}>×</Text>
            </TouchableOpacity>
          </View>
        ) : demandSurcharge > 0 ? (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 10, borderWidth: 1.5, borderColor: '#F59E0B' }}
            onPress={() => setShowSurchargeEdit(true)}
            activeOpacity={0.8}
          >
            <Feather name="cloud-rain" size={16} color="#92400E" />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#92400E' }}>Demand surcharge ACTIVE: +{demandSurcharge}% on delivery</Text>
            <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '600' }}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#E5E7EB' }}
            onPress={() => setShowSurchargeEdit(true)}
            activeOpacity={0.8}
          >
            <Feather name="zap" size={13} color="#9CA3AF" />
            <Text style={{ fontSize: 12, color: '#9CA3AF', flex: 1 }}>Set demand surcharge (rain, peak hours...)</Text>
            <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '700' }}>+ Add</Text>
          </TouchableOpacity>
        )}
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
            Active
          </Text>
          {orders.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{orders.length}</Text>
            </View>
          )}
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
            Requests
          </Text>
          {requests.phones.length + requests.slots.length > 0 && (
            <View style={[styles.badge, { backgroundColor: "#D97706" }]}>
              <Text style={styles.badgeText}>
                {requests.phones.length + requests.slots.length}
              </Text>
            </View>
          )}
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
            History
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
              else if (activeTab === "requests") fetchRequests();
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
                No pending requests
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
                        .map((i) => `${i.quantity}× ${i.product_name}`)
                        .join(" · ")}
                    </Text>
                    <Text style={styles.historyOrderTime}>
                      {formatOrderTime(order.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.historyOrderTotal}>₹{order.total}</Text>
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
                        <Text
                          style={[
                            styles.historyOrderNumber,
                            order.status === "pending" && { color: "#D97706" },
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
                          .map((i) => `${i.quantity}× ${i.product_name}`)
                          .join(" · ")}
                      </Text>
                      <Text style={styles.orderTime}>
                        {formatOrderTime(order.created_at)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={styles.totalPillText}>₹{order.total}</Text>
                      {order.delivery_slot && (
                        <View style={[styles.slotBadge, { marginTop: 0 }]}>
                          <Text style={styles.slotBadgeText}>
                            {new Date(
                              order.delivery_slot.slot_start ||
                                order.delivery_slot.start,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                      )}
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={18}
                      color="#9CA3AF"
                      style={{ marginLeft: 4 }}
                    />
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
                    New Order Request
                  </Text>
                  <Text style={styles.requestCustomer}>
                    {item.customer?.name || `Customer #${item.customer_id}`}
                  </Text>
                </View>
                <Text style={styles.orderTime}>
                  {formatOrderTime(item.created_at)}
                </Text>
              </View>

              <View style={styles.requestDetails}>
                <Text style={styles.slotRange} numberOfLines={1}>
                  {(item.items || []).map((i) => `${i.quantity}× ${i.product_name}`).join(" · ")}
                </Text>
                <Text style={styles.slotDay}>
                  ₹{item.total}
                </Text>
              </View>

              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => {
                    updateOrderStatus(item.id, "rejected");
                  }}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => {
                    updateOrderStatus(item.id, "accepted");
                  }}
                >
                  <Text style={styles.approveBtnText}>Accept</Text>
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
                          {req.status.charAt(0).toUpperCase() +
                            req.status.slice(1)}
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
                          Reject
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
                          Approve
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
                      ? "Today"
                      : "Tomorrow"}
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
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() =>
                    item.type === "phone"
                      ? handlePhoneRequest(item.id, "approved")
                      : handleSlotRequest(item.id, "confirm")
                  }
                >
                  <Text style={styles.approveBtnText}>Approve</Text>
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
              <Text style={dmStyles.headerTitle}>Assign Rider</Text>
              <Text style={dmStyles.headerSub}>
                {selectedOrder?.order_number}
              </Text>
            </View>
            <View style={dmStyles.headerBadge}>
              <View style={dmStyles.headerBadgeDot} />
              <Text style={dmStyles.headerBadgeText}>LIVE</Text>
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
                    .map((i) => `${i.quantity}× ${i.product_name}`)
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

          <ScrollView
            bounces={false}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── MAP ── */}
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
                  {riders.length} partner{riders.length !== 1 ? "s" : ""} nearby
                </Text>
              </View>
            </View>

            {/* ── RIDERS SECTION ── */}
            <View style={dmStyles.section}>
              <View style={dmStyles.sectionHeader}>
                <Text style={dmStyles.sectionTitle}>Available Riders</Text>
                <View style={dmStyles.liveChip}>
                  <View style={dmStyles.liveDot} />
                  <Text style={dmStyles.liveText}>LIVE</Text>
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
                        Slot not started yet
                      </Text>
                      <Text style={dmStyles.slotBannerSub}>
                        Starts at{" "}
                        {new Date(
                          selectedOrder.delivery_slot.vendor_slot_start ||
                            selectedOrder.delivery_slot.slot_start,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
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
                      Slot is active — assign a rider now
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
                      ? "Broadcasting to riders…"
                      : "Auto Assign Nearby Rider"}
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color="#147538"
                  />
                </TouchableOpacity>
              )}

              {broadcastStatus && (
                <View
                  style={[
                    dmStyles.broadcastBanner,
                    broadcastStatus.type === "declined" && {
                      backgroundColor: "#FEE2E2",
                      borderColor: "#FCA5A5",
                    },
                  ]}
                >
                  <View
                    style={[
                      dmStyles.broadcastDot,
                      broadcastStatus.type === "declined" && {
                        backgroundColor: "#EF4444",
                      },
                    ]}
                  />
                  <Text
                    style={[
                      dmStyles.broadcastText,
                      broadcastStatus.type === "declined" && {
                        color: "#991B1B",
                      },
                    ]}
                  >
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
                      {rider.status === "Available" && (
                        <TouchableOpacity
                          style={[
                            dmStyles.assignBtn,
                            !isSlotActive(selectedOrder?.delivery_slot) &&
                              dmStyles.assignBtnDisabled,
                          ]}
                          onPress={() => handleAssignRider(rider.id)}
                          disabled={!isSlotActive(selectedOrder?.delivery_slot)}
                        >
                          <Text style={dmStyles.assignBtnText}>
                            {!isSlotActive(selectedOrder?.delivery_slot)
                              ? "Locked"
                              : "Assign"}
                          </Text>
                        </TouchableOpacity>
                      )}
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
                <Text style={omStyles.sectionLabel}>Order Items</Text>
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
                        {item.quantity} × ₹{item.product_price}
                      </Text>
                    </View>
                    <Text style={omStyles.itemTotal}>₹{(item.quantity * parseFloat(item.product_price)).toFixed(2).replace(/\.00$/, '')}</Text>
                  </View>
                ))}
              </View>

              {/* Price Breakdown */}
              <View style={omStyles.priceCard}>
                <View style={omStyles.priceRow}>
                  <Text style={omStyles.priceLabel}>Subtotal</Text>
                  <Text style={omStyles.priceValue}>
                    ₹{selectedOrder?.subtotal}
                  </Text>
                </View>
                <View style={omStyles.priceRow}>
                  <Text style={omStyles.priceLabel}>Delivery Fee</Text>
                  <Text style={omStyles.priceValue}>
                    ₹{selectedOrder?.delivery_fee}
                  </Text>
                </View>
                {selectedOrder?.discount > 0 && (
                  <View style={omStyles.priceRow}>
                    <Text style={[omStyles.priceLabel, { color: "#16A34A" }]}>
                      Discount
                    </Text>
                    <Text style={[omStyles.priceValue, { color: "#16A34A" }]}>
                      -₹{selectedOrder?.discount}
                    </Text>
                  </View>
                )}
                <View style={omStyles.priceDivider} />
                <View style={omStyles.priceRow}>
                  <Text style={omStyles.priceTotalLabel}>Total</Text>
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
                      Requested Delivery Slot
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

              {/* Actions — for accepted/preparing/ready */}
              {["accepted", "preparing", "ready", "picked_up"].includes(
                selectedOrder?.status,
              ) && (
                <View style={omStyles.actionsWrap}>
                  <Text style={omStyles.actionsLabel}>Manage Order</Text>
                  <TouchableOpacity
                    style={omStyles.acceptBtn}
                    onPress={() => {
                      setModalVisible(false);
                      setIsDeliveryModalVisible(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="person-pin" size={20} color="#fff" />
                    <Text style={omStyles.acceptBtnText}>Manage Delivery</Text>
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
                      I'll assign later
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
                          Mark Preparing
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
                          Mark Ready
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
                      <Text style={omStyles.acceptBtnText}>Mark as Ready</Text>
                    </TouchableOpacity>
                  )}
                  {selectedOrder?.status === "ready" && (
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
                      <Text style={omStyles.acceptBtnText}>Deliver It Yourself (Self Delivery)</Text>
                    </TouchableOpacity>
                  )}

                  {selectedOrder?.status === "picked_up" && (
                    <TouchableOpacity
                      style={[
                        omStyles.acceptBtn,
                        { backgroundColor: "#16A34A", marginTop: 8 },
                      ]}
                      onPress={() => {
                        updateOrderStatus(selectedOrder.id, "delivered");
                        setModalVisible(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name="done-all"
                        size={20}
                        color="#fff"
                      />
                      <Text style={omStyles.acceptBtnText}>Mark as Delivered</Text>
                    </TouchableOpacity>
                  )}

                </View>
              )}

              {/* Actions — only for pending */}
              {selectedOrder?.status === "pending" && (
                <View style={omStyles.actionsWrap}>
                  <Text style={omStyles.actionsLabel}>Respond to Order</Text>

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
                    <Text style={omStyles.acceptBtnText}>Accept Order</Text>
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
                      <Text style={omStyles.counterBtnText}>Counter Offer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={omStyles.declineBtn}
                      onPress={() => {
                        setRejectModalVisible(true);
                        setRejectReason("");
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

              <Text style={amStyles.title}>Order Accepted!</Text>
              <Text style={amStyles.subtitle}>
                {selectedOrder?.order_number} has been confirmed.{"\n"}
                The customer has been notified.
              </Text>

              {/* Slot info */}
              {selectedOrder?.delivery_slot ? (
                <View style={amStyles.slotCard}>
                  <View style={amStyles.slotIconWrap}>
                    <MaterialIcons name="schedule" size={20} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={amStyles.slotCardLabel}>
                      Delivery Slot Requested
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
                        ? "Today"
                        : "Tomorrow"}
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
                      <Text style={amStyles.slotLockText}>Not yet</Text>
                    </View>
                  )}
                  {isSlotActive(selectedOrder?.delivery_slot) && (
                    <View style={amStyles.slotActiveBadge}>
                      <View style={amStyles.slotActiveDot} />
                      <Text style={amStyles.slotActiveText}>Active</Text>
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
                      No specific slot requested
                    </Text>
                    <Text
                      style={[
                        amStyles.slotCardTime,
                        { color: "#1F2937", fontSize: 13 },
                      ]}
                    >
                      Deliver as soon as possible
                    </Text>
                  </View>
                </View>
              )}

              {/* What happens next */}
              <View style={amStyles.nextStepsCard}>
                <Text style={amStyles.nextStepsTitle}>What happens next?</Text>
                <View style={amStyles.nextStep}>
                  <View style={amStyles.nextStepDot} />
                  <Text style={amStyles.nextStepText}>
                    Prepare the order items
                  </Text>
                </View>
                <View style={amStyles.nextStep}>
                  <View style={amStyles.nextStepDot} />
                  <Text style={amStyles.nextStepText}>
                    {selectedOrder?.delivery_slot &&
                    !isSlotActive(selectedOrder?.delivery_slot)
                      ? "Assign a rider once the slot begins"
                      : "Assign a delivery rider now"}
                  </Text>
                </View>
                <View style={amStyles.nextStep}>
                  <View style={amStyles.nextStepDot} />
                  <Text style={amStyles.nextStepText}>
                    Mark order ready when packed
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
                  Assign Delivery Rider
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
                <Text style={amStyles.secondaryBtnText}>I'll assign later</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
                  Counter Offer
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
                    New Total
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
                      Items: ₹
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
                      Delivery: ₹
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
                  Adjust Items
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
                            Orig: {item.quantity}
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
                            Subtotal: ₹
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
                              Removed from order
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
                            Reset
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
                  Delivery Fee
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
                          Was ₹{selectedOrder?.delivery_fee}
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
                  Delivery Slot
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
                      Customer requested:{" "}
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
                          {day.charAt(0).toUpperCase() + day.slice(1)}
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
                        Start
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
                        End
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
                        Clear
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
                  Note to Customer (Optional)
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
                  placeholder="E.g. Some items are out of stock, adjusted quantities accordingly..."
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
                    Send Counter Offer
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* REJECT MODAL */}
      <Modal visible={rejectModalVisible} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { paddingBottom: 40 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Order</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ marginBottom: 12, color: "#4B5563", fontSize: 15 }}>
              Please provide a reason for declining this order.
            </Text>
            <TextInput
              style={styles.note}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              placeholder="e.g. Items out of stock, shop closing soon..."
              numberOfLines={4}
            />
            <TouchableOpacity
              style={{
                backgroundColor: "#EF4444",
                marginTop: 10,
                borderRadius: 10,
                paddingVertical: 14,
                paddingHorizontal: 16,
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}
              onPress={() => {
                if (rejectReason.trim().length === 0) {
                  Alert.alert(
                    "Reason Required",
                    "Please provide a reason for rejecting.",
                  );
                  return;
                }
                // Use 'rejected' (not 'cancelled') — backend VALID_TRANSITIONS
                // for 'pending' only allows: accepted, rejected, countered
                updateOrderStatus(
                  selectedOrder.id,
                  "rejected",
                  rejectReason.trim(),
                );
                setRejectModalVisible(false);
                setRejectReason("");
                setModalVisible(false);
              }}
            >
              <Text
                style={[styles.rejectText, { color: "#fff", fontSize: 16 }]}
              >
                Confirm Rejection
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
