import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { io } from "socket.io-client";
import useAuthStore from '../../store/authStore';
import DeliveryMapView from '../../components/DeliveryMapView';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || (API_BASE.includes('/api') ? API_BASE.split('/api')[0] : "http://localhost:3000");

const C = {
  bg: '#F5F7F5',
  white: '#FFFFFF',
  primary: '#2E7D32',
  primaryLight: '#EAF3DE',
  primaryText: '#27500A',
  blue: '#378ADD',
  blueLight: '#E6F1FB',
  blueText: '#0C447C',
  orange: '#FAEEDA',
  orangeText: '#633806',
  red: '#E24B4A',
  redLight: '#FCEBEB',
  redText: '#791F1F',
  textPrimary: '#1A1A1A',
  textSecond: '#666666',
  textLight: '#999999',
  border: '#E8EDE8',
};

function Badge({ status }) {
  const map = {
    new: { bg: C.blueLight, color: C.blueText, label: 'New' },
    transit: { bg: C.orange, color: C.orangeText, label: 'Picked Up' },
    accepted: { bg: C.primaryLight, color: C.primaryText, label: 'Assigned' },
    delivered: { bg: C.primaryLight, color: C.primaryText, label: 'Delivered' },
    cancelled: { bg: C.redLight, color: C.redText, label: 'Cancelled' },
  };
  const s = map[status] || map.new;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function OrderCard({ order, onAccept, onDecline, onDeliver, onPickup }) {
  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <Text style={styles.orderId}>{order.displayId}</Text>
        <Badge status={order.status} />
      </View>

      <View style={styles.routeRow}>
        <View style={[styles.dot, { backgroundColor: C.blue }]} />
        <Text style={styles.routeText}>{order.pickup}</Text>
        <View style={styles.routeLine} />
        <View style={[styles.dot, { backgroundColor: C.red }]} />
        <Text style={styles.routeText}>{order.drop}</Text>
      </View>

      <View style={styles.orderBottom}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderMeta}>{order.meta}</Text>
          {order.dropLoc && (
            <TouchableOpacity 
              onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${order.dropLoc.latitude},${order.dropLoc.longitude}`)}
              style={{ marginTop: 4 }}
            >
              <Text style={{ fontSize: 11, color: C.blue, fontWeight: '600' }}>📍 View on Map</Text>
            </TouchableOpacity>
          )}
        </View>

        {order.status === 'new' && (
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => onAccept(order.orderIdRaw)}>
              <Text style={styles.btnPrimaryText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {order.status === 'accepted' && (
          <TouchableOpacity style={styles.btnPrimary} onPress={() => onPickup(order.id)}>
            <Text style={styles.btnPrimaryText}>Mark Picked Up</Text>
          </TouchableOpacity>
        )}

        {order.status === 'transit' && (
          <TouchableOpacity style={styles.btnPrimary} onPress={() => onDeliver(order.id)}>
            <Text style={styles.btnPrimaryText}>Mark Delivered</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function ActiveDeliveryScreen({ navigation }) {
  const { token, user } = useAuthStore();

  const [isOnline, setIsOnline] = useState(true);
  const [orders, setOrders] = useState([]);
  const [partner, setPartner] = useState({ name: 'Loading...', id: '...', initials: '' });
  const [myLocation, setMyLocation] = useState(null);

  const [deliveryCount, setDeliveryCount] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [incomingOrder, setIncomingOrder] = useState(null);
  const socketRef = useRef(null);

  const fetchOrders = async () => {
    try {
      const activeRes = await fetch(`${API_BASE}/delivery/active`, { headers: { Authorization: `Bearer ${token}` } });
      const actResult = await activeRes.json();

      const availRes = await fetch(`${API_BASE}/delivery/available`, { headers: { Authorization: `Bearer ${token}` } });
      const avResult = await availRes.json();

      let newList = [];
      if (actResult.success && actResult.data.delivery) {
        let d = actResult.data.delivery;
        newList.push({
          id: d.id,
          orderIdRaw: d.order_id,
          displayId: d.order?.order_number,
          status: d.status === 'assigned' ? 'accepted' : d.status === 'picked_up' ? 'transit' : d.status,
          pickup: d.order?.vendor?.shop_name,
          drop: d.order?.delivery_address?.address_line || d.order?.delivery_address?.city || 'Local',
          meta: `₹${d.order?.total} · ${d.order?.items?.length || 0} items`,
          vendorLoc: d.order?.vendor ? { latitude: d.order.vendor.latitude, longitude: d.order.vendor.longitude } : null,
          dropLoc: d.order?.delivery_address ? { latitude: d.order.delivery_address.latitude, longitude: d.order.delivery_address.longitude } : null
        });
      }
      if (avResult.success && avResult.data.orders) {
        avResult.data.orders.forEach(o => {
          newList.push({
            id: o.id,
            orderIdRaw: o.id,
            displayId: o.order_number,
            status: 'new',
            pickup: o.vendor.shop_name,
            drop: o.delivery_address?.address_line || o.delivery_address?.city || 'Local',
            meta: `₹${o.total} · ${o._count?.items || 0} items`,
            vendorLoc: { latitude: o.vendor.latitude, longitude: o.vendor.longitude },
            dropLoc: o.delivery_address ? { latitude: o.delivery_address.latitude, longitude: o.delivery_address.longitude } : null
          });
        });
      }
      if (actResult.success && actResult.data.partner) {
        setIsOnline(actResult.data.partner.is_available);
      }
      setOrders(newList);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (user) {
      setPartner({
        name: user.name || "Delivery Partner",
        id: `DP-${user.id}`,
        initials: (user.name || "D P").substring(0, 2).toUpperCase()
      });
    }
    fetchOrders();
  }, [user]);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on("order:new", () => fetchOrders());
    socket.on("order:incoming", (data) => setIncomingOrder(data));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    let subscription;
    let isActive = true;

    const startWatching = async () => {
      if (!isOnline || !token) return;
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      if (!isActive) return;

      subscription = await Location.watchPositionAsync(
        { distanceInterval: 10, timeInterval: 5000 },
        (loc) => {
          setMyLocation(loc.coords);
          if (socketRef.current?.connected) {
            socketRef.current.emit('driver_location', { 
              latitude: loc.coords.latitude, 
              longitude: loc.coords.longitude 
            });
          }
        }
      );
    };

    startWatching();

    return () => {
      isActive = false;
      if (subscription && typeof subscription.remove === 'function') {
        const subToCleanup = subscription;
        setTimeout(() => {
          try {
            subToCleanup.remove();
          } catch (e) {
            // Silently fail to prevent crash in dev
          }
        }, 0);
      }
    };
  }, [isOnline, token]);

  const toggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    await fetch(`${API_BASE}/delivery/toggle-availability`, { 
      method: "PATCH", 
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_available: nextState })
    });
  };

  const handleAccept = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/delivery/accept/${orderId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        navigation.navigate('Active');
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (e) { console.log(e); }
  };

  const handleAcceptIncoming = async () => {
    if (!incomingOrder) return;
    try {
      const res = await fetch(`${API_BASE}/delivery/accept/${incomingOrder.orderId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setIncomingOrder(null);
        fetchOrders();
        navigation.navigate('Active');
      } else {
        Alert.alert("Error", data.message || 'Could not accept order');
        setIncomingOrder(null);
      }
    } catch (e) {
      console.log(e);
      setIncomingOrder(null);
    }
  };

  const handleDeclineIncoming = () => setIncomingOrder(null);

  const handleUpdateStatus = async (deliveryId, status) => {
    try {
      const res = await fetch(`${API_BASE}/delivery/${deliveryId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        if (status === 'delivered') {
          setDeliveryCount(c => c + 1);
          setEarnings(e => e + 65);
        }
        fetchOrders();
      } else Alert.alert("Error", data.message);
    } catch (e) { console.log(e); }
  };

  const markers = myLocation ? [{ coordinate: myLocation, title: "Me" }] : [];
  orders.forEach(o => {
    if (o.vendorLoc && o.vendorLoc.latitude) {
      markers.push({ coordinate: o.vendorLoc, title: o.pickup });
    }
  });

  return (
    <>
    {/* ── Incoming Order Modal ── */}
    <Modal transparent animationType="slide" visible={!!incomingOrder} onRequestClose={handleDeclineIncoming}>
      <View style={styles.incomingOverlay}>
        <View style={styles.incomingCard}>
          <Text style={styles.incomingTitle}>🛵  New Delivery Request</Text>
          <Text style={styles.incomingOrderNum}>{incomingOrder?.orderNumber}</Text>

          <View style={styles.routeBox}>
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: C.blue }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeAddr}>{incomingOrder?.pickup?.name}</Text>
                <Text style={styles.routeAddrSub}>{incomingOrder?.pickup?.address}</Text>
              </View>
            </View>
            <View style={styles.dash} />
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: C.red }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routeLabel}>Dropoff</Text>
                <Text style={styles.routeAddr}>{incomingOrder?.dropoff?.address}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.routeAddrSub}>{incomingOrder?.dropoff?.city}</Text>
                  {incomingOrder?.dropoff?.latitude && (
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${incomingOrder.dropoff.latitude},${incomingOrder.dropoff.longitude}`)}
                    >
                      <Text style={{ fontSize: 11, color: C.blue, fontWeight: '600' }}>View on Map</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.incomingMeta}>
            <Text style={styles.incomingFee}>₹{incomingOrder?.deliveryFee} delivery fee</Text>
            <Text style={styles.incomingItems}>{incomingOrder?.itemCount} items · ₹{incomingOrder?.total} total</Text>
          </View>

          <View style={styles.incomingBtns}>
            <TouchableOpacity style={styles.declineBtn} onPress={handleDeclineIncoming}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptIncoming}>
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{partner.initials}</Text></View>
          <View>
            <Text style={styles.partnerName}>{partner.name}</Text>
            <Text style={styles.partnerId}>{partner.id}</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusPill, isOnline ? styles.pillOnline : styles.pillOffline]}>
            <Text style={[styles.pillText, { color: isOnline ? C.primaryText : '#5F5E5A' }]}>
              ● {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          <Switch value={isOnline} onValueChange={toggleOnline} trackColor={{ false: '#ccc', true: C.primary }} />
        </View>
      </View>

      <View style={styles.metricsGrid}>
        {[
          { label: "Today's deliveries", value: String(deliveryCount), sub: 'Active session' },
          { label: 'Earnings today', value: `₹${earnings}`, sub: 'Updating live' },
        ].map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricSub}>{m.sub}</Text>
          </View>
        ))}
      </View>

      <View style={styles.mapBox}>
        <DeliveryMapView currentRegion={myLocation} markers={markers} />
      </View>

      <Text style={styles.sectionTitle}>Active & Available orders</Text>

      {orders.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🛵</Text>
          <Text style={styles.emptyText}>No orders right now</Text>
        </View>
      ) : (
        orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onAccept={handleAccept}
            onPickup={(id) => handleUpdateStatus(id, 'picked_up')}
            onDeliver={(id) => handleUpdateStatus(id, 'delivered')}
          />
        ))
      )}
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.blueLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '600', color: C.blueText },
  partnerName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  partnerId: { fontSize: 11, color: C.textSecond, marginTop: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillOnline: { backgroundColor: C.primaryLight },
  pillOffline: { backgroundColor: '#F1EFE8' },
  pillText: { fontSize: 11, fontWeight: '600' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricCard: { flex: 1, minWidth: '45%', backgroundColor: C.white, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: C.border },
  metricLabel: { fontSize: 11, color: C.textSecond, marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: '600', color: C.textPrimary },
  metricSub: { fontSize: 11, color: C.primary, marginTop: 2 },
  mapBox: { backgroundColor: C.white, borderRadius: 10, height: 180, overflow: 'hidden', borderWidth: 0.5, borderColor: C.border, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: C.textSecond, marginBottom: 10 },
  orderCard: { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: C.border },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  routeText: { fontSize: 12, color: C.textPrimary, flexShrink: 1 },
  routeLine: { flex: 1, height: 1, backgroundColor: C.border },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderMeta: { fontSize: 11, color: C.textLight },
  btnRow: { flexDirection: 'row', gap: 8 },
  btnPrimary: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: C.primary },
  btnPrimaryText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14, color: C.textLight },
  // Incoming order modal
  incomingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  incomingCard:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  incomingTitle:  { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  incomingOrderNum: { fontSize: 12, color: '#888', marginBottom: 16 },
  routeBox:       { backgroundColor: '#F7F9F7', borderRadius: 14, padding: 16, marginBottom: 14 },
  routeRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  dot:            { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  dash:           { width: 2, height: 16, backgroundColor: '#D0D0D0', marginLeft: 4, marginBottom: 6 },
  routeLabel:     { fontSize: 10, color: '#888', fontWeight: '600', textTransform: 'uppercase' },
  routeAddr:      { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  routeAddrSub:   { fontSize: 11, color: '#888' },
  incomingMeta:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  incomingFee:    { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  incomingItems:  { fontSize: 12, color: '#666' },
  incomingBtns:   { flexDirection: 'row', gap: 12 },
  declineBtn:     { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E24B4A', alignItems: 'center' },
  declineBtnText: { color: '#E24B4A', fontWeight: '700', fontSize: 14 },
  acceptBtn:      { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#2E7D32', alignItems: 'center' },
  acceptBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
});