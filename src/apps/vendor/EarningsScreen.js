import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, radius } from '../../styles/spacing';
import { shadows } from '../../styles/shadows';

export default function SearchScreen() {  // Change name for each file
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💰</Text>   {/* 🔍 / 🛒 / 📦 / 👤 */}
      <Text style={styles.title}>Search</Text>  {/* Change title */}
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary },
  sub: { fontSize: 14, color: colors.textLight, marginTop: 6 },
});