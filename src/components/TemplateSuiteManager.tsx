import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Copy,
  Edit3,
  FilePlus2,
  Grid2X2,
  Layers3,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Template } from "../types";

interface TemplateSuiteManagerProps {
  templates: Template[];
  onEditSuite: (template: Template) => void;
  onDuplicateSuite: (templates: Template[]) => Promise<void> | void;
  onDeleteSuite: (templateIds: string[]) => Promise<void> | void;
}

interface SuiteGroup {
  baseId: string;
  title: string;
  productType: Template["productType"];
  baseTemplate: Template;
  templates: Template[];
  childTemplates: Template[];
  configuredCount: number;
  coverImage?: string;
  coverTemplate?: Template | null;
}

interface SuiteWizardForm {
  suiteName: string;
  productType: "calendar" | "wall_calendar";
  mainVerticalCount: number;
  mainSquareCount: number;
  skuCount: number;
  detailCount: number;
  detailWidth: number;
  detailHeight: number;
  includeWhiteBg: boolean;
  includeTransparentPng: boolean;
  includeSampleBook: boolean;
  includeCustomAd: boolean;
}

const PRIMARY_SUITE_BASE_ID = "MAIN_001";

const DEFAULT_WIZARD_FORM: SuiteWizardForm = {
  suiteName: "",
  productType: "calendar",
  mainVerticalCount: 8,
  mainSquareCount: 8,
  skuCount: 4,
  detailCount: 14,
  detailWidth: 790,
  detailHeight: 1200,
  includeWhiteBg: true,
  includeTransparentPng: true,
  includeSampleBook: false,
  includeCustomAd: false,
};

const PRODUCT_LABEL: Record<Template["productType"], string> = {
  calendar: "台历",
  wall_calendar: "挂历",
  gift_box: "其它",
};

const TYPE_LABEL: Record<Template["templateType"], string> = {
  main: "主图",
  sku: "SKU",
  detail: "详情",
  white_bg: "白透",
  ad_custom: "广告",
  parameter: "参数",
};

const PREVIEW_SCENE_GRADIENTS: Record<
  NonNullable<Template["background"]["sceneStyle"]>,
  [string, string]
> = {
  warm_light: ["#FFF7EB", "#EFD7B6"],
  beige_paper: ["#FAF7F0", "#E6DCC7"],
  studio_white: ["#F8FAFC", "#E2E8F0"],
  luxury_gold: ["#1F1A14", "#3A2A15"],
  festive_red: ["#8B1020", "#E11D48"],
};

const PREVIEW_PLACEHOLDER_COLORS: Record<
  Template["templateType"] | "scene_base",
  string
> = {
  scene_base: "#E2E8F0",
  main: "#93C5FD",
  sku: "#A7F3D0",
  detail: "#FBCFE8",
  white_bg: "#E5E7EB",
  ad_custom: "#FDE68A",
  parameter: "#C4B5FD",
};

const getVisibleComponents = (template?: Template | null) =>
  [...(template?.components || [])]
    .filter((component) => component.visible !== false)
    .sort((a, b) => a.zIndex - b.zIndex);

const hasTemplatePreviewContent = (template?: Template | null) =>
  Boolean(
    template &&
      (getVisibleComponents(template).length > 0 ||
        (template.slots?.length || 0) > 0 ||
        (template.textFields?.length || 0) > 0),
  );

const getTemplateRatio = (template?: Template | null) =>
  Math.max(0.01, (template?.outputWidth || 1) / Math.max(1, template?.outputHeight || 1));

const getTemplateRatioLabel = (template?: Template | null) => {
  if (!template) return "空态";
  const ratio = getTemplateRatio(template);
  if (Math.abs(ratio - 1) < 0.05) return "1:1";
  if (Math.abs(ratio - 0.75) < 0.05) return "3:4";
  if (ratio < 0.75) return "长图";
  if (ratio > 1.35) return "横图";
  return "常规比例";
};

