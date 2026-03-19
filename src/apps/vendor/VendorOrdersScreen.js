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
  Dimensions
} from "react-native";

import VendorMapView from "../../components/VendorMapView";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

import useAuthStore from "../../store/authStore";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

export default function VendorOrdersScreen() {

  const { token } = useAuthStore();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [isDeliveryModalVisible, setIsDeliveryModalVisible] = useState(false);

  const riders = [
    {
      id: 1,
      name: "Sameer Khan",
      status: "2 mins away",
      image: "https://xsgames.co/randomusers/assets/avatars/male/2.jpg",
      coordinate: { latitude: 28.6149, longitude: 77.2100 },
      distance: "0.8 km",
      fastest: true,
    },
    {
      id: 2,
      name: "Amit Sharma",
      status: "5 mins away",
      image: "https://xsgames.co/randomusers/assets/avatars/male/5.jpg",
      coordinate: { latitude: 28.6129, longitude: 77.2120 },
      distance: "2.1 km",
      fastest: false,
    },
    {
      id: 3,
      name: "Priya Das",
      status: "9 mins away",
      image: "https://xsgames.co/randomusers/assets/avatars/female/8.jpg",
      coordinate: { latitude: 28.6189, longitude: 77.2080 },
      distance: "3.5 km",
      fastest: false,
    }
  ];

  const storeLocation = { latitude: 28.6139, longitude: 77.2090 };

  const [counterModalVisible, setCounterModalVisible] = useState(false);

  const [counterItems, setCounterItems] = useState([]);
  const [counterDeliveryFee, setCounterDeliveryFee] = useState("");
  const [counterNote, setCounterNote] = useState("");

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

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateOrderStatus = async (id, status) => {

    try {

      await fetch(`${API_BASE}/orders/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      fetchOrders();

    } catch (err) {
      console.log(err);
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

    }

  }, [selectedOrder]);

  const updateItemQty = (index, qty) => {

    const items = [...counterItems];

    items[index].new_quantity = Math.max(0, qty);

    setCounterItems(items);

  };

  const sendCounterOffer = async () => {

    try {

      const res = await fetch(`${API_BASE}/orders/${selectedOrder.id}/counter`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: counterItems,
          delivery_fee: parseFloat(counterDeliveryFee),
          note: counterNote
        })
      });

      const result = await res.json();

      if (result.success) {

        Alert.alert("Counter Sent");

        setCounterModalVisible(false);
        setModalVisible(false);

        fetchOrders();

      }

    } catch (err) {

      console.log(err);

    }

  };

  const formatOrderTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatStatus = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
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

      <Text style={styles.header}>Orders</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity

            style={[
              styles.orderCard,
              item.status === "pending" && styles.orderCardPending
            ]}

            onPress={item.status === 'accepted' ? () => {
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

            <Text style={styles.items}>
              {(item.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(", ")}
            </Text>

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

              <Text style={{ marginTop: 6, fontWeight: "700" }}>
                ₹{selectedOrder?.total}
              </Text>
            </View>

            <ScrollView bounces={false} style={{ flex: 1 }}>
              {/* Map Section */}
              <View style={styles.mapWrapper}>
                <VendorMapView
                  storeLocation={storeLocation}
                  riders={riders}
                  silverMapStyle={silverMapStyle}
                />

                {/* Status Bar */}
                <View style={styles.activeStatusBar}>
                  <Text style={styles.partnersCount}>3 PARTNERS NEARBY</Text>
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

                {riders.map((rider, index) => (
                  <View key={rider.id} style={[
                    styles.riderCard,
                    index === 0 && styles.firstRiderCard
                  ]}>
                    <View style={styles.riderInfoRow}>
                      <Image source={{ uri: rider.image }} style={styles.riderAvatar} />
                      <View style={styles.riderDetails}>
                        <Text style={styles.riderName}>{rider.name}</Text>
                        <View style={styles.timeRow}>
                          {rider.fastest ? (
                            <FontAwesome5 name="bolt" size={12} color="#16A34A" />
                          ) : (
                            <Ionicons name="time-outline" size={14} color="#6B7280" />
                          )}
                          <Text style={[
                            styles.riderStatus,
                            rider.fastest && styles.fastestText
                          ]}>{rider.status}</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.callRiderBtn}>
                        <Ionicons name="call" size={20} color="#1F2937" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.assignToOrderBtn
                      ]}
                      onPress={() => {
                        Alert.alert("Assigned", `${rider.name} has been assigned.`);
                        setIsDeliveryModalVisible(false);
                        updateOrderStatus(selectedOrder.id, "shipped");
                      }}
                    >
                      <Text style={styles.assignBtnText}>Assign to Order</Text>
                    </TouchableOpacity>
                  </View>
                ))}
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
                      updateOrderStatus(selectedOrder.id, "cancelled");
                      setModalVisible(false);
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

  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconInner: {
    justifyContent: "center",
    alignItems: "center",
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
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  partnersCount: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  activeIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },
  activeTextStatus: {
    fontSize: 11,
    fontWeight: "800",
    color: "#16A34A",
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
