import React, { useState, useEffect } from "react";
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
  Alert
} from "react-native";

import VendorMapView from "../../components/VendorMapView";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { io } from "socket.io-client";

const { width } = Dimensions.get("window");

import useAuthStore from "../../store/authStore";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3000";

export default function VendorOrdersScreen() {

  const { token } = useAuthStore();

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

  const [activeTab, setActiveTab] = useState("orders"); // orders | requests
  const [requests, setRequests] = useState({ phones: [], slots: [] });
  const [loadingRequests, setLoadingRequests] = useState(false);

  // ── Toast notification ──────────────────────────────────────────────────────
  const [vendorToast, setVendorToast] = useState({ visible: false, message: "", type: "info" });
  const vendorToastTimer = React.useRef(null);
  const showVendorToast = (message, type = "info") => {
    if (vendorToastTimer.current) clearTimeout(vendorToastTimer.current);
    setVendorToast({ visible: true, message, type });
    vendorToastTimer.current = setTimeout(
      () => setVendorToast(t => ({ ...t, visible: false })),
      4000
    );
  };

  // Fetch nearby riders when modal opens and storeLocation is available
  useEffect(() => {
    if (isDeliveryModalVisible && (!selectedOrder?.delivery?.partner) && storeLocation) {
      fetchNearbyRiders();
      setBroadcastStatus(null);
    }
  }, [isDeliveryModalVisible, selectedOrder]);

  const fetchNearbyRiders = async () => {
    try {
      const res = await fetch(`${API_BASE}/delivery/nearby?latitude=${storeLocation.latitude}&longitude=${storeLocation.longitude}&radius_km=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
    longitude: selectedOrder?.vendor?.longitude || 77.2090
  };

  // Dynamic riders list derived from backend + sockets instead of mocks
  const riders = selectedOrder?.delivery?.partner ? [
    {
      id: selectedOrder.delivery.partner.id,
      name: selectedOrder.delivery.partner.user?.name || "Delivery Partner",
      status: selectedOrder.delivery.status === "assigned" ? "On the way to pickup" : "Out for delivery",
      image: "https://cdn-icons-png.flaticon.com/512/3208/3208726.png",
      coordinate: liveRiderLocations[selectedOrder.delivery.id] || {
        latitude: selectedOrder.delivery.partner.current_lat || 28.6149,
        longitude: selectedOrder.delivery.partner.current_lng || 77.2100
      },
      distance: "Live",
      fastest: true,
    }
  ] : nearbyRiders.map((r, i) => ({
    id: r.id,
    name: r.name || "Delivery Partner",
    status: "Available",
    image: "https://cdn-icons-png.flaticon.com/512/3208/3208726.png",
    coordinate: {
      latitude: r.latitude,
      longitude: r.longitude
    },
    distance: `${r.distance_km} km`,
    fastest: i === 0,
  }));

  const handleAssignRider = async (partnerId) => {
    try {
      const res = await fetch(`${API_BASE}/delivery/assign/${selectedOrder.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ partnerId })
      });
      const result = await res.json();
      if (result.success) {
        Alert.alert("Success", "Rider assigned successfully");
        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, delivery: result.data.delivery } : o));
        setSelectedOrder(prev => ({ ...prev, delivery: result.data.delivery }));
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
      const res = await fetch(`${API_BASE}/delivery/auto-assign/${selectedOrder.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ radius_km: 10 })
      });
      const result = await res.json();
      if (result.success) {
        setBroadcastStatus({
          count: result.data.broadcastCount,
          message: `Sent to ${result.data.broadcastCount} nearby rider${result.data.broadcastCount !== 1 ? 's' : ''}. Waiting for acceptance...`
        });
      } else {
        Alert.alert("Auto Assign Failed", result.message || "No available riders found nearby");
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
  const [counterSlotInput, setCounterSlotInput] = useState("");

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

  const fetchOrders = async () => {
    try {

      const res = await fetch(`${API_BASE}/orders/vendor/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await res.json();

      if (result.success) {
        setOrders(result.data.orders || []);
      }

    } catch (err) {
      console.log(err);
    }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_BASE}/slots/vendor/requests`, {
        headers: { Authorization: `Bearer ${token}` }
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

  useEffect(() => {
    fetchOrders();
    fetchRequests();
  }, []);

  // Socket setup for real-time negotiation
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on("connect", () => console.log("Vendor Socket Connected"));

    // Real-time order notifications
    socket.on("order:new", (data) => {
      console.log("New Order:", data);
      fetchOrders();
      // Optional: Add local notification/alert
      if (data.has_loose_items) {
        // Alert.alert("New Negotiation", `Order ${data.order_number} needs weight confirmation.`);
      }
    });

    // Slot & Fee Negotiation updates
    socket.on("slot:request", () => { fetchOrders(); fetchRequests(); });
    socket.on("fee:request", () => fetchOrders());
    socket.on("phone:request", () => {
      fetchRequests();
      showVendorToast("📞 New phone number request from a customer!", "info");
    });

    // Customer responses
    socket.on("slot:confirmed", () => fetchOrders());
    socket.on("fee:confirmed", () => fetchOrders());

    // Delivery Updates
    socket.on("order_assigned_to_delivery", () => fetchOrders());
    socket.on("delivery_status_update", () => fetchOrders());
    socket.on("delivery_location_update", (data) => {
      if (data.deliveryId) {
        setLiveRiderLocations(prev => ({
          ...prev,
          [data.deliveryId]: { latitude: data.latitude, longitude: data.longitude }
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
    try {
      const body = { status };
      if (reason) body.reason = reason;

      const res = await fetch(`${API_BASE}/orders/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const result = await res.json();
      if (res.ok && result.success) {
        Alert.alert("Success", `Order marked as ${status}`);
        fetchOrders();
        setSelectedOrder(prev => prev && prev.id === id ? { ...prev, status } : prev);
      } else {
        Alert.alert("Error", result.msg || result.message || "Failed to update status");
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Something went wrong while updating status.");
    }
  };

  useEffect(() => {

    if (selectedOrder) {

      setCounterItems(
        (selectedOrder.items || []).map(i => ({
          ...i,
          new_quantity: i.quantity,
          available: true
        }))
      );

      setCounterDeliveryFee(
        selectedOrder.delivery_fee
          ? String(selectedOrder.delivery_fee)
          : ""
      );

      if (selectedOrder.delivery_slot && selectedOrder.delivery_slot.slot_start) {
        const st = new Date(selectedOrder.delivery_slot.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const ed = new Date(selectedOrder.delivery_slot.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCounterSlotInput(`${st} to ${ed}`);
      } else {
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
      if (counterSlotInput) {
        const parsed = parseSlotLocally(counterSlotInput);
        if (parsed) {
          slot_start = parsed.start;
          slot_end = parsed.end;
        }
      }

      const res = await fetch(`${API_BASE}/orders/${selectedOrder.id}/counter`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: counterItems,
          delivery_fee: parseFloat(counterDeliveryFee),
          note: counterNote,
          slot_start,
          slot_end
        })
      });

      const result = await res.json();

      if (result.success) {
        Alert.alert("Success", "Counter offer sent to customer");
        
        // Update selectedOrder with the full response to prevent loss of details
        setSelectedOrder(result.data.order);
        setCounterModalVisible(false);
        // We keep the modal open so they can see the 'Countered' status
        // or we close it as per current flow:
        setModalVisible(false);

        fetchOrders();
      }

    } catch (err) {

      console.log(err);

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
    if (!slot) return true; // No slot = skip check
    const start = slot.slot_start || slot.start;
    if (!start) return true;
    return new Date() >= new Date(start);
  };
  const formatStatus = (status) => {
    if (!status) return "";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handlePhoneRequest = async (id, status) => {
    try {
      await fetch(`${API_BASE}/slots/phone-request/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
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
          Authorization: `Bearer ${token}`
        }
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

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "orders" && styles.activeTab]}
          onPress={() => setActiveTab("orders")}
        >
          <Text style={[styles.tabText, activeTab === "orders" && styles.activeTabText]}>Orders</Text>
          {orders.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{orders.length}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "requests" && styles.activeTab]}
          onPress={() => setActiveTab("requests")}
        >
          <Text style={[styles.tabText, activeTab === "requests" && styles.activeTabText]}>Requests</Text>
          {(requests.phones.length + requests.slots.length) > 0 && (
            <View style={[styles.badge, { backgroundColor: "#D97706" }]}>
              <Text style={styles.badgeText}>{requests.phones.length + requests.slots.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === "orders" ? orders : [...requests.phones.map(p => ({ ...p, type: 'phone' })), ...requests.slots.map(s => ({ ...s, type: 'slot' }))]}
        keyExtractor={(item) => item.type ? `${item.type}-${item.id}` : String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing || loadingRequests} onRefresh={activeTab === "orders" ? onRefresh : fetchRequests} />
        }
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={activeTab === "requests" ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
            <Text style={{ marginTop: 12, color: "#6B7280", fontWeight: '600' }}>No pending requests</Text>
          </View>
        ) : null}
        renderItem={({ item }) => activeTab === "orders" ? (
          <TouchableOpacity
            style={[
              styles.orderCard,
              item.status === "pending" && styles.orderCardPending
            ]}
            onPress={['accepted', 'preparing', 'ready', 'picked_up'].includes(item.status) ? () => {
              setSelectedOrder(item);
              setIsDeliveryModalVisible(true)
            } : () => {
              setSelectedOrder(item);
              setModalVisible(true);
            }}
          >
            <View style={styles.orderHeader}>
              <View style={styles.orderIdContainer}>
                {item.status === "pending" && <View style={styles.pendingDot} />}
                <Text style={[
                  styles.orderId,
                  item.status === "pending" && styles.orderIdPending
                ]}>
                  {item.order_number || `Order #${item.id}`}
                </Text>
              </View>
              <Text style={styles.orderTime}>
                {formatOrderTime(item.created_at)}
              </Text>
            </View>
            <Text style={styles.customer}>
              👤 {item.customer?.name}
            </Text>
            {item.delivery_slot && (
              <View style={styles.slotBadge}>
                <Ionicons name="time-outline" size={14} color="#059669" />
                <Text style={styles.slotBadgeText}>
                  {new Date(item.delivery_slot.slot_start || item.delivery_slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                  {new Date(item.delivery_slot.slot_end || item.delivery_slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            <Text style={styles.items}>
              {(item.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(", ")}
            </Text>
            {item.has_loose_items && (
              <View style={styles.negotiationBadge}>
                <MaterialIcons name="scale" size={12} color="#D97706" />
                <Text style={styles.negotiationText}>WEIGHT NEGOTIATION NEEDED</Text>
              </View>
            )}
            <View style={styles.bottomRow}>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.total}>₹{item.total}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                item.status === "pending" && styles.statusBadgePending,
                item.status === "accepted" && styles.statusBadgeAccepted,
                item.status === "completed" && styles.statusBadgeCompleted,
                item.status === "cancelled" && styles.statusBadgeCancelled
              ]}>
                <Text style={[
                  styles.statusText,
                  item.status === "pending" && styles.statusTextPending,
                  item.status === "accepted" && styles.statusTextAccepted,
                  item.status === "completed" && styles.statusTextCompleted,
                  item.status === "cancelled" && styles.statusTextCancelled
                ]}>
                  {formatStatus(item.status)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.requestCard}>
             <View style={styles.requestHeader}>
                <View style={styles.requestIcon}>
                   <Ionicons name={item.type === 'phone' ? "phone-portrait-outline" : "alarm-outline"} size={20} color="#1F2937" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                   <Text style={styles.requestTitle}>{item.type === 'phone' ? "Phone Request" : "Delivery Slot Request"}</Text>
                   <Text style={styles.requestCustomer}>{item.customer?.name}</Text>
                </View>
                <Text style={styles.orderTime}>{formatOrderTime(item.created_at)}</Text>
             </View>

             {item.type === 'slot' && (
                <View style={styles.requestDetails}>
                   <Text style={styles.slotRange}>
                      {new Date(item.slot_start || item.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(item.slot_end || item.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </Text>
                   <Text style={styles.slotDay}>{new Date(item.start).toDateString() === new Date().toDateString() ? "Today" : "Tomorrow"}</Text>
                </View>
             )}

             <View style={styles.requestActions}>
                <TouchableOpacity 
                   style={[styles.actionBtn, styles.rejectBtn]} 
                   onPress={() => item.type === 'phone' ? handlePhoneRequest(item.id, 'rejected') : handleSlotRequest(item.id, 'reject')}
                >
                   <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.actionBtn, styles.approveBtn]} 
                   onPress={() => item.type === 'phone' ? handlePhoneRequest(item.id, 'approved') : handleSlotRequest(item.id, 'confirm')}
                >
                   <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
             </View>
          </View>
        )}
      />


      <Modal visible={isDeliveryModalVisible} animationType="slide" transparent>
        <View style={styles.deliveryModalOverlay}>
          <View style={styles.deliveryModalContent}>

            {/* Header */}
            <View style={styles.assignHeader}>
              <TouchableOpacity onPress={() => setIsDeliveryModalVisible(false)}>
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.assignTitle}>Assign Rider</Text>
              <TouchableOpacity style={styles.headerIcon}>
                <View style={styles.headerIconInner}>
                  <MaterialIcons name="storefront" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={{
              backgroundColor: "#fff",
              margin: 16,
              padding: 14,
              borderRadius: 16
            }}>
              <Text style={{ fontWeight: "800" }}>
                {selectedOrder?.order_number}
              </Text>

              <Text style={{ color: "#6B7280", marginTop: 4 }}>
                {selectedOrder?.customer?.name}
              </Text>

              <Text style={{ marginTop: 6, fontWeight: "800", color: "#111827", fontSize: 16 }}>
                ₹{selectedOrder?.total}
              </Text>

              {/* Added Items List for better context */}
              <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: "#F3F4F6", paddingTop: 8 }}>
                {(selectedOrder?.items || []).slice(0, 3).map((item, i) => (
                  <Text key={i} style={{ fontSize: 12, color: "#4B5563" }} numberOfLines={1}>
                    • {item.quantity}x {item.product_name}
                  </Text>
                ))}
                {(selectedOrder?.items || []).length > 3 && (
                  <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                    + {(selectedOrder.items || []).length - 3} more items...
                  </Text>
                )}
              </View>
            </View>

            <ScrollView bounces={false} style={{ flex: 1 }}>
              {/* Map Section */}
              <View style={styles.mapWrapper}>
                <VendorMapView
                  storeLocation={storeLocation}
                  riders={riders}
                  silverMapStyle={silverMapStyle}
                  destinationLocation={
                    selectedOrder?.delivery_address?.latitude
                      ? { latitude: selectedOrder.delivery_address.latitude, longitude: selectedOrder.delivery_address.longitude }
                      : null
                  }
                />

                {/* Status Bar */}
                <View style={styles.activeStatusBar}>
                  <Text style={styles.partnersCount}>{riders.length} {riders.length === 1 ? 'PARTNER' : 'PARTNERS'} NEARBY</Text>
                  <View style={styles.activeIndicator}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeTextStatus}>Active</Text>
                  </View>
                </View>
              </View>

              {/* Rider List */}
              <View style={styles.riderListContainer}>
                <View style={styles.listHeaderRow}>
                  <Text style={styles.riderListTitle}>Available Riders</Text>
                  <Text style={styles.liveUpdatesText}>LIVE UPDATES</Text>
                </View>

                {/* ── AUTO ASSIGN BUTTON ── */}
                {!selectedOrder?.delivery?.partner && (
                  <View style={styles.autoAssignSection}>
                    <TouchableOpacity
                      style={[
                        styles.autoAssignBtn, 
                        (autoAssigning || !isSlotActive(selectedOrder?.delivery_slot)) && { opacity: 0.5 }
                      ]}
                      onPress={handleAutoAssign}
                      disabled={autoAssigning || !isSlotActive(selectedOrder?.delivery_slot)}
                    >
                      {autoAssigning ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <MaterialIcons name="near-me" size={18} color="#fff" />
                      )}
                      <Text style={styles.autoAssignBtnText}>
                        {!isSlotActive(selectedOrder?.delivery_slot) 
                          ? 'Slot not started yet' 
                          : autoAssigning ? 'Broadcasting...' : 'Auto Assign Nearby Rider'}
                      </Text>
                    </TouchableOpacity>
                    {broadcastStatus && (
                      <View style={styles.broadcastStatus}>
                        <View style={styles.broadcastDot} />
                        <Text style={styles.broadcastText}>{broadcastStatus.message}</Text>
                      </View>
                    )}
                  </View>
                )}

                {riders.length > 0 ? riders.map((rider, index) => (
                  <View key={rider.id} style={[
                    styles.riderCard,
                    index === 0 && styles.firstRiderCard
                  ]}>
                    <View style={styles.riderInfoRow}>
                      <Image source={{ uri: rider.image }} style={styles.riderAvatar} />
                      <View style={styles.riderDetails}>
                        <Text style={styles.riderName}>{rider.name}</Text>
                        <View style={styles.timeRow}>
                          <FontAwesome5 name="bolt" size={12} color="#16A34A" />
                          <Text style={[styles.riderStatus, styles.fastestText]}>
                            {rider.status} · {rider.distance}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.callRiderBtn} onPress={() => Alert.alert("Call", `Calling ${rider.name}...`)}>
                        <Ionicons name="call" size={20} color="#1F2937" />
                      </TouchableOpacity>

                      {rider.status === "Available" && (
                        <TouchableOpacity
                          style={[
                            styles.assignBtnSmall, 
                            !isSlotActive(selectedOrder?.delivery_slot) && { backgroundColor: '#9CA3AF' }
                          ]}
                          onPress={() => handleAssignRider(rider.id)}
                          disabled={!isSlotActive(selectedOrder?.delivery_slot)}
                        >
                          <Text style={styles.assignBtnTextSmall}>
                            {!isSlotActive(selectedOrder?.delivery_slot) ? 'Locked' : 'Assign'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    {selectedOrder?.delivery?.partner ? (
                      <Text style={{ color: '#16A34A', fontWeight: '600' }}>✓ Rider is on the way</Text>
                    ) : (
                      <Text style={{ color: '#6B7280', textAlign: 'center' }}>No riders assigned yet.{"\n"}Tap Auto Assign above to broadcast to nearby riders.</Text>
                    )}
                    {!selectedOrder?.delivery?.partner && selectedOrder?.status !== 'ready' && (
                      <TouchableOpacity
                        style={{ marginTop: 12, backgroundColor: '#0F172A', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }}
                        onPress={() => updateOrderStatus(selectedOrder.id, "ready")}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Mark Order as Ready</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ORDER MODAL */}

      <Modal visible={modalVisible} animationType="slide" transparent>

        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>

            <ScrollView>

              <View style={styles.modalHeader}>

                <Text style={styles.modalTitle}>
                  {selectedOrder?.order_number}
                </Text>

                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={{ fontSize: 20 }}>✕</Text>
                </TouchableOpacity>

              </View>


              <Text style={styles.sectionTitle}>Customer</Text>

              <Text>{selectedOrder?.customer?.name}</Text>
              <Text>{selectedOrder?.customer?.phone}</Text>


              <Text style={styles.sectionTitle}>Items</Text>

              {(selectedOrder?.items || []).map((item, i) => (
                <View key={i} style={styles.itemRow}>

                  <Image
                    source={{
                      uri: item.product?.image_url ||
                        "https://cdn-icons-png.flaticon.com/512/1046/1046784.png"
                    }}
                    style={styles.productImage}
                  />

                  <View style={{ flex: 1 }}>
                    <Text>{item.product_name}</Text>
                    <Text>{item.quantity} × ₹{item.product_price}</Text>
                  </View>

                  <Text>₹{item.subtotal}</Text>

                </View>
              ))}


              <Text style={styles.sectionTitle}>Total</Text>

              <Text style={styles.modalTotal}>₹{selectedOrder?.total}</Text>


              {selectedOrder?.status === "pending" && (

                <View style={styles.modalActions}>

                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => {
                      updateOrderStatus(selectedOrder.id, "accepted");
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.btnText}>Accept</Text>
                  </TouchableOpacity>


                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setCounterModalVisible(true)}
                  >
                    <Text style={styles.counterText}>Counter</Text>
                  </TouchableOpacity>


                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => {
                      setRejectModalVisible(true);
                      setRejectReason("");
                    }}
                  >
                    <Text style={styles.rejectText}>Decline</Text>
                  </TouchableOpacity>

                </View>

              )}

            </ScrollView>

          </View>
        </View>

      </Modal>


      {/* COUNTER MODAL */}

      <Modal visible={counterModalVisible} animationType="slide" transparent>

        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>

              <Text style={styles.modalTitle}>Counter Offer</Text>

              <TouchableOpacity onPress={() => setCounterModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>

            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>

              {counterItems.map((item, index) => (
                <View key={index} style={[
                  styles.counterItem,
                  !item.available && styles.counterItemUnavailable
                ]}>

                  <Image
                    source={{
                      uri: item.product?.image_url ||
                        "https://cdn-icons-png.flaticon.com/512/1046/1046784.png"
                    }}
                    style={styles.counterItemImage}
                  />

                  <View style={styles.counterItemContent}>

                    <Text style={[
                      styles.counterItemName,
                      item.new_quantity === 0 && styles.counterItemNameStriked,
                      !item.available && styles.counterItemNameUnavailable
                    ]}>{item.product_name}</Text>

                    <View style={styles.counterItemMeta}>
                      <Text style={styles.originalQty}>Original: {item.quantity}</Text>
                      <Text style={styles.itemPrice}>₹{item.product_price}/unit</Text>
                    </View>

                    <View style={styles.qtyRow}>

                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateItemQty(index, item.new_quantity - 1)}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>

                      <View style={styles.qtyValueContainer}>
                        <Text style={styles.qtyText}>{item.new_quantity}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateItemQty(index, item.new_quantity + 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>

                    </View>

                  </View>

                </View>
              ))}

              <View style={styles.summaryCard}>

                <Text style={styles.summaryLabel}>New Order Total</Text>

                <Text style={styles.summaryAmount}>
                  ₹{counterItems.reduce((sum, item) =>
                    item.available ? sum + (item.new_quantity * item.product_price) : sum, 0
                  ) + parseFloat(counterDeliveryFee || 0)}
                </Text>

                <View style={styles.summaryDetails}>

                  <View style={styles.summaryDetailRow}>
                    <Text style={styles.summaryDetailLabel}>Items Subtotal</Text>
                    <Text style={styles.summaryDetailValue}>
                      ₹{counterItems.reduce((sum, item) =>
                        item.available ? sum + (item.new_quantity * item.product_price) : sum, 0
                      )}
                    </Text>
                  </View>

                  <View style={styles.summaryDetailRow}>
                    <Text style={styles.summaryDetailLabel}>Delivery Fee</Text>
                    <Text style={styles.summaryDetailValue}>
                      ₹{parseFloat(counterDeliveryFee || 0)}
                    </Text>
                  </View>

                </View>

              </View>

              <Text style={styles.sectionTitle}>Delivery Fee</Text>

              <TextInput
                style={styles.input}
                value={counterDeliveryFee}
                onChangeText={setCounterDeliveryFee}
                keyboardType="numeric"
                placeholder="Enter delivery fee"
              />

              <Text style={styles.sectionTitle}>Delivery Window (Optional)</Text>

              <TextInput
                style={styles.input}
                value={counterSlotInput}
                onChangeText={setCounterSlotInput}
                placeholder="e.g. 3pm to 5pm"
              />

              <Text style={styles.sectionTitle}>Note (Optional)</Text>

              <TextInput
                style={styles.note}
                value={counterNote}
                onChangeText={setCounterNote}
                multiline
                placeholder="Add a note for the customer..."
                numberOfLines={3}
              />

              <TouchableOpacity
                style={styles.sendCounterBtn}
                onPress={sendCounterOffer}
              >
                <Text style={styles.btnText}>Send Counter Offer</Text>
              </TouchableOpacity>

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
            <Text style={{ marginBottom: 12, color: '#4B5563', fontSize: 15 }}>
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
              style={[styles.rejectBtn, { backgroundColor: '#EF4444', marginTop: 10 }]}
              onPress={() => {
                if (rejectReason.trim().length === 0) {
                  Alert.alert("Reason Required", "Please provide a reason for rejecting.");
                  return;
                }
                updateOrderStatus(selectedOrder.id, "cancelled", rejectReason.trim());
                setRejectModalVisible(false);
                setRejectReason("");
                setModalVisible(false);
              }}
            >
              <Text style={[styles.rejectText, { color: '#fff', fontSize: 16 }]}>Confirm Rejection</Text>
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

const PRIMARY = "#0FF022";   // neon green
const ACCENT = "#F59E0B";    // amber
const PRIMARY_SOFT = "#E9FFE9"; // soft green bg (important)

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },

  header: {
    fontSize: 26,
    fontWeight: "800",
    padding: 20
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
    borderColor: "transparent"
  },

  orderCardPending: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB"
  },

  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },

  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center"
  },

  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
    marginRight: 8
  },

  orderId: {
    fontWeight: "800",
    fontSize: 15,
    color: "#1F2937"
  },

  orderIdPending: {
    color: "#D97706"
  },

  orderTime: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600"
  },

  customer: {
    marginTop: 6,
    fontSize: 14,
    color: "#4B5563"
  },

  items: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 13
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12
  },

  totalContainer: {
    flexDirection: "column"
  },

  totalLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 2
  },

  total: {
    fontWeight: "900",
    fontSize: 18,
    color: "#1F2937"
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center"
  },

  statusBadgePending: {
    backgroundColor: "#FEF3C7"
  },

  statusBadgeAccepted: {
    backgroundColor: "#DCFCE7"
  },

  statusBadgeCompleted: {
    backgroundColor: "#DCFCE7"
  },

  statusBadgeCancelled: {
    backgroundColor: "#FEE2E2"
  },

  status: {
    color: "#6B7280"
  },

  statusText: {
    fontWeight: "700",
    fontSize: 12,
    color: "#6B7280"
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
    fontWeight: "800",
    color: "#D97706",
    letterSpacing: 0.5,
  },

  statusTextPending: {
    color: "#D97706"
  },

  statusTextAccepted: {
    color: "#16A34A"
  },

  statusTextCompleted: {
    color: "#6B7280"
  },

  statusTextCancelled: {
    color: "#DC2626"
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end"
  },

  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%"
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800"
  },

  sectionTitle: {
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },

  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10
  },

  modalTotal: {
    fontSize: 24,
    fontWeight: "900"
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20
  },

  acceptBtn: {
    flex: 1,
    backgroundColor: PRIMARY,
    padding: 14,
    borderRadius: 10,
    alignItems: "center"
  },

  btnText: {
    color: "#fff",
    fontWeight: "800"
  },

  rejectBtn: {
    flex: 1,
    backgroundColor: "#FDECEA",
    padding: 14,
    borderRadius: 10,
    alignItems: "center"
  },

  rejectText: {
    color: "#E74C3C",
    fontWeight: "800"
  },

  counterBtn: {
    flex: 1,
    backgroundColor: "#DBEAFE",
    padding: 14,
    borderRadius: 10,
    alignItems: "center"
  },

  counterText: {
    color: "#2563EB",
    fontWeight: "800"
  },

  // ── Auto Assign ──
  autoAssignSection: {
    marginBottom: 14,
  },
  autoAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
  },
  autoAssignBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  broadcastStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  broadcastDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A',
  },
  broadcastText: {
    fontSize: 12, color: '#166534', fontWeight: '600', flex: 1,
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
    elevation: 1
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },

  qtyBtn: {
    backgroundColor: "#F3F4F6",
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },

  qtyText: {
    fontWeight: "700",
    fontSize: 16
  },

  availabilityBtn: {
    marginTop: 6,
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#E6FFFA"
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },

  note: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    height: 100,
    marginBottom: 20,
    backgroundColor: "#FAFAFA"
  },

  closeBtn: {
    fontSize: 24,
    color: "#6B7280",
    fontWeight: "300"
  },

  counterItemImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#E5E7EB"
  },

  counterItemContent: {
    flex: 1,
    marginLeft: 12
  },

  counterItemName: {
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4
  },

  counterItemNameStriked: {
    textDecorationLine: "line-through",
    color: "#9CA3AF"
  },

  counterItemNameUnavailable: {
    textDecorationLine: "line-through",
    color: "#9CA3AF"
  },

  counterItemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },

  originalQty: {
    fontSize: 12,
    color: "#9CA3AF"
  },

  itemPrice: {
    fontSize: 12,
    color: "#6B7280"
  },

  qtyValueContainer: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 40,
    alignItems: "center"
  },

  qtyBtnText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151"
  },

  availableBtn: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981"
  },

  unavailableBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#EF4444"
  },

  availableText: {
    color: "#059669",
    fontWeight: "700",
    fontSize: 11
  },

  unavailableText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 11
  },

  counterItemUnavailable: {
    opacity: 0.6
  },

  summaryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },

  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4
  },

  summaryAmount: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1F2937"
  },

  summaryDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB"
  },

  summaryDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },

  summaryDetailLabel: {
    color: "#6B7280",
    fontSize: 13
  },

  summaryDetailValue: {
    fontWeight: "600",
    fontSize: 13
  },

  sendCounterBtn: {
    backgroundColor: PRIMARY,
    padding: 16,
    borderRadius: 12,
    alignItems: "center"
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
    fontWeight: "800",
    color: "#1F2937",
  },

  callRiderBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginRight: 8 },
  assignBtnSmall: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#0F172A" },
  assignBtnTextSmall: { color: "#fff", fontSize: 12, fontWeight: "700" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },

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
    fontWeight: "700",
    color: "#6B7280",
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
    fontWeight: "700",
    color: "#16A34A",
  },

  // NEW STYLES
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 4,
    marginHorizontal: 16,
    marginTop: 16,
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
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#0F172A",
    fontWeight: "800",
  },
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
    fontWeight: "800",
  },
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
    fontWeight: "700",
    color: "#059669",
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
    fontWeight: "800",
    color: "#1F2937",
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
    fontWeight: "700",
    color: "#0F172A",
  },
  slotDay: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
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
    fontWeight: "700",
    fontSize: 14,
  },
  approveBtn: {
    backgroundColor: "#0F172A",
  },
  approveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
    fontWeight: "800",
    color: "#0F172A",
  },
  liveUpdatesText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16A34A",
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
    fontWeight: "700",
    color: "#1F2937",
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
    fontWeight: "700",
  },
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
    fontWeight: "800",
    fontSize: 14,
  },

});

const silverMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#ffffff"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#dadada"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#c9c9c9"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
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
  text: { color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 20 },
});
