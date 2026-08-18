import { supabase } from "@/integrations/supabase/client";

const MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
};

function extOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function mimeFromName(name: string) {
  const ext = extOf(name);
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".pdf") return "application/pdf";
  return "";
}

export function fileContentType(file: File) {
  return MIME_ALIASES[file.type] || file.type || mimeFromName(file.name);
}

export function isImagePath(path: string | null | undefined) {
  if (!path) return false;
  return /\.(jpe?g|png|webp|gif)$/i.test(path.split("?")[0] ?? "");
}

/** Aceita o caminho do objeto ou uma URL completa já gravada em image_url. */
export function storageObjectPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) return trimmed.replace(/^\/+/, "");
  try {
    const url = new URL(trimmed);
    const marker = "/object/";
    const idx = url.pathname.indexOf(marker);
    if (idx < 0) return trimmed;
    const parts = url.pathname.slice(idx + marker.length).split("/").filter(Boolean);
    // public|sign / bucket / ...object path
    if (parts.length >= 3) return decodeURIComponent(parts.slice(2).join("/"));
  } catch {
    return trimmed;
  }
  return trimmed;
}

export function sanitizeStoragePath(name: string) {
  const ext = extOf(name);
  const base =
    name
      .slice(0, name.length - ext.length)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "arquivo";
  return `${crypto.randomUUID()}-${base}${ext || ""}`;
}

export type StorageBucket = "inventario" | "notas" | "programacoes";

export async function uploadPrivateFile(bucket: StorageBucket, file: File) {
  const contentType = fileContentType(file);
  const path = sanitizeStoragePath(file.name);
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: contentType || undefined,
  });
  if (error) throw error;
  return path;
}

export async function signedFileUrl(bucket: StorageBucket, path: string) {
  const objectPath = storageObjectPath(path);
  if (!objectPath) return null;
  if (/^https?:\/\//i.test(objectPath)) return objectPath;
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function removePrivateFile(bucket: StorageBucket, path: string | null | undefined) {
  if (!path) return;
  const objectPath = storageObjectPath(path);
  if (!objectPath || /^https?:\/\//i.test(objectPath)) return;
  await supabase.storage.from(bucket).remove([objectPath]);
}