const getTemplatePreviewTitle = (template?: Template | null) =>
  template
    ? `${template.outputWidth}×${template.outputHeight} · ${getTemplateRatioLabel(template)}`
    : "未配置";

const getSuiteCoverTemplate = (suite: Pick<SuiteGroup, "childTemplates">) => {
  const configuredChildren = suite.childTemplates.filter(hasTemplatePreviewContent);
  return (
    configuredChildren.find(
      (template) =>
        template.templateType === "main" && template.aspectRatio === "3:4",
    ) ||
    configuredChildren.find((template) => template.templateType === "main") ||
    configuredChildren[0] ||
    null
  );
};

const normalizeTitle = (name: string) =>
  name
    .replace(/\s+-\s+.+$/, "")
    .replace(/\s+\(副本\)$/, "")
    .replace(/\s+\(复制\)$/, "")
    .trim() || "未命名模板套系";

const resolveBaseId = (templateId: string) => {
  if (templateId === PRIMARY_SUITE_BASE_ID) return PRIMARY_SUITE_BASE_ID;
  if (templateId.startsWith(`${PRIMARY_SUITE_BASE_ID}_`)) {
    return PRIMARY_SUITE_BASE_ID;
  }
  const suiteMatch = templateId.match(/^(SUITE_\d+)(?:_|$)/);
  return suiteMatch?.[1] || null;
};

