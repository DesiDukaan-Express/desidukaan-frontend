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

  useEffect(() => {
    loadVendor();
  }, [loadVendor]);

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

  const sortedProducts = useMemo(() => {
    if (!sortKey) return products;
    return [...products].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [products, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const pagedProducts = sortedProducts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

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
    sortDir,
    toggleSort,
    page,
    setPage,
    totalPages,
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
  };
}
