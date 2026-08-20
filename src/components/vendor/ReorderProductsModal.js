import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  PanResponder,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import Spinner from "../common/Spinner";

const ROW_HEIGHT = 64;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function ReorderRow({
  item,
  index,
  count,
  isDragging,
  dragY,
  panHandlers,
}) {
  return (
    <Animated.View
      style={[
        styles.row,
        isDragging && {
          transform: [{ translateY: dragY }],
          zIndex: 10,
          borderColor: "#1B6B35",
          backgroundColor: "#F0FDF4",
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
      ]}
    >
      <View style={styles.indexBox}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>

      <View style={styles.thumbWrap}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <Feather name="shopping-cart" size={16} color="#9CA3AF" />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta}>₹{item.price} / {item.unit}</Text>
      </View>

      {/* Drag handle */}
      <View {...panHandlers} style={styles.dragHandle}>
        <Feather name="menu" size={20} color="#71717A" />
      </View>
    </Animated.View>
  );
}

export default function ReorderProductsModal({
  visible,
  products,
  onClose,
  onSaved,
  saving,
}) {
  const [items, setItems] = useState([]);
  const [draggingId, setDraggingId] = useState(null);

  const dragY = useRef(new Animated.Value(0)).current;
  const itemsRef = useRef(items);
  const startIndexRef = useRef(0);
  const lastTargetRef = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (visible) {
      const sorted = [...products].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
      );
      setItems(sorted.map((p) => ({ ...p, id: String(p.id) })));
    }
  }, [visible, products]);

  const endDrag = () => {
    Animated.spring(dragY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 7,
      tension: 60,
    }).start();
    setDraggingId(null);
  };

  const makePanResponder = (item) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        const list = itemsRef.current;
        const idx = list.findIndex((i) => i.id === item.id);
        startIndexRef.current = idx < 0 ? 0 : idx;
        lastTargetRef.current = startIndexRef.current;
        dragY.setValue(0);
        setDraggingId(item.id);
      },
      onPanResponderMove: (_e, g) => {
        const list = itemsRef.current;
        const startIdx = startIndexRef.current;
        const target = clamp(
          startIdx + Math.round(g.dy / ROW_HEIGHT),
          0,
          list.length - 1,
        );
        if (target !== lastTargetRef.current) {
          lastTargetRef.current = target;
          const applied = (target - startIdx) * ROW_HEIGHT;
          dragY.setValue(g.dy - applied);
          setItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(startIdx, 1);
            next.splice(target, 0, moved);
            return next;
          });
          startIndexRef.current = target;
        } else {
          dragY.setValue(g.dy);
        }
      },
      onPanResponderRelease: endDrag,
      onPanResponderTerminate: endDrag,
    });

  if (!visible) return null;

  const handleSave = () => {
    if (saving) return;
    onSaved?.(items);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Reorder Products</Text>
            <Text style={styles.subtitle}>
              Drag the ⋮⋮ handle to set the order customers see on your store page.
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            disabled={saving}
            style={styles.closeBtn}
            activeOpacity={0.7}
          >
            <Feather name="x" size={18} color="#71717A" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {items.map((item, idx) => (
            <ReorderRow
              key={item.id}
              item={item}
              index={idx}
              count={items.length}
              isDragging={draggingId === item.id}
              dragY={dragY}
              panHandlers={makePanResponder(item).panHandlers}
            />
          ))}
        </ScrollView>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={onClose}
            disabled={saving}
            style={[styles.btn, styles.btnCancel]}
            activeOpacity={0.75}
          >
            <Text style={styles.btnCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.btn, styles.btnSave, saving && styles.btnDisabled]}
            activeOpacity={0.75}
          >
            {saving && <Spinner size={15} color="#fff" />}
            <Text style={styles.btnSaveText}>
              {saving ? "Saving…" : "Save Order"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    zIndex: 1100,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 560,
    maxHeight: "82%",
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18181B",
  },
  subtitle: {
    fontSize: 12.5,
    color: "#71717A",
    lineHeight: 18,
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flexGrow: 0,
    maxHeight: 420,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E4E4E7",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 10,
  },
  indexBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E8F5EC",
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1B6B35",
  },
  thumbWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumb: { width: 42, height: 42 },
  info: { flex: 1, gap: 2 },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
  },
  meta: {
    fontSize: 12,
    color: "#71717A",
  },
  dragHandle: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnCancel: {
    borderWidth: 1.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#fff",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#71717A",
  },
  btnSave: {
    backgroundColor: "#1B6B35",
  },
  btnSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  btnDisabled: {
    opacity: 0.7,
  },
});