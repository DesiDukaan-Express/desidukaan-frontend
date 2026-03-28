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
    TextInput
} from "react-native";

import { colors } from "../../styles/colors";
import { spacing, radius } from "../../styles/spacing";
import { shadows } from "../../styles/shadows";

import useAuthStore from "../../store/authStore";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

export default function VendorProfileScreen() {

    const { token, logout } = useAuthStore();

    const scaleAnim = useRef(new Animated.Value(1)).current;

    const [storeOpen, setStoreOpen] = useState(true);
    const [notifications, setNotifications] = useState(true);

    const [vendor, setVendor] = useState(null);
    const [timeModalVisible, setTimeModalVisible] = useState(false);
    const [activeField, setActiveField] = useState("");
    const [customTime, setCustomTime] = useState("");
    const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);

    const pressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true
        }).start();
    };

    const pressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true
        }).start();
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${API_BASE}/vendors/me/profile`, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` }
            });

            const response = await res.json();
            if (response.success) {
                setVendor(response.data.vendor);
                setStoreOpen(response.data.vendor.is_open);
            }
        } catch (err) {
            console.log("Error fetching vendor:", err);
        }
    };

    const handleToggleOpen = async (val) => {
        if (!vendor) return;
        const previousState = storeOpen;
        setStoreOpen(val);
        try {
            const res = await fetch(`${API_BASE}/vendors/${vendor.id}/toggle`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` }
            });
            const response = await res.json();
            if (!response.success) {
                setStoreOpen(previousState);
                Alert.alert("Error", "Failed to toggle shop status");
            }
        } catch (err) {
            setStoreOpen(previousState);
            console.log("Error toggling shop status:", err);
        }
    };

    const handleUpdateField = async (field, value) => {
        if (!vendor) return;
        console.log(`Updating field ${field} to ${value}...`);
        try {
            const res = await fetch(`${API_BASE}/vendors/${vendor.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ [field]: value })
            });
            const response = await res.json();
            console.log("Update response:", response);
            if (response.success) {
                setVendor(response.data.vendor);
                Alert.alert("Success", `${field.replace('_', ' ')} updated successfully`);
            } else {
                Alert.alert("Error", response.message || "Failed to update setting");
            }
        } catch (err) {
            console.log(`Error updating ${field}:`, err);
            Alert.alert("Error", "Check your connection and try again.");
        }
    };

    const selectDeliveryType = () => {
        setDeliveryModalVisible(true);
    };

    const editTime = (field) => {
        setActiveField(field);
        setCustomTime(vendor[field] || "");
        setTimeModalVisible(true);
    };

    const saveTime = () => {
        if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(customTime)) {
            Alert.alert("Invalid Format", "Please use HH:MM format (e.g. 09:30)");
            return;
        }
        handleUpdateField(activeField, customTime);
        setTimeModalVisible(false);
    };

    if (!vendor) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

            {/* PROFILE HEADER */}

            <View style={styles.profileCard}>

                <Image
                    source={{
                        uri: vendor.shop_image_url || "https://lh3.googleusercontent.com/TW79DOPeTuw01SC4TNqtKXHNMjG1HGU7LT_-Ph2bY9COIgXwP0PBAQ_NxEyNu7cO4ofS5xu75SIF3t5WyXKjBF7Rng=w300-rw"
                    }}
                    style={styles.avatar}
                />
                <Text style={styles.name}>{vendor.shop_name}</Text>

                <Text style={styles.email}>
                    {vendor.user?.email || "No Email"}
                </Text>

                <Text style={styles.phone}>
                    {vendor.user?.phone || "No Phone"}
                </Text>

                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>

                    <TouchableOpacity
                        style={styles.editBtn}
                        onPressIn={pressIn}
                        onPressOut={pressOut}
                    >
                        <Text style={styles.editText}>Edit Profile</Text>
                    </TouchableOpacity>

                </Animated.View>

            </View>


            {/* STORE STATS */}

            <View style={styles.statsRow}>

                {/* <View style={styles.statBox}>
                    <Text style={styles.statNumber}>248</Text>
                    <Text style={styles.statLabel}>Orders</Text>
                </View>

                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>4.8 ⭐</Text>
                    <Text style={styles.statLabel}>Rating</Text>
                </View>

                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>₹48K</Text>
                    <Text style={styles.statLabel}>Earnings</Text>
                </View> */}

                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                        {vendor.total_ratings || 0}
                    </Text>
                    <Text style={styles.statLabel}>Orders</Text>
                </View>

                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                        {vendor.rating || 0} ⭐
                    </Text>
                    <Text style={styles.statLabel}>Rating</Text>
                </View>

                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                        ₹{vendor.earnings || 0}
                    </Text>
                    <Text style={styles.statLabel}>Earnings</Text>
                </View>


            </View>


            {/* STORE INFO */}

            <Text style={styles.sectionTitle}>Store Information</Text>

            <View style={styles.card}>

                <View style={styles.row}>
                    <Text style={styles.label}>Store Name</Text>
                    <Text style={styles.value}>{vendor.shop_name}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Owner</Text>
                    <Text style={styles.value}>
                        {vendor.user?.name || "N/A"}
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Location</Text>
                    <Text style={styles.value}>
                        {vendor.address_line}, {vendor.pincode}
                    </Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Joined</Text>
                    <Text style={styles.value}>
                        {new Date(vendor.created_at).toDateString()}
                    </Text>
                </View>

            </View>


            {/* STORE SETTINGS */}

            <Text style={styles.sectionTitle}>Store Settings</Text>

            <View style={styles.card}>

                <View style={styles.settingRow}>
                    <Text style={styles.settingText}>🟢 Store Manual Status (Override)</Text>
                    <Switch
                        value={storeOpen}
                        onValueChange={handleToggleOpen}
                        trackColor={{ true: "#22c55e", false: "#ccc" }}
                    />
                </View>

                <TouchableOpacity 
                    style={styles.settingRow} 
                    onPress={() => editTime("opening_time")}
                    activeOpacity={0.6}
                >
                    <Text style={styles.settingText}>🕒 Opening Time</Text>
                    <Text style={styles.arrow}>{vendor.opening_time || "Not set"} ›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.settingRow} 
                    onPress={() => editTime("closing_time")}
                    activeOpacity={0.6}
                >
                    <Text style={styles.settingText}>🕒 Closing Time</Text>
                    <Text style={styles.arrow}>{vendor.closing_time || "Not set"} ›</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.settingRow} 
                    onPress={selectDeliveryType}
                    activeOpacity={0.6}
                >
                    <Text style={styles.settingText}>🚚 Delivery Options</Text>
                    <Text style={styles.arrow}>
                        {vendor.delivery_type === "self" ? "Self Delivery" : "Partner Delivery"} ›
                    </Text>
                </TouchableOpacity>

            </View>

            {/* TIME PICKER MODAL */}
            <Modal
                transparent={true}
                visible={timeModalVisible}
                animationType="fade"
                onRequestClose={() => setTimeModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Set {activeField === "opening_time" ? "Opening" : "Closing"} Time</Text>
                        <TextInput
                            style={styles.input}
                            value={customTime}
                            onChangeText={setCustomTime}
                            placeholder="HH:MM (e.g. 09:00)"
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setTimeModalVisible(false)} style={styles.cancelBtn}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={saveTime} style={styles.saveBtn}>
                                <Text style={{ color: "#fff" }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* DELIVERY TYPE MODAL */}
            <Modal
                transparent={true}
                visible={deliveryModalVisible}
                animationType="fade"
                onRequestClose={() => setDeliveryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Delivery Method</Text>
                        <TouchableOpacity 
                            style={styles.modalOption} 
                            onPress={() => {
                                handleUpdateField("delivery_type", "self");
                                setDeliveryModalVisible(false);
                            }}
                        >
                            <Text style={styles.optionText}>Self Delivery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.modalOption} 
                            onPress={() => {
                                handleUpdateField("delivery_type", "partner");
                                setDeliveryModalVisible(false);
                            }}
                        >
                            <Text style={styles.optionText}>Partner Delivery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setDeliveryModalVisible(false)} style={styles.closeBtn}>
                            <Text>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>


            {/* ACCOUNT SETTINGS */}

            <Text style={styles.sectionTitle}>Account Settings</Text>

            <View style={styles.card}>

                <TouchableOpacity style={styles.settingRow}>
                    <Text style={styles.settingText}>🏦 Bank Account</Text>
                    <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingRow}>
                    <Text style={styles.settingText}>💳 Payout Settings</Text>
                    <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>


                <TouchableOpacity style={styles.settingRow}>
                    <Text style={styles.settingText}>🪪 KYC Verification</Text>
                    <Text style={styles.arrow}>Verified ✓</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingRow}>
                    <Text style={styles.settingText}>💬 Help & Support</Text>
                    <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>

            </View>


            {/* LOGOUT */}

            <TouchableOpacity style={styles.logoutBtn} onPress={() => logout()}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

        </ScrollView>

    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg
    },

    profileCard: {
        backgroundColor: "#ffffff",
        padding: 25,
        borderRadius: radius.lg,
        alignItems: "center",
        marginBottom: 20,
        ...shadows.sm
    },

    avatar: {
        width: 95,
        height: 95,
        borderRadius: 50,
        marginBottom: 10
    },

    name: {
        fontSize: 20,
        fontWeight: "700"
    },

    email: {
        color: "#777",
        marginTop: 4
    },

    phone: {
        color: "#777",
        marginBottom: 12
    },

    editBtn: {
        backgroundColor: "#22c55e",
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: radius.md
    },

    editText: {
        color: "#fff",
        fontWeight: "600"
    },

    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20
    },

    statBox: {
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: radius.md,
        width: "30%",
        alignItems: "center",
        ...shadows.sm
    },

    statNumber: {
        fontSize: 18,
        fontWeight: "700"
    },

    statLabel: {
        fontSize: 12,
        color: "#777"
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 10
    },

    card: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: radius.md,
        marginBottom: 20,
        ...shadows.sm
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12
    },

    label: {
        color: "#777"
    },

    value: {
        fontWeight: "600"
    },

    settingRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#eee"
    },

    settingText: {
        fontSize: 15
    },

    arrow: {
        color: "#aaa",
        fontSize: 15
    },

    logoutBtn: {
        backgroundColor: "#ef4444",
        padding: 16,
        borderRadius: radius.md,
        alignItems: "center",
        marginBottom: 40
    },

    logoutText: {
        color: "#fff",
        fontWeight: "700"
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20
    },
    modalContent: {
        backgroundColor: "#fff",
        width: "90%",
        borderRadius: radius.md,
        padding: 20,
        ...shadows.lg
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 15,
        color: "#1f2937"
    },
    input: {
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: radius.sm,
        padding: 12,
        fontSize: 16,
        marginBottom: 20
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10
    },
    cancelBtn: {
        padding: 10,
        backgroundColor: "#f3f4f6",
        borderRadius: radius.sm
    },
    saveBtn: {
        padding: 10,
        backgroundColor: "#22c55e",
        borderRadius: radius.sm,
        minWidth: 70,
        alignItems: "center"
    },
    modalOption: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6"
    },
    optionText: {
        fontSize: 16,
        color: "#374151"
    },
    closeBtn: {
        marginTop: 15,
        alignItems: "center"
    }

});