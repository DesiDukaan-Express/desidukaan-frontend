/**
 * imageEditor.js
 *
 * Cross-platform image utilities built on the Canvas 2D API (web) and
 * expo-image-manipulator (native):
 *   • getImageSize        – natural pixel dimensions of an image
 *   • applyImageTransform – rotate (90° steps) + flip (H / V)
 *   • cropImage           – crop a pixel rectangle (optional circular mask)
 *   • compressImage       – downscale / re-encode before upload
 *   • getFileSize         – byte size of a local uri
 *
 * Web output is a JPEG/PNG data-URL; native output is a file uri.
 */

import { Platform } from 'react-native';
import { Image as RNImage } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export const IS_WEB = Platform.OS === 'web';

// ─── Web helpers ──────────────────────────────────────────────────────────────

function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.Image) {
      reject(new Error('Image decoding is not available on this platform'));
      return;
    }
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the selected image'));
    img.src = src;
  });
}

function canvasToDataUrl(canvas, mime = 'image/jpeg', quality = 0.85) {
  return canvas.toDataURL(mime, quality);
}

// Approximate byte size of a base64 data-URL
function dataUrlSize(dataUrl) {
  const idx = dataUrl.indexOf(',');
  if (idx === -1) return 0;
  return Math.round(((dataUrl.length - idx - 1) * 3) / 4);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read the natural dimensions of an image.
 * @param {string} uri local uri / blob url / data url
 * @returns {Promise<{width:number, height:number}>}
 */
export function getImageSize(uri) {
  return new Promise((resolve, reject) => {
    if (IS_WEB) {
      loadHtmlImage(uri)
        .then((img) => resolve({ width: img.naturalWidth, height: img.naturalHeight }))
        .catch(reject);
      return;
    }
    RNImage.getSize(uri, (w, h) => resolve({ width: w, height: h }), (err) =>
      reject(new Error(err?.message || 'Could not read image size'))
    );
  });
}

/**
 * Apply rotation (multiples of 90) then horizontal / vertical flips.
 * The result is a fully rendered image so downstream crops map 1:1.
 * @param {{uri:string, rotation?:number, flipH?:boolean, flipV?:boolean}} opts
 * @returns {Promise<{uri:string, width:number, height:number, sizeBytes:number}>}
 */
export async function applyImageTransform({ uri, rotation = 0, flipH = false, flipV = false }) {
  const r = ((Math.round(rotation) % 360) + 360) % 360;

  if (IS_WEB) {
    const img = await loadHtmlImage(uri);
    const swap = r % 180 !== 0;
    const outW = swap ? img.naturalHeight : img.naturalWidth;
    const outH = swap ? img.naturalWidth : img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((r * Math.PI) / 180);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
    const out = canvasToDataUrl(canvas, 'image/jpeg', 0.92);
    return { uri: out, width: outW, height: outH, sizeBytes: dataUrlSize(out) };
  }

  const actions = [];
  if (r) actions.push({ rotate: r });
  if (flipH) actions.push({ flip: ImageManipulator.FlipType.Horizontal });
  if (flipV) actions.push({ flip: ImageManipulator.FlipType.Vertical });
  const res = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.9,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: res.uri, width: res.width, height: res.height, sizeBytes: await getFileSize(res.uri) };
}

/**
 * Crop a pixel rectangle from an image.
 * @param {{uri:string, originX:number, originY:number, width:number, height:number, circular?:boolean}} opts
 * @returns {Promise<{uri:string, width:number, height:number, sizeBytes:number}>}
 */
export async function cropImage({ uri, originX, originY, width, height, circular = false }) {
  const crop = {
    originX: Math.max(0, Math.round(originX)),
    originY: Math.max(0, Math.round(originY)),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };

  if (IS_WEB) {
    const img = await loadHtmlImage(uri);
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (circular) {
      ctx.beginPath();
      ctx.arc(crop.width / 2, crop.height / 2, Math.min(crop.width, crop.height) / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }
    ctx.drawImage(img, crop.originX, crop.originY, crop.width, crop.height, 0, 0, crop.width, crop.height);
    const mime = circular ? 'image/png' : 'image/jpeg';
    const out = canvasToDataUrl(canvas, mime, circular ? 1 : 0.85);
    return { uri: out, width: crop.width, height: crop.height, sizeBytes: dataUrlSize(out) };
  }

  const res = await ImageManipulator.manipulateAsync(uri, [{ crop }], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: res.uri, width: res.width, height: res.height, sizeBytes: await getFileSize(res.uri) };
}

/**
 * Downscale an image so its longest edge is <= maxDim and re-encode it.
 * No-op (returns the same uri) if already smaller than maxDim on web.
 * @param {{uri:string, maxDim?:number, quality?:number}} opts
 * @returns {Promise<{uri:string, width:number, height:number, sizeBytes:number}>}
 */
export async function compressImage({ uri, maxDim = 1600, quality = 0.8 }) {
  if (IS_WEB) {
    const img = await loadHtmlImage(uri);
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (longest <= maxDim && quality >= 0.9) {
      return { uri, width: img.naturalWidth, height: img.naturalHeight, sizeBytes: await getFileSize(uri) };
    }
    const scale = Math.min(1, maxDim / longest);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvasToDataUrl(canvas, 'image/jpeg', quality);
    return { uri: out, width: w, height: h, sizeBytes: dataUrlSize(out) };
  }

  const size = await getImageSize(uri);
  const longest = Math.max(size.width, size.height);
  const scale = Math.min(1, maxDim / longest);
  if (scale >= 1 && quality >= 0.9) {
    return { uri, width: size.width, height: size.height, sizeBytes: await getFileSize(uri) };
  }
  const actions =
    scale < 1 ? [{ resize: { width: Math.max(1, Math.round(size.width * scale)) } }] : [];
  const res = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: res.uri, width: res.width, height: res.height, sizeBytes: await getFileSize(res.uri) };
}

/**
 * Read the byte size of a local file (blob url / data url on web, file uri on native).
 * @returns {Promise<number>}
 */
export async function getFileSize(uri) {
  try {
    if (IS_WEB) {
      if (uri.startsWith('data:')) return dataUrlSize(uri);
      const res = await fetch(uri);
      const blob = await res.blob();
      return blob.size;
    }
    // expo-file-system v19 (SDK 54) new File API
    const { File } = await import('expo-file-system');
    return (await new File(uri).size) || 0;
  } catch (err) {
    return 0;
  }
}

/**
 * Create a local object url for a File dropped on web.
 * @param {File} file
 * @returns {string}
 */
export function fileToObjectUrl(file) {
  if (IS_WEB && file && typeof URL !== 'undefined' && URL.createObjectURL) {
    return URL.createObjectURL(file);
  }
  return file?.uri || null;
}

/** Revoke an object url created by fileToObjectUrl (web only). */
export function revokeObjectUrl(uri) {
  if (IS_WEB && uri && uri.startsWith('blob:') && typeof URL !== 'undefined') {
    URL.revokeObjectURL(uri);
  }
}

/** Human friendly byte formatting, e.g. 1.2 MB */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}
