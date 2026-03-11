import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. MOCK DATA  (replace _mockProducts with API responses later)
// ─────────────────────────────────────────────────────────────────────────────

let _mockDB = [
  { id:"P10234", name:"Tomatoes",    category:"Vegetables", store:"Ameerpet Store",  stock:"45 kg",      price:"₹40/kg",     updatedAt:"Today",      status:"In Stock"                },
  { id:"P10235", name:"Bananas",     category:"Fruits",     store:"Begumpet Store",  stock:"8 dozen",    price:"₹60",        updatedAt:"Today",      status:"Low Stock",   storeCount:2 },
  { id:"P10236", name:"Milk",        category:"Dairy",      store:"SR Nagar Store",  stock:"0",          price:"₹55",        updatedAt:"Today",      status:"Out of Stock"             },
  { id:"P10237", name:"Atta",        category:"Grains",     store:"Ameerpet Store",  stock:"50 kg",      price:"₹280",       updatedAt:"Today",      status:"In Stock"                },
  { id:"P10238", name:"Spinach",     category:"Vegetables", store:"KPHB Store",      stock:"5 bundles",  price:"₹20/bundle", updatedAt:"Today",      status:"Low Stock",   storeCount:1 },
  { id:"P10239", name:"Onions",      category:"Vegetables", store:"Ameerpet Store",  stock:"80 kg",      price:"₹35/kg",     updatedAt:"Yesterday",  status:"In Stock"                },
  { id:"P10240", name:"Rice",        category:"Grains",     store:"SR Nagar Store",  stock:"120 kg",     price:"₹60/kg",     updatedAt:"Yesterday",  status:"In Stock"                },
  { id:"P10241", name:"Eggs",        category:"Dairy",      store:"Begumpet Store",  stock:"3 trays",    price:"₹90/tray",   updatedAt:"Today",      status:"Low Stock",   storeCount:3 },
  { id:"P10242", name:"Butter",      category:"Dairy",      store:"KPHB Store",      stock:"0",          price:"₹55/100g",   updatedAt:"2 days ago", status:"Out of Stock"             },
  { id:"P10243", name:"Potatoes",    category:"Vegetables", store:"Ameerpet Store",  stock:"200 kg",     price:"₹25/kg",     updatedAt:"Today",      status:"In Stock"                },
  { id:"P10244", name:"Carrots",     category:"Vegetables", store:"Begumpet Store",  stock:"30 kg",      price:"₹40/kg",     updatedAt:"Today",      status:"In Stock"                },
  { id:"P10245", name:"Paneer",      category:"Dairy",      store:"SR Nagar Store",  stock:"8 blocks",   price:"₹90/200g",   updatedAt:"Today",      status:"Low Stock",   storeCount:1 },
  { id:"P10246", name:"Dal",         category:"Grains",     store:"KPHB Store",      stock:"0",          price:"₹120/kg",    updatedAt:"3 days ago", status:"Out of Stock"             },
  { id:"P10247", name:"Coriander",   category:"Vegetables", store:"Ameerpet Store",  stock:"15 bundles", price:"₹10/bundle", updatedAt:"Today",      status:"In Stock"                },
  { id:"P10248", name:"Coconut Oil", category:"Oils",       store:"Begumpet Store",  stock:"0",          price:"₹180/L",     updatedAt:"1 day ago",  status:"Out of Stock"             },
];
let _nextId = 10249;