const TemplatePreview: React.FC<{
  template?: Template | null;
  emptyLabel: string;
  variant: "card" | "panel" | "thumb";
  className?: string;
}> = ({ template, emptyLabel, variant, className }) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize((prev) => {
        if (
          Math.abs(prev.width - rect.width) < 1 &&
          Math.abs(prev.height - rect.height) < 1
        ) {
          return prev;
        }
        return { width: rect.width, height: rect.height };
      });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(el);
    return () => observer.disconnect();
  }, [template, variant]);

  const ratio = getTemplateRatio(template);
  const frameSize = useMemo(() => {
    if (!template || viewportSize.width <= 0 || viewportSize.height <= 0) {
      return { width: "100%", height: "100%" };
    }

    const containerRatio = viewportSize.width / viewportSize.height;
    if (variant === "card") {
      if (containerRatio > ratio) {
        return {
          width: `${viewportSize.width}px`,
          height: `${viewportSize.width / ratio}px`,
        };
      }

      return {
        width: `${viewportSize.height * ratio}px`,
        height: `${viewportSize.height}px`,
      };
    }

    if (containerRatio > ratio) {
      return {
        width: `${viewportSize.height * ratio}px`,
        height: `${viewportSize.height}px`,
      };
    }

    return {
      width: `${viewportSize.width}px`,
      height: `${viewportSize.width / ratio}px`,
    };
  }, [ratio, template, viewportSize.height, viewportSize.width]);

  const backgroundStyle = useMemo<React.CSSProperties>(() => {
    if (!template) return { backgroundColor: "#F8FAFC" };

    const bg = template.background;
    if (bg?.type === "gradient" && bg.gradient) {
      return { backgroundImage: bg.gradient, backgroundColor: "#F8FAFC" };
    }

    if (bg?.type === "scene" && bg.sceneStyle) {
      const [from, to] = PREVIEW_SCENE_GRADIENTS[bg.sceneStyle];
      return {
        backgroundImage: `linear-gradient(180deg, ${from} 0%, ${to} 100%)`,
        backgroundColor: from,
      };
    }

    if (bg?.type === "color" && bg.color) {
      return { backgroundColor: bg.color };
    }

    return { backgroundColor: "#F8FAFC" };
  }, [template]);

  const shellClassName =
    variant === "panel"
      ? "relative h-[360px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
      : variant === "thumb"
        ? "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
        : "relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50";

  const titleClassName =
    variant === "panel"
      ? "text-[11px]"
      : variant === "thumb"
        ? "text-[9px]"
        : "text-[10px]";

  return (
    <div ref={viewportRef} className={`${shellClassName} ${className || ""}`.trim()}>
      <div className="absolute inset-0" style={backgroundStyle} />

      {template ? (
        <>
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: frameSize.width,
              height: frameSize.height,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="relative h-full w-full overflow-hidden">
              {[
                ...getVisibleComponents(template),
                ...(!getVisibleComponents(template).length && template.slots?.length
                  ? template.slots.map((slot, index) => ({
                      id: slot.id,
                      name: slot.slotName,
                      type: "parameter" as const,
                      x: slot.x ?? 50,
                      y: slot.y ?? 50,
                      width: slot.maxWidth ?? 80,
                      height: slot.maxHeight ?? 60,
                      zIndex: slot.layer ?? index,
                      visible: true,
                      imageUrl: undefined,
                      scaleMode: slot.scaleMode,
                    }))
                  : []),
              ]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((component) => {
                  const isSceneBase = component.type === "scene_base";
                  const x = component.x ?? (isSceneBase ? 0 : 50);
                  const y = component.y ?? (isSceneBase ? 0 : 50);
                  const width = Math.max(0, component.width ?? 100);
                  const height = Math.max(0, component.height ?? 100);
                  const objectFit =
                    isSceneBase || component.scaleMode === "cover"
                      ? "cover"
                      : "contain";

                  if (component.type === "parameter" && !getVisibleComponents(template).length) {
                    return (
                      <div
                        key={component.id}
                        className="absolute overflow-hidden rounded-md border border-dashed border-blue-200 bg-blue-50/70"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          zIndex: component.zIndex,
                        }}
                      >
                        <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-blue-700/80">
                          {component.name}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={component.id}
                      className="absolute overflow-hidden"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        zIndex: component.zIndex,
                      }}
                    >
                      {component.imageUrl ? (
                        <img
                          src={component.imageUrl}
                          alt=""
                          className="h-full w-full pointer-events-none"
                          style={{ objectFit }}
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center border border-slate-200/80 text-[9px] font-black text-slate-600"
                          style={{
                            backgroundColor:
                              PREVIEW_PLACEHOLDER_COLORS[
                                (component.type as Template["templateType"]) ||
                                  "parameter"
                              ],
                          }}
                        >
                          {component.name || component.type}
                        </div>
                      )}
                    </div>
                  );
                })}

              {!getVisibleComponents(template).length && !template.slots?.length && template.textFields?.length ? (
                template.textFields
                  .sort((a, b) => (a.y ?? 0) - (b.y ?? 0))
                  .map((field) => (
                    <div
                      key={field.id}
                      className="absolute rounded-full bg-slate-900/25"
                      style={{
                        left: `${Math.max(0, field.x ?? 0)}%`,
                        top: `${Math.max(0, field.y ?? 0)}%`,
                        width: `${Math.min(80, Math.max(16, (field.content?.length || 4) * 3))}%`,
                        height: "3%",
                        zIndex: 20,
                      }}
                    />
                  ))
              ) : null}
            </div>
          </div>

          <div className="absolute left-2 top-2 rounded-full bg-white/92 px-2 py-0.5 text-[10px] font-black text-slate-700 shadow-sm">
            {getTemplatePreviewTitle(template)}
          </div>
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-300">
          <Layers3 className={variant === "thumb" ? "h-5 w-5" : "h-8 w-8"} />
          <span className={`px-2 text-center font-black ${titleClassName}`}>
            {emptyLabel}
          </span>
        </div>
      )}
    </div>
  );
};

const getCountBy = (
  templates: Template[],
  predicate: (template: Template) => boolean,
) => templates.filter(predicate).length;

const getSuiteGroups = (templates: Template[]): SuiteGroup[] => {
  const groups = new Map<string, Template[]>();

  templates.forEach((template) => {
    const baseId = resolveBaseId(template.id);
    if (!baseId) return;
    if (!groups.has(baseId)) groups.set(baseId, []);
    groups.get(baseId)!.push(template);
  });

  return Array.from(groups.entries()).map(([baseId, items]) => {
    const baseTemplate =
      items.find((template) => template.id === baseId) || items[0];
    const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
    const childTemplates = sorted.filter((template) => template.id !== baseId);
    const configuredCount = childTemplates.filter(hasTemplatePreviewContent).length;

    return {
      baseId,
      title: normalizeTitle(baseTemplate.templateName || sorted[0].templateName),
      productType: baseTemplate.productType,
      baseTemplate,
      templates: sorted,
      childTemplates,
      configuredCount,
      coverTemplate: getSuiteCoverTemplate({ childTemplates }),
    };
  });
};

