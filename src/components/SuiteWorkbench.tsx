import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  FolderOpen,
  Layout,
  Check,
  X,
  ChevronRight,
  Download,
  Maximize2,
  FileJson,
  Layers,
  Settings2,
  Grid,
  Play,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Archive,
  Info,
  Calendar,
  CheckSquare
} from "lucide-react";
import {
  Template,
  Product,
  TemplateSuite,
  ProductAssetPack,
  GeneratedPage,
  GenerationProject,
  TemplatePageType,
  ProductAsset,
  ProductAssetRole,
  PageLayerInstance
} from "../types";
import { PRESET_TEMPLATE_SUITES, PRESET_PRODUCT_ASSET_PACKS } from "../data";
import { renderFullPreviewImage } from "../utils/renderTemplate";
import { LayeredCanvasWorkbench } from "./LayeredCanvasWorkbench";
import { getSuiteDeliveryCompleteness } from "../utils/businessRuleHelpers";

interface SuiteWorkbenchProps {
  products: Product[];
  templates: Template[];
  initialTemplateSuiteId?: string | null;
  onClearInitialSuiteId?: () => void;
}

export const SuiteWorkbench: React.FC<SuiteWorkbenchProps> = ({
  products,
  templates,
  initialTemplateSuiteId = null,
  onClearInitialSuiteId
}) => {
  // Preset references
  const [suites] = useState<TemplateSuite[]>(PRESET_TEMPLATE_SUITES);
  const [assetPacks, setAssetPacks] = useState<ProductAssetPack[]>(PRESET_PRODUCT_ASSET_PACKS);

  // Active Projects States
  const [projects, setProjects] = useState<GenerationProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // UI state
  const [subTab, setSubTab] = useState<"workspace" | "preview">("workspace");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedPackId, setSelectedPackId] = useState("");
  const [selectedSuiteId, setSelectedSuiteId] = useState("");

  // Editing single page variables
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [canvasEditingPageId, setCanvasEditingPageId] = useState<string | null>(null);
  const [editingXOffset, setEditingXOffset] = useState<number>(0);
  const [editingYOffset, setEditingYOffset] = useState<number>(0);
  const [editingScale, setEditingScale] = useState<number>(1);
  const [isRenderingPageId, setIsRenderingPageId] = useState<string | null>(null);

  // Review & Tweak overlay modal
  const [reviewNote, setReviewNote] = useState<string>("");
  const [singleRejectingPageId, setSingleRejectingPageId] = useState<string | null>(null);

  // Export Modal view
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [manifestData, setManifestData] = useState<any>(null);

  // Auto-respond when coming from Template Library with a pending template suite ID
  useEffect(() => {
    if (initialTemplateSuiteId && assetPacks.length > 0) {
      setSelectedSuiteId(initialTemplateSuiteId);
      setIsCreatingProject(true);
      
      // Auto-pre-select the first product pack assets if nothing is chosen yet
      if (!selectedPackId && assetPacks.length > 0) {
        setSelectedPackId(assetPacks[0].id);
        const specPack = assetPacks[0];
        setNewProjectName(`【项目-新品组装】${specPack.productName}`);
      }
      
      // Clean up the parent hook state immediately is crucial to avoid repeating dialog open
      if (onClearInitialSuiteId) {
        onClearInitialSuiteId();
      }
    }
  }, [initialTemplateSuiteId, assetPacks, onClearInitialSuiteId, selectedPackId]);

  // Initialize with a beautiful demo project so the UI doesn't look blank on load
  useEffect(() => {
    if (projects.length === 0 && assetPacks.length > 0 && suites.length > 0) {
      const defaultPack = assetPacks[0];
      const defaultSuite = suites[0];

      // Auto-matching algorithm for demo project
      const demoPages: GeneratedPage[] = defaultSuite.pages.map((page, index) => {
        const assignedIds = autoMatchAssetForPageType(page.pageType, defaultPack.assets);
        return {
          id: `gp_${Date.now()}_${index}`,
          projectId: "project_demo_01",
          templateSuiteId: defaultSuite.id,
          templatePageId: page.id,
          templateId: page.templateId,
          pageType: page.pageType,
          productId: defaultPack.productId,
          assignedAssetIds: assignedIds,
          fileUrl: "", // initially unrendered to allow clicking "Render Base Image"
          status: assignedIds.length > 0 ? "base_ready" : "needs_adjustment",
          order: page.order
        };
      });

      const demoProject: GenerationProject = {
        id: "project_demo_01",
        projectName: "【示范项目】策马奔腾新中式电商首推批量套系",
        productAssetPackId: defaultPack.id,
        templateSuiteId: defaultSuite.id,
        pages: demoPages,
        status: "layout_ready",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setProjects([demoProject]);
      setSelectedProjectId(demoProject.id);
    }
  }, [assetPacks, suites]);

  // Automated Matching Helper
  function autoMatchAssetForPageType(pageType: TemplatePageType, assets: ProductAsset[]): string[] {
    if (!assets || assets.length === 0) return [];
    
    let preferredRoles: ProductAssetRole[] = [];
    switch (pageType) {
      case "main":
        preferredRoles = ["main_product", "front"];
        break;
      case "sku":
        preferredRoles = ["sku_product", "front", "main_product"];
        break;
      case "package":
        preferredRoles = ["package", "combo"];
        break;
      case "detail_closeup":
        preferredRoles = ["detail_part", "combo"];
        break;
      case "scene":
        preferredRoles = ["front", "left_3_4", "right_3_4", "main_product"];
        break;
      case "size_material":
        preferredRoles = ["white_bg", "main_product"];
        break;
      default:
        preferredRoles = ["front", "sku_product", "main_product"];
    }

    for (const role of preferredRoles) {
      const found = assets.find((a) => a.assetRole === role);
      if (found) return [found.id];
    }

    // Fallbacks
    const pngAsset = assets.find((a) => a.assetType === "transparent_png");
    if (pngAsset) return [pngAsset.id];

    const anyAsset = assets[0];
    return anyAsset ? [anyAsset.id] : [];
  }

  // Find active project
  const activeProject = projects.find((p) => p.id === selectedProjectId);
  const activeSuite = activeProject ? suites.find((s) => s.id === activeProject.templateSuiteId) : null;
  const activePack = activeProject ? assetPacks.find((p) => p.id === activeProject.productAssetPackId) : null;

  const editingPage = activeProject?.pages.find((p) => p.id === editingPageId);
  const canvasEditingPage = activeProject?.pages.find((p) => p.id === canvasEditingPageId);

  const handleSavePageLayers = (
    pageId: string,
    layers: PageLayerInstance[],
    fileUrl?: string,
    status?: any
  ) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === selectedProjectId) {
          const updatedPages = proj.pages.map((p) => {
            if (p.id === pageId) {
              const updated: GeneratedPage = { ...p, layers };
              if (fileUrl) updated.fileUrl = fileUrl;
              if (status) updated.status = status;
              return updated;
            }
            return p;
          });
          return { ...proj, pages: updatedPages, updatedAt: new Date().toISOString() };
        }
        return proj;
      })
    );
  };

  if (canvasEditingPageId && canvasEditingPage && activeProject && activePack) {
    const targetProduct = products.find((p) => p.id === activePack.productId) || products[0];
    return (
      <LayeredCanvasWorkbench
        page={canvasEditingPage}
        allPages={activeProject.pages}
        productPack={activePack}
        templates={templates}
        product={targetProduct}
        onSavePageLayers={handleSavePageLayers}
        onClose={() => setCanvasEditingPageId(null)}
        onSwitchPage={(pageId) => setCanvasEditingPageId(pageId)}
      />
    );
  }

  // Handles creating a new project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !selectedPackId || !selectedSuiteId) {
      alert("请填写项目名称，并选择产品资产包、模板套系。");
      return;
    }

    const pack = assetPacks.find((p) => p.id === selectedPackId);
    const suite = suites.find((s) => s.id === selectedSuiteId);
    if (!pack || !suite) return;

    const projectId = `proj_${Date.now()}`;
    const generatedPages: GeneratedPage[] = suite.pages.map((page, index) => {
      const assignedIds = autoMatchAssetForPageType(page.pageType, pack.assets);
      return {
        id: `gp_${Date.now()}_${index}`,
        projectId,
        templateSuiteId: suite.id,
        templatePageId: page.id,
        templateId: page.templateId,
        pageType: page.pageType,
        productId: pack.productId,
        assignedAssetIds: assignedIds,
        status: assignedIds.length > 0 ? "base_ready" : "needs_adjustment",
        order: page.order
      };
    });

    const newProject: GenerationProject = {
      id: projectId,
      projectName: newProjectName,
      productAssetPackId: selectedPackId,
      templateSuiteId: selectedSuiteId,
      pages: generatedPages,
      status: "layout_ready",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProjects((prev) => [newProject, ...prev]);
    setSelectedProjectId(projectId);
    setIsCreatingProject(false);
    setNewProjectName("");
    setSubTab("workspace");
  };

  // Render Page Layout on Canvas on demand (using template rendering function)
  const handleRenderBaseImage = async (pageId: string) => {
    if (!activeProject || !activePack) return;
    const page = activeProject.pages.find((p) => p.id === pageId);
    if (!page) return;

    // Retrieve selected Product Asset details or general Product for rendering fallback
    const targetProduct = products.find((p) => p.id === activePack.productId);
    const targetTemplate = templates.find((t) => t.id === page.templateId);

    if (!targetProduct || !targetTemplate) {
      alert("关联的产品或模板不存在，无法进行离线合成渲染。");
      return;
    }

    setIsRenderingPageId(pageId);
    try {
      // Formulate a temporary Product containing the assigned transparent asset specifically
      const selectedAsset = activePack.assets.find((as) => page.assignedAssetIds.includes(as.id));
      
      let productToRender = { ...targetProduct };
      if (selectedAsset) {
        // Overlay the specific asset URL to transparent_png for rendering
        const overriddenAssets = targetProduct.assets.map((as) => 
          as.assetType === "transparent_png" ? { ...as, fileUrl: selectedAsset.fileUrl } : as
        );
        productToRender.assets = overriddenAssets;
      }

      const offsets = editingPageId === pageId ? {
        hOffset: editingXOffset,
        vOffset: editingYOffset,
        scale: editingScale
      } : undefined;

      const base64Img = await renderFullPreviewImage(productToRender, targetTemplate, offsets);
      
      // Update local storage representation
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id === activeProject.id) {
            const updatedPages = proj.pages.map((p) =>
              p.id === pageId ? { ...p, fileUrl: base64Img, status: "base_ready" as const } : p
            );
            return { ...proj, pages: updatedPages, updatedAt: new Date().toISOString() };
          }
          return proj;
        })
      );
    } catch (error) {
      console.error("生成基础图渲染失败:", error);
      alert("离线Canvas拼合主图发生错误");
    } finally {
      setIsRenderingPageId(null);
    }
  };

  const handleRenderWholeSuite = async () => {
    if (!activeProject) return;
    
    // sequential async process
    for (const page of activeProject.pages) {
      if (page.enabled !== false) {
        await handleRenderBaseImage(page.id);
      }
    }
  };

  // Helper swaps Template Suite
  const handleSwapSuite = (suiteId: string) => {
    if (!activeProject || !activePack) return;
    const suite = suites.find((s) => s.id === suiteId);
    if (!suite) return;

    const newPages: GeneratedPage[] = suite.pages.map((page, index) => {
      const assignedIds = autoMatchAssetForPageType(page.pageType, activePack.assets);
      return {
        id: `gp_swap_${Date.now()}_${index}`,
        projectId: activeProject.id,
        templateSuiteId: suite.id,
        templatePageId: page.id,
        templateId: page.templateId,
        pageType: page.pageType,
        productId: activePack.productId,
        assignedAssetIds: assignedIds,
        status: assignedIds.length > 0 ? "base_ready" : "needs_adjustment",
        order: page.order
      };
    });

    setProjects((prev) =>
      prev.map((proj) =>
        proj.id === activeProject.id
          ? {
              ...proj,
              templateSuiteId: suiteId,
              pages: newPages,
              updatedAt: new Date().toISOString()
            }
          : proj
      )
    );
  };

  // Single Page template swapper
  const handlePageTemplateChange = (pageId: string, templateId: string) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === selectedProjectId) {
          const updated = proj.pages.map((page) =>
            page.id === pageId ? { ...page, templateId, fileUrl: "" } : page
          );
          return { ...proj, pages: updated };
        }
        return proj;
      })
    );
  };

  // Single Page Asset Swapper
  const handlePageAssetSwap = (pageId: string, assetId: string) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === selectedProjectId) {
          const updated = proj.pages.map((page) =>
            page.id === pageId ? { ...page, assignedAssetIds: [assetId], fileUrl: "" } : page
          );
          return { ...proj, pages: updated };
        }
        return proj;
      })
    );
  };

  // Save specific placement tweaks
  const handleSaveTweaks = async (pageId: string) => {
    setEditingPageId(null);
    // Auto re-renders base layout to visually reflect changes
    await handleRenderBaseImage(pageId);
  };

  // Single Review approval callbacks
  const handleApprovePage = (pageId: string) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === selectedProjectId) {
          const updated = proj.pages.map((p) =>
            p.id === pageId ? { ...p, status: "approved" as const, reviewNote: "" } : p
          );
          return { ...proj, pages: updated };
        }
        return proj;
      })
    );
  };

  const handleTweakRequestPage = (pageId: string) => {
    setSingleRejectingPageId(pageId);
    setReviewNote("");
  };

  const submitTweakRequest = () => {
    if (!singleRejectingPageId) return;
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === selectedProjectId) {
          const updated = proj.pages.map((p) =>
            p.id === singleRejectingPageId
              ? { ...p, status: "needs_adjustment" as const, reviewNote }
              : p
          );
          return { ...proj, pages: updated };
        }
        return proj;
      })
    );
    setSingleRejectingPageId(null);
    setReviewNote("");
  };

  // Approve Whole Suite
  const handleApproveWholeSuite = () => {
    if (!activeProject) return;
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === activeProject.id) {
          const updated = proj.pages.map((p) => ({ ...p, status: "approved" as const }));
          return { ...proj, pages: updated, status: "approved" as const };
        }
        return proj;
      })
    );
  };

  // Package manifest generator & zip simulations
  const handleOpenExportModal = () => {
    if (!activeProject || !activePack) return;

    // Check if any element is not approved
    const unapproved = activeProject.pages.some((p) => p.status !== "approved");
    if (unapproved) {
      alert("❌ 套系内仍然存在未通过审核 (Approved) 的页面层，整套打包前请先审核通过所有页面。");
      return;
    }

    const m = {
      projectId: activeProject.id,
      productCode: activePack.productCode,
      productName: activePack.productName,
      templateSuiteId: activeProject.templateSuiteId,
      suiteName: activeSuite?.suiteName || "",
      exportedAt: new Date().toISOString(),
      themeCategory: activeSuite?.category,
      files: activeProject.pages.map((p, i) => {
        const fileExt = "png";
        const categoryDir = 
          p.pageType === "main" ? "主图" : 
          p.pageType === "sku" ? "SKU" : 
          p.pageType === "detail" ? "详情图" : 
          p.pageType === "detail_closeup" ? "详情图" : 
          p.pageType === "package" ? "包装图" : 
          p.pageType === "size_material" ? "尺寸材质" : "场景图";

        return {
          pageType: p.pageType,
          templateId: p.templateId,
          assignedAssetIds: p.assignedAssetIds,
          reviewStatus: p.status,
          exportFileName: `/${categoryDir}/${activePack.productCode}_${p.pageType}_${i+1}.${fileExt}`,
          resolution: "800x800 px"
        };
      })
    };

    setManifestData(m);
    setExportModalOpen(true);
  };

  const handleDownloadFiles = () => {
    alert("📦 整套电商图片包与 manifest.json 指引清单已打包完成！即将开始自动下载压缩包。");
    setExportModalOpen(false);

    // set project status as exported
    setProjects((prev) =>
      prev.map((p) => (p.id === selectedProjectId ? { ...p, status: "exported" as const } : p))
    );
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Upper Status & Project Breadcrumb control */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 border border-slate-200/80 rounded-2xl gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-indigo-600">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">项目工作台</span>
          </div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              {activeProject ? activeProject.projectName : "没有选中的生产项目"}
            </h2>
            {activeProject && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeProject.status === "exported" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                activeProject.status === "approved" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                "bg-blue-50 text-blue-700 border border-blue-200"
              }`}>
                {activeProject.status === "exported" ? "✅ 已归档导出" :
                 activeProject.status === "approved" ? "✨ 审核通过" : "⚙️ 烘焙中 / 装配中"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">当前项目：</span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSubTab("workspace");
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 text-slate-705"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingProject(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>新建生产项目</span>
          </button>
        </div>
      </div>

      {/* Creation Modal */}
      {isCreatingProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="font-extrabold text-slate-900 text-sm">创建新的一整套电商套系生成项目</span>
              <button
                type="button"
                onClick={() => setIsCreatingProject(false)}
                className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs text-left">
              <div className="space-y-1">
                <label className="block text-slate-600 font-bold">项目名称</label>
                <input
                  type="text"
                  required
                  placeholder="如：250g喜庆烫金台历批量详情页生成项目"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-bold">1. 绑定产品资产包 (ProductAssetPack)</label>
                <select
                  required
                  value={selectedPackId}
                  onChange={(e) => {
                    setSelectedPackId(e.target.value);
                    // Match default project name
                    const specPack = assetPacks.find((p) => p.id === e.target.value);
                    if (specPack) {
                      setNewProjectName(`【套系项目】${specPack.productName} 商业电商图全套方案`);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- 请选择产品原图资产包 --</option>
                  {assetPacks.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.productName} (包ID: {pack.id}, {pack.assets.length}张白底/PNG)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-600 font-bold">2. 选配目标模板套系 (TemplateSuite)</label>
                <select
                  required
                  value={selectedSuiteId}
                  onChange={(e) => setSelectedSuiteId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- 请选择模板套系 (自动匹配多页布局) --</option>
                  {suites.map((suite) => (
                    <option key={suite.id} value={suite.id}>
                      {suite.suiteName} ({suite.styleName}, 共{suite.pages.length}张页面模板)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-1">
                <span className="font-bold text-indigo-805 block">⚙️ 智能装配说明：</span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  系统将读取资产包中的 <code>assetRole</code> 参数并根据各页面对应的角色要求 (如 <code>main_product</code>、<code>sku_product</code>、<code>package</code>) 进行首轮自动映射，一键产生全部详情结构。
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer transition-colors"
                >
                  自动组装并开始
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Main Tabs switcher */}
      {activeProject && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left panel: Suite metadata quick card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="font-black text-slate-900 border-l-4 border-indigo-600 pl-2 block text-sm">
                📌 套系配置清单
              </span>

              {activeSuite && (
                <div className="space-y-3.5 pt-1 text-xs">
                  <div>
                    <span className="text-slate-400 block">套系名称：</span>
                    <span className="font-bold text-slate-800">{activeSuite.suiteName}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">设计风格：</span>
                    <span className="font-semibold text-slate-800">{activeSuite.styleName}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">调色盘预置：</span>
                    <div className="flex items-center space-x-1 mt-1">
                      {activeSuite.globalStyle.colorPalette.map((col) => (
                        <span
                          key={col}
                          className="w-4 h-4 rounded-full border border-slate-100"
                          style={{ backgroundColor: col }}
                          title={col}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">光影环境氛围：</span>
                    <span className="font-semibold text-slate-800">{activeSuite.globalStyle.sceneStyle}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">光源方向配置：</span>
                    <span className="font-semibold text-slate-800">{activeSuite.globalStyle.lightDirection}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 block font-medium">一键替换整套模板：</span>
                    <select
                      value={activeSuite.id}
                      onChange={(e) => handleSwapSuite(e.target.value)}
                      className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded p-1 text-[11px]"
                    >
                      {suites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.suiteName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <span className="font-black text-slate-900 border-l-4 border-emerald-600 pl-2 block text-sm">
                📦 绑定产品原图
              </span>

              {activePack && (
                <div className="space-y-3 pt-1 text-xs text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-500">产品编号:</span>
                    <span className="font-mono text-slate-800 font-bold">{activePack.productCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">产品名称:</span>
                    <span className="font-bold text-slate-800">{activePack.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">检测资源:</span>
                    <span className="text-slate-800">{activePack.assets.length}张切片 asset</span>
                  </div>
                </div>
              )}
            </div>

            {/* 交付完整性校验 card */}
            {activeProject && activeSuite && (
              (() => {
                const completeness = getSuiteDeliveryCompleteness(activeSuite, activeProject.pages, activePack);
                const { planning, output } = completeness;

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                        <span>🏷️ 交付完整性双层校验</span>
                      </span>
                      {output.isOutputComplete ? (
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50 font-bold">完全达标</span>
                      ) : planning.isPlanningComplete ? (
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-250/50 font-bold">规划达标</span>
                      ) : (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50 font-bold">规划待达标</span>
                      )}
                    </div>

                    {/* 模块 1：套系页面规划检查 */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                        <span className="text-xs font-bold text-slate-700">1. 套系页面规划检查</span>
                        {planning.isPlanningComplete ? (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 font-medium px-1.5 py-0.5 rounded border border-emerald-200/40">已规划足额</span>
                        ) : (
                          <span className="text-[10px] text-amber-600 bg-amber-50 font-medium px-1.5 py-0.5 rounded border border-amber-250/40">需要补充</span>
                        )}
                      </div>

                      <div className="space-y-2 pt-0.5 text-xs">
                        {/* 1:1方形规划 */}
                        <div className="flex justify-between items-center text-[11pt]">
                          <span className="text-slate-500">1:1 主图卖点图</span>
                          <span className={`font-mono font-bold ${planning.mainSquareMissing > 0 ? "text-amber-600" : "text-slate-700"}`}>
                            已规划 {planning.mainSquareCurrent} / 要求 {planning.mainSquareRequired}
                          </span>
                        </div>

                        {/* 3:4竖版规划 */}
                        <div className="flex justify-between items-center text-[11pt]">
                          <span className="text-slate-500">3:4 主图卖点图</span>
                          <span className={`font-mono font-bold ${planning.mainVerticalMissing > 0 ? "text-amber-600" : "text-slate-700"}`}>
                            已规划 {planning.mainVerticalCurrent} / 要求 {planning.mainVerticalRequired}
                          </span>
                        </div>

                        {/* 合计规划 */}
                        <div className="flex justify-between items-center text-[11pt] font-medium border-t border-slate-100 pt-1.5">
                          <span className="text-slate-700 font-bold">主图卖点图合计</span>
                          <span className={`font-mono font-bold ${planning.mainMarketingTotalMissing > 0 ? "text-amber-650" : "text-indigo-600 font-extrabold"}`}>
                            已规划 {planning.mainMarketingTotalCurrent} / 要求 {planning.mainMarketingTotalRequired}
                          </span>
                        </div>

                        {/* 白底精修交付项规划 */}
                        <div className="flex justify-between items-center text-[11pt] border-t border-slate-100 pt-1.5">
                          <span className="text-slate-500">白底精修交付项</span>
                          <span className={`font-bold ${planning.hasWhiteBgPlan ? "text-emerald-600" : "text-amber-600"}`}>
                            {planning.hasWhiteBgPlan ? "已规划" : "缺失"}
                          </span>
                        </div>

                        {/* 透明PNG交付项规划 */}
                        <div className="flex justify-between items-center text-[11pt]">
                          <span className="text-slate-500">透明PNG交付项</span>
                          <span className={`font-bold ${planning.hasTransparentPngPlan ? "text-emerald-600" : "text-amber-600"}`}>
                            {planning.hasTransparentPngPlan ? "已规划" : "缺失"}
                          </span>
                        </div>
                      </div>

                      {/* Planning alerts/success */}
                      {planning.isPlanningComplete ? (
                        <div className="p-2 bg-emerald-50 text-[10px] text-emerald-700 rounded-lg border border-emerald-100 flex items-start gap-1 font-medium">
                          <span className="leading-none text-xs">✓</span>
                          <span>当前页面规划已满足套系基础交付要求。</span>
                        </div>
                      ) : (
                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 space-y-1">
                          <div className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
                            <span>⚠️</span>
                            <span>当前页面规划未满足套系基础交付要求：</span>
                          </div>
                          <ul className="list-disc pl-4 text-[9.5px] text-amber-700 space-y-0.5 font-medium leading-normal">
                            {planning.warnings.map((warn, idx) => (
                              <li key={idx}>{warn}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* 分割线 */}
                    <div className="border-t border-slate-100 my-2"></div>

                    {/* 模块 2：成品交付检查 */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-slate-55 p-2 rounded-lg">
                        <span className="text-xs font-bold text-slate-700">2. 成品交付检查</span>
                        {output.isOutputComplete ? (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 font-medium px-1.5 py-0.5 rounded border border-emerald-200/40">已完全生成</span>
                        ) : (
                          <span className="text-[10px] text-amber-655 bg-amber-50 font-medium px-1.5 py-0.5 rounded border border-amber-250/30">待生成补齐</span>
                        )}
                      </div>

                      <div className="space-y-2 pt-0.5 text-xs">
                        {/* 1:1方形成品 */}
                        <div className="flex justify-between items-center text-[11pt]">
                          <span className="text-slate-500">1:1 主图卖点图</span>
                          <span className={`font-mono font-bold ${output.mainSquareOutputMissing > 0 ? "text-amber-600" : "text-slate-700"}`}>
                            已生成 {output.mainSquareOutputCurrent} / 要求 {output.mainSquareRequired}
                          </span>
                        </div>

                        {/* 3:4竖版成品 */}
                        <div className="flex justify-between items-center text-[11pt]">
                          <span className="text-slate-500">3:4 主图卖点图</span>
                          <span className={`font-mono font-bold ${output.mainVerticalOutputMissing > 0 ? "text-amber-600" : "text-slate-700"}`}>
                            已生成 {output.mainVerticalOutputCurrent} / 要求 {output.mainVerticalRequired}
                          </span>
                        </div>

                        {/* 合计成品 */}
                        <div className="flex justify-between items-center text-[11pt] font-medium border-t border-slate-100 pt-1.5">
                          <span className="text-slate-700 font-bold">主图卖点图合计</span>
                          <span className={`font-mono font-bold ${output.mainMarketingOutputMissing > 0 ? "text-amber-650" : "text-indigo-600 font-extrabold"}`}>
                            已生成 {output.mainMarketingOutputCurrent} / 要求 {output.mainMarketingTotalRequired}
                          </span>
                        </div>

                        {/* 白底精修成品 */}
                        <div className="flex justify-between items-center text-[11pt] border-t border-slate-100 pt-1.5">
                          <span className="text-slate-500">白底精修成品</span>
                          <span className={`font-bold ${output.hasWhiteBgOutput ? "text-emerald-600" : "text-amber-600"}`}>
                            {output.hasWhiteBgOutput ? "已生成" : "缺失"}
                          </span>
                        </div>

                        {/* 透明PNG成品 */}
                        <div className="flex justify-between items-center text-[11pt]">
                          <span className="text-slate-500">透明PNG成品</span>
                          <span className={`font-bold ${output.hasTransparentPngOutput ? "text-emerald-600" : "text-amber-600"}`}>
                            {output.hasTransparentPngOutput ? "已生成" : "缺失"}
                          </span>
                        </div>
                      </div>

                      {/* Output alerts/success */}
                      {output.isOutputComplete ? (
                        <div className="p-2 bg-emerald-50 text-[10px] text-emerald-700 rounded-lg border border-emerald-100 flex items-start gap-1 font-medium">
                          <span className="leading-none text-xs">✓</span>
                          <span>当前成品已满足基础交付要求。</span>
                        </div>
                      ) : (
                        <div className="p-2 bg-amber-50/50 rounded-lg border border-amber-100/70 space-y-1">
                          <div className="text-[10px] text-amber-850 font-bold flex items-center gap-1">
                            <span>⚠️</span>
                            <span>当前成品尚未满足基础交付要求，可继续生成或补充素材：</span>
                          </div>
                          <ul className="list-disc pl-4 text-[9.5px] text-amber-700 space-y-0.5 font-medium leading-normal">
                            {output.warnings.map((warn, idx) => (
                              <li key={idx}>{warn}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Right panel: Tab views */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200/80 bg-white px-5 py-3 rounded-xl shadow-sm">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setSubTab("workspace")}
                  className={`py-1.5 px-4 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                    subTab === "workspace"
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  🛠️ 单页画布编辑
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab("preview")}
                  className={`py-1.5 px-4 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                    subTab === "preview"
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  👁️ 整套总预览与审核
                </button>
              </div>

              {subTab === "workspace" && (
                <button
                  type="button"
                  onClick={handleRenderWholeSuite}
                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-extrabold py-1 px-3.5 rounded-lg text-xs cursor-pointer transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>一键重新生成整套底图</span>
                </button>
              )}
            </div>

            {subTab === "workspace" ? (
              <div className="space-y-4">
                {activeProject.pages.map((page, pIdx) => {
                  const targetTemplate = templates.find((t) => t.id === page.templateId);
                  
                  return (
                    <div
                      key={page.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow flex flex-col md:flex-row gap-5"
                    >
                      {/* Left thumbnail: Page View */}
                      <div className="w-full md:w-44 h-44 shrink-0 bg-slate-50 border rounded-xl overflow-hidden relative flex items-center justify-center">
                        {page.fileUrl ? (
                          <img
                            src={page.fileUrl}
                            alt={page.pageName}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-center p-4 space-y-2">
                            <span className="text-slate-350 block text-[24px]">📺</span>
                            <span className="text-[10px] text-slate-400 block font-medium">尚未渲染底图</span>
                          </div>
                        )}

                        <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono leading-none">
                          No.{pIdx + 1}
                        </span>

                        <span className={`absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          page.status === "approved" ? "bg-emerald-500 text-white" :
                          page.status === "needs_adjustment" ? "bg-amber-500 text-slate-950" :
                          "bg-slate-400 text-white"
                        }`}>
                          {page.status === "approved" ? "已通过" :
                           page.status === "needs_adjustment" ? "待调整" : "已就绪"}
                        </span>
                      </div>

                      {/* Right Settings: Assembler UI */}
                      <div className="flex-1 space-y-4 text-left">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-2 gap-2">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded">
                              {page.pageType.toUpperCase()}
                            </span>
                            <h4 className="text-sm font-black text-slate-900 mt-1.5">
                              {page.pageName}
                            </h4>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setCanvasEditingPageId(page.id)}
                              className="bg-indigo-650 hover:bg-indigo-600 text-white py-1.5 px-3 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1 shadow transition-all active:scale-95"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>进入分层画布编辑</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (editingPageId === page.id) {
                                  handleSaveTweaks(page.id);
                                } else {
                                  setEditingPageId(page.id);
                                  setEditingXOffset(0);
                                  setEditingYOffset(0);
                                  setEditingScale(1.0);
                                }
                              }}
                              className={`py-1.5 px-3 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
                                editingPageId === page.id ? "bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                              }`}
                            >
                              {editingPageId === page.id ? "保存微调" : "位置微调旧面板"}
                            </button>

                            <button
                              type="button"
                              disabled={isRenderingPageId === page.id}
                              onClick={() => handleRenderBaseImage(page.id)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-1.5 px-3 rounded-lg text-xs font-extrabold cursor-pointer flex items-center space-x-1 transition-colors"
                            >
                              {isRenderingPageId === page.id ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>渲染中...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5" />
                                  <span>一键离线合成</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {editingPageId === page.id && (
                          <div className="p-3 bg-slate-50 border rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
                            <div className="space-y-1">
                              <span className="text-slate-500">水平偏移 (x): {editingXOffset}%</span>
                              <input
                                type="range"
                                min="-40"
                                max="40"
                                value={editingXOffset}
                                onChange={(e) => setEditingXOffset(Number(e.target.value))}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1">
                              <span className="text-slate-500">垂直偏移 (y): {editingYOffset}%</span>
                              <input
                                type="range"
                                min="-40"
                                max="40"
                                value={editingYOffset}
                                onChange={(e) => setEditingYOffset(Number(e.target.value))}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1">
                              <span className="text-slate-500">缩放倍率: {editingScale.toFixed(2)}x</span>
                              <input
                                type="range"
                                min="0.4"
                                max="2"
                                step="0.05"
                                value={editingScale}
                                onChange={(e) => setEditingScale(Number(e.target.value))}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Template Swapper */}
                          <div className="space-y-1">
                            <span className="text-slate-500 block font-bold">1. 选配单页模板</span>
                            <select
                              value={page.templateId}
                              onChange={(e) => handlePageTemplateChange(page.id, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
                            >
                              {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.templateName} ({t.aspectRatio})
                                </option>
                              ))}
                            </select>
                            {targetTemplate && (
                              <span className="text-[10px] text-slate-400 block">
                                画布规格: {targetTemplate.outputWidth}x{targetTemplate.outputHeight} px
                              </span>
                            )}
                          </div>

                          {/* Product Asset Matcher Selector */}
                          <div className="space-y-1">
                            <span className="text-slate-500 block font-bold">2. 选装产品切片资产</span>
                            <select
                              value={page.assignedAssetIds[0] || ""}
                              onChange={(e) => handlePageAssetSwap(page.id, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="">-- 未选装切片 ( fallback 默认图 ) --</option>
                              {activePack?.assets.map((as) => (
                                <option key={as.id} value={as.id}>
                                  {as.assetRole || "white_bg"} ({as.fileUrl}.png)
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] text-indigo-600 font-bold block">
                              套图角色要求: <code>{JSON.stringify(page.requiredAssetRoles)}</code>
                            </span>
                          </div>
                        </div>

                        {page.reviewNote && (
                          <div className="p-2.5 bg-amber-50 border border-amber-250 rounded-lg text-[11px] text-amber-800 flex items-start space-x-1">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span><strong>审核退回建议：</strong>{page.reviewNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* SuitePreview Component */
              <div className="space-y-6">
                <SuitePreview
                  project={activeProject}
                  templates={templates}
                  products={products}
                  assetPack={activePack}
                  onApprovePage={handleApprovePage}
                  onTweakRequest={handleTweakRequestPage}
                />

                {/* Footer bulk actions */}
                <div className="bg-white border rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center space-x-2 text-slate-500 text-xs text-left">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>
                      整套套系包含 <strong>{activeProject.pages.length}</strong> 张图片，当前已通过审核 <strong>{activeProject.pages.filter(p => p.status === 'approved').length}</strong> 张。所有图层获批后方可部署提取。
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleApproveWholeSuite}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      ✨ 整套快速审核通过
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenExportModal}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-5 rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>打包并最终提取部署</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tweak Request Reason Dialog */}
      {singleRejectingPageId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border shadow-xl space-y-4">
            <span className="font-extrabold text-slate-900 text-sm block text-left">退回微调建议</span>
            <div className="space-y-2 text-xs text-left">
              <label className="text-slate-500">请输入要求修改微调的描述，将同步存留存工作台供后续返修参考：</label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                placeholder="例如：产品摆放位置过高折叠，请微调向下偏移 5% 左右，再重新渲染。"
                className="w-full bg-slate-50 border rounded-lg p-2 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => setSingleRejectingPageId(null)}
                className="px-3 py-1.5 border rounded-lg cursor-pointer font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submitTweakRequest}
                className="px-3.5 py-1.5 bg-amber-500 text-slate-950 rounded-lg cursor-pointer font-bold"
              >
                确定并退回
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Package Export ZIP Modal with directory preview! */}
      {exportModalOpen && manifestData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 text-slate-100 rounded-3xl max-w-2xl w-full p-6 border border-slate-800 shadow-2xl space-y-5 my-8 text-left font-sans"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Archive className="w-5 h-5" />
                <span className="font-black text-white text-base tracking-tight">Enterprise ZIP 电商大包快速构建中</span>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">系统打包配置文件: JSON Manifesto</span>
                <div className="font-mono text-[10px] text-rose-400 max-h-56 overflow-y-auto p-2 bg-slate-900 rounded-lg whitespace-pre border border-slate-950 select-text">
                  {JSON.stringify(manifestData, null, 2)}
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3.5">
                <span className="text-slate-400 font-bold block uppercase tracking-wider text-[10px]">输出文件树形结构预览</span>
                
                <div className="font-mono text-[11px] text-slate-300 space-y-2 max-h-56 overflow-y-auto pr-1">
                  <div className="text-emerald-400 font-bold">📂 export_bundle_{activePack?.productCode}.zip</div>
                  <div className="pl-3 text-indigo-400 font-semibold">📄 manifest.json <span className="text-slate-600 text-[10px]">(套系元指示器)</span></div>
                  
                  {/* Categorized zip representation */}
                  <div className="pl-3 text-amber-500 font-bold">📂 主图 (Main_Hero)</div>
                  {manifestData.files.filter((f: any) => f.pageType === "main").map((f: any, idx: number) => (
                    <div key={idx} className="pl-6 text-slate-400 text-[10.5px]">📄 {f.exportFileName.split("/").pop()}</div>
                  ))}

                  <div className="pl-3 text-amber-500 font-bold mt-1">📂 SKU (Variants)</div>
                  {manifestData.files.filter((f: any) => f.pageType === "sku").map((f: any, idx: number) => (
                    <div key={idx} className="pl-6 text-slate-400 text-[10.5px]">📄 {f.exportFileName.split("/").pop()}</div>
                  ))}

                  <div className="pl-3 text-amber-500 font-bold mt-1">📂 详情图 (Details)</div>
                  {manifestData.files.filter((f: any) => f.pageType === "detail" || f.pageType === "detail_closeup").map((f: any, idx: number) => (
                    <div key={idx} className="pl-6 text-slate-400 text-[10.5px]">📄 {f.exportFileName.split("/").pop()}</div>
                  ))}

                  <div className="pl-3 text-amber-500 font-bold mt-1">📂 包装 & 物流 (Package)</div>
                  {manifestData.files.filter((f: any) => f.pageType === "package").map((f: any, idx: number) => (
                    <div key={idx} className="pl-6 text-slate-400 text-[10.5px]">📄 {f.exportFileName.split("/").pop()}</div>
                  ))}

                  <div className="pl-3 text-amber-500 font-bold mt-1">📂 尺寸材质 & 参数 (Specs)</div>
                  {manifestData.files.filter((f: any) => f.pageType === "size_material").map((f: any, idx: number) => (
                    <div key={idx} className="pl-6 text-slate-400 text-[10.5px]">📄 {f.exportFileName.split("/").pop()}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-lg text-xs cursor-pointer font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDownloadFiles}
                className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-black rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>立即下载压缩套箱大包</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

/* --- SUB COMPONENT SuitePreview --- */
interface SuitePreviewProps {
  project: GenerationProject;
  templates: Template[];
  products: Product[];
  assetPack: ProductAssetPack | null;
  onApprovePage: (pageId: string) => void;
  onTweakRequest: (pageId: string) => void;
}

const SuitePreview: React.FC<SuitePreviewProps> = ({
  project,
  templates,
  products,
  assetPack,
  onApprovePage,
  onTweakRequest
}) => {
  // Category Groups
  const categories = [
    { title: "主图 (Hero Page)", types: ["main"] },
    { title: "SKU大板 (SKUs)", types: ["sku"] },
    { title: "详情图展示 (Details Layout)", types: ["detail", "detail_closeup"] },
    { title: "包装演示 (Gift-Box Packaging)", types: ["package"] },
    { title: "尺寸材质 (Specifications & Sizing)", types: ["size_material"] },
    { title: "场景摆放 (Atmosphere Scenes)", types: ["scene"] }
  ];

  return (
    <div className="space-y-6">
      {categories.map((cat, idx) => {
        // filter pages belonging to types
        const pagesInCat = project.pages.filter((page) => cat.types.includes(page.pageType));
        if (pagesInCat.length === 0) return null;

        return (
          <div key={idx} className="space-y-3 text-left">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Grid className="w-3.5 h-3.5 text-indigo-500" />
              <span>{cat.title} ({pagesInCat.length}张)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pagesInCat.map((page, index) => {
                const targetTemplate = templates.find((t) => t.id === page.templateId);
                const assignedAsset = assetPack?.assets.find((as) => page.assignedAssetIds.includes(as.id));

                // prioritize: finalCompositeUrl -> aiFusionUrl -> fileUrl
                const displayUrl = page.finalCompositeUrl || page.aiFusionUrl || page.fileUrl;

                return (
                  <div
                    key={page.id}
                    className="bg-white border select-none border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-slate-300 transition-colors"
                  >
                    {/* Top Canvas aspect square placeholder */}
                    <div className="aspect-square bg-slate-50 border-b relative flex items-center justify-center p-4">
                      {displayUrl ? (
                        <img
                          src={displayUrl}
                          alt={page.pageName}
                          className="w-full h-full object-contain max-h-80"
                        />
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <Eye className="w-8 h-8 text-slate-305 mx-auto" />
                          <span className="text-[11px] text-slate-400 font-bold block">尚未渲染或产生底图</span>
                        </div>
                      )}

                      {/* Status indicator pill */}
                      <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase leading-none text-white ${
                        page.status === "approved" ? "bg-emerald-500" :
                        page.status === "needs_adjustment" ? "bg-amber-500 text-slate-950" :
                        "bg-slate-500"
                      }`}>
                        {page.status === "approved" ? "批准并通过" :
                         page.status === "needs_adjustment" ? "已退回待微调" : "未决策等候中"}
                      </span>
                    </div>

                    {/* Metadata summary & details */}
                    <div className="p-4 flex-1 space-y-3.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-indigo-600 font-bold">{page.pageType}</span>
                        <h4 className="text-xs font-black text-slate-900 leading-tight">
                          {page.pageName}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 pt-1">
                          <span>模板: {targetTemplate?.templateName || "未选"}</span>
                          <span>•</span>
                          <span>角标: {assignedAsset?.assetRole || "未装配"}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between text-xs gap-2">
                        {page.status === "approved" ? (
                          <div className="flex items-center space-x-1.5 text-emerald-600 font-extrabold text-[11px]">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            <span>该页面已批准归档清单</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                            <Info className="w-4 h-4 shrink-0" />
                            <span>等候进行产品审核决策</span>
                          </div>
                        )}

                        <div className="flex space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onTweakRequest(page.id)}
                            className="p-1 px-2 text-[10.5px] border font-bold hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer flex items-center gap-0.5"
                          >
                            <ThumbsDown className="w-3 h-3 text-amber-500" />
                            <span>退回</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onApprovePage(page.id)}
                            className="p-1 px-2 text-[10.5px] bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-lg cursor-pointer flex items-center gap-0.5"
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span>批准</span>
                          </button>
                        </div>
                      </div>
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
};
