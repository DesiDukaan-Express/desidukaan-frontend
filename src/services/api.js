const BASE_URL = "http://localhost:3000/api";

// ─── Core request helper ───
const request = async (method, endpoint, body = null, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

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

// ─── Vendors ───
export const vendorsAPI = {
  getNearby: (latitude, longitude, radius_km = 2) =>
    request(
      "GET",
      `/vendors?latitude=${latitude}&longitude=${longitude}&radius_km=${radius_km}`,
    ),

  getById: (id) => request("GET", `/vendors/${id}`),

  getMyProfile: (token) => request("GET", "/vendors/me/profile", null, token),

  getMyStats: (token) => request("GET", "/vendors/me/stats", null, token),

  toggleStatus: (id, token) =>
    request("PATCH", `/vendors/${id}/toggle`, null, token),
};

// ─── Orders ───
export const ordersAPI = {
  place: (orderData, token) => request("POST", "/orders", orderData, token),

  getMyOrders: (token, page = 1) =>
    request("GET", `/orders/my?page=${page}`, null, token),

  getById: (id, token) => request("GET", `/orders/${id}`, null, token),

  getVendorActive: (token) =>
    request("GET", "/orders/vendor/active", null, token),

  getVendorHistory: (token) =>
    request("GET", "/orders/vendor/history", null, token),

  updateStatus: (id, status, token, reason = "") =>
    request("PATCH", `/orders/${id}/status`, { status, reason }, token),
};

// ─── Delivery ───
export const deliveryAPI = {
  getAvailable: (token) => request("GET", "/delivery/available", null, token),

  getActive: (token) => request("GET", "/delivery/active", null, token),

  accept: (orderId, token) =>
    request("POST", `/delivery/accept/${orderId}`, null, token),

  updateStatus: (deliveryId, status, token) =>
    request("PATCH", `/delivery/${deliveryId}/status`, { status }, token),

  trackOrder: (orderId, token) =>
    request("GET", `/delivery/track/${orderId}`, null, token),

  toggleAvailability: (token) =>
    request("PATCH", "/delivery/toggle-availability", null, token),

  updateLocation: (latitude, longitude, token) =>
    request("POST", "/delivery/location", { latitude, longitude }, token),
};
