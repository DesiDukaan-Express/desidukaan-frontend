import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const AUTO_DISMISS_MS = 4000;
const ANIM_DURATION = 300;

export default function InAppNotification({ visible, type, title, message, icon, onDismiss, onPress }) {
  const slideAnim = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, { toValue: 0, duration: ANIM_DURATION, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(slideAnim, { toValue: -120, duration: ANIM_DURATION, useNativeDriver: true }).start(() => onDismiss?.());
      }, AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const bgMap = {
    success: "#065F46",
    assigned: "#1E40AF",
    delivered: "#065F46",
    info: "#1E293B",
  };

  const iconMap = {
    success: "check-circle",
    assigned: "local-shipping",
    delivered: "verified",
    info: "info",
  };

  const bg = bgMap[type] || bgMap.info;
  const ic = icon || iconMap[type] || iconMap.info;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={styles.wrapper}
      pointerEvents="box-none"
    >
      <Animated.View style={[styles.toast, { backgroundColor: bg, transform: [{ translateY: slideAnim }] }]}>
        <MaterialIcons name={ic} size={20} color="#fff" />
        <View style={styles.textWrap}>
          {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
          <Text style={styles.message} numberOfLines={2}>{message}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 50,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 16,
    maxWidth: 500,
    width: "100%",
  },
  textWrap: { flex: 1 },
  title: { color: "#fff", fontWeight: "700", fontSize: 14, marginBottom: 2 },
  message: { color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 18 },
});
