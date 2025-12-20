import { api } from "./http";

export const getMyProfile = () =>
  api.get("/auth/me").then((r) => r.data);

export const updateMyProfile = (payload) =>
  api.put("/auth/me", payload).then((r) => r.data);
