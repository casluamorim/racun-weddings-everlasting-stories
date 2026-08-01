import imageCompression from "browser-image-compression";

const OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 2560,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

/** Limite de entrada por arquivo (antes da conversão). */
export const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;

/** Sempre converte para WebP (mesmo arquivos pequenos), reduzindo peso e padronizando o formato. */
export async function compressImage(file: File): Promise<File> {
  try {
    return await imageCompression(file, OPTIONS);
  } catch {
    return file;
  }
}

/**
 * Executa tarefas com concorrência limitada — permite subir muitas fotos de uma vez
 * sem travar o navegador nem estourar a rede.
 */
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}
