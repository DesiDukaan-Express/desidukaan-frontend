import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,    
} from "react-native";
import { Feather } from "@expo/vector-icons";
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
  surface: "#171A1F",
};


export default function ChatScreen() {
  const { isDark } = useTheme();
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: Platform.OS === "android" ? 16 : 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.gray900 },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 10 },
  msgRow: { flexDirection: "row" },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowBot: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  bubbleUser: { backgroundColor: C.green, borderTopRightRadius: 4 },
  bubbleBot: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.gray200, borderTopLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: C.white, fontWeight: "600" },
  bubbleTextBot: { color: C.gray600 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    backgroundColor: C.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: C.gray100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.gray900,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
}), [C]);
  const token = useAuthStore((s) => s.token);
  const [messages, setMessages] = useState([
    { id: "welcome", role: "assistant", text: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

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

  const grouped = useMemo(() => messages, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DesiDukaan Chat</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {grouped.map((m) => {
          const isUser = m.role === "user";
          return (
            <View
              key={m.id}
              style={[
                styles.msgRow,
                isUser ? styles.msgRowUser : styles.msgRowBot,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleBot,
                ]}
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
              <ActivityIndicator size="small" color={C.green} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about orders, products, or delivery"
          placeholderTextColor={C.gray400}
          style={styles.input}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!input.trim() || sending}
        >
          <Feather name="send" size={16} color={C.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}


