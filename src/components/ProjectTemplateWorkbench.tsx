import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Send,
} from "lucide-react";
import { Product, Template } from "../types";
import { TemplateEditor } from "./TemplateEditor";
import { submitProjectForReview } from "../utils/reviewSubmission";

const STORAGE_KEY = "calendar_project_template_workspaces";

interface ProjectTemplateWorkbenchProps {
  products: Product[];
  templates: Template[];
}

interface ProjectTemplateWorkspace {
  id: string;
  projectName: string;
  productId: string;
  productName: string;
  productCode: string;
  productType: Product["productType"];
  suiteRootId: string;
  suiteName: string;
  templates: Template[];
  createdAt: string;
  updatedAt: string;
}

interface PersistedProjectTemplateWorkspaces {
  activeWorkspaceId: string | null;
  workspaces: ProjectTemplateWorkspace[];
}

interface TemplateSuiteGroup {
  baseId: string;
  rootTemplate: Template;
  templates: Template[];
  childTemplates: Template[];
  suiteName: string;
  productType: Template["productType"];
}

const getNowId = (prefix: string) => `${prefix}_${Date.now()}`;

const normalizeSuiteName = (name: string) =>
  name.replace(/\s+-\s+.+$/, "").trim() || name.trim();

const resolveSuiteRootId = (templateId: string) => {
  if (templateId === "MAIN_001" || templateId.startsWith("MAIN_001_")) {
    return "MAIN_001";
  }
  const suiteMatch = templateId.match(/^(SUITE_\d+)(?:_|$)/);
  return suiteMatch?.[1] || null;
};

const deepCloneTemplate = (template: Template, nextId: string): Template => {
  const cloned = JSON.parse(JSON.stringify(template)) as Template;
  return {
    ...cloned,
    id: nextId,
  };
};

const sortTemplates = (baseId: string, templates: Template[]) => {
  return [...templates].sort((left, right) => {
    if (left.id === baseId) return -1;
    if (right.id === baseId) return 1;
    return left.id.localeCompare(right.id);
  });
};

const getTemplateSuites = (templates: Template[]): TemplateSuiteGroup[] => {
  const groups = new Map<string, Template[]>();

  templates.forEach((template) => {
    const baseId = resolveSuiteRootId(template.id);
    if (!baseId) return;
    const current = groups.get(baseId) || [];
    current.push(template);
    groups.set(baseId, current);
  });

  return Array.from(groups.entries())
    .map(([baseId, items]) => {
      const sorted = sortTemplates(baseId, items);
      const rootTemplate =
        sorted.find((template) => template.id === baseId) || sorted[0];
      const childTemplates = sorted.filter((template) => template.id !== baseId);

      return {
        baseId,
        rootTemplate,
        templates: sorted,
        childTemplates,
        suiteName: normalizeSuiteName(rootTemplate.templateName),
        productType: rootTemplate.productType,
      };
    })
    .filter((group) => group.childTemplates.length > 0)
    .sort((left, right) => {
      if (left.baseId === "MAIN_001") return -1;
      if (right.baseId === "MAIN_001") return 1;
      return right.baseId.localeCompare(left.baseId);
    });
};

const loadPersistedWorkspaces = (): PersistedProjectTemplateWorkspaces => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { activeWorkspaceId: null, workspaces: [] };
    }
    const parsed = JSON.parse(raw) as PersistedProjectTemplateWorkspaces;
    const workspaces = Array.isArray(parsed?.workspaces)
      ? parsed.workspaces
      : [];
    const activeWorkspaceId =
      typeof parsed?.activeWorkspaceId === "string"
        ? parsed.activeWorkspaceId
        : null;
    return { activeWorkspaceId, workspaces };
  } catch {
    return { activeWorkspaceId: null, workspaces: [] };
  }
};

const countByType = (templates: Template[], type: Template["templateType"]) =>
  templates.filter((template) => template.templateType === type).length;

export const ProjectTemplateWorkbench: React.FC<
  ProjectTemplateWorkbenchProps
