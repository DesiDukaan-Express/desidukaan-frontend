/**
 * RemovalConfirmDialog.js
 *
 * Custom in-app confirmation modal used by every file-removal action.
 * Replaces native `window.confirm` / `Alert.alert` so the UI matches the
 * app's green theme. Uses a RN <Modal> with a transparent dark overlay.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { C } from './onboardingTheme';

export default function RemovalConfirmDialog({
  visible,
  fileName = 'this file',
  title = 'Remove file?',
  message,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🗑️</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>
            {message || `Are you sure you want to remove ${fileName}?`}
          </Text>
          <Text style={styles.warning}>This action cannot be undone.</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={onCancel}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.btnCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnRemove]}
              onPress={onConfirm}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Remove file"
            >
              <Text style={styles.btnRemoveTxt}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  icon: { fontSize: 26 },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: C.textMed,
    textAlign: 'center',
    lineHeight: 20,
  },
  warning: {
    fontSize: 12,
    color: C.textXLight,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: '#E5E7EB',
  },
  btnCancelTxt: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  btnRemove: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  btnRemoveTxt: {
    color: C.red,
    fontSize: 14,
    fontWeight: '800',
  },
});