// ─────────────────────────────────────────────────────────────────────────────
// 2. SERVICE LAYER  ← only file you need to touch when backend is ready
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const inventoryService = {
  /**
   * GET /api/products?status=all&store=All+Stores&q=searchterm
   * Returns: { data: Product[], total: number }
   */
  async getProducts({ status = "all", store = "All Stores", q = "" } = {}) {
    await sleep(360);
    let data = [..._mockDB];
    if (status === "instock")    data = data.filter((p) => p.status === "In Stock");
    if (status === "lowstock")   data = data.filter((p) => p.status === "Low Stock");
    if (status === "outofstock") data = data.filter((p) => p.status === "Out of Stock");
    if (store !== "All Stores")  data = data.filter((p) => p.store === store);
    if (q.trim()) {
      const lq = q.toLowerCase();
      data = data.filter((p) =>
        p.name.toLowerCase().includes(lq) ||
        p.id.toLowerCase().includes(lq) ||
        p.category.toLowerCase().includes(lq)
      );
    }
    return { data, total: data.length };
  },

  /**
   * GET /api/products/stats
   * Returns: { totalProducts, availableStock, lowStockItems, outOfStockItems }
   */
  async getStats() {
    await sleep(180);
    const all = _mockDB;
    return {
      totalProducts:   all.length,
      availableStock:  all.filter((p) => p.status !== "Out of Stock").length,
      lowStockItems:   all.filter((p) => p.status === "Low Stock").length,
      outOfStockItems: all.filter((p) => p.status === "Out of Stock").length,
    };
  },

  /**
   * GET /api/stores
   * Returns: string[]
   */
  async getStores() {
    await sleep(140);
    return ["All Stores", ...[...new Set(_mockDB.map((p) => p.store))].sort()];
  },

  /**
   * POST /api/products
   * Body: { name, category, store, stock, price, status }
   * Returns: Product
   */
  async createProduct(payload) {
    await sleep(480);
    const product = { id: `P${_nextId++}`, ...payload, storeCount: 0, updatedAt: "Just now" };
    _mockDB.unshift(product);
    return product;
  },

  /**
   * PUT /api/products/:id
   * Body: partial Product fields
   * Returns: updated Product
   */
  async updateProduct(id, payload) {
    await sleep(420);
    const i = _mockDB.findIndex((p) => p.id === id);
    if (i === -1) throw new Error("Product not found");
    _mockDB[i] = { ..._mockDB[i], ...payload, updatedAt: "Just now" };
    return _mockDB[i];
  },

  /**
   * DELETE /api/products/:id
   * Returns: { success: true }
   */
  async deleteProduct(id) {
    await sleep(280);
    _mockDB = _mockDB.filter((p) => p.id !== id);
    return { success: true };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. CUSTOM HOOK  (all state + data logic lives here)
// ─────────────────────────────────────────────────────────────────────────────

function useInventory() {
  const [products,      setProducts]  = useState([]);
  const [stats,         setStats]     = useState(null);
  const [stores,        setStores]    = useState(["All Stores"]);
  const [statusFilter,  setStatus]    = useState("all");
  const [storeFilter,   setStoreF]    = useState("All Stores");
  const [search,        setSearch]    = useState("");
  const [loading,       setLoading]   = useState(true);
  const [saving,        setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data }, st, storeList] = await Promise.all([
        inventoryService.getProducts({ status: statusFilter, store: storeFilter, q: search }),
        inventoryService.getStats(),
        inventoryService.getStores(),
      ]);
      setProducts(data);
      setStats(st);
      setStores(storeList);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, storeFilter, search]);

  useEffect(() => { load(); }, [load]);

  const withSave = async (fn) => { setSaving(true); try { await fn(); await load(); } finally { setSaving(false); } };

  return {
    products, stats, stores, loading, saving,
    statusFilter, setStatus,
    storeFilter,  setStoreF,
    search,       setSearch,
    createProduct: (payload) => withSave(() => inventoryService.createProduct(payload)),
    updateProduct: (id, payload) => withSave(() => inventoryService.updateProduct(id, payload)),
    deleteProduct: (id) => withSave(() => inventoryService.deleteProduct(id)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  green:       "#1A5C1A",
  greenDark:   "#123D12",
  greenLight:  "#F0FDF4",
  greenMid:    "#BBF7D0",
  sidebar:     "#152B15",
  yellow:      "#F4D03F",
  bg:          "#F9FAFB",
  white:       "#FFFFFF",
  border:      "#E5E7EB",
  text:        "#111827",
  textMed:     "#374151",
  textLight:   "#6B7280",
  textXLight:  "#9CA3AF",
  orange:      "#EA580C",
  red:         "#DC2626",
  redLight:    "#FEF2F2",
  redBorder:   "#FECACA",
};

const STATUS_CFG = {
  "In Stock":     { bg:"#ECFDF3", color:"#166534", border:"#BBF7D0" },
  "Low Stock":    { bg:"#FFFBEB", color:"#92400E", border:"#FDE68A" },
  "Out of Stock": { bg:T.redLight, color:T.red,    border:T.redBorder },
};

const CATEGORIES  = ["Vegetables","Fruits","Dairy","Grains","Oils","Beverages","Snacks","Other"];
const STORES_OPTS = ["Ameerpet Store","Begumpet Store","SR Nagar Store","KPHB Store"];
const STATUS_OPTS = ["In Stock","Low Stock","Out of Stock"];

// ─────────────────────────────────────────────────────────────────────────────
// 5. ATOMS
// ─────────────────────────────────────────────────────────────────────────────

function Spinner({ size = 20, color = T.green }) {
  return (
    <span style={{
      display:"inline-block", width:size, height:size,
      border:`2.5px solid ${color}22`, borderTopColor:color,
      borderRadius:"50%", animation:"iv-spin .65s linear infinite", flexShrink:0,
    }}/>
  );
}

function CheckBox({ checked, onChange, indeterminate }) {
  return (
    <div onClick={onChange} style={{
      width:18, height:18, borderRadius:5, flexShrink:0,
      border:`2px solid ${checked || indeterminate ? T.green : T.border}`,
      background: checked ? T.green : "#fff",
      display:"flex", alignItems:"center", justifyContent:"center",
      cursor:"pointer", transition:"all .15s",
    }}>
      {checked     && <span style={{color:"#fff",fontSize:10,fontWeight:900,lineHeight:1}}>✓</span>}
      {indeterminate && !checked && <span style={{color:"#fff",fontSize:10,fontWeight:900,lineHeight:1,color:T.green}}>—</span>}
    </div>
  );
}

function StatusPill({ status, storeCount }) {
  const c = STATUS_CFG[status] || { bg:"#f3f4f6", color:"#555", border:"#e5e7eb" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
      <span style={{
        display:"inline-flex", alignItems:"center", gap:5,
        background:c.bg, color:c.color,
        border:`1.5px solid ${c.border}`,
        borderRadius:8, padding:"4px 10px",
        fontSize:12, fontWeight:700, whiteSpace:"nowrap",
      }}>
        <span style={{ width:6, height:6, borderRadius:"50%", background:c.color, flexShrink:0 }}/>
        {status}
      </span>
      {status === "Low Stock" && storeCount > 0 && (
        <span style={{
          background:T.orange, color:"#fff",
          borderRadius:20, padding:"1px 7px",
          fontSize:11, fontWeight:800,
        }}>+{storeCount}</span>
      )}
    </span>
  );
}

function SelectChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      border: `1.5px solid ${active ? T.green : T.border}`,
      borderRadius:20, padding:"6px 14px",
      fontSize:12, fontWeight:600, cursor:"pointer",
      background: active ? T.green : "#fff",
      color: active ? "#fff" : T.textLight,
      transition:"all .15s",
    }} className="sel-chip">{label}</button>
  );
}

