import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useAuthStore from "../../store/authStore";
import * as ImagePicker from "expo-image-picker";
import { uploadAPI } from "../../services/api";
import AccountManagerModal from "../../components/common/AccountManagerModal";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ── Color tokens (matches Dashboard) ─────────────────────────
const C = {
  bg: "#F0F4F8",
  surface: "#FFFFFF",
  primary: "#0EE627",
  primaryDim: "#0EE62718",
  primaryDark: "#09a81c",
  green: "#147538",
  greenDim: "#14753818",
  accent: "#0F172A",
  text: "#0F172A",
  textSub: "#64748B",
  textLight: "#94A3B8",
  border: "#E2E8F0",
  borderDark: "#CBD5E0",
  red: "#EF4444",
  redDim: "#FEF2F2",
  blue: "#3B82F6",
  blueDim: "#EFF6FF",
  orange: "#F97316",
  orangeDim: "#FFF7ED",
};

export default function VendorProfileScreen() {
  const { token, logout } = useAuthStore();
  const { width: SCREEN_W } = useWindowDimensions();

  // Responsive helpers
  const isSmall = SCREEN_W < 360;
  const isMedium = SCREEN_W >= 360 && SCREEN_W < 420;
  const rs = (sm, md, lg) => (isSmall ? sm : isMedium ? md : lg);
  const isWide = SCREEN_W >= 768;

  // ── State ──────────────────────────────────────────────────
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeOpen, setStoreOpen] = useState(true);
  const [badWeather, setBadWeather] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Modals
  const [imageModal, setImageModal]     = useState(false);
  const [timeModal, setTimeModal]       = useState(false);
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [editModal, setEditModal]       = useState(false);
  const [logoutModal, setLogoutModal]   = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);

  // Edit fields
  const [activeField, setActiveField] = useState("");
  const [activeLabel, setActiveLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [urlInput, setUrlInput] = useState("");

  // ── Fetch ──────────────────────────────────────────────────
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/vendors/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setVendor(data.data.vendor);
        setStoreOpen(data.data.vendor.is_open);
        setBadWeather(data.data.vendor.is_bad_weather || false);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = async (field, value) => {
    if (!vendor) return;
    try {
      const res = await fetch(`${API_BASE}/vendors/${vendor.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        setVendor(data.data.vendor);
      } else {
        Alert.alert("Error", data.message || "Failed to update");
      }
    } catch (err) {
      Alert.alert("Error", "Check your connection and try again.");
    }
  };

  const handleToggleOpen = async (val) => {
    const prev = storeOpen;
    setStoreOpen(val);
    try {
      const res = await fetch(`${API_BASE}/vendors/${vendor.id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) setStoreOpen(prev);
    } catch {
      setStoreOpen(prev);
    }
  };

  const handleToggleBadWeather = async (val) => {
    const prev = badWeather;
    setBadWeather(val);
    try {
      const res = await fetch(`${API_BASE}/vendors/${vendor.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_bad_weather: val }),
      });
      const data = await res.json();
      if (data.success) {
        setVendor(data.data.vendor);
      } else {
        setBadWeather(prev);
      }
    } catch {
      setBadWeather(prev);
    }
  };

  const openEdit = (field, label, currentValue) => {
    setActiveField(field);
    setActiveLabel(label);
    setEditValue(String(currentValue ?? ""));
    setEditModal(true);
  };

  const saveEdit = () => {
    const valTrim = editValue.trim();
    if (!valTrim) {
      Alert.alert("Required", `${activeLabel} cannot be empty`);
      return;
    }
    if (activeField === "opening_time" || activeField === "closing_time") {
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(valTrim)) {
        Alert.alert("Invalid Format", "Use HH:MM format (e.g. 09:30)");
        return;
      }
    }
    if (["min_order_value", "quick_delivery_fee", "weather_surcharge", "delivery_base_km", "delivery_fee_base", "delivery_fee_per_km"].includes(activeField)) {
      if (isNaN(parseFloat(valTrim))) {
        Alert.alert("Invalid Input", "Please enter a valid numeric value.");
        return;
      }
    }
    handleUpdateField(activeField, valTrim);
    setEditModal(false);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        setUploading(true);
        const { url } = await uploadAPI.upload(
          result.assets[0].uri,
          result.assets[0].mimeType || "image/jpeg",
          token
        );
        await handleUpdateField("shop_image_url", url);
        setImageModal(false);
      }
    } catch (e) {
      Alert.alert("Error", "Image upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────
  const initials = vendor?.shop_name
    ? vendor.shop_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const memberSince = vendor?.created_at
    ? new Date(vendor.created_at).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.green} />
        <Text style={{ color: C.textSub, marginTop: 12 }}>Loading profile…</Text>
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={40} color={C.textLight} />
        <Text style={{ color: C.textSub, marginTop: 12 }}>Could not load profile.</Text>
      </View>
    );
  }

  // ── Layout: wide uses two-column ──────────────────────────
  const content = (
    <>
      {/* ── HERO HEADER ──────────────────────────────────── */}
      <LinearGradient
        colors={["#147538", "#0d5a29"]}
        style={[
          styles.hero,
          {
            paddingTop: Platform.OS === "ios" ? 52 : isWide ? 32 : 40,
            paddingHorizontal: isWide ? 40 : rs(16, 20, 24),
            paddingBottom: isWide ? 36 : 28,
          },
        ]}
      >
        <Text
          style={[
            styles.heroOverline,
            { fontSize: isWide ? 11 : rs(10, 11, 11) },
          ]}
        >
          MY PROFILE
        </Text>

        <View
          style={[
            styles.heroRow,
            { gap: isWide ? 24 : rs(14, 16, 18), marginTop: isWide ? 20 : 16 },
          ]}
        >
          {/* Avatar */}
          <TouchableOpacity
            onPress={() => setImageModal(true)}
            activeOpacity={0.85}
            style={{ position: "relative" }}
          >
            <View
              style={[
                styles.avatarRing,
                {
                  width: isWide ? 100 : rs(76, 84, 90),
                  height: isWide ? 100 : rs(76, 84, 90),
                  borderRadius: isWide ? 50 : rs(38, 42, 45),
                },
              ]}
            >
              <Image
                source={{
                  uri:
                    vendor.shop_image_url ||
                    "https://lh3.googleusercontent.com/TW79DOPeTuw01SC4TNqtKXHNMjG1HGU7LT_-Ph2bY9COIgXwP0PBAQ_NxEyNu7cO4ofS5xu75SIF3t5WyXKjBF7Rng=w300-rw",
                }}
                style={[
                  styles.avatar,
                  {
                    width: isWide ? 92 : rs(70, 78, 84),
                    height: isWide ? 92 : rs(70, 78, 84),
                    borderRadius: isWide ? 46 : rs(35, 39, 42),
                  },
                ]}
              />
            </View>
            <View style={styles.cameraBadge}>
              <MaterialIcons name="camera-alt" size={13} color={C.green} />
            </View>
          </TouchableOpacity>

          {/* Name / info */}
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.heroName,
                { fontSize: isWide ? 26 : rs(18, 21, 23) },
              ]}
            >
              {vendor.shop_name}
            </Text>

            <View style={styles.heroPhonePill}>
              <MaterialIcons name="phone" size={12} color={C.primary} />
              <Text style={[styles.heroPhone, { fontSize: isWide ? 13 : rs(11, 12, 13) }]}>
                {vendor.user?.phone || "No phone"}
              </Text>
            </View>

            <Text
              style={[
                styles.heroSince,
                { fontSize: isWide ? 12 : rs(10, 11, 12) },
              ]}
            >
              Vendor since {memberSince}
            </Text>
          </View>

          {/* Status badge — right side */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: storeOpen
                  ? "rgba(14,230,39,0.18)"
                  : "rgba(255,255,255,0.1)",
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: storeOpen ? C.primary : "#94a3b8" },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: storeOpen ? C.primary : "#94a3b8", fontSize: rs(11, 12, 12) },
              ]}
            >
              {storeOpen ? "Open" : "Closed"}
            </Text>
          </View>
        </View>

        {/* Stats strip */}
        <View
          style={[
            styles.statsStrip,
            {
              marginTop: isWide ? 28 : 22,
              borderRadius: isWide ? 16 : 14,
              padding: isWide ? 16 : rs(12, 14, 14),
            },
          ]}
        >
          <StatStripItem
            value={vendor.total_orders ?? 0}
            label="Total Orders"
            color="#fff"
            rs={rs}
            isWide={isWide}
          />
          <View style={styles.statsStripDivider} />
          <StatStripItem
            value={`${vendor.rating ?? 0} ⭐`}
            label="Rating"
            color="#fff"
            rs={rs}
            isWide={isWide}
          />
          <View style={styles.statsStripDivider} />
          <StatStripItem
            value={`₹${Number(vendor.earnings ?? 0).toLocaleString("en-IN")}`}
            label="Earnings"
            color={C.primary}
            rs={rs}
            isWide={isWide}
          />
          <View style={styles.statsStripDivider} />
          <StatStripItem
            value={vendor.onboarding_status === "approved" ? "✓" : "Pending"}
            label="KYC"
            color={vendor.onboarding_status === "approved" ? C.primary : "#F59E0B"}
            rs={rs}
            isWide={isWide}
          />
        </View>
      </LinearGradient>

      {/* ── BODY ─────────────────────────────────────────── */}
      <View
        style={[
          styles.body,
          {
            paddingHorizontal: isWide ? 40 : rs(14, 16, 18),
            paddingTop: isWide ? 28 : 20,
          },
        ]}
      >
        {isWide ? (
          // Wide: two columns
          <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 16 }}>
              <PersonalInfoCard
                vendor={vendor}
                onEdit={openEdit}
                rs={rs}
                isWide={isWide}
              />
              <StoreInfoCard vendor={vendor} onEdit={openEdit} onCategoryPress={() => setCategoryModal(true)} rs={rs} isWide={isWide} />
            </View>
            <View style={{ flex: 1, gap: 16 }}>
              <StoreSettingsCard
                vendor={vendor}
                storeOpen={storeOpen}
                onToggle={handleToggleOpen}
                badWeather={badWeather}
                onToggleBadWeather={handleToggleBadWeather}
                onEdit={openEdit}
                onDeliveryPress={() => setDeliveryModal(true)}
                rs={rs}
                isWide={isWide}
              />
              <AccountSettingsCard rs={rs} isWide={isWide} onPressManage={() => setShowAccountManager(true)} />
              <LogoutButton onPress={() => setLogoutModal(true)} rs={rs} isWide={isWide} />
            </View>
          </View>
        ) : (
          // Mobile: single column
          <View style={{ gap: 16 }}>
            <PersonalInfoCard
              vendor={vendor}
              onEdit={openEdit}
              rs={rs}
              isWide={isWide}
            />
            <StoreInfoCard vendor={vendor} onEdit={openEdit} onCategoryPress={() => setCategoryModal(true)} rs={rs} isWide={isWide} />
            <StoreSettingsCard
              vendor={vendor}
              storeOpen={storeOpen}
              onToggle={handleToggleOpen}
              badWeather={badWeather}
              onToggleBadWeather={handleToggleBadWeather}
              onEdit={openEdit}
              onDeliveryPress={() => setDeliveryModal(true)}
              rs={rs}
              isWide={isWide}
            />
            <AccountSettingsCard rs={rs} isWide={isWide} onPressManage={() => setShowAccountManager(true)} />
            <LogoutButton onPress={() => setLogoutModal(true)} rs={rs} isWide={isWide} />
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor="#147538" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {content}
      </ScrollView>

      {/* ── EDIT FIELD MODAL ─────────────────────────────── */}
      <Modal
        transparent
        visible={editModal}
        animationType="fade"
        onRequestClose={() => setEditModal(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { width: isWide ? 440 : "90%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {activeLabel}</Text>
              <TouchableOpacity onPress={() => setEditModal(false)} style={styles.modalClose}>
                <MaterialIcons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>{activeLabel}</Text>
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              placeholder={`Enter ${activeLabel.toLowerCase()}…`}
              placeholderTextColor={C.textLight}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setEditModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={{ color: C.textSub, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={styles.modalSaveBtn}>
                <Text style={{ color: "#000", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"}}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── IMAGE MODAL ──────────────────────────────────── */}
      <Modal
        transparent
        visible={imageModal}
        animationType="slide"
        onRequestClose={() => setImageModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setImageModal(false)}
        />
        <View style={[styles.sheet, { paddingBottom: Platform.OS === "ios" ? 34 : 20 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Change Shop Photo</Text>
            <TouchableOpacity onPress={() => setImageModal(false)} style={styles.modalClose}>
              <MaterialIcons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.sheetOption}
            onPress={pickImage}
            disabled={uploading}
          >
            <View style={[styles.sheetOptionIcon, { backgroundColor: C.greenDim }]}>
              {uploading ? (
                <ActivityIndicator size="small" color={C.green} />
              ) : (
                <MaterialIcons name="photo-library" size={20} color={C.green} />
              )}
            </View>
            <View>
              <Text style={styles.sheetOptionTitle}>Upload from Gallery</Text>
              <Text style={styles.sheetOptionSub}>Choose a photo from your device</Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.sheetOption, { flexDirection: "column", alignItems: "stretch", gap: 10 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.sheetOptionIcon, { backgroundColor: C.blueDim }]}>
                <MaterialIcons name="link" size={20} color={C.blue} />
              </View>
              <Text style={styles.sheetOptionTitle}>Paste Image URL</Text>
            </View>
            <TextInput
              style={styles.modalInput}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="https://…"
              placeholderTextColor={C.textLight}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={() => {
                if (urlInput.trim()) {
                  handleUpdateField("shop_image_url", urlInput.trim());
                  setImageModal(false);
                  setUrlInput("");
                }
              }}
            >
              <Text style={{ color: "#000", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"}}>Save URL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── DELIVERY TYPE MODAL ──────────────────────────── */}
      <Modal
        transparent
        visible={deliveryModal}
        animationType="slide"
        onRequestClose={() => setDeliveryModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setDeliveryModal(false)}
        />
        <View style={[styles.sheet, { paddingBottom: Platform.OS === "ios" ? 34 : 20 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Delivery Method</Text>
            <TouchableOpacity onPress={() => setDeliveryModal(false)} style={styles.modalClose}>
              <MaterialIcons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>
          {[
            { value: "self", label: "Self Delivery", sub: "You manage deliveries yourself", icon: "moped" },
            { value: "partner", label: "Partner Delivery", sub: "KwikPik delivery partners handle it", icon: "local-shipping" },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.sheetOption,
                vendor.delivery_type === opt.value && {
                  backgroundColor: C.greenDim,
                },
              ]}
              onPress={() => {
                handleUpdateField("delivery_type", opt.value);
                setDeliveryModal(false);
              }}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: C.greenDim }]}>
                <MaterialIcons name={opt.icon} size={20} color={C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>{opt.label}</Text>
                <Text style={styles.sheetOptionSub}>{opt.sub}</Text>
              </View>
              {vendor.delivery_type === opt.value && (
                <MaterialIcons name="check-circle" size={20} color={C.green} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* ── LOGOUT CONFIRM MODAL ─────────────────────────── */}
      <Modal
        transparent
        visible={logoutModal}
        animationType="fade"
        onRequestClose={() => setLogoutModal(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { width: isWide ? 400 : "85%" }]}>
            <View style={[styles.logoutIconWrap]}>
              <MaterialIcons name="logout" size={28} color={C.red} />
            </View>
            <Text style={styles.logoutModalTitle}>Log out?</Text>
            <Text style={styles.logoutModalSub}>
              You'll need to sign in again to access your vendor dashboard.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setLogoutModal(false)}
                style={[styles.modalCancelBtn, { flex: 1 }]}
              >
                <Text style={{ color: C.textSub, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setLogoutModal(false); logout(); }}
                style={[styles.logoutConfirmBtn, { flex: 1 }]}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold"}}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── STORE CATEGORY MODAL ─────────────────────────── */}
      <Modal
        transparent
        visible={categoryModal}
        animationType="slide"
        onRequestClose={() => setCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setCategoryModal(false)}
        />
        <View style={[styles.sheet, { paddingBottom: Platform.OS === "ios" ? 34 : 20 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Store Category</Text>
            <TouchableOpacity onPress={() => setCategoryModal(false)} style={styles.modalClose}>
              <MaterialIcons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>
          {[
            { value: "grocery",   label: "Grocery Store",     icon: "local-grocery-store", sub: "Daily essentials, FMCG" },
            { value: "medical",   label: "Medical / Pharmacy", icon: "local-pharmacy",       sub: "Medicines, health products" },
            { value: "bakery",    label: "Bakery",             icon: "cake",                 sub: "Bread, cakes, snacks" },
            { value: "dairy",     label: "Dairy & Eggs",       icon: "egg",                  sub: "Milk, paneer, eggs" },
            { value: "electronics", label: "Electronics",     icon: "devices",              sub: "Gadgets, accessories" },
            { value: "stationery", label: "Stationery",        icon: "edit",                 sub: "Books, pens, office" },
            { value: "restaurant", label: "Restaurant / Food", icon: "restaurant",           sub: "Cooked food, meals" },
            { value: "general",   label: "General Store",      icon: "store",                sub: "Multi-category" },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.sheetOption,
                vendor.store_category === opt.value && { backgroundColor: C.greenDim },
              ]}
              onPress={() => {
                handleUpdateField("store_category", opt.value);
                setCategoryModal(false);
              }}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: C.greenDim }]}>
                <MaterialIcons name={opt.icon} size={20} color={C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>{opt.label}</Text>
                <Text style={styles.sheetOptionSub}>{opt.sub}</Text>
              </View>
              {vendor.store_category === opt.value && (
                <MaterialIcons name="check-circle" size={20} color={C.green} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
      <AccountManagerModal
        visible={showAccountManager}
        onClose={() => setShowAccountManager(false)}
      />
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function StatStripItem({ value, label, color, rs, isWide }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text
        style={{
          fontSize: isWide ? 18 : rs(14, 16, 17),
          fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color,
          letterSpacing: -0.3,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: isWide ? 11 : rs(9, 10, 10),
          color: "rgba(255,255,255,0.6)",
          marginTop: 3,
          fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"}}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionCard({ title, overline, children, rs, isWide }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        {overline && (
          <Text style={[styles.sectionOverline, { fontSize: isWide ? 10 : rs(9, 10, 10) }]}>
            {overline}
          </Text>
        )}
        <Text style={[styles.sectionTitle, { fontSize: isWide ? 16 : rs(14, 15, 16) }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value, onEdit, editable = true, rs, isWide }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <Text style={[styles.infoLabel, { fontSize: isWide ? 11 : rs(10, 11, 11) }]}>
          {label.toUpperCase()}
        </Text>
        <Text
          style={[styles.infoValue, { fontSize: isWide ? 15 : rs(13, 14, 15) }]}
          numberOfLines={2}
        >
          {value || "Not set"}
        </Text>
      </View>
      {editable ? (
        <TouchableOpacity onPress={onEdit} style={styles.editIconBtn}>
          <MaterialIcons name="edit" size={16} color={C.green} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.editIconBtn, { backgroundColor: C.bg }]}>
          <MaterialIcons name="lock" size={15} color={C.textLight} />
        </View>
      )}
    </View>
  );
}

function PersonalInfoCard({ vendor, onEdit, rs, isWide }) {
  return (
    <SectionCard title="Personal Info" overline="ACCOUNT" rs={rs} isWide={isWide}>
      <InfoRow
        label="Shop Name"
        value={vendor.shop_name}
        onEdit={() => onEdit("shop_name", "Shop Name", vendor.shop_name)}
        rs={rs}
        isWide={isWide}
      />
      <InfoRow
        label="Owner Name"
        value={vendor.owner_name || vendor.user?.name}
        onEdit={() => onEdit("owner_name", "Owner Name", vendor.owner_name || vendor.user?.name)}
        rs={rs}
        isWide={isWide}
      />
      <InfoRow
        label="Email Address"
        value={vendor.user?.email}
        onEdit={() => onEdit("email", "Email Address", vendor.user?.email)}
        rs={rs}
        isWide={isWide}
      />
      <InfoRow
        label="Phone Number"
        value={vendor.user?.phone}
        editable={false}
        rs={rs}
        isWide={isWide}
      />
    </SectionCard>
  );
}

function StoreInfoCard({ vendor, onEdit, onCategoryPress, rs, isWide }) {
  const CATEGORY_LABELS = {
    grocery: "Grocery Store", medical: "Medical / Pharmacy",
    bakery: "Bakery", dairy: "Dairy & Eggs",
    electronics: "Electronics", stationery: "Stationery",
    restaurant: "Restaurant / Food", general: "General Store",
  };
  return (
    <SectionCard title="Store Info" overline="DETAILS" rs={rs} isWide={isWide}>
      <InfoRow
        label="Address"
        value={`${vendor.address_line}${vendor.pincode ? ", " + vendor.pincode : ""}`}
        onEdit={() => onEdit("address_line", "Address", vendor.address_line)}
        rs={rs}
        isWide={isWide}
      />
      <InfoRow
        label="Store Category"
        value={CATEGORY_LABELS[vendor.store_category] || "Not set"}
        onEdit={onCategoryPress}
        rs={rs}
        isWide={isWide}
      />
      <InfoRow
        label="Description"
        value={vendor.description}
        onEdit={() => onEdit("description", "Description", vendor.description)}
        rs={rs}
        isWide={isWide}
      />
      <InfoRow
        label="FSSAI Number"
        value={vendor.fssai_number}
        onEdit={() => onEdit("fssai_number", "FSSAI Number", vendor.fssai_number)}
        rs={rs}
        isWide={isWide}
      />
      <InfoRow
        label="GST Number"
        value={vendor.gst_number}
        onEdit={() => onEdit("gst_number", "GST Number", vendor.gst_number)}
        rs={rs}
        isWide={isWide}
      />
      <InfoRow
        label="Member Since"
        value={new Date(vendor.created_at).toDateString()}
        editable={false}
        rs={rs}
        isWide={isWide}
      />
    </SectionCard>
  );
}

function StoreSettingsCard({ vendor, storeOpen, onToggle, badWeather, onToggleBadWeather, onEdit, onDeliveryPress, rs, isWide }) {
  return (
    <SectionCard title="Store Settings" overline="OPERATIONS" rs={rs} isWide={isWide}>
      {/* Store toggle */}
      <View style={styles.settingRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.settingIconBox, { backgroundColor: storeOpen ? "#DCFCE7" : C.bg }]}>
            <MaterialIcons
              name="storefront"
              size={18}
              color={storeOpen ? C.green : C.textLight}
            />
          </View>
          <View>
            <Text style={styles.settingTitle}>Store Status</Text>
            <Text style={styles.settingSub}>
              {storeOpen ? "Your store is accepting orders" : "Store is currently closed"}
            </Text>
          </View>
        </View>
        <Switch
          value={storeOpen}
          onValueChange={onToggle}
          trackColor={{ true: "#22c55e", false: C.border }}
          thumbColor={storeOpen ? "#fff" : "#fff"}
        />
      </View>

      {/* Opening time */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => onEdit("opening_time", "Opening Time", vendor.opening_time)}
        activeOpacity={0.6}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.settingIconBox, { backgroundColor: C.orangeDim }]}>
            <MaterialIcons name="wb-sunny" size={18} color={C.orange} />
          </View>
          <View>
            <Text style={styles.settingTitle}>Opening Time</Text>
            <Text style={styles.settingSub}>{vendor.opening_time || "Not set"}</Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={C.textLight} />
      </TouchableOpacity>

      {/* Closing time */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => onEdit("closing_time", "Closing Time", vendor.closing_time)}
        activeOpacity={0.6}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.settingIconBox, { backgroundColor: "#EDE9FE" }]}>
            <MaterialIcons name="nights-stay" size={18} color="#7C3AED" />
          </View>
          <View>
            <Text style={styles.settingTitle}>Closing Time</Text>
            <Text style={styles.settingSub}>{vendor.closing_time || "Not set"}</Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={C.textLight} />
      </TouchableOpacity>

      {/* Minimum Order Value */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => onEdit("min_order_value", "Minimum Order Value", vendor.min_order_value)}
        activeOpacity={0.6}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.settingIconBox, { backgroundColor: "#FEF3C7" }]}>
            <MaterialIcons name="shopping-basket" size={18} color="#D97706" />
          </View>
          <View>
            <Text style={styles.settingTitle}>Minimum Order Value</Text>
            <Text style={styles.settingSub}>₹{vendor.min_order_value ?? 0}</Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={C.textLight} />
      </TouchableOpacity>

      {/* Flat Quick Delivery Fee */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => onEdit("quick_delivery_fee", "Flat Quick Delivery Fee", vendor.quick_delivery_fee)}
        activeOpacity={0.6}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.settingIconBox, { backgroundColor: "#EFF6FF" }]}>
            <MaterialIcons name="flash-on" size={18} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.settingTitle}>Flat Quick Delivery Fee</Text>
            <Text style={styles.settingSub}>₹{vendor.quick_delivery_fee ?? 0} (0 to use % surge)</Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={C.textLight} />
      </TouchableOpacity>

      {/* Bad Weather Surcharge */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => onEdit("weather_surcharge", "Bad Weather Surcharge", vendor.weather_surcharge)}
        activeOpacity={0.6}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.settingIconBox, { backgroundColor: "#FCE7F3" }]}>
            <MaterialIcons name="umbrella" size={18} color="#DB2777" />
          </View>
          <View>
            <Text style={styles.settingTitle}>Bad Weather Surcharge</Text>
            <Text style={styles.settingSub}>₹{vendor.weather_surcharge ?? 0}</Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={C.textLight} />
      </TouchableOpacity>

      {/* Bad Weather Toggle Switch */}
      <View style={styles.settingRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.settingIconBox, { backgroundColor: badWeather ? "#FEE2E2" : C.bg }]}>
            <MaterialIcons name="cloudy-snowing" size={18} color={badWeather ? "#EF4444" : C.textLight} />
          </View>
          <View>
            <Text style={styles.settingTitle}>Active Bad Weather</Text>
            <Text style={styles.settingSub}>Apply weather fee surcharge to orders</Text>
          </View>
        </View>
        <Switch
          value={badWeather}
          onValueChange={onToggleBadWeather}
          trackColor={{ true: "#EF4444", false: C.border }}
          thumbColor={badWeather ? "#fff" : "#fff"}
        />
      </View>

      {/* Self Delivery Pricing Options */}
      {vendor.delivery_type === "self" && (
        <>
          {/* Base Delivery Distance */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => onEdit("delivery_base_km", "Base Delivery Distance (km)", vendor.delivery_base_km)}
            activeOpacity={0.6}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.settingIconBox, { backgroundColor: "#E0F2FE" }]}>
                <MaterialIcons name="edit-road" size={18} color="#0369A1" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Base Delivery Distance</Text>
                <Text style={styles.settingSub}>{vendor.delivery_base_km ?? 2} km</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={C.textLight} />
          </TouchableOpacity>

          {/* Base Delivery Fee */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => onEdit("delivery_fee_base", "Base Delivery Fee (₹)", vendor.delivery_fee_base)}
            activeOpacity={0.6}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.settingIconBox, { backgroundColor: "#E0F2FE" }]}>
                <MaterialIcons name="payments" size={18} color="#0369A1" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Base Delivery Fee</Text>
                <Text style={styles.settingSub}>₹{vendor.delivery_fee_base ?? 20}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={C.textLight} />
          </TouchableOpacity>

          {/* Extra Delivery Fee per KM */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => onEdit("delivery_fee_per_km", "Extra Delivery Fee per KM (₹)", vendor.delivery_fee_per_km)}
            activeOpacity={0.6}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.settingIconBox, { backgroundColor: "#E0F2FE" }]}>
                <MaterialIcons name="add-road" size={18} color="#0369A1" />
              </View>
              <View>
                <Text style={styles.settingTitle}>Extra Delivery Fee per KM</Text>
                <Text style={styles.settingSub}>₹{vendor.delivery_fee_per_km ?? 5} / km</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={C.textLight} />
          </TouchableOpacity>
        </>
      )}

      {/* Delivery type */}
      <TouchableOpacity
        style={[styles.settingRow, { borderBottomWidth: 0 }]}
        onPress={onDeliveryPress}
        activeOpacity={0.6}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.settingIconBox, { backgroundColor: C.blueDim }]}>
            <MaterialIcons name="local-shipping" size={18} color={C.blue} />
          </View>
          <View>
            <Text style={styles.settingTitle}>Delivery Method</Text>
            <Text style={styles.settingSub}>
              {vendor.delivery_type === "self" ? "Self Delivery" : "Partner Delivery"}
            </Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={C.textLight} />
      </TouchableOpacity>
    </SectionCard>
  );
}

function AccountSettingsCard({ rs, isWide, onPressManage }) {
  const items = [
    { icon: "switch-account", label: "Manage Accounts", sub: "Switch profile or link accounts", color: "#6366F1", bg: "#EEF2FF", action: "manage" },
    { icon: "account-balance", label: "Bank Account", sub: "Manage payout bank details", color: "#059669", bg: "#ECFDF5" },
    { icon: "payments", label: "Payout Settings", sub: "UPI & withdrawal preferences", color: C.blue, bg: C.blueDim },
    { icon: "verified-user", label: "KYC Verification", sub: "Documents & compliance", color: "#7C3AED", bg: "#EDE9FE", right: "Verified ✓" },
    { icon: "help-outline", label: "Help & Support", sub: "FAQs, chat, call support", color: C.orange, bg: C.orangeDim },
    { icon: "privacy-tip", label: "Privacy Policy", sub: "How we use your data", color: C.textSub, bg: C.bg },
    { icon: "description", label: "Terms & Conditions", sub: "Platform usage terms", color: C.textSub, bg: C.bg },
  ];

  return (
    <SectionCard title="Account Settings" overline="SETTINGS" rs={rs} isWide={isWide}>
      {items.map((item, i) => (
        <TouchableOpacity
          key={item.label}
          style={[styles.settingRow, i === items.length - 1 && { borderBottomWidth: 0 }]}
          activeOpacity={0.6}
          onPress={() => item.action === "manage" ? onPressManage() : null}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={[styles.settingIconBox, { backgroundColor: item.bg }]}>
              <MaterialIcons name={item.icon} size={18} color={item.color} />
            </View>
            <View>
              <Text style={styles.settingTitle}>{item.label}</Text>
              <Text style={styles.settingSub}>{item.sub}</Text>
            </View>
          </View>
          {item.right ? (
            <Text style={{ fontSize: 12, color: "#059669", fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"}}>{item.right}</Text>
          ) : (
            <MaterialIcons name="chevron-right" size={20} color={C.textLight} />
          )}
        </TouchableOpacity>
      ))}
    </SectionCard>
  );
}

function LogoutButton({ onPress, rs, isWide }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.logoutBtn,
        { paddingVertical: isWide ? 16 : rs(13, 14, 15) },
      ]}
      activeOpacity={0.8}
    >
      <MaterialIcons name="logout" size={isWide ? 20 : rs(16, 18, 18)} color={C.red} />
      <Text style={[styles.logoutText, { fontSize: isWide ? 15 : rs(13, 14, 15) }]}>
        Log out
      </Text>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero
  hero: { width: "100%" },
  heroOverline: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 1.2,
  },
  heroRow: { flexDirection: "row", alignItems: "center" },
  avatarRing: {
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  avatar: { resizeMode: "cover" },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#147538",
  },
  heroName: { fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#fff", letterSpacing: -0.5, marginBottom: 6 },
  heroPhonePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  heroPhone: { color: "#fff", fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold"},
  heroSince: { color: "rgba(255,255,255,0.55)", fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium"},
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignSelf: "flex-start",
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  statsStripDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 4,
  },

  // Body
  body: { paddingBottom: 16 },

  // Section card
  sectionCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionCardHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionOverline: {
    color: C.textLight,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 1,
    marginBottom: 2,
  },
  sectionTitle: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text, letterSpacing: -0.3 },

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoRowLeft: { flex: 1, paddingRight: 12 },
  infoLabel: {
    color: C.textLight,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", letterSpacing: 0.5,
    marginBottom: 3,
  },
  infoValue: { fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: C.text },
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },

  // Setting row
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: { fontSize: 14, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text },
  settingSub: { fontSize: 12, color: C.textSub, marginTop: 1 },

  // Logout button
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.red,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  logoutText: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.red },

  // Modals
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.textLight,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: "center",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#0EE627",
    alignItems: "center",
  },

  // Sheet (bottom modal)
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 999,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 2,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetOptionTitle: { fontSize: 15, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.text },
  sheetOptionSub: { fontSize: 12, color: C.textSub, marginTop: 2 },

  // Logout modal
  logoutIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.redDim,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.text,
    textAlign: "center",
    marginBottom: 8,
  },
  logoutModalSub: {
    fontSize: 13,
    color: C.textSub,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },
  logoutConfirmBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.red,
    alignItems: "center",
  },
});