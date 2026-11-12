import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import useAuthStore from "../../store/authStore";
import { uploadAPI } from "../../services/api";
import { T, UNITS } from "../common/tokens";
import SelectChip from "../common/SelectChip";
import Spinner from "../common/Spinner";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY   = "#147538";
const PRIMARY_L = "#E8F5EC";
const PRIMARY_D = "#0E5229";
const BORDER    = "#E4E4E7";
const BG        = "#FAFAFA";
const TEXT      = "#18181B";
const TEXT_MED  = "#52525B";
const TEXT_LITE = "#A1A1AA";
const RED       = "#EF4444";
const RED_L     = "#FEF2F2";
const ORANGE    = "#F97316";

const TYPE_OPTS = [
  { label: "Packed", value: "packed", icon: "archive" },
  { label: "Loose",  value: "loose",  icon: "sliders" },
];

const WEIGHT_PRESETS = [
  { w: 50,  u: "g"  },
  { w: 100, u: "g"  },
  { w: 250, u: "g"  },
  { w: 500, u: "g"  },
  { w: 1,   u: "kg" },
];

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Input sanitizers & validators ────────────────────────────────────────────
// Letters (Latin + Hindi + Telugu), spaces and  . ' & -  only. No digits/symbols.
const LETTER = "A-Za-z\\u00C0-\\u024F\\u0900-\\u097F\\u0C00-\\u0C7F";
const NAME_STRIP  = new RegExp(`[^${LETTER} .'&-]`, "g");
const TEXT_STRIP  = new RegExp(`[^${LETTER}0-9\\s.,'&()\\-/%!:;]`, "g");
const HAS_2_LETTERS = new RegExp(`[${LETTER}]{2}`);

const sanitizeName = (v, max = 60) =>
  v.replace(NAME_STRIP, "").replace(/\s{2,}/g, " ").replace(/^[\s.'&-]+/, "").slice(0, max);
const sanitizeText = (v, max = 300) =>
  v.replace(TEXT_STRIP, "").replace(/[ \t]{2,}/g, " ").slice(0, max);
const sanitizeMoney = (v) => {
  const cleaned = v.replace(/[^0-9.]/g, "");
  const [int = "", ...rest] = cleaned.split(".");
  let out = int.replace(/^0+(?=\d)/, "").slice(0, 7);
  if (rest.length) out = (out || "0") + "." + rest.join("").slice(0, 2);
  return out;
};
const sanitizeDigits = (v, max) => v.replace(/\D/g, "").slice(0, max);
const sanitizeWeight = (v) => {
  const cleaned = v.replace(/[^0-9.]/g, "");
  const [int = "", ...rest] = cleaned.split(".");
  let out = int.replace(/^0+(?=\d)/, "").slice(0, 5);
  if (rest.length) out = (out || "0") + "." + rest.join("").slice(0, 2);
  return out;
};


// Last-resort list (same as vendor onboarding) if no category source responds.
const FALLBACK_CATEGORIES = [
  "Dairy, Bread & Eggs", "Fruits & Vegetables", "Snacks & Munchies", "Beverages",
  "Bakery & Biscuits", "Atta, Rice & Dal", "Masala, Oil & More",
  "Cleaning Essentials", "Personal Care", "Other",
].map((name, i) => ({ id: -(i + 1), name, parent_id: null }));

// Accepts a flat list or a nested tree (children / subcategories) → flat list.
const flattenCats = (list, parentId = null, out = []) => {
  (list || []).forEach((c) => {
    out.push({ ...c, parent_id: c.parent_id ?? parentId });
    const kids = c.children || c.subcategories;
    if (kids?.length) flattenCats(kids, c.id, out);
  });
  return out;
};

function validateForm(f, hasCategory) {
  const e = {};
  const name = f.name.trim();
  if (!name) e.name = "Product name is required.";
  else if (name.length < 2 || !HAS_2_LETTERS.test(name)) e.name = "Enter a valid product name (letters only, min 2).";

  const brand = f.brand.trim();
  if (brand && !HAS_2_LETTERS.test(brand)) e.brand = "Enter a valid brand name (letters only).";

  if (f.description.trim().length > 300) e.description = "Max 300 characters.";

  const price = parseFloat(f.price);
  if (!f.price.trim()) e.price = "Selling price is required.";
  else if (!(price > 0)) e.price = "Price must be greater than 0.";
  else if (price > 1000000) e.price = "Price is too high.";

  if (f.mrp.trim()) {
    const mrp = parseFloat(f.mrp);
    if (!(mrp > 0)) e.mrp = "MRP must be greater than 0.";
    else if (price > 0 && mrp < price) e.mrp = "MRP can't be less than selling price.";
  }

  if (f.barcode.trim() && !/^\d{8,14}$/.test(f.barcode.trim()))
    e.barcode = "Barcode must be 8–14 digits.";

  if (f.image_url.trim() && !/^https?:\/\/\S+\.\S+$/i.test(f.image_url.trim()))
    e.image_url = "Enter a valid http(s) image URL.";

  if (!hasCategory) e.category = "Please select a category.";

  if (f.type === "loose") {
    if (f.weight_options.length === 0) e.weights = "Loose items need at least one weight option.";
    else if (f.weight_options.some((o) => !(parseFloat(o.weight) > 0)))
      e.weights = "Every weight must be a number greater than 0.";
  }
  return e;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ total, current }) {
  return (
    <View style={dot.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dot.dot,
            i === current && dot.dotActive,
            i < current && dot.dotDone,
          ]}
        />
      ))}
    </View>
  );
}
const dot = StyleSheet.create({
  row:       { flexDirection: "row", gap: 5, alignItems: "center" },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: BORDER },
  dotActive: { width: 18, backgroundColor: PRIMARY },
  dotDone:   { backgroundColor: PRIMARY + "60" },
});

