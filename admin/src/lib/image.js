import { api } from "../api/http";

const getApiOrigin = () => {
  const baseURL = api.defaults.baseURL || "";

  if (!baseURL) {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  }

  try {
    const parsed = new URL(baseURL, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return parsed.origin;
  } catch {
    return "";
  }
};

const toApiUploadsPath = (pathname = "") => {
  if (pathname.startsWith("/api/uploads/")) return pathname;
  if (pathname.startsWith("/uploads/")) {
    return pathname.replace(/^\/uploads\//, "/api/uploads/");
  }
  return pathname;
};

export function resolveImageUrl(value) {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const apiOrigin = getApiOrigin();

  if (raw.startsWith("/")) {
    const normalizedPath = toApiUploadsPath(raw);
    return apiOrigin ? `${apiOrigin}${normalizedPath}` : normalizedPath;
  }

  try {
    const parsed = new URL(raw);
    const normalizedPath = toApiUploadsPath(parsed.pathname);

    if (normalizedPath !== parsed.pathname) {
      return apiOrigin ? `${apiOrigin}${normalizedPath}` : `${parsed.origin}${normalizedPath}`;
    }

    return raw;
  } catch {
    return raw;
  }
}

export function normalizeImageList(values = []) {
  return [...new Set((values || []).map(resolveImageUrl).filter(Boolean))];
}
