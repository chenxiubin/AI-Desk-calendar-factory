import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Crop as CropIcon,
  Crosshair,
  Maximize,
  Move,
  RotateCcw,
  Target,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

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
  snapEnabled: boolean;
  locked?: boolean;
  onStateChange: (state: CropCanvasState) => void;
  onConfirmShortcut?: () => void;
}

type CanvasInteractionMode = "crop" | "pan-image" | "subject-guide";

type CropHandle =
  | "move"
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

type DragMode = "none" | "image" | "crop-move" | "crop-resize" | "subject-guide";

type SubjectGuideBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImageBBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MIN_CROP_SIZE = 80;
const MIN_VISIBLE_CROP_AREA = 40;
const CROP_SAFE_RATIO = 0.8;
const DEFAULT_CROP_RATIO = 0.78;
const HANDLE_SIZE = 14;

const clampZoom = (z: number) => Math.max(0.1, Math.min(z, 4));

const normalizeGuideBox = (startX: number, startY: number, endX: number, endY: number): SubjectGuideBox => ({
  x: Math.min(startX, endX),
  y: Math.min(startY, endY),
  width: Math.abs(endX - startX),
  height: Math.abs(endY - startY),
});

export const CropCanvas: React.FC<CropCanvasProps> = ({
  imageUrl,
  targetSize,
  snapEnabled,
  locked = false,
  onStateChange,
  onConfirmShortcut,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [interactionMode, setInteractionMode] = useState<CanvasInteractionMode>("crop");
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [imageTransform, setImageTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });
  const [isReady, setIsReady] = useState(false);
  const [lastFittedImageUrl, setLastFittedImageUrl] = useState("");
  const [subjectGuideBox, setSubjectGuideBox] = useState<SubjectGuideBox | null>(null);
  const [debugAutoBBox, setDebugAutoBBox] = useState<ImageBBox | null>(null);

  const zoomRef = useRef(zoom);
  const baseScaleRef = useRef(baseScale);
  const imageTransformRef = useRef(imageTransform);
  const cropBoxRef = useRef(cropBox);
  const viewportSizeRef = useRef(viewportSize);
  const lockedRef = useRef(locked);
  const interactionModeRef = useRef(interactionMode);
  const isSpacePanningRef = useRef(isSpacePanning);

  const dragModeRef = useRef<DragMode>("none");
  const activeCropHandleRef = useRef<CropHandle | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>("none");
  const dragStartRef = useRef({ x: 0, y: 0 });
  const subjectGuideStartRef = useRef<{ x: number; y: number } | null>(null);
  const initTransformRef = useRef<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const initCropBoxRef = useRef<CropBox>({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { baseScaleRef.current = baseScale; }, [baseScale]);
  useEffect(() => { imageTransformRef.current = imageTransform; }, [imageTransform]);
  useEffect(() => { cropBoxRef.current = cropBox; }, [cropBox]);
  useEffect(() => { viewportSizeRef.current = viewportSize; }, [viewportSize]);
  useEffect(() => { lockedRef.current = locked; }, [locked]);
  useEffect(() => { interactionModeRef.current = interactionMode; }, [interactionMode]);
  useEffect(() => { isSpacePanningRef.current = isSpacePanning; }, [isSpacePanning]);

  const effectiveMode: CanvasInteractionMode = isSpacePanning ? "pan-image" : interactionMode;

  const safeSetPointerCapture = (pointerId: number) => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!el.hasPointerCapture(pointerId)) el.setPointerCapture(pointerId);
    } catch {
      // Pointer capture can fail if the element has been detached.
    }
  };

  const safeReleasePointerCapture = (pointerId: number) => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
    } catch {
      // Pointer capture may already be released.
    }
  };

  const getMinCropSize = useCallback(() => {
    const viewport = viewportSizeRef.current;
    const viewportMin = Math.min(viewport.width || MIN_CROP_SIZE, viewport.height || MIN_CROP_SIZE);
    return Math.max(24, Math.min(MIN_CROP_SIZE, viewportMin * 0.4));
  }, []);

  const clampCropBoxToViewportVisibility = useCallback((box: CropBox): CropBox => {
    const viewport = viewportSizeRef.current;
    if (viewport.width <= 0 || viewport.height <= 0) return box;

    const minVisible = Math.min(MIN_VISIBLE_CROP_AREA, Math.max(16, box.width * 0.35));
    return {
      ...box,
      x: Math.min(viewport.width - minVisible, Math.max(-box.width + minVisible, box.x)),
      y: Math.min(viewport.height - minVisible, Math.max(-box.height + minVisible, box.y)),
      width: box.width,
      height: box.width,
    };
  }, []);

  const getImageBounds = useCallback(() => {
    const transform = imageTransformRef.current;
    return {
      l: transform.x,
      t: transform.y,
      r: transform.x + imageSize.w * transform.scale,
      b: transform.y + imageSize.h * transform.scale,
    };
  }, [imageSize.h, imageSize.w]);

  const applySnapping = useCallback((box: CropBox): CropBox => {
    const squareBox = { ...box, height: box.width };
    if (!snapEnabled) return clampCropBoxToViewportVisibility(squareBox);

    const snapThreshold = 10;
    const imgBounds = getImageBounds();
    let { x, y, width } = squareBox;

    if (Math.abs(x - imgBounds.l) < snapThreshold) x = imgBounds.l;
    if (Math.abs(y - imgBounds.t) < snapThreshold) y = imgBounds.t;
    if (Math.abs(x + width - imgBounds.r) < snapThreshold) x = imgBounds.r - width;
    if (Math.abs(y + width - imgBounds.b) < snapThreshold) y = imgBounds.b - width;

    return clampCropBoxToViewportVisibility({ x, y, width, height: width });
  }, [clampCropBoxToViewportVisibility, getImageBounds, snapEnabled]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize((prev) => {
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

    if (viewportWidth <= 0 || viewportHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
      return;
    }

    const cropSize = Math.max(
      getMinCropSize(),
      Math.min(viewportWidth, viewportHeight) * DEFAULT_CROP_RATIO,
    );
    const nextCropBox = clampCropBoxToViewportVisibility({
      x: (viewportWidth - cropSize) / 2,
      y: (viewportHeight - cropSize) / 2,
      width: cropSize,
      height: cropSize,
    });

    const nextBaseScale = Math.min(
      (nextCropBox.width * CROP_SAFE_RATIO) / naturalWidth,
      (nextCropBox.height * CROP_SAFE_RATIO) / naturalHeight,
    );

    const displayWidth = naturalWidth * nextBaseScale;
    const displayHeight = naturalHeight * nextBaseScale;
    const nextImageTransform = {
      x: nextCropBox.x + (nextCropBox.width - displayWidth) / 2,
      y: nextCropBox.y + (nextCropBox.height - displayHeight) / 2,
      scale: nextBaseScale,
    };

    setViewportSize({ width: viewportWidth, height: viewportHeight });
    setCropBox(nextCropBox);
    setBaseScale(Number.isFinite(nextBaseScale) ? nextBaseScale : 1);
    setZoom(1);
    setImageTransform(nextImageTransform);
    setSubjectGuideBox(null);
    setDebugAutoBBox(null);
    setIsReady(true);

    return nextCropBox;
  }, [clampCropBoxToViewportVisibility, getMinCropSize]);

  const fitProductToCropBox = useCallback((overrideCropBox?: CropBox) => {
    if (lockedRef.current || !imgRef.current) return;

    const cb = overrideCropBox || cropBoxRef.current;
    const iw = imgRef.current.naturalWidth;
    const ih = imgRef.current.naturalHeight;
    if (cb.width <= 0 || iw <= 0 || ih <= 0) return;

    const nextBaseScale = Math.min(
      (cb.width * CROP_SAFE_RATIO) / iw,
      (cb.height * CROP_SAFE_RATIO) / ih,
    );

    const scaledW = iw * nextBaseScale;
    const scaledH = ih * nextBaseScale;
    const x = cb.x + cb.width / 2 - scaledW / 2;
    const y = cb.y + cb.height / 2 - scaledH / 2;

    setBaseScale(Number.isFinite(nextBaseScale) ? nextBaseScale : 1);
    setZoom(1);
    setImageTransform({
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
      scale: Number.isFinite(nextBaseScale) ? nextBaseScale : 1,
    });
  }, []);

  useEffect(() => {
    if (locked) return;
    if (!imageUrl) return;
    if (!imgRef.current?.complete) return;
    if (imageSize.w <= 0 || imageSize.h <= 0) return;
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
    if (imageUrl === lastFittedImageUrl) return;

    const cb = resetCanvasToFit();
    if (cb) {
      fitProductToCropBox(cb);
      setLastFittedImageUrl(imageUrl);
    }
  }, [
    imageUrl,
    imageSize.w,
    imageSize.h,
    viewportSize.width,
    viewportSize.height,
    locked,
    lastFittedImageUrl,
    resetCanvasToFit,
    fitProductToCropBox,
  ]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    setImageSize({
      w: img.naturalWidth,
      h: img.naturalHeight,
    });
    setLastFittedImageUrl("");
  };

  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    if (!isReady) return;
    onStateChangeRef.current({
      cropBox: { ...cropBox, height: cropBox.width },
      imageTransform,
      viewportSize,
    });
  }, [cropBox, imageTransform, viewportSize, isReady]);

  const zoomAtPoint = useCallback((anchorX: number, anchorY: number, nextZoom: number) => {
    const currentBaseScale = baseScaleRef.current;
    const currentTransform = imageTransformRef.current;
    if (!currentBaseScale || currentBaseScale === 0 || !currentTransform.scale) return;

    const clampedZoom = clampZoom(nextZoom);
    const nextScale = currentBaseScale * clampedZoom;
    const scaleRatio = nextScale / currentTransform.scale;

    setZoom(clampedZoom);
    setImageTransform({
      x: anchorX - (anchorX - currentTransform.x) * scaleRatio,
      y: anchorY - (anchorY - currentTransform.y) * scaleRatio,
      scale: nextScale,
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (lockedRef.current) return;

      const rect = el.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;
      const step = event.deltaY < 0 ? 1.08 : 1 / 1.08;
      zoomAtPoint(anchorX, anchorY, zoomRef.current * step);
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleNativeWheel);
  }, [zoomAtPoint]);

  const handleZoom = (direction: "in" | "out") => {
    if (lockedRef.current) return;
    const cb = cropBoxRef.current;
    const step = direction === "in" ? 1.12 : 1 / 1.12;
    zoomAtPoint(cb.x + cb.width / 2, cb.y + cb.height / 2, zoomRef.current * step);
  };

  const centerImage = () => {
    if (lockedRef.current || !imgRef.current) return;
    const cb = cropBoxRef.current;
    const currentTransform = imageTransformRef.current;
    const displayWidth = imgRef.current.naturalWidth * currentTransform.scale;
    const displayHeight = imgRef.current.naturalHeight * currentTransform.scale;
    setImageTransform({
      ...currentTransform,
      x: cb.x + cb.width / 2 - displayWidth / 2,
      y: cb.y + cb.height / 2 - displayHeight / 2,
    });
  };

  const getPointerInViewport = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const beginDrag = (e: React.PointerEvent<HTMLDivElement>, nextDragMode: DragMode, handle?: CropHandle) => {
    if (lockedRef.current) return;

    e.preventDefault();
    e.stopPropagation();
    containerRef.current?.focus({ preventScroll: true });
    safeSetPointerCapture(e.pointerId);

    dragModeRef.current = nextDragMode;
    activeCropHandleRef.current = handle || null;
    setDragMode(nextDragMode);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initTransformRef.current = imageTransformRef.current;
    initCropBoxRef.current = cropBoxRef.current;

    if (nextDragMode === "subject-guide") {
      const pointer = getPointerInViewport(e);
      subjectGuideStartRef.current = pointer;
      setSubjectGuideBox({ x: pointer.x, y: pointer.y, width: 0, height: 0 });
    }
  };

  const resizeCropBox = (
    initial: CropBox,
    handle: CropHandle,
    pointer: { x: number; y: number },
  ): CropBox => {
    const minSize = getMinCropSize();
    const right = initial.x + initial.width;
    const bottom = initial.y + initial.height;
    const centerX = initial.x + initial.width / 2;
    const centerY = initial.y + initial.height / 2;
    let next: CropBox;

    if (handle === "top-left") {
      const size = Math.max(minSize, Math.max(Math.abs(right - pointer.x), Math.abs(bottom - pointer.y)));
      next = { x: right - size, y: bottom - size, width: size, height: size };
    } else if (handle === "top-right") {
      const size = Math.max(minSize, Math.max(Math.abs(pointer.x - initial.x), Math.abs(bottom - pointer.y)));
      next = { x: initial.x, y: bottom - size, width: size, height: size };
    } else if (handle === "bottom-left") {
      const size = Math.max(minSize, Math.max(Math.abs(right - pointer.x), Math.abs(pointer.y - initial.y)));
      next = { x: right - size, y: initial.y, width: size, height: size };
    } else if (handle === "bottom-right") {
      const size = Math.max(minSize, Math.max(Math.abs(pointer.x - initial.x), Math.abs(pointer.y - initial.y)));
      next = { x: initial.x, y: initial.y, width: size, height: size };
    } else if (handle === "right") {
      const size = Math.max(minSize, pointer.x - initial.x);
      next = { x: initial.x, y: centerY - size / 2, width: size, height: size };
    } else if (handle === "left") {
      const size = Math.max(minSize, right - pointer.x);
      next = { x: right - size, y: centerY - size / 2, width: size, height: size };
    } else if (handle === "top") {
      const size = Math.max(minSize, bottom - pointer.y);
      next = { x: centerX - size / 2, y: bottom - size, width: size, height: size };
    } else if (handle === "bottom") {
      const size = Math.max(minSize, pointer.y - initial.y);
      next = { x: centerX - size / 2, y: initial.y, width: size, height: size };
    } else {
      next = initial;
    }

    return applySnapping(next);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lockedRef.current) return;
    const mode = isSpacePanningRef.current ? "pan-image" : interactionModeRef.current;
    if (mode === "pan-image") {
      beginDrag(e, "image");
    } else if (mode === "subject-guide") {
      beginDrag(e, "subject-guide");
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lockedRef.current) return;

    const currentDragMode = dragModeRef.current;
    if (currentDragMode === "none") return;

    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (currentDragMode === "image") {
      setImageTransform({
        ...initTransformRef.current,
        x: initTransformRef.current.x + dx,
        y: initTransformRef.current.y + dy,
      });
      return;
    }

    if (currentDragMode === "crop-move") {
      setCropBox(clampCropBoxToViewportVisibility({
        ...initCropBoxRef.current,
        x: initCropBoxRef.current.x + dx,
        y: initCropBoxRef.current.y + dy,
        height: initCropBoxRef.current.width,
      }));
      return;
    }

    if (currentDragMode === "crop-resize" && activeCropHandleRef.current) {
      setCropBox(resizeCropBox(initCropBoxRef.current, activeCropHandleRef.current, getPointerInViewport(e)));
      return;
    }

    if (currentDragMode === "subject-guide" && subjectGuideStartRef.current) {
      const pointer = getPointerInViewport(e);
      const start = subjectGuideStartRef.current;
      setSubjectGuideBox(normalizeGuideBox(start.x, start.y, pointer.x, pointer.y));
    }
  };

  const finishDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    dragModeRef.current = "none";
    activeCropHandleRef.current = null;
    setDragMode("none");
    if (e) safeReleasePointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    finishDrag(e);
  };

  const cancelActiveInteraction = useCallback(() => {
    finishDrag();
    subjectGuideStartRef.current = null;
    if (interactionModeRef.current === "subject-guide") {
      setSubjectGuideBox(null);
      setInteractionMode("crop");
    }
  }, []);

  const convertViewportGuideBoxToImageBBox = useCallback((guideBox: SubjectGuideBox): ImageBBox => {
    const currentTransform = imageTransformRef.current;
    const imageWidth = Math.max(1, imageSize.w);
    const imageHeight = Math.max(1, imageSize.h);

    const imageX = (guideBox.x - currentTransform.x) / currentTransform.scale;
    const imageY = (guideBox.y - currentTransform.y) / currentTransform.scale;
    const imageW = guideBox.width / currentTransform.scale;
    const imageH = guideBox.height / currentTransform.scale;

    const x = Math.max(0, Math.min(imageWidth, imageX));
    const y = Math.max(0, Math.min(imageHeight, imageY));
    const rightEdge = Math.max(0, Math.min(imageWidth, imageX + imageW));
    const bottomEdge = Math.max(0, Math.min(imageHeight, imageY + imageH));

    return {
      x,
      y,
      width: Math.max(1, rightEdge - x),
      height: Math.max(1, bottomEdge - y),
    };
  }, [imageSize.h, imageSize.w]);

  const applySubjectGuideBox = useCallback(() => {
    if (lockedRef.current || !subjectGuideBox || subjectGuideBox.width < 16 || subjectGuideBox.height < 16) {
      return;
    }

    const imageBBox = convertViewportGuideBoxToImageBBox(subjectGuideBox);
    setDebugAutoBBox(imageBBox);

    const size = Math.max(
      getMinCropSize(),
      Math.max(subjectGuideBox.width, subjectGuideBox.height) / CROP_SAFE_RATIO,
    );
    const nextCropBox = clampCropBoxToViewportVisibility({
      x: subjectGuideBox.x + subjectGuideBox.width / 2 - size / 2,
      y: subjectGuideBox.y + subjectGuideBox.height / 2 - size / 2,
      width: size,
      height: size,
    });

    setCropBox(nextCropBox);
    setSubjectGuideBox(null);
    setInteractionMode("crop");
  }, [clampCropBoxToViewportVisibility, convertViewportGuideBoxToImageBBox, getMinCropSize, subjectGuideBox]);

  useEffect(() => {
    const isEditableTextTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tagName = element.tagName;
      return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || element.isContentEditable;
    };

    const isCanvasActive = () => {
      const el = containerRef.current;
      return !!el && el.contains(document.activeElement);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isCanvasActive() || isEditableTextTarget(event.target)) return;
      if (lockedRef.current) return;

      if (event.key === "Enter") {
        event.preventDefault();
        onConfirmShortcut?.();
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancelActiveInteraction();
      } else if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        setIsSpacePanning(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === " " || event.code === "Space") {
        setIsSpacePanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [cancelActiveInteraction, onConfirmShortcut]);

  useEffect(() => {
    if (locked) {
      finishDrag();
      setIsSpacePanning(false);
    }
  }, [locked]);

  const handleModeChange = (nextMode: CanvasInteractionMode) => {
    if (lockedRef.current) return;
    finishDrag();
    setInteractionMode(nextMode);
    if (nextMode !== "subject-guide") {
      setSubjectGuideBox(null);
    }
  };

  const safePadding = cropBox.width * 0.1;
  const maskTop = Math.max(0, cropBox.y);
  const maskBottom = Math.min(viewportSize.height, cropBox.y + cropBox.height);
  const maskLeft = Math.max(0, cropBox.x);
  const maskRight = Math.min(viewportSize.width, cropBox.x + cropBox.width);
  const maskMiddleHeight = Math.max(0, maskBottom - maskTop);
  const handleBaseClass = "absolute w-3.5 h-3.5 bg-white border border-blue-500 rounded-sm shadow";

  const cropHandleConfigs: Array<{
    handle: CropHandle;
    className: string;
    style: React.CSSProperties;
    cursor: React.CSSProperties["cursor"];
    title: string;
  }> = [
    {
      handle: "top-left",
      className: "cursor-nw-resize",
      style: { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
      cursor: "nwse-resize",
      title: "拖动左上角缩放",
    },
    {
      handle: "top",
      className: "cursor-n-resize",
      style: { left: cropBox.width / 2 - HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
      cursor: "ns-resize",
      title: "拖动上边缩放",
    },
    {
      handle: "top-right",
      className: "cursor-ne-resize",
      style: { right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
      cursor: "nesw-resize",
      title: "拖动右上角缩放",
    },
    {
      handle: "right",
      className: "cursor-e-resize",
      style: { right: -HANDLE_SIZE / 2, top: cropBox.height / 2 - HANDLE_SIZE / 2 },
      cursor: "ew-resize",
      title: "拖动右边缩放",
    },
    {
      handle: "bottom-right",
      className: "cursor-se-resize",
      style: { right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
      cursor: "nwse-resize",
      title: "拖动右下角缩放",
    },
    {
      handle: "bottom",
      className: "cursor-s-resize",
      style: { left: cropBox.width / 2 - HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
      cursor: "ns-resize",
      title: "拖动下边缩放",
    },
    {
      handle: "bottom-left",
      className: "cursor-sw-resize",
      style: { left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
      cursor: "nesw-resize",
      title: "拖动左下角缩放",
    },
    {
      handle: "left",
      className: "cursor-w-resize",
      style: { left: -HANDLE_SIZE / 2, top: cropBox.height / 2 - HANDLE_SIZE / 2 },
      cursor: "ew-resize",
      title: "拖动左边缩放",
    },
  ];

  const canvasCursor =
    locked
      ? "cursor-not-allowed"
      : dragMode === "image"
        ? "cursor-move"
        : effectiveMode === "pan-image"
          ? "cursor-move"
          : effectiveMode === "subject-guide"
            ? "cursor-crosshair"
            : "cursor-default";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`relative w-full h-full overflow-hidden select-none flex items-center justify-center outline-none ${canvasCursor}`}
      style={{
        touchAction: "none",
        overscrollBehavior: "contain",
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23cbd5e1\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Crect x=\'0\' y=\'0\' width=\'10\' height=\'10\'/%3E%3Crect x=\'10\' y=\'10\' width=\'10\' height=\'10\'/%3E%3C/g%3E%3C/svg%3E")',
        backgroundColor: "#1e293b",
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`,
          transformOrigin: "top left",
          opacity: isReady ? 1 : 0,
          zIndex: 0,
        }}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          onLoad={handleImageLoad}
          crossOrigin={imageUrl.startsWith("data:") || imageUrl.startsWith("blob:") ? undefined : "anonymous"}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="will-change-transform max-w-none max-h-none block pointer-events-none"
          style={{
            width: imageSize.w > 0 ? `${imageSize.w}px` : "auto",
            height: imageSize.h > 0 ? `${imageSize.h}px` : "auto",
          }}
        />
      </div>

      {isReady && (
        <>
          <div className="absolute left-0 top-0 right-0 bg-black/55 pointer-events-none z-10" style={{ height: maskTop }} />
          <div className="absolute left-0 bg-black/55 pointer-events-none z-10" style={{ top: maskBottom, right: 0, bottom: 0 }} />
          <div className="absolute left-0 bg-black/55 pointer-events-none z-10" style={{ top: maskTop, width: maskLeft, height: maskMiddleHeight }} />
          <div className="absolute bg-black/55 pointer-events-none z-10" style={{ top: maskTop, left: maskRight, right: 0, height: maskMiddleHeight }} />
        </>
      )}

      {debugAutoBBox && (
        <div
          className="absolute pointer-events-none border-2 border-amber-300 z-20"
          style={{
            left: imageTransform.x + debugAutoBBox.x * imageTransform.scale,
            top: imageTransform.y + debugAutoBBox.y * imageTransform.scale,
            width: debugAutoBBox.width * imageTransform.scale,
            height: debugAutoBBox.height * imageTransform.scale,
          }}
        />
      )}

      {subjectGuideBox && (
        <div
          className="absolute pointer-events-none border-2 border-emerald-400 bg-emerald-400/10 z-30"
          style={{
            left: subjectGuideBox.x,
            top: subjectGuideBox.y,
            width: subjectGuideBox.width,
            height: subjectGuideBox.height,
          }}
        >
          <div className="absolute -top-6 left-0 bg-emerald-400 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-sm font-medium whitespace-nowrap">
            主体辅助框
          </div>
        </div>
      )}

      {isReady && (
        <div
          className="absolute border-2 border-blue-400 z-20 shadow-[0_0_0_1px_rgba(255,255,255,0.45)]"
          style={{
            left: cropBox.x,
            top: cropBox.y,
            width: cropBox.width,
            height: cropBox.height,
          }}
        >
          <div
            className={`absolute inset-0 ${effectiveMode === "crop" ? "cursor-move" : "cursor-inherit"}`}
            onPointerDown={(e) => {
              if (effectiveMode === "crop") {
                beginDrag(e, "crop-move", "move");
              }
            }}
            title="拖动裁剪框"
          />

          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-full h-[1px] bg-white/45" />
            <div className="absolute h-full w-[1px] bg-white/45" />
          </div>

          <div
            className="absolute pointer-events-none border border-dashed border-red-300/80"
            style={{
              left: safePadding,
              top: safePadding,
              width: Math.max(0, cropBox.width - safePadding * 2),
              height: Math.max(0, cropBox.height - safePadding * 2),
            }}
          />

          <div className="absolute top-2 left-2 bg-slate-950/85 px-2 py-0.5 rounded text-[10px] text-white pointer-events-none">
            {targetSize}x{targetSize} 输入图
          </div>

          <div className="absolute bottom-2 left-2 bg-slate-950/75 px-2 py-0.5 rounded text-[10px] text-slate-100 pointer-events-none">
            产品主体建议放在安全线内
          </div>

          {cropHandleConfigs.map((item) => (
            <div
              key={item.handle}
              title={item.title}
              className={`${handleBaseClass} ${item.className}`}
              style={{ ...item.style, cursor: item.cursor }}
              onPointerDown={(e) => {
                if (effectiveMode === "crop") {
                  beginDrag(e, "crop-resize", item.handle);
                }
              }}
            />
          ))}
        </div>
      )}

      {isReady && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/90 backdrop-blur text-white px-2 py-1.5 rounded-full border border-slate-700 shadow-xl z-40"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={locked}
            onClick={() => handleModeChange("crop")}
            title="调整裁剪框"
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-colors ${
              effectiveMode === "crop" ? "bg-blue-500 text-white" : "text-slate-300 hover:bg-slate-800"
            } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <CropIcon className="w-3.5 h-3.5" />
            调整裁剪框
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => handleModeChange("pan-image")}
            title="移动图片"
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-colors ${
              effectiveMode === "pan-image" ? "bg-blue-500 text-white" : "text-slate-300 hover:bg-slate-800"
            } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Move className="w-3.5 h-3.5" />
            移动图片
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => handleModeChange("subject-guide")}
            title="手动框选主体"
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-colors ${
              effectiveMode === "subject-guide" ? "bg-emerald-500 text-white" : "text-slate-300 hover:bg-slate-800"
            } ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            手动框选主体
          </button>
          {subjectGuideBox && interactionMode === "subject-guide" && (
            <button
              type="button"
              disabled={locked || subjectGuideBox.width < 16 || subjectGuideBox.height < 16}
              onClick={applySubjectGuideBox}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              应用主体框
            </button>
          )}
        </div>
      )}

      {isReady && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur text-white px-4 py-2 rounded-full border border-slate-700 shadow-xl z-40"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={locked}
              onClick={() => handleZoom("out")}
              title="缩小"
              className={`p-1 rounded hover:bg-slate-800 ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <ZoomOut className="w-4 h-4 text-slate-300" />
            </button>
            <input
              type="range"
              disabled={locked}
              min="0.1"
              max="4"
              step="0.01"
              value={zoom}
              onChange={(e) => {
                if (lockedRef.current || baseScaleRef.current === 0) return;
                const cb = cropBoxRef.current;
                zoomAtPoint(cb.x + cb.width / 2, cb.y + cb.height / 2, Number(e.target.value));
              }}
              className="w-24 accent-blue-500 disabled:opacity-50"
              onPointerDown={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              disabled={locked}
              onClick={() => handleZoom("in")}
              title="放大"
              className={`p-1 rounded hover:bg-slate-800 ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <ZoomIn className="w-4 h-4 text-slate-300" />
            </button>
            <span className="text-[10px] text-slate-400 font-mono w-[38px] text-right mr-1">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <button
            type="button"
            disabled={locked}
            onClick={(e) => {
              e.stopPropagation();
              fitProductToCropBox();
            }}
            title="完整适应原图"
            className={`flex items-center gap-1 p-1.5 rounded transition-colors ${
              locked ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Maximize className="w-4 h-4" />
            <span className="text-[10px] hidden sm:inline">完整适应</span>
          </button>

          <button
            type="button"
            disabled={locked}
            onClick={(e) => {
              e.stopPropagation();
              centerImage();
            }}
            title="居中"
            className={`flex items-center gap-1 p-1.5 rounded transition-colors ${
              locked ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Target className="w-4 h-4" />
            <span className="text-[10px] hidden sm:inline">居中</span>
          </button>

          <button
            type="button"
            disabled={locked}
            onClick={(e) => {
              e.stopPropagation();
              onConfirmShortcut?.();
            }}
            title="确认输入图"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-colors ${
              locked ? "text-slate-600 cursor-not-allowed" : "bg-emerald-500 text-white hover:bg-emerald-400 shadow-sm shadow-emerald-950/20"
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            确认输入图
          </button>

          <div className="w-px h-4 bg-slate-700" />

          <button
            type="button"
            disabled={locked}
            onClick={(e) => {
              e.stopPropagation();
              if (lockedRef.current) return;
              setLastFittedImageUrl("");
              setInteractionMode("crop");
              const cb = resetCanvasToFit();
              if (cb) fitProductToCropBox(cb);
            }}
            className={`flex items-center gap-1 text-[10px] font-medium tracking-wide transition-colors px-2 py-1 rounded ${
              locked ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:text-blue-400 hover:bg-slate-800"
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
        </div>
      )}

      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50 pointer-events-none">
          <div className="bg-emerald-500/90 text-white text-xs px-4 py-2 rounded-lg font-bold tracking-wide shadow-lg border border-emerald-400">
            画布已锁定，点击“重新调整”后可继续编辑
          </div>
        </div>
      )}
    </div>
  );
};
