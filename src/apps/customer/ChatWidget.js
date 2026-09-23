import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Pressable,
  Modal,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useAuthStore from "../../store/authStore";
import { useTheme } from "../../theme/ThemeContext";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Theme palettes (light / dark) ─────────────────────────────────────────
const LIGHT_COLORS = {
  bg: "#F8FAFC",
  white: "#FFFFFF",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray600: "#4B5563",
  gray900: "#111827",
  green: "#16A34A",
  greenDark: "#15803D",
  orange: "#F97316",
  orangeDark: "#EA580C",
  surface: "#FFFFFF",
};
const DARK_COLORS = {
  bg: "#0F1216",
  white: "#FFFFFF",
  gray100: "#1F2329",
  gray200: "#2E343C",
  gray400: "#6A727E",
  gray600: "#A4ABB6",
  gray900: "#ECEFF3",
  green: "#2F9E68",
  greenDark: "#3AA673",
  orange: "#DB7A33",
  orangeDark: "#C9691F",
  surface: "#171A1F",
};


const BOT_NAME = "MyShop AI";

export default function ChatWidget() {
  const { isDark } = useTheme();
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => StyleSheet.create({
  launcher: {
    position: "absolute",
    right: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: C.greenDark,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    overflow: "hidden",
  },
  launcherGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.85,
  },
  launcherText: { color: C.white, fontWeight: "800", fontSize: 14 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: 12,
  },
  panel: {
    backgroundColor: C.surface,
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: 560,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: C.white, fontSize: 17, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  body: { backgroundColor: C.bg, flexGrow: 0 },
  bodyContent: { padding: 14, gap: 10 },
  msgRow: { flexDirection: "row" },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowBot: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  bubbleUser: { backgroundColor: C.green, borderTopRightRadius: 4 },
  bubbleBot: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.gray200,
    borderTopLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: C.white, fontWeight: "600" },
  bubbleTextBot: { color: C.gray600 },
  thinkingText: { fontSize: 12, color: C.gray400, fontStyle: "italic" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    backgroundColor: C.surface,
  },
  input: {
    flex: 1,
    backgroundColor: C.gray100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 8 : 10,
    fontSize: 15,
    color: C.gray900,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
}), [C]);
  const token = useAuthStore((s) => s.token);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: "welcome", role: "assistant", text: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [thinkingDots, setThinkingDots] = useState("...");
  const scrollRef = useRef(null);
  const { width, height } = Dimensions.get("window");
  const isWide = width >= 720;

  useEffect(() => {
    if (!scrollRef.current) return;
    setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 50);
  }, [messages.length, open]);

  useEffect(() => {
    if (!sending) return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % 4;
      setThinkingDots(".".repeat(i || 1));
    }, 350);
    return () => clearInterval(id);
  }, [sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg = { id: `${Date.now()}-u`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const payload = {
        messages: [...messages, userMsg]
          .slice(-12)
          .map((m) => ({ role: m.role, content: m.text })),
      };
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Chat failed");
      }
      const reply = data.data?.reply || "";
      const botMsg = {
        id: `${Date.now()}-a`,
        role: "assistant",
        text: reply || "Sorry, I did not get that.",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-e`,
          role: "assistant",
          text: err.message || "Chat failed.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (Platform.OS !== "web") return;
    if (e.nativeEvent.key === "Enter" && !e.nativeEvent.shiftKey) {
      e.preventDefault?.();
      send();
    }
  };

  const grouped = useMemo(() => messages, [messages]);

  return (
    <>
      <TouchableOpacity
        style={[styles.launcher, { bottom: isWide ? 24 : 120 }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[C.orange, C.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.launcherGlow}
        />
        <Feather name="message-circle" size={18} color={C.white} />
        <Text style={styles.launcherText}>Ask MyShop</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.panel,
              {
                width: isWide ? Math.min(460, width - 24) : width - 12,
                maxHeight: isWide ? 680 : Math.min(680, height - 80),
              },
            ]}
            onPress={() => {}}
          >
            <LinearGradient
              colors={[C.greenDark, C.green, C.orange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <View>
                <Text style={styles.headerTitle}>{BOT_NAME}</Text>
                <Text style={styles.headerSub}>Online and ready to help</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
                <Feather name="x" size={16} color={C.white} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView
              ref={scrollRef}
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {grouped.map((m) => {
                const isUser = m.role === "user";
                return (
                  <View
                    key={m.id}
                    style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}
                  >
                    <View
                      style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          isUser ? styles.bubbleTextUser : styles.bubbleTextBot,
                        ]}
                      >
                        {m.text}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {sending && (
                <View style={styles.msgRowBot}>
                  <View style={styles.bubbleBot}>
                    <Text style={styles.thinkingText}>MyShop AI is thinking{thinkingDots}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask about orders, refunds, or delivery"
                placeholderTextColor={C.gray400}
                style={styles.input}
                multiline
                returnKeyType="send"
                blurOnSubmit
                onSubmitEditing={send}
                onKeyPress={handleKeyPress}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
                onPress={send}
                disabled={!input.trim() || sending}
              >
                <Feather name="send" size={16} color={C.white} />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}


