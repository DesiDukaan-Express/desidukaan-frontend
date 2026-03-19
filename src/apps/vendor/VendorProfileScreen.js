import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Animated,
    Switch
} from "react-native";

import { colors } from "../../styles/colors";
import { spacing, radius } from "../../styles/spacing";
import { shadows } from "../../styles/shadows";

import useAuthStore from "../../store/authStore";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

export default function VendorProfileScreen() {

    const { token , logout } = useAuthStore();

    const scaleAnim = useRef(new Animated.Value(1)).current;

    const [storeOpen, setStoreOpen] = useState(true);
    const [notifications, setNotifications] = useState(true);

    const [vendor, setVendor] = useState(null);

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
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/vendors/me/profile`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` }
                });

                const response = await res.json();

                console.log(response.data);

                setVendor(response.data.vendor);
                setStoreOpen(response.data.vendor.is_open);

            } catch (err) {
                console.log("Error fetching vendor:", err);
            }
        })();
    }, []);

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
                    <Text style={styles.settingText}>🟢 Store Open</Text>
                    <Switch
                        value={storeOpen}
                        onValueChange={setStoreOpen}
                    />
                </View>

                <View style={styles.settingRow}>
                    <Text style={styles.settingText}>🔔 Notifications</Text>
                    <Switch
                        value={notifications}
                        onValueChange={setNotifications}
                    />
                </View>

                <View style={styles.settingRow}>
                    <Text style={styles.settingText}>🚚 Delivery Options</Text>
                    <Text style={styles.arrow}>Self Delivery ›</Text>
                </View>

            </View>


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
    }

});