import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native';

const PRIMARY = '#1ca049';
const PRIMARY_LIGHT = '#e8f5e9';
const MENU_MAX_H = 150;

export default function UnitDropdownMenu({ anchorRef, listRef, options, value, hover, onHover, onSelect }) {
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0 });

  const measure = () => {
    const el = anchorRef && anchorRef.current;
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const r = el.getBoundingClientRect();
    const viewW = typeof window !== 'undefined' ? window.innerWidth : 0;
    const viewH = typeof window !== 'undefined' ? window.innerHeight : 0;
    setPos({
      left: Math.max(0, Math.min(r.left, viewW - r.width)),
      top: Math.max(0, Math.min(r.top + r.height + 4, viewH - (MENU_MAX_H + 8))),
      width: r.width,
    });
  };

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onScroll = () => measure();
    const onResize = () => measure();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <View
      ref={listRef}
      style={[styles.list, { position: 'fixed', left: pos.left, top: pos.top, width: pos.width, zIndex: 9999 }]}
    >
      <ScrollView style={styles.scroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {options.map(u => (
          <Pressable
            key={u}
            onHoverIn={() => onHover(u)}
            onHoverOut={() => onHover(null)}
            onPress={() => onSelect(u)}
            onMouseDown={(e) => { e.preventDefault(); onSelect(u); }}
            style={[
              styles.item,
              value === u && styles.itemActive,
              hover === u && styles.itemHover,
            ]}
          >
            <Text style={[styles.itemText, value === u && styles.itemTextActive]}>{u}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>,
    document.body,
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 0,
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  scroll: { maxHeight: MENU_MAX_H, borderRadius: 10, overflow: 'hidden' },
  item: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f4f4f5',
    backgroundColor: '#fff',
  },
  itemActive: { backgroundColor: PRIMARY_LIGHT },
  itemHover: { backgroundColor: '#f3f4f6' },
  itemText: { fontSize: 13, color: '#555', fontFamily: 'PlusJakartaSans_500Medium' },
  itemTextActive: { color: PRIMARY, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
});
