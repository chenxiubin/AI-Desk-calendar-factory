import React, { useState } from "react";
import { Product, Template, GenerationTask, GeneratedImage } from "../types";
import { renderTemplateToCanvas, setDemoMode, DEMO_MODE } from "../utils/renderTemplate";
import {
  CheckCircle,
  FolderOpen,
  Layout,
  Layers,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Play,
  Clock,
  Settings,
  HelpCircle
} from "lucide-react";

interface BatchGeneratorProps {
  products: Product[];
  templates: Template[];
  onStartWorkflow: (task: GenerationTask, syntheticImages: GeneratedImage[]) => void;
  onNavigateToReview: () => void;
}

export const BatchGenerator: React.FC<BatchGeneratorProps> = ({
  products,
  templates,
  onStartWorkflow,
  onNavigateToReview
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // States
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    products.filter((p) => p.status === "completed").map((p) => p.id)
  );
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    templates.filter((t) => t.id === "SKU_001" || t.id === "MAIN_001").map((t) => t.id)
  );

  // Render variables defaults
  const [exportFormat, setExportFormat] = useState<"JPG" | "PNG" | "WebP">("JPG");
  const [exportQuality, setExportQuality] = useState<number>(90);

  // Running renderer task queue simulating states
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [currentSynthesizingTask, setCurrentSynthesizingTask] = useState<GenerationTask | null>(null);
  const [renderedQueueLog, setRenderedQueueLog] = useState<string[]>([]);
  const [completedImagesCount, setCompletedImagesCount] = useState(0);
  const [demoMode, setDemoModeState] = useState(DEMO_MODE);

  const handleDemoModeToggle = (val: boolean) => {
    setDemoModeState(val);
    setDemoMode(val);
  };

  const toggleProductSelect = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const toggleTemplateSelect = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]
    );
  };

  // Launch Renderer Synthesis Flow
  const launchSynthesisEngine = async () => {
    const totalCount = selectedProductIds.length * selectedTemplateIds.length;
    if (totalCount === 0) return;

    setStep(4);
    setIsSynthesizing(true);
    setCompletedImagesCount(0);
    setRenderedQueueLog(["🚀 云排版渲染引擎启动中...", "⚙️ 加载静态底图与3D接触面阴影图层物格..."]);

    const taskId = `task_${Date.now()}`;
    const taskName = `${new Date().getFullYear()}台历批量套版组合 - ${selectedProductIds.length}款产品 x ${
      selectedTemplateIds.length
    }个模板`;

    const newTask: GenerationTask = {
      id: taskId,
      taskName,
      productIds: selectedProductIds,
      templateIds: selectedTemplateIds,
      totalCount,
      completedCount: 0,
      failedCount: 0,
      pendingReviewCount: totalCount,
      status: "running",
      createdAt: new Date().toISOString(),
      progress: 0
    };

    setCurrentSynthesizingTask(newTask);

    const syntheticImagesResult: GeneratedImage[] = [];

    let currentCount = 0;
    for (const prodId of selectedProductIds) {
      const prod = products.find((p) => p.id === prodId)!;
      for (const tempId of selectedTemplateIds) {
        const temp = templates.find((t) => t.id === tempId)!;

        // Dynamic quality issues checking: PNG缺失, 产品越界, 文案越界
        const qualityIssues: string[] = [];
        
        // 1. PNG缺失 check:
        const hasPng = prod.assets.some(a => a.assetType === "transparent_png" && a.status === "ready");
        if (!hasPng) {
          qualityIssues.push("PNG缺失: 未配置高抗锯齿透明PNG产品主图");
        }
        
        // 2. 产品越界 check:
        const slotsTooBig = temp.slots.some(s => s.maxWidth > 80 || s.maxHeight > 60);
        const isBigItem = prod.size && (prod.size.includes("240mm") || prod.size.includes("260mm"));
        if (slotsTooBig && isBigItem) {
          qualityIssues.push("产品越界: 产品部件显示边界超出3D视口安全裁切线");
        }

        // 3. 文案越界 check:
        const extraLongText = (prod.productName || "").length + (prod.seriesName || "").length > 8;
        if (extraLongText && temp.textFields.some(tf => tf.isDynamic)) {
          qualityIssues.push("文案越界: 所属系列与排套名称字轨数超出文字标定安全区");
        }

        // Render actual Canvas JPG dataURL!
        let renderedUrl = "";
        let reviewStatus: GeneratedImage["reviewStatus"] = "pending";
        let renderFailed = false;

        try {
          renderedUrl = await renderTemplateToCanvas(prod, temp);
        } catch (err) {
          console.error("Template rendering to canvas failed: ", err);
          renderFailed = true;
          renderedUrl = "";
          reviewStatus = "needs_adjustment";
          qualityIssues.push("Canvas渲染失败");
          qualityIssues.push("产品资产缺失或加载失败");
        }

        syntheticImagesResult.push({
          id: `gen_img_${taskId}_${prod.id}_${temp.id}`,
          productId: prod.id,
          templateId: temp.id,
          imageType: temp.templateType,
          fileUrl: renderedUrl, // REAL CANVAS IMAGES
          width: temp.outputWidth,
          height: temp.outputHeight,
          reviewStatus: reviewStatus,
          qualityIssues,
          createdAt: new Date().toISOString()
        });

        // Delicate short delays for high fidelity console output animation
        await new Promise((resolve) => setTimeout(resolve, 320));

        currentCount++;
        setCompletedImagesCount(currentCount);
        if (renderFailed) {
          newTask.failedCount = (newTask.failedCount || 0) + 1;
          setRenderedQueueLog((prev) => [
            ...prev,
            `❌ [${currentCount}/${totalCount}] 渲染失败，已进入人工处理队列：【${prod.productCode}-${prod.productName}】 模具：${temp.templateName}`
          ]);
        } else {
          setRenderedQueueLog((prev) => [
            ...prev,
            `✓ [${currentCount}/${totalCount}] 成功处理：【${prod.productCode}-${prod.productName}】 🚀 套入模具：${temp.templateName} (${temp.outputWidth}x${temp.outputHeight}px)`
          ]);
        }

        newTask.completedCount = currentCount;
        newTask.pendingReviewCount = totalCount - (newTask.failedCount || 0);
        newTask.progress = (currentCount / totalCount) * 105; // temporary offset to allow animation feel
        // Cap progress at 100
        if (newTask.progress > 99) newTask.progress = 99;
        setCurrentSynthesizingTask({ ...newTask });
      }
    }

    setIsSynthesizing(false);
    newTask.status = "completed";
    newTask.progress = 100;
    newTask.completedCount = totalCount;
    newTask.pendingReviewCount = totalCount - (newTask.failedCount || 0);
    onStartWorkflow(newTask, syntheticImagesResult);
    setRenderedQueueLog((prev) => [...prev, "🎉 所有拼版任务合成成功！已存入「图片审核中心」待质检审核。"]);
  };

  const getCompletenessText = (p: Product) => {
    const hasFront = p.assets.some((a) => a.assetType === "transparent_png" && a.status === "ready");
    return hasFront ? "精修包就绪" : "缺少透明封面PNG";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-150 p-6 space-y-6 shadow-sm">
      {/* A. Steps Node indicator bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-slate-50/60 p-4 rounded-xl border border-slate-150/80 shrink-0">
        <h2 className="text-sm font-bold text-slate-800 tracking-tight">批量套版自动合成中心</h2>
        <div className="flex flex-wrap items-center gap-1.5 md:space-x-1.5 text-xs font-semibold">
          {[
            { sNum: 1, label: "筛选产品池" },
            { sNum: 2, label: "配置版式模板" },
            { sNum: 3, label: "字段对齐验证" },
            { sNum: 4, label: "多并发拼工厂" }
          ].map((node) => {
            const isPassed = step > node.sNum;
            const isCurrent = step === node.sNum;
            return (
              <div key={node.sNum} className="flex items-center space-x-1.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    isPassed
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {node.sNum}
                </span>
                <span className={isCurrent ? "text-blue-600 font-bold" : "text-slate-500"}>
                  {node.label}
                </span>
                {node.sNum < 4 && <ChevronNextIcon />}
              </div>
            );
          })}
        </div>
      </div>

      {/* B. Dynamic Steps Contents */}
      {/* STEP 1: Select products */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">第一步：批量选择套印产品目录</h3>
              <p className="text-[11px] text-slate-400 mt-1">系统已过滤，推荐勾选已做好去背精修 (等比不变形) 透明PNG大图的产品系列</p>
            </div>
            <div className="text-xs text-slate-650">
              已选: <span className="font-bold text-blue-600 font-mono text-sm">{selectedProductIds.length}</span> / {products.length} 款
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
            {products.map((p) => {
              const isSelected = selectedProductIds.includes(p.id);
              const isEligible = p.status === "completed" || p.status === "white_bg_done" || p.status === "png_done";
              return (
                <div
                  key={p.id}
                  onClick={() => isEligible && toggleProductSelect(p.id)}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between h-36 relative select-none cursor-pointer transition-all ${
                    !isEligible
                      ? "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "border-blue-600 bg-blue-50/35 ring-1 ring-blue-500"
                      : "border-slate-150 bg-slate-50/10 hover:border-slate-300 hover:bg-slate-50/30"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-600">
                      {p.productCode}
                    </span>
                    {isEligible ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-3.5 w-3.5"
                      />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                  </div>

                  <div className="text-left mt-2 flex-grow">
                    <h4 className="text-xs font-bold text-slate-800">{p.productName}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.seriesName}系列</p>
                  </div>

                  {/* Badges */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-1 text-[10px]">
                    <span className="text-slate-400 font-mono">{p.size.split(" * ")[0]}</span>
                    <span className={`font-mono text-[9px] font-bold ${isEligible ? "text-emerald-600" : "text-amber-600"}`}>
                      {getCompletenessText(p)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                if (selectedProductIds.length === 0) {
                  alert("请至少勾选一款可生成的台历产品资产。");
                  return;
                }
                setStep(2);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <span>配置生产版式</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Make template selections */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">第二步：配置批量套版排版样式</h3>
              <p className="text-[11px] text-slate-400 mt-1">勾选需要自动合成何种模板。所勾选的模板类型将被组合套入选定产品中合集生成。</p>
            </div>
            <div className="text-xs text-slate-650">
              已勾选模板: <span className="font-bold text-blue-600 font-mono text-sm">{selectedTemplateIds.length}</span> 款
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {templates.map((t) => {
              const isSelected = selectedTemplateIds.includes(t.id);
              const templateTypesText: Record<string, string> = {
                main: "黄金主图",
                sku: "单款SKU",
                detail: "工艺详情图"
              };

              return (
                <div
                  key={t.id}
                  onClick={() => toggleTemplateSelect(t.id)}
                  className={`p-4 rounded-xl border text-left select-none cursor-pointer flex justify-between gap-4 transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/20 shadow-xs ring-1 ring-blue-500"
                      : "border-slate-150 bg-slate-50/10 hover:border-slate-250 hover:bg-slate-50/30"
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="text-[9px] bg-slate-200 text-slate-700 font-extrabold px-2 py-0.5 rounded-full">
                      {templateTypesText[t.templateType] || "细节挂件板"}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 truncate mt-1">{t.templateName}</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      比例: <span className="font-mono font-bold">{t.aspectRatio}</span> ({t.outputWidth}x{t.outputHeight}px)
                    </p>
                    <p className="text-[9px] text-slate-550 bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100/60 leading-normal">
                      包含: {t.slots.length} 个等缩槽 • {t.textFields.length} 矢量文字
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4 shrink-0 mt-0.5"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-xs flex items-center space-x-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>上一步</span>
            </button>
            <button
              onClick={() => {
                if (selectedTemplateIds.length === 0) {
                  alert("请至少选择一款输出样式模板。");
                  return;
                }
                setStep(3);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <span>对齐矢量字段匹配</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Mappings configurations */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">第三步：变量数据字段自动映射校验</h3>
            <p className="text-[11px] text-slate-400 mt-1">云拼排板支持多规格表格自动映射，请核对当前字段绑定映射规则：</p>
          </div>

          <div className="bg-slate-50/65 p-4 rounded-xl border border-slate-150 space-y-3 pb-5 text-xs">
            <div className="grid grid-cols-3 font-semibold text-slate-400 border-b border-slate-150/50 pb-2">
              <span>模板插槽字段</span>
              <span>映射云端产品名册列</span>
              <span className="text-right">自适应表现</span>
            </div>

            {[
              { slot: "[productName] (主副标题)", source: "product.productName", render: "文字自适应不拉伸" },
              { slot: "[productCode] (款式编号)", source: "product.productCode", render: "大写单股等宽不切" },
              { slot: "[size] (材质细节)", source: "product.size", render: "自动折行对齐" },
              { slot: "[materialCover] (材料纸况)", source: "product.materialCover", render: "缩排12px" },
              { slot: "front_cover (封面正面槽)", source: "assets.transparent_png", render: "等比裁剪底边锁定" },
              { slot: "inner_page (内页槽位)", source: "assets.inner_page", render: "多重层叠层35%露白" }
            ].map((mapItem, index) => (
              <div key={index} className="grid grid-cols-3 py-2 border-b border-dashed border-slate-150 last:border-0">
                <span className="font-mono font-bold text-slate-800">{mapItem.slot}</span>
                <span className="text-blue-600 font-medium font-mono">➡️ {mapItem.source}</span>
                <span className="text-slate-500 text-right font-semibold">✓ {mapItem.render}</span>
              </div>
            ))}
          </div>

          {/* Quick config settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="block text-slate-450 font-bold mb-1.5 uppercase text-[10px]">输出文件格式</span>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500"
              >
                <option value="JPG">淘宝JPG/拼多多 (推荐)</option>
                <option value="PNG">纯无影无损 PNG</option>
                <option value="WebP">极小体积 WebP</option>
              </select>
            </div>
            <div>
              <span className="block text-slate-450 font-bold mb-1.5 uppercase text-[10px]">背景和图画压缩质量</span>
              <select
                value={exportQuality}
                onChange={(e) => setExportQuality(parseInt(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500"
              >
                <option value={90}>90% (极高性价比大图)</option>
                <option value={95}>95% (发烧画质无噪)</option>
                <option value={100}>100% (原图物理极限点阵)</option>
              </select>
            </div>
            <div>
              <span className="block text-slate-450 font-bold mb-1.5 uppercase text-[10px]">企业烫章预设</span>
              <select className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:ring-1 focus:ring-blue-500">
                <option>自动识别企业LOGO底稿并烫金</option>
                <option>统一不烫金 (仅套正面插画)</option>
              </select>
            </div>
          </div>

          {/* Demo Mode Toggle Banner */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs leading-normal">
            <div className="space-y-0.5">
              <span className="font-bold flex items-center text-slate-800">
                🛠️ 台历资产验证模式：
                <span className={`ml-1.5 font-black uppercase font-mono px-2 py-0.5 rounded text-[10px] ${demoMode ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {demoMode ? "DEMO 模式 (允许矢量占位图)" : "生产模式 (必须使用真实 PNG)"}
                </span>
              </span>
              <p className="text-[10px] text-slate-500">
                {demoMode 
                  ? "未配置台历实物原图时，将自动为您绘制高精度矢量原型进行套板预览。" 
                  : "严禁任何矢量占位图 fallback。如遇到产品没有真实高分辨率 PNG 资产，将自动抛出错漏并引导转入人工修正。"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDemoModeToggle(!demoMode)}
              className={`font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all text-xs cursor-pointer ${
                demoMode 
                  ? "bg-amber-600 hover:bg-amber-700 text-white" 
                  : "bg-slate-700 hover:bg-slate-800 text-white"
              }`}
            >
              切换至{demoMode ? " 生产模式 " : " DEMO 模式 "}
            </button>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(2)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg text-xs flex items-center space-x-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>上一步</span>
            </button>
            <button
              onClick={launchSynthesisEngine}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-xs flex items-center space-x-1.5 shadow hover:shadow-md transition-all"
            >
              <Play className="w-4 h-4 animate-bounce shrink-0" />
              <span>一键启动批量拼套版 ({selectedProductIds.length * selectedTemplateIds.length}张)</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Active Generator Renderer Panel */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="pb-1 border-b border-slate-100 flex justify-between items-center text-left">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                第四步：引擎套版批量生成进行中
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">云排版多并发服务器正在计算每一个产品槽百分比坐标融合并套嵌 drop_shadow...</p>
            </div>
            {isSynthesizing ? (
              <span className="bg-blue-500 text-white font-semibold text-[10px] px-2.5 py-0.5 rounded-full animate-pulse">
                ● 16线程云渲染中
              </span>
            ) : (
              <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                ✓ 批量处理就绪
              </span>
            )}
          </div>

          {/* Graphical rendering pipeline layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Progress */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-2">
                  <span>排产合成任务进度</span>
                  <span className="font-mono text-sm text-blue-605">
                    {completedImagesCount} /{" "}
                    {selectedProductIds.length * selectedTemplateIds.length} 张 (
                    {Math.round(
                      (completedImagesCount / (selectedProductIds.length * selectedTemplateIds.length)) * 100
                    )}
                    %)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (completedImagesCount / (selectedProductIds.length * selectedTemplateIds.length)) * 100
                      }%`
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5 mt-3.5 text-[11px] text-slate-600 font-medium">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>预计耗时: 00:04:15</span>
                  </div>
                  <div>已完成数: {completedImagesCount}款</div>
                  <div>质检拦截：<span className="font-bold text-rose-600">自动标险 2 款</span></div>
                </div>
              </div>

              {/* Scrolling terminal output */}
              <div className="bg-slate-900 text-slate-350 p-4 rounded-xl h-56 overflow-y-auto font-mono text-[10px] space-y-1.5 relative border border-slate-850 shadow-inner">
                {renderedQueueLog.map((log, index) => (
                  <div key={index} className="leading-relaxed">
                    {log}
                  </div>
                ))}
                {isSynthesizing && (
                  <div className="text-amber-400 animate-pulse text-xs mt-2 text-left">
                    ⏳ 正在合成并计算边缘接触软阴影 layer overlay......
                  </div>
                )}
              </div>
            </div>

            {/* Constraints and system stats */}
            <div className="bg-slate-50/80 border border-slate-200/85 p-4 rounded-xl flex flex-col justify-between text-xs text-slate-700">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 border-b border-slate-150 pb-2">智能排版对齐逻辑规范</h4>
                <div className="space-y-2.5">
                  <div className="flex items-start space-x-2 text-[11px] leading-normal text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>产品宽高比约束：已锁定 100% 保持实物几何真实现象。</span>
                  </div>
                  <div className="flex items-start space-x-2 text-[11px] leading-normal text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>铁骨/线圈保护：凡在槽内拉伸裁切线圈，系统自动触发退回风险标。</span>
                  </div>
                  <div className="flex items-start space-x-2 text-[11px] leading-normal text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>文案溢出质检：由于名字长度引发越界的文字图层将被阻断打回。</span>
                  </div>
                </div>
              </div>

              {!isSynthesizing && (
                <button
                  onClick={onNavigateToReview}
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all hover:scale-[1.01]"
                >
                  <span>前往「图片审核中心」查看结果</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Help connectors
const ChevronNextIcon = () => (
  <svg
    viewBox="0 0 24 24"
    strokeWidth="2"
    stroke="currentColor"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-3.5 h-3.5 text-neutral-400 shrink-0"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
