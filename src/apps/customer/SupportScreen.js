import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { useNavigation } from "@react-navigation/native";
import { ordersAPI, supportAPI } from "../../services/api";
import useAuthStore from "../../store/authStore";

const C = {
  green: "#16A34A",
  greenLight: "#F0FDF4",
  orange: "#F97316",
  orangeLight: "#FFF7ED",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  white: "#FFFFFF",
  bg: "#F8FAFC",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray700: "#374151",
  gray900: "#111827",
  shadow: "rgba(15, 23, 42, 0.08)",
};

const TOPICS = [
  { icon: "shopping-bag", title: "Orders", text: "Track, change, or resolve an order", color: C.green, background: C.greenLight },
  { icon: "user", title: "Account", text: "Manage your profile and login", color: C.blue, background: C.blueLight },
  { icon: "credit-card", title: "Payments", text: "Get help with payment methods", color: C.orange, background: C.orangeLight },
  { icon: "truck", title: "Delivery", text: "Questions about delivery status", color: C.green, background: C.greenLight },
];

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3000";

export default function SupportScreen() {
  const navigation = useNavigation();
  const token = useAuthStore((state) => state.token);
  const [contactVisible, setContactVisible] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketVisible, setTicketVisible] = useState(false);
  const [ticketReply, setTicketReply] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadTickets = async () => {
    if (!token) return;
    try {
      const response = await supportAPI.getMyTickets(token);
      setTickets(response.data?.tickets || []);
    } catch (requestError) {
      setError(requestError.message || "Could not load your support requests.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadTickets();
  }, [token]);

  React.useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });

    socket.on("support:message_created", ({ ticketId, message: newMessage }) => {
      setSelectedTicket((current) => current?.id === ticketId ? {
        ...current,
        status: "in_progress",
        messages: [...(current.messages || []), newMessage],
      } : current);
      setTickets((current) => current.map((ticket) => ticket.id === ticketId ? { ...ticket, status: "in_progress" } : ticket));
    });

    socket.on("support:ticket_updated", ({ ticket }) => {
      if (!ticket) return;
      setSelectedTicket((current) => current?.id === ticket.id ? ticket : current);
      setTickets((current) => current.map((item) => item.id === ticket.id ? ticket : item));
    });

    return () => socket.disconnect();
  }, [token]);

  const showContactMessage = (topic = "general") => {
    const topicName = typeof topic === "string" ? topic : "general";
    setCategory(topicName.toLowerCase());
    setError("");
    setContactVisible(true);
    if (topicName.toLowerCase() === "orders" && orders.length === 0) {
      setOrdersLoading(true);
      ordersAPI.getMyOrders(token, 1)
        .then((response) => setOrders(response.data?.orders || []))
        .catch((requestError) => setError(requestError.message || "Could not load your orders."))
        .finally(() => setOrdersLoading(false));
    }
  };

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setTicketVisible(true);
    try {
      const response = await supportAPI.getTicket(ticket.id, token);
      setSelectedTicket(response.data);
    } catch (requestError) {
      setError(requestError.message || "Could not load this support request.");
    }
  };

  const submitTicketReply = async () => {
    if (!selectedTicket || !ticketReply.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await supportAPI.addMessage(selectedTicket.id, ticketReply, token);
      setSelectedTicket((current) => ({
        ...current,
        status: "open",
        messages: [...(current.messages || []), response.data],
      }));
      setTicketReply("");
    } catch (requestError) {
      setError(requestError.message || "Could not send your reply.");
    } finally {
      setSaving(false);
    }
  };

  const submitTicket = async () => {
    if (!subject.trim() || !message.trim() || saving) return;
    if (category === "orders" && !selectedOrderId) {
      setError("Please select the order related to this request.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await supportAPI.createTicket({
        subject,
        category,
        message,
        ...(category === "orders" && { related_order_id: Number(selectedOrderId) }),
      }, token);
      setTickets((current) => [response.data, ...current]);
      setSubject("");
      setMessage("");
      setSelectedOrderId("");
      setContactVisible(false);
      Alert.alert("Request sent", "Our support team will get back to you soon.");
    } catch (requestError) {
      setError(requestError.message || "Could not send your support request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={20} color={C.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Feather name="life-buoy" size={26} color={C.green} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>How can we help?</Text>
            <Text style={styles.heroText}>Find answers or get in touch with our support team.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Browse help topics</Text>
        <View style={styles.topicList}>
          {TOPICS.map((topic) => (
            <TouchableOpacity key={topic.title} style={styles.topicRow} activeOpacity={0.85} onPress={() => showContactMessage(topic.title)}>
              <View style={[styles.topicIcon, { backgroundColor: topic.background }]}>
                <Feather name={topic.icon} size={18} color={topic.color} />
              </View>
              <View style={styles.topicCopy}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicText}>{topic.text}</Text>
              </View>
              <View style={styles.chevronWrap}>
                <Feather name="chevron-right" size={18} color={C.gray400} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Your requests</Text>
        {loading ? <ActivityIndicator color={C.green} /> : tickets.length === 0 ? <Text style={styles.emptyText}>No support requests yet.</Text> : tickets.map((ticket) => (
          <TouchableOpacity key={ticket.id} style={styles.ticketRow} onPress={() => openTicket(ticket)} activeOpacity={0.85}>
            <View style={styles.ticketDot} />
            <View style={styles.ticketCopy}>
              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <Text style={styles.ticketMeta}>{ticket.ticket_number} · {ticket.status.replaceAll("_", " ")}</Text>
            </View>
            <Feather name="chevron-right" size={17} color={C.gray400} />
          </TouchableOpacity>
        ))}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactText}>Our support team can help with your account, orders, payments, and delivery.</Text>
          <TouchableOpacity style={styles.contactButton} onPress={() => showContactMessage("general")} activeOpacity={0.8}>
            <Feather name="message-circle" size={17} color={C.white} />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={contactVisible}
        animationType="fade"
        onRequestClose={() => setContactVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setContactVisible(false)}>
          <Pressable style={styles.contactModal} onPress={() => {}}>
            <View style={styles.modalIcon}>
              <Feather name="message-circle" size={24} color={C.green} />
            </View>
            <Text style={styles.modalTitle}>Contact Support</Text>
            {category === "orders" && <>
              <Text style={styles.fieldLabel}>Select the affected order</Text>
              {ordersLoading ? <ActivityIndicator color={C.green} /> : orders.length === 0 ? <Text style={styles.emptyText}>No orders found.</Text> : <View style={styles.orderList}>
                {orders.map((order) => <TouchableOpacity key={order.id} style={[styles.orderOption, String(order.id) === selectedOrderId && styles.orderOptionSelected]} onPress={() => setSelectedOrderId(String(order.id))} activeOpacity={0.8}>
                  <View style={styles.ticketCopy}>
                    <Text style={styles.orderNumber}>{order.order_number || `Order #${order.id}`}</Text>
                    <Text style={styles.ticketMeta}>{order.status} · ₹{order.total}</Text>
                  </View>
                  {String(order.id) === selectedOrderId && <Feather name="check-circle" size={18} color={C.green} />}
                </TouchableOpacity>)}
              </View>}
            </>}
            <TextInput style={styles.input} placeholder="What do you need help with?" placeholderTextColor={C.gray400} value={subject} onChangeText={setSubject} />
            <TextInput style={[styles.input, styles.messageInput]} placeholder="Describe the issue" placeholderTextColor={C.gray400} multiline value={message} onChangeText={setMessage} />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={submitTicket}
              activeOpacity={0.8}
            >
              {saving ? <ActivityIndicator color={C.white} /> : <Text style={styles.modalButtonText}>Send request</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={ticketVisible}
        animationType="slide"
        onRequestClose={() => setTicketVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setTicketVisible(false)}>
          <Pressable style={styles.ticketModal} onPress={() => {}}>
            <View style={styles.ticketModalHeader}>
              <View style={styles.ticketCopy}>
                <Text style={styles.modalTitle}>{selectedTicket?.subject}</Text>
                <Text style={styles.ticketMeta}>{selectedTicket?.ticket_number} · {selectedTicket?.status?.replaceAll("_", " ")}</Text>
              </View>
              <TouchableOpacity onPress={() => setTicketVisible(false)} accessibilityLabel="Close ticket">
                <Feather name="x" size={22} color={C.gray700} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
              {(selectedTicket?.messages || []).map((item) => (
                <View key={item.id} style={[styles.messageBubble, item.sender_type === "user" ? styles.userMessage : styles.adminMessage]}>
                  <Text style={styles.messageSender}>{item.sender_type === "admin" ? "Support" : "You"}</Text>
                  <Text style={styles.messageText}>{item.message}</Text>
                  <Text style={styles.messageTime}>{new Date(item.created_at).toLocaleString()}</Text>
                </View>
              ))}
            </ScrollView>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <TextInput style={[styles.input, styles.messageInput]} placeholder="Reply to support" placeholderTextColor={C.gray400} multiline value={ticketReply} onChangeText={setTicketReply} />
            <TouchableOpacity style={styles.modalButton} onPress={submitTicketReply} activeOpacity={0.8}>
              {saving ? <ActivityIndicator color={C.white} /> : <Text style={styles.modalButtonText}>Send reply</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 36 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  backButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.gray900 },
  headerSpacer: { width: 42 },
  hero: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.gray200, marginBottom: 28, shadowColor: C.shadow, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  heroIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: C.greenLight, alignItems: "center", justifyContent: "center", marginRight: 14 },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: "800", color: C.gray900, marginBottom: 5 },
  heroText: { fontSize: 13, lineHeight: 19, color: C.gray500 },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: C.gray500, letterSpacing: 0.9, textTransform: "uppercase", marginBottom: 12 },
  topicList: { gap: 12 },
  topicRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.gray200, shadowColor: C.shadow, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  topicIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 13 },
  topicCopy: { flex: 1 },
  topicTitle: { fontSize: 17, fontWeight: "800", color: C.gray900, marginBottom: 4 },
  topicText: { fontSize: 13, color: C.gray500 },
  chevronWrap: { marginLeft: 10, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.gray100 },
  contactSection: { backgroundColor: C.greenLight, borderRadius: 18, padding: 20, marginTop: 28, borderWidth: 1, borderColor: "#BBF7D0" },
  contactTitle: { fontSize: 17, fontWeight: "800", color: C.gray900, marginBottom: 6 },
  contactText: { fontSize: 13, lineHeight: 20, color: C.gray700, marginBottom: 16 },
  contactButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.green, borderRadius: 13, paddingVertical: 13 },
  contactButtonText: { fontSize: 14, fontWeight: "800", color: C.white },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17, 24, 39, 0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  contactModal: { width: "100%", maxWidth: 420, backgroundColor: C.white, borderRadius: 18, padding: 24, alignItems: "center" },
  modalIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.greenLight, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: C.gray900, marginBottom: 8 },
  modalText: { fontSize: 13, lineHeight: 20, color: C.gray500, textAlign: "center", marginBottom: 20 },
  modalButton: { width: "100%", backgroundColor: C.green, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  modalButtonText: { fontSize: 14, fontWeight: "800", color: C.white },
  input: { width: "100%", borderWidth: 1, borderColor: C.gray200, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, color: C.gray900, marginBottom: 10 },
  fieldLabel: { alignSelf: "flex-start", fontSize: 12, fontWeight: "700", color: C.gray700, marginBottom: 8 },
  orderList: { width: "100%", maxHeight: 150, marginBottom: 10 },
  orderOption: { width: "100%", flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.gray200, borderRadius: 10, padding: 10, marginBottom: 6 },
  orderOptionSelected: { borderColor: C.green, backgroundColor: C.greenLight },
  orderNumber: { fontSize: 13, fontWeight: "700", color: C.gray900, marginBottom: 3 },
  messageInput: { minHeight: 90, textAlignVertical: "top" },
  errorText: { width: "100%", color: "#DC2626", fontSize: 12, marginBottom: 10 },
  emptyText: { color: C.gray500, fontSize: 13, marginBottom: 18 },
  ticketRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 14, borderWidth: 1, borderColor: C.gray200, marginBottom: 10, shadowColor: C.shadow, shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  ticketDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: C.green, marginRight: 12 },
  ticketCopy: { flex: 1 },
  ticketSubject: { fontSize: 15, fontWeight: "800", color: C.gray900, marginBottom: 4 },
  ticketMeta: { fontSize: 12, color: C.gray500, textTransform: "capitalize" },
  ticketModal: { width: "100%", maxWidth: 520, maxHeight: "85%", backgroundColor: C.white, borderRadius: 18, padding: 20 },
  ticketModalHeader: { flexDirection: "row", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: C.gray200, paddingBottom: 14, marginBottom: 12 },
  messages: { maxHeight: 360 },
  messagesContent: { gap: 10, paddingVertical: 4 },
  messageBubble: { maxWidth: "82%", borderRadius: 14, padding: 12 },
  userMessage: { alignSelf: "flex-end", backgroundColor: C.greenLight },
  adminMessage: { alignSelf: "flex-start", backgroundColor: C.gray100 },
  messageSender: { fontSize: 10, fontWeight: "800", color: C.gray500, marginBottom: 4 },
  messageText: { fontSize: 13, lineHeight: 19, color: C.gray900 },
  messageTime: { fontSize: 9, color: C.gray400, marginTop: 5 },
});
