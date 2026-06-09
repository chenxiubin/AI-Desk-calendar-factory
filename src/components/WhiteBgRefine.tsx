import React, { useState, useEffect, useRef } from "react";
import { Product, ProductAsset } from "../types";
import { runningHubMattingConfig } from "../config/runningHub";
import {
  runRunningHubMatting,
  pollRunningHubTask,
} from "../utils/runningHubMatting";
import { 
  calculateTransparentImageBoundingBox, 
  BoundingBoxInfo,
  renderCropCanvasToDataUrl,
  RawImageAutoCropResult,
  createImageThumbnailDataUrl
} from "../utils/imagePreprocess";
import { CropCanvas, CropCanvasState } from "./CropCanvas";

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
  AlertTriangle,
} from "lucide-react";

export type MattingQueueStatus =
  | "waiting_preview_approval"
  | "ready"
  | "queued"
  | "running"
  | "succeeded"
  | "failed";

export type MattingQueueItem = {
  id: string;
  order: number;

  productId?: string;
  productCode?: string;
  productName?: string;

  sourceImageUrl: string;
  cropInputUrl: string;
  thumbnailUrl: string;

  targetSize: 1600 | 2048 | 2560;
  cropAspectRatio: "1:1";

  status: MattingQueueStatus;
  createdAt: string;
  approvedAt?: string;
  startedAt?: string;
  finishedAt?: string;

  runningHubTaskId?: string;
  transparentPngUrl?: string;
  whiteBgUrl?: string;
  maskUrl?: string;

  errorMessage?: string;
};

const QUEUE_STATUS_LABELS: Record<MattingQueueStatus, string> = {
  waiting_preview_approval: "待确认预览",
  ready: "待发送",
  queued: "已加入队列",
  running: "处理中",
  succeeded: "已完成",
  failed: "失败",
};

const MAX_MATTING_QUEUE_SIZE = 4;

interface WhiteBgRefineProps {
  products: Product[];
  selectedProductFromLib?: Product | null;
  onUpdateProductStatus: (
    productId: string,
    newStatus: Product["status"],
    newAssets: ProductAsset[],
  ) => void;
}

