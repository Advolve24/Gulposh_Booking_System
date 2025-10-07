// admin.js
import { api } from "./http";

// --- Auth for admin panel ---
export const adminLogin  = (email, password) => api.post("/admin/login", { email, password }).then(r => r.data);
export const adminLogout = () => api.post("/admin/logout");
export const adminMe     = () => api.get("/admin/me").then(r => r.data);

// --- Rooms ---
export const createRoom  = (payload) => api.post("/admin/rooms", payload).then(r => r.data);
export const listRooms   = () => api.get("/admin/rooms").then(r => r.data);
export const getRoomAdmin = async (id) => (await api.get(`/admin/rooms/${id}`)).data;
export const updateRoom = async (id, payload) => (await api.put(`/admin/rooms/${id}`, payload)).data;
export const deleteRoom = (id) => api.delete(`/admin/rooms/${id}`).then(r => r.data);

// --- Users ---
export const listUsersAdmin = () => api.get("/admin/users").then(r => r.data);
export const getUserAdminById = (id) => api.get(`/admin/users/${id}`).then(r => r.data);
export const updateUserAdmin = (id, payload) => api.put(`/admin/users/${id}`, payload).then(r => r.data);
export const deleteUserAdmin = (id) => api.delete(`/admin/users/${id}`).then(r => r.data);

// Create offline user by admin
export const createUserByAdmin = (payload) =>
  api.post("/admin/users", payload).then(r => r.data);

// --- Bookings ---
export const listUserBookingsAdmin = (id) => api.get(`/admin/users/${id}/bookings`).then(r => r.data);
export const listBookingsAdmin = (params) => api.get("/admin/bookings", { params }).then(r => r.data);
export const cancelBookingAdmin = (bookingId) => api.post(`/admin/bookings/${bookingId}/cancel`).then(r => r.data);

// --- Blackouts ---
export const listBlackouts = () => api.get("/admin/blackouts").then(r => r.data);
export const addBlackout = ({ from, to, note }) =>
  api.post("/admin/blackouts", { from, to, note }).then(r => r.data);
export const removeBlackout = (id) =>
  api.delete(`/admin/blackouts/${id}`).then(r => r.data);

// --- Uploads ---
export const uploadImage = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/admin/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
};

export const uploadImages = async (files) => {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  const { data } = await api.post("/admin/upload/batch", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.urls || [];
};

// --- Stats ---
export const getStats = () => api.get("/admin/stats").then(r => r.data);

export const updateBookingAdmin = (id, payload) =>
  api.put(`/admin/bookings/${id}`, payload).then(r => r.data);

