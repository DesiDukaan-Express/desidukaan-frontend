/**
 * Inventory Service
 * All API calls related to inventory management for vendors.
 * Base URL from EXPO_PUBLIC_API_URL environment variable.
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// Derive stock status from qty
const stockStatus = (qty) => {
  if (qty <= 0) return "Out of Stock";
  if (qty <= 10) return "Low Stock";
  return "In Stock";
};

export const inventoryService = {
  /**
   * Fetch all products for a vendor and apply optional filters.
   */
  async getProducts(token, vendorId, { status = "all", q = "" } = {}) {
    if (!vendorId) return { data: [], total: 0 };
    try {
      const res = await fetch(`${API_BASE}/products/vendor/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      let data = (result.data?.products || []).map((p) => {
        const isActive = p.is_active ?? true;
        // category is the top-level name, subcategory is the child name
        const categoryName =
          typeof p.category === "string"
            ? p.category
            : p.category?.name || "Other";
        const subcategoryName = p.subcategory || null; // returned by updated controller
        return {
          id: p.id.toString(),
          name: p.name,
          description: p.description || "",
          category: { name: categoryName }, // ← keep as object so p.category?.name works in screen
          subcategory: subcategoryName,
          category_id: p.category_id || null,
          unit: p.unit || "kg",
          price: p.price,
          priceDisplay: `₹${p.price}`,
          updatedAt: new Date(p.updated_at ?? p.created_at).toLocaleDateString(
            "en-IN",
          ),
          is_active: isActive,
          status: isActive ? "Available" : "Unavailable",
          type: p.item_type || "packed",
          weight_options: p.weight_options || [],
          image_url: p.image_url || null,
          brand: p.brand || null,
        };
      });

      // Filter by active status
      if (status === "available")
        data = data.filter((p) => p.is_active === true);
      if (status === "unavailable")
        data = data.filter((p) => p.is_active === false);

      // Search filter
      if (q.trim()) {
        const lq = q.toLowerCase();
        data = data.filter(
          (p) =>
            p.name.toLowerCase().includes(lq) ||
            String(p.id).toLowerCase().includes(lq) ||
            (p.category?.name ?? "").toLowerCase().includes(lq),
        );
      }
      return { data, total: data.length };
    } catch (err) {
      console.error("getProducts error:", err);
      return { data: [], total: 0 };
    }
  },

  /**
   * Fetch vendor dashboard stats (counts for KPI cards).
   */
  async getStats(token) {
    try {
      const res = await fetch(`${API_BASE}/vendors/me/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      const s = result.data?.stats || {};
      return {
        totalProducts: s.total_products ?? 0,
        availableProducts: s.products_in_stock ?? 0,
        unavailableProducts: s.out_of_stock_items ?? 0,
        todayOrders: s.today_orders ?? 0,
        todayRevenue: s.today_revenue ?? 0,
        totalRevenue: s.total_revenue ?? 0,
        totalOrders: s.total_orders ?? 0,
        weeklyChartData: s.weekly_chart_data ?? [],
      };
    } catch (err) {
      console.error("getStats error:", err);
      return null;
    }
  },

  /**
   * Create a new product (with inventory record created by backend).
   */
  async createProduct(token, payload) {
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          name: payload.name,
          description: payload.description || "",
          brand: payload.brand || null,
          category: payload.category || "Other",
          // Send subcategory_id if available; backend will use it as category_id
          subcategory_id: payload.subcategory_id || null,
          category_id: payload.category_id || null,
          unit: payload.unit || "kg",
          price: parseFloat(String(payload.price).replace(/[^0-9.]/g, "")) || 0,
          mrp: payload.mrp ? parseFloat(String(payload.mrp).replace(/[^0-9.]/g, "")) : null,
          barcode: payload.barcode || null,
          type: payload.type || "packed",
          weight_options: payload.weight_options || null,
          image_url: payload.image_url || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to create product");
      return data;
    } catch (err) {
      console.error("createProduct error:", err);
      throw err;
    }
  },

  /**
   * Update an existing product.
   */
  async updateProduct(token, id, payload) {
    try {
      // Build body with only defined fields
      const body = {};
      if (payload.name !== undefined) body.name = payload.name;
      if (payload.description !== undefined)
        body.description = payload.description;
      if (payload.category !== undefined) body.category = payload.category;
      if (payload.category_id !== undefined)
        body.category_id = payload.category_id;
      if (payload.unit !== undefined) body.unit = payload.unit;
      if (payload.price !== undefined)
        body.price =
          parseFloat(String(payload.price).replace(/[^0-9.]/g, "")) || 0;
      if (payload.mrp !== undefined) body.mrp = payload.mrp;
      if (payload.type !== undefined) body.item_type = payload.type;
      if (payload.barcode !== undefined) body.barcode = payload.barcode;
      if (payload.weight_options !== undefined)
        body.weight_options = payload.weight_options;
      if (payload.image_url !== undefined) body.image_url = payload.image_url;
      if (payload.is_active !== undefined) body.is_active = payload.is_active;

      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update product");
      return data;
    } catch (err) {
      console.error("updateProduct error:", err);
      throw err;
    }
  },

  async toggleAvailability(token, productId, available) {
    try {
      const res = await fetch(`${API_BASE}/products/${productId}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({ is_active: available }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to toggle availability");
      return data;
    } catch (err) {
      console.error("toggleAvailability error:", err);
      throw err;
    }
  },

  /**
   * Soft-delete a product (backend sets is_active = false).
   */
  async deleteProduct(token, id) {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete product");
      return data;
    } catch (err) {
      console.error("deleteProduct error:", err);
      throw err;
    }
  },

  /**
   * Fetch the current vendor's profile (used to get vendor.id).
   */
  async getVendorProfile(token) {
    try {
      const res = await fetch(`${API_BASE}/vendors/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (err) {
      console.error("getVendorProfile error:", err);
      return { success: false };
    }
  },

  async getLowStock(token, threshold = null) {
    try {
      const qs = threshold !== null ? `?threshold=${threshold}` : "";
      const res = await fetch(`${API_BASE}/inventory/my/low-stock${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return await res.json();
    } catch (err) {
      console.error("getLowStock error:", err);
      return { success: false, data: { items: [] } };
    }
  },

  async bulkImport(token, items) {
    try {
      const res = await fetch(`${API_BASE}/inventory/bulk-import`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Bulk import failed");
      return data;
    } catch (err) {
      console.error("bulkImport error:", err);
      throw err;
    }
  },
};
