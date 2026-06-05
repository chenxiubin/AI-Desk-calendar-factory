import React, { useState } from "react";
import { GeneratedImage, Product, Template } from "../types";
import { VisualCalendar } from "./VisualCalendar";
import { renderTemplateToCanvas } from "../utils/renderTemplate";
import { PRESET_RUNNINGHUB_WORKFLOWS } from "../data";
import { queryRunningHubOutputs, runSceneFusion } from "../services/runninghubClient";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Filter,
  Eye,
  CheckSquare,
  HelpCircle,
  RefreshCw,
  FolderLock
} from "lucide-react";

interface ReviewCenterProps {
  generatedImages: GeneratedImage[];
  products: Product[];
  templates: Template[];
  onUpdateImage: (img: GeneratedImage) => void;
  onBatchAction: (action: "approve" | "reject" | "needs_adjustment") => void;
}

export const ReviewCenter: React.FC<ReviewCenterProps> = ({
  generatedImages,
  products,
  templates,
  onUpdateImage,
  onBatchAction
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterIssue, setFilterIssue] = useState<string>("all");
  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    generatedImages.length > 0 ? generatedImages[0].id : null
  );

  // Grab the active selected image details
  const activeImage = generatedImages.find((img) => img.id === selectedImageId) || generatedImages[0];
  const activeProduct = activeImage ? products.find((p) => p.id === activeImage.productId) : null;
  const activeTemplate = activeImage ? templates.find((t) => t.id === activeImage.templateId) : null;

  // Manual fine-tune sliders local states
  const [currentXOffset, setCurrentXOffset] = useState<number>(0);
  const [currentYOffset, setCurrentYOffset] = useState<number>(0);
  const [currentScale, setCurrentScale] = useState<number>(1.0);

  // Load manual offset values once image changes
  React.useEffect(() => {
    if (activeImage) {
      setCurrentXOffset(activeImage.horizontalOffset || 0);
      setCurrentYOffset(activeImage.verticalOffset || 0);
      setCurrentScale(activeImage.scaleFactor || 1.0);
    }
  }, [activeImage]);

  const [renderedPreviewUrl, setRenderedPreviewUrl] = useState<string>("");

  React.useEffect(() => {
    let active = true;
    if (activeImage && activeProduct && activeTemplate) {
      renderTemplateToCanvas(activeProduct, activeTemplate, {
        hOffset: currentXOffset,
        vOffset: currentYOffset,
        scale: currentScale
      })
        .then((url) => {
          if (active) {
            setRenderedPreviewUrl(url);
          }
        })
        .catch((err) => {
          console.error("Error drawing on slider change", err);
        });
    }
    return () => {
      active = false;
    };
  }, [activeImage, activeProduct, activeTemplate, currentXOffset, currentYOffset, currentScale]);

  // RunningHub scene-fusion states
  const defaultWorkflow = PRESET_RUNNINGHUB_WORKFLOWS[0];
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(defaultWorkflow.id);
  const activeWorkflow = PRESET_RUNNINGHUB_WORKFLOWS.find((w) => w.id === selectedWorkflowId) || defaultWorkflow;

  const [promptInput, setPromptInput] = useState<string>("");
  const [negPromptInput, setNegPromptInput] = useState<string>("");
  const [denoiseInput, setDenoiseInput] = useState<number>(0.22);
  const [seedInput, setSeedInput] = useState<number>(12154);

  // Initialize input values when active image or workflow changes
  React.useEffect(() => {
    if (activeWorkflow) {
      setPromptInput(activeWorkflow.defaultPrompt);
      setNegPromptInput(activeWorkflow.defaultNegativePrompt);
      setDenoiseInput(activeWorkflow.defaultDenoise);
    }
  }, [selectedWorkflowId, activeImage?.id]);

  // Track polling tasks registry
  const [pollingTasks, setPollingTasks] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    generatedImages.forEach((img) => {
      if (
        (img.aiFusionStatus === "running" || img.aiFusionStatus === "queued") &&
        img.aiFusionTaskId &&
        !pollingTasks[img.aiFusionTaskId]
      ) {
        setPollingTasks((prev) => ({ ...prev, [img.aiFusionTaskId!]: true }));
        let attempts = 0;
        const maxAttempts = 50; // ~2.5 mins
        
        const poll = setInterval(async () => {
          attempts++;
          if (attempts > maxAttempts) {
            clearInterval(poll);
            const updated = {
              ...img,
              aiFusionStatus: "failed" as const,
              aiFusionError: "轮询超时(2.5分钟)"
            };
            onUpdateImage(updated);
            setPollingTasks((prev) => {
              const clone = { ...prev };
              delete clone[img.aiFusionTaskId!];
              return clone;
            });
            return;
          }

          try {
            const mode = img.aiFusionWorkflowId === "comfyui_openapi" ? "comfyui_openapi" : "run_workflow_v2";
            const res = await queryRunningHubOutputs(img.aiFusionTaskId!, mode);
            
            if (res.status === "completed" && res.outputUrl) {
              clearInterval(poll);
              const updated = {
                ...img,
                aiFusionStatus: "completed" as const,
                aiFusionUrl: res.outputUrl,
                aiFusionError: undefined
              };
              onUpdateImage(updated);
              setPollingTasks((prev) => {
                const clone = { ...prev };
                delete clone[img.aiFusionTaskId!];
                return clone;
              });
            } else if (res.status === "failed") {
              clearInterval(poll);
              const updated = {
                ...img,
                aiFusionStatus: "failed" as const,
                aiFusionError: res.errorMessage || "RunningHub 任务执行失败"
              };
              onUpdateImage(updated);
              setPollingTasks((prev) => {
                const clone = { ...prev };
                delete clone[img.aiFusionTaskId!];
                return clone;
              });
            }
          } catch (err: any) {
            console.error("Polling error for image taskId:", img.aiFusionTaskId, err);
          }
        }, 3000);

        return () => {
          clearInterval(poll);
        };
      }
    });
  }, [generatedImages, pollingTasks]);

  // Filter matrix execution
  const filtered = generatedImages.filter((img) => {
    const matchesStatus = filterStatus === "all" || img.reviewStatus === filterStatus;
    const matchesType = filterType === "all" || img.imageType === filterType;
    const matchesIssue =
      filterIssue === "all" ||
      (filterIssue === "clean" && img.qualityIssues.length === 0) ||
      (filterIssue === "bugged" && img.qualityIssues.length > 0) ||
      img.qualityIssues.some((issue) => issue.includes(filterIssue));

    return matchesStatus && matchesType && matchesIssue;
  });

  const getTypeNameStr = (type: string) => {
    switch (type) {
      case "main":
        return "黄金主图";
      case "sku":
        return "单款SKU";
      case "detail":
        return "工艺详情";
      default:
        return "套版图";
    }
  };

  const statusTags: Record<string, { label: string; color: string }> = {
    pending: { label: "待质素质检", color: "bg-amber-50 text-amber-800 border-amber-200" },
    approved: { label: "质检通过", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    rejected: { label: "拦截退回", color: "bg-rose-50 text-rose-700 border-rose-200" },
    needs_adjustment: { label: "待微调微移", color: "bg-purple-50 text-purple-700 border-purple-200" }
  };

  const saveAuditChange = (newStatus: GeneratedImage["reviewStatus"]) => {
    if (!activeImage) return;
    const updated: GeneratedImage = {
      ...activeImage,
      reviewStatus: newStatus,
      horizontalOffset: currentXOffset,
      verticalOffset: currentYOffset,
      scaleFactor: currentScale
    };
    onUpdateImage(updated);
    alert(`【质检更新】该台历图状态已被标记为：「${statusTags[newStatus].label}」。`);
  };

  // Helpers to draw template backgrounds mockups
  const getReviewBackgroundStyle = (styleName?: string) => {
    switch (styleName) {
      case "warm_light":
        return "bg-radial from-amber-500/10 via-amber-100/30 to-slate-200";
      case "beige_paper":
        return "bg-stone-50 border-stone-200";
      case "studio_white":
        return "bg-slate-50 border-slate-100";
      case "festive_red":
        return "bg-gradient-to-br from-rose-600 via-rose-500 to-rose-800";
      case "luxury_gold":
        return "bg-gradient-to-br from-amber-600 via-amber-950 to-slate-900";
      default:
        return "bg-white";
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[600px] gap-6 text-left">
      {/* 1. Left Section: Browse generated sheets */}
      <div className="flex-1 bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between overflow-hidden shadow-xs">
        {/* Filters control row bar */}
        <div className="space-y-4 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">套版图片批量质检与审核柜</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">自动阻断遮线圈、防文字切边溢出、人工精调定位对齐百分比</p>
              </div>
            </div>

            {/* Quick Bulk triggers */}
            <div className="flex space-x-2 text-xs">
              <button
                onClick={() => {
                  onBatchAction("approve");
                  alert("所筛选的待审核图件均已「一键批量通过质检」。");
                }}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 rounded-lg whitespace-nowrap hover:bg-emerald-100 transition-all cursor-pointer"
              >
                批量通过已筛
              </button>
              <button
                onClick={() => {
                  onBatchAction("needs_adjustment");
                  alert("已批量将已选图件标识为需调整修正。");
                }}
                className="px-3 py-1.5 bg-purple-50 text-purple-800 font-bold border border-purple-200 rounded-lg whitespace-nowrap hover:bg-purple-100 transition-all cursor-pointer"
              >
                批量挂接需调
              </button>
            </div>
          </div>

          {/* Detailed filters selects row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            {/* Status tab */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-150 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-transparent border-0 outline-none p-0 text-slate-700 font-semibold cursor-pointer"
              >
                <option value="all">所有审核状态</option>
                <option value="pending">待审核 / 未处理</option>
                <option value="approved">已质检通过</option>
                <option value="needs_adjustment">需微调修正</option>
                <option value="rejected">已退回拦截</option>
              </select>
            </div>

            {/* Type tab */}
            <div className="bg-slate-50 border border-slate-150 rounded-lg px-2.5 py-1.5 flex items-center">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-transparent border-0 outline-none p-0 text-slate-700 font-semibold cursor-pointer"
              >
                <option value="all">所有的图纸尺寸</option>
                <option value="main">淘宝天猫主图 (800x800)</option>
                <option value="sku">电商规格 SKU 展示图</option>
                <option value="detail">无线端工艺材质详情</option>
              </select>
            </div>

            {/* Quality Issues select */}
            <div className="bg-slate-50 border border-slate-150 rounded-lg px-2.5 py-1.5 flex items-center">
              <select
                value={filterIssue}
                onChange={(e) => setFilterIssue(e.target.value)}
                className="w-full bg-transparent border-0 outline-none p-0 text-slate-700 font-semibold cursor-pointer"
              >
                <option value="all">所有智能报警</option>
                <option value="clean">绝无异样规范件</option>
                <option value="bugged">排除已报警风险件</option>
                <option value="穿模">线圈遮挡/穿模风险</option>
                <option value="越界">文字越界溢出安全线</option>
              </select>
            </div>
          </div>
        </div>

        {/* Master images grid listing */}
        <div className="flex-grow overflow-y-auto pr-1 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4 min-h-[280px]">
          {filtered.map((img) => {
            const prod = products.find((p) => p.id === img.productId)!;
            const temp = templates.find((t) => t.id === img.templateId)!;
            const isSel = img.id === selectedImageId;
            const hasFlaws = img.qualityIssues.length > 0;

            return (
              <div
                key={img.id}
                onClick={() => setSelectedImageId(img.id)}
                className={`bg-white rounded-xl border overflow-hidden p-3 flex flex-col justify-between cursor-pointer relative h-60 transition-all ${
                  isSel
                    ? "ring-2 ring-blue-600 shadow-md scale-98 border-transparent"
                    : hasFlaws
                    ? "border-amber-300 bg-amber-50/5 hover:border-amber-400"
                    : "border-slate-150 hover:border-slate-300 hover:shadow-2xs"
                }`}
              >
                {/* Visual miniature mockup canvas preview */}
                <div
                  className={`flex-1 rounded-lg border border-slate-100 min-h-0 relative flex items-center justify-center p-2 overflow-hidden ${getReviewBackgroundStyle(
                    temp.background.sceneStyle
                  )}`}
                >
                  {img.fileUrl && img.fileUrl !== "url" ? (
                    <img src={img.fileUrl} className="max-w-full max-h-full object-contain rounded animate-fade-in" alt="Rendered Preview" />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200 w-full h-full">
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-405 mb-1">
                        UNRENDERED
                      </span>
                      <p className="text-[9px] text-slate-400">暂无真实渲染版式图</p>
                    </div>
                  )}

                  {/* Warning overlay if flaws detected */}
                  {hasFlaws && (
                    <div className="absolute top-1.5 left-1.5 bg-amber-500 text-slate-900 font-extrabold font-mono text-[9px] px-1.5 py-0.5 rounded shadow-xs max-w-[80%] truncate">
                      ⚠️ 穿铁线/溢出
                    </div>
                  )}
                </div>

                {/* Info labels */}
                <div className="mt-3 text-left">
                  <div className="flex justify-between items-baseline text-[11px] gap-1">
                    <span className="font-bold text-slate-800 truncate block">
                      {prod.productCode}-{prod.productName}
                    </span>
                    <span className="text-slate-400 font-mono text-[9px] shrink-0">
                      {temp.outputWidth}x{temp.outputHeight}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    画布模板: {temp.templateName}
                  </p>

                  <div className="flex justify-between items-center mt-2 border-t border-slate-100 pt-2 text-[9px]">
                    <span className={`px-2 py-0.5 rounded-full font-bold border ${statusTags[img.reviewStatus].color}`}>
                      {statusTags[img.reviewStatus].label}
                    </span>
                    <span className="text-slate-400 font-semibold font-mono">
                      {getTypeNameStr(img.imageType)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-16 text-center text-slate-400 bg-slate-50/20 border border-dashed border-slate-200 rounded-xl">
              <CheckCircle className="w-10 h-10 text-slate-350 mb-3" />
              <p className="text-xs font-semibold text-slate-600">在此检索范围内，没有未处理或报警的产品图。</p>
              <p className="text-[10px] text-slate-400 mt-1">您可以尝试清空顶部筛选条件</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Right Section: Detailed Single check and manual Fine-Tune reposition knobs */}
      {activeImage && activeProduct && activeTemplate && (
        <div className="w-full lg:w-[460px] bg-white border border-slate-150 rounded-2xl p-5 overflow-y-auto shrink-0 flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3.5 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-slate-800 tracking-tight">精修矢量位精调台</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">拖拽对准铁圈边框位置 / AI场景融合</p>
              </div>
              <span className="text-[10px] bg-slate-100 font-mono font-black px-2.5 py-1 rounded-lg text-slate-600">
                {activeProduct.productCode}
              </span>
            </div>

            {/* Side-by-side Canvas Original vs AI Fusion Comparison */}
            <div className="grid grid-cols-2 gap-4 h-56 w-full">
              {/* Left Column: Canvas Original */}
              <div className="border border-slate-150 rounded-xl relative flex flex-col items-center justify-center overflow-hidden p-1.5 bg-slate-50">
                <span className="absolute top-1 left-1.5 z-10 bg-slate-700/85 backdrop-blur-xs text-white font-bold text-[8.5px] px-1.5 py-0.5 rounded shadow-xs">
                  左: Canvas原图
                </span>
                <div className="w-full flex-grow flex items-center justify-center overflow-hidden min-h-0">
                  {renderedPreviewUrl ? (
                    <img src={renderedPreviewUrl} className="max-w-full max-h-full object-contain rounded shadow-xs" alt="Live Original Canvas" />
                  ) : (
                    <div className="text-[10px] text-zinc-400">正在生成...</div>
                  )}
                </div>
                <div className="absolute bottom-1 right-1 text-[7.5px] text-zinc-450 font-semibold truncate max-w-[120px]">
                  {activeProduct.productName}
                </div>
              </div>

              {/* Right Column: AI Fusion Image */}
              <div className="border border-slate-150 rounded-xl relative flex flex-col items-center justify-center overflow-hidden p-1.5 bg-slate-50">
                <span className="absolute top-1 left-1.5 z-10 bg-indigo-650/85 backdrop-blur-xs text-white font-bold text-[8.5px] px-1.5 py-0.5 rounded shadow-xs">
                  右: AI融合图
                </span>
                
                <div className="w-full flex-grow flex items-center justify-center overflow-hidden min-h-0">
                  {activeImage.aiFusionStatus === "completed" && activeImage.aiFusionUrl ? (
                    <img src={activeImage.aiFusionUrl} className="max-w-full max-h-full object-contain rounded shadow-xs cursor-zoom-in" alt="AI Fusion Completed" onClick={() => window.open(activeImage.aiFusionUrl, "_blank")} />
                  ) : activeImage.aiFusionStatus === "running" || activeImage.aiFusionStatus === "queued" ? (
                    <div className="flex flex-col items-center justify-center text-center p-2 space-y-1">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      <span className="text-[9px] text-slate-500 font-bold animate-pulse">RunningHub融合中...</span>
                    </div>
                  ) : activeImage.aiFusionStatus === "failed" ? (
                    <div className="flex flex-col items-center justify-center text-center p-2 space-y-1">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span className="text-[9px] text-rose-600 font-bold">融合失败</span>
                      <span className="text-[8px] text-slate-400 select-all truncate max-w-[150px]" title={activeImage.aiFusionError}>{activeImage.aiFusionError}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center items-center text-center p-2">
                      <HelpCircle className="w-4.5 h-4.5 text-slate-355 mr-1" />
                      <span className="text-[9px] text-slate-400 mt-1 font-semibold text-center">尚未启动 AI 融合</span>
                    </div>
                  )}
                </div>
                {activeImage.aiFusionStatus === "completed" && activeImage.aiFusionUrl && (
                  <div className="absolute bottom-1 right-1 text-[7.5px] text-emerald-600 font-bold">
                    完成
                  </div>
                )}
              </div>
            </div>

            {/* AI Fusion triggering controls */}
            <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-150 space-y-3 text-xs text-left">
              <div className="flex justify-between items-center border-b border-slate-150 pb-1.5">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  ✨ RunningHub 智能场景融合 v2
                </span>
                <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black uppercase ${
                  activeImage.aiFusionStatus === "completed" 
                    ? "bg-emerald-100 text-emerald-850" 
                    : activeImage.aiFusionStatus === "running" || activeImage.aiFusionStatus === "queued"
                    ? "bg-blue-100 text-blue-850 animate-pulse"
                    : activeImage.aiFusionStatus === "failed"
                    ? "bg-rose-100 text-rose-850"
                    : "bg-slate-200 text-slate-650"
                }`}>
                  状态: {
                    activeImage.aiFusionStatus === "completed" ? "完成" : 
                    activeImage.aiFusionStatus === "running" || activeImage.aiFusionStatus === "queued" ? "融合中" : 
                    activeImage.aiFusionStatus === "failed" ? "失败" : "空闲"
                  }
                </span>
              </div>

              {/* Workflow selection block */}
              <div className="space-y-1">
                <span className="block text-[8.5px] text-slate-450 font-bold uppercase">选择融合工作流</span>
                <select
                  value={selectedWorkflowId}
                  onChange={(e) => setSelectedWorkflowId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  disabled={activeImage.aiFusionStatus === "running" || activeImage.aiFusionStatus === "queued"}
                >
                  {PRESET_RUNNINGHUB_WORKFLOWS.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name} ({wf.apiMode === "run_workflow_v2" ? "V2" : "Legacy V1"})
                    </option>
                  ))}
                </select>
                {!activeWorkflow?.baseImageNodeId && (
                  <div className="mt-1.5 p-2 bg-amber-50 rounded-lg text-[9.5px] text-amber-805 border border-amber-200 leading-normal font-medium">
                    ⚠️ 当前工作流未配置 RunningHub 输入图片节点 (baseImageNodeId 字段未填写)，任务将使用工作流默认参数，无法验证真实 Canvas 图融合。
                  </div>
                )}
              </div>

              {/* Advanced prompt configuration */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="block text-[8.5px] text-slate-450 font-bold uppercase">AI 创意增强提示词 (Prompt)</span>
                  <textarea
                    rows={2}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 font-medium rounded-lg p-1.5 leading-relaxed text-[10.5px]"
                    disabled={activeImage.aiFusionStatus === "running" || activeImage.aiFusionStatus === "queued"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  <div>
                    <span className="block text-[8.5px] text-slate-450 font-bold uppercase mb-1">重绘强度 (Denoise)</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      max="0.95"
                      value={denoiseInput}
                      onChange={(e) => setDenoiseInput(parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1 font-mono font-bold"
                      disabled={activeImage.aiFusionStatus === "running" || activeImage.aiFusionStatus === "queued"}
                    />
                  </div>
                  <div>
                    <span className="block text-[8.5px] text-slate-450 font-bold uppercase mb-1">随机种子 (Seed)</span>
                    <input
                      type="number"
                      value={seedInput}
                      onChange={(e) => setSeedInput(parseInt(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1 font-mono font-bold"
                      disabled={activeImage.aiFusionStatus === "running" || activeImage.aiFusionStatus === "queued"}
                    />
                  </div>
                </div>
              </div>

              {/* Trigger button */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (!renderedPreviewUrl) {
                      alert("Canvas 尚未生成完毕，无法触发融合。");
                      return;
                    }
                    
                    // Mark as running
                    const runningImg: GeneratedImage = {
                      ...activeImage,
                      aiFusionStatus: "running",
                      aiFusionError: undefined,
                      aiFusionWorkflowId: activeWorkflow.id
                    };
                    onUpdateImage(runningImg);
                    
                    // Trigger scene-fusion api (defaults to v2 upload and run_workflow_v2)
                    const fusionResult = await runSceneFusion({
                      baseImageDataUrl: renderedPreviewUrl,
                      workflowConfig: {
                        ...activeWorkflow,
                        defaultPrompt: promptInput,
                        defaultNegativePrompt: negPromptInput,
                        defaultDenoise: denoiseInput
                      },
                      prompt: promptInput,
                      negativePrompt: negPromptInput,
                      denoise: denoiseInput,
                      seed: seedInput
                    });
                    
                    if (fusionResult && fusionResult.taskId) {
                      if (fusionResult.warning) {
                        console.warn("[RunningHub Warning]:", fusionResult.warning);
                      }
                      // Save taskId to state
                      const updatedImg: GeneratedImage = {
                        ...activeImage,
                        aiFusionTaskId: fusionResult.taskId,
                        aiFusionStatus: "running",
                        aiFusionWorkflowId: activeWorkflow.id
                      };
                      onUpdateImage(updatedImg);
                    } else {
                      throw new Error("接口未返回有效 taskId");
                    }
                  } catch (err: any) {
                    console.error("AI Scene fusion failure:", err);
                    const failedImg: GeneratedImage = {
                      ...activeImage,
                      aiFusionStatus: "failed",
                      aiFusionError: err.message || "请求启动场景融合失败"
                    };
                    onUpdateImage(failedImg);
                  }
                }}
                disabled={activeImage.aiFusionStatus === "running" || activeImage.aiFusionStatus === "queued"}
                className="w-full py-2 px-3 bg-indigo-600 font-bold hover:bg-indigo-700 disabled:bg-slate-350 text-white rounded-lg flex justify-center items-center gap-1 shadow-xs transition-all focus:outline-none cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${
                  activeImage.aiFusionStatus === "running" || activeImage.aiFusionStatus === "queued" ? "animate-spin" : ""
                }`} />
                <span>
                  {activeImage.aiFusionStatus === "running" || activeImage.aiFusionStatus === "queued" 
                    ? "云端工作流融合运算中..." 
                    : "一键提交 RunningHub V2 融合"}
                </span>
              </button>
            </div>

            {/* Quality issue warn lists */}
            {activeImage.qualityIssues.length > 0 ? (
              <div className="p-2.5 bg-amber-50 text-amber-900 text-[10px] rounded-xl border border-amber-200 leading-normal">
                <span className="font-bold block flex items-center text-amber-805">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mr-1 shrink-0" />
                  设计规范安全层预警：
                </span>
                <ul className="list-disc pl-4 mt-1 font-medium text-amber-700 space-y-0.5">
                  {activeImage.qualityIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 text-[10px] rounded-xl border border-emerald-150 font-semibold leading-relaxed">
                ✓ 智能印画检测通过：各槽位完美契合，文案安全，100% 打印保真。
              </div>
            )}

            {/* Manual reposition sliders sliders */}
            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-left">
              <h5 className="text-[9px] tracking-wider uppercase font-bold text-slate-450 flex items-center">
                <Sliders className="w-3.5 h-3.5 mr-1 text-slate-450" />
                产品槽位置物理微调
              </h5>

              <div className="grid grid-cols-2 gap-3 mt-1.5 text-[10.5px]">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>水平 X 轴修正</span>
                    <span className="font-mono font-bold text-blue-600">{currentXOffset > 0 ? `+${currentXOffset}` : currentXOffset}%</span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    value={currentXOffset}
                    onChange={(e) => setCurrentXOffset(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-150 rounded appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>垂直 Y 轴修正</span>
                    <span className="font-mono font-bold text-blue-600">{currentYOffset > 0 ? `+${currentYOffset}` : currentYOffset}%</span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="15"
                    value={currentYOffset}
                    onChange={(e) => setCurrentYOffset(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-150 rounded appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>产品图层缩放比例</span>
                  <span className="font-mono font-bold text-indigo-650">{Math.round(currentScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="155"
                  step="5"
                  value={currentScale * 100}
                  onChange={(e) => setCurrentScale(parseInt(e.target.value) / 100)}
                  className="w-full h-1 bg-slate-150 rounded appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>

            {/* Quality Standard list (checklist in specs) */}
            <div className="border-t border-slate-100 pt-3 text-[9px] text-slate-500 space-y-1 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-700 block mb-0.5">人工复排 checklist：</span>
              <div className="grid grid-cols-2 gap-1 text-slate-550 font-medium">
                <div>🎨 场景自然：AI增强</div>
                <div>🚫 反白溢出：不穿模</div>
                <div>🚫 安全遮挡：线圈完美</div>
                <div>✏️ 细节完整：不重绘</div>
              </div>
            </div>
          </div>

          {/* Quick decisions triggers */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 shrink-0">
            <button
              onClick={() => saveAuditChange("approved")}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-lg text-xs flex justify-center items-center gap-1 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 shrink-0" />
              <span>通过审核</span>
            </button>
            <button
              onClick={() => saveAuditChange("rejected")}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 font-bold text-white rounded-lg text-xs flex justify-center items-center gap-1 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>拦截退回</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
