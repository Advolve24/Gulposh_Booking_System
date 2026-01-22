import { Server } from "socket.io";

let io;
let onlineAdmins = 0;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://gulposhadminsystem.netlify.app",
      ],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    onlineAdmins++;
    console.log("🟢 Admin connected:", socket.id);

    socket.on("disconnect", () => {
      onlineAdmins--;
      console.log("🔴 Admin disconnected:", socket.id);
    });
  });
}

export function emitAdmin(event, payload) {
  if (io) io.emit(event, payload);
}

export function hasOnlineAdmins() {
  return onlineAdmins > 0;
}
