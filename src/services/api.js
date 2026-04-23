const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Core request helper ───
const request = async (method, endpoint, body = null, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  console.log("API REQUEST:", method, endpoint, "token:", token ? "YES" : "NO");

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.message || data.msg || "Something went wrong");
    err.needsRegistration = data.needsRegistration || false;
    throw err;
  }

  return data;
};

// ─── Auth ───
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

  verifyOTP: (phone, code) => request("POST", "/auth/verify", { phone, code }),
};

// ─── Upload ───
export const uploadAPI = {
  /**
   * Upload a file (image or PDF) to the backend.
   * @param {string} localUri  - local file URI from image/document picker
   * @param {string} mimeType  - e.g. 'image/jpeg' | 'application/pdf'
   * @param {string} token     - JWT auth token
   * @returns {Promise<{url: string, mime: string}>}
   */
  upload: async (localUri, mimeType, token) => {
    const ext =
      mimeType === "application/pdf" ? ".pdf"
      : mimeType === "image/png"    ? ".png"
      : mimeType === "image/webp"   ? ".webp"
      : ".jpg";

    const formData = new FormData();
    formData.append("file", {
      uri:  localUri,
      name: `upload_${Date.now()}${ext}`,
      type: mimeType,
    });

    const response = await fetch(`${BASE_URL}/upload`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}` },
      body:    formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Upload failed");
    return data; // { success, url, mime }
  },
};

// ─── Categories ───
export const categoriesAPI = {
  /** Returns all active categories as flat list with parent_id for hierarchy */
  getAll: () => request("GET", "/products/categories"),
};

// ─── Vendors ───
export const vendorsAPI = {
  getNearby: (latitude, longitude, radius_km = 2) =>
    request("GET", `/vendors?latitude=${latitude}&longitude=${longitude}&radius_km=${radius_km}`),

  getById:     (id)    => request("GET",  `/vendors/${id}`),
  getMyProfile:(token) => request("GET",  "/vendors/me/profile", null, token),
  getMyStats:  (token) => request("GET",  "/vendors/me/stats",   null, token),
  toggleStatus:(id, token) => request("PATCH", `/vendors/${id}/toggle`, null, token),
};

// ─── Orders ───
export const ordersAPI = {
  place:          (orderData, token)            => request("POST",  "/orders",                orderData, token),
  getMyOrders:    (token, page = 1)             => request("GET",   `/orders/my?page=${page}`, null,    token),
  getById:        (id,    token)                => request("GET",   `/orders/${id}`,           null,    token),
  getVendorActive:(token)                       => request("GET",   "/orders/vendor/active",   null,    token),
  getVendorHistory:(token)                      => request("GET",   "/orders/vendor/history",  null,    token),
  updateStatus:   (id, status, token, reason="")=> request("PATCH", `/orders/${id}/status`, { status, reason }, token),
};

// ─── Delivery ───
export const deliveryAPI = {
  getAvailable:      (token)               => request("GET",   "/delivery/available",         null,               token),
  getActive:         (token)               => request("GET",   "/delivery/active",            null,               token),
  accept:            (orderId, token)      => request("POST",  `/delivery/accept/${orderId}`,  null,               token),
  updateStatus:      (id, status, token)   => request("PATCH", `/delivery/${id}/status`,      { status },         token),
  trackOrder:        (orderId, token)      => request("GET",   `/delivery/track/${orderId}`,   null,               token),
  toggleAvailability:(token)               => request("PATCH", "/delivery/toggle-availability", null,             token),
  updateLocation:    (lat, lng, token)     => request("POST",  "/delivery/location",          { latitude: lat, longitude: lng }, token),

  /** Submit (or re-submit) full onboarding data */
  onboard:           (payload, token)      => request("POST",  "/delivery/onboard",           payload,            token),

  /** Fetch full delivery partner profile including all onboarding fields */
  getMyProfile:      (token)               => request("GET",   "/delivery/me/profile",        null,               token),
};
