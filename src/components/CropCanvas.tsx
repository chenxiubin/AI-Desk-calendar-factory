import React, { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize, Target, RotateCcw, Wand2 } from "lucide-react";
import { 
  calculateRawImageAutoCropBox, 
  RawImageAutoCropResult 
} from "../utils/imagePreprocess";

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageTransform {
  x: number;
  y: number;
  scale: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface CropCanvasState {
  cropBox: CropBox;
  imageTransform: ImageTransform;
  viewportSize: ViewportSize;
}

export interface CropCanvasProps {
  imageUrl: string;
  targetSize: number;
  cropAspectLocked: boolean;
  snapEnabled: boolean;
  locked?: boolean;
  mode?: "simple" | "advanced";
  autoCropOnLoad?: boolean;
  safetyPaddingRatio?: number;
  onAutoCropResult?: (result: RawImageAutoCropResult) => void;
  onStateChange: (state: CropCanvasState) => void;
}

type DragMode =
  | "none"
  | "image"
  | "crop"
  | "resize-nw"
  | "resize-ne"
  | "resize-sw"
  | "resize-se";

type AutoCropDebugState = {
  confidence: number;
  method: RawImageAutoCropResult["method"];
  warnings: string[];
  applied: boolean;
  reason: string;
  bbox: RawImageAutoCropResult["bbox"];
};

type SubjectGuideMode = "off" | "drawing" | "editing";

type SubjectGuideBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const CropCanvas: React.FC<CropCanvasProps> = ({
  imageUrl,
  targetSize,
  cropAspectLocked,
  snapEnabled,
  locked = false,
  mode = "simple",
  autoCropOnLoad = true,
  safetyPaddingRatio = 0.1,
  onAutoCropResult,
  onStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [imageTransform, setImageTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  // CropBox is in viewport coordinates
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });

  const [isReady, setIsReady] = useState(false);
  const [isAutoCropping, setIsAutoCropping] = useState(false);
  const [lastAutoCroppedImageUrl, setLastAutoCroppedImageUrl] = useState("");
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [debugAutoBBox, setDebugAutoBBox] = useState<RawImageAutoCropResult["bbox"] | null>(null);
  const [autoCropDebug, setAutoCropDebug] = useState<AutoCropDebugState | null>(null);
  const activeAutoCropRunIdRef = useRef<string | null>(null);
  
  const [subjectGuideMode, setSubjectGuideMode] = useState<SubjectGuideMode>("off");
  const [subjectGuideBox, setSubjectGuideBox] = useState<SubjectGuideBox | null>(null);
  const subjectGuideStartRef = useRef<{ x: number; y: number } | null>(null);

  // Refs for native event listener
  const zoomRef = useRef(zoom);
  const baseScaleRef = useRef(baseScale);
  const imageTransformRef = useRef(imageTransform);
  const cropBoxRef = useRef(cropBox);
  const lockedRef = useRef(locked);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { baseScaleRef.current = baseScale; }, [baseScale]);
  useEffect(() => { imageTransformRef.current = imageTransform; }, [imageTransform]);
  useEffect(() => { cropBoxRef.current = cropBox; }, [cropBox]);
  useEffect(() => { lockedRef.current = locked; }, [locked]);

  // Interaction State
  const dragModeRef = useRef<DragMode>("none");
  const [dragMode, setDragMode] = useState<DragMode>("none");
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initTransformRef = useRef<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const initCropBoxRef = useRef<CropBox>({ x: 0, y: 0, width: 0, height: 0 });

  const safeSetPointerCapture = (pointerId: number) => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!el.hasPointerCapture(pointerId)) {
        el.setPointerCapture(pointerId);
      }
    } catch {
      // ignore
    }
  };

  const safeReleasePointerCapture = (pointerId: number) => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (el.hasPointerCapture(pointerId)) {
        el.releasePointerCapture(pointerId);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize(prev => {
          if (prev.width === rect.width && prev.height === rect.height) return prev;
          return { width: rect.width, height: rect.height };
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const resetCanvasToFit = useCallback((): CropBox | undefined => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const rect = container.getBoundingClientRect();
    const viewportWidth = rect.width;
    const viewportHeight = rect.height;

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    if (
      viewportWidth <= 0 ||
      viewportHeight <= 0 ||
      naturalWidth <= 0 ||
      naturalHeight <= 0
    ) {
      return;
    }

    const cropSize = Math.min(viewportWidth, viewportHeight) * 0.78;

    const nextCropBox = {
      x: (viewportWidth - cropSize) / 2,
      y: (viewportHeight - cropSize) / 2,
      width: cropSize,
      height: cropSize,
    };

    const safeWidth = cropSize * 0.84;
    const safeHeight = cropSize * 0.84;

    const nextBaseScale = Math.min(
      safeWidth / naturalWidth,
      safeHeight / naturalHeight,
    );

    const displayWidth = naturalWidth * nextBaseScale;
    const displayHeight = naturalHeight * nextBaseScale;

    const nextImageTransform = {
      x: nextCropBox.x + (nextCropBox.width - displayWidth) / 2,
      y: nextCropBox.y + (nextCropBox.height - displayHeight) / 2,
      scale: nextBaseScale,
    };

    setViewportSize({
      width: viewportWidth,
      height: viewportHeight,
    });

    setCropBox(nextCropBox);
    setBaseScale(nextBaseScale);
    setZoom(1);
    setImageTransform(nextImageTransform);
    setIsReady(true);

    return nextCropBox;
  }, []);

  const applyAutoCropResult = useCallback((bbox: RawImageAutoCropResult["bbox"], overrideCropBox?: CropBox) => {
    const cb = overrideCropBox || cropBox;
    if (!imgRef.current || !containerRef.current || cb.width === 0) return;
    
    const safeWidth = cb.width * (1 - safetyPaddingRatio * 2);
    const safeHeight = cb.height * (1 - safetyPaddingRatio * 2);

    const scale = Math.min(
      safeWidth / bbox.width,
      safeHeight / bbox.height
    );

    const cropCenterX = cb.x + cb.width / 2;
    const cropCenterY = cb.y + cb.height / 2;

    const bboxCenterX = bbox.x + bbox.width / 2;
    const bboxCenterY = bbox.y + bbox.height / 2;

    const imageX = cropCenterX - bboxCenterX * scale;
    const imageY = cropCenterY - bboxCenterY * scale;

    setBaseScale(isNaN(scale) ? 1 : scale);
    setZoom(1);
    setImageTransform({
      x: isNaN(imageX) ? 0 : imageX,
      y: isNaN(imageY) ? 0 : imageY,
      scale: isNaN(scale) ? 1 : scale,
    });
  }, [cropBox, safetyPaddingRatio]);

  const fitProductToCropBox = useCallback((overrideCropBox?: CropBox) => {
    if (locked || !imgRef.current || !containerRef.current) return;
    const iw = imgRef.current.naturalWidth;
    const ih = imgRef.current.naturalHeight;
    const cb = overrideCropBox || cropBox;
    if (cb.width === 0) return;
    
    const safeCropW = cb.width * 0.84;
    const safeCropH = cb.height * 0.84;
    
    const initialBaseScale = Math.min(safeCropW / iw, safeCropH / ih);
    
    const scaledW = iw * initialBaseScale;
    const scaledH = ih * initialBaseScale;
    const cx = cb.x + cb.width / 2;
    const cy = cb.y + cb.height / 2;
    
    const x = cx - scaledW / 2;
    const y = cy - scaledH / 2;
    
    setBaseScale(isNaN(initialBaseScale) ? 1 : initialBaseScale);
    setZoom(1);
    setImageTransform(prev => ({ 
      ...prev, 
      x: isNaN(x) ? 0 : x, 
      y: isNaN(y) ? 0 : y, 
      scale: isNaN(initialBaseScale) ? 1 : initialBaseScale 
    }));
  }, [locked, cropBox]);

  const fitCropBoxToSubjectBBox = useCallback(
    (
      bbox: RawImageAutoCropResult["bbox"],
      options?: {
        paddingRatio?: number;
        minSize?: number;
        maxSizeRatio?: number;
      },
    ): CropBox | undefined => {
      const img = imgRef.current;
      if (!img) return;

      const currentTransform = imageTransformRef.current;
      const viewport = viewportSize;

      if (
        !currentTransform ||
        currentTransform.scale <= 0 ||
        viewport.width <= 0 ||
        viewport.height <= 0 ||
        bbox.width <= 0 ||
        bbox.height <= 0
      ) {
        return;
      }

      const paddingRatio = options?.paddingRatio ?? safetyPaddingRatio;
      const minSize = options?.minSize ?? 80;
      const maxSizeRatio = options?.maxSizeRatio ?? 0.92;

      // 原图 bbox 转 viewport 坐标
      const subjectViewportBox = {
        x: currentTransform.x + bbox.x * currentTransform.scale,
        y: currentTransform.y + bbox.y * currentTransform.scale,
        width: bbox.width * currentTransform.scale,
        height: bbox.height * currentTransform.scale,
      };

      const subjectCenterX =
        subjectViewportBox.x + subjectViewportBox.width / 2;
      const subjectCenterY =
        subjectViewportBox.y + subjectViewportBox.height / 2;

      // 根据主体较长边生成 1:1 裁剪框，并加入安全边距
      const subjectMaxSide = Math.max(
        subjectViewportBox.width,
        subjectViewportBox.height,
      );

      const paddedSize = subjectMaxSide / Math.max(0.1, 1 - paddingRatio * 2);

      const maxSize = Math.min(viewport.width, viewport.height) * maxSizeRatio;

      const cropSize = Math.max(
        minSize,
        Math.min(paddedSize, maxSize),
      );

      const nextCropBox: CropBox = {
        x: subjectCenterX - cropSize / 2,
        y: subjectCenterY - cropSize / 2,
        width: cropSize,
        height: cropSize,
      };

      setCropBox(nextCropBox);

      return nextCropBox;
    },
    [viewportSize, safetyPaddingRatio],
  );

  const applySubjectBBoxToCanvas = useCallback(
    (
      bbox: RawImageAutoCropResult["bbox"],
      source: "auto" | "manual",
    ) => {
      const nextCropBox = fitCropBoxToSubjectBBox(bbox, {
        paddingRatio: safetyPaddingRatio,
      });

      const effectiveCropBox = nextCropBox || cropBoxRef.current;

      // 再确保主体在裁剪框安全区内
      applyAutoCropResult(bbox, effectiveCropBox);

      setDebugAutoBBox(bbox);

      setAutoCropDebug({
        confidence: source === "manual" ? 1 : 0.8,
        method: source === "manual" ? "manual-roi" : "background-diff",
        warnings:
          source === "manual"
            ? ["已使用手动主体框"]
            : ["已根据自动识别主体匹配裁剪框"],
        applied: true,
        reason:
          source === "manual"
            ? "已根据手动主体框自动匹配 1:1 裁剪框"
            : "已根据自动识别主体自动匹配 1:1 裁剪框",
        bbox,
      });

      onAutoCropResult?.({
        bbox,
        confidence: source === "manual" ? 1 : 0.8,
        method: source === "manual" ? "manual-roi" : "background-diff",
        warnings:
          source === "manual"
            ? ["已使用手动主体框"]
            : ["已根据自动识别主体匹配裁剪框"],
      });
    },
    [
      fitCropBoxToSubjectBBox,
      applyAutoCropResult,
      safetyPaddingRatio,
      onAutoCropResult,
    ],
  );

  const handleAutoCropResult = useCallback((
    result: RawImageAutoCropResult,
    currentCropBox?: CropBox,
  ) => {
    const isFallback = result.method === "fallback";
  
    const isWholeImage =
      result.bbox.normalizedWidth > 0.92 &&
      result.bbox.normalizedHeight > 0.92;
  
    const shouldApply =
      !isFallback &&
      !isWholeImage &&
      result.confidence >= 0.45;
  
    setDebugAutoBBox(result.bbox);
  
    setAutoCropDebug({
      confidence: result.confidence,
      method: result.method,
      warnings: result.warnings,
      applied: shouldApply,
      reason: shouldApply
        ? "已应用主体 bbox"
        : isFallback
          ? "自动识别失败，复杂背景建议使用手动框选主体"
          : isWholeImage
            ? "bbox 接近整图，复杂背景建议使用手动框选主体"
            : "confidence 过低，建议使用手动框选主体",
      bbox: result.bbox,
    });
  
    console.log("[CropCanvas] auto crop result", {
      confidence: result.confidence,
      method: result.method,
      bbox: result.bbox,
      normalized: {
        x: result.bbox.normalizedX,
        y: result.bbox.normalizedY,
        w: result.bbox.normalizedWidth,
        h: result.bbox.normalizedHeight,
      },
      warnings: result.warnings,
      applied: shouldApply,
    });
  
    if (shouldApply) {
      applySubjectBBoxToCanvas(result.bbox, "auto");
    } else {
      fitProductToCropBox(currentCropBox);
    }
  }, [applySubjectBBoxToCanvas, fitProductToCropBox]);

  const autoDetectProduct = useCallback(async (currentCropBox?: CropBox, runId?: string) => {
    if (locked || isAutoCropping || !imgRef.current || !containerRef.current) return;

    const currentRunId = runId || crypto.randomUUID();
    activeAutoCropRunIdRef.current = currentRunId;

    setIsAutoCropping(true);

    try {
      const result = await calculateRawImageAutoCropBox(imageUrl, {
        paddingRatio: safetyPaddingRatio,
      });

      if (activeAutoCropRunIdRef.current !== currentRunId) {
        return;
      }

      handleAutoCropResult(result, currentCropBox);
      onAutoCropResult?.(result);
    } catch (err) {
      if (activeAutoCropRunIdRef.current === currentRunId) {
        const fallback = {
          confidence: 0,
          method: "fallback" as const,
          warnings: [(err as Error).message || "自动识别异常"],
          bbox: {
            x: 0,
            y: 0,
            width: imageSize.w || 1,
            height: imageSize.h || 1,
            centerX: (imageSize.w || 1) / 2,
            centerY: (imageSize.h || 1) / 2,
            imageWidth: imageSize.w || 1,
            imageHeight: imageSize.h || 1,
            normalizedX: 0,
            normalizedY: 0,
            normalizedWidth: 1,
            normalizedHeight: 1,
            normalizedCenterX: 0.5,
            normalizedCenterY: 0.5,
          },
        };

        handleAutoCropResult(fallback, currentCropBox);
        onAutoCropResult?.(fallback);
      }
    } finally {
      if (activeAutoCropRunIdRef.current === currentRunId) {
        setIsAutoCropping(false);
      }
    }
  }, [
    imageUrl,
    locked,
    isAutoCropping,
    safetyPaddingRatio,
    imageSize.w,
    imageSize.h,
    handleAutoCropResult,
    onAutoCropResult,
  ]);

  useEffect(() => {
    if (locked) return;
    if (!imageUrl) return;
    if (!imgRef.current?.complete) return;
    if (imageSize.w <= 0 || imageSize.h <= 0) return;
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
    if (imageUrl === lastAutoCroppedImageUrl) return;
  
    const runId = crypto.randomUUID();
    activeAutoCropRunIdRef.current = runId;
  
    const cb = resetCanvasToFit();
    if (!cb) return;
  
    async function run() {
      try {
        if (autoCropOnLoad) {
          await autoDetectProduct(cb, runId);
        } else {
          fitProductToCropBox(cb);
        }
      } finally {
        if (activeAutoCropRunIdRef.current === runId) {
          setLastAutoCroppedImageUrl(imageUrl);
        }
      }
    }
  
    run();
  }, [
    imageUrl,
    imageSize.w,
    imageSize.h,
    viewportSize.width,
    viewportSize.height,
    locked,
    autoCropOnLoad,
    lastAutoCroppedImageUrl,
    resetCanvasToFit,
    autoDetectProduct,
    fitProductToCropBox,
  ]);

  // Initialize bounds on image load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
  
    setImageSize({
      w: img.naturalWidth,
      h: img.naturalHeight,
    });
  
    setLastAutoCroppedImageUrl("");
    setDebugAutoBBox(null);
    setAutoCropDebug(null);
  };

  // Notify parent
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    if (!isReady) return;
    onStateChangeRef.current({
      cropBox,
      imageTransform,
      viewportSize,
    });
  }, [cropBox, imageTransform, viewportSize, isReady]);

  const snapThreshold = snapEnabled ? 10 : 0;

  const clampZoom = (z: number) => Math.max(0.1, Math.min(z, 4));

  const convertViewportGuideBoxToImageBBox = (
    guideBox: SubjectGuideBox,
  ): RawImageAutoCropResult["bbox"] => {
    const currentTransform = imageTransformRef.current;
    const imageWidth = imageSize.w;
    const imageHeight = imageSize.h;

    const imageX = (guideBox.x - currentTransform.x) / currentTransform.scale;
    const imageY = (guideBox.y - currentTransform.y) / currentTransform.scale;
    const imageW = guideBox.width / currentTransform.scale;
    const imageH = guideBox.height / currentTransform.scale;

    const x = Math.max(0, Math.min(imageWidth, imageX));
    const y = Math.max(0, Math.min(imageHeight, imageY));
    const right = Math.max(0, Math.min(imageWidth, imageX + imageW));
    const bottom = Math.max(0, Math.min(imageHeight, imageY + imageH));

    const width = Math.max(1, right - x);
    const height = Math.max(1, bottom - y);
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    return {
      x,
      y,
      width,
      height,
      centerX,
      centerY,
      imageWidth,
      imageHeight,
      normalizedX: x / imageWidth,
      normalizedY: y / imageHeight,
      normalizedWidth: width / imageWidth,
      normalizedHeight: height / imageHeight,
      normalizedCenterX: centerX / imageWidth,
      normalizedCenterY: centerY / imageHeight,
    };
  };

  const zoomAtPoint = useCallback(
    (anchorX: number, anchorY: number, nextZoom: number) => {
      const currentBaseScale = baseScaleRef.current;
      const currentTransform = imageTransformRef.current;

      if (!currentBaseScale || currentBaseScale === 0 || !currentTransform.scale) return;

      const clampedZoom = clampZoom(nextZoom);
      const nextScale = currentBaseScale * clampedZoom;
      const scaleRatio = nextScale / currentTransform.scale;

      const nextTransform = {
        x: anchorX - (anchorX - currentTransform.x) * scaleRatio,
        y: anchorY - (anchorY - currentTransform.y) * scaleRatio,
        scale: nextScale,
      };

      setZoom(clampedZoom);
      setImageTransform(nextTransform);
    },
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (event: WheelEvent) => {
      if (lockedRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      const rect = el.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;

      const currentZoom = zoomRef.current;
      const delta = event.deltaY > 0 ? 0.9 : 1.1;

      zoomAtPoint(anchorX, anchorY, currentZoom * delta);
    };

    el.addEventListener("wheel", handleNativeWheel, {
      passive: false,
    });

    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
    };
  }, [zoomAtPoint]);

  const handleZoom = (direction: "in" | "out") => {
    if (locked || baseScale === 0) return;
    const cb = cropBoxRef.current;
    const mx = cb.x + cb.width / 2;
    const my = cb.y + cb.height / 2;
    
    const delta = direction === "in" ? 1.1 : 0.9;
    zoomAtPoint(mx, my, zoomRef.current * delta);
  };

  const centerImage = useCallback(() => {
    if (locked || !imgRef.current || !containerRef.current) return;
    const iw = imgRef.current.naturalWidth * imageTransform.scale;
    const ih = imgRef.current.naturalHeight * imageTransform.scale;
    const cx = cropBox.x + cropBox.width / 2;
    const cy = cropBox.y + cropBox.height / 2;
    const x = cx - iw / 2;
    const y = cy - ih / 2;
    setImageTransform(prev => ({ ...prev, x, y }));
  }, [locked, imageTransform.scale, cropBox]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    if (locked) return;

    if (subjectGuideMode === "drawing") {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
    
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
    
      subjectGuideStartRef.current = { x: px, y: py };
      setSubjectGuideBox({
        x: px,
        y: py,
        width: 0,
        height: 0,
      });
      safeSetPointerCapture(e.pointerId);
      return;
    }

    dragModeRef.current = mode;
    setDragMode(mode);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initTransformRef.current = { ...imageTransform };
    initCropBoxRef.current = { ...cropBox };
    
    safeSetPointerCapture(e.pointerId);
  };

  const applySnapping = (cb: CropBox): CropBox => {
    if (!snapEnabled || !imgRef.current) return cb;
    let { x, y, width, height } = cb;
    const imgBounds = {
      l: imageTransform.x,
      t: imageTransform.y,
      r: imageTransform.x + imgRef.current.naturalWidth * imageTransform.scale,
      b: imageTransform.y + imgRef.current.naturalHeight * imageTransform.scale,
    };
    const centers = {
      cx: viewportSize.width / 2,
      cy: viewportSize.height / 2,
    };

    // Snap center
    if (Math.abs((x + width / 2) - centers.cx) < snapThreshold) {
      x = centers.cx - width / 2;
    }
    if (Math.abs((y + height / 2) - centers.cy) < snapThreshold) {
      y = centers.cy - height / 2;
    }

    // Snap edges
    if (Math.abs(x - imgBounds.l) < snapThreshold) x = imgBounds.l;
    if (Math.abs((x + width) - imgBounds.r) < snapThreshold) x = imgBounds.r - width;
    if (Math.abs(y - imgBounds.t) < snapThreshold) y = imgBounds.t;
    if (Math.abs((y + height) - imgBounds.b) < snapThreshold) y = imgBounds.b - height;

    return { x, y, width, height };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (locked) return;

    if (subjectGuideMode === "drawing" && subjectGuideStartRef.current) {
      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const start = subjectGuideStartRef.current;

      setSubjectGuideBox({
        x: Math.min(start.x, px),
        y: Math.min(start.y, py),
        width: Math.abs(px - start.x),
        height: Math.abs(py - start.y),
      });

      return;
    }

    const mode = dragModeRef.current;
    if (mode === "none") return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (mode === "image") {
      setImageTransform({
        ...initTransformRef.current,
        x: initTransformRef.current.x + dx,
        y: initTransformRef.current.y + dy,
      });
    } else if (mode === "crop") {
      let nx = initCropBoxRef.current.x + dx;
      let ny = initCropBoxRef.current.y + dy;
      setCropBox(applySnapping({ ...initCropBoxRef.current, x: nx, y: ny }));
    } else if (mode.startsWith("resize")) {
      let { x, y, width, height } = initCropBoxRef.current;

      if (mode === "resize-nw") {
        let d = cropAspectLocked ? Math.min(dx, dy) : 0;
        let ndx = cropAspectLocked ? d : dx;
        let ndy = cropAspectLocked ? d : dy;
        x += ndx;
        y += ndy;
        width -= ndx;
        height -= ndy;
      } else if (mode === "resize-ne") {
        let ndx = dx;
        let ndy = cropAspectLocked ? -dx : dy;
        y += ndy;
        width += ndx;
        height -= ndy;
      } else if (mode === "resize-sw") {
        let ndx = dx;
        let ndy = cropAspectLocked ? -dx : dy;
        x += ndx;
        width -= ndx;
        height += ndy;
      } else if (mode === "resize-se") {
        let d = cropAspectLocked ? Math.max(dx, dy) : 0;
        let ndx = cropAspectLocked ? d : dx;
        let ndy = cropAspectLocked ? d : dy;
        width += ndx;
        height += ndy;
      }

      // Ensure positive size
      if (width < 20) width = 20;
      if (height < 20) height = 20;

      // Force 1:1 if needed
      if (cropAspectLocked) {
        height = width;
      }

      setCropBox(applySnapping({ x, y, width, height }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (subjectGuideMode === "drawing") {
      subjectGuideStartRef.current = null;
      setSubjectGuideMode("editing");
      safeReleasePointerCapture(e.pointerId);
      return;
    }

    dragModeRef.current = "none";
    setDragMode("none");
    safeReleasePointerCapture(e.pointerId);
  };

  // Update cropBox to aspect 1:1 when locked
  useEffect(() => {
    if (cropAspectLocked && cropBox.width !== cropBox.height && cropBox.width > 0) {
      const min = Math.min(cropBox.width, cropBox.height);
      setCropBox((prev) => ({
        ...prev,
        width: min,
        height: min,
      }));
    }
  }, [cropAspectLocked]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none flex items-center justify-center cursor-move"
      style={{ 
        touchAction: "none",
        overscrollBehavior: "contain",
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23cbd5e1\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Crect x=\'0\' y=\'0\' width=\'10\' height=\'10\'/%3E%3Crect x=\'10\' y=\'10\' width=\'10\' height=\'10\'/%3E%3C/g%3E%3C/svg%3E")',
        backgroundColor: '#1e293b'
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => handlePointerDown(e, "image")}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Container to handle image transforms correctly without issues related to max width limits */}
      <div className="absolute top-0 left-0" style={{
        transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`,
        transformOrigin: "top left",
        opacity: isReady ? 1 : 0,
        zIndex: 0
      }}>
        <img
          ref={imgRef}
          src={imageUrl}
          onLoad={handleImageLoad}
          crossOrigin={imageUrl.startsWith("data:") || imageUrl.startsWith("blob:") ? undefined : "anonymous"}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="will-change-transform max-w-none max-h-none block"
          style={{
            width: imageSize.w > 0 ? `${imageSize.w}px` : 'auto',
            height: imageSize.h > 0 ? `${imageSize.h}px` : 'auto',
          }}
        />
      </div>

      {subjectGuideBox && (
        <div
          className="pointer-events-none absolute border-2 border-emerald-400 bg-emerald-400/10 z-10"
          style={{
            left: subjectGuideBox.x,
            top: subjectGuideBox.y,
            width: subjectGuideBox.width,
            height: subjectGuideBox.height,
          }}
        >
          <div className="absolute -top-5 left-0 bg-emerald-400 text-slate-900 text-[10px] px-1.5 py-0.5 rounded-sm font-medium">
            主体辅助框
          </div>
        </div>
      )}

      {debugAutoBBox && (
        <div
          className={`pointer-events-none absolute border-2 z-10 ${
            autoCropDebug?.applied
              ? "border-yellow-400"
              : autoCropDebug?.method === "fallback"
                ? "border-red-400"
                : "border-orange-400"
          }`}
          style={{
            left: imageTransform.x + debugAutoBBox.x * imageTransform.scale,
            top: imageTransform.y + debugAutoBBox.y * imageTransform.scale,
            width: debugAutoBBox.width * imageTransform.scale,
            height: debugAutoBBox.height * imageTransform.scale,
          }}
        />
      )}
      
      {/* Dimmed Overlay removed based on request */}

      {/* Crop Box UI */}
      {isReady && (
        <div
          className="absolute border border-blue-400"
          style={{
            left: cropBox.x,
            top: cropBox.y,
            width: cropBox.width,
            height: cropBox.height,
            boxShadow: '0 0 0 1px rgba(255,255,255,0.5)'
          }}
        >
          {/* Draggable Inner */}
          <div 
            className={`w-full h-full ${mode === "advanced" && !locked ? 'cursor-move' : ''}`}
            onPointerDown={(e) => {
              if (mode === "advanced") {
                e.stopPropagation();
                handlePointerDown(e, "crop");
              }
            }}
          />

          {mode === "simple" && (
            <>
              {/* Center Cross lines */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-full h-[1px] bg-white/40" />
                <div className="absolute h-full w-[1px] bg-white/40" />
              </div>
              {/* 8% safe margin */}
              <div className="absolute top-[8%] left-[8%] bottom-[8%] right-[8%] pointer-events-none border border-dashed border-red-400/60" />
              {/* Output Label */}
              <div className="absolute top-2 left-2 bg-slate-900/80 px-2 py-0.5 rounded text-[10px] text-white">
                {targetSize}×{targetSize} 输出框
              </div>
            </>
          )}

          {mode === "advanced" && (
            <>
              {/* Grid Lines */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border-white/20 divide-x divide-y divide-white/20 shadow-sm opacity-50">
                <div/><div/><div/><div/><div/><div/><div/><div/><div/>
              </div>

              {/* Handles */}
              <div 
                className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-300 rounded-sm cursor-nw-resize"
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, "resize-nw"); }}
              />
              <div 
                className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-300 rounded-sm cursor-ne-resize"
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, "resize-ne"); }}
              />
              <div 
                className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-slate-300 rounded-sm cursor-sw-resize"
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, "resize-sw"); }}
              />
              <div 
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-slate-300 rounded-sm cursor-se-resize"
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, "resize-se"); }}
              />
            </>
          )}
        </div>
      )}

      {autoCropDebug && (
        <div className="absolute top-4 right-4 z-20 bg-slate-900/90 backdrop-blur rounded-lg border border-slate-700 shadow-xl p-3 text-[10px] text-slate-300 pointer-events-none max-w-[220px]">
          <div className="font-medium text-white mb-1 flex items-center justify-between">
            <span>主体检测诊断</span>
            <span className={`w-1.5 h-1.5 rounded-full ${autoCropDebug.applied ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">状态:</span>
              <span className={autoCropDebug.applied ? "text-emerald-400" : "text-amber-400"}>
                {autoCropDebug.applied ? "已应用" : "未应用"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">模式:</span>
              <span>{autoCropDebug.method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">置信度:</span>
              <span>{(autoCropDebug.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="break-words mt-1 pt-1 border-t border-slate-700/50 text-amber-200 leading-tight">
              {autoCropDebug.reason}
            </div>
            {autoCropDebug.warnings.length > 0 && (
              <div className="mt-1 pt-1 border-t border-slate-700/50">
                {autoCropDebug.warnings.map((w, i) => (
                  <div key={i} className="text-rose-400 leading-tight mb-0.5">• {w}</div>
                ))}
              </div>
            )}
            <div className="text-[9px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-700/50">
              h: {(autoCropDebug.bbox.normalizedHeight * 100).toFixed(1)}%
              <br/>
              w: {(autoCropDebug.bbox.normalizedWidth * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {isReady && (
        <div 
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur text-white px-4 py-2 rounded-full border border-slate-700 shadow-xl z-20"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
             <button disabled={locked} onClick={() => handleZoom("out")} className={`p-1 rounded hover:bg-slate-800 ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
               <ZoomOut className="w-4 h-4 text-slate-300" />
             </button>
             <input 
               type="range" 
               disabled={locked}
               min="0.1" max="4" step="0.01"
               value={zoom}
               onChange={(e) => {
                 if (locked || baseScale === 0) return;
                 const nextZoom = Number(e.target.value);
                 
                 const cb = cropBoxRef.current;
                 const mx = cb.x + cb.width / 2;
                 const my = cb.y + cb.height / 2;
                 
                 zoomAtPoint(mx, my, nextZoom);
               }}
               className="w-20 accent-blue-500 disabled:opacity-50"
               onPointerDown={(e) => e.stopPropagation()}
             />
             <button disabled={locked} onClick={() => handleZoom("in")} className={`p-1 rounded hover:bg-slate-800 ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
               <ZoomIn className="w-4 h-4 text-slate-300" />
             </button>
             <span className="text-[10px] text-slate-400 font-mono w-[38px] text-right mr-1">
               {Math.round(zoom * 100)}%
             </span>
          </div>
          
          <div className="w-px h-4 bg-slate-700" />
          
          <button 
            type="button"
            disabled={locked || isAutoCropping}
            onClick={(e) => {
              e.stopPropagation();
              if (locked || isAutoCropping) return;
              
              const runId = crypto.randomUUID();
              activeAutoCropRunIdRef.current = runId;
              
              setDebugAutoBBox(null);
              setAutoCropDebug(null);
              
              const currentCropBox = cropBoxRef.current;
              if (!currentCropBox || currentCropBox.width <= 0) {
                const cb = resetCanvasToFit();
                if (cb) {
                  autoDetectProduct(cb, runId);
                }
                return;
              }
              autoDetectProduct(currentCropBox, runId);
            }}
            title="自动识别产品"
            className={`flex items-center gap-1 p-1.5 rounded transition-colors ${locked || isAutoCropping ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          >
            <Wand2 className={`w-4 h-4 ${isAutoCropping ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] hidden sm:inline">{isAutoCropping ? '识别中...' : '自动识别产品'}</span>
          </button>
          
          <button 
            type="button"
            disabled={locked}
            onClick={(e) => {
              e.stopPropagation();
              if (locked) return;
              fitProductToCropBox();
            }}
            title="完整适应原图"
            className={`flex items-center gap-1 p-1.5 rounded transition-colors ${locked ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          >
            <Maximize className="w-4 h-4" />
            <span className="text-[10px] hidden sm:inline">完整适应原图</span>
          </button>

          <div className="w-px h-4 bg-slate-700 mx-1 hidden sm:block" />

          {subjectGuideMode === "off" ? (
            <button 
              type="button"
              disabled={locked}
              onClick={(e) => {
                e.stopPropagation();
                if (locked) return;
                setSubjectGuideMode("drawing");
                setSubjectGuideBox(null);
              }}
              title="手动框选主体"
              className={`flex items-center gap-1 p-1.5 rounded transition-colors ${locked ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
            >
              <Target className="w-4 h-4" />
              <span className="text-[10px] hidden sm:inline">手动辅助框选</span>
            </button>
          ) : (
            <>
              <button 
                type="button"
                disabled={locked || !subjectGuideBox || subjectGuideBox.width < 20 || subjectGuideBox.height < 20}
                onClick={(e) => {
                  e.stopPropagation();
                  if (locked || !subjectGuideBox) return;
                  
                  const bbox = convertViewportGuideBoxToImageBBox(subjectGuideBox);
                  applySubjectBBoxToCanvas(bbox, "manual");
                  
                  setSubjectGuideMode("off");
                  setSubjectGuideBox(null);
                }}
                className={`flex items-center gap-1 p-1.5 rounded transition-colors ${(!subjectGuideBox || subjectGuideBox.width < 20) ? 'text-slate-600 cursor-not-allowed' : 'text-emerald-400 hover:bg-emerald-400/20'}`}
              >
                <span className="text-[10px] hidden sm:inline">应用框选</span>
              </button>
              
              <button 
                type="button"
                disabled={locked}
                onClick={(e) => {
                  e.stopPropagation();
                  setSubjectGuideMode("off");
                  setSubjectGuideBox(null);
                }}
                className="flex items-center gap-1 p-1.5 rounded transition-colors text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-[10px] hidden sm:inline">取消框选</span>
              </button>
            </>
          )}
          
          <button 
            type="button"
            disabled={locked}
            onClick={(e) => {
              e.stopPropagation();
              if (locked) return;
              centerImage();
            }}
            title="居中"
            className={`flex items-center gap-1 p-1.5 rounded transition-colors ${locked ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          >
            <Target className="w-4 h-4" />
            <span className="text-[10px] hidden sm:inline">居中</span>
          </button>

          <div className="w-px h-4 bg-slate-700" />

          <button 
            type="button"
            disabled={locked}
            onClick={(e) => {
              e.stopPropagation();
              if (locked) return;
              setLastAutoCroppedImageUrl("");
              setDebugAutoBBox(null);
              setAutoCropDebug(null);
              
              const runId = crypto.randomUUID();
              activeAutoCropRunIdRef.current = runId;
              
              const cb = resetCanvasToFit();
              if (autoCropOnLoad && cb) {
                autoDetectProduct(cb, runId);
              } else if (cb) {
                fitProductToCropBox(cb);
              }
            }}
            className={`flex items-center gap-1 text-[10px] font-medium tracking-wide transition-colors px-2 py-1 rounded ${locked ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-blue-400 hover:bg-slate-800'}`}
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
        </div>
      )}
      
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 pointer-events-none">
          <div className="bg-emerald-500/90 text-white text-xs px-4 py-2 rounded-lg font-bold tracking-wide shadow-lg border border-emerald-400">
            画布已锁定，点击"重新调整"可继续编辑
          </div>
        </div>
      )}
    </div>
  );
};
