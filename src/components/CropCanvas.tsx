import React, { useState, useRef, useEffect, MouseEvent, WheelEvent } from "react";

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

interface CropCanvasProps {
  imageUrl: string;
  cropAspectLocked: boolean;
  snapEnabled: boolean;
  onStateChange: (state: {
    cropBox: CropBox;
    imageTransform: ImageTransform;
    viewportSize: ViewportSize;
  }) => void;
}

export const CropCanvas: React.FC<CropCanvasProps> = ({
  imageUrl,
  cropAspectLocked,
  snapEnabled,
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
  const [dragMode, setDragMode] = useState<"none" | "image" | "crop" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se">("none");
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initTransformRef = useRef<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const initCropBoxRef = useRef<CropBox>({ x: 0, y: 0, width: 0, height: 0 });

  // Initialize bounds on image load
  const handleImageLoad = () => {
    if (!containerRef.current || !imgRef.current) return;
    const { width: vw, height: vh } = containerRef.current.getBoundingClientRect();
    const iw = imgRef.current.naturalWidth;
    const ih = imgRef.current.naturalHeight;

    setViewportSize({ width: vw, height: vh });

    // Fit image into viewport
    const scale = Math.min((vw * 0.8) / iw, (vh * 0.8) / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = (vw - w) / 2;
    const y = (vh - h) / 2;

    setImageTransform({ x, y, scale });

    // Initial cropbox (square, 80% of min dimension)
    const cw = Math.min(w, h) * 0.8;
    setCropBox({
      x: (vw - cw) / 2,
      y: (vh - cw) / 2,
      width: cw,
      height: cw,
    });
    setIsReady(true);
  };

  // Reset/Fit button exposed to parent? We can just expose functions or handle via props... 
  // For now, we manage it here.

  // Notify parent
  useEffect(() => {
    if (isReady) {
      onStateChange({ cropBox, imageTransform, viewportSize });
    }
  }, [cropBox, imageTransform, viewportSize, isReady, onStateChange]);

  const snapThreshold = snapEnabled ? 10 : 0;

  const clampScale = (s: number) => Math.max(0.25, Math.min(s, 4));

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, mode: typeof dragMode) => {
    e.preventDefault();
    setDragMode(mode);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initTransformRef.current = { ...imageTransform };
    initCropBoxRef.current = { ...cropBox };
    
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
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

  const handlePointerMove = (e: PointerEvent) => {
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (dragMode === "image") {
      setImageTransform({
        ...initTransformRef.current,
        x: initTransformRef.current.x + dx,
        y: initTransformRef.current.y + dy,
      });
    } else if (dragMode === "crop") {
      let nx = initCropBoxRef.current.x + dx;
      let ny = initCropBoxRef.current.y + dy;
      setCropBox(applySnapping({ ...initCropBoxRef.current, x: nx, y: ny }));
    } else if (dragMode.startsWith("resize")) {
      let { x, y, width, height } = initCropBoxRef.current;

      if (dragMode === "resize-nw") {
        let d = cropAspectLocked ? Math.min(dx, dy) : 0;
        let ndx = cropAspectLocked ? d : dx;
        let ndy = cropAspectLocked ? d : dy;
        x += ndx;
        y += ndy;
        width -= ndx;
        height -= ndy;
      } else if (dragMode === "resize-ne") {
        let ndx = dx;
        let ndy = cropAspectLocked ? -dx : dy;
        y += ndy;
        width += ndx;
        height -= ndy;
      } else if (dragMode === "resize-sw") {
        let ndx = dx;
        let ndy = cropAspectLocked ? -dx : dy;
        x += ndx;
        width -= ndx;
        height += ndy;
      } else if (dragMode === "resize-se") {
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

  const handlePointerUp = () => {
    setDragMode("none");
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

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
      onWheel={handleWheel}
      style={{ touchAction: "none" }}
    >
      <img
        ref={imgRef}
        src={imageUrl}
        onLoad={handleImageLoad}
        crossOrigin="anonymous"
        draggable={false}
        className="absolute origin-top-left will-change-transform"
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
            className="w-full h-full cursor-move"
            onPointerDown={(e) => {
              e.stopPropagation();
              handlePointerDown(e, "crop");
            }}
          />

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
        </div>
      )}
        {isReady && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur text-white px-4 py-2 rounded-full border border-slate-700 shadow-xl z-20">
          <div className="flex items-center gap-2">
             <span className="text-[9px] text-slate-400 font-mono">缩放</span>
             <input 
               type="range" 
               min="0.25" max="4" step="0.05"
               value={imageTransform.scale}
               onChange={(e) => setImageTransform((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))}
               className="w-20 accent-blue-500"
               onPointerDown={(e) => e.stopPropagation()} // Prevent dragging the canvas when sliding
             />
             <span className="text-[9px] text-slate-300 font-mono w-6 text-right">
               {Math.round(imageTransform.scale * 100)}%
             </span>
          </div>
          <div className="w-px h-3 bg-slate-700" />
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleImageLoad(); // Reposition and fit image again
            }}
            className="text-[10px] font-medium tracking-wide hover:text-blue-400 transition-colors"
          >
            重置裁剪
          </button>
        </div>
      )}
    </div>
  );
};
