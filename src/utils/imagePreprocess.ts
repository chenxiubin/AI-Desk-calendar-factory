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

export const calculateTransparentImageBoundingBox = async (imageUrl: string): Promise<BoundingBoxInfo | null> => {
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
