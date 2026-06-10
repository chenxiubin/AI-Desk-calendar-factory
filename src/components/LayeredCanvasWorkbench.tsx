import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Layers,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  ChevronUp,
  ChevronDown,
  Maximize2,
  RotateCw,
  Plus,
  RefreshCw,
  Save,
  Undo,
  ArrowLeft,
  ChevronRight,
  Monitor,
  Video,
  FileText,
  Palette,
  Layout,
  Info,
  Check,
  Compass,
  FileQuestion,
} from "lucide-react";
import {
  Template,
  Product,
  TemplateSuite,
  ProductAssetPack,
  GeneratedPage,
  PageLayerInstance,
  PageLayerType,
  ProductAsset,
  ProductAssetRole,
} from "../types";
import {
  renderFusionBaseFromLayers,
  renderFinalCompositeFromLayers,
} from "../utils/renderTemplate";

// Helper converts template design components to layout-ready PageLayerInstance elements
export function convertTemplateToLayers(
  template: Template,
  pageId: string,
  assignedAssetId?: string,
): PageLayerInstance[] {
  const layers: PageLayerInstance[] = [];

  // If template has components, convert them directly (skip hardcoded Unsplash fallback)
  if (template.components && template.components.length > 0) {
    template.components.forEach((comp, idx) => {
      let lType: PageLayerType = "custom_asset";
      if (comp.type === "scene_base") lType = "scene_base";
      else if (comp.type === "product_slot") lType = "product";
      else if (comp.type === "text_overlay") lType = "text_overlay";
      else if (comp.type === "decor_overlay") lType = "decor_overlay";
      else if (comp.type === "logo_overlay") lType = "logo_overlay";

      layers.push({
        id: `layer_comp_${comp.id}_${idx}`,
        pageId,
        sourceComponentId: comp.id,
        layerType: lType,
        assetId: lType === "product" ? assignedAssetId : undefined,
        imageUrl: comp.imageUrl,
        name: comp.name,
        x: comp.x,
        y: comp.y,
        width: comp.width,
        height: comp.height,
        rotation: comp.defaultRotation || 0,
        zIndex: comp.zIndex || idx + 2,
        visible: comp.visible !== false,
        locked: comp.type === "scene_base",
        opacity: 1.0,
        anchor:
          comp.anchor ||
          (comp.scaleMode === "cover" ? "center" : "bottom_center"),
        scaleMode: comp.scaleMode,
        lockAspectRatio: comp.lockAspectRatio !== false,
        sendToRunningHub: comp.sendToRunningHub,
      });
    });
  } else {
    // 3. Fallback convert template slot definitions onto Layer instances
    template.slots.forEach((slot, idx) => {
      layers.push({
        id: `layer_slot_${slot.id || slot.slotId}_${idx}`,
        pageId,
        layerType: "product",
        assetId: assignedAssetId,
        name: slot.slotName || "切片产品图层",
        x: slot.x,
        y: slot.y,
        width: slot.maxWidth,
        height: slot.maxHeight,
        rotation: 0,
        zIndex: slot.layer || idx + 3,
        visible: true,
        locked: false,
        opacity: 1.0,
        anchor: slot.anchor || "bottom_center",
        scaleMode: slot.scaleMode,
        lockAspectRatio: slot.lockAspectRatio !== false,
        sendToRunningHub: true,
      });
    });
  }

  // 4. Fallback textFields
  template.textFields.forEach((tf, idx) => {
    layers.push({
      id: `layer_tf_${tf.id || idx}`,
      pageId,
      layerType: "text_overlay",
      name: `模板文字: ${tf.fieldName} (${tf.content})`,
      x: tf.x,
      y: tf.y,
      width: 40,
      height: 8,
      rotation: 0,
      zIndex: 15 + idx,
      visible: true,
      locked: false,
      opacity: 1.0,
      anchor: "center",
      lockAspectRatio: false,
      sendToRunningHub: false,
    });
  });

  return layers.sort((a, b) => a.zIndex - b.zIndex);
}

