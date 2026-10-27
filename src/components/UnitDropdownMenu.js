import React, { useState, memo } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, Platform } from 'react-native';

const PRIMARY = '#1ca049';
const PRIMARY_LIGHT = '#e8f5e9';

const UnitDropdownMenu = memo(function UnitDropdownMenu({ listRef, options = [], value, onSelect }) {
  const [localHover, setLocalHover] = useState(null);

  return (
    <View ref={listRef} style={styles.list}>
      <ScrollView style={styles.scroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {options.map((u) => (
          <Pressable
            key={u}
            onHoverIn={() => setLocalHover(u)}
            onHoverOut={() => setLocalHover(null)}
            onPress={() => onSelect(u)}
            {...(Platform.OS === 'web'
              ? {
                  onMouseDown: (e) => {
                    e.preventDefault();
                    onSelect(u);
                  },
                }
              : null)}
            style={({ hovered }) => [
              styles.item,
              value === u && styles.itemActive,
              (localHover === u || hovered) && styles.itemHover,
            ]}
          >
            <Text style={[styles.itemText, value === u && styles.itemTextActive]}>{u}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
});

export default UnitDropdownMenu;

const styles = StyleSheet.create({
  list: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99999,
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 20,
  },
  scroll: { maxHeight: 150, borderRadius: 10, overflow: 'hidden' },
  item: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f4f4f5',
    backgroundColor: '#ffffff',
  },
  itemActive: { backgroundColor: PRIMARY_LIGHT },
  itemHover: { backgroundColor: '#f3f4f6' },
  itemText: { fontSize: 13, color: '#555', fontFamily: 'PlusJakartaSans_500Medium' },
  itemTextActive: { color: PRIMARY, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
});
