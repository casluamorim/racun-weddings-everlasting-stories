import { supabase } from "@/integrations/supabase/client";
import imageCompression from "browser-image-compression";

export const GALLERY_BUCKET = "galleries";

export const paths = {
  original: (gid: string, file: string) => `${gid}/original/${file}`,
  web: (gid: string, file: string) => `${gid}/web/${file}`,
  thumb: (gid: string, file: string) => `${gid}/thumbs/${file}`,
  hero: (gid: string, file: string) => `${gid}/hero/${file}`,
  videoOriginal: (gid: string, file: string) => `${gid}/videos-original/${file}`,
  videoWeb: (gid: string, file: string) => `${gid}/videos-web/${file}`,
};

export async function compressForWeb(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 2400,
    useWebWorker: true,
    fileType: "image/webp",
  });
}

export async function compressForThumb(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.15,
    maxWidthOrHeight: 600,
    useWebWorker: true,
    fileType: "image/webp",
  });
}

export async function uploadWithRetry(path: string, file: Blob | File, retries = 3): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: (file as File).type || "application/octet-stream",
    });
    if (!error) return;
    lastErr = error;
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw lastErr;
}

export async function signedUrls(pathsList: string[], expiresIn = 3600): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  // chunk to keep URL/payload small
  const chunkSize = 100;
  for (let i = 0; i < pathsList.length; i += chunkSize) {
    const chunk = pathsList.slice(i, i + chunkSize);
    const { data, error } = await supabase.storage.from(GALLERY_BUCKET).createSignedUrls(chunk, expiresIn);
    if (error) throw error;
    data?.forEach((d) => {
      if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
    });
  }
  return out;
}

export function randomFilename(originalName: string, forcedExt?: string): string {
  const ext = forcedExt ?? originalName.split(".").pop() ?? "bin";
  const id = crypto.randomUUID().replace(/-/g, "");
  return `${id}.${ext}`;
}

export function generateAccessToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
