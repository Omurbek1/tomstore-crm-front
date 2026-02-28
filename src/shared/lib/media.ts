import { toSafeExternalUrl } from "../../security/url";

export const toVideoEmbedUrl = (url?: string | null) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/youtube\.com\/watch\?v=/.test(value)) {
    const id = value.split("v=")[1]?.split("&")[0];
    return id ? `https://www.youtube.com/embed/${id}` : value;
  }
  if (/youtu\.be\//.test(value)) {
    const id = value.split("youtu.be/")[1]?.split("?")[0];
    return id ? `https://www.youtube.com/embed/${id}` : value;
  }
  return toSafeExternalUrl(value, { allowRelative: false });
};

export const isDirectVideoFile = (url?: string | null) =>
  /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(String(url || ""));
