import React, { useState } from "react";
import { motion } from "motion/react";
import { Sidebar } from "./components/Sidebar";
import { Workspace } from "./components/Workspace";
import { AssetLibrary } from "./components/AssetLibrary";
import { WhiteBgRefine } from "./components/WhiteBgRefine";
import { TemplateLibrary } from "./components/TemplateLibrary";
import { TemplateEditor } from "./components/TemplateEditor";
import { BatchGenerator } from "./components/BatchGenerator";
import { ReviewCenter } from "./components/ReviewCenter";
import { ExportCenter } from "./components/ExportCenter";
import { DataStatistics, SystemSettings } from "./components/SystemViews";
import { INITIAL_PRODUCTS, PRESET_TEMPLATES } from "./data";
import { Product, Template, GenerationTask, GeneratedImage, ProductAsset } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("workspace");

  // Core Global States
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [templates, setTemplates] = useState<Template[]>(PRESET_TEMPLATES);

  // Set up active selection bridges between views
  const [selectedProductForRefine, setSelectedProductForRefine] = useState<Product | null>(null);
  const [selectedTemplateForEditor, setSelectedTemplateForEditor] = useState<Template | null>(null);

  // Initial active background rendering tasks
  const [tasks, setTasks] = useState<GenerationTask[]>([
    {
      id: "task_1",
      taskName: "2026年度款国潮大主图批量套版系列",
      productIds: ["prod_060", "prod_062"],
      templateIds: ["MAIN_001"],
      totalCount: 40,
      completedCount: 18,
      failedCount: 0,
      pendingReviewCount: 18,
      status: "running",
      createdAt: new Date().toISOString(),
      progress: 45
    },
    {
      id: "task_2",
      taskName: "商务极简系列 1:1 标准SKU配图",
      productIds: ["prod_061"],
      templateIds: ["SKU_001"],
      totalCount: 50,
      completedCount: 50,
      failedCount: 0,
      pendingReviewCount: 0,
      status: "completed",
      createdAt: new Date().toISOString(),
      progress: 100
    }
  ]);

  // Seed 6 initial generated images so the Review Center looks beautifully populated and useful on open!
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([
    {
      id: "img_seed_1",
      productId: "prod_060",
      templateId: "MAIN_001",
      imageType: "main",
      fileUrl: "url",
      width: 800,
      height: 800,
      reviewStatus: "pending",
      qualityIssues: [],
      createdAt: new Date().toISOString()
    },
    {
      id: "img_seed_2",
      productId: "prod_061",
      templateId: "MAIN_003",
      imageType: "main",
      fileUrl: "url",
      width: 800,
      height: 800,
      reviewStatus: "pending",
      qualityIssues: ["产品尺寸偏小，后景副台历线圈被大面积遮挡穿模"],
      createdAt: new Date().toISOString(),
      horizontalOffset: -4,
      verticalOffset: 2,
      scaleFactor: 0.85
    },
    {
      id: "img_seed_3",
      productId: "prod_062",
      templateId: "SKU_001",
      imageType: "sku",
      fileUrl: "url",
      width: 800,
      height: 800,
      reviewStatus: "approved",
      qualityIssues: [],
      createdAt: new Date().toISOString()
    },
    {
      id: "img_seed_4",
      productId: "prod_064",
      templateId: "DETAIL_001",
      imageType: "detail",
      fileUrl: "url",
      width: 750,
      height: 1000,
      reviewStatus: "pending",
      qualityIssues: ["材质参数文字长度溢出，底部多线标记越界"],
      createdAt: new Date().toISOString()
    },
    {
      id: "img_seed_5",
      productId: "prod_067",
      templateId: "MAIN_002",
      imageType: "main",
      fileUrl: "url",
      width: 800,
      height: 800,
      reviewStatus: "approved",
      qualityIssues: [],
      createdAt: new Date().toISOString()
    },
    {
      id: "img_seed_6",
      productId: "prod_060",
      templateId: "DETAIL_002",
      imageType: "detail",
      fileUrl: "url",
      width: 700,
      height: 933,
      reviewStatus: "pending",
      qualityIssues: [],
      createdAt: new Date().toISOString()
    }
  ]);

  // Global modifiers triggers
  const handleAddProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleUpdateProductStatus = (
    productId: string,
    newStatus: Product["status"],
    newAssets: ProductAsset[]
  ) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return { ...p, status: newStatus, assets: newAssets };
        }
        return p;
      })
    );
  };

  const handleSaveTemplate = (updatedTemp: Template) => {
    setTemplates((prev) => prev.map((t) => (t.id === updatedTemp.id ? updatedTemp : t)));
  };

  const handleCloneTemplate = (temp: Template) => {
    const cloned: Template = {
      ...temp,
      id: `TEMP_CLONE_${Date.now()}`,
      templateName: `${temp.templateName} (副本)`
    };
    setTemplates((prev) => [...prev, cloned]);
    alert(`【模板复制成功】已复制「${temp.templateName}」为「${cloned.templateName}」在模板库底部。`);
  };

  // Launching generation wizard binds
  const handleStartWorkflow = (newTask: GenerationTask, syntheticImages: GeneratedImage[]) => {
    setTasks((prev) => [newTask, ...prev]);
    setGeneratedImages((prev) => [...syntheticImages, ...prev]);
    // Set dynamic badge active counts
  };

  const handleUpdateImage = (updatedImg: GeneratedImage) => {
    setGeneratedImages((prev) => prev.map((img) => (img.id === updatedImg.id ? updatedImg : img)));
  };

  const handleBatchAction = (action: "approve" | "reject" | "needs_adjustment") => {
    const targetStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "needs_adjustment";
    setGeneratedImages((prev) =>
      prev.map((img) => {
        if (img.reviewStatus === "pending") {
          return { ...img, reviewStatus: targetStatus };
        }
        return img;
      })
    );
  };

  // Navigation callbacks
  const handleNavigateToRefine = (prod: Product) => {
    setSelectedProductForRefine(prod);
    setActiveTab("refine");
  };

  const handleSelectTemplateForEditor = (temp: Template) => {
    setSelectedTemplateForEditor(temp);
  };

  // Switch pages layouts
  const renderPage = () => {
    switch (activeTab) {
      case "workspace":
        return (
          <Workspace
            tasks={tasks}
            onNavigate={(id) => setActiveTab(id)}
            reviewCount={generatedImages.filter((img) => img.reviewStatus === "pending").length}
          />
        );
      case "assets":
        return (
          <AssetLibrary
            products={products}
            onAddProduct={handleAddProduct}
            onNavigateToRefine={handleNavigateToRefine}
            onUpdateProductStatus={handleUpdateProductStatus}
          />
        );
      case "refine":
        return (
          <WhiteBgRefine
            products={products}
            selectedProductFromLib={selectedProductForRefine}
            onUpdateProductStatus={handleUpdateProductStatus}
          />
        );
      case "templates":
        return (
          <TemplateLibrary
            templates={templates}
            onSelectTemplateForEditor={handleSelectTemplateForEditor}
            onNavigate={(id) => setActiveTab(id)}
            onCloneTemplate={handleCloneTemplate}
          />
        );
      case "editor":
        return (
          <TemplateEditor
            initialTemplates={templates}
            products={products}
            selectedTemplateFromLib={selectedTemplateForEditor}
            onSaveTemplate={handleSaveTemplate}
          />
        );
      case "batch":
        return (
          <BatchGenerator
            products={products}
            templates={templates}
            onStartWorkflow={handleStartWorkflow}
            onNavigateToReview={() => setActiveTab("review")}
          />
        );
      case "review":
        return (
          <ReviewCenter
            generatedImages={generatedImages}
            products={products}
            templates={templates}
            onUpdateImage={handleUpdateImage}
            onBatchAction={handleBatchAction}
          />
        );
      case "export":
        return (
          <ExportCenter
            generatedImages={generatedImages.filter((img) => img.reviewStatus === "approved")}
            products={products}
            templates={templates}
          />
        );
      case "statistics":
        return <DataStatistics />;
      case "settings":
        return <SystemSettings />;
      default:
        return <Workspace tasks={tasks} onNavigate={(id) => setActiveTab(id)} reviewCount={generatedImages.filter((img) => img.reviewStatus === "pending").length} />;
    }
  };

  // Pending count badge shown on menu
  const totalPendingReview = generatedImages.filter((img) => img.reviewStatus === "pending").length;

  return (
    <div className="flex bg-slate-50 w-screen h-screen overflow-hidden text-slate-800 font-sans">
      {/* Dark persistent sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // clear temporary selectors
          if (tab !== "refine") setSelectedProductForRefine(null);
        }}
        pendingReviewCount={totalPendingReview}
      />

      {/* Main operation container page */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-6 md:p-8 flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            {renderPage()}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