// Beautiful Preset Design Components for drag-and-drop mockups
interface PresetComponentAsset {
  id: string;
  name: string;
  layerType: PageLayerType;
  imageUrl: string;
  width: number;
  height: number;
  sendToRunningHub: boolean;
}

const PRESET_PS_COMPONENTS: PresetComponentAsset[] = [
  {
    id: "ps_sb_01",
    name: "新中式紫砂茶台底座 (scene_base)",
    layerType: "scene_base",
    imageUrl:
      "https://images.unsplash.com/photo-1540317580114-ed684c15fc97?q=80&w=600&auto=format&fit=crop",
    width: 100,
    height: 100,
    sendToRunningHub: true,
  },
  {
    id: "ps_sb_02",
    name: "北欧极简水泥办公场景 (scene_base)",
    layerType: "scene_base",
    imageUrl:
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=600&auto=format&fit=crop",
    width: 100,
    height: 100,
    sendToRunningHub: true,
  },
  {
    id: "ps_to_01",
    name: "水墨狂草“山河无恙” (text_overlay)",
    layerType: "text_overlay",
    imageUrl:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=400",
    width: 35,
    height: 25,
    sendToRunningHub: false,
  },
  {
    id: "ps_to_02",
    name: "高档奢华烫金边框 (decor_overlay)",
    layerType: "decor_overlay",
    imageUrl:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=500&auto=format&fit=crop",
    width: 90,
    height: 90,
    sendToRunningHub: false,
  },
  {
    id: "ps_lo_01",
    name: "年画社认证精雕钢印 (logo_overlay)",
    layerType: "logo_overlay",
    imageUrl:
      "https://images.unsplash.com/photo-1590076212592-ed4e7c7a52f4?q=80&w=300",
    width: 15,
    height: 15,
    sendToRunningHub: false,
  },
];

interface LayeredCanvasWorkbenchProps {
  page: GeneratedPage;
  allPages: GeneratedPage[];
  productPack: ProductAssetPack | null;
  templates: Template[];
  product: Product;
  onSavePageLayers: (
    pageId: string,
    layers: PageLayerInstance[],
    fileUrl?: string,
    status?: any,
  ) => void;
  onClose: () => void;
  onSwitchPage: (pageId: string) => void;
}