// ─── Section label ────────────────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <Text style={lbl.text}>
      {children}
      {required && <Text style={lbl.req}> *</Text>}
    </Text>
  );
}
const lbl = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_LITE,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  req: { color: RED },
});

// ─── Styled TextInput ─────────────────────────────────────────────────────────

function Field({ label, required, style, inputStyle, error, onBlur, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      {label && <Label required={required}>{label}</Label>}
      <TextInput
        placeholderTextColor={TEXT_LITE}
        {...props}
        style={[
          fi.input,
          focused && fi.focused,
          !!error && fi.errored,
          inputStyle,
        ]}
        onFocus={() => setFocused(true)}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      />
      {!!error && <Text style={fi.errText}>{error}</Text>}
    </View>
  );
}
const fi = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: TEXT,
    backgroundColor: "#fff",
    ...(Platform.OS === "web" ? { outlineWidth: 0, outlineStyle: "none" } : {}),
  },
  errored: { borderColor: RED, backgroundColor: RED_L },
  errText: { fontSize: 11, fontWeight: "600", color: RED, marginTop: 5 },
  focused: {
    borderColor: PRIMARY,
    backgroundColor: "#fff",
    shadowColor: PRIMARY,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});

// ─── Type Card ────────────────────────────────────────────────────────────────

function TypeCard({ option, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[tc.card, active && tc.cardActive]}
    >
      <Feather name={option.icon} size={16} color={active ? PRIMARY_D : TEXT_MED} />
      <Text style={[tc.label, active && tc.labelActive]}>{option.label}</Text>
      {active && <View style={tc.check}><Feather name="check" size={10} color="#fff" /></View>}
    </TouchableOpacity>
  );
}
const tc = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#fff",
  },
  cardActive: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_L,
  },
  icon:  { fontSize: 18 },
  label: { fontSize: 14, fontWeight: "600", color: TEXT_MED, flex: 1 },
  labelActive: { color: PRIMARY_D, fontWeight: "700" },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});

