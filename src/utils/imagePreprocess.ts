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

export type RawImageAutoCropResult = {
  bbox: BoundingBoxInfo;
  confidence: number;
  method: "alpha" | "background-diff" | "fallback";
  warnings: string[];
};

export function calculateRawImageAutoCropBox(
  imageUrl: string,
  options?: {
    maxDetectSize?: number;
    paddingRatio?: number;
    alphaThreshold?: number;
    backgroundDiffThreshold?: number;
  }
): Promise<RawImageAutoCropResult> {
  return new Promise((resolve, reject) => {
    const {
      maxDetectSize = 768,
      alphaThreshold = 10,
      backgroundDiffThreshold = 45,
    } = options || {};

    const img = new Image();
    if (!imageUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      try {
        const warnings: string[] = [];
        const originalWidth = img.naturalWidth;
        const originalHeight = img.naturalHeight;
        
        let detectScale = 1;
        if (originalWidth > maxDetectSize || originalHeight > maxDetectSize) {
          detectScale = maxDetectSize / Math.max(originalWidth, originalHeight);
        }
        
        const detectWidth = Math.round(originalWidth * detectScale);
        const detectHeight = Math.round(originalHeight * detectScale);
        
        const canvas = document.createElement("canvas");
        canvas.width = detectWidth;
        canvas.height = detectHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        if (!ctx) {
          warnings.push("无法获取 Canvas 上下文");
          resolve(fallbackResult(originalWidth, originalHeight, warnings));
          return;
        }

        ctx.drawImage(img, 0, 0, detectWidth, detectHeight);
        
        let imageData: ImageData;
        try {
          imageData = ctx.getImageData(0, 0, detectWidth, detectHeight);
        } catch (e) {
          warnings.push("跨域或画布污染导致无法读取像素数据");
          resolve(fallbackResult(originalWidth, originalHeight, warnings));
          return;
        }

        const data = imageData.data;
        const totalPixels = detectWidth * detectHeight;
        
        // 检查 Alpha
        let hasAlpha = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            hasAlpha = true;
            break;
          }
        }

        const isForeground = new Uint8Array(totalPixels);
        let foregroundCount = 0;
        let method: "alpha" | "background-diff" = "background-diff";

        if (hasAlpha) {
          method = "alpha";
          for (let i = 0; i < totalPixels; i++) {
            if (data[i * 4 + 3] > alphaThreshold) {
              isForeground[i] = 1;
              foregroundCount++;
            }
          }
        } else {
          method = "background-diff";
          // 采样背景颜色 (四周 3% 边缘)
          const edgeSamples: {r: number, g: number, b: number}[] = [];
          const edgeX = Math.max(1, Math.round(detectWidth * 0.03));
          const edgeY = Math.max(1, Math.round(detectHeight * 0.03));
          
          for (let y = 0; y < detectHeight; y++) {
            for (let x = 0; x < detectWidth; x++) {
              if (x < edgeX || x >= detectWidth - edgeX || y < edgeY || y >= detectHeight - edgeY) {
                const idx = (y * detectWidth + x) * 4;
                edgeSamples.push({ r: data[idx], g: data[idx+1], b: data[idx+2] });
              }
            }
          }
          
          if (edgeSamples.length > 0) {
            edgeSamples.sort((a, b) => a.r - b.r);
            const medR = edgeSamples[Math.floor(edgeSamples.length / 2)].r;
            edgeSamples.sort((a, b) => a.g - b.g);
            const medG = edgeSamples[Math.floor(edgeSamples.length / 2)].g;
            edgeSamples.sort((a, b) => a.b - b.b);
            const medB = edgeSamples[Math.floor(edgeSamples.length / 2)].b;
            
            for (let i = 0; i < totalPixels; i++) {
              const idx = i * 4;
              const diff = Math.abs(data[idx] - medR) + Math.abs(data[idx+1] - medG) + Math.abs(data[idx+2] - medB);
              if (diff > backgroundDiffThreshold) {
                isForeground[i] = 1;
                foregroundCount++;
              }
            }
          }
        }

        const foregroundRatio = foregroundCount / totalPixels;
        if (foregroundRatio < 0.02) {
          warnings.push("检测到的前景区域过小 (< 2%)");
        } else if (foregroundRatio > 0.85) {
          warnings.push("检测到的前景区域过大 (> 85%)");
        }

        let minX = detectWidth;
        let minY = detectHeight;
        let maxX = 0;
        let maxY = 0;
        let actualForeground = 0;

        for (let y = 0; y < detectHeight; y++) {
          for (let x = 0; x < detectWidth; x++) {
            if (isForeground[y * detectWidth + x]) {
              actualForeground++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (actualForeground === 0) {
          warnings.push("未检测到有效前景");
          resolve(fallbackResult(originalWidth, originalHeight, warnings));
          return;
        }

        const origMinX = minX / detectScale;
        const origMinY = minY / detectScale;
        const origMaxX = maxX / detectScale;
        const origMaxY = maxY / detectScale;
        
        const bboxWidth = Math.max(1, origMaxX - origMinX);
        const bboxHeight = Math.max(1, origMaxY - origMinY);
        const bboxCenterX = origMinX + bboxWidth / 2;
        const bboxCenterY = origMinY + bboxHeight / 2;
        
        let confidence = 1.0;
        if (foregroundRatio < 0.02 || foregroundRatio > 0.85) {
          confidence *= 0.5;
        }

        if (minX <= 2 || minY <= 2 || maxX >= detectWidth - 3 || maxY >= detectHeight - 3) {
          warnings.push("产品可能贴边");
          confidence *= 0.8;
        }

        resolve({
          bbox: {
            x: origMinX,
            y: origMinY,
            width: bboxWidth,
            height: bboxHeight,
            centerX: bboxCenterX,
            centerY: bboxCenterY,
            imageWidth: originalWidth,
            imageHeight: originalHeight,
            normalizedX: origMinX / originalWidth,
            normalizedY: origMinY / originalHeight,
            normalizedWidth: bboxWidth / originalWidth,
            normalizedHeight: bboxHeight / originalHeight,
            normalizedCenterX: bboxCenterX / originalWidth,
            normalizedCenterY: bboxCenterY / originalHeight,
          },
          confidence,
          method,
          warnings,
        });

      } catch (err) {
        resolve(fallbackResult(img.naturalWidth, img.naturalHeight, [(err as Error).message]));
      }
    };
    img.onerror = () => {
      resolve(fallbackResult(1000, 1000, ["图片加载失败"]));
    };
    img.src = imageUrl;
  });
}

function fallbackResult(imageWidth: number, imageHeight: number, warnings: string[]): RawImageAutoCropResult {
  return {
    bbox: {
      x: 0,
      y: 0,
      width: imageWidth,
      height: Math.max(1, imageHeight),
      centerX: imageWidth / 2,
      centerY: Math.max(1, imageHeight) / 2,
      imageWidth,
      imageHeight: Math.max(1, imageHeight),
      normalizedX: 0,
      normalizedY: 0,
      normalizedWidth: 1,
      normalizedHeight: 1,
      normalizedCenterX: 0.5,
      normalizedCenterY: 0.5,
    },
    confidence: 0,
    method: "fallback",
    warnings,
  };
}

export function calculateTransparentImageBoundingBox(
  imageUrl: string
): Promise<BoundingBoxInfo> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!imageUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
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

export function renderCropCanvasToDataUrl(params: {
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
    if (!imageUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
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

