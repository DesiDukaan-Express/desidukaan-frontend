import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Magic-byte validation (web) ──────────────────────────────────────────────
// Browsers report MIME from the file extension, so a renamed HTML file (e.g. a
// saved SPA index.html named ".pdf") is silently accepted by the file picker.
// Check the real first bytes so such files are rejected up front with a clear
// message instead of being stored as a broken "PDF" on the server.
class ContentMismatchError extends Error {}

function matchesMagicBytes(bytes, mimeType) {
  const b = bytes || [];
  if (mimeType === "application/pdf") {
    return b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
  }
  if (mimeType === "image/png") {
    return b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47; // \x89PNG
  }
  if (mimeType === "image/webp") {
    return b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50; // RIFF....WEBP
  }
  // default: treat as JPEG
  return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff; // \xFF\xD8\xFF
}

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
export const request = async (method, endpoint, body = null, token = null, _isRetry = false) => {
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
    } else if (refreshResult?.error === "ACCOUNT_DEACTIVATED") {
      // Account deactivated by admin → block the app (keep refresh token so a
      // reload after reactivation restores the session automatically).
      useAuthStore.getState().flagDeactivated();
      const err = new Error("Your account has been deactivated.");
      err.accountDeactivated = true;
      throw err;
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

    sendEmailOTP: (email) =>
    request("POST", "/auth/email/send-otp", { email }),

  verifyEmailOTP: (email, otp) =>
    request("POST", "/auth/email/verify", { email, otp }),
};

