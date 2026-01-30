import { io } from "socket.io-client";

/**
 * Single socket instance for admin app
 * Backend URL should point to your API server
 */
const SOCKET_URL = import.meta.env.PROD
? "https://gulposh-booking-system.onrender.com"
: "http://localhost:5000";


export const socket = io(SOCKET_URL, {
autoConnect: false,
withCredentials: true,
});
