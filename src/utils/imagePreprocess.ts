export interface BoundingBoxInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  imageWidth: number;
  imageHeight: number;
  normalizedX: number;
  normalizedY: number;
  normalizedWidth: number;
  normalizedHeight: number;
  normalizedCenterX: number;
  normalizedCenterY: number;
}

export const calculateTransparentImageBoundingBox = async (
  imageUrl: string
): Promise<BoundingBoxInfo> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get 2d context"));
        return;
      }
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;
      let hasVisiblePixels = false;

      // Loop through pixels
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 10) {
            hasVisiblePixels = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (!hasVisiblePixels) {
        // Fallback to full image if entirely transparent or empty
        minX = 0;
        minY = 0;
        maxX = canvas.width;
        maxY = canvas.height;
      }

      const width = maxX - minX;
      const height = maxY - minY;
      const centerX = minX + width / 2;
      const centerY = minY + height / 2;

      resolve({
        x: minX,
        y: minY,
        width,
        height,
        centerX,
        centerY,
        imageWidth: canvas.width,
        imageHeight: canvas.height,
        normalizedX: minX / canvas.width,
        normalizedY: minY / canvas.height,
        normalizedWidth: width / canvas.width,
        normalizedHeight: height / canvas.height,
        normalizedCenterX: centerX / canvas.width,
        normalizedCenterY: centerY / canvas.height,
      });
    };
    img.onerror = () => {
      reject(new Error("Failed to load image for bounding box calculation."));
    };
    img.src = imageUrl;
  });
};

export async function renderCropCanvasToDataUrl(params: {
  imageUrl: string;
  cropBox: { x: number; y: number; width: number; height: number };
  imageTransform: { x: number; y: number; scale: number };
  viewportSize: { width: number; height: number };
  targetSize: number;
  backgroundColor?: string;
  mimeType?: "image/jpeg" | "image/png";
  quality?: number;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const {
      imageUrl,
      cropBox,
      imageTransform,
      targetSize,
      backgroundColor = "#ffffff",
      mimeType = "image/jpeg",
      quality = 0.95,
    } = params;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Failed to create canvas context"));
      }

      if (Math.abs(cropBox.width - cropBox.height) > 1) {
        return reject(new Error("裁剪输入必须为 1:1 方形，不能使用非等比裁剪框。"));
      }

      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scaleToOutput = targetSize / cropBox.width;

      // Calculate where the original image should be drawn in the targeted canvas
      // imageTransform.x/y is the top-left of the image in the viewport
      const dx = (imageTransform.x - cropBox.x) * scaleToOutput;
      const dy = (imageTransform.y - cropBox.y) * scaleToOutput;
      const dw = img.naturalWidth * imageTransform.scale * scaleToOutput;
      const dh = img.naturalHeight * imageTransform.scale * scaleToOutput;

      ctx.drawImage(img, dx, dy, dw, dh);
      resolve(canvas.toDataURL(mimeType, quality));
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = imageUrl;
  });
}

