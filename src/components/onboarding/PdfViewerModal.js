/**
 * PdfViewerModal.js
 *
 * PDF viewer built on pdf.js (v4, loaded lazily from CDN on web):
 *   • Page navigation (Previous / Page x of n / Next)
 *   • Zoom controls (– / % / +) plus presets 50/75/100/150/200%
 *   • Scrollable, mobile-friendly rendering with full width on small screens
 *   • Fullscreen toggle
 *   • Download / Open in new tab / Print / Close actions
 *
 * On native (no DOM canvas) it degrades gracefully to a file-info panel with
 * Open / Share / Close actions.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { C } from './onboardingTheme';

const PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
const ZOOM_PRESETS = [50, 75, 100, 150, 200];

let pdfjsPromise = null;

function loadPdfJs() {
  if (typeof window === 'undefined' || Platform.OS !== 'web') {
    return Promise.reject(new Error('PDF preview is only available on web'));
  }
  if (window.__desidukaanPdfjs) return Promise.resolve(window.__desidukaanPdfjs);
  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent =
        `import * as pdfjs from '${PDFJS_CDN}';` +
        `pdfjs.GlobalWorkerOptions.workerSrc = '${PDFJS_WORKER}';` +
        `window.__desidukaanPdfjs = pdfjs;`;
      script.onerror = () => {
        pdfjsPromise = null;
        reject(new Error('Could not load the PDF viewer library'));
      };
      document.head.appendChild(script);

      const started = Date.now();
      const poll = setInterval(() => {
        if (window.__desidukaanPdfjs) {
          clearInterval(poll);
          resolve(window.__desidukaanPdfjs);
        } else if (Date.now() - started > 20000) {
          clearInterval(poll);
          pdfjsPromise = null;
          reject(new Error('PDF viewer timed out'));
        }
      }, 200);
    } catch (err) {
      pdfjsPromise = null;
      reject(err);
    }
  });
  return pdfjsPromise;
}

export default function PdfViewerModal({ visible, uri, fileName = 'document.pdf', onClose }) {
  const isWeb = Platform.OS === 'web';

  const [pdf, setPdf] = useState(null);           // pdfjs doc
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageImage, setPageImage] = useState(null); // data-url of rendered page
  const [pageRatio, setPageRatio] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [containerW, setContainerW] = useState(0);

  const pdfRef = useRef(null);
  const renderSeq = useRef(0);

  // ── Load the document when opened ─────────────────────────────────────────
  useEffect(() => {
    if (!visible || !uri) return;
    let cancelled = false;

    const open = async () => {
      setLoadingDoc(true);
      setError(null);
      setPdf(null);
      setPageCount(0);
      setPageNumber(1);
      setPageImage(null);
      try {
        const pdfjs = await loadPdfJs();
        if (cancelled) return;
        const doc = await pdfjs.getDocument({ url: uri }).promise;
        if (cancelled) { doc.destroy(); return; }
        pdfRef.current = doc;
        setPdf(doc);
        setPageCount(doc.numPages);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not open the PDF');
      } finally {
        if (!cancelled) setLoadingDoc(false);
      }
    };

    open();
    return () => { cancelled = true; };
  }, [visible, uri]);

  // Clean up doc when modal closes
  useEffect(() => {
    if (!visible && pdfRef.current) {
      pdfRef.current.destroy().catch(() => {});
      pdfRef.current = null;
      setPdf(null);
      setPageImage(null);
      setPageCount(0);
      setPageNumber(1);
      setFullscreen(false);
      setError(null);
    }
  }, [visible]);

  // ── Render the current page at the current zoom ───────────────────────────
  useEffect(() => {
    if (!isWeb || !pdf || !pageCount) return;
    let cancelled = false;
    const seq = ++renderSeq.current;

    const renderPage = async () => {
      setRendering(true);
      try {
        const page = await pdf.getPage(Math.min(Math.max(1, pageNumber), pageCount));
        if (cancelled || seq !== renderSeq.current) return;
        const viewport = page.getViewport({ scale: zoom / 100 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled || seq !== renderSeq.current) return;
        setPageImage(canvas.toDataURL('image/png'));
        setPageRatio(viewport.width / viewport.height);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not render this page');
      } finally {
        if (!cancelled && seq === renderSeq.current) setRendering(false);
      }
    };

    renderPage();
    return () => { cancelled = true; };
  }, [isWeb, pdf, pageNumber, zoom, pageCount]);

  const canPrev = pageNumber > 1;
  const canNext = pageNumber < pageCount;

  // ── Actions ───────────────────────────────────────────────────────────────
  const downloadPdf = async () => {
    try {
      if (isWeb) {
        const a = document.createElement('a');
        a.href = uri;
        a.download = fileName || 'document.pdf';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 500);
      } else {
        await sharePdf(fileName);
      }
    } catch (err) {
      Alert.alert('Download failed', err.message || 'Could not download the PDF');
    }
  };

  const sharePdf = async (name) => {
    const Sharing = (await import('expo-sharing')).default;
    const LegacyFS = await import('expo-file-system/legacy');
    const target = (LegacyFS.cacheDirectory || LegacyFS.documentDirectory || '') + 'desidukaan_rc.pdf';
    if (uri.startsWith('file:') || uri.startsWith('/')) {
      await LegacyFS.copyAsync({ from: uri, to: target });
    } else {
      await LegacyFS.downloadAsync(uri, target);
    }
    const info = await LegacyFS.getInfoAsync(target);
    if (info.exists) {
      await Sharing.shareAsync(target, { mimeType: 'application/pdf', dialogTitle: name });
      return;
    }
    throw new Error('PDF sharing is not available on this device');
  };

  const openNewTab = () => {
    if (isWeb) {
      window.open(uri, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(uri).catch(() => Alert.alert('Unable to open', 'Could not open this link.'));
    }
  };

  const printPdf = () => {
    if (!isWeb) {
      Alert.alert('Print', 'Printing is only available on web.');
      return;
    }
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = uri;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) { /* cross-origin */ }
          setTimeout(() => document.body.removeChild(iframe), 60000);
        }, 300);
      };
    } catch (err) {
      Alert.alert('Print failed', err.message || 'Could not start printing.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{fileName || 'PDF document'}</Text>
            <Text style={styles.headerSub}>
              {pageCount ? `${pageCount} page${pageCount > 1 ? 's' : ''}` : 'PDF viewer'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setFullscreen((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Toggle fullscreen"
            style={styles.iconBtn}
          >
            <Text style={styles.iconBtnTxt}>{fullscreen ? '⤢' : '⤡'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close PDF viewer"
            style={styles.closeBtn}
          >
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Body */}
        {!isWeb ? (
          <View style={styles.nativeFallback}>
            <Text style={styles.nativePdfIcon}>📄</Text>
            <Text style={styles.nativeTitle} numberOfLines={2}>{fileName}</Text>
            <Text style={styles.nativeHint}>
              PDF preview is available on web. You can still open or share the file.
            </Text>
            <View style={styles.fallbackActions}>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={openNewTab} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryTxt}>Open</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => sharePdf(fileName).catch((e) => Alert.alert('Share failed', e.message))} activeOpacity={0.85}>
                <Text style={styles.btnSecondaryTxt}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Toolbar */}
            <View style={styles.toolbar}>
              <TouchableOpacity style={[styles.navBtn, !canPrev && styles.navBtnDisabled]} onPress={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={!canPrev} accessibilityRole="button">
                <Text style={styles.navTxt}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageIndicator}>
                Page {pageCount ? pageNumber : '–'} of {pageCount || '–'}
              </Text>
              <TouchableOpacity style={[styles.navBtn, !canNext && styles.navBtnDisabled]} onPress={() => setPageNumber((p) => Math.min(pageCount, p + 1))} disabled={!canNext} accessibilityRole="button">
                <Text style={styles.navTxt}>Next</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.zoomRow}>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoom((z) => Math.max(50, z - 25))} accessibilityRole="button" accessibilityLabel="Zoom out">
                <Text style={styles.zoomBtnTxt}>−</Text>
              </TouchableOpacity>
              <Text style={styles.zoomLevel}>{zoom}%</Text>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoom((z) => Math.min(200, z + 25))} accessibilityRole="button" accessibilityLabel="Zoom in">
                <Text style={styles.zoomBtnTxt}>+</Text>
              </TouchableOpacity>
              <View style={styles.presetWrap}>
                {ZOOM_PRESETS.map((p) => {
                  const active = zoom === p;
                  return (
                    <TouchableOpacity key={p} style={[styles.presetChip, active && styles.presetChipActive]} onPress={() => setZoom(p)} accessibilityRole="button">
                      <Text style={[styles.presetTxt, active && styles.presetTxtActive]}>{p}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Page display */}
            <View style={styles.display} onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}>
              {loadingDoc ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator color={C.green} size="large" />
                  <Text style={styles.centerTxt}>Opening PDF…</Text>
                </View>
              ) : error ? (
                <View style={styles.centerBox}>
                  <Text style={styles.errorTxt}>⚠ {error}</Text>
                </View>
              ) : pageImage ? (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator
                  showsHorizontalScrollIndicator
                >
                  {rendering ? (
                    <View style={styles.centerBox}>
                      <ActivityIndicator color={C.green} size="small" />
                      <Text style={styles.centerTxt}>Rendering page…</Text>
                    </View>
                  ) : null}
                  <ScrollView horizontal contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                      source={{ uri: pageImage }}
                      style={{
                        width: Math.max(200, (containerW || 400) * (zoom / 100)),
                        height: Math.max(200, ((containerW || 400) * (zoom / 100)) / (pageRatio || 1)),
                      }}
                      resizeMode="contain"
                      accessibilityLabel={`PDF page ${pageNumber}`}
                    />
                  </ScrollView>
                </ScrollView>
              ) : null}
            </View>
          </>
        )}

        {/* Actions */}
        {!fullscreen ? (
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={downloadPdf} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.btnPrimaryTxt}>Download PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={openNewTab} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.btnSecondaryTxt}>Open in New Tab</Text>
            </TouchableOpacity>
            {isWeb ? (
              <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={printPdf} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.btnSecondaryTxt}>Print</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.btn, styles.btnClose]} onPress={onClose} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.btnCloseTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'ios' ? 52 : 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.green,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  iconBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border },
  navBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 36, justifyContent: 'center' },
  navBtnDisabled: { opacity: 0.4 },
  navTxt: { color: C.textMed, fontSize: 12, fontWeight: '700' },
  pageIndicator: { color: C.textLight, fontSize: 12, fontWeight: '700' },

  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border, flexWrap: 'wrap' },
  zoomBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  zoomBtnTxt: { color: C.textMed, fontSize: 18, fontWeight: '800' },
  zoomLevel: { color: C.text, fontSize: 12, fontWeight: '800', minWidth: 42, textAlign: 'center' },
  presetWrap: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' },
  presetChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: C.border },
  presetChipActive: { backgroundColor: C.green, borderColor: C.green },
  presetTxt: { color: C.textLight, fontSize: 11, fontWeight: '700' },
  presetTxtActive: { color: '#fff' },

  display: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { alignItems: 'center', paddingVertical: 16, gap: 12 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  centerTxt: { color: C.textLight, fontSize: 12, fontWeight: '600' },
  errorTxt: { color: C.red, fontSize: 13, fontWeight: '700', textAlign: 'center' },

  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border },
  btn: { flexGrow: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  btnPrimary: { backgroundColor: C.green },
  btnPrimaryTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  btnSecondary: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  btnSecondaryTxt: { color: C.textMed, fontSize: 12, fontWeight: '700' },
  btnClose: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  btnCloseTxt: { color: C.textMed, fontSize: 12, fontWeight: '700' },

  nativeFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: C.bg },
  nativePdfIcon: { fontSize: 56 },
  nativeTitle: { color: C.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  nativeHint: { color: C.textLight, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  fallbackActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
