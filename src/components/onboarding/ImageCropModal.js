/**
 * ImageCropModal.js
 *
 * Full-screen crop & edit modal:
 *   • Stage 1 (edit): preview + crop window with move/resize handles,
 *     crop shapes (free / square / circle), zoom (0.5×–2×, fit-relative),
 *     zoom presets (50/75/100/150/200%), Fit-to-crop-box, constrained image
 *     panning, rotate left/right (90°), flip horizontal / vertical.
 *   • Stage 2 (preview): shows the cropped result with its dimensions and
 *     file size, then Confirm & Upload / Crop Again / Cancel.
 *
 * Zoom model:
 *   • zoom = 1.0 means the (rotated) image fits the canvas exactly (contain).
 *   • Zoom is applied via the element's LAYOUT size (width/height), never via
 *     a scale transform, so the image always renders fully at 0.5×–1× and is
 *     simply centered — nothing is ever clipped or floating.
 *   • At zoom > 1 the image can be panned (dragged) but is constrained so it
 *     can never leave the visible area completely.
 *   • The crop window is a container-space "lens": it stays on screen and the
 *     panning/zooming moves the image underneath it. Crop mapping recomputes
 *     from the same geometry, so the output is exact at any zoom/pan.
 *   • Fit scales the image to fill the current crop window: it picks the
 *     smaller of (win.w / image.w) and (win.h / image.h), so the whole image
 *     fits inside the crop area, then the crop box wraps it exactly.
 *
 * The actual pixel work is delegated to ../../utils/imageEditor which uses
 * Canvas 2D on web and expo-image-manipulator on native.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  PanResponder,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { C } from './onboardingTheme';
import { getImageSize, applyImageTransform, cropImage, formatBytes } from '../../utils/imageEditor';

const ROT_LEFT  = -90;
const ROT_RIGHT = 90;
const MIN_WIN = 48;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_PRESETS = [0.5, 0.75, 1, 1.5, 2];

/**
 * Compute the display geometry for a (possibly rotated) image.
 * @param {{w:number,h:number}} box   preview container size
 * @param {number} rotW               width after rotation (effectiveW)
 * @param {number} rotH               height after rotation (effectiveH)
 * @param {number} zoom               fit-relative zoom (1 = exact fit)
 * @param {{x:number,y:number}} pan   pan offset from centered position
 */
function computeGeom(box, rotW, rotH, zoom, pan) {
  const zero = { baseScale: 1, dw: 0, dh: 0, dispW: 0, dispH: 0, imgLeft: 0, imgTop: 0, panX: 0, panY: 0, maxPanX: 0, maxPanY: 0 };
  if (!box?.w || !box?.h || !rotW || !rotH) return zero;

  const baseScale = Math.min(box.w / rotW, box.h / rotH); // fit-to-screen scale
  const dw = rotW * baseScale;                             // display size at zoom 1
  const dh = rotH * baseScale;
  const dispW = dw * zoom;                                 // display size at current zoom
  const dispH = dh * zoom;

  // Constrained pan: never let the image leave the visible area completely.
  const maxPanX = Math.max(0, (dispW - box.w) / 2);
  const maxPanY = Math.max(0, (dispH - box.h) / 2);
  const panX = Math.max(-maxPanX, Math.min(maxPanX, pan?.x || 0));
  const panY = Math.max(-maxPanY, Math.min(maxPanY, pan?.y || 0));

  return {
    baseScale,
    dw,
    dh,
    dispW,
    dispH,
    panX,
    panY,
    maxPanX,
    maxPanY,
    imgLeft: (box.w - dispW) / 2 + panX,
    imgTop: (box.h - dispH) / 2 + panY,
  };
}

function clampWin(win, dispW, dispH, imgLeft, imgTop) {
  const w = Math.max(MIN_WIN, Math.min(win.w, dispW));
  const h = Math.max(MIN_WIN, Math.min(win.h, dispH));
  const x = Math.min(Math.max(win.x, imgLeft), imgLeft + dispW - w);
  const y = Math.min(Math.max(win.y, imgTop), imgTop + dispH - h);
  return { x, y, w, h };
}

