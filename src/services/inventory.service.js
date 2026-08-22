/**
 * Inventory Service
 * All API calls related to inventory management for vendors.
 * Uses the shared `request` helper from api.js for automatic token refresh.
 */

import { request } from "./api";

export const inventoryService = {
  /**
   * Fetch all products for a vendor and apply optional filters.
   */
  async getProducts(token, vendorId, { status = "all", q = "" } = {}) {
    if (!vendorId) return { data: [], total: 0 };
    try {
      const result = await request("GET", `/products/vendor/${vendorId}`, null, token);
      let data = (result.data?.products || []).map((p) => {
        const isActive = p.is_active ?? true;
        const categoryName =
          typeof p.category === "string"
            ? p.category
            : p.category?.name || "Other";
        const subcategoryName = p.subcategory || null;
        return {
          id: p.id.toString(),
          name: p.name,
          description: p.description || "",
          category: { name: categoryName },
          subcategory: subcategoryName,
          category_id: p.category_id || null,
          unit: p.unit || "kg",
          price: p.price,
          priceDisplay: `\u20B9${p.price}`,
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

      if (status === "available")
        data = data.filter((p) => p.is_active === true);
      if (status === "unavailable")
        data = data.filter((p) => p.is_active === false);

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
      const result = await request("GET", "/vendors/me/stats", null, token);
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
    const data = await request("POST", "/products", {
      name: payload.name,
      description: payload.description || "",
      brand: payload.brand || null,
      category: payload.category || "Other",
      subcategory_id: payload.subcategory_id || null,
      category_id: payload.category_id || null,
      unit: payload.unit || "kg",
      price: parseFloat(String(payload.price).replace(/[^0-9.]/g, "")) || 0,
      mrp: payload.mrp ? parseFloat(String(payload.mrp).replace(/[^0-9.]/g, "")) : null,
      barcode: payload.barcode || null,
      type: payload.type || "packed",
      weight_options: payload.weight_options || null,
      image_url: payload.image_url || null,
    }, token);
    return data;
  },

  /**
   * Update an existing product.
   */
  async updateProduct(token, id, payload) {
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

    return await request("PUT", `/products/${id}`, body, token);
  },

  async toggleAvailability(token, productId, available) {
    return await request("PUT", `/products/${productId}`, { is_active: available }, token);
  },

  /**
   * Soft-delete a product (backend sets is_active = false).
   */
  async deleteProduct(token, id) {
    return await request("DELETE", `/products/${id}`, null, token);
  },

  /**
   * Fetch the current vendor's profile (used to get vendor.id).
   */
  async getVendorProfile(token) {
    try {
      return await request("GET", "/vendors/me/profile", null, token);
    } catch (err) {
      console.error("getVendorProfile error:", err);
      return { success: false };
    }
  },

  async bulkImport(token, items) {
    return await request("POST", "/inventory/bulk-import", { items }, token);
  },
};
