/**
 * OnboardingField.js
 *
 * Label + control + inline validation row. The required asterisk is rendered
 * as a sibling <Text> (no nested <Text>), so text stays clean and the red
 * star is easy to style.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from './onboardingTheme';

export default function OnboardingField({ label, required, errorKey, errors, children, style }) {
  const err = errors?.[errorKey];

  return (
    <View style={[styles.field, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required ? <Text style={styles.star}> *</Text> : null}
      </View>
      {children}
      {err ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorText}>{err}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 5 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  star: { fontSize: 13, fontWeight: '800', color: C.red },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  errorIcon: { fontSize: 10, color: C.red, marginTop: 2 },
  errorText: {
    flex: 1,
    fontSize: 11,
    color: C.red,
    fontWeight: '600',
    lineHeight: 15,
  },
});