const makeTemplate = (
  input: Pick<
    Template,
    | "id"
    | "templateName"
    | "templateType"
    | "productType"
    | "aspectRatio"
    | "outputWidth"
    | "outputHeight"
  >,
): Template => ({
  ...input,
  background: { type: "color", color: "#FFFFFF" },
  slots: [],
  textFields: [],
  components: [],
  exportSettings: {
    format: "JPG",
    quality: 95,
    width: input.outputWidth,
    height: input.outputHeight,
  },
  status: "draft",
});

const createSuiteTemplates = (form: SuiteWizardForm) => {
  const baseId = `SUITE_${Date.now()}`;
  const title = form.suiteName.trim();
  const templates: Template[] = [
    makeTemplate({
      id: baseId,
      templateName: title,
      templateType: "main",
      productType: form.productType,
      aspectRatio: "1:1",
      outputWidth: 800,
      outputHeight: 800,
    }),
  ];

  for (let i = 1; i <= form.mainVerticalCount; i += 1) {
    templates.push(
      makeTemplate({
        id: `${baseId}_main_3_4_${String(i).padStart(2, "0")}`,
        templateName: `${title} - 3:4竖版主图${String(i).padStart(2, "0")}`,
        templateType: "main",
        productType: form.productType,
        aspectRatio: "3:4",
        outputWidth: 750,
        outputHeight: 1000,
      }),
    );
  }

  for (let i = 1; i <= form.mainSquareCount; i += 1) {
    templates.push(
      makeTemplate({
        id: `${baseId}_main_1_1_${String(i).padStart(2, "0")}`,
        templateName: `${title} - 1:1方形主图${String(i).padStart(2, "0")}`,
        templateType: "main",
        productType: form.productType,
        aspectRatio: "1:1",
        outputWidth: 800,
        outputHeight: 800,
      }),
    );
  }

  for (let i = 1; i <= form.skuCount; i += 1) {
    templates.push(
      makeTemplate({
        id: `${baseId}_sku_${String(i).padStart(2, "0")}`,
        templateName: `${title} - SKU${String(i).padStart(2, "0")}`,
        templateType: "sku",
        productType: form.productType,
        aspectRatio: "1:1",
        outputWidth: 800,
        outputHeight: 800,
      }),
    );
  }

  for (let i = 1; i <= form.detailCount; i += 1) {
    templates.push(
      makeTemplate({
        id: `${baseId}_detail_${String(i).padStart(2, "0")}`,
        templateName: `${title} - 详情图${String(i).padStart(2, "0")}`,
        templateType: "detail",
        productType: form.productType,
        aspectRatio: "custom",
        outputWidth: form.detailWidth,
        outputHeight: form.detailHeight,
      }),
    );
  }

  if (form.includeWhiteBg) {
    templates.push(
      makeTemplate({
        id: `${baseId}_white_bg`,
        templateName: `${title} - 白底图`,
        templateType: "white_bg",
        productType: form.productType,
        aspectRatio: "1:1",
        outputWidth: 800,
        outputHeight: 800,
      }),
    );
  }

  if (form.includeTransparentPng) {
    templates.push(
      makeTemplate({
        id: `${baseId}_transparent_png`,
        templateName: `${title} - 透明PNG`,
        templateType: "white_bg",
        productType: form.productType,
        aspectRatio: "1:1",
        outputWidth: 800,
        outputHeight: 800,
      }),
    );
  }

  if (form.includeSampleBook) {
    templates.push(
      makeTemplate({
        id: `${baseId}_sample_book`,
        templateName: `${title} - 书样模板图`,
        templateType: "main",
        productType: form.productType,
        aspectRatio: "custom",
        outputWidth: 3508,
        outputHeight: 2480,
      }),
    );
  }

  if (form.includeCustomAd) {
    templates.push(
      makeTemplate({
        id: `${baseId}_custom_ad`,
        templateName: `${title} - 广告效果图`,
        templateType: "ad_custom",
        productType: form.productType,
        aspectRatio: "custom",
        outputWidth: 790,
        outputHeight: 1500,
      }),
    );
  }

  return templates;
};

