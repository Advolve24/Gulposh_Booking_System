import { api } from "./http";

export const getMyBookings = async () => {
  const { data } = await api.get("/bookings/mine");
  return data;
};

export const getBooking = async (id) => {
  const { data } = await api.get(`/bookings/${id}`);
  return data;
};

export const cancelBooking = async (id, payload) => {
  const { data } = await api.post(`/bookings/${id}/cancel`, payload);
  return data;
};

export const getBlackouts = async () => {
  const { data } = await api.get("/blackouts");
  return data;
};

export const getMyEnquiries = async () => {
  const { data } = await api.get("/enquiries/my");
  return data;
};