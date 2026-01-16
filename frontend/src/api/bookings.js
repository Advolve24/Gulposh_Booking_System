import { api } from "./http";

export const getMyBookings = async () => {
  const { data } = await api.get("/bookings/mine");
  return data;
};

export const getBooking = async (id) => {
  const { data } = await api.get(`/bookings/${id}`);
  return data;
};

export const cancelBooking = async (id) => {
  const { data } = await api.post(`/bookings/${id}/cancel`);
  return data;
};

export const getBlackouts = async () => {
  const { data } = await api.get("/blackouts");
  return data;
};
