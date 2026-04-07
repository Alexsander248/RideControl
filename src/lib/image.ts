const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Falha ao ler imagem."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Falha ao ler imagem."));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao processar imagem."));
    img.src = src;
  });

export const getOptimizedImageDataUrl = async (
  file: File,
  maxDimension = 960,
  quality = 0.8,
) => {
  const sourceDataUrl = await readFileAsDataUrl(file);

  // SVG should remain untouched to avoid rasterizing vectors.
  if (file.type === "image/svg+xml") {
    return sourceDataUrl;
  }

  const img = await loadImage(sourceDataUrl);
  const largestSide = Math.max(img.width, img.height) || 1;
  const scale = Math.min(1, maxDimension / largestSide);

  const targetWidth = Math.max(1, Math.round(img.width * scale));
  const targetHeight = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return sourceDataUrl;
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", quality);
};
