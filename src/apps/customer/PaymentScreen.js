import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Linking, Alert, Platform, TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import useOrderStore from "../../store/orderStore";
import useAuthStore from "../../store/authStore";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const C = {
  orange: "#F97316", orangeDark: "#EA580C",
  green: "#16A34A", greenDark: "#15803D",
  greenLight: "#F0FDF4", greenBorder: "#BBF7D0", greenMid: "#DCFCE7",
  white: "#FFFFFF", bg: "#F8FAFC",
  gray100: "#F3F4F6", gray200: "#E5E7EB", gray300: "#D1D5DB",
  gray400: "#9CA3AF", gray500: "#6B7280", gray600: "#4B5563",
  gray700: "#374151", gray900: "#111827",
  red: "#EF4444", redLight: "#FEF2F2",
  amber: "#D97706", amberLight: "#FEF3C7",
  purple: "#7C3AED",
};

const PAYMENT_METHODS = [
  { id: "upi",  label: "UPI",                sub: "Google Pay, PhonePe, Paytm & more", icon: "smartphone", color: "#7C3AED" },
  { id: "card", label: "Credit / Debit Card", sub: "Visa, Mastercard, RuPay",           icon: "credit-card", color: "#2563EB" },
  { id: "cod",  label: "Cash on Delivery",    sub: "Pay when delivered",                icon: "dollar-sign", color: "#16A34A" },
];

function fmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtSlot(slot) {
  if (!slot) return "As soon as possible";
  const start = slot.vendor_slot_start || slot.slot_start || slot.start;
  const end = slot.vendor_slot_end || slot.slot_end || slot.end;
  if (!start || !end) return "As soon as possible";
  const day = new Date(start).toDateString() === new Date().toDateString() ? "Today" : "Tomorrow";
  return `${day}, ${fmt(start)} – ${fmt(end)}`;
}

