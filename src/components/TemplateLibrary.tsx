import React, { useState } from "react";
import { Template } from "../types";
import { Layout, Check, Sparkles, FolderLock, Plus, Edit, Copy } from "lucide-react";

interface TemplateLibraryProps {
  templates: Template[];
  onSelectTemplateForEditor: (template: Template) => void;
  onNavigate: (tab: string) => void;
  onCloneTemplate: (template: Template) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  templates,
  onSelectTemplateForEditor,
  onNavigate,
  onCloneTemplate
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "全部模板" },
    { id: "main", label: "主图模板" },
    { id: "sku", label: "SKU模板" },
    { id: "detail", label: "详情图模板" },
    { id: "white_bg", label: "标准白底图" },
    { id: "ad_custom", label: "企业定制图" }
  ];

  const filtered = templates.filter((t) => {
    if (activeCategory === "all") return true;
    return t.templateType === activeCategory;
  });

  const getTypeNameStr = (type: Template["templateType"]) => {
    switch (type) {
      case "main":
        return "黄金主图";
      case "sku":
        return "单款SKU";
      case "detail":
        return "详情解析图";
      case "white_bg":
        return "白底规范图";
      case "ad_custom":
        return "企业定制款";
      case "parameter":
        return "尺寸说明图";
      default:
        return "台历图";
    }
  };

  const getStyleThemeColors = (scene: string) => {
    switch (scene) {
      case "warm_light":
        return "from-amber-50 to-orange-100 border-amber-200 text-amber-900";
      case "beige_paper":
        return "from-stone-50 to-amber-50/60 border-stone-250 text-stone-900";
      case "studio_white":
        return "from-neutral-50 to-neutral-100 border-neutral-200 text-neutral-800";
      case "festive_red":
        return "from-red-650 to-rose-700 border-red-500 text-white";
      case "luxury_gold":
        return "from-yellow-800/90 to-yellow-900 border-amber-400 text-amber-100";
      default:
        return "from-neutral-100 to-neutral-200 border-neutral-300 text-neutral-800";
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top action header box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">排板多款套版模板库</h2>
          <p className="text-xs text-slate-500 mt-1 pb-1">
            模板并非是一张简单背景底图，而是由多个「等比缩放槽位」与「动态矢量文案字段」组合而成的排板方案。
          </p>
        </div>
        <button
          onClick={() => {
            // Pick first and trigger selection
            if (templates.length > 0) {
              onSelectTemplateForEditor(templates[0]);
              onNavigate("editor");
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/10 active:scale-95 transition-all text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center space-x-1 whitespace-nowrap self-start shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>制作全新台历模板</span>
        </button>
      </div>

      {/* Tabs list Category Navigation */}
      <div className="flex border-b border-slate-100 text-xs space-x-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`pb-2.5 px-4 font-semibold border-b-2 transition-all ${
              activeCategory === c.id
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Templates cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => {
          const bgScheme = getStyleThemeColors(t.background.sceneStyle || "");
          return (
            <div
              key={t.id}
              className="bg-white border border-slate-201 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-300 hover:shadow-lg hover:shadow-slate-500/5 transition-all h-96 p-4"
            >
              {/* Inside illustration card mock background */}
              <div
                className={`relative h-48 w-full rounded-xl border border-white/10 bg-gradient-to-br flex flex-col justify-between p-3 overflow-hidden ${bgScheme}`}
              >
                {/* Floating labels */}
                <div className="flex justify-between items-center z-10">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold bg-black/60 text-white px-2 py-0.5 rounded-full">
                    {getTypeNameStr(t.templateType)}
                  </span>
                  <span className="text-[10px] bg-white/85 text-neutral-800 border font-bold px-1.5 py-0.2 rounded font-mono">
                    比例: {t.aspectRatio} ({t.outputWidth}x{t.outputHeight})
                  </span>
                </div>

                {/* Simulated slots outlines */}
                <div className="my-auto flex flex-col justify-center items-center space-y-1 z-10 select-none">
                  <div className="flex gap-2">
                    {t.slots.map((s, idx) => (
                      <div
                        key={idx}
                        className="border-2 border-dashed border-blue-500 bg-blue-500/10 rounded px-2.5 py-1.5 text-center text-blue-600 font-mono text-[9px] flex flex-col justify-center min-w-20"
                      >
                        <span className="font-bold block tracking-tighter">槽位: {idx + 1}</span>
                        <span className="opacity-80 scale-90">{s.slotId.substring(4, 11)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Vector font placeholders text indicator */}
                  <div className="text-center pt-2 space-y-1">
                    {t.textFields.slice(0, 2).map((tf) => (
                      <div
                        key={tf.id}
                        className="text-[9px] font-medium bg-neutral-900/10 text-neutral-800 px-1.5 py-0.2 rounded inline-block mx-0.5 max-w-[200px] truncate"
                      >
                        {tf.isDynamic ? `[变量] ${tf.fieldName}` : tf.content}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer labels */}
                <div className="flex justify-between items-center text-[10px] z-10 uppercase font-bold bg-black/5 p-1 rounded">
                  <span className="truncate">底纸: {t.background.sceneStyle || "纯色"}</span>
                  <span className="text-emerald-300">● 批量已就绪</span>
                </div>

                {/* Shutter layer effect */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>

              {/* Specs & buttons description */}
              <div className="mt-3.5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 truncate">{t.templateName}</h3>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    含 {t.slots.length} 个等比约束槽、{t.textFields.length} 个动态矢量变量。内置 {t.slots[0]?.shadowRule || "接触阴影"} 效果。
                  </p>
                </div>

                {/* Operations links and buttons */}
                <div className="flex justify-between items-center border-t border-slate-100 pt-3 gap-2">
                  <button
                    onClick={() => onCloneTemplate(t)}
                    title="复制模板"
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg flex items-center shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      onSelectTemplateForEditor(t);
                      onNavigate("editor");
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-705 font-semibold py-2 px-3 rounded-xl text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>入内自定义配置</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTemplateForEditor(t);
                      onNavigate("batch");
                    }}
                    className="bg-blue-50 hover:bg-blue-105/90 text-blue-600 font-bold py-2 px-3 rounded-xl text-[11px] flex items-center justify-center border border-blue-200/60 cursor-pointer transition-colors"
                  >
                    <span>使用套版</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