export const WhiteBgRefine: React.FC<WhiteBgRefineProps> = ({
  products,
  selectedProductFromLib,
  onUpdateProductStatus,
}) => {
  // Select which product we are refining
  const [activeProductId, setActiveProductId] = useState<string>("");

  useEffect(() => {
    if (selectedProductFromLib?.id) {
      setActiveProductId((prev) =>
        prev === selectedProductFromLib.id ? prev : selectedProductFromLib.id,
      );
      return;
    }

    if (!activeProductId && products.length > 0) {
      const raw = products.find(
        (p) => p.status === "raw" || p.status === "white_bg_done",
      );
      setActiveProductId(raw ? raw.id : products[0].id);
    }
  }, [selectedProductFromLib?.id, products.length, activeProductId]);

  // Core configs requested by user
  const [outputPng, setOutputPng] = useState(true);
  const [outputWhiteBg, setOutputWhiteBg] = useState(true);
  const [outputMask, setOutputMask] = useState(false);
  const [autoGenWhiteJpg, setAutoGenWhiteJpg] = useState(true);
  const [writeToAssets, setWriteToAssets] = useState(true);

  // States for new RunningHub matting workflow task tracking
  const [uploadedRawUrl, setUploadedRawUrl] = useState<string>("");
  const [mattingTaskId, setMattingTaskId] = useState<string>("");
  const [mattingStatus, setMattingStatus] = useState<
    "idle" | "queued" | "running" | "completed" | "failed"
  >("idle");
  const [mattingProgress, setMattingProgress] = useState<number>(0);
  const [mattingError, setMattingError] = useState<string>("");

  const [mattingResultUrl, setMattingResultUrl] = useState<string>("");
  const [whiteBgResultUrl, setWhiteBgResultUrl] = useState<string>("");
  const [maskResultUrl, setMaskResultUrl] = useState<string>("");

  // Preview display selector mode
  const [previewMode, setPreviewMode] = useState<
    "raw" | "crop_input" | "png" | "white_bg" | "mask"
  >("raw");

  const [mattingQueue, setMattingQueue] = useState<MattingQueueItem[]>([]);
  const [activeQueueItemId, setActiveQueueItemId] = useState<string | null>(null);
  const [isSequentialSending, setIsSequentialSending] = useState(false);
  const sequentialSendingRef = useRef(false);

  const [cropCanvasState, setCropCanvasState] = useState<CropCanvasState | null>(null);
  const [cropAspectLocked, setCropAspectLocked] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [cropMode, setCropMode] = useState<"simple" | "advanced">("simple");
  const [autoCropResult, setAutoCropResult] = useState<RawImageAutoCropResult | null>(null);
  const [confirmedCropInputUrl, setConfirmedCropInputUrl] = useState("");
  const [isCropConfirmed, setIsCropConfirmed] = useState(false);
  const [isCanvasLocked, setIsCanvasLocked] = useState(false);
  const [isCropPreviewApproved, setIsCropPreviewApproved] = useState(false);

  const [targetSize, setTargetSize] = useState<1600 | 2048 | 2560>(2048);
  const [boundingBox, setBoundingBox] = useState<BoundingBoxInfo | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedProduct =
    products.find((p) => p.id === activeProductId) || products[0];

  const prevActiveProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeProductId) return;

    const prevId = prevActiveProductIdRef.current;

    if (prevId === activeProductId) {
      return;
    }

    prevActiveProductIdRef.current = activeProductId;

    // Reset state when product changes
    setUploadedRawUrl("");
    setMattingResultUrl("");
    setWhiteBgResultUrl("");
    setMaskResultUrl("");
    setMattingStatus("idle");
    setMattingProgress(0);
    setMattingError("");
    setPreviewMode("raw");
    setBoundingBox(null);
    setCropCanvasState(null);
    setAutoCropResult(null);
    setConfirmedCropInputUrl("");
    setIsCropConfirmed(false);
    setIsCanvasLocked(false);
    setIsCropPreviewApproved(false);
  }, [activeProductId]);

  // Retrieve the preset matting workflow configuration
  const mattingWorkflow = runningHubMattingConfig;

  const inputNodeId =
    mattingWorkflow.inputImageNodeId ||
    mattingWorkflow.baseImageNodeId;

  const isWorkflowConfigured =
    Boolean(mattingWorkflow.enabled) &&
    Boolean(mattingWorkflow.apiBaseUrl) &&
    Boolean(mattingWorkflow.workflowId) &&
    Boolean(inputNodeId);

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

      console.log("[WhiteBgRefine] uploaded raw image loaded", {
        productId: selectedProduct?.id,
        size: dataUrl.length,
      });

      // Reset previous results for clean state
      setMattingResultUrl("");
      setWhiteBgResultUrl("");
      setMaskResultUrl("");
      setMattingStatus("idle");
      setMattingProgress(0);
      setMattingError("");
      setPreviewMode("raw");
      
      // Reset bounding box and crop
      setBoundingBox(null);
      setCropCanvasState(null);
      setAutoCropResult(null);
      setConfirmedCropInputUrl("");
      setIsCropConfirmed(false);
      setIsCanvasLocked(false);
      setIsCropPreviewApproved(false);
    };
    reader.readAsDataURL(file);
  };

  // Helper to compose a white background from transparent PNG to resolve CORS/local rendering
  const composeWhiteBgFromTransparentPng = (
    transparentPngUrl: string,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      if (!transparentPngUrl.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width || 1000;
          canvas.height = img.height || 1000;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("无法创建 Canvas 2D 上下文"));
            return;
          }
          // Fill pure white background
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Overdraw transparent image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Export back
          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => {
        reject(new Error("无法读取/装载透明 PNG 进行底色合成"));
      };
      img.src = transparentPngUrl;
    });
  };

  const getMattingSourceImage = (
    product: Product,
    uploadedRawUrl: string
  ): string => {
    if (uploadedRawUrl) return uploadedRawUrl;

    const excludedAssetTypes = new Set(["transparent_png", "white_bg", "mask"]);
    const excludedAssetRoles = new Set(["transparent_png", "white_bg", "mask"]);

    const priorityAssets = product.assets?.filter((asset) => {
      if (!asset.fileUrl) return false;
      if (asset.assetType && excludedAssetTypes.has(asset.assetType)) return false;
      if (asset.assetRole && excludedAssetRoles.has(asset.assetRole)) return false;
      return true;
    }) || [];

    const preferred =
      priorityAssets.find((a) => a.assetType === "raw") ||
      priorityAssets.find((a) => a.assetType === "photo") ||
      priorityAssets.find((a) => a.assetRole === "main_product") ||
      priorityAssets.find((a) => a.assetRole === "front") ||
      priorityAssets.find((a) => a.assetRole === "sku_product") ||
      priorityAssets[0];

    return preferred?.fileUrl || "";
  };

  const sourceImageUrl = selectedProduct
    ? getMattingSourceImage(selectedProduct, uploadedRawUrl)
    : "";

  const handleConfirmCrop = async () => {
    if (!sourceImageUrl) {
      setMattingError("请先上传或选择原始实拍图。");
      return;
    }

    if (!cropCanvasState) {
      setMattingError("请先在裁剪画布中调整裁剪区域。");
      return;
    }
    
    if (Math.abs(cropCanvasState.cropBox.width - cropCanvasState.cropBox.height) > 1) {
      setMattingError("抠图输入必须为 1:1 方形，请开启锁定 1:1 或调整为正方形后再确认。");
      return;
    }

    try {
      const dataUrl = await renderCropCanvasToDataUrl({
        imageUrl: sourceImageUrl,
        cropBox: cropCanvasState.cropBox,
        imageTransform: cropCanvasState.imageTransform,
        viewportSize: cropCanvasState.viewportSize,
        targetSize,
        backgroundColor: "#ffffff",
        mimeType: "image/jpeg",
        quality: 0.95,
      });

      const thumbnailUrl = await createImageThumbnailDataUrl(dataUrl, {
        size: 160,
        backgroundColor: "#ffffff",
      });

      const queueItem: MattingQueueItem = {
        id: crypto.randomUUID(),
        order: Date.now(),
        productId: selectedProduct?.id,
        productCode: selectedProduct?.productCode,
        productName: selectedProduct?.name,
        sourceImageUrl,
        cropInputUrl: dataUrl,
        thumbnailUrl,
        targetSize,
        cropAspectRatio: "1:1",
        status: "waiting_preview_approval",
        createdAt: new Date().toISOString(),
      };

      setMattingQueue((prev) => {
        const activeCount = prev.filter(
          (item) =>
            item.status === "waiting_preview_approval" ||
            item.status === "ready" ||
            item.status === "queued" ||
            item.status === "running"
        ).length;

        if (activeCount >= MAX_MATTING_QUEUE_SIZE) {
          setMattingError(`待发送队列最多保留 ${MAX_MATTING_QUEUE_SIZE} 张，请先发送或移除部分队列项。`);
          return prev;
        }

        return [...prev, queueItem].sort((a, b) => a.order - b.order);
      });

      // Avoid changing other states if queue could not be added due to limit.
      setMattingQueue((prev) => {
        const hasItem = prev.some(q => q.id === queueItem.id);
        if (hasItem) {
          setActiveQueueItemId(queueItem.id);
          setConfirmedCropInputUrl(dataUrl);
          setIsCropConfirmed(true);
          setIsCanvasLocked(true);
          setIsCropPreviewApproved(false);
          setPreviewMode("crop_input");
          setMattingError("");
        }
        return prev;
      });
    } catch (e) {
      console.error("Failed to render confirmed crop input:", e);
      setMattingError("确认裁剪失败，请重试。");
    }
  };

  const handleEditCrop = () => {
    setIsCanvasLocked(false);
    setIsCropConfirmed(false);
    setIsCropPreviewApproved(false);
    setConfirmedCropInputUrl("");
    setMattingError("");
    setPreviewMode("raw");

    setMattingQueue((prev) =>
      prev.filter((item) => {
        if (item.id !== activeQueueItemId) return true;
        return item.status !== "waiting_preview_approval" && item.status !== "ready";
      })
    );
    setActiveQueueItemId(null);
  };

  const handleApproveCropPreview = () => {
    if (!activeQueueItemId) {
      setMattingError("请先确认裁剪并加入队列。");
      return;
    }

    const activeItem = mattingQueue.find((item) => item.id === activeQueueItemId);

    if (!activeItem?.cropInputUrl) {
      setMattingError("当前队列项缺少输入图，请重新确认裁剪。");
      return;
    }

    setConfirmedCropInputUrl(activeItem.cropInputUrl);
    setIsCropPreviewApproved(true);

    setMattingQueue((prev) =>
      prev.map((item) =>
        item.id === activeQueueItemId
          ? {
              ...item,
              status: "ready",
              approvedAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    setMattingError("");
  };

  const pollRunningHubTaskUntilDone = async (
    taskId: string,
  ): Promise<string[]> => {
    let tickCount = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          tickCount++;
          setMattingProgress((prev) => (prev < 90 ? prev + 5 : prev));

          const res = await pollRunningHubTask(taskId);

          if (res.status === "completed") {
            clearInterval(interval);
            resolve(res.results || []);
            return;
          }

          if (res.status === "failed") {
            clearInterval(interval);
            reject(new Error(res.errorMessage || "RunningHub 抠图工作流失败"));
            return;
          }

          if (tickCount > 40) {
            clearInterval(interval);
            reject(new Error("轮询超时，请检查 RunningHub 工作流状态。"));
          }
        } catch (err) {
          clearInterval(interval);
          reject(err);
        }
      }, 3000);
    });
  };

  const handleCompletedQueueItem = async (
    queueItem: MattingQueueItem,
    results: string[],
  ): Promise<void> => {
    const targetProduct = products.find((p) => p.id === queueItem.productId);

    if (!targetProduct) {
      throw new Error("队列项对应的产品不存在，无法写入资产。");
    }

    const transparentPngUrl = results[0] || "";
    const whiteBgUrl = results[1] || "";
    const maskUrl = results[2] || "";

    let calculatedBoundingBox: BoundingBoxInfo | null = null;
    if (transparentPngUrl) {
      try {
        calculatedBoundingBox = await calculateTransparentImageBoundingBox(transparentPngUrl);
        setBoundingBox(calculatedBoundingBox);
      } catch (e) {
        console.error("Bounding box calculation failed", e);
      }
    }

    let finalWhiteBg = "";
    if (whiteBgUrl) {
      finalWhiteBg = whiteBgUrl;
    } else if (autoGenWhiteJpg && transparentPngUrl) {
      try {
        finalWhiteBg = await composeWhiteBgFromTransparentPng(transparentPngUrl);
      } catch (e) {
        console.error("CORS compose fail", e);
      }
    }

    setMattingQueue((prev) =>
      prev.map((item) =>
        item.id === queueItem.id
          ? {
              ...item,
              status: "succeeded",
              transparentPngUrl,
              whiteBgUrl: finalWhiteBg,
              maskUrl,
              finishedAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    if (activeQueueItemId === queueItem.id) {
      setMattingResultUrl(transparentPngUrl);
      setWhiteBgResultUrl(finalWhiteBg);
      setMaskResultUrl(maskUrl);
      setPreviewMode("png");
    }

    if (writeToAssets) {
      const preservedAssets = targetProduct.assets.filter(
        (a) =>
          a.assetType !== "transparent_png" &&
          a.assetType !== "white_bg" &&
          a.assetType !== "mask",
      );

      const updatedAssets: ProductAsset[] = [...preservedAssets];

      const cropInputMeta = {
        aspectRatio: "1:1",
        targetSize: queueItem.targetSize,
        paddingRatio: 0.08,
        queueItemId: queueItem.id,
      };

      if (outputPng && transparentPngUrl) {
        updatedAssets.push({
          id: `ast_${targetProduct.productCode}_rh_png_${Date.now()}`,
          productId: targetProduct.id,
          assetType: "transparent_png",
          assetRole: "transparent_png",
          fileUrl: transparentPngUrl,
          width: queueItem.targetSize,
          height: queueItem.targetSize,
          status: "ready",
          metadata: {
            cropInput: cropInputMeta,
            ...(calculatedBoundingBox && {
              boundingBox: calculatedBoundingBox as unknown as Record<string, unknown>,
            }),
          },
        });
      }

      if (outputWhiteBg && finalWhiteBg) {
        updatedAssets.push({
          id: `ast_${targetProduct.productCode}_rh_white_${Date.now()}`,
          productId: targetProduct.id,
          assetType: "white_bg",
          assetRole: "white_bg",
          fileUrl: finalWhiteBg,
          width: queueItem.targetSize,
          height: queueItem.targetSize,
          status: "ready",
        });
      }

      if (outputMask && maskUrl) {
        updatedAssets.push({
          id: `ast_${targetProduct.productCode}_rh_mask_${Date.now()}`,
          productId: targetProduct.id,
          assetType: "mask",
          assetRole: "mask",
          fileUrl: maskUrl,
          width: queueItem.targetSize,
          height: queueItem.targetSize,
          status: "ready",
        });
      }

      const hasPng = updatedAssets.some((a) => a.assetType === "transparent_png");
      const hasWhite = updatedAssets.some((a) => a.assetType === "white_bg");

      if (hasPng) {
        const targetStatus: Product["status"] =
          hasPng && hasWhite ? "completed" : "png_done";

        onUpdateProductStatus(targetProduct.id, targetStatus, updatedAssets);
      }
    }

    setMattingStatus("completed");
    setMattingProgress(100);
  };

  const runSingleQueueItem = async (queueItem: MattingQueueItem): Promise<void> => {
    if (!isWorkflowConfigured) {
      throw new Error("RunningHub 抠图工作流尚未配置，请先配置 workflowId 和输入节点 ID。");
    }

    if (!queueItem.cropInputUrl) {
      throw new Error("队列项缺少 RunningHub 输入图。");
    }

    setMattingQueue((prev) =>
      prev.map((item) =>
        item.id === queueItem.id
          ? { ...item, status: "queued", errorMessage: undefined }
          : item,
      ),
    );

    setMattingStatus("queued");
    setMattingProgress(15);

    const startResult = await runRunningHubMatting({
      imageUrlOrBase64: queueItem.cropInputUrl,
      workflowConfig: mattingWorkflow,
    });

    setMattingQueue((prev) =>
      prev.map((item) =>
        item.id === queueItem.id
          ? {
              ...item,
              status: "running",
              runningHubTaskId: startResult.taskId,
              startedAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    setMattingTaskId(startResult.taskId);
    setMattingStatus("running");
    setMattingProgress(40);

    const completedResults = await pollRunningHubTaskUntilDone(startResult.taskId);
    await handleCompletedQueueItem(queueItem, completedResults);
  };

  const handleStartSingleQueueItem = async (queueItemId?: string) => {
    const targetId = queueItemId || activeQueueItemId;

    if (!targetId) {
      setMattingError("请选择待发送队列项。");
      return;
    }

    const item = mattingQueue.find((q) => q.id === targetId);

    if (!item) {
      setMattingError("未找到队列项。");
      return;
    }

    if (item.status !== "ready") {
      setMattingError("该队列项尚未确认预览，不能发送。");
      return;
    }

    try {
      setMattingError("");
      await runSingleQueueItem(item);
    } catch (err) {
      const message = err instanceof Error ? err.message : "RunningHub 抠图失败";

      setMattingQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "failed", errorMessage: message }
            : q,
        ),
      );

      setMattingError(message);
      setMattingStatus("failed");
      setMattingProgress(0);
    }
  };

  const handleSendQueueSequentially = async () => {
    if (sequentialSendingRef.current) return;

    const readyItems = mattingQueue
      .filter((item) => item.status === "ready")
      .sort((a, b) => a.order - b.order)
      .slice(0, MAX_MATTING_QUEUE_SIZE);

    if (readyItems.length === 0) {
      setMattingError("没有待发送的队列项，请先确认预览无误。");
      return;
    }

    sequentialSendingRef.current = true;
    setIsSequentialSending(true);
    setMattingError("");

    try {
      for (const item of readyItems) {
        setActiveQueueItemId(item.id);
        setConfirmedCropInputUrl(item.cropInputUrl);
        setPreviewMode("crop_input");

        try {
          await runSingleQueueItem(item);
        } catch (err) {
          const message = err instanceof Error ? err.message : "RunningHub 抠图失败";

          setMattingQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: "failed", errorMessage: message }
                : q,
            ),
          );
          continue;
        }
      }
    } finally {
      sequentialSendingRef.current = false;
      setIsSequentialSending(false);
    }
  };

  // Determine current active display candidate
  let displayUrl = "";
  if (previewMode === "raw") {
    displayUrl = sourceImageUrl;
  } else if (previewMode === "crop_input") {
    displayUrl = confirmedCropInputUrl;
  } else if (previewMode === "png") {
    displayUrl =
      mattingResultUrl ||
      selectedProduct?.assets?.find((a) => a.assetType === "transparent_png")
        ?.fileUrl ||
      "";
  } else if (previewMode === "white_bg") {
    displayUrl =
      whiteBgResultUrl ||
      selectedProduct?.assets?.find((a) => a.assetType === "white_bg")
        ?.fileUrl ||
      "";
  } else if (previewMode === "mask") {
    displayUrl =
      maskResultUrl ||
      selectedProduct?.assets?.find((a) => a.assetType === "mask")?.fileUrl ||
      "";
  }

  const isPending = mattingStatus === "queued" || mattingStatus === "running";
  const isFinished = mattingStatus === "completed";

  const handleCropCanvasStateChange = React.useCallback((state: CropCanvasState) => {
    setCropCanvasState(state);
    if (!isCanvasLocked) {
      setIsCropConfirmed(false);
      setIsCropPreviewApproved(false);
      setConfirmedCropInputUrl("");
    }
  }, [isCanvasLocked]);

  return (
    <div className="flex flex-col gap-4 h-full min-h-[600px] text-left font-sans">
      {/* 1. Page Title Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              RunningHub 抠图资产生成
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              用于从产品实拍图生成透明 PNG、白底 JPG 和可选
              Mask，作为后续套版、场景融合和运营交付资产。
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* 2. Left Section: File uploads and list queue */}
        <div className="w-64 bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between shrink-0 shadow-xs">
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 tracking-wider">
                ① 选择原图
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                导入原始产品实拍图片或选择队列中的产品
              </p>
            </div>

            {/* Quick upload mockup button linked to real input */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50"
            >
              <Sparkles className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-700 block">
                上传原始实拍原图
              </span>
              <span className="text-[9px] text-slate-400 mt-1 block">
                支持 PNG / JPG / WebP
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Target product queue selection */}
            <h4 className="text-[10px] uppercase font-bold text-slate-400">
              选择待抠图产品
            </h4>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[200px]">
              {products.map((p) => {
                const isSelected = p.id === activeProductId;
                const hasAssets =
                  p.assets &&
                  p.assets.some((a) => a.assetType === "transparent_png");
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
                        !hasAssets
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border-emerald-100"
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
                  isPending
                    ? "bg-amber-500 animate-pulse"
                    : isFinished
                      ? "bg-emerald-500"
                      : "bg-blue-500 animate-pulse"
                }`}
              />
              <h3 className="text-xs font-bold text-slate-800">
                RunningHub 抠图资产生成预览窗
              </h3>
            </div>

            {/* Interactive display selection buttons */}
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
              <button
                onClick={() => setPreviewMode("raw")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  previewMode === "raw"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                原始原图
              </button>
              <button
                onClick={() => setPreviewMode("png")}
                disabled={
                  !mattingResultUrl &&
                  !selectedProduct?.assets?.some(
                    (a) => a.assetType === "transparent_png",
                  )
                }
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
                disabled={
                  !whiteBgResultUrl &&
                  !selectedProduct?.assets?.some(
                    (a) => a.assetType === "white_bg",
                  )
                }
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
                disabled={
                  !maskResultUrl &&
                  !selectedProduct?.assets?.some((a) => a.assetType === "mask")
                }
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
          <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden p-6 relative flex items-center justify-center h-[560px] min-h-[480px]">
            {/* Transparent grid layer behind images */}
            {previewMode === "png" && (
              <div
                className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{
                  backgroundImage:
                    "conic-gradient(#fff 0.25turn, #000 0.25turn 0.5turn, #fff 0.5turn 0.75turn, #000 0.75turn)",
                  backgroundSize: "20px 20px",
                }}
              />
            )}

            {isPending ? (
              <div className="absolute inset-x-0 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-dashed border-blue-500 animate-spin flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-white block">
                    正在调用 RunningHub 抠图工作流...
                  </span>
                  <span className="font-mono text-xs text-blue-400 mt-1 block">
                    任务状态: {mattingStatus} ({mattingProgress}%)
                  </span>
                </div>
                <div className="w-48 bg-slate-800 rounded-full h-1 my-1 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${mattingProgress}%` }}
                  />
                </div>
              </div>
            ) : displayUrl ? (
              <div className="relative w-full h-full flex items-center justify-center pt-8">
                {previewMode === "raw" ? (
                  <div className="absolute inset-0">
                    <CropCanvas
                      key={displayUrl}
                      imageUrl={displayUrl}
                      targetSize={targetSize}
                      cropAspectLocked={cropAspectLocked}
                      snapEnabled={snapEnabled}
                      mode={cropMode}
                      locked={isCanvasLocked}
                      autoCropOnLoad={true}
                      safetyPaddingRatio={0.12}
                      onAutoCropResult={setAutoCropResult}
                      onStateChange={handleCropCanvasStateChange}
                    />
                    
                    {/* Floating Controls for CropCanvas (Top Right) */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 bg-slate-900/80 backdrop-blur text-white px-3 py-2.5 rounded-xl border border-slate-700 shadow-xl z-20">
                      <label className="flex items-center gap-2 cursor-pointer hover:text-purple-400 transition-colors">
                        <input
                          type="checkbox"
                          checked={cropMode === "advanced"}
                          onChange={(e) => setCropMode(e.target.checked ? "advanced" : "simple")}
                          className="rounded-sm border-slate-600 bg-slate-800 text-purple-500 w-3.5 h-3.5"
                        />
                        <span className="text-[10px] font-medium tracking-wide">高级自由裁剪</span>
                      </label>
                      {cropMode === "advanced" && (
                        <>
                          <label className="flex items-center gap-2 cursor-pointer hover:text-blue-400 transition-colors">
                            <input
                              type="checkbox"
                              checked={cropAspectLocked}
                              onChange={(e) => setCropAspectLocked(e.target.checked)}
                              className="rounded-sm border-slate-600 bg-slate-800 text-blue-500 w-3.5 h-3.5"
                            />
                            <span className="text-[10px] font-medium tracking-wide">锁定 1:1</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer hover:text-emerald-400 transition-colors">
                            <input
                              type="checkbox"
                              checked={snapEnabled}
                              onChange={(e) => setSnapEnabled(e.target.checked)}
                              className="rounded-sm border-slate-600 bg-slate-800 text-emerald-500 w-3.5 h-3.5"
                            />
                            <span className="text-[10px] font-medium tracking-wide">吸附边框</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <img
                    src={displayUrl}
                    alt={previewMode}
                    className="max-w-full max-h-[450px] object-contain transition-all duration-300 rounded shadow-lg bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CgkJPHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTZlNmU2IiAvPgoJCTxyZWN0IHg9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmZmZiZmIiIC8+CgkJPHJlY3QgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2ZmZmJmYiIgLz4KCQk8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2U2ZTZlNiIgLz4KCTwvc3ZnPg==')]"
                    crossOrigin={displayUrl.startsWith("data:") ? undefined : "anonymous"}
                  />
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
                  <div className="bg-slate-900/90 text-white text-[9px] px-2 py-0.5 rounded border border-slate-700 font-mono shadow-sm flex items-center justify-center inline-block w-max">
                    {previewMode === "raw" && "📷 调整抠图输入 (1:1) - 纯色背景可自动识别；复杂背景请使用手动框选主体"}
                    {previewMode === "crop_input" && "📐 RunningHub 输入图预览"}
                    {previewMode === "png" && "✨ RunningHub 抠图透明 PNG"}
                    {previewMode === "white_bg" && "🥚 渲染白底 JPG 资产"}
                    {previewMode === "mask" && "🖤 高精度黑白 Mask 蒙版"}
                  </div>
                  
                  {previewMode === "raw" && autoCropResult && (
                    <div className={`text-[10px] px-2 py-1.5 rounded border font-medium shadow-sm w-max backdrop-blur ${
                      (autoCropResult.confidence >= 0.6 && autoCropResult.method !== "fallback") || autoCropResult.method === "manual-roi" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                      autoCropResult.confidence > 0 && autoCropResult.method !== "fallback" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      "bg-slate-800/80 text-slate-300 border-slate-600"
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          {autoCropResult.method === "manual-roi" && "✨ 已应用手动框选主体"}
                          {autoCropResult.confidence >= 0.6 && autoCropResult.method !== "fallback" && autoCropResult.method !== "manual-roi" && "✨ 已自动识别产品主体并居中"}
                          {autoCropResult.confidence > 0 && autoCropResult.confidence < 0.6 && autoCropResult.method !== "fallback" && autoCropResult.method !== "manual-roi" && "⚠️ 自动识别可能不准确，请手动微调"}
                          {(autoCropResult.confidence === 0 || autoCropResult.method === "fallback") && "🔄 自动识别失败：复杂背景建议回到裁剪区手动框选主体"}
                        </span>
                        <span className="text-[8px] opacity-60 font-mono tracking-tight uppercase">
                          {autoCropResult.method} | {(autoCropResult.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      
                      {autoCropResult.warnings.length > 0 && (
                        <div className="text-[9px] opacity-80 mt-1 line-clamp-1 border-t border-current pt-0.5">
                          警告: {autoCropResult.warnings.join(", ")}
                        </div>
                      )}
                    </div>
                  )}
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
                  present:
                    !!mattingResultUrl ||
                    selectedProduct?.assets?.some(
                      (a) => a.assetType === "transparent_png",
                    ),
                },
                {
                  type: "white_bg",
                  label: "product_white_bg.jpg",
                  role: "白底 JPG 资产",
                  present:
                    !!whiteBgResultUrl ||
                    selectedProduct?.assets?.some(
                      (a) => a.assetType === "white_bg",
                    ),
                },
                {
                  type: "mask",
                  label: "product_mask.png",
                  role: "高精度 Mask 掩码",
                  present:
                    !!maskResultUrl ||
                    selectedProduct?.assets?.some(
                      (a) => a.assetType === "mask",
                    ),
                },
                {
                  type: "original",
                  label: "original_raw.jpg",
                  role: "原始原档备份",
                  present:
                    !!uploadedRawUrl ||
                    selectedProduct?.assets?.some(
                      (a) => a.assetType === "raw" || a.assetType === "photo",
                    ),
                },
              ].map((item) => {
                return (
                  <div
                    key={item.type}
                    className={`p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between h-20 text-left ${
                      item.present
                        ? "bg-slate-50/50 border-emerald-100"
                        : "bg-slate-50/20 opacity-65 text-slate-500"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-bold block truncate text-slate-800">
                        {item.label}
                      </span>
                      <span className="text-[8px] text-slate-400 block mt-0.5">
                        {item.role}
                      </span>
                    </div>
                    {item.present ? (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[9px] text-emerald-600 font-bold font-mono">
                          1000 x 1000
                        </span>
                        <button className="text-slate-500 hover:text-blue-600 transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[8px] text-slate-400 mt-1 block">
                        未产出
                      </span>
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
                ② 调整抠图输入
              </h3>
              <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
            </div>

            {/* Workflow Configuration Warning */}
            {!isWorkflowConfigured && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] p-2.5 rounded-lg mb-3">
                <div className="font-semibold flex items-center mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mr-1 shrink-0" />
                  提示：模块尚未就绪
                </div>
                <p className="text-[9px] text-amber-700/90 leading-relaxed font-semibold">
                  RunningHub 抠图工作流尚未配置，请先配置 workflowId
                  和输入输出节点。
                </p>
              </div>
            )}

            {/* Output Size Specification */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block">
                预处理输出尺寸
              </span>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                <div className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                  抠图输入默认首选方形裁剪。<strong>裁剪框可以超出图片边界</strong>，超出区域会自动补纯白底。请尽量让产品完整落在裁剪框内，并保留 5%–8% 安全边距；挂绳、底座、包装边缘切勿被裁掉。
                </div>
                <div className="flex bg-white border border-slate-200 rounded p-0.5 shadow-sm">
                  {[1600, 2048, 2560].map((size) => (
                    <button
                      key={size}
                      onClick={() => setTargetSize(size as 1600 | 2048 | 2560)}
                      className={`flex-1 text-[10px] font-mono py-1 rounded transition-colors ${
                        targetSize === size
                          ? "bg-blue-600 text-white font-bold"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {confirmedCropInputUrl && (
              <div className="space-y-3">
                <span className={`text-[10px] font-bold uppercase tracking-wide block ${isCropPreviewApproved ? "text-emerald-500" : "text-blue-500"}`}>
                  {isCropPreviewApproved ? "预览已确认" : "RunningHub 输入图预览"}
                </span>
                <div className={`${isCropPreviewApproved ? "bg-emerald-50/50 border-emerald-100" : "bg-blue-50/50 border-blue-100"} p-3 rounded-lg border flex flex-col items-center`}>
                  <span className={`text-[9px] mb-2 font-medium text-center ${isCropPreviewApproved ? "text-emerald-600/80" : "text-blue-600/80"}`}>
                    这是即将送入 RunningHub 的裁剪输入图，不会作为正式资产交付。
                  </span>
                  <img src={confirmedCropInputUrl} alt="Crop Input Preview" className={`w-24 h-24 object-contain shadow border bg-white rounded-sm mb-3 ${isCropPreviewApproved ? "border-emerald-200" : "border-blue-200"}`} />
                  
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={handleEditCrop}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-1.5 rounded text-[10px] font-semibold transition-colors flex items-center justify-center space-x-1"
                    >
                      <Scissors className="w-3 h-3" />
                      <span>重新调整</span>
                    </button>
                    {!isCropPreviewApproved && (
                      <button
                        onClick={handleApproveCropPreview}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-[10px] font-semibold shadow-sm transition-colors flex items-center justify-center space-x-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>确认无误</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isCropConfirmed && sourceImageUrl && previewMode === "raw" && (
                <div className="space-y-2 pb-2">
                  <div className="text-[10px] text-slate-500 font-medium text-center bg-slate-50 border border-slate-100 rounded px-2 py-1">
                    确认后将生成 {targetSize}×{targetSize} RunningHub 抠图输入图，画布会锁定。
                  </div>
                  <button
                    onClick={handleConfirmCrop}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-3 px-4 rounded-lg shadow transition-colors flex items-center justify-center space-x-2"
                  >
                    <Scissors className="w-4 h-4 text-slate-300" />
                    <span>确认输入图</span>
                  </button>
                </div>
            )}

            {/* Outbound file format selects */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-bold text-neutral-800 uppercase tracking-wide block flex items-center">
                ③ 确认预览并抠图
              </span>

              <div className="space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 font-bold mb-2">抠图作业机制配置</div>
                <label className="flex items-center space-x-2.5 text-xs text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outputPng}
                    onChange={(e) => setOutputPng(e.target.checked)}
                    className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <div className="text-left">
                    <span className="font-medium block">
                      输出 Transparent PNG
                    </span>
                    <span className="text-[9px] text-neutral-400 block mt-0.5">
                      去除全部多余杂光和不规则背景
                    </span>
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
                    <span className="font-medium block">
                      输出 White BG 资产
                    </span>
                    <span className="text-[9px] text-neutral-400 block mt-0.5">
                      作为白底 JPG 资产正式交付
                    </span>
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
                    <span className="font-medium block">
                      输出 Alpha Mask 蒙版
                    </span>
                    <span className="text-[9px] text-neutral-400 block mt-0.5">
                      高精黑白矢量路径掩码 (供精细微调)
                    </span>
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
                    <span className="font-semibold block text-neutral-750">
                      自动生成白底 JPG
                    </span>
                    <span className="text-[9px] text-neutral-400">
                      若接口未直接提供，自动基于透明图本地铺纯白地底色
                    </span>
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
                    <span className="font-semibold block text-neutral-750">
                      自动写入产品资产包
                    </span>
                    <span className="text-[9px] text-neutral-400">
                      成功后直接写回对应 Product 实例的 assets 包中
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Workflow Config Status */}
            <div className="bg-slate-50 text-[10px] p-3 rounded-lg border border-slate-100 text-slate-500 space-y-1.5">
              <div className="font-semibold text-slate-700 flex items-center mb-2">
                <FileIcon className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                RunningHub 工作流配置状态
              </div>
              <ul className="space-y-1 leading-relaxed text-[9px] pl-1 font-mono">
                <li className="flex justify-between">
                  <span>总开关 (Enabled):</span>
                  <span className={mattingWorkflow.enabled ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>{mattingWorkflow.enabled ? "已开启" : "未开启"}</span>
                </li>
                <li className="flex justify-between">
                  <span>API Base URL:</span>
                  <span className={mattingWorkflow.apiBaseUrl ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>{mattingWorkflow.apiBaseUrl ? "已填写" : "未填写"}</span>
                </li>
                <li className="flex justify-between">
                  <span>API Key:</span>
                  <span className={mattingWorkflow.apiKey ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>{mattingWorkflow.apiKey ? "已配置" : "未配置"}</span>
                </li>
                <li className="flex justify-between">
                  <span>Workflow ID:</span>
                  <span className={mattingWorkflow.workflowId ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>{mattingWorkflow.workflowId ? "已填写" : "未填写"}</span>
                </li>
                <li className="flex justify-between">
                  <span>输入节点 ID:</span>
                  <span className={inputNodeId ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>{inputNodeId ? "已填写" : "未填写"}</span>
                </li>
                <li className="flex justify-between border-t border-slate-200 mt-1 pt-1">
                  <span className="font-semibold text-slate-700 text-[10px]">整体状态:</span>
                  <span className={isWorkflowConfigured ? "text-emerald-600 font-bold text-[10px]" : "text-red-500 font-bold text-[10px]"} >{isWorkflowConfigured ? "已就绪" : "未完全配置"}</span>
                </li>
              </ul>
              {!isWorkflowConfigured && (
                <div className="mt-2 text-[9px] text-red-500 bg-red-50 p-1.5 rounded">
                  RunningHub 工作流未配置，请先填写参配置。
                  <br />
                  {!mattingWorkflow.apiKey && "开发测试可使用 VITE_RUNNINGHUB_API_KEY，生产环境建议使用后端代理。"}
                </div>
              )}
            </div>

            {/* Workflow Specification Guide Bullet Points */}
            <div className="bg-slate-50 text-[10px] p-3 rounded-lg border border-slate-100 text-slate-500 space-y-1.5 mt-3">
              <div className="font-semibold text-slate-700 flex items-center">
                <FileIcon className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                RunningHub 抠图工作流提示
              </div>
              <ul className="space-y-1 leading-relaxed list-disc list-inside text-[9px] text-slate-600 pl-1">
                <li>上传或选择产品实拍原图图片</li>
                <li>提效调用 RunningHub 专门抠图工作流</li>
                <li>快速输出透明 PNG 资产档</li>
                <li>一键输出白底 JPG 规范图</li>
                <li>可选配产出高解析黑白 Mask 蒙版</li>
                <li>自动写入原始资产包并更新状态</li>
                <li>后续场景融合由 RunningHub 融图流继续处理</li>
              </ul>
            </div>
          </div>

          {/* Dynamic status/result message block */}
          {!isPending &&
            !mattingError &&
            selectedProduct &&
            (() => {
              const hasPng =
                (mattingStatus === "completed" && !!mattingResultUrl) ||
                selectedProduct.assets?.some(
                  (a) => a.assetType === "transparent_png",
                );
              const hasWhite =
                (mattingStatus === "completed" && !!whiteBgResultUrl) ||
                selectedProduct.assets?.some((a) => a.assetType === "white_bg");
              const hasMask =
                (mattingStatus === "completed" && !!maskResultUrl) ||
                selectedProduct.assets?.some((a) => a.assetType === "mask");

              if (!hasPng) return null;

              return (
                <div className="mt-3 bg-emerald-50 border border-emerald-250 text-emerald-900 text-[10px] p-2.5 rounded-lg">
                  <span className="font-bold flex items-center mb-1 text-emerald-850">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />
                    抠图资产已入库
                  </span>
                  <ul className="space-y-1 list-disc list-inside leading-relaxed text-[10px] text-emerald-700">
                    {hasPng && hasWhite ? (
                      <li>透明 PNG 和白底 JPG 已写入产品资产包。</li>
                    ) : (
                      <li>
                        已生成透明 PNG；白底 JPG 未返回，可后续由透明 PNG 合成。
                      </li>
                    )}
                    {hasMask && <li>Mask 已作为辅助资产写入产品资产包。</li>}
                  </ul>
                  
                  {/* Bounding Box Information display */}
                  {boundingBox && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/50">
                      <div className="font-semibold text-emerald-800 mb-1 flex justify-between">
                        <span>主体轮廓 (Bounding Box)</span>
                        <span>{Math.round(boundingBox.normalizedWidth * 100)}% 宽</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 font-mono text-[9px] text-emerald-600">
                        <div>W: {boundingBox.width}px</div>
                        <div>H: {boundingBox.height}px</div>
                        <div>X: {Math.round(boundingBox.normalizedCenterX * 100)}%</div>
                        <div>Y: {Math.round(boundingBox.normalizedCenterY * 100)}%</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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

          {/* Sequential Send Button */}
          <button
            onClick={handleSendQueueSequentially}
            disabled={
              isSequentialSending ||
              mattingQueue.filter((item) => item.status === "ready").length === 0 ||
              !isWorkflowConfigured
            }
            className={`w-full mt-4 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition-all duration-300 active:scale-[0.98] ${
              isSequentialSending || mattingQueue.filter((item) => item.status === "ready").length === 0 || !isWorkflowConfigured
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-650 hover:bg-blue-700 text-white"
            }`}
          >
            <Play className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isSequentialSending
                ? "队列执行中..."
                : mattingQueue.filter((item) => item.status === "ready").length === 0
                ? "没有待发送的项"
                : !isWorkflowConfigured
                ? "工作流未配置"
                : "一键顺序发送队列"}
            </span>
          </button>

          {/* Queue Section */}
          <div className="mt-6 border-t pt-4">
            <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                待发送队列
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                (最多 {MAX_MATTING_QUEUE_SIZE} 张)
              </span>
            </h4>
            
            {mattingQueue.length === 0 ? (
              <div className="text-[10px] text-slate-400 text-center py-6 border border-dashed rounded-lg">
                暂无队列项，请先确认输入图
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {mattingQueue.map((item, index) => (
                  <div 
                    key={item.id}
                    className={`p-2 rounded-lg border flex flex-col gap-2 transition-all cursor-pointer ${
                      activeQueueItemId === item.id ? "border-blue-400 bg-blue-50/30" : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                    onClick={() => {
                      setActiveQueueItemId(item.id);
                      if (item.status === 'succeeded' && item.transparentPngUrl) {
                        setConfirmedCropInputUrl(item.cropInputUrl);
                        setMattingResultUrl(item.transparentPngUrl);
                        if (item.whiteBgUrl) setWhiteBgResultUrl(item.whiteBgUrl);
                        if (item.maskUrl) setMaskResultUrl(item.maskUrl);
                        setPreviewMode("png");
                      } else {
                        setConfirmedCropInputUrl(item.cropInputUrl);
                        setPreviewMode("crop_input");
                        setIsCropConfirmed(true);
                        setIsCanvasLocked(item.status !== "waiting_preview_approval");
                        setIsCropPreviewApproved(item.status === "ready" || item.status === "queued" || item.status === "running" || item.status === "succeeded" || item.status === "failed");
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2">
                        <div className="flex items-center justify-center w-4 h-full text-[10px] font-bold text-slate-400 pt-2">
                          #{index + 1}
                        </div>
                        <img 
                          src={item.thumbnailUrl} 
                          alt="thumbnail" 
                          className="w-12 h-12 object-contain bg-white rounded border flex-shrink-0"
                        />
                        <div className="flex flex-col justify-center">
                          <span className="text-[10px] font-semibold text-slate-700 truncate w-24">
                            {item.productName || item.productCode || "未命名产品"}
                          </span>
                          <span className="text-[9px] text-slate-500 mt-0.5">
                            {item.targetSize}×{item.targetSize} (1:1)
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm w-max mt-1 ${
                            item.status === 'waiting_preview_approval' ? 'bg-slate-100 text-slate-600' :
                            item.status === 'ready' ? 'bg-blue-100 text-blue-600' :
                            item.status === 'queued' ? 'bg-indigo-100 text-indigo-600' :
                            item.status === 'running' ? 'bg-orange-100 text-orange-600' :
                            item.status === 'succeeded' ? 'bg-emerald-100 text-emerald-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {QUEUE_STATUS_LABELS[item.status]}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1 items-end">
                        {item.status === 'waiting_preview_approval' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveQueueItemId(item.id);
                                setConfirmedCropInputUrl(item.cropInputUrl);
                                setPreviewMode("crop_input");
                              }}
                              className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded"
                            >
                              查看
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveQueueItemId(item.id);
                                handleEditCrop();
                              }}
                              className="text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2 py-1 rounded mt-1"
                            >
                              重调
                            </button>
                            <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setMattingQueue(prev => prev.filter(q => q.id !== item.id));
                                 if (activeQueueItemId === item.id) setActiveQueueItemId(null);
                               }}
                               className="text-[9px] text-red-500 hover:bg-red-50 px-2 py-1 rounded mt-1"
                            >
                               移除
                            </button>
                          </>
                        )}
                        {(item.status === 'ready' || item.status === 'failed') && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveQueueItemId(item.id);
                                handleStartSingleQueueItem(item.id);
                              }}
                              className="text-[9px] bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-2 py-1 rounded"
                            >
                              {item.status === 'failed' ? '重试' : '单发'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveQueueItemId(item.id);
                                handleEditCrop();
                              }}
                              className="text-[9px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2 py-1 rounded mt-1"
                            >
                              重调
                            </button>
                            <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setMattingQueue(prev => prev.filter(q => q.id !== item.id));
                                 if (activeQueueItemId === item.id) setActiveQueueItemId(null);
                               }}
                               className="text-[9px] text-red-500 hover:bg-red-50 px-2 py-1 rounded mt-1"
                            >
                               移除
                            </button>
                          </>
                        )}
                        {(item.status === 'queued' || item.status === 'running') && (
                          <span className="text-[10px] text-slate-400 px-2 py-1 flex items-center gap-1">
                            {item.status === 'running' ? (
                              <svg className="animate-spin h-3 w-3 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : null}
                            处理中
                          </span>
                        )}
                        {item.status === 'succeeded' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveQueueItemId(item.id);
                              setConfirmedCropInputUrl(item.cropInputUrl);
                              setMattingResultUrl(item.transparentPngUrl || "");
                              if (item.whiteBgUrl) setWhiteBgResultUrl(item.whiteBgUrl);
                              if (item.maskUrl) setMaskResultUrl(item.maskUrl);
                              setPreviewMode("png");
                            }}
                            className="text-[9px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 px-2 py-1 rounded"
                          >
                            看结果
                          </button>
                        )}
                      </div>
                    </div>
                    {item.status === 'failed' && item.errorMessage && (
                      <div className="text-[9px] text-red-500 bg-red-50 p-1.5 rounded line-clamp-2" title={item.errorMessage}>
                        {item.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Close flex flex-1 wrapper */}
      </div>
    </div>
  );
};
