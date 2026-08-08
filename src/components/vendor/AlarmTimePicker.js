import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

// ── Design tokens (matches Vendor Profile) ────────────────────
const C = {
  ink: "#12141C",
  surface: "#FFFFFF",
  primary: "#E8871E",
  primaryDark: "#A85C0B",
  text: "#12141C",
  textSub: "#626A78",
  textLight: "#98A0AC",
  border: "#E6E8EC",
};

const ITEM_H = 46;

// ── HH:MM (24h) ⇄ 12h helpers ────────────────────────────────
function from24(str) {
  const m = String(str || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { h12: 8, min: 0, ampm: "AM" };
  let h = parseInt(m[1], 10) % 24;
  const min = parseInt(m[2], 10) % 60;
  const ampm = h < 12 ? "AM" : "PM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return { h12, min, ampm };
}
function to24(h12, min, ampm) {
  let h = h12 % 12;
  if (ampm === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// ── Scrolling wheel (alarm-clock roller) ──────────────────────
function Wheel({ items, value, onSelect, getLabel, accent, light = true }) {
  const idx = Math.max(0, items.indexOf(value));
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ y: idx * ITEM_H, animated: false });
    }
  }, [value]);

  const handleSnap = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    onSelect(items[clamped]);
  };

  const dim = light ? "rgba(255,255,255,0.35)" : C.textLight;
  const hi = light ? "#fff" : C.text;

  return (
    <View style={[styles.wheel, { height: ITEM_H * 3 }]}>
      <ScrollView
        ref={listRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={handleSnap}
        onScrollEndDrag={handleSnap}
        contentContainerStyle={{ paddingVertical: ITEM_H }}
      >
        {items.map((it, i) => (
          <TouchableOpacity
            key={i}
            style={{ height: ITEM_H, justifyContent: "center", alignItems: "center" }}
            onPress={() => onSelect(it)}
          >
            <Text
              style={{
                fontSize: 21,
                fontWeight: "700",
                fontFamily: "PlusJakartaSans_700Bold",
                color: it === value ? accent : dim,
                fontVariant: ["tabular-nums"],
              }}
            >
              {getLabel ? getLabel(it) : it}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Center highlight */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: "center" }]}>
        <View
          style={{
            height: ITEM_H,
            marginHorizontal: 4,
            borderRadius: 12,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: accent,
            backgroundColor: light ? "rgba(232,135,30,0.12)" : "rgba(232,135,30,0.08)",
          }}
        />
      </View>
    </View>
  );
}

// ── Analog clock face (decorative hand) ───────────────────────
function ClockFace({ h12, min, size = 120 }) {
  const hourAngle = (h12 % 12) * 30 + min * 0.5;
  const minAngle = min * 6;
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const ang = (i * 30 * Math.PI) / 180;
    const r = size / 2 - 8;
    const x = size / 2 + r * Math.sin(ang);
    const y = size / 2 - r * Math.cos(ang);
    ticks.push({ x, y, major: i % 3 === 0 });
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.22)",
        backgroundColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {ticks.map((t, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: t.x - (t.major ? 1.5 : 1),
            top: t.y - (t.major ? 7 : 4),
            width: t.major ? 3 : 2,
            height: t.major ? 7 : 4,
            borderRadius: 2,
            backgroundColor: t.major ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)",
          }}
        />
      ))}

      {/* Hour hand */}
      <View
        style={{
          position: "absolute",
          left: size / 2 - 2.5,
          top: size / 2 - 30,
          width: 5,
          height: 30,
          borderRadius: 3,
          backgroundColor: "#fff",
          transformOrigin: `50% 100%`,
          transform: [{ rotate: `${hourAngle}deg` }],
        }}
      />
      {/* Minute hand */}
      <View
        style={{
          position: "absolute",
          left: size / 2 - 1.5,
          top: size / 2 - 44,
          width: 3,
          height: 44,
          borderRadius: 2,
          backgroundColor: C.primary,
          transformOrigin: "50% 100%",
          transform: [{ rotate: `${minAngle}deg` }],
        }}
      />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary }} />
    </View>
  );
}

// ── Alarm Time Picker modal ───────────────────────────────────
export default function AlarmTimePicker({ visible, value, title, onClose, onSave }) {
  const init = from24(value);
  const [h12, setH12] = useState(init.h12);
  const [min, setMin] = useState(init.min);
  const [ampm, setAmpm] = useState(init.ampm);

  useEffect(() => {
    if (visible) {
      const v = from24(value);
      setH12(v.h12);
      setMin(v.min);
      setAmpm(v.ampm);
    }
  }, [visible]);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const mins = Array.from({ length: 60 }, (_, i) => i);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="alarm" size={20} color={C.primary} />
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Alarm panel — ink clock */}
          <View style={styles.clockPanel}>
            <View style={styles.clockRow}>
              <ClockFace h12={h12} min={min} />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.alarmLabel}>SET TIME</Text>
                <View style={styles.digitalRow}>
                  <Text style={styles.digital}>
                    {String(h12).padStart(2, "0")}
                    <Text style={styles.digitalColon}>:</Text>
                    {String(min).padStart(2, "0")}
                  </Text>
                </View>
                <Text style={styles.alarmSub}>
                  {ampm === "AM" ? "Morning" : "Evening"} · {to24(h12, min, ampm)} · 24h
                </Text>
              </View>
            </View>
          </View>

          {/* Wheels */}
          <View style={styles.wheelRow}>
            <View style={styles.wheelCol}>
              <Text style={styles.wheelLabel}>Hour</Text>
              <Wheel items={hours} value={h12} onSelect={setH12} accent={C.primary} light={false} />
            </View>
            <View style={styles.wheelCol}>
              <Text style={styles.wheelLabel}>Minute</Text>
              <Wheel
                items={mins}
                value={min}
                onSelect={setMin}
                accent={C.primary}
                light={false}
                getLabel={(v) => String(v).padStart(2, "0")}
              />
            </View>
            <View style={styles.wheelCol}>
              <Text style={styles.wheelLabel}>Period</Text>
              <View style={{ height: ITEM_H * 3, justifyContent: "center" }}>
                {["AM", "PM"].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setAmpm(p)}
                    style={{
                      height: ITEM_H,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 21,
                        fontWeight: "700",
                        fontFamily: "PlusJakartaSans_700Bold",
                        color: ampm === p ? C.primary : C.textLight,
                      }}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(to24(h12, min, ampm))} style={styles.saveBtn}>
              <MaterialIcons name="alarm-add" size={16} color="#fff" />
              <Text style={styles.saveText}>{title ? `Set ${title}` : "Set Time"}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: C.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  clockPanel: {
    backgroundColor: C.ink,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  clockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  alarmLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 2,
    marginBottom: 6,
  },
  digitalRow: { flexDirection: "row", alignItems: "baseline" },
  digital: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  digitalColon: { color: C.primary },
  alarmSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  wheelRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  wheelCol: { flex: 1 },
  wheelLabel: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 1,
    color: C.textLight,
    textAlign: "center",
    marginBottom: 4,
  },
  wheel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#F4F5F7",
    overflow: "hidden",
  },
  actions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
  },
  cancelText: {
    color: C.textSub,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  saveBtn: {
    flex: 1.4,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveText: { color: "#fff", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
});
