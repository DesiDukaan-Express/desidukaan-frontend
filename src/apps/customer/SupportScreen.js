
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredTopics = TOPICS.filter((topic) =>
  `${topic.title} ${topic.text}`
    .toLowerCase()
    .includes(searchQuery.trim().toLowerCase())
);

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
  <View style={styles.heroCopy}>
    <Text style={styles.heroEyebrow}>WE'RE HERE TO HELP!</Text>

    <Text style={styles.heroTitle}>
      How can we help you today?
    </Text>

    <Text style={styles.heroText}>
      Find answers to common questions or get in touch with our support team.
    </Text>

    <View style={styles.searchBox}>
      <Feather name="search" size={21} color="#8198A6" />

      <TextInput
        style={styles.searchInput}
        placeholder="Search help topics..."
        placeholderTextColor="#8198A6"
        value={searchQuery}
        onChangeText={setSearchQuery}
        returnKeyType="search"
        accessibilityLabel="Search help topics"
      />

      {!!searchQuery && (
        <TouchableOpacity
          onPress={() => setSearchQuery("")}
          accessibilityLabel="Clear search"
        >
          <Feather name="x-circle" size={19} color="#8198A6" />
        </TouchableOpacity>
      )}
    </View>
  </View>

  {isWide && (
    <View style={styles.heroImageWrap}>
      <Image
        
        source={require("../../../assets/support-agent.png")}
        style={styles.supportAgent}
        resizeMode="contain"
        accessibilityLabel="Friendly customer support agent"
      />
    </View>
  )}
</View>

styles.sectionTitle

<View style={styles.contactSection}>
  <View style={styles.contactIcon}>
    <Feather name="headphones" size={30} color="#07864A" />
  </View>

  <View style={styles.contactCopy}>
    <Text style={styles.contactTitle}>Still need help?</Text>
    <Text style={styles.contactText}>
      Our support team can help with your account, orders, payments, and delivery.
    </Text>
  </View>

  <TouchableOpacity
    style={styles.contactButton}
    onPress={() => showContactMessage("general")}
    activeOpacity={0.8}
  >
    <Feather name="message-circle" size={19} color="#07864A" />
    <Text style={styles.contactButtonText}>Contact Support</Text>
    <Feather name="arrow-right" size={18} color="#07864A" />
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
  /* Page and header */
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE8E2",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#142D26",
    textAlign: "center",
  },
  headerSpacer: {
    width: 44,
  },

  /* Hero banner */
  hero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDFAEF",
    borderRadius: 26,
    paddingVertical: 28,
    paddingHorizontal: 28,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#D9F2DE",
    overflow: "hidden",
    minHeight: 245,
  },
  heroCopy: {
    flex: 1,
    justifyContent: "center",
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: "#16834D",
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "900",
    color: "#104D3D",
    marginBottom: 10,
  },
  heroText: {
    fontSize: 15,
    lineHeight: 23,
    color: "#52796F",
    marginBottom: 20,
    maxWidth: 570,
  },
  heroImageWrap: {
    width: "42%",
    height: 245,
    alignItems: "center",
    justifyContent: "center",
  },
  supportAgent: {
    width: "100%",
    height: "100%",
  },

  /* Search bar */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    minHeight: 54,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0ECE4",
    gap: 12,
    maxWidth: 620,
    shadowColor: "#245C42",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#243F36",
    paddingVertical: 12,
  },

  /* Section headings */
  topicsHeading: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 24,
    fontWeight: "900",
    color: "#164C3E",
    marginBottom: 7,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#718096",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#68766F",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginTop: 30,
    marginBottom: 14,
  },

  /* Help topic cards */
  topicList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  topicCard: {
    minHeight: 205,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#245C42",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  topicIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  topicCopy: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#183D31",
    marginBottom: 7,
  },
  topicText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#718096",
    paddingRight: 4,
  },
  topicArrow: {
    position: "absolute",
    right: 17,
    bottom: 17,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  noTopics: {
    width: "100%",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    color: "#647D8C",
    fontSize: 14,
    lineHeight: 21,
  },

  /* Contact support banner */
  contactSection: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 18,
    backgroundColor: "#16805B",
    borderRadius: 24,
    padding: 25,
    marginTop: 30,
    overflow: "hidden",
  },
  contactIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#D9FBE7",
    alignItems: "center",
    justifyContent: "center",
  },
  contactCopy: {
    flex: 1,
    minWidth: 200,
  },
  contactTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 7,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#E0F6EA",
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#07864A",
  },

  /* Loading and support requests */
  emptyText: {
    color: "#647D8C",
    fontSize: 14,
    marginBottom: 18,
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    paddingVertical: 17,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E3EEE7",
    marginBottom: 10,
    shadowColor: "#245C42",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  ticketDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
    marginRight: 12,
  },
  ticketCopy: {
    flex: 1,
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: "800",
    color: "#183D31",
    marginBottom: 4,
  },
  ticketMeta: {
    fontSize: 12,
    color: "#708477",
    textTransform: "capitalize",
  },

  /* Contact form modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.50)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  contactModal: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
  },
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  modalText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    width: "100%",
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  fieldLabel: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  orderList: {
    width: "100%",
    maxHeight: 150,
    marginBottom: 10,
  },
  orderOption: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  orderOptionSelected: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  messageInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorText: {
    width: "100%",
    color: "#DC2626",
    fontSize: 12,
    marginBottom: 10,
  },

  /* Ticket conversation modal */
  ticketModal: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  ticketModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 14,
    marginBottom: 12,
  },
  messages: {
    maxHeight: 360,
  },
  messagesContent: {
    gap: 10,
    paddingVertical: 4,
  },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 14,
    padding: 12,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#F0FDF4",
  },
  adminMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
  },
  messageSender: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#111827",
  },
  messageTime: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 5,
  },
});