// ─── Upload ───────────────────────────────────────────────────────────────────
export const uploadAPI = {
  /**
   * Upload a file (image or PDF) to the backend.
   * @param {string} localUri  - local file URI from image/document picker
   * @param {string} mimeType  - e.g. 'image/jpeg' | 'application/pdf'
   * @param {string} token     - JWT access token
   * @param {(percent:number)=>void} onProgress - upload progress 0–100
   * @param {object} [options] - { authenticated?: boolean } — mark sensitive
   *        documents as authenticated Cloudinary assets (signed, expiring URL).
   * @returns {Promise<{url: string, public_id: string, mime: string}>}
   */
upload: async (localUri, mimeType, token, onProgress = null, options = {}) => {
  const ext =
    mimeType === "application/pdf"
      ? ".pdf"
      : mimeType === "image/png"
      ? ".png"
      : mimeType === "image/webp"
      ? ".webp"
      : ".jpg";

  const fileName = `upload_${Date.now()}${ext}`;
  const formData = new FormData();

  if (options.authenticated) {
    formData.append("authenticated", "1");
  }

  // ─── Web upload ──────────────────────────────────────────────────────────
  if (Platform.OS === "web") {
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();

      // Expo ImagePicker on web can report a MIME type that differs
      // from the browser Blob MIME type.
      const actualMimeType =
        blob.type && blob.type.startsWith("image/")
          ? blob.type
          : mimeType;

      console.log(
        "Web upload - passed MIME type:",
        mimeType
      );

      console.log(
        "Web upload - actual Blob MIME type:",
        blob.type
      );

      console.log(
        "Web upload - using MIME type:",
        actualMimeType
      );

      const bytes = new Uint8Array(
        await blob.slice(0, 12).arrayBuffer()
      );

      console.log("WEB DEBUG - blob.type:", blob.type);
      console.log("WEB DEBUG - mimeType:", mimeType);
      console.log(
      "WEB DEBUG - first bytes:",
      Array.from(bytes)
);
console.log(
  "WEB DEBUG - localUri:",
  localUri
);

      if (!matchesMagicBytes(bytes, actualMimeType)) {
        throw new ContentMismatchError(
          "The selected file is not a valid image. Please choose a JPG, PNG or WebP image."
        );
      }

      const uploadBlob = new Blob([blob], {
        type: actualMimeType,
      });

      const actualExtension =
        actualMimeType === "image/png"
          ? ".png"
          : actualMimeType === "image/webp"
          ? ".webp"
          : ".jpg";

      const actualFileName =
        `profile_${Date.now()}${actualExtension}`;

      formData.append(
        "file",
        uploadBlob,
        actualFileName
      );
    } catch (err) {
      if (err instanceof ContentMismatchError) {
        throw err;
      }

      console.error(
        "Web upload blob conversion failed:",
        err
      );

      throw new Error(
        "Could not process file for upload"
      );
    }
  }

  // ─── Native upload ───────────────────────────────────────────────────────
  else {
    formData.append("file", {
      uri: localUri,
      name: fileName,
      type: mimeType,
    });
  }

  console.log(
    "📤 Uploading file to:",
    `${BASE_URL}/upload`,
    "Platform:",
    Platform.OS
  );

  // ─── Actual upload request ───────────────────────────────────────────────
  const _doUpload = (uploadToken) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open(
        "POST",
        `${BASE_URL}/upload`
      );

      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${uploadToken}`
      );

      xhr.timeout = 60000;

      xhr.upload.onprogress = (e) => {
        if (
          onProgress &&
          e.lengthComputable &&
          e.total > 0
        ) {
          onProgress(
            Math.min(
              100,
              Math.round((e.loaded / e.total) * 100)
            )
          );
        }
      };

      xhr.onerror = () => {
        reject(
          new Error("Network error during upload")
        );
      };

      xhr.ontimeout = () => {
        reject(
          new Error(
            "Upload timed out. Please try again."
          )
        );
      };

      xhr.onload = () => {
        let data = {};

        try {
          data = JSON.parse(
            xhr.responseText || "{}"
          );
        } catch (err) {
          console.error(
            "Upload: could not parse response",
            err
          );
        }

        if (
          xhr.status >= 200 &&
          xhr.status < 300 &&
          data.url
        ) {
          if (onProgress) {
            onProgress(100);
          }

          resolve(data);
        } else if (
          xhr.status === 401 &&
          data.error === "TOKEN_EXPIRED"
        ) {
          reject({
            _tokenExpired: true,
          });
        } else {
          reject(
            new Error(
              data.message ||
              data.msg ||
              "Upload failed"
            )
          );
        }
      };

      xhr.send(formData);
    });

  // ─── Upload + automatic token refresh ───────────────────────────────────
  try {
    return await _doUpload(token);
  } catch (err) {
    if (err?._tokenExpired) {
      const {
        tryRefreshToken,
        default: useAuthStore,
      } = await import(
        "../store/authStore"
      );

      const refreshResult =
        await tryRefreshToken();

      const newAccessToken =
        refreshResult?.token;

      if (newAccessToken) {
        useAuthStore
          .getState()
          ._setAccessToken(
            newAccessToken
          );

        return await _doUpload(
          newAccessToken
        );
      } else if (
        refreshResult?.error ===
        "ACCOUNT_DEACTIVATED"
      ) {
        useAuthStore
          .getState()
          .flagDeactivated();

        throw new Error(
          "Your account has been deactivated."
        );
      } else {
        useAuthStore
          .getState()
          .logout();

        throw new Error(
          "Session expired. Please log in again."
        );
      }
    }

    throw err;
  }
},
  /**
   * Delete an uploaded asset from Cloudinary (signed, through the backend).
   * @param {string} publicId - Cloudinary public_id (or local filename fallback)
   * @param {string} token    - JWT access token
   * @returns {Promise<{success:boolean}>}
   */
  remove: (publicId, token) =>
    request("POST", "/upload/delete", { public_id: publicId }, token),

  /**
   * Get a freshly signed (expiring) URL for an authenticated asset.
   * Signed URLs expire, so call this right before opening a document so the
   * link is always valid (PDF viewer, "Open in New Tab").
   * @param {string} publicId  - Cloudinary public_id
   * @param {string} resourceType - 'image' | 'raw' | 'auto'
   * @param {string} token     - JWT access token
   * @returns {Promise<{url: string}>}
   */
  getSignedUrl: (publicId, resourceType = "auto", token) =>
    request("POST", "/upload/signed", { public_id: publicId, resource_type: resourceType }, token),
};

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsAPI = {
  getPopular: (lat, lng, radius_km = 10, limit = 12, token) =>
    request("GET", `/products/popular?lat=${lat}&lng=${lng}&radius_km=${radius_km}&limit=${limit}`, null, token),
  getVendors: (productId, token) =>
    request("GET", `/products/${productId}/vendors`, null, token),
  getTrending: (lat = null, lng = null, limit = 12) => {
    let url = `/products/trending?limit=${limit}`;
    if (lat != null && lng != null) url += `&lat=${lat}&lng=${lng}`;
    return request("GET", url);
  },
};

// ─── Inventory ────────────────────────────────────────────────────────────────
export const inventoryAPI = {
  getVendorInventory: (vendorId, token) =>
    request("GET", `/inventory/vendor/${vendorId}`, null, token),
};

// ─── Slots ────────────────────────────────────────────────────────────────────
export const slotsAPI = {
  getDeliveryInfo: (params, token) =>
    request("GET", `/slots/delivery-info?${params}`, null, token),
  requestPhone: (vendorId, token) =>
    request("POST", "/slots/phone-request", { vendor_id: vendorId }, token),
  getVendorRequests: (token) =>
    request("GET", "/slots/vendor/requests", null, token),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentsAPI = {
  verifyUpi: (upiId, token) =>
    request("POST", "/payments/verify-upi", { upi_id: upiId }, token),
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesAPI = {
  getAll: () => request("GET", "/products/categories"),
  getSubcategories: (parentId) => request("GET", `/products/subcategories/${parentId}`),
};

// ─── Products (extended) ──────────────────────────────────────────────────────
export const productsExtendedAPI = productsAPI;

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

  /**
   * Shop-name search → { matched: [...], similar: [...] }
   * matched = vendors whose name matches the query
   * similar = other vendors sharing the same store_category as the matches
   */
  searchByName: (q, latitude = null, longitude = null, radius_km = 10) => {
    let url = `/vendors/search?q=${encodeURIComponent(q)}`;
    if (latitude != null && longitude != null) {
      url += `&latitude=${latitude}&longitude=${longitude}&radius_km=${radius_km}`;
    }
    return request("GET", url);
  },

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
  assign:             (orderId, partnerId, token) => request("POST", `/delivery/assign/${orderId}`, { partnerId }, token),
  autoAssign:         (orderId, radius_km, token) => request("POST", `/delivery/auto-assign/${orderId}`, { radius_km }, token),
  decline:            (orderId, token)   => request("POST",  `/delivery/decline/${orderId}`,  null,                             token),
  getNearbyRiders:    (latitude, longitude, radius_km = 10, token) => request("GET", `/delivery/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radius_km}`, null, token),
  getVendorNotifications: (token)        => request("GET",   "/delivery/vendor-notifications", null,                            token),
  markNotificationsRead:  (token)        => request("PATCH", "/delivery/vendor-notifications/read", null,                        token),
};

// ─── Wishlist ──────────────────────────────────────────────────────────────────
export const wishlistAPI = {
  getAll:   (token)              => request("GET",    "/wishlist",       null, token),
  getIds:   (token)              => request("GET",    "/wishlist/ids",   null, token),
  add:      (productId, token)   => request("POST",   "/wishlist",       { product_id: productId }, token),
  remove:   (productId, token)   => request("DELETE", `/wishlist/${productId}`, null, token),
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

  track: (query, image_url = null, category = null) => {
    // Fire and forget — don't await, don't block UI
    request("POST", "/search/track", { query, image_url, category }).catch(() => {});
  },
};

export const supportAPI = {
  createTicket: (data, token) => request("POST", "/support/tickets", data, token),
  getMyTickets: (token, page = 1) => request("GET", `/support/tickets?page=${page}`, null, token),
  getTicket: (id, token) => request("GET", `/support/tickets/${id}`, null, token),
  addMessage: (id, message, token) => request("POST", `/support/tickets/${id}/messages`, { message }, token),
};