// ─── Image Uploader ───────────────────────────────────────────────────────────

function ImageUploader({ imageUrl, uploading, onUpload, onRemove, onUrlInput }) {
  if (imageUrl) {
    return (
      <View style={img.previewWrap}>
        <Image source={{ uri: imageUrl }} style={img.preview} resizeMode="cover" />
        <View style={img.previewMeta}>
          <Text style={img.previewLabel}>Product Image</Text>
          <Text style={img.previewSub} numberOfLines={1}>{imageUrl.split("/").pop()}</Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={img.removeBtn}>
          <Text style={img.removeBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={img.dropzone}>
      {uploading ? (
        <View style={img.uploadingWrap}>
          <ActivityIndicator color={PRIMARY} size="small" />
          <Text style={img.uploadingText}>Uploading…</Text>
        </View>
      ) : (
        <>
          <Feather name="image" size={32} color={TEXT_LITE} style={{ marginBottom: 6 }} />
          <Text style={img.dropzoneTitle}>Add Product Image</Text>
          <Text style={img.dropzoneSub}>Optional but recommended</Text>
          <View style={img.btnRow}>
            <TouchableOpacity onPress={onUpload} style={[img.uploadBtn, { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]}>
              <Feather name="camera" size={13} color="#fff" />
              <Text style={img.uploadBtnText}>Upload Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onUrlInput} style={[img.urlBtn, { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]}>
              <Feather name="link" size={13} color={PRIMARY} />
              <Text style={img.urlBtnText}>Use URL</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
const img = StyleSheet.create({
  dropzone: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    backgroundColor: BG,
    gap: 6,
  },
  dropzoneIcon:  { fontSize: 28 },
  dropzoneTitle: { fontSize: 14, fontWeight: "700", color: TEXT },
  dropzoneSub:   { fontSize: 12, color: TEXT_LITE },
  btnRow:        { flexDirection: "row", gap: 10, marginTop: 6 },
  uploadBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  uploadBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  urlBtn: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "#fff",
  },
  urlBtnText: { fontSize: 13, fontWeight: "600", color: TEXT_MED },
  uploadingWrap: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  uploadingText: { fontSize: 13, color: TEXT_MED },
  previewWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: PRIMARY + "50",
    borderRadius: 14,
    padding: 10,
    backgroundColor: PRIMARY_L,
  },
  preview: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: BORDER,
  },
  previewMeta: { flex: 1 },
  previewLabel: { fontSize: 13, fontWeight: "700", color: PRIMARY_D },
  previewSub:   { fontSize: 11, color: TEXT_LITE, marginTop: 2 },
  removeBtn: {
    backgroundColor: RED_L,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeBtnText: { fontSize: 12, fontWeight: "700", color: RED },
});

// ─── Weight Options ───────────────────────────────────────────────────────────

function WeightOptions({ options, onChange }) {
  const add = (w, u) => {
    const exists = options.some((o) => String(o.weight) === String(w) && o.unit === u);
    if (!exists) onChange([...options, { weight: String(w), unit: u }]);
  };
  const remove = (idx) => onChange(options.filter((_, i) => i !== idx));
  const update = (idx, key, val) => {
    const next = [...options];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  };

  return (
    <View style={wo.wrap}>
      <View style={wo.header}>
        <Text style={wo.title}>Weight Options</Text>
        <Text style={wo.sub}>Customers choose when ordering</Text>
      </View>

      {/* Presets */}
      <View style={wo.presetsRow}>
        {WEIGHT_PRESETS.map((p, i) => {
          const active = options.some(
            (o) => String(o.weight) === String(p.w) && o.unit === p.u
          );
          return (
            <TouchableOpacity
              key={i}
              onPress={() => add(p.w, p.u)}
              style={[wo.preset, active && wo.presetActive]}
            >
              <Text style={[wo.presetText, active && wo.presetTextActive]}>
                {active ? "✓ " : "+ "}{p.w}{p.u}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Manual entries */}
      {options.map((opt, idx) => (
        <View key={idx} style={wo.row}>
          <TextInput
            style={[fi.input, { flex: 1, paddingVertical: 9 }]}
            value={String(opt.weight)}
            onChangeText={(v) => update(idx, "weight", sanitizeWeight(v))}
            placeholder="e.g. 250"
            placeholderTextColor={TEXT_LITE}
            keyboardType="numeric"
          />
          <View style={wo.unitRow}>
            {["g", "kg"].map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => update(idx, "unit", u)}
                style={[wo.unitBtn, opt.unit === u && wo.unitBtnActive]}
              >
                <Text style={[wo.unitText, opt.unit === u && wo.unitTextActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={() => remove(idx)} style={wo.removeBtn}>
            <Text style={{ color: RED, fontWeight: "800", fontSize: 16 }}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        onPress={() => onChange([...options, { weight: "", unit: "g" }])}
        style={wo.addManual}
      >
        <Text style={wo.addManualText}>+ Custom Weight</Text>
      </TouchableOpacity>

      {options.length === 0 && (
        <Text style={wo.hint}>Select presets or add custom weights above.</Text>
      )}
    </View>
  );
}
const wo = StyleSheet.create({
  wrap: {
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 14,
    gap: 10,
  },
  header:   { gap: 2 },
  title:    { fontSize: 13, fontWeight: "700", color: TEXT },
  sub:      { fontSize: 11, color: TEXT_LITE },
  presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  preset: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#fff",
  },
  presetActive: { borderColor: PRIMARY, backgroundColor: PRIMARY_L },
  presetText:   { fontSize: 12, fontWeight: "600", color: TEXT_MED },
  presetTextActive: { color: PRIMARY_D },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  unitRow: { flexDirection: "row", gap: 4 },
  unitBtn: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  unitBtnActive: { borderColor: PRIMARY, backgroundColor: PRIMARY_L },
  unitText:      { fontSize: 13, fontWeight: "600", color: TEXT_MED },
  unitTextActive: { color: PRIMARY_D },
  removeBtn: { padding: 6 },
  addManual: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: PRIMARY + "60",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: PRIMARY_L,
  },
  addManualText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  hint: { fontSize: 11, color: TEXT_LITE, fontStyle: "italic", textAlign: "center", paddingVertical: 4 },
});

// ─── Category Picker (Category ▾ then Subcategory ▾, same as vendor onboarding) ─

function DropdownList({ loading, items, selectedId, onPick, emptyText }) {
  return (
    <View style={cp.dropdownList}>
      {loading ? (
        <ActivityIndicator size="small" color={PRIMARY} style={{ margin: 12 }} />
      ) : items.length === 0 ? (
        <View style={cp.noSub}><Text style={cp.noSubText}>{emptyText}</Text></View>
      ) : (
        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {items.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[cp.dropdownItem, selectedId === c.id && cp.dropdownItemActive]}
              onPress={() => onPick(c)}
            >
              <Text style={[cp.dropdownItemText, selectedId === c.id && cp.dropdownItemTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function CategoryPicker({
  tops, subs, topCat, subCat, catLoading, subLoading, onPickTop, onPickSub, error,
}) {
  const [open, setOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  return (
    <View style={cp.wrap}>
      <Label required>Category</Label>
      <TouchableOpacity
        style={[cp.dropdownBox, !!error && { borderColor: RED }]}
        onPress={() => { setOpen(!open); setSubOpen(false); }}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="folder" size={15} color={PRIMARY} />
          <Text style={[cp.dropdownValue, !topCat && { color: TEXT_LITE }]} numberOfLines={1}>
            {topCat ? topCat.name : "Select Category..."}
          </Text>
        </View>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={TEXT_MED} />
      </TouchableOpacity>
      {open && (
        <DropdownList
          loading={catLoading}
          items={tops}
          selectedId={topCat?.id}
          emptyText="No categories available."
          onPick={(c) => { setOpen(false); onPickTop(c); }}
        />
      )}

      {!!topCat && (
        <View style={{ marginTop: 6, gap: 6 }}>
          <Label>Subcategory</Label>
          <TouchableOpacity
            style={cp.dropdownBox}
            onPress={() => { setSubOpen(!subOpen); setOpen(false); }}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name="corner-down-right" size={15} color={PRIMARY} />
              <Text style={[cp.dropdownValue, !subCat && { color: TEXT_LITE }]} numberOfLines={1}>
                {subCat ? subCat.name : "Select Subcategory..."}
              </Text>
            </View>
            <Feather name={subOpen ? "chevron-up" : "chevron-down"} size={16} color={TEXT_MED} />
          </TouchableOpacity>
          {subOpen && (
            <DropdownList
              loading={subLoading}
              items={subs}
              selectedId={subCat?.id}
              emptyText="No subcategories for this category."
              onPick={(c) => { setSubOpen(false); onPickSub(c); }}
            />
          )}
        </View>
      )}

      {!!error && <Text style={fi.errText}>{error}</Text>}

      {topCat ? (
        <View style={[cp.breadcrumb, { flexDirection: "row", alignItems: "center", gap: 5 }]}>
          <Feather name="folder" size={13} color={PRIMARY_D} />
          <Text style={cp.breadcrumbText}>
            {subCat ? `${topCat.name} › ${subCat.name}` : topCat.name}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
const cp = StyleSheet.create({
  wrap:      { gap: 6 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  loadingText: { fontSize: 12, color: TEXT_MED },
  subSection: { marginTop: 4, gap: 6 },
  subLabel:   { fontSize: 11, fontWeight: "700", color: TEXT_LITE, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  dropdownBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  dropdownValue: { fontSize: 14, color: TEXT, fontWeight: "500" },
  dropdownList: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginTop: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F5",
  },
  dropdownItemActive: { backgroundColor: PRIMARY_L },
  dropdownItemText: { fontSize: 13, color: TEXT_MED },
  dropdownItemTextActive: { color: PRIMARY_D, fontWeight: "700" },
  noSub: {
    padding: 14,
    backgroundColor: BG,
  },
  noSubText: { fontSize: 12, color: TEXT_LITE },
  breadcrumb: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  breadcrumbText: { fontSize: 12, fontWeight: "700", color: "#166534" },
});

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ProductModal({ editing, onClose, onSave, saving, categories }) {
  const init = editing
    ? {
        name:           editing.name,
        description:    editing.description  || "",
        categoryName: typeof editing.category === "object" 
  ? (editing.category?.name || "") 
  : (editing.category || ""),
        subcategoryId:  editing.category_id  || null,
        subcategoryName: editing.subcategory || "",
        barcode:        editing.barcode      || "",
        brand:          editing.brand        || "",
        price:          String(editing.price    || 0),
        mrp:            String(editing.mrp     || ""),
        selling_price:  String(editing.selling_price || ""),
        unit:           editing.unit  || "kg",
        type:           editing.type  || "packed",
        weight_options: editing.weight_options || [],
        image_url:      editing.image_url || "",
      }
    : {
        name: "", description: "", categoryName: "", subcategoryId: null,
        subcategoryName: "", barcode: "", brand: "", unit: "kg",
        price: "", mrp: "", selling_price: "",
        type: "packed", weight_options: [], image_url: "",
      };

  const { token } = useAuthStore();
  const [form, setForm]         = useState(init);
  const [err, setErr]           = useState("");
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(false);

  const [tops, setTops]                 = useState([]);
  const [subs, setSubs]                 = useState([]);
  const [topCat, setTopCat]             = useState(null);
  const [subCat, setSubCat]             = useState(null);
  const [catLoading, setCatLoading]     = useState(false);
  const [subLoading, setSubLoading]     = useState(false);
  const [unitOpen, setUnitOpen]         = useState(false);
  const [touched, setTouched]           = useState({});
  const [showAll, setShowAll]           = useState(false);
  const allCatsRef = useRef([]);

  // Slide-up animation
  const slideAnim = useRef(new Animated.Value(80)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  // Subcategories: children from the loaded list first, then the dedicated
  // endpoint (same as vendor onboarding).
  const loadSubs = async (top) => {
    let list = allCatsRef.current.filter((c) => c.parent_id === top.id);
    if (!list.length && top.id > 0) {
      setSubLoading(true);
      try {
        const r = await fetch(`${BASE_URL}/products/subcategories/${top.id}`);
        const d = await r.json();
        list = d.data?.subcategories || d.subcategories || [];
      } catch (_) {}
      setSubLoading(false);
    }
    setSubs(list);
    return list;
  };

  const applyCategories = (all) => {
    allCatsRef.current = all;
    const roots = all.filter((c) => c.parent_id === null || c.parent_id === undefined);
    setTops(roots.length ? roots : all);

    // Editing: restore category (+ subcategory) selection
    const catName = typeof editing?.category === "object" ? editing.category?.name : editing?.category;
    const match = all.find((c) => c.id === editing?.category_id) ||
      (catName ? all.find((c) => c.name === catName) : null);
    if (match) {
      let root = match;
      while (root.parent_id != null) {
        const up = all.find((c) => c.id === root.parent_id);
        if (!up) break;
        root = up;
      }
      setTopCat(root);
      if (root.id !== match.id) setSubCat(match);
      loadSubs(root);
    }
  };

  useEffect(() => {
    // 1) Preferred: categories already loaded by the Inventory screen.
    if (categories && categories.length) {
      applyCategories(flattenCats(categories));
      return;
    }
    // 2) Otherwise fetch them; 3) fall back to the built-in list.
    let cancelled = false;
    setCatLoading(true);
    fetch(`${BASE_URL}/products/categories`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const raw = data.data?.flat || data.data?.categories || data.flat || data.categories || data.data || [];
        const all = flattenCats(Array.isArray(raw) ? raw : []);
        applyCategories(all.length ? all : FALLBACK_CATEGORIES);
      })
      .catch(() => { if (!cancelled) applyCategories(FALLBACK_CATEGORIES); })
      .finally(() => { if (!cancelled) setCatLoading(false); });
    return () => { cancelled = true; };
  }, [editing, categories]);

  const set = (k, v) => { setErr(""); setForm((f) => ({ ...f, [k]: v })); };
  const touch = (k) => setTouched((t) => ({ ...t, [k]: true }));

  const selectedCategory = subCat || topCat;
  const errors = validateForm(form, !!selectedCategory);
  const fe = (k) => (showAll || touched[k] ? errors[k] : undefined);

  const handlePickTop = (cat) => {
    setTopCat(cat);
    setSubCat(null);
    setSubs([]);
    set("categoryName", cat.name);
    set("subcategoryId", null);
    set("subcategoryName", "");
    loadSubs(cat);
  };

  const handlePickSub = (sub) => {
    setSubCat(sub);
    set("subcategoryId", sub.id);
    set("subcategoryName", sub.name);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        setUploading(true);
        const { url } = await uploadAPI.upload(
          result.assets[0].uri,
          result.assets[0].mimeType || "image/jpeg",
          token
        );
        set("image_url", url);
        setUrlInput(false);
      }
    } catch (e) {
      setErr("Image upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setShowAll(true);
    if (Object.keys(errors).length > 0) {
      setErr("Please fix the highlighted fields.");
      return;
    }
    const cleanedOptions = form.weight_options
      .filter((o) => o.weight && !isNaN(parseFloat(o.weight)))
      .map((o) => ({ weight: parseFloat(o.weight), unit: o.unit }));
    await onSave({
      ...form,
      name:            form.name.trim(),
      description:     form.description.trim(),
      barcode:         form.barcode.trim(),
      weight_options:  cleanedOptions,
      subcategory_id:  subCat?.id > 0 ? subCat.id : null,
      category_id:     selectedCategory?.id > 0 ? selectedCategory.id : null,
      category:        topCat?.name || form.categoryName || "Other",
      brand:           form.brand.trim()  || null,
      price:           parseFloat(form.price),
      mrp:             form.mrp ? parseFloat(form.mrp) : null,
      selling_price:   form.selling_price ? parseFloat(form.selling_price) : null,
    });
  };

  return (
    <Modal visible animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.kavWrap}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* ── Handle ── */}
          <View style={s.handle} />

          {/* ── Header ── */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.headerIconBox}>
                <Feather name={editing ? "edit-2" : "plus"} size={16} color={PRIMARY_D} />
              </View>
              <View>
                <Text style={s.title}>{editing ? "Edit Product" : "Add New Product"}</Text>
                <Text style={s.subtitle}>{editing ? "Update product details" : "Fill in the details below"}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Body ── */}
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Image */}
            <View style={s.section}>
              <ImageUploader
                imageUrl={form.image_url}
                uploading={uploading}
                onUpload={pickImage}
                onRemove={() => { set("image_url", ""); setUrlInput(false); }}
                onUrlInput={() => setUrlInput((v) => !v)}
              />
              {urlInput && !form.image_url && (
                <Field
                  style={{ marginTop: 10 }}
                  value={form.image_url}
                  onChangeText={(v) => set("image_url", v.replace(/\s/g, ""))}
                  onBlur={() => touch("image_url")}
                  error={fe("image_url")}
                  autoCapitalize="none"
                  keyboardType="url"
                  placeholder="Paste image URL…"
                />
              )}
            </View>

            <View style={s.divider} />

            {/* Name, Brand & Description */}
            <View style={s.section}>
              <Field
                label="Product Name"
                required
                value={form.name}
                onChangeText={(v) => set("name", sanitizeName(v))}
                onBlur={() => touch("name")}
                error={fe("name")}
                maxLength={60}
                placeholder="e.g. Amul Full Cream Milk"
              />
              <Field
                label="Brand"
                style={{ marginTop: 14 }}
                value={form.brand}
                onChangeText={(v) => set("brand", sanitizeName(v, 40))}
                onBlur={() => touch("brand")}
                error={fe("brand")}
                maxLength={40}
                placeholder="e.g. Amul, Nestle, Tata…"
              />
              <Field
                label="Description"
                style={{ marginTop: 14 }}
                inputStyle={{ minHeight: 72, textAlignVertical: "top" }}
                value={form.description}
                onChangeText={(v) => set("description", sanitizeText(v))}
                onBlur={() => touch("description")}
                error={fe("description")}
                maxLength={300}
                placeholder="Optional product details…"
                multiline
              />
            </View>

            <View style={s.divider} />

            {/* Category */}
            <View style={s.section}>
              <CategoryPicker
                tops={tops}
                subs={subs}
                topCat={topCat}
                subCat={subCat}
                catLoading={catLoading}
                subLoading={subLoading}
                onPickTop={handlePickTop}
                onPickSub={handlePickSub}
                error={showAll ? errors.category : undefined}
              />
            </View>

            <View style={s.divider} />

            {/* Unit */}
            <View style={s.section}>
              <Label>Unit</Label>
              <TouchableOpacity
                style={cp.dropdownBox}
                onPress={() => setUnitOpen(!unitOpen)}
                activeOpacity={0.8}
              >
                <Text style={cp.dropdownValue}>{form.unit || "Select Unit..."}</Text>
                <Feather name={unitOpen ? "chevron-up" : "chevron-down"} size={16} color={TEXT_MED} />
              </TouchableOpacity>

              {unitOpen && (
                <View style={cp.dropdownList}>
                  <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {UNITS.map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={[cp.dropdownItem, form.unit === u && cp.dropdownItemActive]}
                        onPress={() => {
                          set("unit", u);
                          setUnitOpen(false);
                        }}
                      >
                        <Text style={[cp.dropdownItemText, form.unit === u && cp.dropdownItemTextActive]}>
                          {u}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Type */}
            <View style={[s.section, { marginTop: 0 }]}>
              <Label>Product Type</Label>
              <View style={s.typeRow}>
                {TYPE_OPTS.map((opt) => (
                  <TypeCard
                    key={opt.value}
                    option={opt}
                    active={form.type === opt.value}
                    onPress={() => set("type", opt.value)}
                  />
                ))}
              </View>
            </View>

            {/* Weight Options */}
            {form.type === "loose" && (
              <View style={s.section}>
                <WeightOptions
                  options={form.weight_options}
                  onChange={(v) => set("weight_options", v)}
                />
                {!!(showAll && errors.weights) && <Text style={fi.errText}>{errors.weights}</Text>}
              </View>
            )}

            <View style={s.divider} />

            {/* Pricing */}
            <View style={s.section}>
              <View style={s.row}>
                <Field
                  label="Selling Price (₹)"
                  required
                  style={{ flex: 1 }}
                  value={form.price}
                  onChangeText={(v) => set("price", sanitizeMoney(v))}
                  onBlur={() => touch("price")}
                  error={fe("price")}
                  placeholder="e.g. 40"
                  keyboardType="decimal-pad"
                />
                <Field
                  label="MRP (₹)"
                  style={{ flex: 1 }}
                  value={form.mrp}
                  onChangeText={(v) => set("mrp", sanitizeMoney(v))}
                  onBlur={() => touch("mrp")}
                  error={fe("mrp")}
                  placeholder="e.g. 50"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Barcode */}
            <View style={[s.section, { marginTop: 0 }]}>
              <Field
                label="Barcode (Optional)"
                value={form.barcode}
                onChangeText={(v) => set("barcode", sanitizeDigits(v, 14))}
                onBlur={() => touch("barcode")}
                error={fe("barcode")}
                keyboardType="number-pad"
                maxLength={14}
                placeholder="Scan or enter barcode (8–14 digits)"
              />
            </View>

            {/* Error */}
            {!!err && (
              <View style={[s.errBox, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                <Feather name="alert-circle" size={14} color={RED} />
                <Text style={s.errText}>{err}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              style={[s.submitBtn, saving && s.submitBtnDisabled]}
              activeOpacity={0.85}
            >
              {saving ? (
                <Spinner size={18} color="#fff" />
              ) : (
                <Feather name={editing ? "save" : "plus"} size={16} color="#fff" />
              )}
              <Text style={s.submitBtnText}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Product"}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  kavWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F5",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: PRIMARY_L,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PRIMARY + "30",
  },
  title:    { fontSize: 17, fontWeight: "800", color: TEXT },
  subtitle: { fontSize: 12, color: TEXT_LITE, marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: TEXT_MED, fontWeight: "700", fontSize: 14 },

  scroll: { flex: 1 },
  body:   { paddingTop: 6, paddingBottom: 24 },

  section: { paddingHorizontal: 20, paddingVertical: 14, gap: 0 },
  divider: { height: 1, backgroundColor: "#F4F4F5", marginVertical: 2 },

  row: { flexDirection: "row", gap: 12 },

  chipRow: { flexDirection: "row", gap: 7 },
  chip: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  chipActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:       { fontSize: 13, fontWeight: "600", color: TEXT_MED },
  chipTextActive: { color: "#fff" },

  typeRow: { flexDirection: "row", gap: 10, marginTop: 4 },

  errBox: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: RED_L,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RED + "40",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errText: { fontSize: 13, color: RED, fontWeight: "600" },

  submitBtn: {
    marginHorizontal: 20,
    marginTop: 6,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnIcon:     { fontSize: 16, color: "#fff" },
  submitBtnText:     { fontSize: 15, fontWeight: "800", color: "#fff" },
});