const MODES = [
  { key: 'free', label: 'Rect', icon: '▭' },
  { key: 'square', label: 'Square', icon: '⬜' },
  { key: 'circle', label: 'Circle', icon: '◯' },
];

export default function ImageCropModal({
  visible,
  sourceUri,
  title = 'Edit Image',
  defaultMode = 'square',
  onConfirm,
  onCancel,
}) {
  const [stage, setStage] = useState('edit'); // 'edit' | 'preview'
  const [imageSize, setImageSize] = useState(null);
  const [containerSize, setContainerSize] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState(defaultMode);
  const [win, setWin] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  const winRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const startWinRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });
  const geomRef = useRef({ dispW: 0, dispH: 0, imgLeft: 0, imgTop: 0, panX: 0, panY: 0, maxPanX: 0, maxPanY: 0, baseScale: 1, dw: 0, dh: 0 });
  const modeRef = useRef(mode);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  const effectiveW = imageSize && rotation % 180 !== 0 ? imageSize.height : imageSize?.width;
  const effectiveH = imageSize && rotation % 180 !== 0 ? imageSize.width : imageSize?.height;

  // ── Reset when opened ────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    setStage('edit');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setMode(defaultMode);
    setPreviewResult(null);
    setError(null);
    setImageSize(null);
    setWin(null);
    if (sourceUri) {
      getImageSize(sourceUri).then(setImageSize).catch((e) => setError(e.message));
    }
  }, [visible, sourceUri, defaultMode]);

  // ── Initialise crop window once geometry is known ────────────────────────
  useEffect(() => {
    if (!visible || !containerSize || !imageSize) return;
    const g = computeGeom(containerSize, effectiveW, effectiveH, zoom, pan);
    if (!g.dw || !g.dh) return;
    const side = Math.min(g.dw, g.dh) * 0.8;
    const winW = mode === 'free' ? Math.min(g.dw * 0.75, g.dh * 0.6) : side;
    const winH = mode === 'free' ? Math.min(g.dw * 0.6, g.dh * 0.75) : side;
    const next = clampWin(
      { x: (containerSize.w - winW) / 2, y: (containerSize.h - winH) / 2, w: winW, h: winH },
      g.dispW, g.dispH, g.imgLeft, g.imgTop
    );
    winRef.current = next;
    setWin({ ...next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, containerSize, imageSize, mode]);

  // ── Keep the crop window inside the image on zoom/rotate/pan changes ─────
  useEffect(() => {
    if (!visible || !containerSize || !imageSize || !winRef.current) return;
    const g = computeGeom(containerSize, effectiveW, effectiveH, zoom, pan);
    const next = clampWin(winRef.current, g.dispW, g.dispH, g.imgLeft, g.imgTop);
    winRef.current = next;
    setWin({ ...next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, containerSize, imageSize, rotation, flipH, flipV, zoom, pan]);

  // geomRef kept up to date for the PanResponders
  geomRef.current = visible && containerSize && imageSize
    ? computeGeom(containerSize, effectiveW, effectiveH, zoom, pan)
    : { dispW: 0, dispH: 0, imgLeft: 0, imgTop: 0, panX: 0, panY: 0, maxPanX: 0, maxPanY: 0, baseScale: 1, dw: 0, dh: 0 };

  // ── Zoom / pan helpers ───────────────────────────────────────────────────
  const applyZoom = (z) => {
    const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    setZoom(nz);
    setPan({ x: 0, y: 0 }); // center the image whenever zoom changes
  };

  // Fit to crop box: zoom the image so its display size matches the CURRENT
  // crop window (winRef). At zoom 1 the image renders at g.dw × g.dh; we scale
  // the image by min(win.w / g.dw, win.h / g.dh) — the SMALLER ratio wins, so
  // the whole image always fits inside the crop area with nothing cut off.
  // The crop-window clamp then wraps the box tightly around the image, so the
  // photo fills the crop area edge-to-edge (no empty space), centered.
  const fitImageToScreen = () => {
    const win = winRef.current;
    const g = geomRef.current;
    if (!win?.w || !win?.h || !g?.dw || !g?.dh) {
      applyZoom(1);
      return;
    }
    // Fit by width and height against the crop box, take the smaller result.
    const fitByWidth = win.w / g.dw;
    const fitByHeight = win.h / g.dh;
    const fitZoom = Math.min(fitByWidth, fitByHeight) * 0.97; // 97% breathing room
    // Re-center the crop box on the canvas so it wraps the (centered) image.
    if (containerSize) {
      const centered = {
        x: (containerSize.w - win.w) / 2,
        y: (containerSize.h - win.h) / 2,
        w: win.w,
        h: win.h,
      };
      winRef.current = clampWin(centered, g.dispW, g.dispH, g.imgLeft, g.imgTop);
      setWin({ ...winRef.current });
    }
    applyZoom(fitZoom);
  };

  const applyRotate = (delta) => {
    if (working) return;
    setRotation((r) => ((((r + delta) % 360) + 360) % 360));
    setPan({ x: 0, y: 0 }); // re-center after rotate
  };

  const toggleFlip = (axis) => {
    if (working) return;
    if (axis === 'h') setFlipH((v) => !v);
    else setFlipV((v) => !v);
    setPan({ x: 0, y: 0 }); // re-center after flip
  };

  // ── Pan responders ───────────────────────────────────────────────────────
  // Move the crop window
  const movePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 2,
        onPanResponderGrant: () => { startWinRef.current = { ...winRef.current }; },
        onPanResponderMove: (_e, g) => {
          const start = startWinRef.current;
          const gm = geomRef.current;
          const next = clampWin(
            { ...start, x: start.x + g.dx, y: start.y + g.dy },
            gm.dispW, gm.dispH, gm.imgLeft, gm.imgTop
          );
          winRef.current = next;
          setWin({ ...next });
        },
      }),
    []
  );

  const makeResizePan = (corner) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 2,
      onPanResponderGrant: () => { startWinRef.current = { ...winRef.current }; },
      onPanResponderMove: (_e, g) => {
        const start = startWinRef.current;
        const gm = geomRef.current;
        const lock = modeRef.current !== 'free';
        let { x, y, w, h } = start;
        if (corner.includes('e')) w = start.w + g.dx;
        if (corner.includes('s')) h = start.h + g.dy;
        if (corner.includes('w')) { x = start.x + g.dx; w = start.w - g.dx; }
        if (corner.includes('n')) { y = start.y + g.dy; h = start.h - g.dy; }
        if (lock) {
          const side = Math.max(MIN_WIN, Math.max(Math.abs(w), Math.abs(h)));
          const anchorX = corner.includes('e') ? start.x + start.w : start.x;
          const anchorY = corner.includes('s') ? start.y + start.h : start.y;
          x = corner.includes('e') ? anchorX - side : anchorX;
          y = corner.includes('s') ? anchorY - side : anchorY;
          w = side;
          h = side;
        }
        const next = clampWin({ x, y, w, h }, gm.dispW, gm.dispH, gm.imgLeft, gm.imgTop);
        winRef.current = next;
        setWin({ ...next });
      },
    });

  const resizePans = useMemo(
    () => ({
      nw: makeResizePan('nw'), ne: makeResizePan('ne'),
      sw: makeResizePan('sw'), se: makeResizePan('se'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Drag the image itself (only active when zoomed in beyond the canvas)
  const imagePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 2,
        onPanResponderGrant: () => { startPanRef.current = { ...panRef.current }; },
        onPanResponderMove: (_e, g) => {
          const gm = geomRef.current;
          const target = { x: startPanRef.current.x + g.dx, y: startPanRef.current.y + g.dy };
          const nx = Math.max(-gm.maxPanX, Math.min(gm.maxPanX, target.x));
          const ny = Math.max(-gm.maxPanY, Math.min(gm.maxPanY, target.y));
          panRef.current = { x: nx, y: ny };
          setPan({ x: nx, y: ny });
        },
      }),
    []
  );

  // ── Crop & Save ──────────────────────────────────────────────────────────
  const handleCropSave = async () => {
    if (!sourceUri || !imageSize || !containerSize || !winRef.current) return;
    setWorking(true);
    setError(null);
    try {
      const transformed = await applyImageTransform({ uri: sourceUri, rotation, flipH, flipV });
      // Use the SAME geometry the preview is showing so the crop is exact.
      const g = computeGeom(containerSize, transformed.width, transformed.height, zoom, pan);
      const scaleToSrc = transformed.width / g.dispW;
      const clamped = clampWin(winRef.current, g.dispW, g.dispH, g.imgLeft, g.imgTop);
      const result = await cropImage({
        uri: transformed.uri,
        originX: (clamped.x - g.imgLeft) * scaleToSrc,
        originY: (clamped.y - g.imgTop) * scaleToSrc,
        width: clamped.w * scaleToSrc,
        height: clamped.h * scaleToSrc,
        circular: mode === 'circle',
      });
      setPreviewResult({ ...result, name: 'cropped.jpg' });
      setStage('preview');
    } catch (err) {
      setError(err.message || 'Could not crop the image. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const handleCancel = () => {
    if (working) return;
    if (stage === 'preview') {
      setStage('edit');
      return;
    }
    onCancel?.();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const g = geomRef.current;
  const canPan = g.maxPanX > 0 || g.maxPanY > 0;
  // The element that holds the image must use the ORIGINAL (unrotated) aspect
  // so rotate/flip transform fills the rotated footprint exactly.
  const scalePx = g.baseScale * zoom;
  const elemW = imageSize ? imageSize.width * scalePx : 0;
  const elemH = imageSize ? imageSize.height * scalePx : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCancel}
    >
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSub}>
              {stage === 'preview' ? 'Cropped preview' : 'Adjust & crop your image'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.closeBtn}
          >
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {stage === 'edit' ? (
          /* ─────────────────────────── EDIT STAGE ─────────────────────────── */
          <>
            <View
              style={styles.stage}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setContainerSize((prev) => (prev?.w === width && prev?.h === height ? prev : { w: width, h: height }));
              }}
            >
              {!imageSize ? (
                <ActivityIndicator color={C.green} size="large" />
              ) : (
                <>
                  {/* The image — zoom is applied via layout size, so it always
                      renders fully and centered at zoom <= 1 (never clipped). */}
                  <View
                    style={[
                      styles.imgEl,
                      {
                        left: containerSize ? containerSize.w / 2 + g.panX - elemW / 2 : 0,
                        top: containerSize ? containerSize.h / 2 + g.panY - elemH / 2 : 0,
                        width: elemW,
                        height: elemH,
                        transform: [
                          { rotate: `${rotation}deg` },
                          { scaleX: flipH ? -1 : 1 },
                          { scaleY: flipV ? -1 : 1 },
                        ],
                      },
                    ]}
                    {...(canPan ? imagePan.panHandlers : {})}
                  >
                    <Image source={{ uri: sourceUri }} style={styles.imgFull} resizeMode="contain" />
                  </View>

                  {/* Shade outside the crop window */}
                  {win && (
                    <>
                      <View style={[styles.shade, { top: 0, left: 0, right: 0, height: win.y }]} pointerEvents="none" />
                      <View style={[styles.shade, { top: win.y + win.h, left: 0, right: 0, bottom: 0 }]} pointerEvents="none" />
                      <View style={[styles.shade, { top: win.y, left: 0, width: win.x, height: win.h }]} pointerEvents="none" />
                      <View style={[styles.shade, { top: win.y, left: win.x + win.w, right: 0, height: win.h }]} pointerEvents="none" />

                      {/* Crop window (container-space lens) */}
                      <View
                        style={[
                          styles.win,
                          mode === 'circle' && { borderRadius: Math.min(win.w, win.h) / 2 },
                          { left: win.x, top: win.y, width: win.w, height: win.h },
                        ]}
                        {...movePan.panHandlers}
                      >
                        {['nw', 'ne', 'sw', 'se'].map((c) => (
                          <View
                            key={c}
                            style={[styles.handle, styles[`handle_${c}`]]}
                            {...resizePans[c].panHandlers}
                          />
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}
            </View>

            {/* Crop mode tabs */}
            <View style={styles.modeRow}>
              {MODES.map((m) => {
                const active = mode === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => setMode(m.key)}
                    style={[styles.modeChip, active && styles.modeChipActive]}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Text style={styles.modeIcon}>{m.icon}</Text>
                    <Text style={[styles.modeTxt, active && styles.modeTxtActive]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Zoom slider + Fit */}
            <View style={styles.zoomRow}>
              <Text style={styles.zoomLabel}>Zoom</Text>
              <Slider
                style={{ flex: 1, height: 32 }}
                minimumValue={MIN_ZOOM}
                maximumValue={MAX_ZOOM}
                step={0.05}
                value={zoom}
                onValueChange={applyZoom}
                minimumTrackTintColor={C.green}
                maximumTrackTintColor={C.border}
                thumbTintColor={C.green}
                accessibilityLabel="Zoom slider"
              />
              <Text style={styles.zoomValue}>{Math.round(zoom * 100)}%</Text>
              <TouchableOpacity
                style={[styles.fitBtn, Math.abs(zoom - 1) < 0.001 && styles.fitBtnActive]}
                onPress={fitImageToScreen}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Fit image to crop box"
              >
                <Text style={[styles.fitBtnTxt, Math.abs(zoom - 1) < 0.001 && styles.fitBtnTxtActive]}>Fit</Text>
              </TouchableOpacity>
            </View>

            {/* Zoom presets */}
            <View style={styles.presetRow}>
              {ZOOM_PRESETS.map((p) => {
                const active = Math.abs(zoom - p) < 0.001;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.presetChip, active && styles.presetChipActive]}
                    onPress={() => applyZoom(p)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.presetTxt, active && styles.presetTxtActive]}>
                      {Math.round(p * 100)}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {canPan ? (
              <Text style={styles.panHint}>Drag the image to reposition while zoomed</Text>
            ) : null}

            {/* Rotate / flip controls */}
            <View style={styles.ctrlRow}>
              <TouchableOpacity style={styles.ctrlBtn} onPress={() => applyRotate(ROT_LEFT)} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.ctrlIcon}>↺</Text>
                <Text style={styles.ctrlTxt}>Rotate L</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtn} onPress={() => applyRotate(ROT_RIGHT)} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.ctrlIcon}>↻</Text>
                <Text style={styles.ctrlTxt}>Rotate R</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ctrlBtn, flipH && styles.ctrlBtnActive]} onPress={() => toggleFlip('h')} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.ctrlIcon}>⇋</Text>
                <Text style={styles.ctrlTxt}>Flip H</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ctrlBtn, flipV && styles.ctrlBtnActive]} onPress={() => toggleFlip('v')} activeOpacity={0.8} accessibilityRole="button">
                <Text style={styles.ctrlIcon}>⇵</Text>
                <Text style={styles.ctrlTxt}>Flip V</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorRow}>
                <Text style={styles.errorTxt}>⚠ {error}</Text>
              </View>
            ) : null}
          </>
        ) : (
          /* ─────────────────────────── PREVIEW STAGE ──────────────────────── */
          previewResult ? (
            <>
              <View style={styles.previewWrap}>
                <View style={styles.previewFrame}>
                  <Image
                    source={{ uri: previewResult.uri }}
                    style={[
                      styles.previewImg,
                      mode === 'circle' && { borderRadius: 999 },
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.previewMeta}>
                  <Text style={styles.previewMetaTxt}>
                    {previewResult.width} × {previewResult.height} px
                  </Text>
                  <Text style={styles.previewMetaTxt}>
                    {formatBytes(previewResult.sizeBytes)}
                  </Text>
                </View>
              </View>

              {error ? (
                <View style={styles.errorRow}>
                  <Text style={styles.errorTxt}>⚠ {error}</Text>
                </View>
              ) : null}
            </>
          ) : null
        )}

        {/* Footer actions */}
        {stage === 'edit' ? (
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleCancel} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.btnSecondaryTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, (working || !win) && styles.btnDisabled]}
              onPress={handleCropSave}
              disabled={working || !win}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {working ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryTxt}>Crop & Save</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleCancel} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.btnSecondaryTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => { setStage('edit'); }} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.btnSecondaryTxt}>Crop Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => onConfirm?.(previewResult)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Confirm and upload"
            >
              <Text style={styles.btnPrimaryTxt}>Confirm & Upload</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'ios' ? 52 : 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  headerSub: { fontSize: 11, color: C.textXLight, marginTop: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 15, color: C.textMed, fontWeight: '700' },

  stage: { flex: 1, margin: 14, borderRadius: 14, backgroundColor: '#111', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  imgEl: { position: 'absolute' },
  imgFull: { width: '100%', height: '100%' },

  shade: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  win: { position: 'absolute', borderWidth: 2, borderColor: '#fff' },
  handle: { position: 'absolute', width: 22, height: 22, borderRadius: 6, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.green },
  handle_nw: { top: -11, left: -11 },
  handle_ne: { top: -11, right: -11 },
  handle_sw: { bottom: -11, left: -11 },
  handle_se: { bottom: -11, right: -11 },

  modeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  modeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border },
  modeChipActive: { borderColor: C.green, backgroundColor: C.greenLight },
  modeIcon: { fontSize: 13 },
  modeTxt: { fontSize: 12, fontWeight: '700', color: C.textLight },
  modeTxtActive: { color: C.greenDeep },

  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  zoomLabel: { fontSize: 12, fontWeight: '700', color: C.textLight, width: 44 },
  zoomValue: { fontSize: 12, fontWeight: '800', color: C.greenDeep, width: 40, textAlign: 'right' },
  fitBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border },
  fitBtnActive: { borderColor: C.green, backgroundColor: C.greenLight },
  fitBtnTxt: { fontSize: 12, fontWeight: '800', color: C.textLight },
  fitBtnTxtActive: { color: C.greenDeep },

  presetRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 6, flexWrap: 'wrap' },
  presetChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border },
  presetChipActive: { borderColor: C.green, backgroundColor: C.greenLight },
  presetTxt: { fontSize: 11, fontWeight: '800', color: C.textLight },
  presetTxtActive: { color: C.greenDeep },

  panHint: { fontSize: 11, color: C.textXLight, fontWeight: '600', paddingHorizontal: 18, paddingTop: 4 },

  ctrlRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, flexWrap: 'wrap' },
  ctrlBtn: { flex: 1, minWidth: 74, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.border, gap: 2 },
  ctrlBtnActive: { borderColor: C.green, backgroundColor: C.greenLight },
  ctrlIcon: { fontSize: 16, color: C.textMed },
  ctrlTxt: { fontSize: 10, fontWeight: '700', color: C.textLight },

  footer: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.border },
  btn: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  btnPrimary: { backgroundColor: C.green },
  btnPrimaryTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btnSecondary: { backgroundColor: '#F3F4F6' },
  btnSecondaryTxt: { color: C.textMed, fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  previewWrap: { flex: 1, margin: 14, gap: 10 },
  previewFrame: { flex: 1, borderRadius: 14, backgroundColor: '#111', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: '100%', height: '100%' },
  previewMeta: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 8 },
  previewMetaTxt: { fontSize: 12, fontWeight: '700', color: C.textMed },

  errorRow: { paddingHorizontal: 16, paddingBottom: 4 },
  errorTxt: { fontSize: 12, color: C.red, fontWeight: '700' },
});
