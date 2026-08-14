import { useState, useEffect, useCallback, useMemo } from "react";
import useAuthStore from "../store/authStore";
import { inventoryService } from "../services/inventory.service";

const STORES_OPTS = ["Ameerpet Store", "Begumpet Store", "SR Nagar Store", "KPHB Store"];
const PAGE_SIZE = 8;

/**
 * useInventory - Custom hook for managing vendor inventory state, filters, sorting,
 * pagination, and CRUD operations.
 */
export default function useInventory() {
  const { token } = useAuthStore();
  const [vendorId, setVendorId] = useState(null);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [storeFilter, setStoreF] = useState("all");
  const [stores] = useState(STORES_OPTS);
  const [parentFilter, setParentFilter] = useState("all");
  const [subFilter, setSubFilter] = useState("all");
  const [globalCategories, setGlobalCategories] = useState([]);

  const loadVendor = useCallback(async () => {
    try {
      const result = await inventoryService.getVendorProfile(token);
      if (result.success) {
        setVendorId(result.data.vendor.id);
      }
    } catch (err) {
      console.error("Load Vendor Error:", err);
    }
  }, [token]);

  const loadGlobalCategories = useCallback(async () => {
    try {
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
      const res = await fetch(`${API_BASE}/products/categories`);
      const result = await res.json();
      if (res.ok) {
        const flat = result.data?.flat || result.flat || result.data?.categories || [];
        setGlobalCategories(flat);
      }
    } catch (err) {
      console.error("Load Global Categories Error:", err);
    }
  }, []);

  useEffect(() => {
    loadVendor();
    loadGlobalCategories();
  }, [loadVendor, loadGlobalCategories]);

  const load = useCallback(async () => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const [{ data }, st] = await Promise.all([
        inventoryService.getProducts(token, vendorId, {
          status: statusFilter,
          q: search,
        }),
        inventoryService.getStats(token, vendorId),
      ]);
      setProducts(data);
      setStats(st);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, [token, vendorId, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    let data = products;
    if (parentFilter !== "all") {
      data = data.filter((p) => {
        const pCat = typeof p.category === "object" ? p.category?.name : p.category;
        return String(pCat).toLowerCase() === parentFilter.toLowerCase();
      });
    }
    if (subFilter !== "all") {
      data = data.filter((p) => {
        return p.subcategory && String(p.subcategory).toLowerCase() === subFilter.toLowerCase();
      });
    }
    return data;
  }, [products, parentFilter, subFilter]);

  const sortedProducts = useMemo(() => {
    if (!sortKey) return filteredProducts;
    return [...filteredProducts].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];

      if (sortKey === "stock") {
        av = a.rawStock ?? 0;
        bv = b.rawStock ?? 0;
      }

      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }

      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredProducts, sortKey, sortDir]);

  const totalPages = 1;
  const pagedProducts = sortedProducts;

  const toggleSort = (key) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
    setPage(1);
  };

  const withSave = async (fn) => {
    setSaving(true);
    try {
      await fn();
      await load();
    } finally {
      setSaving(false);
    }
  };

  return {
    products: pagedProducts,
    allProducts: sortedProducts,
    rawProducts: products,
    stats,
    stores,
    loading,
    saving,
    statusFilter,
    setStatus,
    storeFilter,
    setStoreF,
    search,
    setSearch,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    toggleSort,
    page,
    setPage,
    totalPages,
    parentFilter,
    setParentFilter,
    subFilter,
    setSubFilter,
    createProduct: (payload) =>
      withSave(() => inventoryService.createProduct(token, payload)),
    updateProduct: (id, payload) =>
      withSave(() => inventoryService.updateProduct(token, id, payload)),
    deleteProduct: (id) =>
      withSave(() => inventoryService.deleteProduct(token, id)),
    deleteProducts: (ids) =>
      withSave(async () => {
        for (const id of ids) await inventoryService.deleteProduct(token, id);
      }),
    bulkImport: (items) =>
      withSave(() => inventoryService.bulkImport(token, items)),
    globalCategories,

    deleteCategoryProducts: async (categoryId) => {
      await withSave(async () => {
        const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
        const res = await fetch(`${API_BASE}/products/category/${categoryId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to delete category products");
      });
    },

    toggleAvailability: async (productId, available) => {
      // Optimistic update immediately
      setProducts((prev) =>
        prev.map((p) =>
          p.id === String(productId)
            ? {
                ...p,
                is_active: available,
                status: available ? "Available" : "Unavailable",
              }
            : p
        )
      );
      try {
        await inventoryService.toggleAvailability(token, productId, available);
      } catch (err) {
        console.error("Toggle failed, reverting:", err.message);
        // Revert
        setProducts((prev) =>
          prev.map((p) =>
            p.id === String(productId)
              ? {
                  ...p,
                  is_active: !available,
                  status: !available ? "Available" : "Unavailable",
                }
              : p
          )
        );
        throw err;
      }
    },
  };
}
