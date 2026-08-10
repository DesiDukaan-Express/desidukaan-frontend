/**
 * LocationMapPicker — Native (no-op)
 * ──────────────────────────────────
 * The Leaflet + OpenStreetMap picker is a web-only feature (see
 * LocationMapPicker.web.js). On iOS/Android this component renders nothing so
 * the add/edit-address form falls back to the plain text input, and the
 * existing forward-geocode-on-save fallback provides coordinates.
 */
import React from "react";

export default function LocationMapPicker() {
  return null;
}
