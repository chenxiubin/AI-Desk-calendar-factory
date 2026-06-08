import React, { useState, useRef, useEffect, MouseEvent, WheelEvent, useCallback } from "react";
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

  // Interaction State
  const dragModeRef = useRef<DragMode>("none");
  const [dragMode, setDragMode] = useState<DragMode>("none");
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initTransformRef = useRef<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const initCropBoxRef = useRef<CropBox>({ x: 0, y: 0, width: 0, height: 0 });

  const safeSetPointerCapture = (pointerId: number) => {
    const el = containerRef.current;
    if (el && !el.hasPointerCapture(pointerId)) {
      el.setPointerCapture(pointerId);
    }
  };

  const safeReleasePointerCapture = (pointerId: number) => {
    const el = containerRef.current;
    if (el && el.hasPointerCapture(pointerId)) {
      el.releasePointerCapture(pointerId);
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

  const autoDetectProduct = useCallback(async (currentCropBox?: CropBox) => {
    if (locked || isAutoCropping || !imgRef.current || !containerRef.current) return;
    setIsAutoCropping(true);
    try {
      const result = await calculateRawImageAutoCropBox(imageUrl, {
        paddingRatio: safetyPaddingRatio,
      });
      if (result.confidence >= 0.4) {
        applyAutoCropResult(result.bbox, currentCropBox);
      } else {
        fitProductToCropBox(currentCropBox);
      }
      onAutoCropResult?.(result);
    } catch (err) {
      console.warn("Auto crop failed:", err);
      fitProductToCropBox(currentCropBox);
    } finally {
      setIsAutoCropping(false);
    }
  }, [imageUrl, locked, isAutoCropping, safetyPaddingRatio, applyAutoCropResult, fitProductToCropBox, onAutoCropResult]);

  useEffect(() => {
    setLastAutoCroppedImageUrl("");
  }, [imageUrl]);

  useEffect(() => {
    if (!locked && viewportSize.width > 0 && imgRef.current?.complete && imageUrl) {
      if (imageUrl !== lastAutoCroppedImageUrl) {
        const t = setTimeout(() => {
          const cb = resetCanvasToFit();
          if (!cb) return;

          if (autoCropOnLoad) {
            autoDetectProduct(cb)
              .catch(() => fitProductToCropBox(cb))
              .finally(() => setLastAutoCroppedImageUrl(imageUrl));
          } else {
            fitProductToCropBox(cb);
            setLastAutoCroppedImageUrl(imageUrl);
          }
        }, 50);
        return () => clearTimeout(t);
      }
    }
  }, [imageUrl, viewportSize.width, viewportSize.height, locked, autoCropOnLoad, lastAutoCroppedImageUrl, autoDetectProduct, resetCanvasToFit, fitProductToCropBox]);

  // Initialize bounds on image load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    setLastAutoCroppedImageUrl("");

    window.requestAnimationFrame(() => {
      const cb = resetCanvasToFit();
      if (!cb) return;

      if (autoCropOnLoad) {
        autoDetectProduct(cb)
          .catch(() => {
            fitProductToCropBox(cb);
          })
          .finally(() => {
            setLastAutoCroppedImageUrl(imageUrl);
          });
      } else {
        fitProductToCropBox(cb);
        setLastAutoCroppedImageUrl(imageUrl);
      }
    });
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

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (locked || !containerRef.current || baseScale === 0) return;
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const nextZoom = clampZoom(zoom * delta);
    const nextScale = baseScale * nextZoom;
    
    // Zoom around mouse
    const scaleRatio = nextScale / imageTransform.scale;
    const nx = mx - (mx - imageTransform.x) * scaleRatio;
    const ny = my - (my - imageTransform.y) * scaleRatio;

    setZoom(nextZoom);
    setImageTransform({ x: nx, y: ny, scale: nextScale });
  };

  const handleZoom = (direction: "in" | "out") => {
    if (locked || !containerRef.current || baseScale === 0) return;
    const mx = cropBox.x + cropBox.width / 2;
    const my = cropBox.y + cropBox.height / 2;
    
    const delta = direction === "in" ? 1.1 : 0.9;
    const nextZoom = clampZoom(zoom * delta);
    const nextScale = baseScale * nextZoom;

    const scaleRatio = nextScale / imageTransform.scale;
    const nx = mx - (mx - imageTransform.x) * scaleRatio;
    const ny = my - (my - imageTransform.y) * scaleRatio;
    
    setZoom(nextZoom);
    setImageTransform({ x: nx, y: ny, scale: nextScale });
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
    const mode = dragModeRef.current;
    if (mode === "none") return;
    
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
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23cbd5e1\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3Crect x=\'0\' y=\'0\' width=\'10\' height=\'10\'/%3E%3Crect x=\'10\' y=\'10\' width=\'10\' height=\'10\'/%3E%3C/g%3E%3C/svg%3E")',
        backgroundColor: '#1e293b'
      }}
      onPointerDown={(e) => handlePointerDown(e, "image")}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
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
          className="will-change-transform max-w-none max-h-none block"
          style={{
            width: imageSize.w > 0 ? `${imageSize.w}px` : 'auto',
            height: imageSize.h > 0 ? `${imageSize.h}px` : 'auto',
          }}
        />
      </div>
      
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
                 const nextScale = baseScale * nextZoom;
                 
                 const mx = cropBox.x + cropBox.width / 2;
                 const my = cropBox.y + cropBox.height / 2;
                 const scaleRatio = nextScale / imageTransform.scale;
                 const nx = mx - (mx - imageTransform.x) * scaleRatio;
                 const ny = my - (my - imageTransform.y) * scaleRatio;
                 
                 setZoom(nextZoom);
                 setImageTransform({ x: nx, y: ny, scale: nextScale });
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
              if (locked) return;
              autoDetectProduct();
            }}
            title="自动识别产品"
            className={`flex items-center gap-1 p-1.5 rounded transition-colors ${locked || isAutoCropping ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          >
            <Wand2 className={`w-4 h-4 ${isAutoCropping ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] hidden sm:inline">自动识别产品</span>
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
              resetCanvasToFit();
              if (autoCropOnLoad) {
                autoDetectProduct();
              } else {
                fitProductToCropBox();
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
