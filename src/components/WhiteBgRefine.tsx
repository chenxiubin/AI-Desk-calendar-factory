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
  Settings,
  X,
  ChevronDown,
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
  const snapEnabled = true;
  const [confirmedCropInputUrl, setConfirmedCropInputUrl] = useState("");
  const [isCropConfirmed, setIsCropConfirmed] = useState(false);
  const [isCanvasLocked, setIsCanvasLocked] = useState(false);
  const [isCropPreviewApproved, setIsCropPreviewApproved] = useState(false);

  const [targetSize, setTargetSize] = useState<1600 | 2048 | 2560>(2048);
  const [boundingBox, setBoundingBox] = useState<BoundingBoxInfo | null>(null);

  const [selectedSourceAssetId, setSelectedSourceAssetId] = useState<string>("");
  const [showConfigDetails, setShowConfigDetails] = useState(false);

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
    setConfirmedCropInputUrl("");
    setIsCropConfirmed(false);
    setIsCanvasLocked(false);
    setIsCropPreviewApproved(false);
    setSelectedSourceAssetId("");
  }, [activeProductId]);

  // Retrieve the preset matting workflow configuration
  const mattingWorkflow = runningHubMattingConfig;

  // RunningHub workflow config modal & editable overrides
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configOverrides, setConfigOverrides] = useState({
    enabled: mattingWorkflow.enabled,
    apiBaseUrl: mattingWorkflow.apiBaseUrl || "",
    apiKey: "",
    workflowId: mattingWorkflow.workflowId || "",
    inputImageNodeId: mattingWorkflow.inputImageNodeId || "",
    baseImageNodeId: mattingWorkflow.baseImageNodeId || "",
    transparentPngNodeId: mattingWorkflow.transparentPngNodeId || "",
    whiteBgNodeId: mattingWorkflow.whiteBgNodeId || "",
    maskNodeId: mattingWorkflow.maskNodeId || "",
    pollIntervalMs: mattingWorkflow.pollIntervalMs || 3000,
    maxPollCount: mattingWorkflow.maxPollCount || 60,
  });

  // Merge env defaults with user overrides for runtime consumption
  const effectiveConfig = { ...mattingWorkflow, ...configOverrides };

  const inputNodeId =
    effectiveConfig.inputImageNodeId ||
    effectiveConfig.baseImageNodeId;

  const isWorkflowConfigured =
    Boolean(effectiveConfig.enabled) &&
    Boolean(effectiveConfig.workflowId) &&
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

  // Resolve eligible assets for matting (exclude already-matted outputs)
  const eligibleSourceAssets = (selectedProduct?.assets || []).filter((a) => {
    if (!a.fileUrl) return false;
    if (a.assetType === "transparent_png" || a.assetType === "white_bg" || a.assetType === "mask") return false;
    if (a.assetRole === "transparent_png" || a.assetRole === "white_bg" || a.assetRole === "mask") return false;
    return true;
  });

  // Auto-select first eligible asset when product changes and no selection exists
  useEffect(() => {
    if (!selectedSourceAssetId && eligibleSourceAssets.length > 0 && !uploadedRawUrl) {
      setSelectedSourceAssetId(eligibleSourceAssets[0].id);
    }
  }, [eligibleSourceAssets, selectedSourceAssetId, uploadedRawUrl]);

  // Source image: uploaded file > selected asset > auto-pick
  const sourceImageUrl = uploadedRawUrl
    ? uploadedRawUrl
    : selectedSourceAssetId
      ? eligibleSourceAssets.find((a) => a.id === selectedSourceAssetId)?.fileUrl || ""
      : getMattingSourceImage(selectedProduct!, "");

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
        productName: selectedProduct?.productName,
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

          const res = await pollRunningHubTask(taskId, effectiveConfig);

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
      workflowConfig: effectiveConfig,
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

    if (item.status !== "ready" && item.status !== "failed") {
      setMattingError("该队列项尚未确认预览，不能发送。");
      return;
    }

    // Clear previous error on retry
    if (item.status === "failed") {
      setMattingQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, errorMessage: undefined, status: "ready" }
            : q,
        ),
      );
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
    <div className="flex flex-col gap-3 h-full overflow-hidden text-left font-sans">
      {/* 1. Page Title Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 py-3 px-5 shadow-xs shrink-0">
        <div className="flex items-center justify-between gap-3">
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

          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-semibold transition-colors shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            工作流配置
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-3 min-h-0">
        {/* 2. Left Section: File uploads and list queue */}
        <div className="w-64 bg-white rounded-xl border border-slate-200/80 p-3 flex flex-col shrink-0 shadow-xs">
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 tracking-wider">
                ① 选择原图
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                导入原始产品实拍图片或选择队列中的产品
              </p>
            </div>

            {/* Upload button */}
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

            {/* Target product selection dropdown */}
            <h4 className="text-[10px] uppercase font-bold text-slate-400">
              选择待抠图产品
            </h4>
            <div className="relative">
              <select
                value={activeProductId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setActiveProductId(pid);
                  setMattingResultUrl("");
                  setWhiteBgResultUrl("");
                  setMaskResultUrl("");
                  setMattingStatus("idle");
                  setMattingProgress(0);
                  setMattingError("");
                  setUploadedRawUrl("");
                }}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-xs text-slate-700 font-medium cursor-pointer hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-colors"
              >
                {products.map((p) => {
                  const hasAssets =
                    p.assets &&
                    p.assets.some((a) => a.assetType === "transparent_png");
                  return (
                    <option key={p.id} value={p.id}>
                      [{p.productCode}] {p.productName} — {p.seriesName}{hasAssets ? " ✓已抠图" : ""}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Product assets — select source for matting */}
            <div className="flex-1 min-h-0 flex flex-col">
              <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 shrink-0">
                产品资产
              </h4>
              {eligibleSourceAssets.length === 0 && !uploadedRawUrl ? (
                <div className="text-center py-4 text-[10px] text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                  暂无可用资产，请先在产品资产库上传图片
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
                  {eligibleSourceAssets.map((asset) => {
                    const isSelected = asset.id === selectedSourceAssetId && !uploadedRawUrl;
                    const isDataUrl = asset.fileUrl && (asset.fileUrl.startsWith("data:") || asset.fileUrl.startsWith("/assets/"));
                    const fileName = (asset as any).fileName || asset.assetType || "图片";
                    return (
                      <div
                        key={asset.id}
                        onClick={() => {
                          setSelectedSourceAssetId(asset.id);
                          setUploadedRawUrl("");
                          setPreviewMode("raw");
                          setBoundingBox(null);
                          setCropCanvasState(null);
                          setConfirmedCropInputUrl("");
                          setIsCropConfirmed(false);
                          setIsCanvasLocked(false);
                          setIsCropPreviewApproved(false);
                          setMattingError("");
                        }}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-200"
                            : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {isDataUrl ? (
                          <img
                            src={asset.fileUrl}
                            alt={fileName}
                            className="w-10 h-10 object-cover rounded border bg-white shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded border bg-slate-100 flex items-center justify-center shrink-0">
                            <Image className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-[10px] font-medium text-slate-700 truncate">
                            {fileName}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {asset.assetType}
                            {asset.width && asset.height
                              ? ` · ${asset.width}×${asset.height}`
                              : ""}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Middle Section: Comparative Visualizer */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200/80 p-4 flex flex-col min-w-0 min-h-0 shadow-xs">
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
          <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden p-4 relative flex items-center justify-center min-h-[260px]">
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
                      snapEnabled={snapEnabled}
                      locked={isCanvasLocked}
                      onStateChange={handleCropCanvasStateChange}
                      onConfirmShortcut={handleConfirmCrop}
                    />
                    

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
                    {previewMode === "raw" && "调整抠图输入 (1:1) - 调整裁剪框、移动图片并确认输入图"}
                    {previewMode === "crop_input" && "📐 RunningHub 输入图预览"}
                    {previewMode === "png" && "✨ RunningHub 抠图透明 PNG"}
                    {previewMode === "white_bg" && "🥚 渲染白底 JPG 资产"}
                    {previewMode === "mask" && "🖤 高精度黑白 Mask 蒙版"}
                  </div>
                  

                </div>
              </div>
            ) : (
              <div className="text-center p-4 space-y-2 flex flex-col items-center">
                <Image className="w-12 h-12 text-slate-700 opacity-40 animate-pulse" />
                <p className="text-xs text-slate-400 max-w-[240px]">
                  目前尚无激活原始素材图片。请点击左侧上传实拍原图，或选择已填入资产的产品进行预览。
                </p>
              </div>
            )}
          </div>

          {/* 3. Bottom Section: Produced results list */}
          <div className="mt-3 border-t border-slate-100 pt-2 shrink-0">
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

        {/* 4. Right side: settings + queue */}
        <div className="w-72 bg-white rounded-xl border border-slate-200/80 p-3 flex flex-col shrink-0 shadow-xs min-h-0">
          {/* Config summary row — always visible */}
          <div className="shrink-0 pb-2 border-b border-slate-100 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[10px] font-medium text-slate-600 truncate">
                  输出: {targetSize}px · {[outputPng && "PNG", outputWhiteBg && "JPG", outputMask && "Mask"].filter(Boolean).join("+") || "—"}
                  {isCropPreviewApproved ? " · 已确认" : ""}
                  {!isWorkflowConfigured && " · ⚠未配置"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigDetails(!showConfigDetails)}
                className={`text-[10px] font-semibold flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  showConfigDetails ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {showConfigDetails ? "收起配置" : "展开配置"}
                <ChevronDown className={`w-3 h-3 transition-transform ${showConfigDetails ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Expandable config sections */}
          {showConfigDetails && (
            <div className="shrink-0 space-y-2 overflow-y-auto max-h-[45%] pr-1 mb-2">
              {/* Workflow Configuration Warning */}
              {!isWorkflowConfigured && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] p-2 rounded-lg">
                  <div className="font-semibold flex items-center mb-0.5">
                    <AlertTriangle className="w-3 h-3 text-amber-600 mr-1 shrink-0" />
                    提示：模块尚未就绪
                  </div>
                  <p className="text-[9px] text-amber-700/90 leading-relaxed">
                    RunningHub 抠图工作流尚未配置，请先配置 workflowId 和输入输出节点。
                  </p>
                </div>
              )}

              {/* Output Size */}
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">预处理输出尺寸</span>
                <div className="flex bg-slate-100 rounded p-0.5">
                  {[1600, 2048, 2560].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTargetSize(size as 1600 | 2048 | 2560)}
                      className={`flex-1 text-[10px] font-mono py-1 rounded transition-colors ${
                        targetSize === size ? "bg-blue-600 text-white font-bold" : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Crop preview */}
              {confirmedCropInputUrl && (
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                  <img src={confirmedCropInputUrl} alt="Crop preview" className="w-10 h-10 object-contain bg-white rounded border shrink-0" />
                  <div className="min-w-0 flex-1 text-[9px]">
                    <p className="font-medium text-slate-700 truncate">输入图预览</p>
                    <p className="text-slate-400">{isCropPreviewApproved ? "✓ 已确认" : "待确认"}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={handleEditCrop} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-50">重调</button>
                    {!isCropPreviewApproved && (
                      <button type="button" onClick={handleApproveCropPreview} className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded hover:bg-blue-700">确认</button>
                    )}
                  </div>
                </div>
              )}

              {/* Output format checkboxes */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 block">抠图输出格式</span>
                <label className="flex items-center gap-2 text-[10px] text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={outputPng} onChange={(e) => setOutputPng(e.target.checked)} className="rounded h-3 w-3" />
                  Transparent PNG
                </label>
                <label className="flex items-center gap-2 text-[10px] text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={outputWhiteBg} onChange={(e) => setOutputWhiteBg(e.target.checked)} className="rounded h-3 w-3" />
                  White BG JPG
                </label>
                <label className="flex items-center gap-2 text-[10px] text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={outputMask} onChange={(e) => setOutputMask(e.target.checked)} className="rounded h-3 w-3" />
                  Alpha Mask
                </label>
              </div>

              {/* Auto assist */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 block">辅助策略</span>
                <label className="flex items-center gap-2 text-[10px] text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={autoGenWhiteJpg} onChange={(e) => setAutoGenWhiteJpg(e.target.checked)} className="rounded h-3 w-3" />
                  自动生成白底 JPG
                </label>
                <label className="flex items-center gap-2 text-[10px] text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={writeToAssets} onChange={(e) => setWriteToAssets(e.target.checked)} className="rounded h-3 w-3" />
                  自动写入产品资产包
                </label>
              </div>
            </div>
          )}

          {/* Queue errors / results */}
          {mattingError && (
            <div className="shrink-0 mb-2 text-[10px] text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">{mattingError}</div>
          )}

          {/* Success message — shrink to fit */}
          {!isPending && !mattingError && selectedProduct && (() => {
            const hasPng = (mattingStatus === "completed" && !!mattingResultUrl) || selectedProduct.assets?.some((a) => a.assetType === "transparent_png");
            if (!hasPng) return null;
            return (
              <div className="shrink-0 mb-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] p-2 rounded-lg">
                <span className="font-bold flex items-center">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mr-1 shrink-0" />抠图资产已入库
                </span>
              </div>
            );
          })()}

          {/* Sequential Send Button — fixed at bottom */}
          <button
            type="button"
            onClick={handleSendQueueSequentially}
            disabled={
              isSequentialSending ||
              mattingQueue.filter((item) => item.status === "ready").length === 0 ||
              !isWorkflowConfigured
            }
            className={`w-full font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow shrink-0 transition-all duration-300 active:scale-[0.98] ${
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

          {/* Queue Section — fills remaining space */}
          <div className="flex-1 min-h-[120px] flex flex-col mt-2 border-t pt-2 overflow-hidden">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between shrink-0">
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                待发送队列
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                (最多 {MAX_MATTING_QUEUE_SIZE} 张)
              </span>
            </h4>
            
            {mattingQueue.length === 0 ? (
              <div className="text-[10px] text-slate-400 text-center py-4 border border-dashed rounded-lg">
                暂无队列项，请先确认输入图
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-0">
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
                              disabled={!isWorkflowConfigured}
                              className={`text-[9px] px-2 py-1 rounded border ${!isWorkflowConfigured ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"}`}
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

      {/* RunningHub Workflow Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfigModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-[520px] max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-600" />
                <h3 className="text-base font-bold text-slate-900">RunningHub 工作流配置</h3>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Enable toggle */}
              <label className="flex items-center justify-between bg-slate-50 p-3 rounded-lg cursor-pointer">
                <div>
                  <span className="text-sm font-semibold text-slate-700">启用 RunningHub</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">关闭后所有抠图功能暂停</p>
                </div>
                <button
                  onClick={() => setConfigOverrides(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative w-10 h-5.5 rounded-full transition-colors ${configOverrides.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${configOverrides.enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </label>

              {/* API Base URL */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">API Base URL</label>
                <input
                  type="text"
                  value={configOverrides.apiBaseUrl}
                  onChange={(e) => setConfigOverrides(prev => ({ ...prev, apiBaseUrl: e.target.value }))}
                  placeholder="https://www.runninghub.cn"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none font-mono"
                />
              </div>

              {/* Workflow ID */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Workflow ID</label>
                <input
                  type="text"
                  value={configOverrides.workflowId}
                  onChange={(e) => setConfigOverrides(prev => ({ ...prev, workflowId: e.target.value }))}
                  placeholder="2063802342654431234"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none font-mono"
                />
              </div>

              {/* Node IDs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">输入图片节点 ID</label>
                  <input type="text" value={configOverrides.inputImageNodeId} onChange={(e) => setConfigOverrides(prev => ({ ...prev, inputImageNodeId: e.target.value }))} placeholder="129" className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">备用输入节点 ID</label>
                  <input type="text" value={configOverrides.baseImageNodeId} onChange={(e) => setConfigOverrides(prev => ({ ...prev, baseImageNodeId: e.target.value }))} placeholder="(可选)" className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">透明 PNG 输出节点 ID</label>
                  <input type="text" value={configOverrides.transparentPngNodeId} onChange={(e) => setConfigOverrides(prev => ({ ...prev, transparentPngNodeId: e.target.value }))} placeholder="159" className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">白底 JPG 输出节点 ID</label>
                  <input type="text" value={configOverrides.whiteBgNodeId} onChange={(e) => setConfigOverrides(prev => ({ ...prev, whiteBgNodeId: e.target.value }))} placeholder="(可选)" className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">Mask 输出节点 ID</label>
                  <input type="text" value={configOverrides.maskNodeId} onChange={(e) => setConfigOverrides(prev => ({ ...prev, maskNodeId: e.target.value }))} placeholder="(可选)" className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">轮询间隔 (ms)</label>
                  <input type="number" value={configOverrides.pollIntervalMs} onChange={(e) => setConfigOverrides(prev => ({ ...prev, pollIntervalMs: Number(e.target.value) }))} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none font-mono" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
              <p className="text-[10px] text-slate-400">修改后立即生效，仅本次会话有效</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setConfigOverrides({
                      enabled: mattingWorkflow.enabled,
                      apiBaseUrl: mattingWorkflow.apiBaseUrl || "",
                      apiKey: "",
                      workflowId: mattingWorkflow.workflowId || "",
                      inputImageNodeId: mattingWorkflow.inputImageNodeId || "",
                      baseImageNodeId: mattingWorkflow.baseImageNodeId || "",
                      transparentPngNodeId: mattingWorkflow.transparentPngNodeId || "",
                      whiteBgNodeId: mattingWorkflow.whiteBgNodeId || "",
                      maskNodeId: mattingWorkflow.maskNodeId || "",
                      pollIntervalMs: mattingWorkflow.pollIntervalMs || 3000,
                      maxPollCount: mattingWorkflow.maxPollCount || 60,
                    });
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  恢复默认
                </button>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
