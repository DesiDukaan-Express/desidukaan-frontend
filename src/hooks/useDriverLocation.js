/**
 * useDriverLocation
 * ─────────────────
 * Subscribes to the delivery partner's real-time location for a given order.
 *
 * Strategy (scalable dual-channel):
 *   1. Primary  — Socket.IO `delivery_location_update` event (pushed by server)
 *   2. Fallback — REST poll `GET /delivery/track/:orderId` every POLL_INTERVAL ms
 *      (covers cases where WS events are missed, e.g. reconnects, cold-starts)
 *
 * Returns:
 *   { partnerPos: { lat, lng } | null, connected: boolean, lastUpdate: Date | null }
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const BASE_URL   = process.env.EXPO_PUBLIC_API_URL    || "http://localhost:3000/api";
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ||
  (BASE_URL.includes("/api") ? BASE_URL.split("/api")[0] : "http://localhost:3000");

// Statuses where a driver can actually be en-route
const ACTIVE_DELIVERY_STATUSES = ["accepted", "preparing", "ready", "picked_up"];

const POLL_INTERVAL_MS = 15_000; // 15 seconds

export default function useDriverLocation(orderId, token, orderStatus, hasDriver, initialLocation, onOrderUpdate) {
  const [partnerPos,  setPartnerPos]  = useState(initialLocation || null);   // { lat, lng }
  const [connected,   setConnected]   = useState(false);
  const [lastUpdate,  setLastUpdate]  = useState(null);   // Date

  const socketRef     = useRef(null);
  const pollTimerRef  = useRef(null);
  const onUpdateRef   = useRef(onOrderUpdate);
  onUpdateRef.current = onOrderUpdate;

  // Sync initial location if it arrives after mounting
  useEffect(() => {
    if (initialLocation && !partnerPos) {
      setPartnerPos(initialLocation);
    }
  }, [initialLocation, partnerPos]);

  // ── Helper: fetch location from REST ──────────────────────────────────────
  const fetchLocation = useCallback(async () => {
    if (!orderId || !token) return;
    try {
      const res = await fetch(`${BASE_URL}/delivery/track/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const lat = data.data?.latitude;
      const lng = data.data?.longitude;
      if (lat != null && lng != null) {
        setPartnerPos({ lat, lng });
        setLastUpdate(new Date());
      }
    } catch {
      // silently fail — socket is the primary channel
    }
  }, [orderId, token]);

  // ── Main effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Only run when the order has an active delivery status
    if (!orderId || !token || !ACTIVE_DELIVERY_STATUSES.includes(orderStatus)) {
      return;
    }

    // ── Socket always connects (to receive delivery_location_update when driver
    //    is assigned during this session), but REST poll only fires if a driver
    //    is already assigned (avoids 404 from orders without a delivery record).
    const canPoll = !!hasDriver;

    // 1. Initial REST fetch (only when driver assigned)
    if (canPoll) fetchLocation();

    // 2. Start Socket.IO
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      // Join the tracking room for this specific order
      socket.emit("track:join", { order_id: orderId });
      socket.emit("track:join", { order_id: String(orderId) });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("delivery_location_update", (data) => {
      const oid = data.order_id || data.orderId;
      // Ignore events for other orders
      if (oid && String(oid) !== String(orderId)) return;

      const lat = data.latitude;
      const lng = data.longitude;
      if (lat != null && lng != null) {
        setPartnerPos({ lat, lng });
        setLastUpdate(new Date());
      }
    });

    // Listen for order status / delivery assignment changes — notifies
    // parent (e.g. OrderDetailModal) to re-fetch the order so hasDriver,
    // headerStatusText, etc. update in real time.
    socket.on("order:update", (data) => {
      const oid = data.order_id || data.orderId;
      if (oid && String(oid) !== String(orderId)) return;
      if (typeof onUpdateRef.current === "function") onUpdateRef.current();
    });

    socket.on("delivery_assigned", (data) => {
      const oid = data.order_id || data.orderId;
      if (oid && String(oid) !== String(orderId)) return;
      if (typeof onUpdateRef.current === "function") onUpdateRef.current();
    });

    // 3. Start fallback poll (only when driver assigned — avoids repeated 404s)
    if (canPoll) {
      pollTimerRef.current = setInterval(fetchLocation, POLL_INTERVAL_MS);
    }

    // ── Cleanup ──
    return () => {
      socket.disconnect();
      socketRef.current = null;
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [orderId, token, orderStatus, hasDriver, fetchLocation]);

  return { partnerPos, connected, lastUpdate };
}
