import React, { useState } from "react";
import { Template, TemplateSuite, TemplatePage, TemplatePageType, ExportFolderKey, PageRole, BusinessRatioType } from "../types";
import { PRESET_TEMPLATE_SUITES } from "../data";
import { getExportFolderName, groupPagesByExportFolder } from "../utils/businessRuleHelpers";
import {
  Layout,
  Check,
  Sparkles,
  FolderLock,
  Plus,
  Edit,
  Copy,
  ChevronLeft,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Sparkle,
  Bookmark,
  CheckCircle2,
  Trash2,
  Sliders,
  Maximize2,
  Layers3
} from "lucide-react";

interface TemplateLibraryProps {
  templates: Template[];
  onSelectTemplateForEditor: (template: Template) => void;
  onNavigate: (tab: string) => void;
  onCloneTemplate: (template: Template) => void;
  onUseSuiteForNewProject?: (suiteId: string) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  templates,
  onSelectTemplateForEditor,
  onNavigate,
  onCloneTemplate,
  onUseSuiteForNewProject
}) => {
  // Local list of suites initialized with PRESET_TEMPLATE_SUITES + 3 more gorgeous preset suites
  const [suites, setSuites] = useState<TemplateSuite[]>(() => {
    const extendedSuites: TemplateSuite[] = [
      ...PRESET_TEMPLATE_SUITES,
      {
        id: "suite_festive_003",
        suiteName: "红金年货台历套系",
        styleName: "喜庆国潮 / 年货送礼 / 浓烈红金",
        category: "festive_red",
        productType: "calendar",
        coverImage: "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600&auto=format&fit=crop",
        pages: [
          {
            id: "tp_festive_main",
            pageName: "国红年礼首图 (main)",
            pageType: "main",
            templateId: "MAIN_001",
            order: 1,
            requiredAssetRoles: ["main_product", "front"],
            enabled: true
          },
          {
            id: "tp_festive_sku",
            pageName: "款式分类SKU图 (sku)",
            pageType: "sku",
            templateId: "SKU_001",
            order: 2,
            requiredAssetRoles: ["sku_product", "left_3_4"],
            enabled: true
          },
          {
            id: "tp_festive_det_01",
            pageName: "详情页：国潮质感工艺",
            pageType: "detail",
            templateId: "DETAIL_001",
            order: 3,
            requiredAssetRoles: ["front"],
            enabled: true
          },
          {
            id: "tp_festive_scene",
            pageName: "详情页：茶室茶桌情景图",
            pageType: "scene",
            templateId: "MAIN_002",
            order: 4,
            requiredAssetRoles: ["main_product"],
            enabled: true
          }
        ],
        globalStyle: {
          colorPalette: ["#DC2626", "#F59E0B", "#B45309", "#000000"],
          fontStyle: "NianHuo Brush & Inter Serif",
          sceneStyle: "中式茶室红木茶案温暖烛光",
          lightDirection: "正前上方高角度聚光灯",
          description: "年货节、春节送礼专属系列，重磅红金两色搭配，呈现极高中国年味氛围，拉满高端礼品属性。"
        },
        status: "enabled"
      },
      {
        id: "suite_gift_004",
        suiteName: "企业定制礼品套系",
        styleName: "商务礼盒 / 尊贵定制 / 金属底座",
        category: "gift",
        productType: "gift_box",
        coverImage: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop",
        pages: [
          {
            id: "tp_gift_main",
            pageName: "尊贵礼盒全套首图 (main)",
            pageType: "main",
            templateId: "MAIN_001",
            order: 1,
            requiredAssetRoles: ["combo"],
            enabled: true
          },
          {
            id: "tp_gift_pkg",
            pageName: "详情页：独立手提袋展示",
            pageType: "package",
            templateId: "DETAIL_001",
            order: 2,
            requiredAssetRoles: ["package"],
            enabled: true
          },
          {
            id: "tp_gift_size",
            pageName: "详情页：多件套尺寸拆盘页",
            pageType: "size_material",
            templateId: "DETAIL_002",
            order: 3,
            requiredAssetRoles: ["white_bg"],
            enabled: true
          }
        ],
        globalStyle: {
          colorPalette: ["#1E3A8A", "#D97706", "#4B5563"],
          fontStyle: "Modern Corporate Sans",
          sceneStyle: "高级岩板深灰色玄关台漫反射",
          lightDirection: "侧方斜射漫反射自然光源",
          description: "适合企业年终大会礼品、VIP贵宾专属贺卡及包装套系，体现极高企划精神与尊贵地位。"
        },
        status: "enabled"
      },
      {
        id: "suite_min_005",
        suiteName: "简约大白底商品套系",
        styleName: "极致干净 / 纯白摄影 / 软阴影",
        category: "minimal",
        productType: "calendar",
        coverImage: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=600&auto=format&fit=crop",
        pages: [
          {
            id: "tp_min_main",
            pageName: "纯白极简首图 (main)",
            pageType: "main",
            templateId: "MAIN_003",
            order: 1,
            requiredAssetRoles: ["front"],
            enabled: true
          },
          {
            id: "tp_min_sku",
            pageName: "纯平大主图 (sku)",
            pageType: "sku",
            templateId: "SKU_001",
            order: 2,
            requiredAssetRoles: ["sku_product"],
            enabled: true
          }
        ],
        globalStyle: {
          colorPalette: ["#94A3B8", "#F8FAFC", "#FFFFFF"],
          fontStyle: "Helvetica Neue Grid",
          sceneStyle: "极简白墙透进落地窗软自然光",
          lightDirection: "偏上85度大面积均匀扩散光",
          description: "去繁就简，完美烘托产品本身细节，自带通透高级感的纯白背景与现代摄影微阴影。"
        },
        status: "draft"
      }
    ];

    // Filter duplicates just in case
    const uniqueMap = new Map<string, TemplateSuite>();
    extendedSuites.forEach(s => uniqueMap.set(s.id, s));
    return Array.from(uniqueMap.values());
  });

  const [activeTab, setActiveTab] = useState<string>("all_suites");
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProductType, setFilterProductType] = useState("all");
  const [filterStyle, setFilterStyle] = useState("all");
  const [filterRatio, setFilterRatio] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Floating feedback Toast system
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch tabs mapping
  // All suites / Desk calendar / Wall calendar / Enterprise custom / Festive gift / Minimal background / Drafts / Active keys
  const suiteCategories = [
    { id: "all_suites", label: "全部套系" },
    { id: "calendar", label: "台历套系" },
    { id: "wall_calendar", label: "挂历套系" },
    { id: "enterprise", label: "企业定制套系" },
    { id: "festival", label: "节日礼品套系" },
    { id: "minimal_bg", label: "简约白底套系" },
    { id: "draft", label: "草稿" },
    { id: "active", label: "已启用" }
  ];

  // Helper functions for labels and styling
  const getProductTypeLabel = (p: TemplateSuite["productType"]) => {
    switch (p) {
      case "calendar":
        return "台历";
      case "wall_calendar":
        return "挂历";
      case "gift_box":
        return "礼品盒";
      default:
        return "产品类型";
    }
  };

  const getCategoryLabel = (c: TemplateSuite["category"]) => {
    switch (c) {
      case "new_chinese":
        return "新中式";
      case "business":
        return "商务";
      case "festive_red":
        return "红金";
      case "minimal":
        return "简约";
      case "gift":
        return "礼品";
      case "custom":
        return "定制";
      default:
        return "其他";
    }
  };

  const getStatusBadge = (status: TemplateSuite["status"]) => {
    switch (status) {
      case "enabled":
        return (
          <span className="inline-flex items-center space-x-1 py-0.5 px-2 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>已启用</span>
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center space-x-1 py-0.5 px-2 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-100">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>草稿</span>
          </span>
        );
      case "disabled":
        return (
          <span className="inline-flex items-center space-x-1 py-0.5 px-2 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-md border border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>已禁用</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Collect page types counters inside a TemplateSuite
  const getSuitePagesStats = (pages: TemplatePage[]) => {
    const counts = {
      main: 0,
      sku: 0,
      detail: 0,
      package: 0,
      size_material: 0,
      scene: 0,
      other: 0
    };

    pages.forEach((p) => {
      if (p.pageType === "main") counts.main++;
      else if (p.pageType === "sku") counts.sku++;
      else if (p.pageType === "detail") counts.detail++;
      else if (p.pageType === "package") counts.package++;
      else if (p.pageType === "size_material") counts.size_material++;
      else if (p.pageType === "scene") counts.scene++;
      else counts.other++;
    });

    return counts;
  };

  // Gather unique ratios from suite's pages matching templates
  const getSuiteRatios = (pages: TemplatePage[]) => {
    const list: string[] = [];
    pages.forEach((p) => {
      const match = templates.find((t) => t.id === p.templateId);
      const r = match ? match.aspectRatio : "1:1";
      if (!list.includes(r)) list.push(r);
    });
    if (list.length === 0) list.push("1:1");
    return list;
  };

  // Copy TemplateSuite function
  const handleCopySuite = (suite: TemplateSuite) => {
    const clone: TemplateSuite = {
      ...suite,
      id: `suite_${Date.now()}`,
      suiteName: `${suite.suiteName} (复制)`,
      status: "draft"
    };
    setSuites([clone, ...suites]);
    showToast(`成功复制套系: ${suite.suiteName}`);
  };

  // Filter suite list by categories + SearchQuery and Advanced filters
  const filteredSuites = suites.filter((suite) => {
    // 1. Tab filter
    if (activeTab === "calendar" && suite.productType !== "calendar") return false;
    if (activeTab === "wall_calendar" && suite.productType !== "wall_calendar") return false;
    if (activeTab === "enterprise" && suite.category !== "custom" && suite.suiteName.indexOf("企业") === -1) return false;
    if (activeTab === "festival" && suite.category !== "gift" && suite.category !== "festive_red") return false;
    if (activeTab === "minimal_bg" && suite.category !== "minimal") return false;
    if (activeTab === "draft" && suite.status !== "draft") return false;
    if (activeTab === "active" && suite.status !== "enabled") return false;

    // 2. Query Search: Name, style, product type
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const inName = suite.suiteName.toLowerCase().includes(q);
      const inStyle = suite.styleName.toLowerCase().includes(q);
      const inType = getProductTypeLabel(suite.productType).toLowerCase().includes(q);
      if (!inName && !inStyle && !inType) return false;
    }

    // 3. Dropdown Filters
    if (filterProductType !== "all" && suite.productType !== filterProductType) return false;
    if (filterStyle !== "all" && suite.category !== filterStyle) return false;
    if (filterStatus !== "all" && suite.status !== filterStatus) return false;

    if (filterRatio !== "all") {
      const ratios = getSuiteRatios(suite.pages);
      if (!ratios.includes(filterRatio)) return false;
    }

    return true;
  });

  // Action: Used for new project
  const handleUseSuiteForNewProject = (suite: TemplateSuite) => {
    showToast(`已选择套系「${suite.suiteName}」，正在跳转至项目工作台...`);
    setTimeout(() => {
      if (onUseSuiteForNewProject) {
        onUseSuiteForNewProject(suite.id);
      } else {
        onNavigate("project_suite");
      }
    }, 800);
  };

  // Find active suite
  const activeSuite = suites.find((s) => s.id === selectedSuiteId);

  // Layout switcher: if a suite is selected, render Suite Detail view. Else, render lists.
  return (
    <div className="space-y-6 text-left relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-5 shadow-xl text-xs flex items-center space-x-2.5 animate-bounce">
          <Sparkle className="w-4 h-4 text-amber-400 animate-spin" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {selectedSuiteId && activeSuite ? (
        /* ==================== SUITE DETAIL VIEW (TEMPLATE SUITE DETAIL) ==================== */
        <div className="space-y-6">
          {/* Top navigation Back Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <button
              onClick={() => setSelectedSuiteId(null)}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>返回套系库</span>
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-slate-400 font-medium">套系ID: {activeSuite.id}</span>
              {getStatusBadge(activeSuite.status)}
            </div>
          </div>

          {/* Suite Hero Metadata Banner */}
          <div className="bg-slate-900 text-white rounded-2xl overflow-hidden shadow-md border border-slate-800 flex flex-col md:flex-row">
            {/* Left Image aspect */}
            <div className="md:w-1/3 relative h-48 md:h-auto min-h-[160px] bg-slate-950">
              <img
                src={activeSuite.coverImage || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop"}
                alt={activeSuite.suiteName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-950 via-transparent to-transparent" />
            </div>

            {/* Right details content layout */}
            <div className="md:w-2/3 p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold tracking-wider bg-indigo-650 text-white uppercase px-2 py-0.5 rounded-full">
                    {getProductTypeLabel(activeSuite.productType)}
                  </span>
                  <span className="text-[10px] font-extrabold tracking-wider bg-slate-800 text-indigo-300 uppercase px-2 py-0.5 rounded-full">
                    风格: {getCategoryLabel(activeSuite.category)}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">{activeSuite.suiteName}</h1>
                <p className="text-xs text-slate-400 font-mono italic">
                  风格特征: {activeSuite.styleName} | 主配字体: {activeSuite.globalStyle.fontStyle}
                </p>
                <p className="text-xs text-slate-350 leading-relaxed max-w-2xl bg-white/5 p-2.5 rounded-lg border border-white/5">
                  精巧设计: {activeSuite.globalStyle.description || "成套电商主图与SKU/详情视觉规划方案，提供完美一致渲染流程。"}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-white/5 mt-5">
                <button
                  id="suite-use-btn"
                  onClick={() => handleUseSuiteForNewProject(activeSuite)}
                  className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs px-5 py-2.5 rounded-xl text-white shadow-lg active:scale-95 transition-all flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>用于新项目</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grouped templates wrapper */}
          <div className="space-y-8">
            <div>
              <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center space-x-2">
                <Layers3 className="w-4 h-4 text-indigo-500" />
                <span>套系拥有的单页模板成员 ({activeSuite.pages.length})</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                渲染时，各单页模板将自动应用相同的色彩、滤镜设置和产品图片。
              </p>
            </div>

            {(() => {
              const groupedFolders = groupPagesByExportFolder(activeSuite.pages, activeSuite);

              const getFolderColorAccent = (folderKey: string) => {
                switch (folderKey) {
                  case "main_square":
                    return "border-l-rose-500 text-rose-600 bg-rose-50/50";
                  case "main_vertical":
                    return "border-l-amber-500 text-amber-600 bg-amber-50/50";
                  case "sku":
                    return "border-l-blue-500 text-blue-600 bg-blue-50/50";
                  case "detail":
                    return "border-l-indigo-500 text-indigo-600 bg-indigo-50/50";
                  case "sample_book":
                    return "border-l-purple-500 text-purple-600 bg-purple-50/50";
                  case "customization_detail":
                    return "border-l-emerald-500 text-emerald-600 bg-emerald-50/50";
                  case "ad_custom_effect":
                    return "border-l-cyan-500 text-cyan-600 bg-cyan-50/50";
                  case "white_bg":
                    return "border-l-teal-500 text-teal-700 bg-teal-50/50";
                  case "transparent_png":
                    return "border-l-sky-500 text-sky-700 bg-sky-50/50";
                  default:
                    return "border-l-slate-400 text-slate-700 bg-slate-50/50";
                }
              };

              return (
                <div className="space-y-6">
                  {groupedFolders.map((grp) => {
                    if (grp.pagesList.length === 0) return null;
                    return (
                      <div key={grp.folderKey} className="space-y-3.5">
                        <div className={`p-2.5 rounded-lg border-l-4 text-xs font-bold leading-none ${getFolderColorAccent(grp.folderKey)} flex justify-between items-center`}>
                          <span>{grp.folderName} ({grp.pagesList.length} 张)</span>
                          <span className="text-[10px] text-slate-450 font-mono tracking-wide">目录型Key: {grp.folderKey}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {grp.pagesList.map((p) => {
                            const page = p as TemplatePage;
                            // Find matching Template object
                            const matchedTemplate =
                              templates.find((t) => t.id === page.templateId) ||
                              templates.find((t) => t.templateType === page.pageType) ||
                              templates[0];

                            // Determine specs
                            const tRatio = page.actualAspectRatio || (matchedTemplate ? matchedTemplate.aspectRatio : "1:1");
                            const slotsCount = matchedTemplate ? matchedTemplate.slots.length : 1;
                            const requiredString = page.requiredAssetRoles.join(" / ");
                            
                            // Determine rendering suggestions
                            const pRole = page.pageRole || "";
                            let suggestionLabel = "";
                            let suggestionStyle = "bg-slate-101 text-slate-600";
                            
                            if (pRole === "white_bg" || pRole === "transparent_png" || page.pageType === "white_bg" || page.pageType === "transparent_png") {
                              suggestionLabel = "正式交付资产";
                              suggestionStyle = "bg-teal-50 text-teal-700 border border-teal-200/60 font-bold";
                            } else if (["sku_variant", "detail_inner_page", "customization_detail", "sample_book_mockup", "detail_sequence", "detail_core_selling", "detail_size_material", "detail_craft_closeup", "detail_package"].includes(pRole)) {
                              suggestionLabel = "Canvas优先";
                              suggestionStyle = "bg-blue-50 text-blue-700 border border-blue-100 font-medium";
                            } else if (["primary_main_square", "primary_main_vertical", "main_marketing_square", "main_marketing_vertical"].includes(pRole)) {
                              suggestionLabel = "可 RunningHub 增强";
                              suggestionStyle = "bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-medium";
                            } else if (page.isCanvasOnly) {
                              suggestionLabel = "Canvas优先";
                              suggestionStyle = "bg-blue-50 text-blue-700 border border-blue-100 font-medium";
                            } else if (page.isRunningHubRecommended) {
                              suggestionLabel = "建议 RunningHub";
                              suggestionStyle = "bg-indigo-50 text-indigo-700 border border-indigo-100/50";
                            }

                            return (
                              <div
                                key={page.id}
                                className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl overflow-hidden p-4 flex flex-col justify-between hover:shadow-md transition-all min-h-[224px]"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-1.5">
                                    <span className="text-[11px] font-bold text-slate-800 font-sans tracking-wide leading-tight">
                                      {page.pageName}
                                    </span>
                                    <span className="inline-block shrink-0 py-0.5 px-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 font-mono text-[9px] font-extrabold rounded">
                                      {tRatio}
                                    </span>
                                  </div>

                                  {/* Business-oriented Specifications Grid */}
                                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 mt-2.5 text-[10px] bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                                    <div className="text-slate-500 overflow-hidden truncate">
                                      角色: <span className="font-bold text-slate-700 font-mono text-[9px]">{page.pageRole || page.pageType}</span>
                                    </div>
                                    <div className="text-slate-500 text-right overflow-hidden truncate">
                                      比例: <span className="font-bold text-slate-700">{page.businessRatioType || "标准"}</span>
                                    </div>
                                    <div className="text-slate-500 col-span-2 overflow-hidden truncate">
                                      导出目录: <span className="font-bold text-indigo-600">{getExportFolderName(grp.folderKey)}</span>
                                    </div>
                                    <div className="text-slate-500 overflow-hidden truncate">
                                      交付属性: <span className="font-bold text-slate-700">{page.isDeliverable !== false ? "正式交付" : "参考属性"}</span>
                                    </div>
                                    <div className="text-slate-500 text-right overflow-hidden truncate">
                                      槽位: <span className="font-bold text-slate-700">{slotsCount} 个</span>
                                    </div>
                                    <div className="text-slate-500 col-span-2 flex items-center justify-between gap-1 pt-1 border-t border-slate-100 mt-1 select-none">
                                      <span>交付性质:</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[8.5px] ${suggestionStyle}`}>
                                        {suggestionLabel || "建议直接输出"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Optimised Business Actions Button Block */}
                                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-3 gap-2">
                                  <button
                                    onClick={() => {
                                      if (matchedTemplate) {
                                        onCloneTemplate(matchedTemplate);
                                      } else {
                                        showToast("无法复制：未绑定正确底板。");
                                      }
                                    }}
                                    className="p-1.5 bg-slate-50 hover:bg-slate-101 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                                    title="复制模板"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (matchedTemplate) {
                                        onSelectTemplateForEditor(matchedTemplate);
                                        onNavigate("editor");
                                      } else {
                                        showToast("未找到可编辑模板");
                                      }
                                    }}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-2.5 rounded-lg text-[10px] flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                                  >
                                    <Edit className="w-3 h-3" />
                                    <span>编辑模板</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      showToast("已应用此模板至当前活动套系工作流...");
                                      setTimeout(() => {
                                        onNavigate("project_suite");
                                      }, 1000);
                                    }}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-1.5 px-2 rounded-lg text-[10px] whitespace-nowrap transition-colors"
                                  >
                                    用于项目
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* ==================== HOME PAGE: TEMPLATE SUITE LIBRARY LIST ==================== */
        <div className="space-y-6">
          {/* Header Box */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 md:p-8 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 z-10 max-w-3xl">
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-white/10 rounded-full text-indigo-200 text-[10px] font-extrabold tracking-wider uppercase border border-white/5 mb-11">
                <Sparkle className="w-3 h-3 text-amber-300 animate-spin" />
                <span>智能成套规划</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-sans">
                模板套系库
              </h2>
              <p className="text-xs md:text-sm text-indigo-150 leading-relaxed max-w-xl">
                管理主图、SKU、详情图、包装图、尺寸材质图、场景图等成套电商视觉模板，保持整套图片风格统一。
              </p>
            </div>

            {/* Simulated Create New Template Button */}
            <div className="z-10 shrink-0 self-start md:self-center">
              <button
                id="create-new-suite-btn"
                onClick={() => {
                  showToast("已创建本地草稿套系，刷新页面后不会保留，后续将接入模板资产库保存。");
                  const newSuite: TemplateSuite = {
                    id: `suite_${Date.now()}`,
                    suiteName: "全新自定义企划套系",
                    styleName: "自定义 / 自由配饰",
                    category: "custom",
                    productType: "calendar",
                    coverImage: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop",
                    pages: [
                      {
                        id: `tp_${Date.now()}_main`,
                        pageName: "主视觉版首图 (main)",
                        pageType: "main",
                        templateId: "MAIN_001",
                        order: 1,
                        requiredAssetRoles: ["front"],
                        enabled: true
                      }
                    ],
                    globalStyle: {
                      colorPalette: ["#1e293b", "#3b82f6"],
                      fontStyle: "Modern Sans",
                      sceneStyle: "纯色极简",
                      lightDirection: "垂直散射官"
                    },
                    status: "draft"
                  };
                  setSuites([newSuite, ...suites]);
                }}
                className="bg-white text-slate-900 border border-slate-200/60 font-extrabold text-xs py-3 px-5 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer hover:bg-slate-50"
              >
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>创建全新成套套系</span>
              </button>
            </div>

            {/* Design accents backdrop */}
            <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-indigo-500/10 to-transparent pointer-events-none" />
          </div>

          {/* Filtering and Query Row */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            {/* First Row: Search input and basic controls */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search query box */}
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-450 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索套系名称 / 风格标签 / 产品类型"
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Stat Indicator banner */}
              <div className="text-[11px] text-slate-450 flex items-center space-x-1 font-medium select-none">
                <span>共找到</span>
                <span className="font-bold text-indigo-600 font-mono text-xs">{filteredSuites.length}</span>
                <span>个套系符合条件</span>
              </div>
            </div>

            {/* Second Row: Detailed filtration filters */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Product type filter */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">产品类型 :</label>
                <select
                  value={filterProductType}
                  onChange={(e) => setFilterProductType(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-600 font-medium focus:outline-none bg-slate-50 text-[11px]"
                >
                  <option value="all">全部产品类型</option>
                  <option value="calendar">台历</option>
                  <option value="wall_calendar">挂历</option>
                  <option value="gift_box">礼品盒</option>
                </select>
              </div>

              {/* Style category filter */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">视觉风格 :</label>
                <select
                  value={filterStyle}
                  onChange={(e) => setFilterStyle(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-600 font-medium focus:outline-none bg-slate-50 text-[11px]"
                >
                  <option value="all">全部视觉风格</option>
                  <option value="new_chinese">新中式</option>
                  <option value="business">商务</option>
                  <option value="festive_red">红金</option>
                  <option value="minimal">简约</option>
                  <option value="gift">节日礼品</option>
                  <option value="custom">定制</option>
                </select>
              </div>

              {/* Aspect Ratio Filter */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">画布比例 :</label>
                <select
                  value={filterRatio}
                  onChange={(e) => setFilterRatio(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-600 font-medium focus:outline-none bg-slate-50 text-[11px]"
                >
                  <option value="all">全部可用比例</option>
                  <option value="1:1">1:1</option>
                  <option value="3:4">3:4</option>
                  <option value="2:3">2:3</option>
                  <option value="9:16">9:16</option>
                </select>
              </div>

              {/* Status filter */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400">生命周期状态 :</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-600 font-medium focus:outline-none bg-slate-50 text-[11px]"
                >
                  <option value="all">全部生命状态</option>
                  <option value="enabled">已启用</option>
                  <option value="draft">草稿</option>
                  <option value="disabled">已禁用</option>
                </select>
              </div>
            </div>
          </div>

          {/* Core Categories Navigation Scroll row */}
          <div className="flex border-b border-slate-200 text-xs space-x-1 overflow-x-auto pb-1 select-none scrollbar-hide">
            {suiteCategories.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedSuiteId(null);
                }}
                className={`pb-2 px-3.5 font-bold border-b-2 whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "border-indigo-650 text-indigo-650"
                    : "border-transparent text-slate-450 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid display layout */}
          {filteredSuites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-200 rounded-2xl">
              <Layers className="w-10 h-10 text-slate-300 stroke-[1.5] mb-3" />
              <h3 className="text-sm font-bold text-slate-700">没有找到匹配的模板套系</h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                请尝试更换筛选条件或重置顶部的搜索过滤内容。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                const sortedSuites = [...filteredSuites].sort((a, b) => {
                  const isProdA = a.id === "suite_nc_001" || a.id === "suite_wall_002" || a.id === "suite_fu_003";
                  const isProdB = b.id === "suite_nc_001" || b.id === "suite_wall_002" || b.id === "suite_fu_003";
                  if (isProdA && !isProdB) return -1;
                  if (!isProdA && isProdB) return 1;
                  if (isProdA && isProdB) {
                    const order = ["suite_nc_001", "suite_wall_002", "suite_fu_003"];
                    return order.indexOf(a.id) - order.indexOf(b.id);
                  }
                  return 0;
                });
                return sortedSuites.map((suite) => {
                  const stats = getSuitePagesStats(suite.pages);
                  const ratios = getSuiteRatios(suite.pages);

                  return (
                    <div
                      key={suite.id}
                      className="bg-white border border-slate-201 hover:border-slate-300 rounded-2xl overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all min-h-[490px] h-auto"
                    >
                      {/* Cover graphic banner wrapper */}
                      <div className="relative h-40 w-full bg-slate-101 overflow-hidden group">
                        <img
                          src={suite.coverImage || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop"}
                          alt={suite.suiteName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Gradient mask */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                        {/* Top labels */}
                        <div className="absolute top-2.5 inset-x-2.5 flex justify-between items-center">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-md leading-relaxed shadow-sm">
                            {getProductTypeLabel(suite.productType)}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            {!(suite.id === "suite_nc_001" || suite.id === "suite_wall_002" || suite.id === "suite_fu_003") && (
                              <span className="inline-flex items-center py-0.5 px-1.5 bg-amber-500 text-white text-[9px] font-black rounded border border-amber-400 font-sans shadow-sm">
                                演示草稿
                              </span>
                            )}
                            {getStatusBadge(suite.status)}
                          </div>
                        </div>

                        {/* Display style metadata */}
                        <div className="absolute bottom-2 inset-x-3 text-white">
                          <span className="text-[9px] bg-black/60 backdrop-blur-xs text-amber-300 border border-amber-500/10 font-bold px-1.5 py-0.5 rounded font-mono">
                            {suite.styleName}
                          </span>
                        </div>
                      </div>

                      {/* Meta stats & descriptions */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 tracking-tight truncate max-w-[190px] flex items-center gap-1.5">
                              {suite.suiteName}
                              {!(suite.id === "suite_nc_001" || suite.id === "suite_wall_002" || suite.id === "suite_fu_003") && (
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 rounded hover:opacity-80 scale-95 origin-left shrink-0">演示</span>
                              )}
                            </h3>
                            <span className="text-[10px] text-slate-400 font-mono">{getCategoryLabel(suite.category)}风格</span>
                          </div>

                        {/* Page counts breakdown statistics tag list */}
                        <div className="grid grid-cols-3 gap-1.5 bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px]">
                          <div className="text-slate-500 text-center">
                            主图: <span className="font-bold text-slate-800">{stats.main}张</span>
                          </div>
                          <div className="text-slate-500 text-center">
                            SKU图: <span className="font-bold text-slate-800">{stats.sku}张</span>
                          </div>
                          <div className="text-slate-500 text-center">
                            详情图: <span className="font-bold text-slate-800">{stats.detail + stats.package + stats.size_material + stats.scene}张</span>
                          </div>
                        </div>

                        {/* 交付规则 */}
                        <div className="bg-indigo-50/50 border border-indigo-100/50 p-2.5 rounded-xl space-y-1 text-[10px]">
                          <span className="font-bold text-slate-700 block pb-0.5">交付规则 (套系要求) :</span>
                          {suite.expectedSliceCounts && Object.keys(suite.expectedSliceCounts).length > 0 ? (
                            <div className="space-y-0.5 text-slate-600 font-sans">
                              <div className="flex justify-between">
                                <span>1:1 主图卖点图:</span>
                                <span className="font-bold text-slate-800">≥ {suite.expectedSliceCounts.mainSquareMinCount || 0} 张</span>
                              </div>
                              <div className="flex justify-between">
                                <span>3:4 主图卖点图:</span>
                                <span className="font-bold text-slate-800">≥ {suite.expectedSliceCounts.mainVerticalMinCount || 0} 张</span>
                              </div>
                              <div className="flex justify-between border-t border-indigo-100 pt-0.5 font-bold text-indigo-900">
                                <span>主图卖点图合计:</span>
                                <span className="font-extrabold text-indigo-650">≥ {suite.expectedSliceCounts.mainMarketingTotalMinCount || 0} 张</span>
                              </div>
                              <div className="flex gap-x-2 pt-1">
                                <span className={`px-1 py-0.5 rounded text-[8.5px] font-medium leading-none ${suite.expectedSliceCounts.whiteBgRequired ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                                  白底精修: {suite.expectedSliceCounts.whiteBgRequired ? "必交付" : "可选"}
                                </span>
                                <span className={`px-1 py-0.5 rounded text-[8.5px] font-medium leading-none ${suite.expectedSliceCounts.transparentPngRequired ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                                  透明PNG: {suite.expectedSliceCounts.transparentPngRequired ? "必交付" : "可选"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-400 italic">该套系暂未配置完整交付规则</div>
                          )}
                        </div>

                        {/* 导出目录 */}
                        {suite.exportProfile?.folders && suite.exportProfile.folders.length > 0 ? (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-450 font-semibold block">正式导出目录 :</span>
                            <div className="flex flex-wrap gap-1 max-h-[46px] overflow-y-auto">
                              {suite.exportProfile.folders.map((folder, index) => (
                                <span key={index} className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-[8.5px] text-slate-650 rounded font-medium">
                                  {getExportFolderName(folder)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">该套系暂未配置完整交付规则</div>
                        )}

                        {/* Ratios & Required asset properties list */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-slate-400 font-semibold shrink-0">包含比例 :</span>
                            <div className="flex flex-wrap gap-1">
                              {ratios.map((r, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 bg-slate-101 border border-slate-200 rounded text-[9px] text-slate-600 font-bold font-mono"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card standard buttons row */}
                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => handleCopySuite(suite)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-400 hover:text-slate-700 rounded-xl flex items-center transition-all cursor-pointer"
                          title="复制套系"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedSuiteId(suite.id)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-2.5 rounded-xl text-[11px] flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                        >
                          <span>查看套系</span>
                        </button>

                        <button
                          id={`use-suite-${suite.id}`}
                          onClick={() => handleUseSuiteForNewProject(suite)}
                          className="bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold py-2 px-3 rounded-xl text-[11px] cursor-pointer shadow-sm shadow-indigo-600/5 hover:shadow-indigo-600/15"
                        >
                          <span>用于新项目</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          )}
        </div>
      )}
    </div>
  );
};
