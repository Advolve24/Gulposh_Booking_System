import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_ROOM_ID = "68bfda3761b116a1eea06b95";

export function slugifyRoomName(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getRoomPath(roomOrId, roomName = "") {
  const roomId =
    typeof roomOrId === "object" && roomOrId !== null ? roomOrId._id : roomOrId;
  const sourceName =
    typeof roomOrId === "object" && roomOrId !== null
      ? roomOrId.name || roomName
      : roomName;
  const slug = slugifyRoomName(sourceName);

  if (!roomId) {
    return "/";
  }

  return slug ? `/room/${roomId}/${slug}` : `/room/${roomId}`;
}

export const DEFAULT_ROOM_PATH = getRoomPath(DEFAULT_ROOM_ID, "villa-gulposh");
