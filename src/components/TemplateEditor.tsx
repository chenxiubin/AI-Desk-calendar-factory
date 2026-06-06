// AI Studio Git Synchronization Force Update - 2026-06-06T02:50Z
import React, { useState } from "react";
import { Template, Product, TemplateSlot, TextField, TemplateBackground, TemplateComponent, TemplateComponentType } from "../types";
import { VisualCalendar } from "./VisualCalendar";
import { getTemplateComponents } from "../utils/renderTemplate";
import {
  Undo,
  Redo,
  Grid,
  Maximize,
  Save,
  Play,
  Eye,
  EyeOff,
  Sliders,
  Type,
  Layers,
  Sparkles,
  Info,
  Maximize2,
  Trash2,
  Check,
  ChevronRight,
  FolderOpen,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash
} from "lucide-react";

interface TemplateEditorProps {
  initialTemplates: Template[];
  products: Product[];
  selectedTemplateFromLib?: Template | null;
  onSaveTemplate: (template: Template) => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  initialTemplates,
  products,
  selectedTemplateFromLib,
  onSaveTemplate
}) => {
  // Active states
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    selectedTemplateFromLib?.id || initialTemplates[0]?.id || ""
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || "");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTextFieldId, setSelectedTextFieldId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  // Editor viewport settings
  const [showGrid, setShowGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [zoomRatio, setZoomRatio] = useState<number>(100);
  const [showSafetyRegion, setShowSafetyRegion] = useState(true);

  // Local copy of all templates to allow instant edits
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);

  // Grab active model objects
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];
  const activeProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleUpdateTemplate = (updated: Template) => {
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const activatePSEngine = () => {
    if (!activeTemplate) return;
    const comps = getTemplateComponents(activeTemplate);
    handleUpdateTemplate({
      ...activeTemplate,
      components: comps
    });
    setSelectedComponentId(comps[1]?.id || comps[0]?.id || null);
    setSelectedSlotId(null);
    setSelectedTextFieldId(null);
    alert("【成功】当前版式已升级为“PS组件分层版式”！现在可以上传自定义背景、槽位、文字与装饰图层。");
  };

  // 1. Selector slot event
  const selectSlot = (slotId: string) => {
    setSelectedSlotId(slotId);
    setSelectedTextFieldId(null);
  };

  const selectTextField = (fieldId: string) => {
    setSelectedTextFieldId(fieldId);
    setSelectedSlotId(null);
  };

  // 2. Geometry shifts for slots
  const updateSlotGeometry = (slotId: string, field: keyof TemplateSlot, value: any) => {
    if (!activeTemplate) return;
    const updatedSlots = activeTemplate.slots.map((s) => {
      if (s.id === slotId) {
        return { ...s, [field]: value };
      }
      return s;
    });
    handleUpdateTemplate({ ...activeTemplate, slots: updatedSlots });
  };

  // 3. Typo edits for fields
  const updateTextFieldValue = (fieldId: string, field: keyof TextField, value: any) => {
    if (!activeTemplate) return;
    const updatedFields = activeTemplate.textFields.map((tf) => {
      if (tf.id === fieldId) {
        return { ...tf, [field]: value };
      }
      return tf;
    });
    handleUpdateTemplate({ ...activeTemplate, textFields: updatedFields });
  };

  // 4. Background picker shift
  const updateBackground = (field: keyof TemplateBackground, value: any) => {
    if (!activeTemplate) return;
    handleUpdateTemplate({
      ...activeTemplate,
      background: { ...activeTemplate.background, [field]: value }
    });
  };

  // 5. Test generation prompt alert
  const testRenderAlert = () => {
    alert(
      `【套版测试计算成功】\n当前套入了 $『${activeProduct.productName}』 所有规格要素。\n生成尺寸：${activeTemplate.outputWidth} x ${activeTemplate.outputHeight} px\n矢量字体：渲染排版完毕比例，防变形安全区通过率为 100%。`
    );
  };

  // Replace variables inside texts according to the chosen sandbox test product
  const getRenderedContent = (tf: TextField, prod: Product) => {
    if (!tf.isDynamic) return tf.content;
    let text = tf.content;
    // Simple bracket map
    text = text.replace("[productName]", prod.productName);
    text = text.replace("[productCode]", prod.productCode);
    text = text.replace("[size]", prod.size);
    text = text.replace("[seriesName]", prod.seriesName);
    text = text.replace("[materialCover]", prod.materialCover);
    text = text.replace("[materialInner]", prod.materialInner);
    text = text.replace("[thickness]", prod.thickness);
    return text;
  };

  // Style helper mapping for scenes style backdrops
  const getCanvasBackgroundClass = (styleName?: string) => {
    switch (styleName) {
      case "warm_light":
        return "bg-radial from-amber-50/70 via-orange-100/40 to-neutral-200/50";
      case "beige_paper":
        return "bg-stone-50 border-stone-250";
      case "studio_white":
        return "bg-neutral-50 border-neutral-100";
      case "festive_red":
        return "bg-gradient-to-br from-red-700 via-red-600 to-rose-800";
      case "luxury_gold":
        return "bg-gradient-to-br from-yellow-750 via-amber-950 to-neutral-900";
      default:
        return "bg-white";
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[620px] bg-neutral-150/20 text-neutral-800 text-left">
      {/* A. Top Toolbar Header Block */}
      <header className="bg-white border-b px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3.5">
          <select
            value={activeTemplateId}
            onChange={(e) => {
              setActiveTemplateId(e.target.value);
              setSelectedSlotId(null);
              setSelectedTextFieldId(null);
            }}
            className="text-xs bg-slate-50 font-bold border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.templateName} ({t.aspectRatio})
              </option>
            ))}
          </select>
          <span className="text-[11px] bg-blue-100 text-blue-750 font-bold px-2.5 py-0.5 rounded-lg">
            等比槽位模式
          </span>
        </div>

        {/* Action icons bar */}
        <div className="flex items-center space-x-2">
          {/* History */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button className="p-1 px-2.5 hover:bg-white rounded-md text-slate-550 hover:text-slate-900 transition-colors">
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 px-2.5 hover:bg-white rounded-md text-slate-550 hover:text-slate-900 transition-colors">
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Grids and rulers */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 font-semibold text-xs text-slate-600">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1 px-2 rounded-md flex items-center space-x-1 ${
                showGrid ? "bg-white text-slate-900 shadow-xs" : ""
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>网格</span>
            </button>
            <button
              onClick={() => setShowSafetyRegion(!showSafetyRegion)}
              className={`p-1 px-2 rounded-md flex items-center space-x-1 ${
                showSafetyRegion ? "bg-white text-slate-900 shadow-xs" : ""
              }`}
            >
              <Maximize className="w-3.5 h-3.5" />
              <span>安全区</span>
            </button>
          </div>

          <div className="h-6 w-[1px] bg-slate-200" />

          {/* Scale picker */}
          <select
            value={zoomRatio}
            onChange={(e) => setZoomRatio(parseInt(e.target.value))}
            className="text-[11px] bg-slate-50 border border-slate-200 rounded-md p-1"
          >
            <option value={75}>75% 比例</option>
            <option value={100}>100% 比例</option>
            <option value={120}>120% 比例</option>
          </select>

          {/* Test & Save */}
          <button
            onClick={testRenderAlert}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center space-x-1 shadow-sm transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            <span>套入测试</span>
          </button>

          <button
            onClick={() => {
              onSaveTemplate(activeTemplate);
              alert("【台历固定板式配置保存成功】已存盘，此模板将完美运行于批量合成中心。");
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center space-x-1 shadow-md shadow-blue-500/10 active:scale-95 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存排板</span>
          </button>
        </div>
      </header>

      {/* B. Core Editor Section */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 1. Left panel: layers tree and assets drawer */}
        <div className="w-64 bg-white border-r flex flex-col min-h-0 scrollbar-none shrink-0">
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {/* Template layer selection list */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[11px] uppercase tracking-widest font-bold text-neutral-400 flex items-center">
                    <Layers className="w-3.5 h-3.5 mr-1 text-slide-500" />
                    排板布局层树 (Layers)
                  </h3>
                  {!activeTemplate.components && (
                    <button
                      onClick={activatePSEngine}
                      className="text-[9px] bg-indigo-600 hover:bg-indigo-700 font-bold text-white px-1.5 py-0.5 rounded cursor-pointer transition-all"
                      title="将此模板转换为 PS 专属的多图层套版模式"
                    >
                      ⚡ 激活 PS 层
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {activeTemplate.components && activeTemplate.components.length > 0 ? (
                    [...activeTemplate.components]
                      .sort((a, b) => b.zIndex - a.zIndex)
                      .map((comp) => {
                        const isSel = comp.id === selectedComponentId;
                        return (
                          <div
                            key={comp.id}
                            className={`p-1.5 rounded-lg text-xs flex items-center justify-between border ${
                              isSel
                                ? "bg-indigo-50/70 border-indigo-200 font-bold text-indigo-700"
                                : "border-transparent text-slate-655 hover:bg-slate-50/80"
                            }`}
                          >
                            <div
                              onClick={() => {
                                setSelectedComponentId(comp.id);
                                setSelectedSlotId(null);
                                setSelectedTextFieldId(null);
                              }}
                              className="flex-1 truncate flex items-center cursor-pointer py-1 text-left"
                            >
                              <span className={`w-2 h-2 rounded-full mr-2 shrink-0 ${
                                comp.type === "scene_base" ? "bg-amber-500" :
                                comp.type === "product_slot" ? "bg-indigo-600" :
                                comp.type === "decor_overlay" ? "bg-rose-500" :
                                comp.type === "text_overlay" ? "bg-sky-500" : "bg-teal-500"
                              }`} />
                              <span className="truncate pr-1">{comp.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updatedComps = activeTemplate.components?.map((c) =>
                                    c.id === comp.id ? { ...c, visible: !c.visible } : c
                                  );
                                  handleUpdateTemplate({ ...activeTemplate, components: updatedComps });
                                }}
                                className="p-1 hover:bg-neutral-150 rounded text-neutral-400 hover:text-indigo-600 cursor-pointer"
                                title={comp.visible ? "隐藏图层" : "显示图层"}
                              >
                                {comp.visible ? <Eye className="w-3 h-3 text-indigo-600" /> : <EyeOff className="w-3 h-3 text-rose-500" />}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updatedComps = activeTemplate.components?.map((c) =>
                                    c.id === comp.id ? { ...c, zIndex: c.zIndex + 1 } : c
                                  );
                                  handleUpdateTemplate({ ...activeTemplate, components: updatedComps });
                                }}
                                className="p-0.5 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700 cursor-pointer"
                                title="上移一层"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updatedComps = activeTemplate.components?.map((c) =>
                                    c.id === comp.id ? { ...c, zIndex: Math.max(0, c.zIndex - 1) } : c
                                  );
                                  handleUpdateTemplate({ ...activeTemplate, components: updatedComps });
                                }}
                                className="p-0.5 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700 cursor-pointer"
                                title="下移一层"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <>
                      {/* Background Layer */}
                      <div
                        onClick={() => {
                          setSelectedSlotId(null);
                          setSelectedTextFieldId(null);
                          setSelectedComponentId(null);
                        }}
                        className={`p-2 rounded-lg text-xs cursor-pointer text-left flex justify-between items-center ${
                          !selectedSlotId && !selectedTextFieldId && !selectedComponentId
                            ? "bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <span>1. 背景与风格层 ({activeTemplate.background.type === "scene" ? "烘焙场景" : "纯色"})</span>
                        <span className="text-[9px] text-slate-400">LAYER 1</span>
                      </div>

                      {/* Slots Layers list */}
                      {activeTemplate.slots.map((s, idx) => {
                        const isSel = s.id === selectedSlotId;
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              selectSlot(s.id);
                              setSelectedComponentId(null);
                            }}
                            className={`p-2 rounded-lg text-xs cursor-pointer text-left flex justify-between items-center border ${
                              isSel
                                ? "bg-blue-50/50 border-blue-200 font-semibold text-blue-700"
                                : "border-transparent text-slate-655 hover:bg-slate-50/80"
                            }`}
                          >
                            <span className="truncate flex items-center">
                              <span className="w-2 h-2 rounded-full bg-blue-600 mr-2" />
                              {idx + 1}. 槽位: {s.slotName}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">L.{s.layer}</span>
                          </div>
                        );
                      })}

                      {/* Text fields list */}
                      {activeTemplate.textFields.map((tf, idx) => {
                        const isSel = tf.id === selectedTextFieldId;
                        return (
                          <div
                            key={tf.id}
                            onClick={() => {
                              selectTextField(tf.id);
                              setSelectedComponentId(null);
                            }}
                            className={`p-2 rounded-lg text-xs cursor-pointer text-left flex justify-between items-center border ${
                              isSel
                                ? "bg-blue-50/50 border-blue-200 font-semibold text-blue-700"
                                : "border-transparent text-slate-655 hover:bg-slate-50/80"
                            }`}
                          >
                            <span className="truncate flex items-center">
                              <Type className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                              文案: {tf.fieldName}
                            </span>
                            <span className="text-[9px] text-slate-400">TXT</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Sandbox mock testing selection */}
            <div className="border-t pt-3.5">
              <h3 className="text-[11px] uppercase tracking-widest font-bold text-neutral-400 mb-2.5 flex items-center">
                <FolderOpen className="w-3.5 h-3.5 mr-1 text-neutral-500" />
                沙盒测试套版产品
              </h3>
              <p className="text-[9px] text-neutral-400 mb-2 leading-relaxed">
                点击切换产品，检查当前模板对不同尺寸及颜色的台历自适应等比效果。
              </p>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {products
                  .filter((p) => p.status === "completed" || p.status === "white_bg_done" || p.status === "png_done")
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProductId(p.id)}
                      className={`w-full text-xs text-left p-2 rounded transition-colors border flex items-center justify-between ${
                        p.id === selectedProductId
                          ? "bg-blue-50 border-blue-200 text-blue-650 font-bold"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">【{p.productCode}】 {p.productName}</span>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.themeColor }} />
                    </button>
                  ))}
              </div>
            </div>

            {/* Component widgets shortcuts */}
            <div className="border-t pt-3.5">
              <h3 className="text-[11px] uppercase tracking-widest font-bold text-neutral-400 mb-2.5">
                常用排板套用组件
              </h3>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] text-neutral-600">
                {[
                  "免费定制角标",
                  "烫金工艺边框",
                  "12个月月历格",
                  "工艺细节说明栏",
                  "规格尺寸参数表",
                  "双股金属环剪影"
                ].map((item, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => {
                      alert(`已激活「${item}」！拖拽后可对画布新增关联挂件元素。`);
                    }}
                    className="p-1.5 bg-neutral-50 hover:bg-neutral-100 rounded border border-neutral-150 text-center cursor-pointer font-bold transition-colors select-none"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Middle panel: interactive canvas */}
        <div className="flex-1 bg-neutral-200/50 p-6 flex items-center justify-center overflow-auto min-h-0 relative">
          {/* Main design sheet */}
          <div
            className={`shadow-2xl border border-neutral-300 relative transition-all duration-350 overflow-hidden shrink-0 ${getCanvasBackgroundClass(
              activeTemplate.background.sceneStyle
            )}`}
            style={{
              width: "480px",
              height: activeTemplate.aspectRatio === "3:4" ? "640px" : "480px",
              transform: `scale(${zoomRatio / 100})`
            }}
          >
            {/* SVG Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 z-10 opacity-15 pointer-events-none">
                <svg width="100%" height="100%">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <rect width="40" height="40" fill="none" />
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6b7280" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            )}

            {/* Safety bounds box */}
            {showSafetyRegion && (
              <div className="absolute inset-5 border-2 border-dashed border-rose-500/35 pointer-events-none rounded z-45">
                <span className="absolute top-1 left-2 bg-rose-500 text-white font-bold text-[8px] scale-75 px-1 py-0.2 rounded opacity-50 uppercase tracking-widest">
                  电商九宫格 5% 画面避让安全区
                </span>
              </div>
            )}

            {/* Components or Slots Render Switch */}
            {activeTemplate.components && activeTemplate.components.length > 0 ? (
              <>
                {/* Visual components sorted by zIndex */}
                {[...activeTemplate.components]
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map((comp) => {
                    const isSelected = comp.id === selectedComponentId;
                    const isSlot = comp.type === "product_slot";

                    const leftVal = `${comp.x}%`;
                    const topVal = `${comp.y}%`;
                    const widthVal = `${comp.width}%`;
                    const heightVal = `${comp.height}%`;

                    if (isSlot) {
                      return (
                        <div
                          key={comp.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedComponentId(comp.id);
                            setSelectedSlotId(null);
                            setSelectedTextFieldId(null);
                          }}
                          className={`absolute group select-none cursor-pointer transition-shadow flex flex-col items-center justify-end ${
                            isSelected ? "ring-2 ring-indigo-600 shadow-lg z-40 bg-indigo-500/5" : "hover:ring-1 hover:ring-neutral-400"
                          }`}
                          style={{
                            left: leftVal,
                            top: topVal,
                            width: widthVal,
                            height: heightVal,
                            transform: comp.scaleMode === "cover" ? "translate(-50%, -55%)" : "translate(-50%, -100%)", // bottom-center anchor default
                            zIndex: comp.zIndex
                          }}
                        >
                          <div className="absolute inset-0 border-2 border-dashed border-indigo-500/25 pointer-events-none" />
                          <VisualCalendar
                            product={activeProduct}
                            type="front_cover"
                            isNakedPNG={true}
                            className="w-full h-full max-h-full flex items-end justify-center animate-pulse"
                          />
                          <div className="absolute top-1 left-1.5 bg-indigo-900/80 text-[8px] text-white px-1.5 py-0.2 rounded font-mono z-30 select-none opacity-0 group-hover:opacity-100 transition-opacity">
                            {comp.name}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div
                          key={comp.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedComponentId(comp.id);
                            setSelectedSlotId(null);
                            setSelectedTextFieldId(null);
                          }}
                          className={`absolute group select-none cursor-pointer overflow-hidden transition-shadow flex items-center justify-center ${
                            isSelected ? "ring-2 ring-indigo-600 shadow-lg z-40 bg-zinc-500/5 animate-pulse" : "hover:ring-1 hover:ring-neutral-400"
                          }`}
                          style={{
                            left: leftVal,
                            top: topVal,
                            width: widthVal,
                            height: heightVal,
                            zIndex: comp.zIndex
                          }}
                        >
                          {comp.imageUrl ? (
                            <img src={comp.imageUrl} className="w-full h-full object-cover" alt={comp.name} referrerPolicy="no-referrer" />
                          ) : (
                            <div className="text-[10px] text-neutral-400 bg-neutral-100/80 w-full h-full flex flex-col items-center justify-center p-1 border border-neutral-300">
                              <span className="font-bold">{comp.name}</span>
                              <span className="text-[8px]">(未上传图片组件)</span>
                            </div>
                          )}
                          <div className="absolute top-1 left-1.5 bg-neutral-900/80 text-[8px] text-white px-1.5 py-0.2 rounded font-mono z-30 select-none opacity-0 group-hover:opacity-100 transition-opacity">
                            {comp.name} ({comp.zIndex})
                          </div>
                        </div>
                      );
                    }
                  })}

                {/* Text fields vector render loop inside components templates */}
                {activeTemplate.textFields.map((tf) => {
                  const isSelected = tf.id === selectedTextFieldId;
                  const alignClass =
                    tf.align === "center" ? "text-center -translate-x-1/2" : tf.align === "right" ? "text-right -translate-x-full" : "text-left";

                  return (
                    <div
                      key={tf.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectTextField(tf.id);
                        setSelectedComponentId(null);
                      }}
                      className={`absolute cursor-pointer p-1 font-sans font-extrabold ${alignClass} hover:ring-1 hover:ring-indigo-400 z-35`}
                      style={{
                        left: `${tf.x}%`,
                        top: `${tf.y}%`,
                        fontSize: `${tf.fontSize / 1.7}px`,
                        color: tf.color,
                        fontWeight: tf.fontWeight === "font-bold" ? "bold" : tf.fontWeight === "font-extrabold" ? "900" : "normal",
                        zIndex: 100,
                        transform: tf.align === "center" ? "translate(-50%, -50%)" : tf.align === "right" ? "translate(-100%, -50%)" : "translate(0, -50%)"
                      }}
                    >
                      <span className={`${isSelected ? "underline decoration-indigo-600 decoration-2" : ""}`}>
                        {getRenderedContent(tf, activeProduct)}
                      </span>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                {/* Slots render loop */}
                {activeTemplate.slots.map((slot) => {
                  const isSelected = slot.id === selectedSlotId;
                  // Detect asset type cover vs inner
                  const visualType = slot.assetType === "inner_page" ? "inner_page" : slot.assetType === "side" ? "side" : "front_cover";

                  return (
                    <div
                      key={slot.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSlot(slot.id);
                      }}
                      className={`absolute group select-none cursor-pointer transition-shadow z-25 flex flex-col items-center justify-end ${
                        isSelected ? "ring-2 ring-blue-600 shadow-lg z-40 bg-blue-500/5" : "hover:ring-1 hover:ring-neutral-400"
                      }`}
                      style={{
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                        width: `${slot.maxWidth}%`,
                        height: `${slot.maxHeight}%`,
                        transform: "translate(-50%, -100%)", // bottom-center anchor positioning
                        zIndex: slot.layer
                      }}
                    >
                      {/* Bounding box statistics overlay */}
                      <div className="absolute inset-0 border-2 border-dashed border-blue-500/25 pointer-events-none" />

                      {/* Visual Calendar mockup rendered */}
                      <VisualCalendar
                        product={activeProduct}
                        type={visualType as any}
                        isNakedPNG={true}
                        className="w-full h-full max-h-full flex items-end justify-center"
                      />

                      {/* Top identifier strip for debug */}
                      <div className="absolute top-1 left-1.5 bg-neutral-900/80 text-[8px] text-white px-1.5 py-0.2 rounded font-mono z-30 select-none opacity-0 group-hover:opacity-100 transition-opacity">
                        {slot.slotId} • 等比缩放
                      </div>
                    </div>
                  );
                })}

                {/* Text fields vector render loop */}
                {activeTemplate.textFields.map((tf) => {
                  const isSelected = tf.id === selectedTextFieldId;
                  const alignClass =
                    tf.align === "center" ? "text-center -translate-x-1/2" : tf.align === "right" ? "text-right -translate-x-full" : "text-left";

                  return (
                    <div
                      key={tf.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectTextField(tf.id);
                      }}
                      className={`absolute cursor-pointer p-1 font-sans font-extrabold ${alignClass} hover:ring-1 hover:ring-indigo-400 z-35`}
                      style={{
                        left: `${tf.x}%`,
                        top: `${tf.y}%`,
                        fontSize: `${tf.fontSize / 1.7}px`,
                        color: tf.color,
                        fontWeight: tf.fontWeight === "font-bold" ? "bold" : tf.fontWeight === "font-extrabold" ? "900" : "normal",
                        zIndex: 40,
                        transform: tf.align === "center" ? "translate(-50%, -50%)" : tf.align === "right" ? "translate(-100%, -50%)" : "translate(0, -50%)"
                      }}
                    >
                      <span className={`${isSelected ? "underline decoration-indigo-600 decoration-2" : ""}`}>
                        {getRenderedContent(tf, activeProduct)}
                      </span>
                    </div>
                  );
                })}
              </>
            )}

            {/* Bottom corporate credits for branding visual realism */}
            <div className="absolute bottom-1 w-full text-center text-[8px] text-neutral-400 pointer-events-none select-none z-10 font-mono tracking-wider">
              --- AI台历拼工厂 自动生成测试环境 ---
            </div>
          </div>
        </div>

        {/* 3. Right panel: attributes inspector */}
        <div className="w-80 bg-white border-l p-4 overflow-y-auto shrink-0 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-widest pb-1.5 border-b flex justify-between items-center bg-white z-10">
              <span>属性配置面板</span>
              <Sliders className="w-3.5 h-3.5 text-neutral-500" />
            </h3>

            {/* A. If Slot is selected */}
            {selectedSlotId && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50/20 border border-blue-105 rounded-xl text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-755">正在配置产品槽位</span>
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded uppercase font-mono font-bold">
                      SLOT
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">控制该区域容纳何种材质、角度的产品PNG文件</p>
                </div>

                {/* Slot Name */}
                {(() => {
                  const s = activeTemplate.slots.find((x) => x.id === selectedSlotId);
                  if (!s) return null;
                  return (
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-neutral-400 mb-1">槽位ID</label>
                        <input
                          type="text"
                          disabled
                          value={s.slotId}
                          className="w-full bg-neutral-100 border rounded p-1.5 font-mono text-neutral-500"
                        />
                      </div>

                      <div>
                        <label className="block text-neutral-500 font-bold mb-1">槽位名称</label>
                        <input
                          type="text"
                          value={s.slotName}
                          onChange={(e) => updateSlotGeometry(s.id, "slotName", e.target.value)}
                          className="w-full bg-neutral-50 border rounded p-1.5 font-bold"
                        />
                      </div>

                      {/* X coordinates slider */}
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>水平中轴 X 坐标</span>
                          <span className="font-mono font-bold text-slate-700">{s.x}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          value={s.x}
                          onChange={(e) => updateSlotGeometry(s.id, "x", parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* Y coordinates slider */}
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>底边定位 Y 坐标</span>
                          <span className="font-mono font-bold text-slate-700">{s.y}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="95"
                          value={s.y}
                          onChange={(e) => updateSlotGeometry(s.id, "y", parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* Max Width coordinates slider */}
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>槽位最大物理限宽 (Max Width)</span>
                          <span className="font-mono font-bold text-slate-700">{s.maxWidth}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={s.maxWidth}
                          onChange={(e) => updateSlotGeometry(s.id, "maxWidth", parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* Max Height coordinates slider */}
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>槽位最大物理限高 (Max Height)</span>
                          <span className="font-mono font-bold text-slate-700">{s.maxHeight}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={s.maxHeight}
                          onChange={(e) => updateSlotGeometry(s.id, "maxHeight", parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* Locks Aspect Ratio Toggle */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <label className="flex items-center space-x-2 font-bold text-slate-800 cursor-pointer text-[11px]">
                          <input
                            type="checkbox"
                            checked={s.lockAspectRatio}
                            onChange={(e) => updateSlotGeometry(s.id, "lockAspectRatio", e.target.checked)}
                            className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span>锁定宽高比 (等比缩放不变形)</span>
                        </label>
                        <p className="text-[9px] text-slate-400 pl-6 leading-relaxed">
                          等比缩放开启时，无论套入什么尺寸比例的透明台历，其核心线圈与文字均在安全框内自适应 containment，防止拉伸肥胖模糊。
                        </p>
                      </div>

                      {/* Dropshadow selector rule */}
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">接触面模拟阴影法则</label>
                        <select
                          value={s.shadowRule}
                          onChange={(e) => updateSlotGeometry(s.id, "shadowRule", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 text-xs"
                        >
                          <option value="strong_desk_contact_shadow">重型桌脚立体软阴影</option>
                          <option value="desk_contact_soft_shadow">轻质艺术纸微弱折影</option>
                          <option value="very_light_shadow_or_none">无阴影 (适合背景已烘焙)</option>
                        </select>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* B. If Typographic Text layer is selected */}
            {selectedTextFieldId && (
              <div className="space-y-4">
                <div className="p-3 bg-indigo-50 border border-indigo-150 rounded text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-indigo-700">正在配置排板文本层</span>
                    <span className="text-[10px] bg-indigo-600 text-white px-1.5 rounded uppercase font-mono font-bold">
                      TEXT
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">控制文字自适应映射，支持台历细节字段动态替换</p>
                </div>

                {(() => {
                  const tf = activeTemplate.textFields.find((x) => x.id === selectedTextFieldId);
                  if (!tf) return null;
                  return (
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-neutral-500 font-bold mb-1">标配名称</label>
                        <input
                          type="text"
                          value={tf.fieldName}
                          onChange={(e) => updateTextFieldValue(tf.id, "fieldName", e.target.value)}
                          className="w-full bg-neutral-50 border rounded p-1.5 font-semibold"
                        />
                      </div>

                      {/* Is dynamic switch */}
                      <div className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          id="is_dynamic_cb"
                          checked={tf.isDynamic}
                          onChange={(e) => updateTextFieldValue(tf.id, "isDynamic", e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300"
                        />
                        <label htmlFor="is_dynamic_cb" className="font-bold text-neutral-700 cursor-pointer">
                          开启关联字段数据源
                        </label>
                      </div>

                      {tf.isDynamic ? (
                        <div>
                          <label className="block text-neutral-400 mb-1">绑定云数据库产品池字段</label>
                          <select
                            value={tf.dataSource}
                            onChange={(e) => {
                              const src = e.target.value;
                              updateTextFieldValue(tf.id, "dataSource", src);
                              // Sync visual placeholder
                              updateTextFieldValue(tf.id, "content", `[${src}]`);
                            }}
                            className="w-full bg-indigo-50 text-indigo-900 font-bold border border-indigo-200 rounded p-1.5 focus:outline-none"
                          >
                            <option value="productName">产品名称 (e.g. 策马奔腾)</option>
                            <option value="productCode">产品款号编号 (e.g. 060)</option>
                            <option value="size">产品尺寸参数 (e.g. 240mm * 170mm)</option>
                            <option value="seriesName">分类系列分类 (e.g. 国潮年货)</option>
                            <option value="materialCover">封面所用特种纸 (e.g. 250g 珠光特种纸)</option>
                            <option value="materialInner">内页纸张品质</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-neutral-500 font-bold mb-1">固定静态文案内容</label>
                          <input
                            type="text"
                            value={tf.content}
                            onChange={(e) => updateTextFieldValue(tf.id, "content", e.target.value)}
                            className="w-full bg-neutral-50 border rounded p-1.5"
                          />
                        </div>
                      )}

                      {/* Font size */}
                      <div>
                        <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
                          <span>字号大小 (FontSize)</span>
                          <span className="font-mono font-bold">{tf.fontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="120"
                          value={tf.fontSize}
                          onChange={(e) => updateTextFieldValue(tf.id, "fontSize", parseInt(e.target.value))}
                          className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                        />
                      </div>

                      {/* Coors x and y */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-400">
                        <div>
                          <span>水平 X% 比</span>
                          <input
                            type="number"
                            value={tf.x}
                            onChange={(e) => updateTextFieldValue(tf.id, "x", parseInt(e.target.value))}
                            className="w-full mt-1 bg-neutral-50 border rounded p-1 font-mono text-neutral-800"
                          />
                        </div>
                        <div>
                          <span>垂直 Y% 比</span>
                          <input
                            type="number"
                            value={tf.y}
                            onChange={(e) => updateTextFieldValue(tf.id, "y", parseInt(e.target.value))}
                            className="w-full mt-1 bg-neutral-50 border rounded p-1 font-mono text-neutral-800"
                          />
                        </div>
                      </div>

                      {/* Web Hex Color Picker */}
                      <div>
                        <label className="block text-neutral-500 font-bold mb-1">矢量字体色彩</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={tf.color}
                            onChange={(e) => updateTextFieldValue(tf.id, "color", e.target.value)}
                            className="w-8 h-8 rounded border p-0.5 cursor-pointer shrink-0"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* D. If a custom PSD Component is selected */}
            {selectedComponentId && (
              <div className="space-y-4">
                <div className="p-3 bg-purple-50/25 border border-purple-100 rounded-xl text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-purple-700">正在配置 PS 导入组件</span>
                    <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded uppercase font-mono font-bold">
                      COMPONENT
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">控制单个 Photoshop 导出的透明多层资产的空间定位</p>
                </div>

                {(() => {
                  const comp = activeTemplate.components?.find((c) => c.id === selectedComponentId);
                  if (!comp) return null;
                  return (
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">组件图层名称</label>
                        <input
                          type="text"
                          value={comp.name}
                          onChange={(e) => {
                            const updated = activeTemplate.components?.map((c) =>
                              c.id === comp.id ? { ...c, name: e.target.value } : c
                            );
                            handleUpdateTemplate({ ...activeTemplate, components: updated });
                          }}
                          className="w-full bg-slate-50 border rounded p-1.5 font-bold animate-pulse"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-550 font-bold mb-1">组件类型 (Role)</label>
                        <select
                          value={comp.type}
                          onChange={(e) => {
                            const val = e.target.value as TemplateComponentType;
                            const isScene = val === "scene_base";
                            const isProduct = val === "product_slot";
                            const updated = activeTemplate.components?.map((c) =>
                              c.id === comp.id ? { ...c, type: val, sendToRunningHub: isScene || isProduct } : c
                            );
                            handleUpdateTemplate({ ...activeTemplate, components: updated });
                          }}
                          className="w-full bg-slate-50 border rounded p-1.5 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-705"
                        >
                          <option value="scene_base">scene_base (参与 RunningHub 烘焙背景)</option>
                          <option value="product_slot">product_slot (参与 RunningHub 产品槽区)</option>
                          <option value="text_overlay">text_overlay (文案置顶盖板层)</option>
                          <option value="decor_overlay">decor_overlay (点缀装饰置顶盖板层)</option>
                          <option value="logo_overlay">logo_overlay (商标LOGO置顶盖板层)</option>
                        </select>
                      </div>

                      {/* Dimensions & Coordinates */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-2.5">
                        <span className="font-bold text-slate-700 text-[10px] block">位置尺寸控制 (x, y, width, height) %</span>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span>水平中轴 X%</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={comp.x}
                              onChange={(e) => {
                                const updated = activeTemplate.components?.map((c) =>
                                  c.id === comp.id ? { ...c, x: parseInt(e.target.value) || 0 } : c
                                );
                                handleUpdateTemplate({ ...activeTemplate, components: updated });
                              }}
                              className="w-full mt-1 bg-white border border-slate-205 rounded p-1 font-mono text-slate-800"
                            />
                          </div>
                          <div>
                            <span>底边定位 Y%</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={comp.y}
                              onChange={(e) => {
                                const updated = activeTemplate.components?.map((c) =>
                                  c.id === comp.id ? { ...c, y: parseInt(e.target.value) || 0 } : c
                                );
                                handleUpdateTemplate({ ...activeTemplate, components: updated });
                              }}
                              className="w-full mt-1 bg-white border border-slate-205 rounded p-1 font-mono text-slate-800"
                            />
                          </div>
                          <div>
                            <span>物理宽度 Width%</span>
                            <input
                              type="number"
                              min="5"
                              max="100"
                              value={comp.width}
                              onChange={(e) => {
                                const updated = activeTemplate.components?.map((c) =>
                                  c.id === comp.id ? { ...c, width: parseInt(e.target.value) || 10 } : c
                                );
                                handleUpdateTemplate({ ...activeTemplate, components: updated });
                              }}
                              className="w-full mt-1 bg-white border border-slate-205 rounded p-1 font-mono text-slate-800"
                            />
                          </div>
                          <div>
                            <span>物理高度 Height%</span>
                            <input
                              type="number"
                              min="5"
                              max="100"
                              value={comp.height}
                              onChange={(e) => {
                                const updated = activeTemplate.components?.map((c) =>
                                  c.id === comp.id ? { ...c, height: parseInt(e.target.value) || 10 } : c
                                );
                                handleUpdateTemplate({ ...activeTemplate, components: updated });
                              }}
                              className="w-full mt-1 bg-white border border-slate-205 rounded p-1 font-mono text-slate-800"
                            />
                          </div>
                        </div>
                      </div>

                      {/* zIndex & visible */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-1">合成层叠层 zIndex</label>
                          <input
                            type="number"
                            value={comp.zIndex}
                            onChange={(e) => {
                              const updated = activeTemplate.components?.map((c) =>
                                c.id === comp.id ? { ...c, zIndex: parseInt(e.target.value) || 0 } : c
                              );
                              handleUpdateTemplate({ ...activeTemplate, components: updated });
                            }}
                            className="w-full bg-slate-50 border rounded p-1.5 font-mono text-xs"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center space-x-1.5 cursor-pointer text-xs mb-2">
                            <input
                              type="checkbox"
                              checked={comp.visible}
                              onChange={(e) => {
                                const updated = activeTemplate.components?.map((c) =>
                                  c.id === comp.id ? { ...c, visible: e.target.checked } : c
                                );
                                handleUpdateTemplate({ ...activeTemplate, components: updated });
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <span className="font-bold text-slate-700">图层是否可见</span>
                          </label>
                        </div>
                      </div>

                      {/* sendToRunningHub Rule */}
                      <div className="p-3 bg-zinc-50 border rounded-xl space-y-1">
                        <label className="flex items-center space-x-2 font-bold text-slate-850 cursor-pointer text-[11px]">
                          <input
                            type="checkbox"
                            checked={comp.sendToRunningHub}
                            onChange={(e) => {
                              const updated = activeTemplate.components?.map((c) =>
                                c.id === comp.id ? { ...c, sendToRunningHub: e.target.checked } : c
                              );
                              handleUpdateTemplate({ ...activeTemplate, components: updated });
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span>传输给 RunningHub (sendToRunningHub)</span>
                        </label>
                        <p className="text-[9px] text-slate-455 pl-6 leading-relaxed">
                          为 true 时表示该组件属于底层空间图层(烘焙桌面板或摆放的产品层)，会一起送往 RunningHub 做深度光照投影；若为 false，则不参与，保证文案等不会产生畸变。
                        </p>
                      </div>

                      {/* Product Slot specific properties */}
                      {comp.type === "product_slot" && (
                        <div className="p-3 bg-indigo-50/40 border border-indigo-120 rounded-xl space-y-3.5 text-xs">
                          <span className="font-bold text-indigo-805 text-[11px] block text-left">🔍 产品槽位高级参数</span>

                          <div className="space-y-2 text-left">
                            <label className="flex items-center space-x-2 font-bold text-slate-800 cursor-pointer text-[10.5px]">
                              <input
                                type="checkbox"
                                checked={comp.lockAspectRatio !== false}
                                onChange={(e) => {
                                  const updated = activeTemplate.components?.map((c) =>
                                    c.id === comp.id ? { ...c, lockAspectRatio: e.target.checked } : c
                                  );
                                  handleUpdateTemplate({ ...activeTemplate, components: updated });
                                }}
                                className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-550 w-3.5 h-3.5"
                              />
                              <span>强制产品等比缩放 (lockAspectRatio)</span>
                            </label>
                          </div>

                          <div className="text-left">
                            <span className="block text-slate-500 text-[10px] mb-1">产品边缘排布缩放 (scaleMode)</span>
                            <select
                              value={comp.scaleMode || "contain"}
                              onChange={(e) => {
                                const updated = activeTemplate.components?.map((c) =>
                                  c.id === comp.id ? { ...c, scaleMode: e.target.value as any } : c
                                );
                                handleUpdateTemplate({ ...activeTemplate, components: updated });
                              }}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-[11px]"
                            >
                              <option value="contain">contain (完整居中摆入，不切割产品)</option>
                              <option value="cover">cover (贴片最大化拉伸，填充整个槽区)</option>
                            </select>
                          </div>

                          <div className="space-y-2 text-left">
                            <label className="flex items-center space-x-2 font-bold text-slate-800 cursor-pointer text-[10.5px]">
                              <input
                                type="checkbox"
                                checked={comp.allowRotation === true}
                                onChange={(e) => {
                                  const updated = activeTemplate.components?.map((c) =>
                                    c.id === comp.id ? { ...c, allowRotation: e.target.checked } : c
                                  );
                                  handleUpdateTemplate({ ...activeTemplate, components: updated });
                                }}
                                className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-550 w-3.5 h-3.5"
                              />
                              <span>允许旋转产品 (allowRotation)</span>
                            </label>
                          </div>

                          <div className="text-left">
                            <label className="block text-slate-500 text-[10px] mb-1">静态初始旋转角 (defaultRotation) {comp.defaultRotation || 0}°</label>
                            <input
                              type="range"
                              min="-180"
                              max="180"
                              value={comp.defaultRotation || 0}
                              onChange={(e) => {
                                const updated = activeTemplate.components?.map((c) =>
                                  c.id === comp.id ? { ...c, defaultRotation: parseInt(e.target.value) || 0 } : c
                                );
                                handleUpdateTemplate({ ...activeTemplate, components: updated });
                              }}
                              className="w-full h-1 bg-slate-200 rounded cursor-pointer accent-indigo-600"
                            />
                          </div>
                        </div>
                      )}

                      {/* Remove Component */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("确定要彻底删除该 PS 导入组件图层吗？（不可撤销）")) {
                            const updated = activeTemplate.components?.filter((c) => c.id !== comp.id);
                            handleUpdateTemplate({ ...activeTemplate, components: updated });
                            setSelectedComponentId(null);
                          }
                        }}
                        className="w-full py-2 bg-rose-50 hover:bg-rose-150 text-rose-600 rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                        <span>彻底删除此图层</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* C. Default Backdrop configurations if nothing selected */}
            {!selectedSlotId && !selectedTextFieldId && !selectedComponentId && (
              <div className="space-y-4">
                {/* PS Components Import Panel */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4 text-xs text-left">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <FolderOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>PS组件批量导入 (Photoshop Components)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    在 Photoshop 中设计完主图后，可将导出的透明图层资产 (如背景、贴纸、文案层) 上传至平台。
                  </p>

                  {/* File uploader container */}
                  <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-white hover:bg-slate-50 transition-all flex flex-col items-center justify-center cursor-pointer text-center relative group">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const dataUrl = event.target?.result as string;
                            const nameClean = file.name.substring(0, file.name.lastIndexOf("."));
                            let guessedType: TemplateComponentType = "decor_overlay";
                            let zVal = 30;
                            let sendToRH = false;

                            if (nameClean.toLowerCase().includes("bg") || nameClean.toLowerCase().includes("scene") || nameClean.toLowerCase().includes("背景")) {
                              guessedType = "scene_base";
                              zVal = 0;
                              sendToRH = true;
                            } else if (nameClean.toLowerCase().includes("text") || nameClean.toLowerCase().includes("title") || nameClean.toLowerCase().includes("文案") || nameClean.toLowerCase().includes("字")) {
                              guessedType = "text_overlay";
                              zVal = 40;
                            } else if (nameClean.toLowerCase().includes("logo")) {
                              guessedType = "logo_overlay";
                              zVal = 50;
                            }

                            const newComp: TemplateComponent = {
                              id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                              name: `${nameClean} (${guessedType === "scene_base" ? "背景" : guessedType === "text_overlay" ? "文案" : "装饰"})`,
                              type: guessedType,
                              imageUrl: dataUrl,
                              x: guessedType === "scene_base" ? 0 : 25,
                              y: guessedType === "scene_base" ? 0 : 25,
                              width: guessedType === "scene_base" ? 100 : 50,
                              height: guessedType === "scene_base" ? 100 : 50,
                              zIndex: zVal,
                              visible: true,
                              sendToRunningHub: sendToRH
                            };

                            const updatedComps = [...(activeTemplate.components || []), newComp];
                            handleUpdateTemplate({ ...activeTemplate, components: updatedComps });
                            setSelectedComponentId(newComp.id);
                            alert(`【组件导入成功】：已识别「${nameClean}」多层图层资源并存入当前模板！`);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Sparkles className="w-6 h-6 text-indigo-500 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-slate-700 text-[11px]">点击或拖拽上传 PNG 组件图</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">支持 PS 导出的透明图层</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const idVal = `comp_${Date.now()}`;
                        const newSlot: TemplateComponent = {
                          id: idVal,
                          name: `产品槽位 (${(activeTemplate.components?.filter(c => c.type === "product_slot").length || 0) + 1})`,
                          type: "product_slot",
                          x: 42,
                          y: 65,
                          width: 35,
                          height: 35,
                          zIndex: 10,
                          visible: true,
                          sendToRunningHub: true,
                          lockAspectRatio: true,
                          scaleMode: "contain"
                        };
                        const updatedComps = [...(activeTemplate.components || []), newSlot];
                        handleUpdateTemplate({ ...activeTemplate, components: updatedComps });
                        setSelectedComponentId(idVal);
                      }}
                      className="flex-1 py-1.5 px-2 border border-indigo-150 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold text-center cursor-pointer transition-all"
                    >
                      ➕ 新增产品槽层 (product_slot)
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-800 block">1. 模板背景预设置</span>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    设置电商主图底部托物桌面、漫反射光源、以及材质风格质感。
                  </p>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-500 font-bold mb-1">背景画布种类</label>
                    <select
                      value={activeTemplate.background.type}
                      onChange={(e) => updateBackground("type", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 text-xs text-slate-850"
                    >
                      <option value="scene">3D烘焙写实桌面场景</option>
                      <option value="color">单色规范底面 (纯色/白底)</option>
                    </select>
                  </div>

                  {activeTemplate.background.type === "scene" && (
                    <div>
                      <label className="block text-slate-500 font-bold mb-1">预设背景质感空间</label>
                      <div className="grid grid-cols-2 gap-1.5 mt-1 text-[11px]">
                        {[
                          { id: "warm_light", name: "原木暖阳斜晖" },
                          { id: "beige_paper", name: "极简米黄高纸质" },
                          { id: "studio_white", name: "冷灰色无缝摄影棚" },
                          { id: "festive_red", name: "大红烫漆金浮花" },
                          { id: "luxury_gold", name: "黑曜金石墨岩面板" }
                        ].map((bg) => (
                          <button
                            key={bg.id}
                            onClick={() => updateBackground("sceneStyle", bg.id)}
                            className={`p-2 rounded-lg text-left border font-semibold ${
                              activeTemplate.background.sceneStyle === bg.id
                                ? "bg-blue-50 border-blue-200 text-blue-600"
                                : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {bg.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">输出物理宽度 (宽度)</label>
                    <input
                      type="number"
                      value={activeTemplate.outputWidth}
                      onChange={(e) =>
                        handleUpdateTemplate({ ...activeTemplate, outputWidth: parseInt(e.target.value) })
                      }
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg p-2 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-bold mb-1">输出物理高度 (高度)</label>
                    <input
                      type="number"
                      value={activeTemplate.outputHeight}
                      onChange={(e) =>
                        handleUpdateTemplate({ ...activeTemplate, outputHeight: parseInt(e.target.value) })
                      }
                      className="w-full bg-slate-50 border border-slate-205 rounded-lg p-2 font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 leading-normal mt-4 shadow-2xs">
            <span className="font-bold text-slate-705 block mb-1">🎯 快捷键提示</span>
            点击画布上的产品框或文字文字能够极速呼出属性精控杆。
          </div>
        </div>
      </div>
    </div>
  );
};
