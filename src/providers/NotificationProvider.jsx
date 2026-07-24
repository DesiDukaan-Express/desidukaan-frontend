import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from "react";
import { View, StyleSheet } from "react-native";
import { io } from "socket.io-client";
import useAuthStore from "../store/authStore";
import InAppNotification from "../components/common/InAppNotification";

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3000";

const NotificationContext = createContext(null);

export function useNotify() {
  return useContext(NotificationContext);
}

export default function NotificationProvider({ children }) {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);

  const [notif, setNotif] = useState(null);
  const socketRef = useRef(null);
  const notifQueue = useRef([]);
  const showingRef = useRef(false);

  const show = useCallback((n) => {
    notifQueue.current.push(n);
    if (!showingRef.current) dequeue();
  }, []);

  function dequeue() {
    const next = notifQueue.current.shift();
    if (!next) { showingRef.current = false; return; }
    showingRef.current = true;
    setNotif(next);
  }

  const dismissNotif = useCallback(() => {
    setNotif(null);
    showingRef.current = false;
    setTimeout(dequeue, 200);
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    const r = role?.toLowerCase();

    if (r === "customer") {
      const onOrderUpdate = (data) => {
        if (data.status === "delivered") {
          show({
            type: "delivered",
            title: "Order Delivered!",
            message: `Your order #${data.order_id} has been delivered. Enjoy!`,
          });
        }
      };
      socket.on("order:update", onOrderUpdate);
      return () => { socket.off("order:update", onOrderUpdate); socket.disconnect(); };
    }

    if (r === "vendor") {
      const onAssignment = (data) => {
        const partnerName = data?.partner?.user?.name || "A delivery partner";
        show({
          type: "assigned",
          title: "Delivery Partner Assigned",
          message: `${partnerName} has accepted order #${data.order_id}.`,
        });
      };
      const onDeliveryStatus = (data) => {
        if (data.status === "delivered") {
          show({
            type: "delivered",
            title: "Order Delivered!",
            message: `Order #${data.order_id} has been delivered to the customer.`,
          });
        }
      };
      socket.on("order_assigned_to_delivery", onAssignment);
      socket.on("delivery_status_update", onDeliveryStatus);
      return () => {
        socket.off("order_assigned_to_delivery", onAssignment);
        socket.off("delivery_status_update", onDeliveryStatus);
        socket.disconnect();
      };
    }

    socket.disconnect();
  }, [token, role]);

  return (
    <NotificationContext.Provider value={{ showNotification: show }}>
      <View style={styles.container}>
        {children}
        <InAppNotification
          visible={!!notif}
          type={notif?.type}
          title={notif?.title}
          message={notif?.message}
          icon={notif?.icon}
          onPress={notif?.onPress}
          onDismiss={dismissNotif}
        />
      </View>
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
