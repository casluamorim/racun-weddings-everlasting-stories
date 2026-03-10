import imageCompression from "browser-image-compression";

const OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

export async function compressImage(file: File): Promise<File> {
  // Skip if already small enough
  if (file.size <= OPTIONS.maxSizeMB * 1024 * 1024) {
    return file;
  }
  return imageCompression(file, OPTIONS);
}
