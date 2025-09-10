import { api } from "./http";

// These are now /api/admin/login etc. because baseURL already ends with /admin
export const adminLogin  = (email, password) => api.post("/login", { email, password }).then(r => r.data);
export const adminLogout = () => api.post("/logout");
export const adminMe     = () => api.get("/me").then(r => r.data);

// Admin rooms live at /api/admin/rooms — do NOT prefix with /admin here
export const createRoom  = (payload) => api.post("/rooms", payload).then(r => r.data);

export const getStats = () => api.get("/stats").then(r => r.data);

export const listRooms = () => api.get("/rooms").then(r => r.data);
export const getRoomAdmin = async (id) => (await api.get(`/rooms/${id}`)).data;      
export const updateRoom = async (id, payload) => (await api.put(`/rooms/${id}`, payload)).data; 
export const deleteRoom = (id) => api.delete(`/rooms/${id}`).then(r => r.data);

export const listUsersAdmin = () => api.get("/users").then(r => r.data);
export const getUserAdminById = (id) => api.get(`/users/${id}`).then(r => r.data);
export const listUserBookingsAdmin = (id) => api.get(`/users/${id}/bookings`).then(r => r.data);
export const cancelBookingAdmin = (bookingId) => api.post(`/bookings/${bookingId}/cancel`).then(r => r.data);
export const listBookings = (params = {}) => api.get("/bookings", { params }).then(r => r.data);
export const listBookingsAdmin = (params) => api.get("/bookings", { params }).then(r => r.data);
export const cancelBooking = (bookingId) =>  api.patch(`/bookings/${bookingId}/cancel`).then(r => r.data);

export const listBlackouts = () => api.get("/blackouts").then(r => r.data);
export const addBlackout = ({ from, to, note }) =>
  api.post("/blackouts", { from, to, note }).then(r => r.data);
export const removeBlackout = (id) =>
  api.delete(`/blackouts/${id}`).then(r => r.data);
