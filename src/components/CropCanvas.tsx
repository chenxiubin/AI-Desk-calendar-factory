import React, { useState, useRef, useEffect, MouseEvent, WheelEvent, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize, Target, RotateCcw } from "lucide-react";

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
  onStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [imageTransform, setImageTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 });
  // CropBox is in viewport coordinates
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });

  const [isReady, setIsReady] = useState(false);

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

  const resetCanvasToFit = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const { width: vw, height: vh } = container.getBoundingClientRect();
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.min((vw * 0.8) / iw, (vh * 0.8) / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = (vw - w) / 2;
    const y = (vh - h) / 2;

    const cropSize = Math.min(vw, vh) * 0.72;

    setViewportSize({ width: vw, height: vh });
    setImageTransform({ x, y, scale });
    setCropBox({
      x: (vw - cropSize) / 2,
      y: (vh - cropSize) / 2,
      width: cropSize,
      height: cropSize,
    });
    setIsReady(true);
  }, []);

  // Initialize bounds on image load
  const handleImageLoad = () => {
    resetCanvasToFit();
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

  const clampScale = (s: number) => Math.max(0.25, Math.min(s, 4));

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (locked || !containerRef.current) return;
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    let newScale = clampScale(imageTransform.scale * delta);
    
    // Zoom around mouse
    const actualDelta = newScale / imageTransform.scale;
    const nx = mx - (mx - imageTransform.x) * actualDelta;
    const ny = my - (my - imageTransform.y) * actualDelta;

    setImageTransform({ x: nx, y: ny, scale: newScale });
  };

  const handleZoom = (direction: "in" | "out") => {
    if (locked || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    
    const delta = direction === "in" ? 1.1 : 0.9;
    let newScale = clampScale(imageTransform.scale * delta);
    const actualDelta = newScale / imageTransform.scale;
    const nx = mx - (mx - imageTransform.x) * actualDelta;
    const ny = my - (my - imageTransform.y) * actualDelta;
    setImageTransform({ x: nx, y: ny, scale: newScale });
  };

  const centerImage = useCallback(() => {
    if (locked || !imgRef.current || !containerRef.current) return;
    const { width: vw, height: vh } = containerRef.current.getBoundingClientRect();
    const iw = imgRef.current.naturalWidth * imageTransform.scale;
    const ih = imgRef.current.naturalHeight * imageTransform.scale;
    const x = (vw - iw) / 2;
    const y = (vh - ih) / 2;
    setImageTransform(prev => ({ ...prev, x, y }));
  }, [locked, imageTransform.scale]);

  const fitProductToCropBox = useCallback(() => {
    if (locked || !imgRef.current || !containerRef.current) return;
    const iw = imgRef.current.naturalWidth;
    const ih = imgRef.current.naturalHeight;
    
    // We want the image to fit inside the cropBox, with an 8% margin.
    // So target image size = cropBox inner safe size.
    // Safe size is 84% of cropBox size (8% on each side).
    const safeCropW = cropBox.width * 0.84;
    const safeCropH = cropBox.height * 0.84;
    
    const scale = Math.min(safeCropW / iw, safeCropH / ih);
    
    // Center the image inside the cropBox
    const scaledW = iw * scale;
    const scaledH = ih * scale;
    const cx = cropBox.x + cropBox.width / 2;
    const cy = cropBox.y + cropBox.height / 2;
    
    const x = cx - scaledW / 2;
    const y = cy - scaledH / 2;
    
    setImageTransform(prev => ({ ...prev, x, y, scale }));
  }, [locked, cropBox]);

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
      className="relative w-full h-full overflow-hidden select-none bg-slate-900 flex items-center justify-center cursor-move"
      onPointerDown={(e) => handlePointerDown(e, "image")}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{ touchAction: "none" }}
    >
      <img
        ref={imgRef}
        src={imageUrl}
        onLoad={handleImageLoad}
        crossOrigin={imageUrl.startsWith("data:") ? undefined : "anonymous"}
        draggable={false}
        className="absolute origin-top-left will-change-transform max-w-none max-h-none"
        style={{
          transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`,
          opacity: isReady ? 1 : 0
        }}
      />
      
      {/* Dimmed Overlay */}
      {isReady && (
        <svg className="absolute inset-0 pointer-events-none w-full h-full">
          <defs>
            <mask id="crop-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect 
                x={cropBox.x} 
                y={cropBox.y} 
                width={cropBox.width} 
                height={cropBox.height} 
                fill="black" 
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#crop-mask)" />
        </svg>
      )}

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
               min="0.25" max="4" step="0.05"
               value={imageTransform.scale}
               onChange={(e) => {
                 if (locked) return;
                 setImageTransform((prev) => ({ ...prev, scale: parseFloat(e.target.value) }));
               }}
               className="w-20 accent-blue-500 disabled:opacity-50"
               onPointerDown={(e) => e.stopPropagation()}
             />
             <button disabled={locked} onClick={() => handleZoom("in")} className={`p-1 rounded hover:bg-slate-800 ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}>
               <ZoomIn className="w-4 h-4 text-slate-300" />
             </button>
             <span className="text-[10px] text-slate-400 font-mono w-8 text-right mr-2">
               {Math.round(imageTransform.scale * 100)}%
             </span>
          </div>
          
          <div className="w-px h-4 bg-slate-700" />
          
          <button 
            type="button"
            disabled={locked}
            onClick={(e) => {
              e.stopPropagation();
              if (locked) return;
              fitProductToCropBox();
            }}
            title="适应完整产品"
            className={`p-1.5 rounded transition-colors ${locked ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          >
            <Maximize className="w-4 h-4" />
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
            className={`p-1.5 rounded transition-colors ${locked ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          >
            <Target className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-700" />

          <button 
            type="button"
            disabled={locked}
            onClick={(e) => {
              e.stopPropagation();
              if (locked) return;
              resetCanvasToFit();
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
