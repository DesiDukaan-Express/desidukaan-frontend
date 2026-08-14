/**
 * UploadBox.js
 *
 * Reusable upload surface used for profile photo, license photo and RC
 * document. Supports:
 *   • Click / tap to pick (via the provided onPick handler)
 *   • Drag & drop on web (validated client-side)
 *   • JPG/PNG (max 10 MB) and PDF (max 10 MB) validation
 *   • Inline errors (red) with an optional retry action
 *   • Live upload progress (spinner + percentage)
 *   • Filled state: thumbnail / PDF row, green success check, Remove
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { C } from './onboardingTheme';
import { formatBytes, fileToObjectUrl } from '../../utils/imageEditor';

const MAX_MB = 10;

function matchesAccept(file, accept) {
  const name = (file?.name || '').toLowerCase();
  const type = (file?.type || file?.mimeType || '').toLowerCase();
  const ext = name.slice(name.lastIndexOf('.') + 1);

  const isImg = type.startsWith('image/') && /jpe?g|png/.test(ext || type);
  const isPdf = type === 'application/pdf' || ext === 'pdf';

  if (accept === 'image') return isImg;
  if (accept === 'pdf') return isPdf;
  return isImg || isPdf;
}

export default function UploadBox({
  label,
  hint,
  icon = '📷',
  accept = 'image-pdf',
  maxSizeMB = MAX_MB,
  file,                 // { uri, name, mime, size }
  uploading = false,
  progress = null,      // 0–100 or null
  error,                // string|null (validation / upload error)
  onPick,
  onFile,               // (fileData) => void  — called on drag & drop
  onRemove,
  onView,
  onCrop,               // () => void — reopen crop with the existing image
  onRetry,
  style,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [localErr, setLocalErr] = useState(null);

  const errText = localErr || error || null;
  const isPdf = file && (file.mime === 'application/pdf' || /\.pdf$/i.test(file.name || ''));

  // ── web drag & drop ──────────────────────────────────────────────────────
  const handleDrop = (e) => {
    setDragOver(false);
    const dt = e.dataTransfer;
    const dropFile = dt?.files?.[0];
    if (!dropFile) return;

    if (!matchesAccept(dropFile, accept)) {
      const wants = accept === 'pdf' ? 'PDF' : accept === 'image' ? 'JPG or PNG' : 'JPG, PNG or PDF';
      setLocalErr(`Invalid file type. Only ${wants} files are allowed.`);
      return;
    }
    if (dropFile.size > maxSizeMB * 1024 * 1024) {
      setLocalErr(`File is too large. Maximum size is ${maxSizeMB} MB.`);
      return;
    }

    setLocalErr(null);
    onFile({
      uri: fileToObjectUrl(dropFile),
      name: dropFile.name,
      mime: dropFile.type || (dropFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      size: dropFile.size,
      _file: dropFile,
    });
  };

  const dropProps =
    Platform.OS === 'web'
      ? {
          onDrop: (e) => {
            e.preventDefault();
            handleDrop(e);
          },
          onDragOver: (e) => {
            e.preventDefault();
            setDragOver(true);
          },
          onDragEnter: (e) => {
            e.preventDefault();
            setDragOver(true);
          },
          onDragLeave: () => setDragOver(false),
        }
      : {};

  return (
    <View style={[styles.wrap, style]}>
      {/* ── Uploading ── */}
      {uploading ? (
        <View style={styles.box}>
          <ActivityIndicator color={C.green} size="large" />
          <Text style={styles.uploadingTxt}>Uploading…</Text>
          {progress != null ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progress))}%` }]} />
            </View>
          ) : null}
          <Text style={styles.progressPct}>{progress != null ? `${Math.round(progress)}%` : ''}</Text>
        </View>
      ) : file ? (
        /* ── Filled state ── */
        <View style={styles.filled}>
          <View style={styles.filledRow}>
            {isPdf ? (
              <View style={styles.pdfIconWrap}>
                <Text style={styles.pdfIcon}>📄</Text>
              </View>
            ) : (
              <Image source={{ uri: file.uri }} style={styles.thumb} />
            )}

            <View style={styles.filledInfo}>
              <View style={styles.successRow}>
                <Text style={styles.successCheck}>✓</Text>
                <Text style={styles.successTxt}>
                  {isPdf ? 'PDF uploaded successfully' : 'Image uploaded successfully'}
                </Text>
              </View>
              <Text style={styles.fileName} numberOfLines={2}>{file.name || (isPdf ? 'document.pdf' : 'photo.jpg')}</Text>
              <View style={styles.metaRow}>
                {file.size ? <Text style={styles.fileMeta}>{formatBytes(file.size)}</Text> : null}
                {file.mime ? <Text style={styles.fileMeta}>{file.mime}</Text> : null}
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            {onView ? (
              <TouchableOpacity style={styles.smallBtn} onPress={onView} activeOpacity={0.75} accessibilityRole="button">
                <Text style={styles.smallBtnTxt}>{isPdf ? 'View PDF' : 'View'}</Text>
              </TouchableOpacity>
            ) : null}
            {onPick ? (
              <TouchableOpacity style={styles.smallBtn} onPress={onPick} activeOpacity={0.75} accessibilityRole="button">
                <Text style={styles.smallBtnTxt}>Replace</Text>
              </TouchableOpacity>
            ) : null}
            {onCrop && !isPdf ? (
              <TouchableOpacity style={[styles.smallBtn, styles.cropBtn]} onPress={onCrop} activeOpacity={0.75} accessibilityRole="button">
                <Text style={styles.cropTxt}>🔄 Crop Again</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.smallBtn, styles.removeBtn]}
              onPress={onRemove}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${file.name || 'file'}`}
            >
              <Text style={styles.removeTxt}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ── Empty dropzone ── */
        <View
          style={[styles.box, dragOver && styles.boxDragOver]}
          {...dropProps}
        >
          <TouchableOpacity
            onPress={onPick}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${label} — click to upload`}
            style={styles.dropInner}
          >
            <Text style={styles.emptyIcon}>{icon}</Text>
            <Text style={styles.emptyLabel}>{label}</Text>
            <Text style={styles.emptyHint}>{hint || 'Tap to upload'}</Text>
            {Platform.OS === 'web' ? <Text style={styles.dragHint}>or drag & drop here</Text> : null}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Inline error + retry ── */}
      {errText ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorTxt} numberOfLines={3}>{errText}</Text>
          {onRetry ? (
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.75}>
              <Text style={styles.retryTxt}>Retry</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },

  box: {
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  boxDragOver: { borderColor: C.green, backgroundColor: C.greenLight },
  dropInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 4, width: '100%' },

  emptyIcon: { fontSize: 30 },
  emptyLabel: { fontSize: 13, fontWeight: '700', color: C.textMed },
  emptyHint: { fontSize: 11, color: C.textXLight },
  dragHint: { fontSize: 10, color: C.green, fontWeight: '700', marginTop: 2 },

  uploadingTxt: { fontSize: 13, fontWeight: '700', color: C.textMed, marginTop: 6 },
  progressTrack: {
    width: '70%',
    height: 6,
    borderRadius: 4,
    backgroundColor: C.border,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: C.green },
  progressPct: { fontSize: 11, fontWeight: '800', color: C.green, marginTop: 4 },

  filled: {
    borderWidth: 1.5,
    borderColor: C.greenMid,
    backgroundColor: C.greenLight,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  filledRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#fff' },
  pdfIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  pdfIcon: { fontSize: 24 },
  filledInfo: { flex: 1, gap: 2 },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  successCheck: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
    backgroundColor: C.green,
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: 'center',
    lineHeight: 18,
  },
  successTxt: { fontSize: 11, fontWeight: '700', color: C.greenDeep },
  fileName: { fontSize: 13, fontWeight: '600', color: C.text, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fileMeta: { fontSize: 10, color: C.textXLight, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallBtn: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnTxt: { fontSize: 12, fontWeight: '700', color: C.textMed },
  cropBtn: { backgroundColor: C.blueLight, borderColor: '#BFDBFE' },
  cropTxt: { fontSize: 12, fontWeight: '700', color: C.blue },
  removeBtn: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  removeTxt: { fontSize: 12, fontWeight: '700', color: C.red },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorIcon: { fontSize: 11, color: C.red },
  errorTxt: { flex: 1, fontSize: 11, color: C.red, fontWeight: '600', lineHeight: 15 },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.red,
  },
  retryTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
