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
        const qty = p.inventory?.[0]?.stock_qty ?? 0;
        return {
          id: p.id.toString(),
          name: p.name,
          description: p.description || "",
          category: typeof p.category === "string" ? p.category : (p.category?.name || "Other"),
          unit: p.unit || "kg",
          stock: `${qty} ${p.unit || "kg"}`,
          rawStock: qty,
          price: p.price,
          priceDisplay: `₹${p.price}`,
          updatedAt: new Date(p.updated_at ?? p.created_at).toLocaleDateString("en-IN"),
          status: stockStatus(qty),
          type: p.item_type || "packed",
          weight_options: p.weight_options || [],
        };
      });

      // Filter by stock status
      if (status === "instock")    data = data.filter((p) => p.status === "In Stock");
      if (status === "lowstock")   data = data.filter((p) => p.status === "Low Stock");
      if (status === "outofstock") data = data.filter((p) => p.status === "Out of Stock");

      // Search filter
      if (q.trim()) {
        const lq = q.toLowerCase();
        data = data.filter(
          (p) =>
            p.name.toLowerCase().includes(lq) ||
            String(p.id).toLowerCase().includes(lq) ||
            p.category.toLowerCase().includes(lq)
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
        totalProducts:    s.total_products    ?? 0,
        availableStock:   s.products_in_stock ?? 0,
        lowStockItems:    s.low_stock_items   ?? 0,
        outOfStockItems:  s.out_of_stock_items ?? 0,
        todayOrders:      s.today_orders      ?? 0,
        todayRevenue:     s.today_revenue     ?? 0,
        totalRevenue:     s.total_revenue     ?? 0,
        totalOrders:      s.total_orders      ?? 0,
        weeklyChartData:  s.weekly_chart_data ?? [],
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
          name:        payload.name,
          description: payload.description || "",
          category:    payload.category || "Other",
          unit:        payload.unit || "kg",
          price:       parseFloat(String(payload.price).replace(/[^0-9.]/g, "")) || 0,
          stock_qty:   parseInt(payload.stock) || 0,
          type:        payload.type || "packed",
          weight_options: payload.weight_options || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create product");
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
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({
          name:        payload.name,
          description: payload.description || "",
          category:    payload.category || "Other",
          unit:        payload.unit || "kg",
          price:       parseFloat(String(payload.price).replace(/[^0-9.]/g, "")) || 0,
          stock_qty:   parseInt(payload.stock) || 0,
          type:        payload.type || "packed",
          weight_options: payload.weight_options || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update product");
      return data;
    } catch (err) {
      console.error("updateProduct error:", err);
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
};
