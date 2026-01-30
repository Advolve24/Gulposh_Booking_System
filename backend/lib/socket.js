import { Server } from "socket.io";

let io;
const onlineAdmins = new Set();

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174", // ADMIN
        "https://gulposhadminsystem.netlify.app",
        "https://gulposhbookingsystem.netlify.app",
      ],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("admin:online", () => {
      onlineAdmins.add(socket.id);
      console.log("🟢 Admin connected");
    });

    socket.on("disconnect", (reason) => {
      onlineAdmins.delete(socket.id);
      console.log("🔴 Socket disconnected:", reason);
    });
  });

  return io;
};

export const emitAdmin = (event, payload) => {
  if (!io) return;
  io.emit(event, payload);
};

export const hasOnlineAdmins = () => onlineAdmins.size > 0;