const cloneSuiteTemplates = (suite: SuiteGroup) => {
  const nextBaseId = `SUITE_${Date.now()}`;
  const nextName = `${suite.title} 副本`;

  return suite.templates.map((template) => {
    const suffix =
      template.id === suite.baseId
        ? ""
        : template.id.slice(suite.baseId.length);
    return {
      ...JSON.parse(JSON.stringify(template)),
      id: `${nextBaseId}${suffix}`,
      templateName:
        template.id === suite.baseId
          ? nextName
          : `${nextName} - ${
              template.templateName.split(" - ").slice(1).join(" - ") ||
              template.templateName
            }`,
      status: "draft" as const,
    } satisfies Template;
  });
};

const SuiteCover: React.FC<{ suite: SuiteGroup }> = ({ suite }) => (
  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
    {suite.coverImage ? (
      <img src={suite.coverImage} alt="" className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-300">
        <Layers3 className="h-10 w-10" />
        <span className="text-xs font-black">完整模板套系</span>
      </div>
    )}
    <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow-sm">
      完整套系
    </div>
  </div>
);

const NumberInput: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: string) => void;
}> = ({ label, value, min, max, onChange }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-black text-slate-900">
      {label}
    </span>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
    />
    <div className="mt-1 text-[11px] text-slate-500">
      可输入 {min} - {max}
    </div>
  </label>
);

