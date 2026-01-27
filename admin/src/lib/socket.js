import { io } from "socket.io-client";

/**
 * Single socket instance for admin app
 * Backend URL should point to your API server
 */
export const socket = io(
  import.meta.env.VITE_API_URL || "http://localhost:5000",
  {
    withCredentials: true,
    autoConnect: false,   // 🔑 IMPORTANT
  }
);

