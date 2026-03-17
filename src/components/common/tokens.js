/**
 * tokens.js — Shared Design Tokens
 * Primary brand: #0ff022 (neon green)
 * Synced with src/styles/colors.js
 */

// ── Brand ──────────────────────────────────────────────────────────────
export const T = {
  // Primary brand — neon green
  primary: "#0ff022",
  primaryDark: "#0ac91c",
  primaryLight: "rgba(15,240,34,0.15)",

  // Status colours
  green: "#0ff022",
  greenDark: "#0ac91c",
  greenLight: "rgba(15,240,34,0.15)",

  orange: "#F39C12",
  orangeLight: "#FFF3CD",

  red: "#E74C3C",
  redLight: "#FDECEA",

  blue: "#2E86AB",
  blueLight: "#CCE5FF",

  // Backgrounds & surfaces
  bg: "#F0F4F8",
  surface: "#FFFFFF",
  surfaceSecondary: "#F8FAFC",

  // Text
  text: "#1A202C",
  textMed: "#4A5568",
  textLight: "#718096",
  textXLight: "#A0AEC0",

  // Borders
  border: "#E2E8F0",
  borderDark: "#CBD5E0",
};

// ── Stock status config ─────────────────────────────────────────────────
export const STATUS_CFG = {
  "In Stock":     { color: "#0ff022", bg: "rgba(15,240,34,0.12)", icon: "✓" },
  "Low Stock":    { color: "#F39C12", bg: "#FFF3CD",              icon: "⚠" },
  "Out of Stock": { color: "#E74C3C", bg: "#FDECEA",              icon: "✗" },
};

// ── Dropdown/chip option lists ──────────────────────────────────────────
export const CATEGORIES = [
  "Vegetables","Fruits","Dairy","Grocery","Bakery",
  "Meat & Fish","Snacks","Beverages","Household","Medicines","Other",
];

export const STORES_OPTS = [
  "Main Store","Ameerpet Store","Begumpet Store","SR Nagar Store","KPHB Store",
];

export const STATUS_OPTS = ["In Stock", "Low Stock", "Out of Stock"];

export const UNITS = ["kg", "g", "litre", "ml", "piece", "pack", "dozen", "box"];
