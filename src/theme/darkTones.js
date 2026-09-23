// ─── Dark-mode tone helpers ─────────────────────────────────────────────────
// Several customer screens contain hard-coded *light-mode* colours: pastel
// category tiles (#EFF6FF), tinted chips (#FEF3C7), dark status text (#92400E)
// and so on. Those look glaring (or become unreadable) on a dark background.
//
// These helpers turn such a colour into a calm dark-theme equivalent that keeps
// the same hue. Every function returns its input untouched when `isDark` is
// false, so the light theme is never affected.
//
//   dkBg(hex, isDark)      pastel fill   ->  deep, low-saturation tint
//   dkBorder(hex, isDark)  pastel border ->  subtle dark border
//   dkText(hex, isDark)    dark/saturated text or icon -> soft light tone
//   themeCfg(cfg, isDark)  applies the right helper to each key of a
//                          { bg, color, accent, border… } config object

// Same neutral ramp as the dark palettes in each screen (see darkColors in
// ThemeContext.js). Light ramp is the app's light-theme gray scale.
const LIGHT_RAMP = ["#F3F4F6", "#E5E7EB", "#D1D5DB", "#9CA3AF", "#6B7280", "#4B5563", "#374151", "#1F2937", "#111827"];
const DARK_RAMP  = ["#1F2329", "#2E343C", "#3D434C", "#6A727E", "#8A929E", "#A4ABB6", "#BFC5CE", "#D3D8DF", "#ECEFF3"];

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const hexToRgb = (hex) => {
  if (typeof hex !== "string") return null;
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const toHex = ([r, g, b]) =>
  "#" + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase();

const luminance = ([r, g, b]) => {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const chromaOf = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;

const rgbToHue = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

const rgbToSat = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  const l = (max + min) / 2;
  return d / (1 - Math.abs(2 * l - 1));
};

const hslToRgb = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

// Neutral colour -> the dark-ramp step whose light counterpart is closest in
// luminance. Mirrors how the palettes invert gray100…gray900 in dark mode.
const mapNeutral = (rgb) => {
  const L = luminance(rgb);
  let best = 0, bestDiff = Infinity;
  LIGHT_RAMP.forEach((h, i) => {
    const d = Math.abs(luminance(hexToRgb(h)) - L);
    if (d < bestDiff) { bestDiff = d; best = i; }
  });
  return DARK_RAMP[best];
};

// Pastel fill (light tint) -> deep, low-saturation tint of the same hue.
export const dkBg = (hex, isDark) => {
  if (!isDark) return hex;
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  if (luminance(rgb) < 0.75) return hex; // already a solid / dark fill
  if (chromaOf(rgb) < 0.035) return DARK_RAMP[0]; // near-white neutral -> subtle surface
  return toHex(hslToRgb(rgbToHue(rgb), 0.24, 0.13));
};

// Light border -> subtle dark border.
export const dkBorder = (hex, isDark) => {
  if (!isDark) return hex;
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  if (luminance(rgb) < 0.55) return hex;
  if (chromaOf(rgb) < 0.035) return DARK_RAMP[1];
  return toHex(hslToRgb(rgbToHue(rgb), 0.2, 0.24));
};

// Dark / saturated text or icon colour -> soft, readable tone on dark surfaces.
export const dkText = (hex, isDark) => {
  if (!isDark) return hex;
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  if (luminance(rgb) >= 0.34) return hex; // already light enough (also keeps white)
  if (chromaOf(rgb) < 0.2) return mapNeutral(rgb);
  return toHex(hslToRgb(rgbToHue(rgb), clamp(rgbToSat(rgb) * 0.6, 0.46, 0.6), 0.67));
};

const BG_KEY = /^(bg|background|backgroundColor|.*Bg)$/;
const TEXT_KEY = /^(color|accent|fg|text|iconColor)$/;
const BORDER_KEY = /border/i;

const cache = new WeakMap();

// Returns a dark-mode copy of a config object such as
//   { label: "Fruits", bg: "#ECFDF5", accent: "#059669", icon: "eco" }
// Non-colour keys are copied as-is. Result is cached so identity is stable
// between renders (safe to use inside useMemo deps).
export const themeCfg = (cfg, isDark) => {
  if (!isDark || !cfg || typeof cfg !== "object") return cfg;
  const hit = cache.get(cfg);
  if (hit) return hit;
  const out = {};
  Object.keys(cfg).forEach((k) => {
    const v = cfg[k];
    if (typeof v !== "string" || v[0] !== "#") out[k] = v;
    else if (BG_KEY.test(k)) out[k] = dkBg(v, true);
    else if (BORDER_KEY.test(k)) out[k] = dkBorder(v, true);
    else if (TEXT_KEY.test(k)) out[k] = dkText(v, true);
    else out[k] = v;
  });
  cache.set(cfg, out);
  return out;
};