export default function PaymentScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { token }  = useAuthStore();
  const clearPendingOrder = useOrderStore((s) => s.clearPendingOrder);

  const {
    orderId, orderNumber, vendorName,
    items = [], subtotal = 0, deliveryFee = 0, total = 0,
    confirmedSlot = null, deliveryTypePref = "standard",
    vendorPhone = null, phoneStatus = null,
    preSelectedPay = null,
  } = route.params || {};

  const [selectedPay, setSelectedPay] = useState(preSelectedPay || null);
  const [upiId,        setUpiId]        = useState("");
  const [upiValidated, setUpiValidated] = useState(false);
  const [upiValidating,setUpiValidating]= useState(false);
  const [upiError,     setUpiError]     = useState(null);
  const [cardNum,      setCardNum]      = useState("");
  const [cardExpiry,   setCardExpiry]   = useState("");
  const [cardCVV,      setCardCVV]      = useState("");
  const [placing,      setPlacing]      = useState(false);

  const handlePay = () => {
    if (!selectedPay) {
      Alert.alert("Select Payment", "Please choose a payment method.");
      return;
    }
    setPlacing(true);
    setTimeout(() => {
      setPlacing(false);
      clearPendingOrder();
      navigation.replace("OrderPlaced", {
        orderId, orderNumber: orderNumber || `ORD-${orderId}`,
        vendorName, slot: confirmedSlot,
      });
    }, 1500);
  };

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={C.gray900} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>Payment</Text>
          <Text style={st.headerSub}>{vendorName}</Text>
        </View>
        <View style={st.totalChip}>
          <Text style={st.totalChipText}>₹{total}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Order Confirmed Banner ── */}
        <View style={st.confirmedBanner}>
          <View style={st.confirmedIconWrap}>
            <Feather name="check-circle" size={22} color={C.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.confirmedTitle}>Order Confirmed!</Text>
            <Text style={st.confirmedSub}>{vendorName} has accepted your order.</Text>
          </View>
        </View>

        {/* ── Delivery Slot ── */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <Feather name="clock" size={15} color={C.green} />
            <Text style={st.cardTitle}>Delivery Slot</Text>
          </View>
          <View style={st.slotRow}>
            <Feather name="calendar" size={14} color={C.green} />
            <Text style={st.slotText}>{fmtSlot(confirmedSlot)}</Text>
          </View>
        </View>

        {/* ── Order Summary ── */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <Feather name="shopping-bag" size={15} color={C.green} />
            <Text style={st.cardTitle}>Order Summary</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={[st.itemRow, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.gray100 }]}>
              <View style={st.itemDot} />
              <Text style={st.itemName} numberOfLines={1}>{item.name || item.product_name}</Text>
              <Text style={st.itemQty}>×{item.qty ?? item.quantity ?? 1}</Text>
              <Text style={st.itemPrice}>₹{(item.price ?? item.product_price ?? 0) * (item.qty ?? item.quantity ?? 1)}</Text>
            </View>
          ))}
          <View style={st.divider} />
          <View style={st.summaryRow}>
            <Text style={st.summaryLabel}>Items total</Text>
            <Text style={st.summaryVal}>₹{subtotal}</Text>
          </View>
          <View style={st.summaryRow}>
            <Text style={st.summaryLabel}>Delivery ({deliveryTypePref === "quick" ? "Quick ⚡" : "Standard"})</Text>
            <Text style={st.summaryVal}>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</Text>
          </View>
          <View style={[st.divider, { borderStyle: "dashed" }]} />
          <View style={st.summaryRow}>
            <Text style={[st.summaryLabel, { fontSize: 16, fontWeight: "900", color: C.gray900 }]}>Total payable</Text>
            <Text style={[st.summaryVal, { fontSize: 17, color: C.green }]}>₹{total}</Text>
          </View>
        </View>

        {/* ── Vendor Contact ── */}
        {phoneStatus === "approved" && vendorPhone ? (
          <View style={st.card}>
            <View style={st.cardHeader}>
              <Feather name="phone" size={15} color={C.green} />
              <Text style={st.cardTitle}>Vendor Contact</Text>
            </View>
            <View style={st.phoneRow}>
              <Feather name="phone-call" size={16} color={C.green} />
              <Text style={st.phoneNum}>{vendorPhone}</Text>
              <TouchableOpacity style={st.callBtn} onPress={() => Linking.openURL(`tel:${vendorPhone}`)}>
                <Feather name="phone" size={13} color={C.white} />
                <Text style={st.callBtnText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* ── Payment Method ── */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <Feather name="credit-card" size={15} color={C.green} />
            <Text style={st.cardTitle}>Payment Method</Text>
          </View>
          {PAYMENT_METHODS.map((pm) => {
            const active = selectedPay === pm.id;
            return (
              <View key={pm.id}>
                <TouchableOpacity
                  style={[st.payOption, active && st.payOptionActive]}
                  onPress={() => setSelectedPay(active ? null : pm.id)}
                  activeOpacity={0.85}
                >
                  <View style={[st.payIcon, { backgroundColor: pm.color + "18" }]}>
                    <Feather name={pm.icon} size={18} color={pm.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.payLabel, active && { color: C.gray900, fontWeight: "800" }]}>{pm.label}</Text>
                    <Text style={st.paySub}>{pm.sub}</Text>
                  </View>
                  <View style={[st.radioOuter, active && { borderColor: C.green }]}>
                    {active && <View style={st.radioDot} />}
                  </View>
                </TouchableOpacity>

                {/* UPI expansion */}
                {active && pm.id === "upi" && (
                  <View style={st.upiPanel}>
                    <Text style={st.upiFieldLabel}>Enter UPI ID</Text>
                    <View style={[st.upiInputRow, upiError && { borderColor: C.red }, upiValidated && { borderColor: C.green }]}>
                      <Feather name="at-sign" size={14} color={upiValidated ? C.green : upiError ? C.red : C.gray400} />
                      <TextInput
                        style={st.upiInput}
                        placeholder="yourname@upi"
                        placeholderTextColor={C.gray400}
                        value={upiId}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={(t) => { setUpiId(t); setUpiValidated(false); setUpiError(null); }}
                      />
                      {upiValidating && <ActivityIndicator size="small" color={C.green} />}
                      {upiValidated && !upiValidating && <Feather name="check-circle" size={15} color={C.green} />}
                    </View>
                    {upiError ? <Text style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{upiError}</Text> : null}
                    {upiId.trim().length > 3 && !upiValidated && !upiValidating && (
                      <TouchableOpacity
                        style={st.verifyBtn}
                        onPress={async () => {
                          setUpiValidating(true); setUpiError(null);
                          try {
                            const res = await fetch(`${BASE_URL}/payments/verify-upi`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ upi_id: upiId.trim() }),
                            });
                            const d = await res.json();
                            if (d.valid || d.data?.valid) { setUpiValidated(true); }
                            else { setUpiError(d.message || "Invalid UPI ID."); }
                          } catch { setUpiValidated(true); }
                          finally { setUpiValidating(false); }
                        }}
                      >
                        <Text style={st.verifyBtnText}>Verify UPI ID</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Card expansion */}
                {active && pm.id === "card" && (
                  <View style={st.upiPanel}>
                    <View style={st.upiInputRow}>
                      <Feather name="credit-card" size={14} color={C.gray400} />
                      <TextInput
                        style={st.upiInput} placeholder="Card number"
                        placeholderTextColor={C.gray400} keyboardType="number-pad" maxLength={19}
                        value={cardNum}
                        onChangeText={(t) => setCardNum(t.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim())}
                      />
                    </View>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                      <View style={[st.upiInputRow, { flex: 1 }]}>
                        <Feather name="calendar" size={14} color={C.gray400} />
                        <TextInput
                          style={st.upiInput} placeholder="MM/YY"
                          placeholderTextColor={C.gray400} keyboardType="number-pad" maxLength={5}
                          value={cardExpiry}
                          onChangeText={(t) => { const c = t.replace(/\D/g, ""); setCardExpiry(c.length > 2 ? `${c.slice(0,2)}/${c.slice(2)}` : c); }}
                        />
                      </View>
                      <View style={[st.upiInputRow, { flex: 1 }]}>
                        <Feather name="lock" size={14} color={C.gray400} />
                        <TextInput
                          style={st.upiInput} placeholder="CVV"
                          placeholderTextColor={C.gray400} keyboardType="number-pad" maxLength={4}
                          secureTextEntry value={cardCVV} onChangeText={setCardCVV}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Pay Button ── */}
      <View style={st.footer}>
        <TouchableOpacity
          style={[st.payBtn, (!selectedPay || placing) && { opacity: 0.65 }]}
          onPress={handlePay}
          disabled={!selectedPay || placing}
          activeOpacity={0.88}
        >
          {placing ? (
            <View style={st.payBtnInner}>
              <ActivityIndicator color={C.white} />
              <Text style={st.payBtnText}>Processing...</Text>
            </View>
          ) : (
            <LinearGradient colors={[C.green, C.greenDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.payBtnInner}>
              <View style={{ alignItems: "center" }}>
                <Text style={[st.payBtnText, { fontSize: 20 }]}>₹{total}</Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "600" }}>TOTAL</Text>
              </View>
              <View style={{ width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.3)" }} />
              <Text style={st.payBtnText}>Pay Now</Text>
              <Feather name="arrow-right" size={18} color={C.white} />
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16,
                 paddingTop: Platform.OS === "ios" ? 52 : 16, paddingBottom: 14,
                 backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  backBtn:     { width: 38, height: 38, borderRadius: 12, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: C.orange },
  headerSub:   { fontSize: 12, color: C.gray500, marginTop: 1 },
  totalChip:   { backgroundColor: C.greenLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.greenBorder },
  totalChipText: { fontSize: 14, fontWeight: "900", color: C.greenDark },

  confirmedBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.greenLight,
                     borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: C.greenBorder },
  confirmedIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.greenMid, alignItems: "center", justifyContent: "center" },
  confirmedTitle: { fontSize: 15, fontWeight: "900", color: C.greenDark },
  confirmedSub:   { fontSize: 12, color: C.green, marginTop: 2 },

  card:       { backgroundColor: C.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.gray200 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14,
                paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  cardTitle:  { fontSize: 15, fontWeight: "800", color: C.gray900 },

  slotRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.greenLight,
             borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.greenBorder },
  slotText: { fontSize: 15, fontWeight: "800", color: C.greenDark, flex: 1 },

  itemRow:   { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  itemDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green, flexShrink: 0 },
  itemName:  { flex: 1, fontSize: 13, color: C.gray700, fontWeight: "500" },
  itemQty:   { fontSize: 12, color: C.gray400 },
  itemPrice: { fontSize: 13, fontWeight: "700", color: C.gray900, minWidth: 44, textAlign: "right" },
  divider:   { height: 1, backgroundColor: C.gray200, marginVertical: 10 },
  summaryRow:  { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  summaryLabel:{ fontSize: 13, color: C.gray500 },
  summaryVal:  { fontSize: 13, fontWeight: "700", color: C.gray900 },

  phoneRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.greenLight,
              borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.greenBorder },
  phoneNum: { flex: 1, fontSize: 16, fontWeight: "800", color: C.greenDark },
  callBtn:  { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.green,
              paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  callBtnText: { fontSize: 12, fontWeight: "800", color: C.white },

  payOption:       { flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                     borderRadius: 12, borderWidth: 1.5, borderColor: C.gray200, marginBottom: 8, backgroundColor: "#FAFAFA" },
  payOptionActive: { borderColor: C.green, backgroundColor: C.greenLight },
  payIcon:         { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  payLabel:        { fontSize: 14, fontWeight: "700", color: C.gray900 },
  paySub:          { fontSize: 11, color: C.gray400, marginTop: 2 },
  radioOuter:      { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.gray300,
                     alignItems: "center", justifyContent: "center" },
  radioDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: C.green },

  upiPanel:     { backgroundColor: C.gray100, borderRadius: 12, padding: 14, marginBottom: 8 },
  upiFieldLabel:{ fontSize: 11, fontWeight: "700", color: C.gray600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  upiInputRow:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.white,
                  borderRadius: 10, borderWidth: 1.5, borderColor: C.gray200, paddingHorizontal: 12, height: 46 },
  upiInput:     { flex: 1, fontSize: 14, color: C.gray900 },
  verifyBtn:    { marginTop: 10, backgroundColor: C.green, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  verifyBtnText:{ fontSize: 13, fontWeight: "800", color: C.white },

  footer:     { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16,
                backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.gray100,
                paddingBottom: Platform.OS === "ios" ? 30 : 16 },
  payBtn:     { borderRadius: 16, overflow: "hidden" },
  payBtnInner:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
                paddingVertical: 16, paddingHorizontal: 24 },
  payBtnText: { fontSize: 17, fontWeight: "900", color: C.white },
});
