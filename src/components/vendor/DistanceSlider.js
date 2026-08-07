import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";

const C = {
  ink: "#12141C",
  surface: "#FFFFFF",
  primary: "#E8871E",
  tealIcon: "#0B5D56",
  tealDim: "#F0FDFA",
  text: "#12141C",
  textSub: "#626A78",
  textLight: "#98A0AC",
  border: "#E6E8EC",
};

const MIN = 0.5;
const MAX = 20;
const STEP = 0.5;
const MARKS = [0.5, 5, 10, 15, 20];

export default function DistanceSliderModal({ visible, value, onClose, onSave }) {
  const [km, setKm] = useState(2);

  useEffect(() => {
    if (visible) setKm(Number.isFinite(value) ? value : 2);
  }, [visible]);

  const pct = ((km - MIN) / (MAX - MIN)) * 100;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <MaterialIcons name="edit-road" size={18} color={C.tealIcon} />
              </View>
              <View>
                <Text style={styles.title}>Base Delivery Distance</Text>
                <Text style={styles.subtitle}>Max radius for home delivery from the store</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Value readout */}
          <View style={styles.readout}>
            <Text style={styles.kmValue}>{km}</Text>
            <Text style={styles.kmUnit}>km</Text>
          </View>

          {/* Track with markers */}
          <View style={styles.sliderWrap}>
            <View pointerEvents="none" style={styles.markerRow}>
              {MARKS.map((m) => (
                <View key={m} style={styles.markerCol}>
                  <View style={[styles.markerTick, km >= m && { backgroundColor: C.primary }]} />
                  <Text style={[styles.markerLabel, km >= m && { color: C.primary }]}>{m}</Text>
                </View>
              ))}
            </View>
            <Slider
              style={styles.slider}
              minimumValue={MIN}
              maximumValue={MAX}
              step={STEP}
              value={km}
              onValueChange={setKm}
              minimumTrackTintColor={C.primary}
              maximumTrackTintColor={C.border}
              thumbTintColor={C.primary}
            />
          </View>

          <Text style={styles.hint}>
            {km <= 1
              ? "Tight radius — deliveries only nearby."
              : km <= 5
              ? "Local deliveries within a short ride."
              : km <= 10
              ? "Balanced range for most neighbourhoods."
              : "Wide reach — longer delivery rides apply."}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => setKm(2)}
              style={[styles.resetBtn, km === 2 && { backgroundColor: C.tealDim }]}
            >
              <MaterialIcons name="refresh" size={15} color={km === 2 ? C.tealIcon : C.textSub} />
              <Text style={[styles.resetText, km === 2 && { color: C.tealIcon }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(km)}>
              <MaterialIcons name="check" size={16} color="#fff" />
              <Text style={styles.saveText}>Save {km} km</Text>
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
    maxWidth: 420,
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.tealDim,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: C.text,
  },
  subtitle: { fontSize: 11.5, color: C.textSub, marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  readout: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  kmValue: {
    fontSize: 52,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: C.text,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  kmUnit: { fontSize: 18, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: C.textLight },
  sliderWrap: { marginBottom: 10 },
  markerRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, marginBottom: 2 },
  markerCol: { alignItems: "center" },
  markerTick: {
    width: 3,
    height: 8,
    borderRadius: 2,
    backgroundColor: C.border,
  },
  markerLabel: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: C.textLight,
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },
  slider: { height: 40, width: "100%" },
  hint: {
    fontSize: 12,
    color: C.textSub,
    textAlign: "center",
    marginBottom: 16,
  },
  actions: { flexDirection: "row", gap: 10 },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resetText: { color: C.textSub, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveText: { color: "#fff", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
});
