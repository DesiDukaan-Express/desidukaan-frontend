import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Core request helper with automatic token refresh ─────────────────────────
/**
 * All API calls go through here.
 * If the server returns { error: "TOKEN_EXPIRED" }, we transparently refresh
 * the access token and retry the original request exactly once.
 *
 * @param {string} method
 * @param {string} endpoint
 * @param {*}      body      - JSON-serialisable body or null
 * @param {string} token     - current access token (passed explicitly by callers)
 * @param {boolean} _isRetry - internal flag to prevent infinite retry loops
 */
const request = async (method, endpoint, body = null, token = null, _isRetry = false) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  console.log("API REQUEST:", method, endpoint, "token:", token ? "YES" : "NO");

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  // ── Silent token refresh on first expiry ─────────────────────────────────
  if (!_isRetry && response.status === 401 && data.error === "TOKEN_EXPIRED") {
    // Lazy import to avoid circular dep (authStore imports nothing from api.js)
    const { tryRefreshToken, default: useAuthStore } = await import('../store/authStore');
    const refreshResult = await tryRefreshToken();
    const newAccessToken = refreshResult?.token;

    if (newAccessToken) {
      // Update the store's in-memory token
      useAuthStore.getState()._setAccessToken(newAccessToken);
      // Retry the original request with the fresh token
      return request(method, endpoint, body, newAccessToken, true);
    } else {
      // Refresh token also expired/revoked → force logout
      useAuthStore.getState().logout();
      const err = new Error("Session expired. Please log in again.");
      err.sessionExpired = true;
      throw err;
    }
  }

  if (!response.ok) {
    const err = new Error(data.message || data.msg || "Something went wrong");
    err.needsRegistration = data.needsRegistration || false;
    throw err;
  }

  return data;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (phone, name, password, role) =>
    request("POST", "/auth/register", { phone, name, password, role }),

  passwordLogin: (phone, password, name = null, role = "customer") =>
    request("POST", "/auth/passwordLogin", {
      phone,
      password,
      ...(name && { name }),
      role,
    }),

  sendOTP: (phone) => request("POST", "/auth/login", { phone }),

  verifyOTP: (phone, code, role) => request("POST", "/auth/verify", { phone, code, role }),
};

// ─── Upload ───────────────────────────────────────────────────────────────────
export const uploadAPI = {
  /**
   * Upload a file (image or PDF) to the backend.
   * @param {string} localUri  - local file URI from image/document picker
   * @param {string} mimeType  - e.g. 'image/jpeg' | 'application/pdf'
   * @param {string} token     - JWT access token
   * @returns {Promise<{url: string, mime: string}>}
   */
  upload: async (localUri, mimeType, token) => {
    const ext =
      mimeType === "application/pdf" ? ".pdf"
      : mimeType === "image/png"    ? ".png"
      : mimeType === "image/webp"   ? ".webp"
      : ".jpg";

    const fileName = `upload_${Date.now()}${ext}`;
    const formData = new FormData();

    if (Platform.OS === 'web') {
      try {
        const response = await fetch(localUri);
        const blob = await response.blob();
        formData.append("file", blob, fileName);
      } catch (err) {
        console.error("Web upload blob conversion failed:", err);
        throw new Error("Could not process file for upload");
      }
    } else {
      formData.append("file", {
        uri:  localUri,
        name: fileName,
        type: mimeType,
      });
    }

    console.log("📤 Uploading file to:", `${BASE_URL}/upload`, "Platform:", Platform.OS);

    const response = await fetch(`${BASE_URL}/upload`, {
      method:  "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body:    formData,
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("❌ Upload response error:", data);
      throw new Error(data.message || "Upload failed");
    }
    return data; // { success, url, mime }
  },
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesAPI = {
  getAll: () => request("GET", "/products/categories"),
  getSubcategories: (parentId) => request("GET", `/products/subcategories/${parentId}`),
};

// ─── Admin Categories ─────────────────────────────────────────────────────────
export const adminCategoriesAPI = {
  getAll:   (token)           => request("GET",    "/admin/categories",      null,  token),
  create:   (data, token)     => request("POST",   "/admin/categories",      data,  token),
  update:   (id, data, token) => request("PUT",    `/admin/categories/${id}`, data, token),
  remove:   (id, token)       => request("DELETE", `/admin/categories/${id}`, null, token),
};

// ─── Vendors ──────────────────────────────────────────────────────────────────
export const vendorsAPI = {
  getNearby: (latitude, longitude, radius_km = 10, store_category = null) => {
    let url = `/vendors?latitude=${latitude}&longitude=${longitude}&radius_km=${radius_km}`;
    if (store_category) url += `&store_category=${encodeURIComponent(store_category)}`;
    return request("GET", url);
  },

  getStoreCategories: () => request("GET", "/vendors/store-categories"),

  getById:      (id)         => request("GET",   `/vendors/${id}`),
  getMyProfile: (token)      => request("GET",   "/vendors/me/profile", null, token),
  getMyStats:   (token)      => request("GET",   "/vendors/me/stats",   null, token),
  toggleStatus: (id, token)  => request("PATCH", `/vendors/${id}/toggle`, null, token),
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const ordersAPI = {
  place:           (orderData, token)             => request("POST",  "/orders",                orderData, token),
  getMyOrders:     (token, page = 1)              => request("GET",   `/orders/my?page=${page}`, null,    token),
  getById:         (id, token)                    => request("GET",   `/orders/${id}`,           null,    token),
  getVendorActive: (token)                        => request("GET",   "/orders/vendor/active",   null,    token),
  getVendorHistory:(token)                        => request("GET",   "/orders/vendor/history",  null,    token),
  updateStatus:    (id, status, token, reason="") => request("PATCH", `/orders/${id}/status`, { status, reason }, token),
};

// ─── Delivery ─────────────────────────────────────────────────────────────────
export const deliveryAPI = {
  getAvailable:       (token)            => request("GET",   "/delivery/available",          null,                             token),
  getActive:          (token)            => request("GET",   "/delivery/active",             null,                             token),
  accept:             (orderId, token)   => request("POST",  `/delivery/accept/${orderId}`,  null,                             token),
  updateStatus:       (id, status, token)=> request("PATCH", `/delivery/${id}/status`,       { status },                       token),
  trackOrder:         (orderId, token)   => request("GET",   `/delivery/track/${orderId}`,   null,                             token),
  toggleAvailability: (token)            => request("PATCH", "/delivery/toggle-availability", null,                            token),
  updateLocation:     (lat, lng, token)  => request("POST",  "/delivery/location",           { latitude: lat, longitude: lng }, token),
  onboard:            (payload, token)   => request("POST",  "/delivery/onboard",            payload,                          token),
  getMyProfile:       (token)            => request("GET",   "/delivery/me/profile",         null,                             token),
};

// ─── Search ───────────────────────────────────────────────────────────────────
export const searchAPI = {
  /**
   * Prefix autocomplete — called while user is typing (debounced on the caller).
   * Returns { suggestions: [{ text, type }] }
   */
  autocomplete: (q) => request("GET", `/search/autocomplete?q=${encodeURIComponent(q)}`),

  /**
   * Typo correction — called only when search yields 0 results.
   * Returns { suggestion: string | null }
   */
  correct: (q) => request("GET", `/search/correct?q=${encodeURIComponent(q)}`),

  /**
   * Fire-and-forget search tracking — called after every successful search.
   * Increments count in search_history for popularity-based suggestions.
   */
  track: (query) => {
    // Fire and forget — don't await, don't block UI
    request("POST", "/search/track", { query }).catch(() => {});
  },
};

