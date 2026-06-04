import React, { useState } from "react";
import { GeneratedImage, Product, Template } from "../types";
import { VisualCalendar } from "./VisualCalendar";
import { renderTemplateToCanvas } from "../utils/renderTemplate";
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
        <div className="w-full lg:w-80 bg-white border border-slate-150 rounded-2xl p-5 overflow-y-auto shrink-0 flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3.5 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-slate-800 tracking-tight">精修矢量位精调台</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">通过人工拖拽对准铁圈边框位置</p>
              </div>
              <span className="text-[10px] bg-slate-100 font-mono font-black px-2.5 py-1 rounded-lg text-slate-600">
                {activeProduct.productCode}
              </span>
            </div>

            {/* Sandbox single mock item layout */}
            <div
              className={`h-48 w-full rounded-xl border border-slate-150 relative flex items-center justify-center overflow-hidden p-2 bg-slate-100/50`}
            >
              {renderedPreviewUrl ? (
                <img src={renderedPreviewUrl} className="max-w-full max-h-full object-contain rounded shadow-sm" alt="Live Canvas Render" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-405 space-y-2 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                  <span>像素微移合成中...</span>
                </div>
              )}

              {/* Variable overlay text demo */}
              <div className="absolute bottom-1.5 right-1.5 text-[8.5px] font-mono text-slate-200 select-none bg-slate-900/70 backdrop-blur-xs px-2 py-0.5 rounded-md">
                实时图层拼合检视: {activeProduct.productName}
              </div>
            </div>

            {/* Quality issue warn lists */}
            {activeImage.qualityIssues.length > 0 ? (
              <div className="p-3 bg-amber-50/60 text-amber-900 text-[10px] rounded-xl border border-amber-200/80 leading-normal">
                <span className="font-bold block flex items-center text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mr-1 shrink-0" />
                  云渲染物理安全层报警：
                </span>
                <ul className="list-disc pl-4 mt-1.5 space-y-1 font-medium text-amber-700">
                  {activeImage.qualityIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3 bg-emerald-55/40 text-emerald-800 text-[10px] rounded-xl border border-emerald-150 font-semibold leading-relaxed">
                ✓ 智能物理检测完毕：该台历在模板中线圈完美契合，文案无重叠，适合100%全保真打印。
              </div>
            )}

            {/* Manual reposition sliders sliders */}
            <div className="space-y-4 border-t border-slate-100 pt-4 flex-1 flex flex-col min-h-0 text-left text-xs">
              <h5 className="text-[10px] tracking-wider uppercase font-bold text-slate-400 block flex items-center">
                <Sliders className="w-3.5 h-3.5 mr-1.5 text-slate-450" />
                产品槽相对坐标/比例物理修饰
              </h5>

              {/* Adjust horizontal X relative Offset Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-650">
                  <span>水平位置 X 轴修正偏移</span>
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

              {/* Adjust vertical Y relative Offset Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-650">
                  <span>垂直高度 Y 轴修切偏移</span>
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

              {/* Adjust scale sizing slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-650">
                  <span>产品主体大小缩放因子</span>
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
            <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-500 space-y-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/80">
              <span className="font-bold text-slate-700 block mb-1">人工复核规程 checklist：</span>
              <div className="grid grid-cols-2 gap-2 text-slate-550 font-medium">
                <div>🎨 产品清晰：一致</div>
                <div>📏 比例正常：防畸变</div>
                <div>🚫 线圈防遮：查coil孔</div>
                <div>✏️ 文案完整：防裁切</div>
              </div>
            </div>
          </div>

          {/* Quick decisions triggers */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 shrink-0">
            <button
              onClick={() => saveAuditChange("approved")}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-lg text-xs flex justify-center items-center gap-1.5 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 shrink-0" />
              <span>通过审核</span>
            </button>
            <button
              onClick={() => saveAuditChange("rejected")}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 font-bold text-white rounded-lg text-xs flex justify-center items-center gap-1.5 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
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
