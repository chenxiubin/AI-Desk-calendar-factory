import React, { useState, useEffect, useRef } from "react";
import { Product, ProductAsset } from "../types";
import { PRESET_RUNNINGHUB_WORKFLOWS } from "../data";
import { runRunningHubMatting, pollRunningHubTask } from "../utils/runningHubMatting";
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
  Download,
  AlertTriangle
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

  // Core configs requested by user
  const [outputPng, setOutputPng] = useState(true);
  const [outputWhiteBg, setOutputWhiteBg] = useState(true);
  const [outputMask, setOutputMask] = useState(false);
  const [autoGenWhiteJpg, setAutoGenWhiteJpg] = useState(true);
  const [writeToAssets, setWriteToAssets] = useState(true);

  // States for new RunningHub matting workflow task tracking
  const [uploadedRawUrl, setUploadedRawUrl] = useState<string>("");
  const [mattingTaskId, setMattingTaskId] = useState<string>("");
  const [mattingStatus, setMattingStatus] = useState<"idle" | "queued" | "running" | "completed" | "failed">("idle");
  const [mattingProgress, setMattingProgress] = useState<number>(0);
  const [mattingError, setMattingError] = useState<string>("");

  const [mattingResultUrl, setMattingResultUrl] = useState<string>("");
  const [whiteBgResultUrl, setWhiteBgResultUrl] = useState<string>("");
  const [maskResultUrl, setMaskResultUrl] = useState<string>("");

  // Preview display selector mode
  const [previewMode, setPreviewMode] = useState<"raw" | "png" | "white_bg" | "mask">("raw");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find((p) => p.id === activeProductId) || products[0];

  // Retrieve the preset matting workflow configuration
  const mattingWorkflow = PRESET_RUNNINGHUB_WORKFLOWS.find((w) => w.id === "rh_matting_cutout") || {
    id: "rh_matting_cutout",
    name: "RunningHub 产品抠图 / 透明PNG生成",
    workflowId: "",
    apiMode: "run_workflow_v2",
    modelType: "qwen_image_edit",
    baseImageNodeId: "",
    baseImageFieldName: "image",
    promptNodeId: "",
    promptFieldName: "",
    outputNodeId: "",
    defaultPrompt: "",
    defaultNegativePrompt: "",
    defaultDenoise: 1,
    enabled: true
  };

  const isWorkflowConfigured = !!(mattingWorkflow.workflowId && (mattingWorkflow.baseImageNodeId || mattingWorkflow.inputImageNodeId));

  // Automatically switch preview modes when results load
  useEffect(() => {
    if (mattingResultUrl) {
      setPreviewMode("png");
    } else {
      setPreviewMode("raw");
    }
  }, [mattingResultUrl]);

  // Synchronize initial input file uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProduct) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedRawUrl(dataUrl);

      // Reset previous results for clean state
      setMattingResultUrl("");
      setWhiteBgResultUrl("");
      setMaskResultUrl("");
      setMattingStatus("idle");
      setMattingProgress(0);
      setMattingError("");
      setPreviewMode("raw");
    };
    reader.readAsDataURL(file);
  };

  // Implement the core matting pipeline trigger
  const handleStartMatting = async () => {
    if (!selectedProduct) return;

    // Pick source image: prefers user's uploaded local raw image, else uses any existing asset URL as fallback
    let sourceImageUrl = uploadedRawUrl;
    if (!sourceImageUrl) {
      const firstAsset = selectedProduct.assets?.find((a) => a.fileUrl && a.fileUrl.startsWith("http"));
      if (firstAsset) {
        sourceImageUrl = firstAsset.fileUrl;
      }
    }

    if (!sourceImageUrl) {
      setMattingError("请先选择或在左上角上传一张实拍原图图片，以开始产品抠图。");
      setMattingStatus("failed");
      return;
    }

    if (!isWorkflowConfigured) {
      setMattingError("请先配置 RunningHub 抠图工作流 workflowId 和输入输出节点。");
      setMattingStatus("failed");
      return;
    }

    try {
      setMattingError("");
      setMattingStatus("queued");
      setMattingProgress(15);

      const res = await runRunningHubMatting({
        imageUrlOrBase64: sourceImageUrl,
        workflowConfig: mattingWorkflow as any
      });

      setMattingTaskId(res.taskId);
      setMattingStatus("running");
      setMattingProgress(40);

      // Start asynchronous state polling
      startPolling(res.taskId);
    } catch (err: any) {
      console.error(err);
      setMattingError(err.message || "RunningHub 抠图启动失败");
      setMattingStatus("failed");
      setMattingProgress(0);
    }
  };

  // Poll RunningHub task progress asynchronously
  const startPolling = (taskId: string) => {
    let tickCount = 0;
    const interval = setInterval(async () => {
      try {
        tickCount++;
        setMattingProgress((prev) => (prev < 90 ? prev + 5 : prev));

        const res = await pollRunningHubTask(taskId);
        if (res.status === "completed") {
          clearInterval(interval);
          setMattingStatus("completed");
          setMattingProgress(100);

          const transparentPngUrl = res.results?.[0] || "";
          const whiteBgUrl = res.results?.[1] || "";
          const maskUrl = res.results?.[2] || "";

          setMattingResultUrl(transparentPngUrl);
          setWhiteBgResultUrl(whiteBgUrl || (autoGenWhiteJpg ? transparentPngUrl : ""));
          setMaskResultUrl(maskUrl);

          // Write results to the product assets list if writeToAssets is enabled
          if (writeToAssets && selectedProduct) {
            const preservedAssets = selectedProduct.assets.filter(
              (a) => a.assetType !== "transparent_png" && a.assetType !== "white_bg" && a.assetType !== "mask"
            );

            const updatedAssets: ProductAsset[] = [...preservedAssets];

            if (outputPng && transparentPngUrl) {
              updatedAssets.push({
                id: `ast_${selectedProduct.productCode}_rh_png_${Date.now()}`,
                productId: selectedProduct.id,
                assetType: "transparent_png",
                assetRole: "transparent_png",
                fileUrl: transparentPngUrl,
                width: 1000,
                height: 1000,
                status: "ready"
              });
            }

            const finalWhiteBg = whiteBgUrl || (autoGenWhiteJpg ? transparentPngUrl : "");
            if (outputWhiteBg && finalWhiteBg) {
              updatedAssets.push({
                id: `ast_${selectedProduct.productCode}_rh_white_${Date.now()}`,
                productId: selectedProduct.id,
                assetType: "white_bg",
                assetRole: "white_bg",
                fileUrl: finalWhiteBg,
                width: 1000,
                height: 1000,
                status: "ready"
              });
            }

            if (outputMask && maskUrl) {
              updatedAssets.push({
                id: `ast_${selectedProduct.productCode}_rh_mask_${Date.now()}`,
                productId: selectedProduct.id,
                assetType: "mask",
                assetRole: "mask",
                fileUrl: maskUrl,
                width: 1000,
                height: 1000,
                status: "ready"
              });
            }

            // Status promotion logic based on assets presence
            const hasPng = updatedAssets.some((a) => a.assetType === "transparent_png");
            const hasWhite = updatedAssets.some((a) => a.assetType === "white_bg");
            const targetStatus = (hasPng && hasWhite) ? "completed" : hasPng ? "png_done" : "white_bg_done";

            onUpdateProductStatus(selectedProduct.id, targetStatus as any, updatedAssets);
          }
        } else if (res.status === "failed") {
          clearInterval(interval);
          setMattingStatus("failed");
          setMattingProgress(0);
          setMattingError(res.errorMessage || "RunningHub 抠图工作流失败");
        } else {
          // Safety timeout check (approximately 120 seconds max timeout)
          if (tickCount > 40) {
            clearInterval(interval);
            setMattingStatus("failed");
            setMattingProgress(0);
            setMattingError("轮询超时，请检查 RunningHub 工作流状态。");
          }
        }
      } catch (err: any) {
        clearInterval(interval);
        setMattingStatus("failed");
        setMattingProgress(0);
        setMattingError(err.message || "轮询抠图状态时发生异常");
      }
    }, 3000);
  };

  // Determine current active display candidate
  let displayUrl = "";
  if (previewMode === "raw") {
    displayUrl = uploadedRawUrl || selectedProduct?.assets?.find((a) => a.assetType === "transparent_png")?.fileUrl || "";
  } else if (previewMode === "png") {
    displayUrl = mattingResultUrl || selectedProduct?.assets?.find((a) => a.assetType === "transparent_png")?.fileUrl || "";
  } else if (previewMode === "white_bg") {
    displayUrl = whiteBgResultUrl || selectedProduct?.assets?.find((a) => a.assetType === "white_bg")?.fileUrl || "";
  } else if (previewMode === "mask") {
    displayUrl = maskResultUrl || selectedProduct?.assets?.find((a) => a.assetType === "mask")?.fileUrl || "";
  }

  const isIdle = mattingStatus === "idle";
  const isPending = mattingStatus === "queued" || mattingStatus === "running";
  const isFinished = mattingStatus === "completed";

  return (
    <div className="flex h-full min-h-[600px] gap-4 text-left font-sans">
      {/* 1. Left Section: File uploads and list queue */}
      <div className="w-64 bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between shrink-0 shadow-xs">
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 tracking-wider">上传与资产生成 queue</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">导入原始产品实拍图片以开始抠图</p>
          </div>

          {/* Quick upload mockup button linked to real input */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50"
          >
            <Sparkles className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
            <span className="text-[11px] font-semibold text-slate-700 block">上传原始实拍原图</span>
            <span className="text-[9px] text-slate-400 mt-1 block">支持 PNG / JPG / WebP</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Target product queue selection */}
          <h4 className="text-[10px] uppercase font-bold text-slate-400">选择待抠图产品</h4>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[200px]">
            {products.map((p) => {
              const isSelected = p.id === activeProductId;
              const hasAssets = p.assets && p.assets.some((a) => a.assetType === "transparent_png");
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setActiveProductId(p.id);
                    // Clear temporary page states for fresh toggle
                    setMattingResultUrl("");
                    setWhiteBgResultUrl("");
                    setMaskResultUrl("");
                    setMattingStatus("idle");
                    setMattingProgress(0);
                    setMattingError("");
                    setUploadedRawUrl("");
                  }}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/30 font-semibold"
                      : "border-slate-100 bg-slate-50/40 hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center space-x-1">
                      <span className="font-mono text-[9px] text-neutral-500 bg-neutral-200 px-1 rounded font-normal">
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
                      !hasAssets ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-100"
                    }`}
                  >
                    {!hasAssets ? "无抠图" : "已抠图"}
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
            <span
              className={`h-2 w-2 rounded-full ${
                isPending ? "bg-amber-500 animate-pulse" : isFinished ? "bg-emerald-500" : "bg-blue-500 animate-pulse"
              }`}
            />
            <h3 className="text-xs font-bold text-slate-800">RunningHub 抠图资产生成预览窗</h3>
          </div>

          {/* Interactive display selection buttons */}
          <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
            <button
              onClick={() => setPreviewMode("raw")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                previewMode === "raw" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              原始原图
            </button>
            <button
              onClick={() => setPreviewMode("png")}
              disabled={!mattingResultUrl && !selectedProduct?.assets?.some((a) => a.assetType === "transparent_png")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                previewMode === "png"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-700 disabled:opacity-40"
              }`}
            >
              透明 PNG
            </button>
            <button
              onClick={() => setPreviewMode("white_bg")}
              disabled={!whiteBgResultUrl && !selectedProduct?.assets?.some((a) => a.assetType === "white_bg")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                previewMode === "white_bg"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-700 disabled:opacity-40"
              }`}
            >
              白底 JPG
            </button>
            <button
              onClick={() => setPreviewMode("mask")}
              disabled={!maskResultUrl && !selectedProduct?.assets?.some((a) => a.assetType === "mask")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                previewMode === "mask"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-700 disabled:opacity-40"
              }`}
            >
              黑白蒙版
            </button>
          </div>
        </div>

        {/* Dynamic preview canvas */}
        <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden p-6 relative flex items-center justify-center min-h-[300px]">
          {/* Transparent grid layer behind images */}
          {previewMode === "png" && (
            <div
              className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{
                backgroundImage:
                  "conic-gradient(#fff 0.25turn, #000 0.25turn 0.5turn, #fff 0.5turn 0.75turn, #000 0.75turn)",
                backgroundSize: "20px 20px"
              }}
            />
          )}

          {isPending ? (
            <div className="absolute inset-x-0 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-dashed border-blue-500 animate-spin flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
              </div>
              <div className="text-center">
                <span className="text-xs font-bold text-white block">正在调用 RunningHub 抠图工作流...</span>
                <span className="font-mono text-xs text-blue-400 mt-1 block">任务状态: {mattingStatus} ({mattingProgress}%)</span>
              </div>
              <div className="w-48 bg-slate-800 rounded-full h-1 my-1 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${mattingProgress}%` }}
                />
              </div>
            </div>
          ) : displayUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={displayUrl}
                alt={previewMode}
                className="max-w-full max-h-[350px] object-contain transition-all duration-300 rounded shadow-lg bg-transparent"
              />
              <div className="absolute top-2 left-2 bg-slate-900/90 text-white text-[9px] px-2 py-0.5 rounded border border-slate-700 font-mono">
                {previewMode === "raw" && "📷 原始素材原图"}
                {previewMode === "png" && "✨ RunningHub 抠图透明 PNG"}
                {previewMode === "white_bg" && "🥚 渲染白底 JPG 资产"}
                {previewMode === "mask" && "🖤 高精度黑白 Mask 蒙版"}
              </div>
            </div>
          ) : (
            <div className="text-center p-6 space-y-3 flex flex-col items-center">
              <Image className="w-12 h-12 text-slate-700 opacity-40 animate-pulse" />
              <p className="text-xs text-slate-400 max-w-[240px]">
                目前尚无激活原始素材图片。请点击左侧上传实拍原图，或选择已填入资产的产品进行预览。
              </p>
            </div>
          )}
        </div>

        {/* 3. Bottom Section: Produced results list */}
        <div className="mt-4 border-t border-slate-100 pt-3 shrink-0">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
            输出正式资产打包检查 (运营交付规格)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              {
                type: "transparent_png",
                label: "product_transparent.png",
                role: "透明 PNG (无景深去底)",
                present: !!mattingResultUrl || selectedProduct?.assets?.some((a) => a.assetType === "transparent_png")
              },
              {
                type: "white_bg",
                label: "product_white_bg.jpg",
                role: "白底 JPG 资产",
                present: !!whiteBgResultUrl || selectedProduct?.assets?.some((a) => a.assetType === "white_bg")
              },
              {
                type: "mask",
                label: "product_mask.png",
                role: "高精度 Mask 掩码",
                present: !!maskResultUrl || selectedProduct?.assets?.some((a) => a.assetType === "mask")
              },
              {
                type: "original",
                label: "original_raw.jpg",
                role: "原始原档备份",
                present: !!uploadedRawUrl || selectedProduct?.assets?.some((a) => a.assetType === "raw" || a.assetType === "photo")
              }
            ].map((item) => {
              return (
                <div
                  key={item.type}
                  className={`p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between h-20 text-left ${
                    item.present ? "bg-slate-50/50 border-emerald-100" : "bg-slate-50/20 opacity-65 text-slate-500"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold block truncate text-slate-800">
                      {item.label}
                    </span>
                    <span className="text-[8px] text-slate-400 block mt-0.5">{item.role}</span>
                  </div>
                  {item.present ? (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[9px] text-emerald-600 font-bold font-mono">1000 x 1000</span>
                      <button className="text-slate-500 hover:text-blue-600 transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[8px] text-slate-400 mt-1 block">未产出</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Right side: refinement settings config */}
      <div className="w-72 bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between overflow-y-auto shrink-0 shadow-xs">
        <div className="space-y-4">
          <div className="border-b pb-2 flex justify-between items-center border-slate-100">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center">
              <Sliders className="w-4 h-4 mr-1 text-neutral-500" />
              RunningHub 抠图配置
            </h3>
            <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
          </div>

          {/* Workflow Configuration Warning */}
          {!isWorkflowConfigured && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] p-2.5 rounded-lg mb-3">
              <div className="font-semibold flex items-center mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mr-1 shrink-0" />
                提示：未配置抠图工作流连接
              </div>
              <p className="text-[9px] text-amber-700/90 leading-relaxed">
                当前 <code>rh_matting_cutout</code> 工作流的 <code>workflowId</code> 或 <code>baseImageNodeId</code> 为空。
                点击下方按钮将引导进行配置，也可在此添加您的专属 ComfyUI 流程。
              </p>
            </div>
          )}

          {/* Outbound file format selects */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">
              抠图流程作业机制
            </span>

            <div className="space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <label className="flex items-center space-x-2.5 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={outputPng}
                  onChange={(e) => setOutputPng(e.target.checked)}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <div className="text-left">
                  <span className="font-medium block">输出 Transparent PNG</span>
                  <span className="text-[9px] text-neutral-400 block mt-0.5">去除全部多余杂光和不规则背景</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={outputWhiteBg}
                  onChange={(e) => setOutputWhiteBg(e.target.checked)}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <div className="text-left">
                  <span className="font-medium block">输出 White BG 资产</span>
                  <span className="text-[9px] text-neutral-400 block mt-0.5">作为白底精修成品正式交付</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={outputMask}
                  onChange={(e) => setOutputMask(e.target.checked)}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <div className="text-left">
                  <span className="font-medium block">输出 Alpha Mask 蒙版</span>
                  <span className="text-[9px] text-neutral-400 block mt-0.5">高精黑白矢量路径掩码 (供精细微调)</span>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">
              自动化辅助策略
            </span>

            <div className="space-y-2.5">
              <label className="flex items-center space-x-2.5 text-xs text-neutral-750 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenWhiteJpg}
                  onChange={(e) => setAutoGenWhiteJpg(e.target.checked)}
                  className="rounded border-neutral-350 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <div className="text-left">
                  <span className="font-semibold block text-neutral-750">自动生成白底 JPG</span>
                  <span className="text-[9px] text-neutral-400">若接口未直接提供，自动基于透明图本地铺纯白地底色</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 text-xs text-neutral-750 cursor-pointer">
                <input
                  type="checkbox"
                  checked={writeToAssets}
                  onChange={(e) => setWriteToAssets(e.target.checked)}
                  className="rounded border-neutral-350 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <div className="text-left">
                  <span className="font-semibold block text-neutral-750">自动写入产品资产包</span>
                  <span className="text-[9px] text-neutral-400">成功后直接写回对应 Product 实例的 assets 包中</span>
                </div>
              </label>
            </div>
          </div>

          {/* Prompt instruction or reminder label */}
          <div className="bg-slate-50 text-[10px] p-3 rounded-lg border border-slate-100 text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center">
              <FileIcon className="w-3.5 h-3.5 mr-1 text-slate-400" />
              资产打包规则说明
            </div>
            <p className="leading-relaxed">
              台历与挂历设计不需要复杂精修，本模块作为 RunningHub 抠图工作流一环，稳定输出 transparent_png 与 white_bg 资产交由后续高质感场景融图工作流处理。
            </p>
          </div>
        </div>

        {/* Display Error Message cleanly */}
        {mattingError && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-750 text-[10px] p-2.5 rounded-lg">
            <span className="font-bold flex items-center mb-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 mr-1" />
              处理错误
            </span>
            <p className="leading-normal">{mattingError}</p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleStartMatting}
          disabled={isPending}
          className="w-full mt-4 bg-blue-650 hover:bg-blue-700 disabled:bg-neutral-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition-all duration-300 active:scale-[0.98]"
        >
          <Play className="w-3.5 h-3.5 shrink-0" />
          <span>{isPending ? "抠图执行中..." : "开始 RunningHub 抠图"}</span>
        </button>
      </div>
    </div>
  );
};