function ToastBanner({ message, visible }) {
  return (
    <div style={{
      position:"fixed", bottom:28, left:"50%",
      transform:`translateX(-50%) translateY(${visible?0:14}px)`,
      opacity: visible ? 1 : 0,
      transition:"all .28s cubic-bezier(.4,0,.2,1)",
      background:"#111827", color:"#fff",
      borderRadius:12, padding:"11px 20px",
      fontSize:13, fontWeight:600,
      display:"flex", alignItems:"center", gap:8,
      boxShadow:"0 8px 24px rgba(0,0,0,.25)",
      pointerEvents:"none", zIndex:9999, whiteSpace:"nowrap",
    }}>
      <span style={{color:"#4ADE80",fontSize:15}}>✓</span>{message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. STAT CARD  — SVG icons, colored icon backgrounds, accent bar
// ─────────────────────────────────────────────────────────────────────────────

// Inline SVG icons — crisp at any size, no emoji rendering inconsistency
const ICONS = {
  box: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  layers: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  alertTriangle: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  xCircle: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
};

function StatCard({ icon, label, value, sub, badge, badgeColor, accentColor, iconBg }) {
  return (
    <div style={{
      background:"#fff", borderRadius:16,
      padding:"20px 22px", flex:1, minWidth:0,
      display:"flex", alignItems:"center", gap:16,
      border:`1px solid ${T.border}`,
      borderLeft:`4px solid ${accentColor}`,
      boxShadow:"0 1px 6px rgba(0,0,0,.06)",
      transition:"all .2s",
      position:"relative", overflow:"hidden",
    }} className="stat-card">
      {/* subtle background tint */}
      <div style={{
        position:"absolute", top:-20, right:-20,
        width:90, height:90, borderRadius:"50%",
        background: accentColor,
        opacity:.04,
        pointerEvents:"none",
      }}/>

      {/* Icon box */}
      <div style={{
        width:50, height:50, borderRadius:14, flexShrink:0,
        background: iconBg,
        display:"flex", alignItems:"center", justifyContent:"center",
        color: accentColor,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
          <span style={{ fontSize:13, color:T.textLight, fontWeight:500, whiteSpace:"nowrap" }}>{label}</span>
          {badge != null && badge > 0 && (
            <span style={{
              background:badgeColor, color:"#fff",
              borderRadius:20, padding:"2px 8px",
              fontSize:11, fontWeight:800, flexShrink:0,
            }}>{badge}</span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
          <span style={{ fontSize:30, fontWeight:900, color:T.text, lineHeight:1, letterSpacing:"-1px" }}>{value ?? "—"}</span>
          {sub && <span style={{ fontSize:13, color:T.textXLight, fontWeight:500 }}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ADD / EDIT MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ProductModal({ editing, onClose, onSave, saving }) {
  const init = editing
    ? { name:editing.name, category:editing.category, store:editing.store, stock:editing.stock, price:editing.price, status:editing.status }
    : { name:"", category:"Vegetables", store:"Ameerpet Store", stock:"", price:"", status:"In Stock" };
  const [form, setForm] = useState(init);
  const [err,  setErr]  = useState("");
  const set = (k, v) => { setErr(""); setForm((f) => ({ ...f, [k]:v })); };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.stock.trim() || !form.price.trim()) {
      setErr("Name, Stock and Price are required."); return;
    }
    await onSave(form);
  };

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.42)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:"#fff", borderRadius:20, width:"100%", maxWidth:520,
        maxHeight:"92vh", overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:"0 24px 64px rgba(0,0,0,.22)", animation:"iv-up .22s ease",
      }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"22px 26px 18px", borderBottom:`1px solid ${T.border}` }}>
          <span style={{ fontSize:18, fontWeight:800, color:T.text }}>{editing ? "Edit Product" : "Add New Product"}</span>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", border:"none", background:"#F3F4F6", cursor:"pointer", color:T.textLight, fontWeight:700, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY:"auto", padding:"22px 26px 28px", display:"flex", flexDirection:"column", gap:20 }}>
          
          <div>
            <label style={LBL}>Product Name *</label>
            <input style={INP} value={form.name} onChange={(e)=>set("name",e.target.value)} placeholder="e.g. Tomatoes" />
          </div>

          <div>
            <label style={LBL}>Category</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginTop:4 }}>
              {CATEGORIES.map((c) => <SelectChip key={c} label={c} active={form.category===c} onClick={()=>set("category",c)} />)}
            </div>
          </div>

          <div>
            <label style={LBL}>Store</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginTop:4 }}>
              {STORES_OPTS.map((s) => <SelectChip key={s} label={s} active={form.store===s} onClick={()=>set("store",s)} />)}
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <label style={LBL}>Stock *</label>
              <input style={INP} value={form.stock} onChange={(e)=>set("stock",e.target.value)} placeholder="e.g. 45 kg" />
            </div>
            <div>
              <label style={LBL}>Price *</label>
              <input style={INP} value={form.price} onChange={(e)=>set("price",e.target.value)} placeholder="e.g. ₹40/kg" />
            </div>
          </div>

          <div>
            <label style={LBL}>Status</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:4 }}>
              {STATUS_OPTS.map((s) => <SelectChip key={s} label={s} active={form.status===s} onClick={()=>set("status",s)} />)}
            </div>
          </div>

          {err && <span style={{ fontSize:12, color:T.red, fontWeight:600 }}>{err}</span>}

          <button
            onClick={handleSubmit} disabled={saving}
            style={{
              background:T.green, color:"#fff", border:"none", borderRadius:12,
              padding:"13px 0", fontSize:14, fontWeight:800,
              cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              boxShadow:"0 4px 14px rgba(22,101,52,.3)", transition:"all .15s",
            }} className="btn-primary"
          >
            {saving && <Spinner size={16} color="#fff"/>}
            {saving ? "Saving…" : editing ? "Save Changes" : "+ Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

const LBL = { display:"block", fontSize:11, fontWeight:700, color:T.textXLight, textTransform:"uppercase", letterSpacing:".5px", marginBottom:6 };
const INP = { width:"100%", border:`1.5px solid ${T.border}`, borderRadius:10, padding:"10px 12px", fontSize:14, color:T.text, outline:"none", fontFamily:"inherit", boxSizing:"border-box", background:"#FAFAFA", transition:"border-color .15s" };

// ─────────────────────────────────────────────────────────────────────────────
// 8. TABLE ROW
// ─────────────────────────────────────────────────────────────────────────────

function ProductRow({ product, selected, onSelect, onEdit, onDelete, isEven }) {
  const [menuOpen, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <tr style={{
      background: selected ? "#F0FDF4" : isEven ? "#fff" : "#FAFAFA",
      borderBottom:`1px solid #F3F4F6`, transition:"background .12s",
    }} className="inv-row">
      <td style={TD}><CheckBox checked={selected} onChange={()=>onSelect(product.id)}/></td>
      <td style={TD}><span style={{ color:"#15803D", fontWeight:700, fontSize:13 }}>{product.id}</span></td>
      <td style={TD}><span style={{ fontWeight:700, color:T.text, fontSize:13 }}>{product.name}</span></td>
      <td style={TD}><span style={{ color:T.textLight, fontSize:13 }}>{product.category}</span></td>
      <td style={TD}><span style={{ color:T.textMed, fontSize:13 }}>{product.store}</span></td>
      <td style={TD}><span style={{ color:T.textMed, fontSize:13, fontWeight:600 }}>{product.stock}</span></td>
      <td style={TD}><span style={{ color:T.textMed, fontSize:13 }}>{product.price}</span></td>
      <td style={TD}><span style={{ color:T.textXLight, fontSize:12 }}>{product.updatedAt}</span></td>
      <td style={TD}><StatusPill status={product.status} storeCount={product.storeCount||0}/></td>
      <td style={TD}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <button
            onClick={()=>onEdit(product)}
            style={{ display:"flex", alignItems:"center", gap:5, background:T.green, color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", transition:"all .15s" }}
            className="btn-edit"
          >✎ Edit</button>

          <div ref={menuRef} style={{ position:"relative" }}>
            <button
              onClick={()=>setMenu((v)=>!v)}
              style={{ width:32, height:32, borderRadius:8, border:`1.5px solid ${T.border}`, background:"#fff", cursor:"pointer", fontSize:16, color:T.textXLight, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", letterSpacing:2 }}
              className="btn-dots"
            >⋯</button>

            {menuOpen && (
              <div style={{
                position:"absolute", right:0, top:36, zIndex:50,
                background:"#fff", borderRadius:12, border:`1px solid ${T.border}`,
                boxShadow:"0 10px 28px rgba(0,0,0,.13)", minWidth:155, overflow:"hidden",
              }}>
                {[
                  { label:"✏️  Edit product", color:T.textMed,  fn:()=>{ setMenu(false); onEdit(product); } },
                  { label:"🗑  Delete",        color:T.red,      fn:()=>{ setMenu(false); onDelete(product.id); } },
                ].map((item) => (
                  <div key={item.label} onClick={item.fn}
                    style={{ padding:"11px 16px", fontSize:13, color:item.color, cursor:"pointer", fontWeight:600, borderBottom:`1px solid #F9FAFB`, transition:"background .1s" }}
                    className="menu-item"
                  >{item.label}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

const TD = { padding:"14px 14px", verticalAlign:"middle" };
const TH = { padding:"12px 14px", fontSize:11, fontWeight:800, color:T.textXLight, textTransform:"uppercase", letterSpacing:".5px", textAlign:"left", whiteSpace:"nowrap" };

// ─────────────────────────────────────────────────────────────────────────────
// 9. MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const inv         = useInventory();
  const [selected,  setSelected]  = useState(new Set());
  const [modal,     setModal]     = useState(null); // null | "add" | product
  const [storeOpen, setStoreOpen] = useState(false);
  const [toast,     setToast]     = useState({ msg:"", show:false });
  const storeRef = useRef(null);

  // Outside click for store dropdown
  useEffect(() => {
    const h = (e) => { if (storeRef.current && !storeRef.current.contains(e.target)) setStoreOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Reset selection when products change
  useEffect(() => { setSelected(new Set()); }, [inv.products]);

  const showToast = (msg) => {
    setToast({ msg, show:true });
    setTimeout(()=>setToast((t)=>({...t,show:false})), 2500);
  };

  // Selection helpers
  const allSel    = inv.products.length > 0 && selected.size === inv.products.length;
  const someSel   = selected.size > 0 && !allSel;
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(inv.products.map((p)=>p.id)));
  const toggleOne = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  // Save handler
  const handleSave = async (form) => {
    if (modal === "add") { await inv.createProduct(form); showToast("Product added successfully"); }
    else                 { await inv.updateProduct(modal.id, form); showToast("Product updated"); }
    setModal(null);
  };

  // Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    await inv.deleteProduct(id);
    showToast("Product deleted");
  };

  // Bulk CSV download
  const handleDownload = () => {
    const rows = selected.size > 0
      ? inv.products.filter((p)=>selected.has(p.id))
      : inv.products;
    const header = "Product ID,Product Name,Category,Store,Stock,Price,Status,Last Updated";
    const csv = [header, ...rows.map((p)=>
      `${p.id},"${p.name}","${p.category}","${p.store}","${p.stock}","${p.price}","${p.status}","${p.updatedAt}"`
    )].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv],{type:"text/csv"})),
      download:"inventory.csv",
    });
    a.click();
    showToast(`Downloaded ${rows.length} records`);
  };

  const filterTabs = [
    { key:"all",        label:"All Products", count: inv.stats?.totalProducts ?? 0 },
    { key:"instock",    label:"In Stock",     count: inv.stats ? inv.stats.totalProducts - inv.stats.lowStockItems - inv.stats.outOfStockItems : 0 },
    { key:"lowstock",   label:"Low Stock",    count: inv.stats?.lowStockItems ?? 0,    dot:T.orange },
    { key:"outofstock", label:"Out of Stock", count: inv.stats?.outOfStockItems ?? 0,  dot:T.red },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg, fontFamily:"'DM Sans', system-ui, sans-serif", color:T.text }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside style={{ width:58, background:T.sidebar, display:"flex", flexDirection:"column", alignItems:"center", paddingTop:14, paddingBottom:24, gap:4, flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:T.yellow, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, marginBottom:18 }}>🛒</div>
        {[
          {icon:"🔍"},{icon:"🏠"},{icon:"📦",active:true},{icon:"📋"},{icon:"📊"},{icon:"👤"},{icon:"⚙️"},
        ].map(({icon,active},i)=>(
          <div key={i} style={{ width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", background:active?"rgba(255,255,255,.15)":"transparent", fontSize:18, transition:"background .15s" }} className="sidebar-icon">
            {icon}
          </div>
        ))}
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main style={{ flex:1, padding:"28px 28px 64px", minWidth:0, overflowX:"hidden" }}>

        {/* Page header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:26 }}>
          <h1 style={{ margin:0, fontSize:26, fontWeight:900, letterSpacing:"-0.5px" }}>Inventory</h1>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={()=>setModal("add")}
              style={{ display:"flex", alignItems:"center", gap:7, background:T.green, color:"#fff", border:"none", borderRadius:12, padding:"11px 20px", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(22,101,52,.3)", transition:"all .15s" }}
              className="btn-primary"
            ><span style={{fontSize:17,lineHeight:1}}>+</span> Add Product</button>
            <div style={{ width:38, height:38, borderRadius:"50%", background:T.green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, boxShadow:"0 2px 8px rgba(0,0,0,.15)", position:"relative" }}>
              3
              <span style={{ position:"absolute", top:-3, right:-3, width:16, height:16, background:T.red, borderRadius:"50%", border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900 }}>3</span>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }} className="stat-grid">
          <StatCard icon={ICONS.box}           label="Total Products"     value={inv.stats?.totalProducts}  accentColor="#1A5C1A" iconBg="#F0FDF4" />
          <StatCard icon={ICONS.layers}        label="Available Stock"    value={inv.stats?.availableStock} sub="units" accentColor="#1565C0" iconBg="#EFF6FF" />
          <StatCard icon={ICONS.alertTriangle} label="Low Stock Items"    value={inv.stats?.lowStockItems}   badge={inv.stats?.lowStockItems}   badgeColor={T.orange} accentColor={T.orange} iconBg="#FFF7ED" />
          <StatCard icon={ICONS.xCircle}       label="Out of Stock Items" value={inv.stats?.outOfStockItems} badge={inv.stats?.outOfStockItems} badgeColor={T.red}    accentColor={T.red}    iconBg="#FEF2F2" />
        </div>

        {/* Filter tabs + Bulk download */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:10, flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {filterTabs.map((tab)=>{
              const active = inv.statusFilter === tab.key;
              return (
                <button key={tab.key} onClick={()=>inv.setStatus(tab.key)}
                  style={{ display:"flex", alignItems:"center", gap:7, border:`1.5px solid ${active?T.green:T.border}`, borderRadius:20, padding:"8px 16px", fontSize:13, fontWeight:active?700:600, cursor:"pointer", background:active?T.green:"#fff", color:active?"#fff":T.textLight, transition:"all .15s" }}
                  className="filter-tab"
                >
                  {tab.label}
                  <span style={{ background:active?"rgba(255,255,255,.22)":"#F3F4F6", color:active?"#fff":T.textMed, borderRadius:20, padding:"1px 8px", fontSize:11, fontWeight:800 }}>{tab.count}</span>
                  {tab.dot && !active && tab.count > 0 && <span style={{ width:7, height:7, borderRadius:"50%", background:tab.dot }}/>}
                </button>
              );
            })}
          </div>

          <button onClick={handleDownload}
            style={{ display:"flex", alignItems:"center", gap:7, border:`1.5px solid ${T.border}`, borderRadius:10, padding:"9px 16px", fontSize:13, fontWeight:600, color:T.textLight, background:"#fff", cursor:"pointer", transition:"all .15s" }}
            className="btn-secondary"
          >
            ⬇ Bulk Download
            {selected.size > 0 && <span style={{ background:T.green, color:"#fff", borderRadius:20, padding:"1px 7px", fontSize:11, fontWeight:800 }}>{selected.size}</span>}
          </button>
        </div>

        {/* Store selector + search */}
        <div style={{ display:"flex", gap:12, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>
          {/* Store dropdown */}
          <div ref={storeRef} style={{ position:"relative" }}>
            <button onClick={()=>setStoreOpen((v)=>!v)}
              style={{ display:"flex", alignItems:"center", gap:6, border:`1.5px solid ${T.border}`, borderRadius:10, padding:"9px 14px", background:"#fff", cursor:"pointer", fontSize:13, color:T.textMed, transition:"all .15s" }}
              className="btn-secondary"
            >
              <span>Select Store:</span>
              <span style={{ fontWeight:700, color:T.text }}>{inv.storeFilter}</span>
              <span style={{ color:T.textXLight, fontSize:10, marginLeft:2 }}>{storeOpen?"▲":"▼"}</span>
            </button>

            {storeOpen && (
              <div style={{ position:"absolute", top:44, left:0, zIndex:100, background:"#fff", borderRadius:12, border:`1px solid ${T.border}`, boxShadow:"0 10px 28px rgba(0,0,0,.12)", minWidth:210, overflow:"hidden" }}>
                {inv.stores.map((s)=>(
                  <div key={s} onClick={()=>{inv.setStoreF(s);setStoreOpen(false);}}
                    style={{ padding:"11px 16px", fontSize:13, cursor:"pointer", fontWeight:inv.storeFilter===s?700:500, color:inv.storeFilter===s?T.green:T.textMed, background:inv.storeFilter===s?T.greenLight:"#fff", display:"flex", alignItems:"center", gap:8, borderBottom:`1px solid #F9FAFB`, transition:"background .1s" }}
                    className="menu-item"
                  >
                    {inv.storeFilter===s && <span style={{fontSize:11}}>✓</span>}
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div style={{ flex:1, minWidth:200, display:"flex", alignItems:"center", gap:8, border:`1.5px solid ${T.border}`, borderRadius:10, padding:"9px 14px", background:"#fff" }}>
            <span style={{ color:T.textXLight, fontSize:15, flexShrink:0 }}>🔍</span>
            <input
              style={{ flex:1, border:"none", outline:"none", fontSize:13, color:T.text, background:"transparent", fontFamily:"inherit" }}
              placeholder="Search by name, ID or category…"
              value={inv.search}
              onChange={(e)=>inv.setSearch(e.target.value)}
            />
            {inv.search && (
              <button onClick={()=>inv.setSearch("")} style={{ border:"none", background:"none", cursor:"pointer", color:T.textXLight, fontSize:14, padding:0, display:"flex" }}>✕</button>
            )}
          </div>
        </div>

        {/* TABLE */}
        <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${T.border}`, boxShadow:"0 1px 6px rgba(0,0,0,.05)", overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:1020 }}>
              <thead>
                <tr style={{ background:"#F9FAFB", borderBottom:`1.5px solid ${T.border}` }}>
                  <th style={{ ...TH, width:46 }}>
                    <CheckBox checked={allSel} indeterminate={someSel} onChange={toggleAll}/>
                  </th>
                  {[
                    {label:"Product ID",   w:100},
                    {label:"Product Name", w:140},
                    {label:"Category",     w:110},
                    {label:"Store",        w:145},
                    {label:"Stock",        w:100},
                    {label:"Price",        w:105},
                    {label:"Last Updated", w:115},
                    {label:"Status",       w:165},
                    {label:"Actions",      w:165},
                  ].map(({label,w})=>(
                    <th key={label} style={{...TH,width:w}}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inv.loading ? (
                  <tr><td colSpan={10} style={{ padding:"64px 20px", textAlign:"center" }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                      <Spinner size={32}/><span style={{ color:T.textXLight, fontSize:14 }}>Loading inventory…</span>
                    </div>
                  </td></tr>
                ) : inv.products.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding:"64px 20px", textAlign:"center" }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                      <span style={{fontSize:40}}>📦</span>
                      <span style={{fontSize:16,fontWeight:700,color:T.textMed}}>No products found</span>
                      <span style={{fontSize:13,color:T.textXLight}}>Try a different filter or clear your search</span>
                    </div>
                  </td></tr>
                ) : (
                  inv.products.map((p,i)=>(
                    <ProductRow key={p.id} product={p} isEven={i%2===0} selected={selected.has(p.id)} onSelect={toggleOne} onEdit={(prod)=>setModal(prod)} onDelete={handleDelete}/>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!inv.loading && inv.products.length > 0 && (
            <div style={{ padding:"12px 20px", borderTop:`1px solid #F3F4F6`, background:"#FAFAFA", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, color:T.textXLight }}>
                {selected.size>0 ? `${selected.size} of ${inv.products.length} selected` : `${inv.products.length} product${inv.products.length!==1?"s":""}`}
              </span>
              {selected.size>0 && (
                <button onClick={()=>setSelected(new Set())} style={{ border:"none", background:"none", cursor:"pointer", fontSize:12, color:T.textLight, fontWeight:600 }}>Clear selection</button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {modal !== null && (
        <ProductModal editing={modal==="add"?null:modal} onClose={()=>setModal(null)} onSave={handleSave} saving={inv.saving}/>
      )}

      {/* Toast */}
      <ToastBanner message={toast.msg} visible={toast.show}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. GLOBAL CSS
// ─────────────────────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }

  @keyframes iv-spin { to { transform: rotate(360deg); } }
  @keyframes iv-up   { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }

  .btn-primary:hover  { background: #123D12 !important; transform:translateY(-1px); box-shadow:0 6px 18px rgba(18,61,18,.4) !important; }
  .btn-edit:hover     { background: #123D12 !important; }
  .btn-secondary:hover{ background:#F3F4F6 !important; border-color:#D1D5DB !important; }
  .btn-dots:hover     { background:#F3F4F6 !important; border-color:#D1D5DB !important; }
  .filter-tab:hover   { border-color:#D1D5DB !important; }
  .sel-chip:hover     { border-color:#9CA3AF !important; }
  .stat-card:hover    { box-shadow:0 4px 16px rgba(0,0,0,.09) !important; transform:translateY(-1px); transition:all .2s !important; }
  .inv-row:hover td   { background:#F0FDF4 !important; }
  .menu-item:hover    { background:#F3F4F6 !important; }
  .sidebar-icon:hover { background:rgba(255,255,255,.1) !important; }

  input:focus { border-color:#1A5C1A !important; box-shadow:0 0 0 3px rgba(26,92,26,.1) !important; }

  @media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2,1fr) !important; } }
  @media (max-width: 640px)  { .stat-grid { grid-template-columns: 1fr 1fr !important; } }
`;