export const TemplateSuiteManager: React.FC<TemplateSuiteManagerProps> = ({
  templates,
  onEditSuite,
  onDuplicateSuite,
  onDeleteSuite,
}) => {
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState<
    "all" | "calendar" | "wall_calendar"
  >("all");
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [wizardForm, setWizardForm] =
    useState<SuiteWizardForm>(DEFAULT_WIZARD_FORM);
  const [wizardError, setWizardError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const suites = useMemo(() => getSuiteGroups(templates), [templates]);
  const filteredSuites = suites.filter((suite) => {
    const matchesProduct =
      productFilter === "all" || suite.productType === productFilter;
    const matchesQuery =
      !query.trim() ||
      suite.title.toLowerCase().includes(query.trim().toLowerCase());
    return matchesProduct && matchesQuery;
  });
  const selectedSuite =
    filteredSuites.find((suite) => suite.baseId === selectedBaseId) || null;

  const updateWizardNumber =
    (
      key:
        | "mainVerticalCount"
        | "mainSquareCount"
        | "skuCount"
        | "detailCount"
        | "detailWidth"
        | "detailHeight",
      min: number,
      max: number,
    ) =>
    (value: string) => {
      const nextValue = value === "" ? min : Number(value);
      if (Number.isNaN(nextValue)) return;
      setWizardForm((prev) => ({
        ...prev,
        [key]: Math.max(min, Math.min(max, nextValue)),
      }));
    };

  const openWizard = () => {
    setWizardForm(DEFAULT_WIZARD_FORM);
    setWizardStep(1);
    setWizardError("");
    setIsWizardOpen(true);
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setWizardError("");
  };

  const handleCreateSuite = async () => {
    const title = wizardForm.suiteName.trim();
    if (!title) {
      setWizardError("请先填写套系名称。");
      setWizardStep(1);
      return;
    }

    setWizardError("");
    setIsCreating(true);
    try {
      const nextTemplates = createSuiteTemplates({
        ...wizardForm,
        suiteName: title,
      });
      await onDuplicateSuite(nextTemplates);
      setQuery("");
      setProductFilter("all");
      setSelectedBaseId(nextTemplates[0].id);
      closeWizard();
    } catch (error) {
      setWizardError(
        error instanceof Error ? error.message : "创建失败，请稍后重试。",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDuplicate = async (suite: SuiteGroup) => {
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      await onDuplicateSuite(cloneSuiteTemplates(suite));
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDelete = async (suite: SuiteGroup) => {
    if (isDeleting) return;
    const confirmed = window.confirm(
      `确定删除整套模板“${suite.title}”吗？\n\n将同时删除套系及其 ${suite.childTemplates.length} 个子模板，此操作无法撤销。`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDeleteSuite(suite.templates.map((template) => template.id));
      setSelectedBaseId(null);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "删除失败，请稍后重试。",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 text-slate-800">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-blue-600">
              <Layers3 className="h-4 w-4" />
              模板套系外层
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              模板套系预览与管理
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              这里只展示完整套系。点击后可在右侧查看子模板概览，再进入模板编辑。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openWizard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
            >
              <FilePlus2 className="h-4 w-4" />
              新建模板套系
            </button>
            {selectedSuite && (
              <button
                type="button"
                onClick={() => onEditSuite(selectedSuite.baseTemplate)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
              >
                <Edit3 className="h-4 w-4" />
                进入编辑
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索模板套系名称"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white"
            />
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {[
              ["all", "全部"],
              ["calendar", "台历"],
              ["wall_calendar", "挂历"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setProductFilter(value as typeof productFilter)}
                className={`rounded-lg px-3 py-1.5 text-xs font-black ${
                  productFilter === value
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {filteredSuites.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <Grid2X2 className="h-10 w-10 text-slate-300" />
              <div>
                <div className="text-sm font-black text-slate-800">
                  没有找到套系
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  试试清空搜索词，或者新建一个完整套系。
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredSuites.map((suite) => {
                const active = selectedSuite?.baseId === suite.baseId;
                const mainSquare = getCountBy(
                  suite.childTemplates,
                  (template) =>
                    template.templateType === "main" &&
                    template.aspectRatio === "1:1",
                );
                const mainVertical = getCountBy(
                  suite.childTemplates,
                  (template) =>
                    template.templateType === "main" &&
                    template.aspectRatio === "3:4",
                );
                const sku = getCountBy(
                  suite.childTemplates,
                  (template) => template.templateType === "sku",
                );
                const detail = getCountBy(
                  suite.childTemplates,
                  (template) => template.templateType === "detail",
                );

                return (
                  <button
                    key={suite.baseId}
                    type="button"
                    onClick={() => setSelectedBaseId(suite.baseId)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      active
                        ? "border-blue-500 bg-blue-50/50 shadow-md shadow-blue-900/10"
                        : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
                    }`}
                  >
                    <TemplatePreview
                      template={suite.coverTemplate}
                      emptyLabel="暂无可用封面"
                      variant="card"
                      className="aspect-[3/4]"
                    />
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-950">
                          {suite.title}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {PRODUCT_LABEL[suite.productType]}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            子模板 {suite.childTemplates.length}
                          </span>
                        </div>
                      </div>
                      <Sparkles className="mt-0.5 h-4 w-4 text-blue-500" />
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[10px] font-black">
                      <span className="rounded-lg bg-slate-50 py-1 text-slate-600">
                        1:1 {mainSquare}
                      </span>
                      <span className="rounded-lg bg-slate-50 py-1 text-slate-600">
                        3:4 {mainVertical}
                      </span>
                      <span className="rounded-lg bg-slate-50 py-1 text-slate-600">
                        SKU {sku}
                      </span>
                      <span className="rounded-lg bg-slate-50 py-1 text-slate-600">
                        详情 {detail}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {selectedSuite ? (
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-blue-600">
                    当前套系
                  </div>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    {selectedSuite.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {PRODUCT_LABEL[selectedSuite.productType]} ·{" "}
                    {selectedSuite.childTemplates.length} 个子模板
                  </p>
                </div>
                <Sparkles className="h-5 w-5 text-blue-500" />
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-3">
                <TemplatePreview
                  template={selectedSuite.coverTemplate}
                  emptyLabel="暂无可用封面"
                  variant="panel"
                />
              </div>

              <div className="mt-5">
                <div className="mb-2 text-xs font-black text-slate-900">
                  子模板概览
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {selectedSuite.childTemplates.map((template) => {
                    const configured = hasTemplatePreviewContent(template);
                    return (
                      <div
                        key={template.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <TemplatePreview
                          template={template}
                          emptyLabel="?"
                          variant="thumb"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-black text-slate-800">
                            {template.templateName.replace(
                              `${selectedSuite.title} - `,
                              "",
                            )}
                          </div>
                          <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                            {TYPE_LABEL[template.templateType]} ?{" "}
                            {template.aspectRatio} ? {template.outputWidth}?
                            {template.outputHeight}
                          </div>
                        </div>
                        <span
                          className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                            configured
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {configured ? "???" : "??"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                {(
                  [
                    "main",
                    "sku",
                    "detail",
                    "white_bg",
                    "ad_custom",
                    "parameter",
                  ] as Template["templateType"][]
                ).map((type) => {
                  const count = getCountBy(
                    selectedSuite.childTemplates,
                    (template) => template.templateType === type,
                  );
                  if (!count) return null;
                  return (
                    <div
                      key={type}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="font-black text-slate-900">
                        {TYPE_LABEL[type]}
                      </div>
                      <div className="mt-1 text-[11px] font-bold text-slate-500">
                        {count} 个
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => onEditSuite(selectedSuite.baseTemplate)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-black text-white hover:bg-blue-700"
                >
                  <Edit3 className="h-4 w-4" />
                  编辑这套模板
                </button>
                <button
                  type="button"
                  disabled={isDuplicating}
                  onClick={() => handleDuplicate(selectedSuite)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <Copy className="h-4 w-4" />
                  复制并另存为新模板
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(selectedSuite)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "正在删除..." : "删除整套模板"}
                </button>
              </div>

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-800">
                当前页面只显示完整模板套系。点击套系后，右侧才会展开子模板概览。
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center p-8 text-center">
              <Grid2X2 className="h-10 w-10 text-slate-300" />
              <div className="mt-3 text-sm font-black text-slate-800">
                请选择一个套系
              </div>
              <p className="mt-1 text-xs text-slate-500">
                在左侧点击完整套系卡片后，这里会显示子模板概览。
              </p>
            </div>
          )}
        </aside>
      </div>

      {isWizardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
          onClick={closeWizard}
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <div className="text-xs font-black text-blue-600">
                  新建模板套系
                </div>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  模板套系向导
                </h3>
              </div>
              <button
                type="button"
                onClick={closeWizard}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2 text-xs font-black">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    wizardStep === 1
                      ? "bg-blue-600 text-white"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  1
                </span>
                <span
                  className={
                    wizardStep === 1 ? "text-slate-900" : "text-slate-500"
                  }
                >
                  填写套系名称
                </span>
                <span className="mx-1 text-slate-300">→</span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    wizardStep === 2
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  2
                </span>
                <span
                  className={
                    wizardStep === 2 ? "text-slate-900" : "text-slate-500"
                  }
                >
                  配置分组数量
                </span>
              </div>
            </div>

            <div className="max-h-[calc(92vh-162px)] overflow-y-auto px-5 py-5">
              {wizardStep === 1 ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-black text-slate-900">
                      套系名称
                    </label>
                    <input
                      value={wizardForm.suiteName}
                      onChange={(event) =>
                        setWizardForm((prev) => ({
                          ...prev,
                          suiteName: event.target.value,
                        }))
                      }
                      placeholder="例如：国潮新年礼台历套系"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="mb-2 block text-sm font-black text-slate-900">
                      产品类型
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        {
                          value: "calendar",
                          label: "台历",
                          desc: "适用于台历类完整套系",
                        },
                        {
                          value: "wall_calendar",
                          label: "挂历",
                          desc: "适用于挂历类完整套系",
                        },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() =>
                            setWizardForm((prev) => ({
                              ...prev,
                              productType:
                                item.value as SuiteWizardForm["productType"],
                            }))
                          }
                          className={`rounded-xl border px-4 py-3 text-left transition ${
                            wizardForm.productType === item.value
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-blue-200"
                          }`}
                        >
                          <div className="text-sm font-black text-slate-900">
                            {item.label}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {item.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {wizardError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {wizardError}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <NumberInput
                      label="3:4 竖版主图数量"
                      min={0}
                      max={20}
                      value={wizardForm.mainVerticalCount}
                      onChange={updateWizardNumber("mainVerticalCount", 0, 20)}
                    />
                    <NumberInput
                      label="1:1 方形主图数量"
                      min={0}
                      max={20}
                      value={wizardForm.mainSquareCount}
                      onChange={updateWizardNumber("mainSquareCount", 0, 20)}
                    />
                    <NumberInput
                      label="SKU 数量"
                      min={0}
                      max={20}
                      value={wizardForm.skuCount}
                      onChange={updateWizardNumber("skuCount", 0, 20)}
                    />
                    <NumberInput
                      label="详情图数量"
                      min={0}
                      max={40}
                      value={wizardForm.detailCount}
                      onChange={updateWizardNumber("detailCount", 0, 40)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <NumberInput
                      label="详情图宽度"
                      min={100}
                      max={4000}
                      value={wizardForm.detailWidth}
                      onChange={updateWizardNumber("detailWidth", 100, 4000)}
                    />
                    <NumberInput
                      label="详情图高度"
                      min={100}
                      max={4000}
                      value={wizardForm.detailHeight}
                      onChange={updateWizardNumber("detailHeight", 100, 4000)}
                    />
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-black text-slate-900">
                      其它模板
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        {
                          key: "includeWhiteBg",
                          label: "包含白底图",
                          description: "默认开启，用于白底交付图。",
                        },
                        {
                          key: "includeTransparentPng",
                          label: "包含透明 PNG",
                          description: "默认开启，用于透明底交付图。",
                        },
                        {
                          key: "includeSampleBook",
                          label: "包含书样模板图",
                          description: "默认关闭，用于样书、书样展示。",
                        },
                        {
                          key: "includeCustomAd",
                          label: "包含广告效果图",
                          description: "默认关闭，用于广告效果展示。",
                        },
                      ].map((item) => {
                        const key =
                          item.key as keyof Pick<
                            SuiteWizardForm,
                            | "includeWhiteBg"
                            | "includeTransparentPng"
                            | "includeSampleBook"
                            | "includeCustomAd"
                          >;
                        const checked = wizardForm[key];
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() =>
                              setWizardForm((prev) => ({
                                ...prev,
                                [key]: !prev[key],
                              }))
                            }
                            className={`rounded-xl border px-4 py-3 text-left transition ${
                              checked
                                ? "border-emerald-300 bg-emerald-50"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-black text-slate-900">
                                  {item.label}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {item.description}
                                </div>
                              </div>
                              <span
                                className={`h-5 w-5 rounded-full border ${
                                  checked
                                    ? "border-emerald-600 bg-emerald-600"
                                    : "border-slate-300 bg-white"
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
              <div className="text-xs text-slate-500">
                {wizardStep === 1
                  ? "先填写名称，再继续配置模板数量。"
                  : "确认后会一次性生成一整套空白模板。"}
              </div>
              <div className="flex items-center gap-2">
                {wizardStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一步
                  </button>
                )}
                {wizardStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!wizardForm.suiteName.trim()) {
                        setWizardError("请先填写套系名称。");
                        return;
                      }
                      setWizardError("");
                      setWizardStep(2);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700"
                  >
                    下一步
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isCreating}
                    onClick={handleCreateSuite}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <FilePlus2 className="h-4 w-4" />
                    {isCreating ? "创建中..." : "创建套系"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