> = ({ products, templates }) => {
  const [workspaceState, setWorkspaceState] =
    useState<PersistedProjectTemplateWorkspaces>(loadPersistedWorkspaces);
  const [viewMode, setViewMode] = useState<"home" | "editor">(() =>
    loadPersistedWorkspaces().activeWorkspaceId ? "editor" : "home",
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id || "",
  );
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("");
  const [projectName, setProjectName] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ totalPages: number; errors: string[] } | null>(null);

  const handleSubmitReview = async () => {
    if (!activeWorkspace) return;
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const pages = activeWorkspace.templates.map((t) => {
        const group = t.templateType === "main" ? "main" : t.templateType === "detail" ? "detail" : t.templateType === "sku" ? "sku" : "other";
        return { template: t, pageGroup: group, required: group !== "other" };
      });
      const result = await submitProjectForReview(
        activeWorkspace.id, activeWorkspace.projectName, activeWorkspace.productId,
        activeWorkspace.productName, activeWorkspace.suiteRootId, activeWorkspace.suiteName, pages,
      );
      setSubmitResult({ totalPages: result.totalPages, errors: result.errors });
    } catch (err: any) {
      setSubmitResult({ totalPages: 0, errors: [err.message] });
    } finally { setIsSubmitting(false); }
  };

  const suiteGroups = useMemo(() => getTemplateSuites(templates), [templates]);

  const activeWorkspace = useMemo(() => {
    return (
      workspaceState.workspaces.find(
        (workspace) => workspace.id === workspaceState.activeWorkspaceId,
      ) || null
    );
  }, [workspaceState]);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) || products[0];

  const availableSuites = useMemo(() => {
    const productType = selectedProduct?.productType;
    if (!productType) return suiteGroups;
    return suiteGroups.filter((suite) => suite.productType === productType);
  }, [selectedProduct?.productType, suiteGroups]);

  const selectedSuite =
    availableSuites.find((suite) => suite.baseId === selectedSuiteId) ||
    availableSuites[0] ||
    null;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaceState));
    } catch {
      // Browser storage may be full or unavailable; keep the live workspace state in memory.
    }
  }, [workspaceState]);

  useEffect(() => {
    if (viewMode !== "editor" && activeWorkspace) {
      setSelectedProductId(activeWorkspace.productId);
      setSelectedSuiteId(activeWorkspace.suiteRootId);
    }
  }, [activeWorkspace, viewMode]);

  useEffect(() => {
    if (products.length === 0) return;
    if (!products.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    if (availableSuites.length === 0) {
      setSelectedSuiteId("");
      return;
    }
    if (
      !availableSuites.some((suite) => suite.baseId === selectedSuiteId)
    ) {
      setSelectedSuiteId(availableSuites[0].baseId);
    }
  }, [availableSuites, selectedSuiteId]);

  const startProject = () => {
    if (!selectedProduct || !selectedSuite) {
      window.alert("请先选择产品和完整模板套系。");
      return;
    }

    const projectId = getNowId("PROJECT");
    const projectTemplates = selectedSuite.templates.map((template) =>
      deepCloneTemplate(template, `${projectId}_${template.id}`),
    );
    const now = new Date().toISOString();
    const nextWorkspace: ProjectTemplateWorkspace = {
      id: projectId,
      projectName:
        projectName.trim() ||
        `${selectedProduct.productName} - ${selectedSuite.suiteName}`,
      productId: selectedProduct.id,
      productName: selectedProduct.productName,
      productCode: selectedProduct.productCode,
      productType: selectedProduct.productType,
      suiteRootId: selectedSuite.baseId,
      suiteName: selectedSuite.suiteName,
      templates: projectTemplates,
      createdAt: now,
      updatedAt: now,
    };

    setWorkspaceState((prev) => ({
      activeWorkspaceId: nextWorkspace.id,
      workspaces: [
        nextWorkspace,
        ...prev.workspaces.filter((workspace) => workspace.id !== nextWorkspace.id),
      ],
    }));
    setSaveMessage("");
    setViewMode("editor");
  };

  const saveProjectTemplates = async (nextTemplates: Template | Template[]) => {
    if (!activeWorkspace) {
      return { componentCount: 0 };
    }

    const templatesForSave = Array.isArray(nextTemplates)
      ? nextTemplates
      : [nextTemplates];
    const mergedTemplateMap = new Map<string, Template>(
      activeWorkspace.templates.map((template) => [template.id, template]),
    );
    templatesForSave.forEach((template) => {
      mergedTemplateMap.set(
        template.id,
        deepCloneTemplate(template, template.id),
      );
    });
    const mergedTemplates = activeWorkspace.templates.map(
      (template) => mergedTemplateMap.get(template.id) || template,
    );
    mergedTemplateMap.forEach((template, templateId) => {
      if (!mergedTemplates.some((item) => item.id === templateId)) {
        mergedTemplates.push(template);
      }
    });
    const now = new Date().toISOString();

    setWorkspaceState((prev) => ({
      activeWorkspaceId: prev.activeWorkspaceId,
      workspaces: prev.workspaces.map((workspace) => {
        if (workspace.id !== activeWorkspace.id) return workspace;
        return {
          ...workspace,
          templates: mergedTemplates,
          updatedAt: now,
        };
      }),
    }));

    setSaveMessage(`项目副本已保存，当前共 ${mergedTemplates.length} 个模板。`);
    window.setTimeout(() => setSaveMessage(""), 1800);
    return { componentCount: mergedTemplates.length };
  };

  const clearCurrentProject = () => {
    if (!activeWorkspace) return;
    const confirmed = window.confirm("确定清除当前项目吗？清除后将回到项目选择页。");
    if (!confirmed) return;

    setWorkspaceState((prev) => ({
      activeWorkspaceId: null,
      workspaces: prev.workspaces.filter(
        (workspace) => workspace.id !== activeWorkspace.id,
      ),
    }));
    setViewMode("home");
    setSaveMessage("");
  };

  const currentWorkspaceProduct =
    activeWorkspace &&
    products.find((product) => product.id === activeWorkspace.productId);

  if (
    viewMode === "editor" &&
    activeWorkspace &&
    activeWorkspace.templates.length > 0
  ) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-4 text-slate-800">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-black text-indigo-600">
              <Sparkles className="h-4 w-4" />
              项目工作台
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="max-w-full truncate text-lg font-black text-slate-950">
                {activeWorkspace.projectName}
              </h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                当前产品：{currentWorkspaceProduct?.productName || activeWorkspace.productName}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                当前模板套系：{activeWorkspace.suiteName}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("home")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              返回项目选择
            </button>
            <button
              type="button"
              onClick={clearCurrentProject}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" />
              清除当前项目
            </button>
          </div>
        </div>

        {saveMessage ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {saveMessage}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <TemplateEditor
            key={activeWorkspace.id}
            initialTemplates={activeWorkspace.templates}
            products={products}
            selectedTemplateFromLib={activeWorkspace.templates[0] || null}
            initialSelectedProductId={activeWorkspace.productId}
            onSaveTemplate={saveProjectTemplates}
          />
        </div>
      </div>
    );
  }

  if (viewMode === "editor" && activeWorkspace) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div>
          <div className="text-lg font-black text-slate-950">项目副本无效</div>
          <div className="mt-1 text-sm text-slate-500">
            这个项目没有可用模板，已经帮你保留在项目选择页。
          </div>
          <button
            type="button"
            onClick={() => setViewMode("home")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            返回项目选择
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 text-slate-800">
      {activeWorkspace ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <div className="text-xs font-black text-indigo-600">当前项目已保存</div>
            <div className="mt-1 truncate text-sm font-bold text-slate-900">
              {activeWorkspace.projectName}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "提交中..." : "提交审核"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("editor")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              <Play className="h-4 w-4" />
              继续编辑
            </button>
          </div>
        </div>
      ) : null}
        {submitResult && (
          <div className={submitResult.errors.length === 0 ? "rounded-xl px-4 py-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800" : "rounded-xl px-4 py-3 text-sm bg-amber-50 border border-amber-200 text-amber-800"}>
            <div className="font-bold">{submitResult.errors.length === 0 ? "Success" : "Warning"}</div>
            <div className="mt-1 text-xs">Pages: {submitResult.totalPages}</div>
          </div>
        )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-indigo-600">
              <Sparkles className="h-4 w-4" />
              项目启动区
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              先选产品，再选完整模板套系
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              这里只做项目入口，不改主模板。开始后会自动复制一份项目工作副本。
            </p>
          </div>
          <RotateCcw className="mt-1 h-5 w-5 text-slate-300" />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-900">
                选择产品
              </span>
              <select
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    [{product.productCode}] {product.productName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-900">
                项目名称
              </span>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="例如：2026 主图套版项目"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </label>

            <button
              type="button"
              onClick={startProject}
              disabled={!selectedProduct || !selectedSuite}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              开始套版
            </button>
          </div>

          <div className="min-h-0">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">
                  选择完整模板套系
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  只显示当前产品类型可用的完整套系。
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                {availableSuites.length} 个可用
              </span>
            </div>

            <div className="grid max-h-[480px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
              {availableSuites.map((suite) => {
                const active = suite.baseId === selectedSuiteId;
                const mainCount = countByType(suite.childTemplates, "main");
                const skuCount = countByType(suite.childTemplates, "sku");
                const detailCount = countByType(suite.childTemplates, "detail");
                const whiteBgCount = countByType(suite.childTemplates, "white_bg");

                return (
                  <button
                    key={suite.baseId}
                    type="button"
                    onClick={() => setSelectedSuiteId(suite.baseId)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-900/10"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-950">
                          {suite.suiteName}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {suite.baseId}
                        </div>
                      </div>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        主图 {mainCount}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        SKU {skuCount}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        详情 {detailCount}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                        白底 {whiteBgCount}
                      </span>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      共 {suite.templates.length} 个模板副本
                    </div>
                  </button>
                );
              })}

              {availableSuites.length === 0 ? (
                <div className="col-span-full flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      当前没有可用的完整套系
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      请先在模板套系里准备好根套系和子模板。
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
