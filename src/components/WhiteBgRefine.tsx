import React, { useState, useEffect } from "react";
import { Product, ProductAsset } from "../types";
import { VisualCalendar } from "./VisualCalendar";
import {
  Sparkles,
  Scissors,
  CheckCircle,
  Clock,
  Play,
  RotateCw,
  Image,
  Sliders,
  Maximize2,
  Trash2,
  FileIcon,
  HelpCircle,
  Download
} from "lucide-react";

interface WhiteBgRefineProps {
  products: Product[];
  selectedProductFromLib?: Product | null;
  onUpdateProductStatus: (productId: string, newStatus: Product["status"], newAssets: ProductAsset[]) => void;
}

export const WhiteBgRefine: React.FC<WhiteBgRefineProps> = ({
  products,
  selectedProductFromLib,
  onUpdateProductStatus
}) => {
  // Select which product we are refining
  const [activeProductId, setActiveProductId] = useState<string>("");

  useEffect(() => {
    if (selectedProductFromLib) {
      setActiveProductId(selectedProductFromLib.id);
    } else if (products.length > 0) {
      // Prioritize raw products first
      const raw = products.find((p) => p.status === "raw" || p.status === "white_bg_done");
      setActiveProductId(raw ? raw.id : products[0].id);
    }
  }, [selectedProductFromLib, products]);

  // Refine control states
  const [refineMode, setRefineMode] = useState<"auto" | "manual">("auto");
  const [bgColor, setBgColor] = useState<"transparent" | "white">("transparent");
  const [shadowStyle, setShadowStyle] = useState<"none" | "light" | "contact">("contact");
  const [perspectiveCorrect, setPerspectiveCorrect] = useState(true);
  const [horizontalAlign, setHorizontalAlign] = useState(true);
  const [brightnessOpt, setBrightnessOpt] = useState(true);
  const [resolutionBoost, setResolutionBoost] = useState(true);
  const [lockText, setLockText] = useState(true);
  const [lockPattern, setLockPattern] = useState(true);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Live action generation simulator
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [refineStatus, setRefineStatus] = useState<"idle" | "done">("idle");

  const selectedProduct = products.find((p) => p.id === activeProductId) || products[0];

  const existingRealPng = selectedProduct?.assets?.find(
    (a) => a.assetType === "transparent_png" && a.status === "ready" && a.fileUrl.startsWith("data:")
  );
  const hasRealPng = !!existingRealPng;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProduct) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const tempImg = new window.Image();
      tempImg.onload = () => {
        const newAsset: ProductAsset = {
          id: `ast_${selectedProduct.productCode}_uploaded_png_${Date.now()}`,
          productId: selectedProduct.id,
          assetType: "transparent_png",
          fileUrl: dataUrl,
          width: tempImg.width,
          height: tempImg.height,
          status: "ready"
        };
        (newAsset as any).fileName = file.name;

        const otherAssets = selectedProduct.assets.filter((a) => a.assetType !== "transparent_png");
        onUpdateProductStatus(selectedProduct.id, "completed", [...otherAssets, newAsset]);
        setRefineStatus("done");
      };
      tempImg.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleStartRefine = () => {
    if (!selectedProduct) return;
    setIsProcessing(true);
    setProcessProgress(10);

    let progress = 10;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        clearInterval(interval);
        setProcessProgress(100);
        finishRefining();
      } else {
        setProcessProgress(progress);
      }
    }, 300);
  };

  const finishRefining = () => {
    setIsProcessing(false);
    setRefineStatus("done");

    // Upgrade this product to "completed" and attach transparent assets
    const refinedPngAsset = existingRealPng || {
      id: `ast_${selectedProduct.productCode}_refined_png`,
      productId: selectedProduct.id,
      assetType: "transparent_png",
      fileUrl: "png",
      width: 1000,
      height: 1000,
      status: "ready"
    };

    const refinedWhiteAsset: ProductAsset = {
      id: `ast_${selectedProduct.productCode}_refined_white`,
      productId: selectedProduct.id,
      assetType: "white_bg",
      fileUrl: existingRealPng ? existingRealPng.fileUrl : "white_bg",
      width: 1000,
      height: 1000,
      status: "ready"
    };

    const refinedAssets: ProductAsset[] = [
      ...selectedProduct.assets.filter((a) => a.assetType !== "transparent_png" && a.assetType !== "white_bg"),
      refinedPngAsset,
      refinedWhiteAsset
    ];

    onUpdateProductStatus(selectedProduct.id, "completed", refinedAssets);
  };

  return (
    <div className="flex h-full min-h-[600px] gap-4 text-left">
      {/* 1. Left Section: File uploads and list queue */}
      <div className="w-64 bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between shrink-0 shadow-xs">
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 tracking-wider">上传与精修排队</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">支持批量拖挂 RAW/JPG 素材</p>
          </div>

          {/* Quick upload mockup button linked to real input */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50"
          >
            <Sparkles className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
            <span className="text-[11px] font-semibold text-slate-700 block">点击上传实拍原图</span>
            <span className="text-[9px] text-slate-400 mt-1 block">支持 PNG / JPG / WebP</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Target queue scrolling */}
          <h4 className="text-[10px] uppercase font-bold text-slate-400">选择待抠图产品</h4>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[200px]">
            {products.map((p) => {
              const isSelected = p.id === activeProductId;
              const isRaw = p.status === "raw" || p.status === "missing_assets" || p.status === "white_bg_done";
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setActiveProductId(p.id);
                    setRefineStatus("idle");
                  }}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/30 font-semibold"
                      : "border-slate-100 bg-slate-50/40 hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center space-x-1">
                      <span className="font-mono text-[9px] text-neutral-500 bg-neutral-200 px-1 rounded">
                        {p.productCode}
                      </span>
                      <span className="truncate text-[11px] text-neutral-800 font-semibold">
                        {p.productName}
                      </span>
                    </div>
                    <span className="text-[9px] text-neutral-400 block mt-0.5">
                      系列: {p.seriesName}
                    </span>
                  </div>

                  <span
                    className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                      isRaw ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-25"
                    }`}
                  >
                    {isRaw ? "待精修" : "已完成"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Middle Section: Comparative Visualizer */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between min-w-0 shadow-xs">
        <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-3.5 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-805">原相抠图与抠像蒙版实时预览</h3>
          </div>
          <div className="flex gap-1.5 text-[10px]">
            <button className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-medium transition-colors">
              原图
            </button>
            <button className="px-2.5 py-1 bg-slate-900 text-white rounded-md font-semibold text-[11px]">
              蒙版检查
            </button>
          </div>
        </div>

        {/* Real-time split preview viewport */}
        <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden p-6 relative flex items-center justify-center min-h-[300px]">
          {/* Transparent grid backing behind the png if transparent color is chosen */}
          {bgColor === "transparent" && (
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage:
                  "conic-gradient(#fff 0.25turn, #000 0.25turn 0.5turn, #fff 0.5turn 0.75turn, #000 0.75turn)",
                backgroundSize: "20px 20px"
              }}
            />
          )}

          {selectedProduct ? (
            <div className="w-80 h-80 relative flex items-center justify-center transition-all duration-300">
              {/* If we are idle and raw, render a dark backdrop style simulator */}
              {refineStatus === "idle" && !isProcessing && !hasRealPng ? (
                <div className="relative group w-full h-full p-2 bg-slate-900/95 rounded-xl border border-slate-800 flex flex-col justify-between text-slate-400">
                  <div className="absolute top-2 left-2 bg-slate-950 text-[9px] px-1.5 py-0.5 rounded text-amber-400 border border-amber-500/20 font-mono">
                    📷 相机直接实拍 (含不规则自然杂光背景)
                  </div>
                  <VisualCalendar product={selectedProduct} type="front_cover" isNakedPNG={true} className="opacity-45 scale-90" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-[11px] bg-blue-600 text-white font-semibold py-2 rounded-full px-4 cursor-pointer hover:bg-blue-700 shadow-lg shadow-blue-500/15 flex items-center space-x-1 whitespace-nowrap active:scale-95 transition-all" onClick={handleStartRefine}>
                    <Scissors className="w-3.5 h-3.5" />
                    <span>一键开始AI抠图像素级精修</span>
                  </div>
                </div>
              ) : isProcessing ? (
                /* Processing loader view */
                <div className="absolute inset-x-0 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-dashed border-blue-500 animate-spin flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-white block">正在运算精细抠像 & 轮廓校正...</span>
                    <span className="font-mono text-sm text-blue-400 mt-1.5 block">{processProgress}%</span>
                  </div>
                  <div className="w-48 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${processProgress}%` }} />
                  </div>
                </div>
              ) : (
                /* Refinement results (clean translucent background calendar) */
                <div className="w-full h-full flex flex-col justify-center items-center">
                  <VisualCalendar product={selectedProduct} type="front_cover" isNakedPNG={bgColor === "transparent"} className="scale-100" />
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center">
                    ✓ {hasRealPng ? "已载入真实 transparent_png" : "去除 100% 混杂背景"}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-neutral-400">请选择产品加载预览</span>
          )}
        </div>

        {/* 3. Bottom Section: Produced results list */}
        <div className="mt-4 border-t border-slate-100 pt-3 shrink-0">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">输出标准资产打包结果</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { type: "white_bg", label: "product_white_bg.jpg", role: "标准白底图" },
              { type: "transparent_png", label: "product_transparent.png", role: "去背透明图" },
              { type: "mask", label: "product_mask.png", role: "高精黑白掩码" },
              { type: "side", label: "product_side_trans.png", role: "侧面三角等比PNG" }
            ].map((item) => {
              const hasKey = refineStatus === "done" || selectedProduct?.status === "completed";
              return (
                <div
                  key={item.type}
                  className={`p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between h-20 text-left ${
                    hasKey ? "bg-slate-50/50 border-emerald-100" : "bg-slate-50/20 opacity-60 text-slate-400"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold block truncate text-slate-800">
                      {item.label}
                    </span>
                    <span className="text-[8px] text-slate-400 block mt-0.5">{item.role}</span>
                  </div>
                  {hasKey ? (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[9px] text-emerald-600 font-bold">1000 x 1000px</span>
                      <button className="text-slate-500 hover:text-blue-600 transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[8px] text-slate-400 mt-1">尚未进行生成</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Right side: refinement settings config */}
      <div className="w-72 bg-white rounded border p-4 flex flex-col justify-between overflow-y-auto shrink-0">
        <div className="space-y-4">
          <div className="border-b pb-2 flex justify-between items-center">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center">
              <Sliders className="w-4 h-4 mr-1 text-neutral-500" />
              智能精修设置
            </h3>
            <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
          </div>

          {/* Cut mode toggles */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">
              边缘抠图算法
            </span>
            <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-0.5 rounded text-xs">
              <button
                onClick={() => setRefineMode("auto")}
                className={`py-1 rounded font-medium ${
                  refineMode === "auto" ? "bg-white text-neutral-800 shadow-xs font-bold" : "text-neutral-500"
                }`}
              >
                云智能AI抠像
              </button>
              <button
                onClick={() => setRefineMode("manual")}
                className={`py-1 rounded font-medium ${
                  refineMode === "manual" ? "bg-white text-neutral-800 shadow-xs font-bold" : "text-neutral-500"
                }`}
              >
                经典色差校正
              </button>
            </div>
          </div>

          {/* Background selection */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase block">输出画布背景</span>
            <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-0.5 rounded text-xs">
              <button
                onClick={() => setBgColor("transparent")}
                className={`py-1 rounded font-medium ${
                  bgColor === "transparent" ? "bg-white text-neutral-800 shadow-xs font-bold" : "text-neutral-500"
                }`}
              >
                透明 PNG
              </button>
              <button
                onClick={() => setBgColor("white")}
                className={`py-1 rounded font-medium ${
                  bgColor === "white" ? "bg-white text-neutral-800 shadow-xs font-bold" : "text-neutral-500"
                }`}
              >
                纯白底图 JPG
              </button>
            </div>
          </div>

          {/* Product shadow style selection */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase block">接触式自然阴影</span>
            <div className="grid grid-cols-3 gap-1 bg-neutral-100 p-0.5 rounded text-xs">
              {[
                { id: "none", name: "无阴影" },
                { id: "light", name: "轻阴影" },
                { id: "contact", name: "自然折角" }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setShadowStyle(item.id as any)}
                  className={`py-1 rounded font-medium ${
                    shadowStyle === item.id ? "bg-white text-neutral-800 shadow-xs font-bold" : "text-neutral-500"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Checkboxes items */}
          <div className="space-y-2 border-t pt-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase block">产品轮廓校正与智能优化</span>

            <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={perspectiveCorrect}
                onChange={(e) => setPerspectiveCorrect(e.target.checked)}
                className="rounded border-neutral-300 text-red-650 focus:ring-red-500"
              />
              <span>透视倾斜校正 (自动纠偏纠转)</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={horizontalAlign}
                onChange={(e) => setHorizontalAlign(e.target.checked)}
                className="rounded border-neutral-300 text-red-650 focus:ring-red-500"
              />
              <span>水平中轴线几何校准</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={brightnessOpt}
                onChange={(e) => setBrightnessOpt(e.target.checked)}
                className="rounded border-neutral-300 text-red-650 focus:ring-red-500"
              />
              <span>智能色彩/亮度/暗区重映射</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={resolutionBoost}
                onChange={(e) => setResolutionBoost(e.target.checked)}
                className="rounded border-neutral-300 text-red-650 focus:ring-red-500"
              />
              <span>超分清晰度增强 (2x 物理插值)</span>
            </label>
          </div>

          <div className="space-y-2 border-t pt-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase block">图案与雕花强力保护约束</span>

            <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                disabled
                checked={lockText}
                className="rounded border-neutral-300 text-red-650 focus:ring-red-500 opacity-60"
              />
              <span className="font-semibold text-neutral-800">保持台历文字/印刷字形不变 (强约束)</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                disabled
                checked={lockPattern}
                className="rounded border-neutral-300 text-red-650 focus:ring-red-500 opacity-60"
              />
              <span className="font-semibold text-neutral-800">保持金雕、烫印镂空纹理真实 (强约束)</span>
            </label>
            <p className="text-[9px] text-neutral-400 pl-5 leading-normal">
              提示：锁定产品图案、日期、铁骨卷轴等真实印刷细节，不交给扩散神经网络自由画图或瞎改。
            </p>
          </div>
        </div>

        {/* Start button trigger */}
        <button
          onClick={handleStartRefine}
          disabled={isProcessing}
          className="w-full mt-4 bg-red-650 hover:bg-red-700 disabled:bg-neutral-300 text-white font-bold py-2.5 px-4 rounded text-xs flex items-center justify-center space-x-1 shadow"
        >
          <Play className="w-4 h-4 shrink-0" />
          <span>{isProcessing ? "拼装精修中..." : "一键开始AI白底去影精修"}</span>
        </button>
      </div>
    </div>
  );
};