export const LayeredCanvasWorkbench: React.FC<LayeredCanvasWorkbenchProps> = ({
  page,
  allPages,
  productPack,
  templates,
  product,
  onSavePageLayers,
  onClose,
  onSwitchPage,
}) => {
  // Initialize layers: if page has saved layers, use them; otherwise, generate from current template
  const [layers, setLayers] = useState<PageLayerInstance[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  // Zoom view state
  const [zoomScale, setZoomScale] = useState<number>(0.85); // 0.5 to 1.5 relative sizing

  // Renderer state
  const [isRendering, setIsRendering] = useState(false);
  const [renderMessage, setRenderMessage] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load or generate layers on mount/page change
  useEffect(() => {
    if (page.layers && page.layers.length > 0) {
      setLayers([...page.layers].sort((a, b) => a.zIndex - b.zIndex));
    } else {
      const activeT = templates.find((t) => t.id === page.templateId);
      if (activeT) {
        const initialized = convertTemplateToLayers(
          activeT,
          page.id,
          page.assignedAssetIds[0],
        );
        setLayers(initialized);
      }
    }
    setActiveLayerId(null);
  }, [page.id, page.templateId]);

  // Current template and details
  const activeTemplate =
    templates.find((t) => t.id === page.templateId) || templates[0];

  const updateLayersState = (newLayers: PageLayerInstance[]) => {
    // Keep sorted by zIndex for internal representation but let state handle edits
    setLayers(newLayers.sort((a, b) => a.zIndex - b.zIndex));
  };

  const onUpdateLayer = (
    layerId: string,
    updates: Partial<PageLayerInstance>,
  ) => {
    const updated = layers.map((layer) => {
      if (layer.id === layerId) {
        return { ...layer, ...updates };
      }
      return layer;
    });
    updateLayersState(updated);
  };

  // Adding new layers on canvas (either via dragging or clicking)
  const handleAddNewProductLayer = (asset: ProductAsset) => {
    const newLayer: PageLayerInstance = {
      id: `layer_user_asset_${Date.now()}`,
      pageId: page.id,
      layerType: "product",
      assetId: asset.id,
      imageUrl: asset.fileUrl,
      name: `导入切片: ${asset.assetRole || "自定义"}`,
      x: 50,
      y: 50,
      width: 40,
      height: 40,
      rotation: 0,
      zIndex: layers.length + 5,
      visible: true,
      locked: false,
      opacity: 1.0,
      anchor: "center",
      lockAspectRatio: true,
      sendToRunningHub: true,
    };
    updateLayersState([...layers, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const handleAddNewPSComponentLayer = (preset: PresetComponentAsset) => {
    const newLayer: PageLayerInstance = {
      id: `layer_preset_comp_${Date.now()}`,
      pageId: page.id,
      layerType: preset.layerType,
      imageUrl: preset.imageUrl,
      name: preset.name,
      x: 50,
      y: 50,
      width: preset.width,
      height: preset.height,
      rotation: 0,
      zIndex: layers.length + 5,
      visible: true,
      locked: false,
      opacity: 1.0,
      anchor: "center",
      lockAspectRatio: preset.layerType !== "scene_base",
      sendToRunningHub: preset.sendToRunningHub,
    };
    updateLayersState([...layers, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  // Drag element movement logic
  const handleLayerMouseDown = (
    e: React.MouseEvent,
    layer: PageLayerInstance,
  ) => {
    if (layer.locked || !layer.visible) {
      // Just select but don't drag
      setActiveLayerId(layer.id);
      return;
    }

    e.stopPropagation();
    setActiveLayerId(layer.id);

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = layer.x;
    const initialY = layer.y;

    const mouseMoveHandler = (moveEvt: MouseEvent) => {
      // Convert browser delta pixels to relative container percentage
      const deltaX = ((moveEvt.clientX - startX) / rect.width) * 100;
      const deltaY = ((moveEvt.clientY - startY) / rect.height) * 100;

      // Restrict within slightly generous canvas boundaries (-50 to 150)
      let nextX = Math.round((initialX + deltaX) * 10) / 10;
      let nextY = Math.round((initialY + deltaY) * 10) / 10;

      // Smart alignment reference lines snap (snaps to vertical center 50% and horizontal center 50%)
      if (Math.abs(nextX - 50) < 1.8) nextX = 50;
      if (Math.abs(nextY - 50) < 1.8) nextY = 50;

      onUpdateLayer(layer.id, { x: nextX, y: nextY });
    };

    const mouseUpHandler = () => {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };

    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
  };

  // Resize element drag handle logic (bottom-right edge)
  const handleResizeMouseDown = (
    e: React.MouseEvent,
    layer: PageLayerInstance,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = layer.width;
    const initialH = layer.height;

    const mouseMoveHandler = (moveEvt: MouseEvent) => {
      const deltaW = ((moveEvt.clientX - startX) / rect.width) * 100;
      const deltaH = ((moveEvt.clientY - startY) / rect.height) * 100;

      let nextW = Math.max(3, initialW + deltaW * 2); // scaling symmetrically
      let nextH = Math.max(3, initialH + deltaH * 2);

      if (layer.lockAspectRatio) {
        // Enforce preset aspect ratio matching initial bounds
        const startRatio = initialW / initialH;
        nextH = nextW / startRatio;
      }

      onUpdateLayer(layer.id, {
        width: Math.round(nextW * 10) / 10,
        height: Math.round(nextH * 10) / 10,
      });
    };

    const mouseUpHandler = () => {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };

    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
  };

  // Rotation drag handle logic
  const handleRotateMouseDown = (
    e: React.MouseEvent,
    layer: PageLayerInstance,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // Center pivot of target card
    const pivotX = rect.left + rect.width * (layer.x / 100);
    const pivotY = rect.top + rect.height * (layer.y / 100);

    const mouseMoveHandler = (moveEvt: MouseEvent) => {
      const angleRad = Math.atan2(
        moveEvt.clientY - pivotY,
        moveEvt.clientX - pivotX,
      );
      let angleDeg = Math.round((angleRad * 180) / Math.PI) + 90; // offset pointing straight up
      if (angleDeg < 0) angleDeg += 360;

      onUpdateLayer(layer.id, { rotation: angleDeg % 360 });
    };

    const mouseUpHandler = () => {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    };

    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
  };

  // Layer order modifiers
  const handleLayerOrderUp = (layerId: string) => {
    const idx = layers.findIndex((l) => l.id === layerId);
    if (idx === -1 || idx === layers.length - 1) return;
    const updated = [...layers];
    // swap zIndices
    const tempZ = updated[idx].zIndex;
    updated[idx].zIndex = updated[idx + 1].zIndex;
    updated[idx + 1].zIndex = tempZ;
    updateLayersState(updated);
  };

  const handleLayerOrderDown = (layerId: string) => {
    const idx = layers.findIndex((l) => l.id === layerId);
    if (idx === -1 || idx === 0) return;
    const updated = [...layers];
    const tempZ = updated[idx].zIndex;
    updated[idx].zIndex = updated[idx - 1].zIndex;
    updated[idx - 1].zIndex = tempZ;
    updateLayersState(updated);
  };

  const handleLayerOrderToTop = (layerId: string) => {
    const maxZ = Math.max(...layers.map((l) => l.zIndex), 0);
    onUpdateLayer(layerId, { zIndex: maxZ + 1 });
  };

  const handleLayerOrderToBottom = (layerId: string) => {
    const minZ = Math.min(...layers.map((l) => l.zIndex), 0);
    onUpdateLayer(layerId, { zIndex: minZ - 1 });
  };

  const handleDeleteLayer = (layerId: string) => {
    const filtered = layers.filter((l) => l.id !== layerId);
    updateLayersState(filtered);
    if (activeLayerId === layerId) setActiveLayerId(null);
  };

  // Template custom swapper with warn popup for styling inconsistency
  const handleSwapTemplate = (newTemplateId: string) => {
    const template = templates.find((t) => t.id === newTemplateId);
    if (!template) return;

    const crossSuiteWarn = templates.some(
      (t) => t.id === newTemplateId && t.templateType !== page.pageType,
    );
    if (crossSuiteWarn) {
      const confirmSwap = window.confirm(
        "⚠️ 您挑选的单页模板并非当前套系的最佳预定页面类型，可能会影响全套输出的视觉统一感。是否确认强制跨套系选用？",
      );
      if (!confirmSwap) return;
    }

    // Convert new template slots to layers
    const freshLayers = convertTemplateToLayers(
      template,
      page.id,
      page.assignedAssetIds[0],
    );
    updateLayersState(freshLayers);
    setActiveLayerId(null);
  };

  // Offline Generation Compiles
  const renderCompositeInWorkbench = async () => {
    setIsRendering(true);
    setRenderMessage(
      "正在调取本地画布进行首期融合底图合成... (Only base scene + product)",
    );
    try {
      // 1. Generate local fusion base image
      const base64FusionBase = await renderFusionBaseFromLayers(
        layers,
        product,
        activeTemplate,
      );

      // Since RunningHub integration is simulated, we immediately proceed to the final step
      setRenderMessage(
        "多图层渲染引擎：拼合非RunningHub前端文字 overlay / 装饰背景...",
      );
      const finalCompositeUrl = await renderFinalCompositeFromLayers(
        base64FusionBase,
        layers,
        product,
        activeTemplate,
      );

      // Save to parent state immediately
      onSavePageLayers(
        page.id,
        layers,
        finalCompositeUrl,
        "base_ready" as const,
      );
      setIsRendering(false);
      setRenderMessage("");
      alert("✅ 电商图多层合成成功！已同步最终拼贴到批量套套工作台。");
    } catch (err) {
      console.error(err);
      setIsRendering(false);
      setRenderMessage("");
      alert("画布离线渲染失败，请检查图层切片连通性。");
    }
  };

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans select-none overflow-hidden relative">
      {/* Upper Tools bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="返回套系首页"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950 px-2 py-0.5 rounded border border-indigo-900">
                可修改画板 (PS View)
              </span>
              <span className="text-slate-400 text-xs font-mono">
                Canvas: {activeTemplate.outputWidth} ×{" "}
                {activeTemplate.outputHeight} px
              </span>
            </div>
            <h1 className="text-sm font-black text-white mt-1 leading-none">
              正在编辑：{page.pageName} ({page.pageType})
            </h1>
          </div>
        </div>

        {/* Top middle feedback info */}
        {isRendering && (
          <div className="bg-indigo-950 border border-indigo-800 rounded-xl px-4 py-1.5 text-xs text-indigo-300 animate-pulse flex items-center space-x-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{renderMessage}</span>
          </div>
        )}

        <div className="flex items-center space-x-3">
          {/* Zoom Adjustments */}
          <div className="bg-slate-950/80 rounded-lg border border-slate-800 p-1 flex items-center space-x-1 text-xs">
            <button
              type="button"
              onClick={() => setZoomScale(Math.max(0.4, zoomScale - 0.15))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 font-bold"
            >
              －
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-300 w-12 text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale(Math.min(1.5, zoomScale + 0.15))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 font-bold"
            >
              ＋
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onSavePageLayers(page.id, layers);
              alert("💾 草图布局已安全暂存。");
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-3.5 rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>仅存草图</span>
          </button>

          <button
            type="button"
            onClick={renderCompositeInWorkbench}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-1.5 px-4 rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>合成输出此页 (Compile)</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Assets and Library picker */}
        <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto shrink-0 select-none">
          <div className="p-4 space-y-5">
            {/* 1. Page template selectors */}
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-extrabold text-slate-400 block tracking-wider uppercase">
                📖 跨套系单页模板挑选
              </span>
              <div className="space-y-1">
                <select
                  value={page.templateId}
                  onChange={(e) => handleSwapTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-slate-200"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.templateType}] {t.templateName}
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 font-medium">
                  双击或选择即可重构此画板的物理图层架构。
                </p>
              </div>
            </div>

            {/* 2. Drag / Click to add Product Assets Pack */}
            <div className="space-y-2 text-left pt-2 border-t border-slate-800">
              <span className="text-[10px] font-extrabold text-slate-400 block tracking-wider uppercase">
                📂 当前产品资产包 (ProductAssetPack)
              </span>

              {productPack ? (
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-400 block">
                    产品编码: <code>{productPack.productCode}</code> (
                    {productPack.productName})
                  </span>

                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {productPack.assets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => handleAddNewProductLayer(asset)}
                        className="bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-lg p-1.5 relative flex flex-col justify-between items-center cursor-pointer transition-all hover:scale-[1.02]"
                        title="点击添加到图层"
                      >
                        <div className="w-full h-16 bg-slate-900 rounded flex items-center justify-center p-1 relative overflow-hidden">
                          {asset.fileUrl ? (
                            <img
                              src={asset.fileUrl}
                              alt="slice"
                              className="w-full h-full object-contain pointer-events-none"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-[16px]">📷</span>
                          )}
                          <span className="absolute bottom-1 right-1 bg-slate-950/80 text-white text-[8px] font-mono leading-none px-1 py-0.5 rounded">
                            {asset.assetType}
                          </span>
                        </div>
                        <span className="text-[9.5px] font-bold text-slate-300 mt-1 truncate w-full text-center">
                          {asset.assetRole || "white_bg"}
                        </span>

                        {/* Plus hover badge */}
                        <div className="absolute top-1 left-1 bg-emerald-500 text-white p-0.5 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                          <Plus className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 rounded border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  无绑定产品资产原件
                </div>
              )}
            </div>

            {/* 3. PS Design Components preset overlays */}
            <div className="space-y-2 text-left pt-2 border-t border-slate-800">
              <span className="text-[10px] font-extrabold text-[#7DD3FC] block tracking-wider uppercase">
                🧩 PS 高级设计组件区 (Overlays & Decals)
              </span>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {PRESET_PS_COMPONENTS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleAddNewPSComponentLayer(preset)}
                    className="bg-slate-950 border border-slate-800 hover:border-sky-500 rounded-lg p-2 flex items-center space-x-2.5 cursor-pointer hover:bg-slate-900/60 transition-all text-left"
                    title="点击将其添加到画布中"
                  >
                    <div className="w-10 h-10 bg-slate-900 rounded border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center">
                      <img
                        src={preset.imageUrl}
                        alt={preset.name}
                        className="w-full h-full object-cover pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-[10.5px] font-bold text-slate-200 truncate">
                        {preset.name}
                      </h4>
                      <code className="text-[9px] text-sky-400 block font-mono">
                        {preset.layerType} /{" "}
                        {preset.sendToRunningHub ? "参融" : "合成层"}
                      </code>
                    </div>

                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* Help tip card */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-left text-[10px] leading-relaxed text-slate-400">
              <div className="flex items-center text-indigo-400 font-bold space-x-1">
                <Info className="w-3 h-3" />
                <span>分层合成图规则提醒</span>
              </div>
              <p>
                <b>融合层 (sendToRunningHub=true):</b> 仅{" "}
                <code>scene_base</code> 与 <code>product</code> 在发送
                RunningHub 融合时渲染，系统将合并其阴影和漫反射。
              </p>
              <span className="block mt-1">
                <b>合成层 (sendToRunningHub=false):</b> 文字{" "}
                <code>text_overlay</code>, 定制 <code>decor_overlay</code>{" "}
                等将在融合完成后，在顶层高清无损贴上。
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Canvas View Box */}
        <div className="flex-1 bg-slate-950 p-6 flex items-center justify-center relative overflow-auto">
          {/* Centered Align reference line guide display */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[1px] h-full border-l border-dashed border-slate-800/60" />
            <div className="h-[1px] w-full border-t border-dashed border-slate-800/60 absolute" />
          </div>

          {/* Core Dynamic Canvas Element */}
          <div
            ref={containerRef}
            className="shrink-0 relative shadow-2xl transition-all border border-slate-750 overflow-hidden rounded bg-slate-900 select-none cursor-default"
            style={{
              width: `${(activeTemplate.outputWidth || 800) * zoomScale}px`,
              height: `${(activeTemplate.outputHeight || 800) * zoomScale}px`,
              backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
            onClick={() => setActiveLayerId(null)}
          >
            {/* 1. Draw layers in Z-Index Order */}
            {layers.map((layer) => {
              if (!layer.visible) return null;

              const isActive = layer.id === activeLayerId;
              const drawW = layer.width;
              const drawH = layer.height;

              // Calculate style rules utilizing percentages exactly
              const outerStyle: React.CSSProperties = {
                position: "absolute",
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${drawW}%`,
                height: `${drawH}%`,
                transform: `translate(-50%, ${layer.anchor === "center" ? "-50%" : "-100%"}) rotate(${layer.rotation || 0}deg)`,
                opacity: layer.opacity !== undefined ? layer.opacity : 1.0,
                zIndex: layer.zIndex,
                pointerEvents: layer.locked ? "none" : "auto",
              };

              let computedImgUrl = layer.imageUrl || "";
              if (
                layer.layerType === "product" &&
                layer.assetId &&
                productPack
              ) {
                const specAIdx = productPack.assets.find(
                  (as) => as.id === layer.assetId,
                );
                if (specAIdx) computedImgUrl = specAIdx.fileUrl;
              }

              return (
                <div
                  key={layer.id}
                  style={outerStyle}
                  onMouseDown={(e) => handleLayerMouseDown(e, layer)}
                  className={`group ${
                    isActive
                      ? "ring-2 ring-indigo-500 rounded-sm"
                      : "hover:ring-1 hover:ring-slate-400"
                  }`}
                >
                  {/* Layer content */}
                  {computedImgUrl ? (
                    <img
                      src={computedImgUrl}
                      alt={layer.name}
                      style={{
                        objectFit:
                          layer.scaleMode ||
                          (layer.layerType === "scene_base"
                            ? "cover"
                            : "contain"),
                      }}
                      className="w-full h-full pointer-events-none select-none"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800/80 border border-slate-700/80 rounded flex flex-col justify-center items-center text-center p-2 text-slate-400 pointer-events-none">
                      <span className="text-[15px] font-bold">📄</span>
                      <span className="text-[8.5px] tracking-tight">
                        {layer.name}
                      </span>
                    </div>
                  )}

                  {/* Anchor Point visualization */}
                  {isActive && (
                    <span
                      className="absolute w-2 h-2 bg-indigo-505 bg-rose-500 rounded-full border border-white"
                      style={{
                        left: "50%",
                        top: layer.anchor === "center" ? "50%" : "100%",
                        transform: "translate(-50%, -50%)",
                      }}
                      title="Anchor Point"
                    />
                  )}

                  {/* Corner resizing handle */}
                  {isActive && !layer.locked && (
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(e, layer)}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-500 border border-white rounded-full cursor-se-resize flex items-center justify-center shadow z-10 hover:scale-125 transition-transform"
                      title="调整尺寸 (Lock Aspect Ratio)"
                    >
                      <Maximize2 className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}

                  {/* Top rotation handle */}
                  {isActive && !layer.locked && (
                    <div
                      onMouseDown={(e) => handleRotateMouseDown(e, layer)}
                      className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 bg-indigo-600 border border-white rounded-full cursor-alias flex items-center justify-center shadow z-10 hover:bg-indigo-500"
                      title="拖拽进行旋转"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side Panel: Layers lists and absolute Property settings */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden shrink-0">
          {/* Top Panel: Property editors */}
          <div className="p-4 border-b border-slate-800 space-y-3.5 text-left shrink-0">
            <span className="text-[10px] font-extrabold text-slate-400 block tracking-wider uppercase">
              📐 图层物理属性区 (Core properties)
            </span>

            {activeLayer ? (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-500 block font-bold">
                    X轴百分比 (x)
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    value={activeLayer.x}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, {
                        x: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 block font-bold">
                    Y轴百分比 (y)
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    value={activeLayer.y}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, {
                        y: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 block font-bold">
                    图层高宽 (W) %
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    value={activeLayer.width}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, {
                        width: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 block font-bold">
                    图层高度 (H) %
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    value={activeLayer.height}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, {
                        height: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 block font-bold">
                    绝对旋转 (角度)
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={activeLayer.rotation}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, {
                        rotation: Number(e.target.value) % 360,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 block font-bold">
                    层级优先 (zIndex)
                  </span>
                  <input
                    type="number"
                    value={activeLayer.zIndex}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, {
                        zIndex: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span className="font-bold">图层不透明度 (Opacity)</span>
                    <span className="font-mono text-slate-350">
                      {(activeLayer.opacity || 1).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={
                      activeLayer.opacity !== undefined
                        ? activeLayer.opacity
                        : 1.0
                    }
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, {
                        opacity: Number(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="cb_lockRatio"
                      checked={activeLayer.lockAspectRatio}
                      onChange={(e) =>
                        onUpdateLayer(activeLayer.id, {
                          lockAspectRatio: e.target.checked,
                        })
                      }
                      className="rounded text-indigo-600 focus:ring-0 bg-slate-950 border-slate-850 cursor-pointer"
                    />
                    <label
                      htmlFor="cb_lockRatio"
                      className="text-[11px] text-slate-300 font-bold cursor-pointer select-none"
                    >
                      等比例锁定宽高比 (Lock Aspect)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="cb_fusionHub"
                      checked={activeLayer.sendToRunningHub}
                      onChange={(e) =>
                        onUpdateLayer(activeLayer.id, {
                          sendToRunningHub: e.target.checked,
                        })
                      }
                      className="rounded text-indigo-600 focus:ring-0 bg-slate-950 border-slate-850 cursor-pointer"
                    />
                    <label
                      htmlFor="cb_fusionHub"
                      className="text-[11px] text-slate-300 font-bold cursor-pointer select-none"
                    >
                      🚀 连接到 RunningHub 融合算法
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center">
                <span className="text-slate-500 text-xs font-bold">
                  请点击画板中元素或右侧图层，直接调优属性。
                </span>
              </div>
            )}
          </div>

          {/* Lower Panel: Grouped Layers Stack */}
          <div className="flex-1 flex flex-col overflow-hidden text-left">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/40 shrink-0">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Layers className="w-3 h-3" />
                <span>图层堆栈区 ({layers.length} 个图层)</span>
              </span>
            </div>

            {/* List scrollable layers sorted descending (rendering top index on top) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {[...layers].reverse().map((ly) => {
                const isAct = ly.id === activeLayerId;
                return (
                  <div
                    key={ly.id}
                    onClick={() => setActiveLayerId(ly.id)}
                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                      isAct
                        ? "bg-slate-800 border-indigo-500 shadow-md"
                        : "bg-slate-950 border-slate-850 hover:bg-slate-900"
                    }`}
                  >
                    {/* Name & Type Tag */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ly.layerType === "scene_base"
                              ? "bg-amber-400"
                              : ly.layerType === "product"
                                ? "bg-emerald-400"
                                : "bg-sky-450 bg-sky-400"
                          }`}
                        />
                        <h4 className="text-[10.5px] font-black text-slate-100 truncate">
                          {ly.name}
                        </h4>
                      </div>
                      <span className="text-[8.5px] text-slate-500 block font-mono">
                        Z:{ly.zIndex} | X:{ly.x}% | Y:{ly.y}%
                      </span>
                    </div>

                    {/* Small Quick Actions toolbar */}
                    <div
                      className="flex items-center space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Visibility */}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLayer(ly.id, { visible: !ly.visible })
                        }
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      >
                        {ly.visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-rose-500" />
                        )}
                      </button>

                      {/* Lock toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLayer(ly.id, { locked: !ly.locked })
                        }
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                      >
                        {ly.locked ? (
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Order shifts */}
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => handleLayerOrderUp(ly.id)}
                          className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLayerOrderDown(ly.id)}
                          className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteLayer(ly.id)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottome Area: Carousel slide items switches instantly */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 shrink-0 flex items-center space-x-4 select-none">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block shrink-0">
          📅 套系内所有页面快捷切换 (Fast Switcher)
        </span>

        <div className="flex-1 flex space-x-3 overflow-x-auto pb-1">
          {allPages.map((pg, i) => {
            const isSelf = pg.id === page.id;
            return (
              <div
                key={pg.id}
                onClick={() => {
                  // Prompt to save layers before switching
                  onSavePageLayers(page.id, layers);
                  onSwitchPage(pg.id);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer flex items-center space-x-2 shrink-0 transition-all ${
                  isSelf
                    ? "bg-indigo-650 bg-indigo-600 text-white border-indigo-400 font-extrabold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="text-slate-500 font-mono">#{i + 1}</span>
                <span>
                  {pg.pageType.toUpperCase()} (
                  {pg.status === "approved" ? "已通" : "未通"})
                </span>

                {pg.fileUrl && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
