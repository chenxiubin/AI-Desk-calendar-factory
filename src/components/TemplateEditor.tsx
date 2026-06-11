import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Product,
  Template,
  TemplateBackground,
  TemplateComponent,
  TemplateComponentType,
  TemplateSlot,
  TextField,
} from "../types";
import { getTemplateComponents } from "../utils/renderTemplate";
import { detectLayerType, getDefaultZIndexForType, getDefaultSendToRH, getTypeLabel, detectPageIndex } from "../utils/templateImport";
import {
  Check,
  Eye,
  EyeOff,
  FolderOpen,
  Grid,
  Layers,
  Maximize,
  Play,
  Plus,
  Save,
  Sliders,
  Sparkles,
  Trash,
  Type,
  X,
} from "lucide-react";

interface TemplateEditorProps {
  initialTemplates: Template[];
  products: Product[];
  selectedTemplateFromLib?: Template | null;
  onSaveTemplate: (template: Template) => void;
}

type ProductLine = "desk_calendar" | "wall_calendar";
type DeliveryType =
  | "main_group"
  | "sku_group"
  | "detail_group"
  | "white_bg"
  | "transparent_png"
  | "sample_book"
  | "custom_ad"
  | "package_gift";
type RatioVersion = "square_1_1" | "vertical_3_4" | "detail_long" | "original";
type BusinessRole =
  | "product_showcase"
  | "package_showcase"
  | "selling_point"
  | "customization"
  | "craft_detail"
  | "sku_single"
  | "sku_grid"
  | "sku_compare"
  | "detail_core"
  | "detail_size"
  | "detail_inner"
  | "detail_process"
  | "white_bg"
  | "transparent_png"
  | "sample_book"
  | "custom_ad"
  | "package_gift";
type FloatingPanel = "info" | "import" | "slots" | "test" | "save";
type ThumbFilter =
  | "all"
  | "main_3_4"
  | "main_1_1"
  | "sku"
  | "detail"
  | "white_transparent"
  | "scene_800"
  | "scene_1200"
  | "sample_book"
  | "ad_effect";

const THUMB_FILTER_OPTIONS: Array<{ value: ThumbFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "main_3_4", label: "3:4方形主图" },
  { value: "main_1_1", label: "1:1长形主图" },
  { value: "sku", label: "SKU" },
  { value: "detail", label: "详情图" },
  { value: "white_transparent", label: "白透产品图" },
  { value: "scene_800", label: "800产品场景图" },
  { value: "scene_1200", label: "1200产品场景图" },
  { value: "sample_book", label: "书样模板图" },
  { value: "ad_effect", label: "广告效果图" },
];

interface BusinessTemplateConfig {
  productLine: ProductLine;
  deliveryType: DeliveryType;
  ratioVersion: RatioVersion;
  role: BusinessRole;
  defaultCount: number;
  minCount: number;
  maxCount: number;
  allowProjectAddRemove: boolean;
}

interface TemplateThumb {
  id: string;
  group: "main" | "sku" | "detail" | "special";
  filter: Exclude<ThumbFilter, "all">;
  title: string;
  subtitle: string;
  deliveryType: DeliveryType;
  ratioVersion: RatioVersion;
  role: BusinessRole;
  width: number;
  height: number;
  status: "ready" | "warning" | "draft";
}

const PRODUCT_LINE_OPTIONS: Array<{ value: ProductLine; label: string }> = [
  { value: "desk_calendar", label: "台历" },
  { value: "wall_calendar", label: "挂历" },
];

const DELIVERY_TYPE_OPTIONS: Array<{ value: DeliveryType; label: string }> = [
  { value: "main_group", label: "主图组" },
  { value: "sku_group", label: "SKU 图组" },
  { value: "detail_group", label: "详情图组" },
  { value: "white_bg", label: "白底图" },
  { value: "transparent_png", label: "透明 PNG" },
  { value: "sample_book", label: "书样图" },
  { value: "custom_ad", label: "广告 / 定制图" },
  { value: "package_gift", label: "包装 / 礼袋图" },
];

const RATIO_VERSION_OPTIONS: Array<{
  value: RatioVersion;
  label: string;
  aliases: string;
}> = [
  {
    value: "square_1_1",
    label: "1:1 方形主图",
    aliases: "主图800 / 800 / 方图 / 1-1",
  },
  {
    value: "vertical_3_4",
    label: "3:4 竖版主图",
    aliases: "主图750 / 750 / 长图 / 3-4",
  },
  { value: "detail_long", label: "详情长图", aliases: "images / 详情" },
  { value: "original", label: "原始比例", aliases: "白底 / 透明 / 书样 / 定制" },
];

const ROLE_OPTIONS: Array<{ value: BusinessRole; label: string }> = [
  { value: "product_showcase", label: "产品展示" },
  { value: "package_showcase", label: "产品 + 包装" },
  { value: "selling_point", label: "卖点展示" },
  { value: "customization", label: "定制展示" },
  { value: "craft_detail", label: "工艺细节" },
  { value: "sku_single", label: "单款 SKU" },
  { value: "sku_grid", label: "SKU 宫格" },
  { value: "sku_compare", label: "款式对比" },
  { value: "detail_core", label: "核心卖点" },
  { value: "detail_size", label: "尺寸材质" },
  { value: "detail_inner", label: "内页展示" },
  { value: "detail_process", label: "定制流程" },
  { value: "white_bg", label: "白底精修" },
  { value: "transparent_png", label: "透明 PNG" },
  { value: "sample_book", label: "书样 / 样张" },
  { value: "custom_ad", label: "广告 / 定制效果" },
  { value: "package_gift", label: "包装 / 礼袋" },
];

const COMPONENT_TYPE_LABEL: Record<TemplateComponentType, string> = {
  scene_base: "场景底图",
  product_slot: "产品槽位",
  text_overlay: "文案层",
  decor_overlay: "装饰层",
  logo_overlay: "LOGO 层",
};

const COMPONENT_TYPE_COLOR: Record<TemplateComponentType, string> = {
  scene_base: "bg-amber-500",
  product_slot: "bg-blue-600",
  text_overlay: "bg-sky-500",
  decor_overlay: "bg-rose-500",
  logo_overlay: "bg-teal-500",
};

const TEMPLATE_THUMBNAILS: TemplateThumb[] = [
  {
    id: "main_01_square",
    group: "main",
    filter: "main_1_1",
    title: "产品展示",
    subtitle: "1:1 方形",
    deliveryType: "main_group",
    ratioVersion: "square_1_1",
    role: "product_showcase",
    width: 800,
    height: 800,
    status: "ready",
  },
  {
    id: "main_01_vertical",
    group: "main",
    filter: "main_3_4",
    title: "产品展示",
    subtitle: "3:4 竖版",
    deliveryType: "main_group",
    ratioVersion: "vertical_3_4",
    role: "product_showcase",
    width: 750,
    height: 1000,
    status: "ready",
  },
  {
    id: "main_02_square",
    group: "main",
    filter: "main_1_1",
    title: "产品包装",
    subtitle: "1:1 方形",
    deliveryType: "main_group",
    ratioVersion: "square_1_1",
    role: "package_showcase",
    width: 800,
    height: 800,
    status: "warning",
  },
  {
    id: "main_02_vertical",
    group: "main",
    filter: "main_3_4",
    title: "产品包装",
    subtitle: "3:4 竖版",
    deliveryType: "main_group",
    ratioVersion: "vertical_3_4",
    role: "package_showcase",
    width: 750,
    height: 1000,
    status: "warning",
  },
  {
    id: "scene_800",
    group: "main",
    filter: "scene_800",
    title: "800 产品场景",
    subtitle: "根目录 800",
    deliveryType: "main_group",
    ratioVersion: "square_1_1",
    role: "product_showcase",
    width: 800,
    height: 800,
    status: "ready",
  },
  {
    id: "scene_1200",
    group: "main",
    filter: "scene_1200",
    title: "1200 产品场景",
    subtitle: "根目录 1200",
    deliveryType: "main_group",
    ratioVersion: "original",
    role: "product_showcase",
    width: 800,
    height: 1200,
    status: "ready",
  },
  {
    id: "sku_01",
    group: "sku",
    filter: "sku",
    title: "单款 SKU",
    subtitle: "款式图",
    deliveryType: "sku_group",
    ratioVersion: "square_1_1",
    role: "sku_single",
    width: 800,
    height: 800,
    status: "ready",
  },
  {
    id: "sku_grid",
    group: "sku",
    filter: "sku",
    title: "SKU 宫格",
    subtitle: "多款展示",
    deliveryType: "sku_group",
    ratioVersion: "square_1_1",
    role: "sku_grid",
    width: 800,
    height: 800,
    status: "draft",
  },
  {
    id: "detail_core",
    group: "detail",
    filter: "detail",
    title: "核心卖点",
    subtitle: "详情切片",
    deliveryType: "detail_group",
    ratioVersion: "detail_long",
    role: "detail_core",
    width: 790,
    height: 1200,
    status: "ready",
  },
  {
    id: "detail_size",
    group: "detail",
    filter: "detail",
    title: "尺寸材质",
    subtitle: "详情切片",
    deliveryType: "detail_group",
    ratioVersion: "detail_long",
    role: "detail_size",
    width: 790,
    height: 1200,
    status: "ready",
  },
  {
    id: "detail_inner",
    group: "detail",
    filter: "detail",
    title: "内页展示",
    subtitle: "详情切片",
    deliveryType: "detail_group",
    ratioVersion: "detail_long",
    role: "detail_inner",
    width: 790,
    height: 1200,
    status: "draft",
  },
  {
    id: "white_bg",
    group: "special",
    filter: "white_transparent",
    title: "白底图",
    subtitle: "根目录交付",
    deliveryType: "white_bg",
    ratioVersion: "original",
    role: "white_bg",
    width: 800,
    height: 800,
    status: "ready",
  },
  {
    id: "transparent_png",
    group: "special",
    filter: "white_transparent",
    title: "透明 PNG",
    subtitle: "根目录交付",
    deliveryType: "transparent_png",
    ratioVersion: "original",
    role: "transparent_png",
    width: 800,
    height: 800,
    status: "ready",
  },
  {
    id: "sample_book",
    group: "special",
    filter: "sample_book",
    title: "书样模板",
    subtitle: "客户选款",
    deliveryType: "sample_book",
    ratioVersion: "original",
    role: "sample_book",
    width: 3508,
    height: 2480,
    status: "draft",
  },
  {
    id: "custom_ad",
    group: "special",
    filter: "ad_effect",
    title: "广告定制",
    subtitle: "Canvas-only",
    deliveryType: "custom_ad",
    ratioVersion: "original",
    role: "custom_ad",
    width: 790,
    height: 1500,
    status: "warning",
  },
];

const getOptionLabel = <T extends string>(
  options: Array<{ value: T; label: string }>,
  value: T,
) => options.find((option) => option.value === value)?.label || value;

const getRecommendedCount = (deliveryType: DeliveryType) => {
  if (deliveryType === "main_group") return { min: 4, defaultCount: 8, max: 12 };
  if (deliveryType === "sku_group") return { min: 1, defaultCount: 4, max: 12 };
  if (deliveryType === "detail_group") {
    return { min: 8, defaultCount: 14, max: 24 };
  }
  return { min: 1, defaultCount: 1, max: 1 };
};

const getSizeByRatio = (ratioVersion: RatioVersion) => {
  if (ratioVersion === "square_1_1") return { width: 800, height: 800 };
  if (ratioVersion === "vertical_3_4") return { width: 750, height: 1000 };
  if (ratioVersion === "detail_long") return { width: 790, height: 1200 };
  return null;
};

const getTemplateTypeByDelivery = (
  deliveryType: DeliveryType,
): Template["templateType"] => {
  if (deliveryType === "sku_group") return "sku";
  if (deliveryType === "detail_group") return "detail";
  if (deliveryType === "white_bg" || deliveryType === "transparent_png") {
    return "white_bg";
  }
  if (deliveryType === "custom_ad") return "ad_custom";
  return "main";
};

const getInitialBusinessConfig = (
  template?: Template,
): BusinessTemplateConfig => {
  const deliveryType: DeliveryType =
    template?.templateType === "sku"
      ? "sku_group"
      : template?.templateType === "detail"
        ? "detail_group"
        : template?.templateType === "white_bg"
          ? "white_bg"
          : template?.templateType === "ad_custom"
            ? "custom_ad"
            : "main_group";
  const ratioVersion: RatioVersion =
    template?.aspectRatio === "3:4"
      ? "vertical_3_4"
      : deliveryType === "detail_group"
        ? "detail_long"
        : deliveryType === "main_group"
          ? "square_1_1"
          : "original";
  const role: BusinessRole =
    deliveryType === "sku_group"
      ? "sku_single"
      : deliveryType === "detail_group"
        ? "detail_core"
        : deliveryType === "white_bg"
          ? "white_bg"
          : deliveryType === "custom_ad"
            ? "custom_ad"
            : "product_showcase";
  const count = getRecommendedCount(deliveryType);
  return {
    productLine:
      template?.productType === "wall_calendar" ? "wall_calendar" : "desk_calendar",
    deliveryType,
    ratioVersion,
    role,
    minCount: count.min,
    defaultCount: count.defaultCount,
    maxCount: count.max,
    allowProjectAddRemove: ["main_group", "sku_group", "detail_group"].includes(
      deliveryType,
    ),
  };
};

const getComponentTypeByFileName = (fileName: string): TemplateComponentType => {
  const lower = fileName.toLowerCase();
  if (
    lower.includes("bg") ||
    lower.includes("scene") ||
    lower.includes("背景") ||
    lower.includes("场景")
  ) {
    return "scene_base";
  }
  if (
    lower.includes("text") ||
    lower.includes("title") ||
    lower.includes("文案") ||
    lower.includes("文字")
  ) {
    return "text_overlay";
  }
  if (lower.includes("logo") || lower.includes("标志")) return "logo_overlay";
  return "decor_overlay";
};

const getDefaultZIndex = (type: TemplateComponentType) => {
  if (type === "scene_base") return 0;
  if (type === "product_slot") return 10;
  if (type === "decor_overlay") return 30;
  if (type === "text_overlay") return 40;
  return 50;
};

const getCanvasBackgroundClass = (styleName?: string) => {
  switch (styleName) {
    case "warm_light":
      return "bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100";
    case "beige_paper":
      return "bg-stone-50";
    case "studio_white":
      return "bg-neutral-50";
    case "festive_red":
      return "bg-gradient-to-br from-red-700 via-red-600 to-rose-800";
    case "luxury_gold":
      return "bg-gradient-to-br from-yellow-900 via-amber-800 to-neutral-900";
    default:
      return "bg-white";
  }
};

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  initialTemplates,
  products,
  selectedTemplateFromLib,
  onSaveTemplate,
}) => {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const baseTemplate = templates[0];
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id || "",
  );
  const [businessConfig, setBusinessConfig] =
    useState<BusinessTemplateConfig>(() =>
      getInitialBusinessConfig(selectedTemplateFromLib || initialTemplates[0]),
    );
  const [activePanel, setActivePanel] = useState<FloatingPanel | null>(null);
  const [activeThumbId, setActiveThumbId] = useState("main_01_square");
  const [thumbFilter, setThumbFilter] = useState<ThumbFilter>("all");
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null,
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTextFieldId, setSelectedTextFieldId] = useState<string | null>(
    null,
  );
  const [showGrid, setShowGrid] = useState(true);
  const [showSafetyRegion, setShowSafetyRegion] = useState(true);
  const [zoomRatio, setZoomRatio] = useState(100);
  const [mainThemeCount, setMainThemeCount] = useState(8);
  const [skuCount, setSkuCount] = useState(4);
  const [detailCount, setDetailCount] = useState(14);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);

  const getComponentLayerItems = () => {
    return [...(activeTemplate.components || [])].sort((a, b) => {
      if (a.type === "scene_base") return 1;
      if (b.type === "scene_base") return -1;
      return (b.zIndex ?? 0) - (a.zIndex ?? 0);
    });
  };

  const reorderComponentLayer = (sourceId: string, targetId: string) => {
    const visibleOrder = getComponentLayerItems();
    const fromIndex = visibleOrder.findIndex((item) => item.id === sourceId);
    const toIndex = visibleOrder.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const source = visibleOrder[fromIndex];
    const target = visibleOrder[toIndex];
    if (source.type === "scene_base" || target.type === "scene_base") return;
    const nextVisibleOrder = [...visibleOrder];
    const [moved] = nextVisibleOrder.splice(fromIndex, 1);
    nextVisibleOrder.splice(toIndex, 0, moved);
    const normalLayers = nextVisibleOrder.filter((item) => item.type !== "scene_base");
    const sceneLayers = nextVisibleOrder.filter((item) => item.type === "scene_base");
    const updatedNormalLayers = normalLayers.map((item, index) => ({ ...item, zIndex: normalLayers.length - index }));
    const updatedSceneLayers = sceneLayers.map((item) => ({ ...item, zIndex: 0 }));
    const nextComponents = [...updatedSceneLayers, ...updatedNormalLayers];
    handleUpdateTemplate({ ...activeTemplate, components: nextComponents });
  };

  // --- Drag & Resize State ---
  const dragRef = useRef<{
    active: boolean;
    action: "move" | "resize";
    handle?: "tl" | "tr" | "bl" | "br";
    targetType: "component" | "slot" | "textField";
    targetId: string;
    startX: number; startY: number;
    startTargetX: number; startTargetY: number;
    startTargetW: number; startTargetH: number;
  } | null>(null);
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);
  const [, setDragTick] = useState(0); // force re-render during drag

  // --- Drag Handlers ---
  const selectComp = (id: string) => { setSelectedComponentId(id); setSelectedSlotId(null); setSelectedTextFieldId(null); };
  const selectSlotFn = (id: string) => { setSelectedSlotId(id); setSelectedComponentId(null); setSelectedTextFieldId(null); };
  const selectTf = (id: string) => { setSelectedTextFieldId(id); setSelectedComponentId(null); setSelectedSlotId(null); };

  const startDrag = (
    e: React.MouseEvent,
    type: "move" | "resize",
    targetType: "component" | "slot" | "textField",
    targetId: string,
    box: { x: number; y: number; w: number; h: number },
    handle?: "tl" | "tr" | "bl" | "br",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (targetType === "component") selectComp(targetId);
    else if (targetType === "slot") selectSlotFn(targetId);
    else selectTf(targetId);

    dragRef.current = {
      active: true,
      action: type,
      targetType,
      handle,
      targetId,
      startX: e.clientX, startY: e.clientY,
      startTargetX: box.x, startTargetY: box.y,
      startTargetW: box.w, startTargetH: box.h,
    };
  };

  const isDragging = dragRef.current?.active;
  const dragTargetId = dragRef.current?.targetId;
  const dragType = dragRef.current?.action;

  // Per-thumbnail independent template store (ref avoids closure issues)
  const thumbTemplatesRef = useRef<Record<string, Template>>({});
  const [storeVersion, setStoreVersion] = useState(0);
  const getThumbTemplate = (thumbId: string): Template => {
    if (thumbTemplatesRef.current[thumbId]) return thumbTemplatesRef.current[thumbId];
    const clone = JSON.parse(JSON.stringify(baseTemplate));
    clone.id = `${baseTemplate.id}_${thumbId}`;
    thumbTemplatesRef.current[thumbId] = clone;
    return clone;
  };
  const saveThumbTemplate = (thumbId: string, tmpl: Template) => {
    thumbTemplatesRef.current[thumbId] = tmpl;
    setStoreVersion((v) => v + 1);
  };

  // Active template from ref store
  const activeTemplate = getThumbTemplate(activeThumbId);
  const activeProduct =
    products.find((product) => product.id === selectedProductId) || products[0];
  const selectedComponent = activeTemplate?.components?.find(
    (component) => component.id === selectedComponentId,
  );
  const selectedSlot = activeTemplate?.slots.find(
    (slot) => slot.id === selectedSlotId,
  );
  const selectedTextField = activeTemplate?.textFields.find(
    (textField) => textField.id === selectedTextFieldId,
  );
  const hasLayerComponents =
    !!activeTemplate?.components && activeTemplate.components.length > 0;

  const sortedComponents = useMemo(
    () =>
      [...(activeTemplate?.components || [])].sort(
        (left, right) => right.zIndex - left.zIndex,
      ),
    [activeTemplate?.components],
  );

  const businessPathLabel = `${getOptionLabel(
    PRODUCT_LINE_OPTIONS,
    businessConfig.productLine,
  )} / ${getOptionLabel(
    DELIVERY_TYPE_OPTIONS,
    businessConfig.deliveryType,
  )} / ${getOptionLabel(
    RATIO_VERSION_OPTIONS,
    businessConfig.ratioVersion,
  )} / ${getOptionLabel(ROLE_OPTIONS, businessConfig.role)}`;

  const canvasSize = useMemo(() => {
    if (!activeTemplate) return { width: 560, height: 560 };
    const ratio =
      activeTemplate.outputWidth > 0 && activeTemplate.outputHeight > 0
        ? activeTemplate.outputWidth / activeTemplate.outputHeight
        : 1;
    const maxWidth = 760;
    const maxHeight = 680;
    let width = ratio >= 1 ? Math.min(maxWidth, maxHeight * ratio) : maxHeight * ratio;
    let height = ratio >= 1 ? width / ratio : maxHeight;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / ratio;
    }
    const zoom = zoomRatio / 100;
    return { width: width * zoom, height: height * zoom };
  }, [activeTemplate, zoomRatio]);

  const inspectionItems = useMemo(() => {
    if (!activeTemplate) return [];
    const components = activeTemplate.components || [];
    const isSquareMain =
      businessConfig.deliveryType === "main_group" &&
      businessConfig.ratioVersion === "square_1_1";
    const isVerticalMain =
      businessConfig.deliveryType === "main_group" &&
      businessConfig.ratioVersion === "vertical_3_4";
    const isDetail = businessConfig.deliveryType === "detail_group";
    const isCustom = businessConfig.deliveryType === "custom_ad";
    return [
      {
        label: "产品大类已明确",
        ok: businessConfig.productLine === "desk_calendar" || businessConfig.productLine === "wall_calendar",
      },
      {
        label: "1:1 主图为 800×800",
        ok:
          !isSquareMain ||
          (activeTemplate.outputWidth === 800 && activeTemplate.outputHeight === 800),
      },
      {
        label: "3:4 主图为 750×1000",
        ok:
          !isVerticalMain ||
          (activeTemplate.outputWidth === 750 && activeTemplate.outputHeight === 1000),
      },
      {
        label: "主图/SKU/详情允许增删",
        ok:
          !["main_group", "sku_group", "detail_group"].includes(
            businessConfig.deliveryType,
          ) || businessConfig.allowProjectAddRemove,
      },
      {
        label: "产品槽位已配置",
        ok:
          activeTemplate.slots.length > 0 ||
          components.some((component) => component.type === "product_slot"),
      },
      {
        label: "详情页有切片角色",
        ok: !isDetail || businessConfig.role.toString().startsWith("detail_"),
      },
      {
        label: "广告定制不依赖 RunningHub",
        ok:
          !isCustom ||
          components.every(
            (component) =>
              component.type === "product_slot" || !component.sendToRunningHub,
          ),
      },
      {
        label: "文案/LOGO/装饰由 Canvas 叠加",
        ok:
          components.length === 0 ||
          components.some(
            (component) =>
              component.type !== "scene_base" && !component.sendToRunningHub,
          ),
      },
    ];
  }, [activeTemplate, businessConfig]);

  if (!activeTemplate) {
    return (
      <div className="flex h-full min-h-[620px] items-center justify-center bg-slate-50 text-sm text-slate-500">
        当前没有可编辑的模板。
      </div>
    );
  }

  // Save template edits to the per-thumbnail ref store
  const handleUpdateTemplate = (updated: Template) => {
    saveThumbTemplate(activeThumbId, updated);
  };

  const clearSelection = () => {
    setSelectedComponentId(null);
    setSelectedSlotId(null);
    setSelectedTextFieldId(null);
  };

  const updateBusinessConfig = (patch: Partial<BusinessTemplateConfig>) => {
    const nextDeliveryType = patch.deliveryType || businessConfig.deliveryType;
    const recommended =
      patch.deliveryType && patch.deliveryType !== businessConfig.deliveryType
        ? getRecommendedCount(nextDeliveryType)
        : null;
    const nextConfig: BusinessTemplateConfig = {
      ...businessConfig,
      ...patch,
      ...(recommended
        ? {
            defaultCount: recommended.defaultCount,
            minCount: recommended.min,
            maxCount: recommended.max,
            allowProjectAddRemove: [
              "main_group",
              "sku_group",
              "detail_group",
            ].includes(nextDeliveryType),
          }
        : {}),
    };
    setBusinessConfig(nextConfig);

    const size = patch.ratioVersion ? getSizeByRatio(patch.ratioVersion) : null;
    const templateType = patch.deliveryType
      ? getTemplateTypeByDelivery(patch.deliveryType)
      : activeTemplate.templateType;
    if (size || patch.deliveryType) {
      handleUpdateTemplate({
        ...activeTemplate,
        templateType,
        ...(size
          ? {
              outputWidth: size.width,
              outputHeight: size.height,
              aspectRatio:
                patch.ratioVersion === "vertical_3_4"
                  ? "3:4"
                  : patch.ratioVersion === "square_1_1"
                    ? "1:1"
                    : activeTemplate.aspectRatio,
            }
          : {}),
      });
    }
  };

  const activatePSEngine = () => {
    const components = getTemplateComponents(activeTemplate);
    handleUpdateTemplate({ ...activeTemplate, components });
    clearSelection();
    setSelectedComponentId(
      components.find((component) => component.type === "product_slot")?.id ||
        components[0]?.id ||
        null,
    );
  };

  const updateBackground = (field: keyof TemplateBackground, value: unknown) => {
    handleUpdateTemplate({
      ...activeTemplate,
      background: { ...activeTemplate.background, [field]: value },
    });
  };

  const updateComponent = (
    componentId: string,
    patch: Partial<TemplateComponent>,
  ) => {
    handleUpdateTemplate({
      ...activeTemplate,
      components: activeTemplate.components?.map((component) =>
        component.id === componentId ? { ...component, ...patch } : component,
      ),
    });
  };

  // Drag-to-move and resize effect (must be after updateComponent is defined)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag?.active) return;
      e.preventDefault();

      const rect = canvasAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;

      const isMove = drag.action === "move";
      const limit = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      const nextX = limit(drag.startTargetX + dxPct, 0, 100 - (isMove ? drag.startTargetW : 0));
      const nextY = limit(drag.startTargetY + dyPct, 0, 100 - (isMove ? drag.startTargetH : 0));

      if (drag.targetType === "component") {
        if (isMove) {
          updateComponent(drag.targetId, { x: nextX, y: nextY });
        } else {
          let rx = drag.startTargetX, ry = drag.startTargetY, rw = drag.startTargetW, rh = drag.startTargetH;
          if (drag.handle === "tl") { rx += dxPct; ry += dyPct; rw -= dxPct; rh -= dyPct; }
          else if (drag.handle === "tr") { ry += dyPct; rw += dxPct; rh -= dyPct; }
          else if (drag.handle === "bl") { rx += dxPct; rw -= dxPct; rh += dyPct; }
          else if (drag.handle === "br") { rw += dxPct; rh += dyPct; }
          rw = limit(rw, 2, 100); rh = limit(rh, 2, 100);
          // Proportional resize: lock aspect ratio
          const aspect = drag.startTargetW / Math.max(0.01, drag.startTargetH);
          const wDriven = Math.abs(rw - drag.startTargetW) >= Math.abs(rh - drag.startTargetH);
          if (wDriven) { rh = rw / aspect; } else { rw = rh * aspect; }
          rw = limit(rw, 2, 100); rh = limit(rh, 2, 100);
          if (drag.handle === "tl") { rx = drag.startTargetX + drag.startTargetW - rw; ry = drag.startTargetY + drag.startTargetH - rh; }
          else if (drag.handle === "tr") { ry = drag.startTargetY + drag.startTargetH - rh; }
          else if (drag.handle === "bl") { rx = drag.startTargetX + drag.startTargetW - rw; }
          rx = limit(rx, 0, 100 - rw); ry = limit(ry, 0, 100 - rh);
          updateComponent(drag.targetId, { x: rx, y: ry, width: rw, height: rh });
        }
      } else if (drag.targetType === "slot") {
        if (isMove) {
          // slot uses center coordinates, convert back from top-left
          updateSlotGeometry(drag.targetId, "x", nextX + drag.startTargetW / 2);
          updateSlotGeometry(drag.targetId, "y", nextY + drag.startTargetH / 2);
        } else {
          let rx = drag.startTargetX, ry = drag.startTargetY, rw = drag.startTargetW, rh = drag.startTargetH;
          if (drag.handle === "tl") { rx += dxPct; ry += dyPct; rw -= dxPct; rh -= dyPct; }
          else if (drag.handle === "tr") { ry += dyPct; rw += dxPct; rh -= dyPct; }
          else if (drag.handle === "bl") { rx += dxPct; rw -= dxPct; rh += dyPct; }
          else if (drag.handle === "br") { rw += dxPct; rh += dyPct; }
          rw = limit(rw, 2, 100); rh = limit(rh, 2, 100);
          // Proportional resize for slots too
          const sAspect = drag.startTargetW / Math.max(0.01, drag.startTargetH);
          const sWDriven = Math.abs(rw - drag.startTargetW) >= Math.abs(rh - drag.startTargetH);
          if (sWDriven) { rh = rw / sAspect; } else { rw = rh * sAspect; }
          rw = limit(rw, 2, 100); rh = limit(rh, 2, 100);
          if (drag.handle === "tl") { rx = drag.startTargetX + drag.startTargetW - rw; ry = drag.startTargetY + drag.startTargetH - rh; }
          else if (drag.handle === "tr") { ry = drag.startTargetY + drag.startTargetH - rh; }
          else if (drag.handle === "bl") { rx = drag.startTargetX + drag.startTargetW - rw; }
          rx = limit(rx, 0, 100 - rw); ry = limit(ry, 0, 100 - rh);
          // convert top-left back to slot center coordinates
          updateSlotGeometry(drag.targetId, "x", rx + rw / 2);
          updateSlotGeometry(drag.targetId, "y", ry + rh / 2);
          updateSlotGeometry(drag.targetId, "maxWidth", rw);
          updateSlotGeometry(drag.targetId, "maxHeight", rh);
        }
      } else if (drag.targetType === "textField") {
        if (isMove) {
          updateTextFieldValue(drag.targetId, "x", nextX);
          updateTextFieldValue(drag.targetId, "y", nextY);
        }
      }
      setDragTick((t) => t + 1);
    };

    const onUp = () => {
      if (dragRef.current?.active) { dragRef.current = null; setDragTick((t) => t + 1); }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [activeTemplate, updateComponent]);

  const updateSlotGeometry = (
    slotId: string,
    field: keyof TemplateSlot,
    value: unknown,
  ) => {
    handleUpdateTemplate({
      ...activeTemplate,
      slots: activeTemplate.slots.map((slot) =>
        slot.id === slotId ? { ...slot, [field]: value } : slot,
      ),
    });
  };

  const updateTextFieldValue = (
    fieldId: string,
    field: keyof TextField,
    value: unknown,
  ) => {
    handleUpdateTemplate({
      ...activeTemplate,
      textFields: activeTemplate.textFields.map((textField) =>
        textField.id === fieldId ? { ...textField, [field]: value } : textField,
      ),
    });
  };

  const deleteComponent = (componentId: string) => {
    handleUpdateTemplate({
      ...activeTemplate,
      components: activeTemplate.components?.filter(
        (component) => component.id !== componentId,
      ),
    });
    setSelectedComponentId(null);
  };

  React.useEffect(() => {
    const handleDeleteShortcut = (event: KeyboardEvent) => {
      if (event.key !== "Delete" || !selectedComponentId) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return;
      }
      event.preventDefault();
      deleteComponent(selectedComponentId);
    };

    window.addEventListener("keydown", handleDeleteShortcut);
    return () => window.removeEventListener("keydown", handleDeleteShortcut);
  }, [activePanel, activeTemplate, selectedComponentId]);

  const addComponent = (
    type: TemplateComponentType,
    imageUrl?: string,
    name?: string,
    position?: { x: number; y: number },
  ) => {
    const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const isScene = type === "scene_base";
    const component: TemplateComponent = {
      id,
      name: name || COMPONENT_TYPE_LABEL[type],
      type,
      imageUrl,
      x: isScene ? 0 : position?.x ?? (type === "product_slot" ? 36 : 20),
      y: isScene ? 0 : position?.y ?? (type === "product_slot" ? 34 : 20),
      width: isScene ? 100 : type === "product_slot" ? 42 : 46,
      height: isScene ? 100 : type === "product_slot" ? 42 : 18,
      zIndex: getDefaultZIndex(type),
      visible: true,
      sendToRunningHub: type === "scene_base" || type === "product_slot",
      lockAspectRatio: true,
      scaleMode: "contain",
      anchor: "center",
    };
    handleUpdateTemplate({
      ...activeTemplate,
      components: [...(activeTemplate.components || []), component],
    });
    clearSelection();
    setSelectedComponentId(id);
  };

  const importComponentFile = (file: File, position?: { x: number; y: number }) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const fileBaseName = file.name.replace(/\.[^.]+$/, "");
      const type = getComponentTypeByFileName(file.name);
      addComponent(type, dataUrl, `${fileBaseName} / ${COMPONENT_TYPE_LABEL[type]}`, position);
    };
    reader.readAsDataURL(file);
  };

  // Batch import: read all files, detect types, create components at once
  const handleBatchImport = async (files: FileList) => {
    const fileArray = Array.from(files);
    const newComponents: TemplateComponent[] = [];

    for (const file of fileArray) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const type = detectLayerType(file.name);
      const label = getTypeLabel(type);
      const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      newComponents.push({
        id,
        name: `${baseName} (${label})`,
        type,
        imageUrl: dataUrl,
        x: type === "scene_base" ? 0 : 50,
        y: type === "scene_base" ? 0 : 50,
        width: type === "scene_base" ? 100 : 30,
        height: type === "scene_base" ? 100 : 30,
        zIndex: getDefaultZIndexForType(type),
        visible: true,
        sendToRunningHub: getDefaultSendToRH(type),
        lockAspectRatio: true,
        scaleMode: "contain",
        anchor: "center",
      });
    }

    if (newComponents.length === 0) return;

    // Merge with existing components, scene_base goes first
    const existing = (activeTemplate.components || []).filter(
      (c) => !newComponents.some((nc) => nc.type === "scene_base" && c.type === "scene_base"),
    );
    const merged = [
      ...newComponents.filter((c) => c.type === "scene_base"),
      ...existing.filter((c) => c.type !== "scene_base"),
      ...newComponents.filter((c) => c.type !== "scene_base"),
    ];

    handleUpdateTemplate({ ...activeTemplate, components: merged });
  };

  const getRenderedContent = (textField: TextField, product: Product) => {
    if (!textField.isDynamic) return textField.content;
    return textField.content
      .replace("[productName]", product.productName)
      .replace("[productCode]", product.productCode)
      .replace("[size]", product.size)
      .replace("[seriesName]", product.seriesName)
      .replace("[materialCover]", product.materialCover)
      .replace("[materialInner]", product.materialInner)
      .replace("[thickness]", product.thickness);
  };

  const selectThumb = (thumb: TemplateThumb) => {
    setActiveThumbId(thumb.id);
    updateBusinessConfig({
      deliveryType: thumb.deliveryType,
      ratioVersion: thumb.ratioVersion,
      role: thumb.role,
    });
    // Ensure the new thumbnail has a template with correct dimensions (preserves existing layers)
    const existing = getThumbTemplate(thumb.id);
    const updated: Template = {
      ...existing,
      templateType: getTemplateTypeByDelivery(thumb.deliveryType),
      outputWidth: thumb.width,
      outputHeight: thumb.height,
      aspectRatio:
        thumb.ratioVersion === "vertical_3_4"
          ? "3:4"
          : thumb.ratioVersion === "square_1_1"
            ? "1:1"
            : existing.aspectRatio || "1:1",
    };
    saveThumbTemplate(thumb.id, updated);
    clearSelection();
  };

  const handleCanvasDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    let file: File | null = null;
    for (let index = 0; index < event.dataTransfer.files.length; index += 1) {
      const item = event.dataTransfer.files.item(index);
      if (item && item.type.startsWith("image/")) {
        file = item;
        break;
      }
    }
    if (!file) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    importComponentFile(file, {
      x: Math.min(95, Math.max(5, x)),
      y: Math.min(95, Math.max(5, y)),
    });
  };

  const renderProductPreview = () => (
    <div className="absolute inset-[12%] overflow-hidden rounded-lg border border-white/40 bg-gradient-to-b from-red-600 to-red-700 shadow-2xl">
      <div className="absolute inset-x-0 top-0 flex h-[16%] justify-center gap-2 border-b border-slate-400 bg-slate-200 pt-1.5">
        {Array.from({ length: 9 }).map((_, index) => (
          <span
            key={index}
            className="h-4 w-2.5 rounded-b bg-slate-500 shadow-sm"
          />
        ))}
      </div>
      <div className="absolute inset-x-[12%] top-[32%] text-center text-white">
        <div className="text-xs tracking-[0.25em] opacity-80">2026</div>
        <div className="mt-2 text-xl font-bold">{activeProduct.productName}</div>
        <div className="mt-2 text-[10px] opacity-80">
          {activeProduct.seriesName}
        </div>
      </div>
      <div className="absolute inset-x-[9%] bottom-[12%] flex h-8 items-center justify-center rounded border border-yellow-300 bg-yellow-100 text-[10px] text-slate-800">
        企业广告位 / LOGO 位
      </div>
    </div>
  );

  const renderComponentOnCanvas = (component: TemplateComponent) => {
    if (component.visible === false) return null;
    const isSelected = selectedComponentId === component.id && dragRef.current?.targetId !== component.id;
    const isDragTarget = dragRef.current?.active && dragRef.current.targetId === component.id;
    const isScene = component.type === "scene_base";
    const isLocked = component.type === "scene_base";
    const compX = isScene ? 0 : (component.x ?? 50);
    const compY = isScene ? 0 : (component.y ?? 50);
    const compW = isScene ? 100 : (component.width ?? 30);
    const compH = isScene ? 100 : (component.height ?? 30);
    const style: React.CSSProperties = isScene
      ? {
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          zIndex: component.zIndex,
        }
      : {
          left: `${component.x}%`,
          top: `${component.y}%`,
          width: `${component.width}%`,
          height: `${component.height}%`,
          zIndex: component.zIndex,
        };

    if (isScene) {
      return (
        <div
          key={component.id}
          className={`absolute inset-0 text-left ${isLocked ? "" : "cursor-move"}`}
          style={style}
          onMouseDown={(e) => {
            if (isLocked) return;
            startDrag(e, "move", "component", component.id, { x: compX, y: compY, w: compW, h: compH });
          }}
        >
          {component.imageUrl ? (
            <img src={component.imageUrl} alt={component.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
      );
    }

    return (
      <div
        key={component.id}
        className={`absolute rounded-md text-left ${
          isSelected ? "ring-2 ring-blue-500" : "ring-1 ring-white/40 hover:ring-blue-300/70"
        } ${component.type === "product_slot" ? "border border-dashed border-blue-500 bg-transparent" : "bg-transparent"} ${
          isLocked ? "" : "cursor-move"
        }`}
        style={style}
        onMouseDown={(e) => {
          if (isLocked) return;
          startDrag(e, "move", "component", component.id, { x: compX, y: compY, w: compW, h: compH });
        }}
      >
        {component.imageUrl ? (
          <img
            src={component.imageUrl}
            alt={component.name}
            className="h-full w-full object-contain pointer-events-none"
          />
        ) : component.type === "product_slot" ? (
          renderProductPreview()
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/70 text-[10px] font-bold text-slate-700">
            {COMPONENT_TYPE_LABEL[component.type]}
          </div>
        )}
        <span className="absolute -top-5 left-0 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
          {component.name}
        </span>
      </div>
    );
  };

  // TransformBox: renders selection frame + corner handles for selected component/slot/textField
  const renderTransformBox = () => {
    // Determine target pos/size based on selection type
    let tx = 0, ty = 0, tw = 30, th = 30, tLocked = false, tVisible = true;
    if (selectedComponentId && activeTemplate.components) {
      const c = activeTemplate.components.find((x) => x.id === selectedComponentId);
      if (!c || c.visible === false) return null;
      if (c.type === "scene_base") return null;
      tx = c.x ?? 50; ty = c.y ?? 50; tw = c.width ?? 30; th = c.height ?? 30;
      tLocked = false; tVisible = true;
    } else if (selectedSlotId) {
      const s = activeTemplate.slots.find((x) => x.id === selectedSlotId);
      if (!s) return null;
      // slot uses translate(-50%,-50%) so actual top-left = x - w/2, y - h/2
      tx = s.x - s.maxWidth / 2; ty = s.y - s.maxHeight / 2; tw = s.maxWidth; th = s.maxHeight;
    } else if (selectedTextFieldId) {
      const tf = activeTemplate.textFields.find((x) => x.id === selectedTextFieldId);
      if (!tf) return null;
      tx = tf.x; ty = tf.y; tw = 24; th = 8; // textField estimated size
    } else return null;
    if (!tVisible) return null;

    const handles = ["tl","tr","bl","br"] as const;
    const hStyle = "absolute w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-sm z-[9999] pointer-events-auto";
    const hCur = {tl:"nwse-resize",tr:"nesw-resize",bl:"nesw-resize",br:"nwse-resize"};
    return (
      <div className="pointer-events-none absolute z-[5000]" style={{left: tx + '%', top: ty + '%', width: tw + '%', height: th + '%'}}>
        <div className="absolute inset-0 border-2 border-blue-500" />
        {!tLocked && handles.map((h) => (
          <div key={h} className={hStyle} style={{cursor:hCur[h],...(h==="tl"?{left:-5,top:-5}:h==="tr"?{right:-5,top:-5}:h==="bl"?{left:-5,bottom:-5}:{right:-5,bottom:-5})}}
            onMouseDown={(e) => { e.stopPropagation();
              if (selectedComponentId) startDrag(e, "resize", "component", selectedComponentId, { x: tx, y: ty, w: tw, h: th }, h);
              else if (selectedSlotId) startDrag(e, "resize", "slot", selectedSlotId, { x: tx, y: ty, w: tw, h: th }, h);
            }}
          />
        ))}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
          {Math.round(tx)},{Math.round(ty)} · {Math.round(tw)}×{Math.round(th)}
        </div>
      </div>
    );
  };

  // Inspector: right panel content for selected element
  const buildInspector = () => {
    const sel = selectedComponent;
    const sSlot = selectedSlot;
    const sTf = selectedTextField;
    if (!sel && !sSlot && !sTf) {
      return <div className="text-center py-8 text-[11px] text-slate-400">请选择画布元素或左侧图层进行编辑</div>;
    }
    const Field = ({l,children}:{l:string,children:React.ReactNode}) => (
      <div className="mb-2">
        <div className="mb-0.5 text-[9px] font-bold text-slate-400">{l}</div>
        {children}
      </div>
    );
    const NInp = ({v,onCh,min,max}:{v:number,onCh:(n:number)=>void,min?:number,max?:number}) => (
      <input type="number" value={Math.round(v*10)/10} step={0.5} min={min??0} max={max??100}
        onChange={(e) => onCh(Number(e.target.value))}
        className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] font-mono" />
    );
    return (
      <div className="space-y-3 text-[11px]">
        {sel && (
          <>
            <Field l="名称"><input value={sel.name||""} onChange={(e) => updateComponent(sel.id,{name:e.target.value})} className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] font-bold" /></Field>
            <Field l="类型"><span className="text-[10px] text-slate-500">{COMPONENT_TYPE_LABEL[sel.type]}</span></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field l="X"><NInp v={sel.x??50} onCh={(n) => updateComponent(sel.id,{x:n})} /></Field>
              <Field l="Y"><NInp v={sel.y??50} onCh={(n) => updateComponent(sel.id,{y:n})} /></Field>
              <Field l="宽度"><NInp v={sel.width??30} onCh={(n) => updateComponent(sel.id,{width:n})} min={2} /></Field>
              <Field l="高度"><NInp v={sel.height??30} onCh={(n) => updateComponent(sel.id,{height:n})} min={2} /></Field>
            </div>
            <Field l="zIndex"><NInp v={sel.zIndex??0} onCh={(n) => updateComponent(sel.id,{zIndex:n})} min={0} max={999} /></Field>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-[10px] cursor-pointer"><input type="checkbox" checked={sel.visible!==false} onChange={(e) => updateComponent(sel.id,{visible:e.target.checked})} /> 可见</label>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer"><input type="checkbox" checked={sel.sendToRunningHub??false} onChange={(e) => updateComponent(sel.id,{sendToRunningHub:e.target.checked})} /> 发送RH</label>
            </div>
            <button type="button" onClick={() => deleteComponent(sel.id)} className="w-full rounded bg-rose-50 py-1.5 text-[10px] font-bold text-rose-600">删除图层</button>
          </>
        )}
        {sSlot && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field l="X"><NInp v={sSlot.x} onCh={(n) => updateSlotGeometry(sSlot.id,"x",n)} /></Field>
              <Field l="Y"><NInp v={sSlot.y} onCh={(n) => updateSlotGeometry(sSlot.id,"y",n)} /></Field>
              <Field l="最大宽"><NInp v={sSlot.maxWidth} onCh={(n) => updateSlotGeometry(sSlot.id,"maxWidth",n)} min={2} /></Field>
              <Field l="最大高"><NInp v={sSlot.maxHeight} onCh={(n) => updateSlotGeometry(sSlot.id,"maxHeight",n)} min={2} /></Field>
            </div>
          </>
        )}
        {sTf && (
          <>
            <Field l="文案内容"><textarea value={sTf.content} onChange={(e) => updateTextFieldValue(sTf.id,"content",e.target.value)} className="w-full min-h-[60px] rounded border border-slate-200 px-2 py-1 text-[10px] font-bold" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field l="X"><NInp v={sTf.x} onCh={(n) => updateTextFieldValue(sTf.id,"x",n)} /></Field>
              <Field l="Y"><NInp v={sTf.y} onCh={(n) => updateTextFieldValue(sTf.id,"y",n)} /></Field>
              <Field l="字号"><NInp v={sTf.fontSize} onCh={(n) => updateTextFieldValue(sTf.id,"fontSize",n)} min={6} max={200} /></Field>
              <Field l="颜色"><input type="color" value={sTf.color||"#000000"} onChange={(e) => updateTextFieldValue(sTf.id,"color",e.target.value)} className="w-full h-8 rounded border border-slate-200 p-0.5" /></Field>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderLayerList = () => {
    const groups = [
      { type: "scene_base" as const, label: "场景", color: "bg-slate-400" },
      { type: "product_slot" as const, label: "产品槽", color: "bg-blue-400" },
      { type: "text_overlay" as const, label: "文案", color: "bg-sky-400" },
      { type: "logo_overlay" as const, label: "LOGO", color: "bg-teal-400" },
      { type: "decor_overlay" as const, label: "装饰", color: "bg-rose-400" },
    ];
    const allComps = [...(activeTemplate.components || [])].sort((a, b) => {
      if (a.type === "scene_base") return 1;
      if (b.type === "scene_base") return -1;
      return (b.zIndex ?? 0) - (a.zIndex ?? 0);
    });
    return (
      <div className="space-y-2">
        {groups.map((g) => {
          const items = allComps.filter((c) => c.type === g.type);
          if (items.length === 0) return null;
          return (
            <div key={g.type}>
              <div className="mb-1 text-[9px] font-bold text-slate-400">{g.label} · {items.length}</div>
              {items.map((c) => (
                <div key={c.id}
                  onDragOver={(e) => { if (c.type !== "scene_base") e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); if (draggingLayerId && draggingLayerId !== c.id) reorderComponentLayer(draggingLayerId, c.id); setDraggingLayerId(null); }}
                  className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] cursor-pointer ${
                    draggingLayerId === c.id ? "bg-blue-100/50" : ""
                  } ${selectedComponentId === c.id ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "text-slate-600 hover:bg-slate-50"}`}
                  onClick={() => { setSelectedComponentId(c.id); setSelectedSlotId(null); setSelectedTextFieldId(null); }}>
                  {c.type !== "scene_base" && (
                    <button type="button" draggable
                      onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = "move"; setDraggingLayerId(c.id); }}
                      onDragEnd={() => setDraggingLayerId(null)}
                      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 px-0.5 shrink-0" title="拖动排序">
                      ⠿
                    </button>
                  )}
                  <span className={`h-2 w-2 shrink-0 rounded-full ${g.color}`} />
                  <span className="truncate font-medium flex-1">{c.name || c.type}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); updateComponent(c.id, { visible: c.visible === false ? true : false }); }}
                    className="text-[9px] px-0.5 hover:bg-slate-200 rounded">{c.visible === false ? "⊘" : "◉"}</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); deleteComponent(c.id); }}
                    className="text-[9px] px-0.5 hover:bg-red-100 hover:text-red-500 rounded text-slate-400" title="删除图层">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        {activeTemplate.slots.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="mb-1 text-[9px] font-bold text-slate-400">旧版槽位</div>
            {activeTemplate.slots.map((s) => (
              <div key={s.id} className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] cursor-pointer ${selectedSlotId === s.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
                onClick={() => { setSelectedSlotId(s.id); setSelectedComponentId(null); setSelectedTextFieldId(null); }}>
                <span className="h-2 w-2 shrink-0 rounded-full bg-blue-400" /><span className="truncate font-medium">{s.slotName || "槽位"}</span>
              </div>
            ))}
          </div>
        )}
        {activeTemplate.textFields.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="mb-1 text-[9px] font-bold text-slate-400">文字</div>
            {activeTemplate.textFields.map((tf) => (
              <div key={tf.id} className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] cursor-pointer ${selectedTextFieldId === tf.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
                onClick={() => { setSelectedTextFieldId(tf.id); setSelectedComponentId(null); setSelectedSlotId(null); }}>
                <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" /><span className="truncate font-medium">{tf.fieldName || "文字"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFloatingLayerList = () => (
    <div className="w-[340px] max-h-[56vh] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <span className="text-[11px] font-black text-slate-700">图层列表</span>
        <div className="flex gap-1">
          <button type="button" onClick={() => setActivePanel("import")} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">导入</button>
          <button type="button" onClick={() => setActivePanel("slots")} className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">添加</button>
        </div>
      </div>
      <div className="max-h-[44vh] overflow-y-auto p-2">
        {renderLayerList()}
      </div>
    </div>
  );

  const renderLegacySlot = (slot: TemplateSlot) => {
    const isSelected = selectedSlotId === slot.id;
    return (
      <div
        key={slot.id}
        onMouseDown={(e) => {
          startDrag(e, "move", "slot", slot.id, { x: slot.x - slot.maxWidth / 2, y: slot.y - slot.maxHeight / 2, w: slot.maxWidth, h: slot.maxHeight });
        }}
        className={`absolute rounded-md border border-dashed border-blue-500 bg-transparent cursor-move text-left ${
          isSelected
            ? "border-blue-500 ring-2 ring-blue-500"
            : "border-blue-400"
        }`}
        style={{
          left: `${slot.x}%`,
          top: `${slot.y}%`,
          width: `${slot.maxWidth}%`,
          height: `${slot.maxHeight}%`,
          transform: "translate(-50%, -50%)",
          zIndex: slot.layer,
        }}
      >
        {renderProductPreview()}
        <span className="absolute -top-5 left-0 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
          {slot.slotName}
        </span>
      </div>
    );
  };

  const renderTextField = (textField: TextField) => {
    const isSelected = selectedTextFieldId === textField.id;
    return (
      <div
        key={textField.id}
        onMouseDown={(e) => {
          startDrag(e, "move", "textField", textField.id, { x: textField.x, y: textField.y, w: 24, h: 8 });
        }}
        className={`absolute max-w-[80%] cursor-move rounded px-1.5 py-1 text-left ${
          isSelected ? "ring-2 ring-sky-500" : "hover:ring-1"
        }`}
        style={{
          left: `${textField.x}%`,
          top: `${textField.y}%`,
          transform: "translate(-50%, -50%)",
          fontSize: Math.max(10, textField.fontSize * 0.28),
          fontWeight: textField.fontWeight,
          color: textField.color,
          textAlign: textField.align,
          zIndex: 60,
        }}
      >
        {getRenderedContent(textField, activeProduct)}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-[680px] flex-col overflow-hidden bg-slate-100 text-left text-slate-800">
      <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              真实交付模板配置器
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-black text-slate-800">
                {activeTemplate.templateName}
              </span>
              <span className="truncate rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {businessPathLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGrid((value) => !value)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                showGrid
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              网格
            </button>
            <button
              type="button"
              onClick={() => setShowSafetyRegion((value) => !value)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                showSafetyRegion
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <Maximize className="h-3.5 w-3.5" />
              安全区
            </button>
            <select
              value={zoomRatio}
              onChange={(event) => setZoomRatio(Number(event.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700"
            >
              <option value={80}>80%</option>
              <option value={100}>100%</option>
              <option value={120}>120%</option>
            </select>
            <button
              type="button"
              onClick={() => setActivePanel("test")}
              className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
            >
              <Play className="h-3.5 w-3.5" />
              试套检查
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveTemplate(activeTemplate);
                setActivePanel("save");
              }}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              保存模板页
            </button>
          </div>
        </div>
      </header>

      {/* Non-layers floating panels (import, slots, test, save) */}
      {activePanel && (
        <FloatingEditorPanel
          activePanel={activePanel}
          onClose={() => setActivePanel(null)}
          activeTemplate={activeTemplate}
          activeProduct={activeProduct}
          products={products}
          businessConfig={businessConfig}
          selectedComponent={selectedComponent}
          selectedSlot={selectedSlot}
          selectedTextField={selectedTextField}
          sortedComponents={sortedComponents}
          mainThemeCount={mainThemeCount}
          skuCount={skuCount}
          detailCount={detailCount}
          inspectionItems={inspectionItems}
          onBusinessChange={updateBusinessConfig}
          onTemplateChange={handleUpdateTemplate}
          onBackgroundChange={updateBackground}
          onBatchImport={handleBatchImport}
          onActivateLayers={activatePSEngine}
          onAddComponent={addComponent}
          onComponentSelect={(id) => { setSelectedComponentId(id); setSelectedSlotId(null); setSelectedTextFieldId(null); }}
          onComponentUpdate={(id, patch) => updateComponent(id, patch)}
          onComponentDelete={deleteComponent}
          onSlotUpdate={(id, field, value) => updateSlotGeometry(id, field, value)}
          onTextFieldUpdate={(id, field, value) => updateTextFieldValue(id, field, value)}
          onProductChange={setSelectedProductId}
          onMainThemeCountChange={setMainThemeCount}
          onSkuCountChange={setSkuCount}
          onDetailCountChange={setDetailCount}
          onSave={() => { onSaveTemplate(activeTemplate); setActivePanel(null); }}
        />
      )}

      {/* Three-column body: left(layers+props) | center(canvas) | right(ThumbnailBoard) */}
      <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_360px] gap-3 overflow-hidden p-3">
        {/* LEFT: properties only */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="px-3 py-2 shrink-0 border-b border-slate-100">
            <span className="text-xs font-black text-slate-700">图层属性</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {buildInspector()}
          </div>
        </aside>

        {/* CENTER: Canvas */}
        <div className="relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">模板画布</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold">{activeTemplate.outputWidth}×{activeTemplate.outputHeight}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold">{zoomRatio}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowGrid(!showGrid)} className={`rounded px-2 py-0.5 text-[10px] font-bold ${showGrid ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>网格</button>
              <button type="button" onClick={() => setShowSafetyRegion(!showSafetyRegion)} className={`rounded px-2 py-0.5 text-[10px] font-bold ${showSafetyRegion ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>安全区</button>
              <select value={zoomRatio} onChange={(e) => setZoomRatio(Number(e.target.value))} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">
                <option value={80}>80%</option><option value={100}>100%</option><option value={120}>120%</option>
              </select>
              <button type="button" onClick={() => setActivePanel("test")} className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">试套检查</button>
              <button type="button" onClick={() => onSaveTemplate(activeTemplate)} className="rounded bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">保存</button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <div className="flex min-h-full items-center justify-center">
              <div className="relative inline-block">
                <div
                  ref={canvasAreaRef}
                  onMouseDown={(e) => { if (e.target === e.currentTarget) { setSelectedComponentId(null); setSelectedSlotId(null); setSelectedTextFieldId(null); } }}
                  className={`relative overflow-hidden border border-slate-300 shadow-2xl ${activeTemplate.background.type === "scene" ? getCanvasBackgroundClass(activeTemplate.background.sceneStyle) : "bg-white"}`}
                  onDragOver={handleCanvasDragOver}
                  onDrop={handleCanvasDrop}
                  style={{ width: canvasSize.width, height: canvasSize.height }}
                >
                  {showGrid && (<div className="absolute inset-0 opacity-40" style={{backgroundImage:"linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)",backgroundSize:"20px 20px"}} />)}
                  {sortedComponents.map(renderComponentOnCanvas)}
                  {!hasLayerComponents && activeTemplate.slots.map(renderLegacySlot)}
                  {activeTemplate.textFields.map(renderTextField)}
                  {renderTransformBox()}
                  {showSafetyRegion && (<div className="pointer-events-none absolute inset-[6%] border-2 border-dashed border-rose-400/70" />)}
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
                  {/* Toggle button */}
                  <button type="button" onClick={() => setIsLayerPanelOpen(v => !v)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-lg hover:bg-slate-50 hover:text-slate-800 transition-colors"
                    title={isLayerPanelOpen ? "收起图层列表" : "展开图层列表"}>
                    <Layers className="h-4 w-4" />
                  </button>
                  {isLayerPanelOpen && (
                    <div className="absolute bottom-12 left-0">
                      {renderFloatingLayerList()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: ThumbnailBoard */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ThumbnailBoard
            thumbnails={TEMPLATE_THUMBNAILS}
            activeThumbId={activeThumbId}
            thumbFilter={thumbFilter}
            mainThemeCount={mainThemeCount}
            skuCount={skuCount}
            detailCount={detailCount}
            getThumbTemplate={getThumbTemplate}
            onFilterChange={setThumbFilter}
            onThumbSelect={selectThumb}
            onAddMain={() => setMainThemeCount((count) => count + 1)}
            onAddSku={() => setSkuCount((count) => count + 1)}
            onAddDetail={() => setDetailCount((count) => count + 1)}
          />
        </aside>
      </div>
    </div>
  );
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="mb-1 block text-[11px] font-bold text-slate-500">
    {children}
  </label>
);

const NumberInput: React.FC<{
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}> = ({ label, value, min = 0, max = 100, onChange }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <input
      type="number"
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

const FloatingToolbar: React.FC<{
  activePanel: FloatingPanel | null;
  onPanelChange: (panel: FloatingPanel) => void;
}> = ({ activePanel, onPanelChange }) => {
  const items: Array<{
    id: FloatingPanel;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "info", label: "模板信息", icon: Sliders },
    { id: "import", label: "导入分层", icon: FolderOpen },
    { id: "slots", label: "添加槽位", icon: Plus },
    { id: "test", label: "试套检查", icon: Play },
    { id: "save", label: "保存检查", icon: Check },
  ];
  return (
    <div className="absolute left-4 top-4 z-30 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl shadow-slate-900/10">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activePanel;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPanelChange(item.id)}
            title={item.label}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              active
                ? "border-blue-500 bg-blue-600 text-white"
                : "border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
};

const FloatingEditorPanel: React.FC<{
  activePanel: FloatingPanel;
  onClose: () => void;
  activeTemplate: Template;
  activeProduct?: Product;
  products: Product[];
  businessConfig: BusinessTemplateConfig;
  selectedComponent?: TemplateComponent;
  selectedSlot?: TemplateSlot;
  selectedTextField?: TextField;
  sortedComponents: TemplateComponent[];
  mainThemeCount: number;
  skuCount: number;
  detailCount: number;
  inspectionItems: Array<{ label: string; ok: boolean }>;
  onBusinessChange: (patch: Partial<BusinessTemplateConfig>) => void;
  onTemplateChange: (template: Template) => void;
  onBackgroundChange: (field: keyof TemplateBackground, value: unknown) => void;
  onBatchImport: (files: FileList) => void;
  onActivateLayers: () => void;
  onAddComponent: (
    type: TemplateComponentType,
    imageUrl?: string,
    name?: string,
  ) => void;
  onComponentSelect: (id: string) => void;
  onComponentUpdate: (
    componentId: string,
    patch: Partial<TemplateComponent>,
  ) => void;
  onComponentDelete: (componentId: string) => void;
  onSlotUpdate: (slotId: string, field: keyof TemplateSlot, value: unknown) => void;
  onTextFieldUpdate: (
    fieldId: string,
    field: keyof TextField,
    value: unknown,
  ) => void;
  onProductChange: (productId: string) => void;
  onMainThemeCountChange: (count: number) => void;
  onSkuCountChange: (count: number) => void;
  onDetailCountChange: (count: number) => void;
  onSave: () => void;
}> = ({
  activePanel,
  onClose,
  activeTemplate,
  activeProduct,
  products,
  businessConfig,
  selectedComponent,
  selectedSlot,
  selectedTextField,
  sortedComponents,
  mainThemeCount,
  skuCount,
  detailCount,
  inspectionItems,
  onBusinessChange,
  onTemplateChange,
  onBackgroundChange,
  onBatchImport,
  onActivateLayers,
  onAddComponent,
  onComponentSelect,
  onComponentUpdate,
  onComponentDelete,
  onSlotUpdate,
  onTextFieldUpdate,
  onProductChange,
  onMainThemeCountChange,
  onSkuCountChange,
  onDetailCountChange,
  onSave,
}) => {
  const panelPositionClass = "left-4 top-4 max-h-[calc(100vh-8rem)]";

  return (
    <aside
      className={`fixed z-50 flex w-80 flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 ${panelPositionClass}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm hover:bg-slate-50"
        title="收起面板"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="border-b border-slate-200 py-3 pl-4 pr-12">
        <div className="text-sm font-black text-slate-900">
          {activePanel === "info" && "模板信息"}
          {activePanel === "import" && "导入分层"}
          {activePanel === "slots" && "添加槽位"}
          {activePanel === "info" && "信息"}
          {activePanel === "test" && "试套检查"}
          {activePanel === "save" && "保存检查"}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          只显示当前操作需要的内容。
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {activePanel === "info" && (
          <InfoPanel
            activeTemplate={activeTemplate}
            businessConfig={businessConfig}
            mainThemeCount={mainThemeCount}
            skuCount={skuCount}
            detailCount={detailCount}
            onBusinessChange={onBusinessChange}
            onTemplateChange={onTemplateChange}
            onBackgroundChange={onBackgroundChange}
            onMainThemeCountChange={onMainThemeCountChange}
            onSkuCountChange={onSkuCountChange}
            onDetailCountChange={onDetailCountChange}
          />
        )}
        {activePanel === "import" && (
          <ImportPanel
            onBatchImport={onBatchImport}
            onActivateLayers={onActivateLayers}
          />
        )}
        {activePanel === "slots" && (
          <SlotsPanel
            selectedSlot={selectedSlot}
            onAddComponent={onAddComponent}
            onSlotUpdate={onSlotUpdate}
          />
        )}
        {activePanel === "test" && (
          <TestPanel
            products={products}
            activeProduct={activeProduct}
            inspectionItems={inspectionItems}
            onProductChange={onProductChange}
          />
        )}
        {activePanel === "save" && (
          <SavePanel inspectionItems={inspectionItems} onSave={onSave} />
        )}
      </div>
    </aside>
  );
};

const InfoPanel: React.FC<{
  activeTemplate: Template;
  businessConfig: BusinessTemplateConfig;
  mainThemeCount: number;
  skuCount: number;
  detailCount: number;
  onBusinessChange: (patch: Partial<BusinessTemplateConfig>) => void;
  onTemplateChange: (template: Template) => void;
  onBackgroundChange: (field: keyof TemplateBackground, value: unknown) => void;
  onMainThemeCountChange: (count: number) => void;
  onSkuCountChange: (count: number) => void;
  onDetailCountChange: (count: number) => void;
}> = ({
  activeTemplate,
  businessConfig,
  mainThemeCount,
  skuCount,
  detailCount,
  onBusinessChange,
  onTemplateChange,
  onBackgroundChange,
  onMainThemeCountChange,
  onSkuCountChange,
  onDetailCountChange,
}) => (
  <div className="space-y-4">
    <div>
      <FieldLabel>模板页名称</FieldLabel>
      <input
        value={activeTemplate.templateName}
        onChange={(event) =>
          onTemplateChange({ ...activeTemplate, templateName: event.target.value })
        }
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold"
      />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <SelectField
        label="产品大类"
        value={businessConfig.productLine}
        options={PRODUCT_LINE_OPTIONS}
        onChange={(value) => onBusinessChange({ productLine: value as ProductLine })}
      />
      <SelectField
        label="交付类型"
        value={businessConfig.deliveryType}
        options={DELIVERY_TYPE_OPTIONS}
        onChange={(value) => onBusinessChange({ deliveryType: value as DeliveryType })}
      />
    </div>
    <SelectField
      label="比例版本"
      value={businessConfig.ratioVersion}
      options={RATIO_VERSION_OPTIONS}
      onChange={(value) => onBusinessChange({ ratioVersion: value as RatioVersion })}
    />
    <p className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700">
      {
        RATIO_VERSION_OPTIONS.find(
          (option) => option.value === businessConfig.ratioVersion,
        )?.aliases
      }
    </p>
    <SelectField
      label="页面角色"
      value={businessConfig.role}
      options={ROLE_OPTIONS}
      onChange={(value) => onBusinessChange({ role: value as BusinessRole })}
    />
    <div className="grid grid-cols-3 gap-2">
      <NumberInput
        label="主图组"
        value={mainThemeCount}
        min={1}
        max={20}
        onChange={onMainThemeCountChange}
      />
      <NumberInput
        label="SKU"
        value={skuCount}
        min={1}
        max={20}
        onChange={onSkuCountChange}
      />
      <NumberInput
        label="详情"
        value={detailCount}
        min={1}
        max={40}
        onChange={onDetailCountChange}
      />
    </div>
    <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
      <input
        type="checkbox"
        checked={businessConfig.allowProjectAddRemove}
        onChange={(event) =>
          onBusinessChange({ allowProjectAddRemove: event.target.checked })
        }
      />
      项目套版时允许增删
    </label>
    <div className="grid grid-cols-2 gap-2">
      <NumberInput
        label="输出宽度"
        min={1}
        max={10000}
        value={activeTemplate.outputWidth}
        onChange={(value) =>
          onTemplateChange({ ...activeTemplate, outputWidth: value })
        }
      />
      <NumberInput
        label="输出高度"
        min={1}
        max={10000}
        value={activeTemplate.outputHeight}
        onChange={(value) =>
          onTemplateChange({ ...activeTemplate, outputHeight: value })
        }
      />
    </div>
    <SelectField
      label="背景类型"
      value={activeTemplate.background.type}
      options={[
        { value: "scene", label: "场景底图" },
        { value: "color", label: "纯色背景" },
        { value: "gradient", label: "渐变背景" },
      ]}
      onChange={(value) => onBackgroundChange("type", value)}
    />
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const ImportPanel: React.FC<{
  onBatchImport: (files: FileList) => void;
  onActivateLayers: () => void;
}> = ({ onBatchImport, onActivateLayers }) => (
  <div className="space-y-4">
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
      <div className="flex items-center gap-2 font-bold text-slate-900">
        <FolderOpen className="h-4 w-4 text-indigo-600" />
        PS 导出图层批量导入
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        批量上传从 PS 导出的分层 PNG。文件名含 scene/bg→场景底图, product→产品槽, text/文案→文案层, logo→LOGO层, decor/装饰→装饰层。
      </p>
      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-indigo-300 bg-white px-4 py-7 text-center hover:bg-indigo-50">
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const files = event.target.files;
            if (files && files.length > 0) onBatchImport(files);
            event.target.value = "";
          }}
        />
        <Sparkles className="mb-2 h-7 w-7 text-indigo-500" />
        <span className="text-sm font-bold text-slate-800">批量上传图层</span>
        <span className="mt-1 text-[11px] text-slate-400">
          PNG / JPG / WebP · 多选 · 自动识别类型
        </span>
      </label>
    </div>
    <button
      type="button"
      onClick={onActivateLayers}
      className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white"
    >
      从旧模板转为分层结构
    </button>
  </div>
);

const SlotsPanel: React.FC<{
  selectedSlot?: TemplateSlot;
  onAddComponent: (
    type: TemplateComponentType,
    imageUrl?: string,
    name?: string,
  ) => void;
  onSlotUpdate: (slotId: string, field: keyof TemplateSlot, value: unknown) => void;
}> = ({ selectedSlot, onAddComponent, onSlotUpdate }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onAddComponent("product_slot")}
        className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-3 text-xs font-bold text-blue-700"
      >
        产品槽位
      </button>
      <button
        type="button"
        onClick={() => onAddComponent("logo_overlay")}
        className="rounded-lg border border-teal-200 bg-teal-50 px-2 py-3 text-xs font-bold text-teal-700"
      >
        LOGO 位
      </button>
      <button
        type="button"
        onClick={() => onAddComponent("decor_overlay")}
        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-3 text-xs font-bold text-rose-700"
      >
        装饰层
      </button>
      <button
        type="button"
        onClick={() => onAddComponent("text_overlay")}
        className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-3 text-xs font-bold text-sky-700"
      >
        文案层
      </button>
    </div>
    {selectedSlot && (
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="mb-3 text-sm font-bold text-slate-900">当前槽位</div>
        <input
          value={selectedSlot.slotName}
          onChange={(event) =>
            onSlotUpdate(selectedSlot.id, "slotName", event.target.value)
          }
          className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold"
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="X"
            value={selectedSlot.x}
            onChange={(value) => onSlotUpdate(selectedSlot.id, "x", value)}
          />
          <NumberInput
            label="Y"
            value={selectedSlot.y}
            onChange={(value) => onSlotUpdate(selectedSlot.id, "y", value)}
          />
          <NumberInput
            label="宽度"
            value={selectedSlot.maxWidth}
            onChange={(value) =>
              onSlotUpdate(selectedSlot.id, "maxWidth", value)
            }
          />
          <NumberInput
            label="高度"
            value={selectedSlot.maxHeight}
            onChange={(value) =>
              onSlotUpdate(selectedSlot.id, "maxHeight", value)
            }
          />
        </div>
      </div>
    )}
  </div>
);

const LAYER_GROUP_CONFIG: Array<{
  type: TemplateComponentType;
  label: string;
  icon: string;
  borderColor: string;
  bgColor: string;
}> = [
  { type: "scene_base", label: "场景底图", icon: "🖼️", borderColor: "border-slate-300", bgColor: "bg-slate-50" },
  { type: "product_slot", label: "产品槽位", icon: "📦", borderColor: "border-blue-300", bgColor: "bg-blue-50" },
  { type: "text_overlay", label: "文案层", icon: "📝", borderColor: "border-sky-300", bgColor: "bg-sky-50" },
  { type: "logo_overlay", label: "LOGO 层", icon: "🏷️", borderColor: "border-teal-300", bgColor: "bg-teal-50" },
  { type: "decor_overlay", label: "装饰层", icon: "✨", borderColor: "border-rose-300", bgColor: "bg-rose-50" },
];

const LayersPanel: React.FC<{
  sortedComponents: TemplateComponent[];
  selectedComponent?: TemplateComponent;
  selectedTextField?: TextField;
  onComponentSelect: (id: string) => void;
  onComponentUpdate: (
    componentId: string,
    patch: Partial<TemplateComponent>,
  ) => void;
  onComponentDelete: (componentId: string) => void;
  onTextFieldUpdate: (
    fieldId: string,
    field: keyof TextField,
    value: unknown,
  ) => void;
}> = ({
  sortedComponents,
  selectedComponent,
  selectedTextField,
  onComponentSelect,
  onComponentUpdate,
  onComponentDelete,
  onTextFieldUpdate,
}) => {
  // Group components by type
  const groupedComponents = LAYER_GROUP_CONFIG.map((group) => ({
    ...group,
    items: sortedComponents.filter((c) => c.type === group.type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Grouped layer list */}
      {sortedComponents.length === 0 && (
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          暂无图层，请先导入或添加组件。
        </div>
      )}
      {groupedComponents.map((group) => (
        <div key={group.type} className={`rounded-lg border ${group.borderColor} ${group.bgColor} overflow-hidden`}>
          {/* Group header */}
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-white/50">
            <span className="text-[11px] font-bold text-slate-700">
              {group.icon} {group.label}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{group.items.length}</span>
          </div>
          {/* Group items */}
          <div className="space-y-0.5 p-1">
            {group.items.map((component) => (
              <div
                key={component.id}
                className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                  selectedComponent?.id === component.id
                    ? "border-blue-400 bg-white shadow-sm"
                    : "border-transparent bg-white/60 hover:bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onComponentSelect(component.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      COMPONENT_TYPE_COLOR[component.type]
                    }`}
                  />
                  <span className="truncate text-[10px] font-medium text-slate-700">{component.name}</span>
                </button>
                <span className="rounded bg-slate-100 px-1 py-0.5 text-[8px] font-bold text-slate-400">
                  {component.sendToRunningHub ? "RH" : "CV"}
                </span>
                {component.visible !== false ? (
                  <Eye className="h-3 w-3 text-blue-400" />
                ) : (
                  <EyeOff className="h-3 w-3 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const TestPanel: React.FC<{
  products: Product[];
  activeProduct?: Product;
  inspectionItems: Array<{ label: string; ok: boolean }>;
  onProductChange: (productId: string) => void;
}> = ({ products, activeProduct, inspectionItems, onProductChange }) => (
  <div className="space-y-4">
    <div>
      <FieldLabel>试套产品</FieldLabel>
      <div className="space-y-2">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => onProductChange(product.id)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs ${
              activeProduct?.id === product.id
                ? "border-blue-300 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <span className="font-bold">
              [{product.productCode}] {product.productName}
            </span>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: product.themeColor }}
            />
          </button>
        ))}
      </div>
    </div>
    <InspectionList items={inspectionItems} />
  </div>
);

const SavePanel: React.FC<{
  inspectionItems: Array<{ label: string; ok: boolean }>;
  onSave: () => void;
}> = ({ inspectionItems, onSave }) => (
  <div className="space-y-4">
    <InspectionList items={inspectionItems} />
    <button
      type="button"
      onClick={onSave}
      className="w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white"
    >
      保存为模板页面
    </button>
  </div>
);

const InspectionList: React.FC<{
  items: Array<{ label: string; ok: boolean }>;
}> = ({ items }) => (
  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
    <div className="mb-3 text-sm font-bold text-emerald-800">业务检查</div>
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs"
        >
          <span className="font-semibold text-slate-700">{item.label}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              item.ok
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {item.ok ? "通过" : "待完善"}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const ThumbnailBoard: React.FC<{
  thumbnails: TemplateThumb[];
  activeThumbId: string;
  thumbFilter: ThumbFilter;
  mainThemeCount: number;
  skuCount: number;
  detailCount: number;
  getThumbTemplate?: (thumbId: string) => Template;
  onFilterChange: (filter: ThumbFilter) => void;
  onThumbSelect: (thumb: TemplateThumb) => void;
  onAddMain: () => void;
  onAddSku: () => void;
  onAddDetail: () => void;
}> = ({
  thumbnails,
  activeThumbId,
  thumbFilter,
  mainThemeCount,
  skuCount,
  detailCount,
  getThumbTemplate,
  onFilterChange,
  onThumbSelect,
  onAddMain,
  onAddSku,
  onAddDetail,
}) => {
  const groups: Array<{
    key: TemplateThumb["group"];
    label: string;
    countLabel: string;
    onAdd?: () => void;
  }> = [
    { key: "main", label: "主图组", countLabel: `${mainThemeCount} 张`, onAdd: onAddMain },
    { key: "sku", label: "SKU 图组", countLabel: `${skuCount} 张`, onAdd: onAddSku },
    { key: "detail", label: "详情图组", countLabel: `${detailCount} 屏`, onAdd: onAddDetail },
    { key: "special", label: "特殊交付图", countLabel: "固定页" },
  ];
  const visibleThumbs =
    thumbFilter === "all"
      ? thumbnails
      : thumbnails.filter((thumb) => thumb.filter === thumbFilter);
  const expandThumbs = (
    items: TemplateThumb[],
    targetCount: number,
    fallbackTitle: string,
    unit: string,
  ) => {
    if (items.length === 0 || items.length >= targetCount) return items;
    return Array.from({ length: targetCount }, (_, index) => {
      const base = items[index % items.length];
      const sequence = index + 1;
      const isBaseItem = index < items.length;
      return {
        ...base,
        id: `${base.id}_slot_${sequence}`,
        title: isBaseItem ? base.title : `${fallbackTitle}${sequence}`,
        subtitle: `${base.subtitle} · 第${sequence}${unit}`,
        status: isBaseItem ? base.status : "draft",
      };
    });
  };
  const getGroupItems = (groupKey: TemplateThumb["group"]) => {
    const items = visibleThumbs.filter((thumb) => thumb.group === groupKey);
    if (
      groupKey === "main" &&
      ["all", "main_3_4", "main_1_1"].includes(thumbFilter)
    ) {
      return expandThumbs(items, mainThemeCount, "主图页面", "张");
    }
    if (groupKey === "sku" && ["all", "sku"].includes(thumbFilter)) {
      return expandThumbs(items, skuCount, "SKU页面", "张");
    }
    if (groupKey === "detail" && ["all", "detail"].includes(thumbFilter)) {
      return expandThumbs(items, detailCount, "详情页面", "屏");
    }
    return items;
  };

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="text-sm font-black text-slate-900">整套模板缩略图</div>
        <div className="mt-1 text-[11px] text-slate-500">点击缩略图切换当前编辑页面。</div>
      </div>
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {THUMB_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilterChange(option.value)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                thumbFilter === option.value
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {groups.map((group) => {
          const items = getGroupItems(group.key);
          if (items.length === 0) return null;
          return (
            <section key={group.key}>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-black text-slate-800">
                  {group.label}
                </div>
                <div className="ml-2 flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {group.countLabel}
                  </span>
                  {group.onAdd && (
                    <button type="button" onClick={group.onAdd} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      添加
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {items.map((thumb) => (
                  <ThumbnailCard
                    key={thumb.id}
                    thumb={thumb}
                    active={thumb.id === activeThumbId}
                    template={getThumbTemplate?.(thumb.id)}
                    onClick={() => onThumbSelect(thumb)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
};

const ThumbnailCard: React.FC<{
  thumb: TemplateThumb;
  active: boolean;
  template?: Template;
  onClick: () => void;
}> = ({ thumb, active, template, onClick }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const ratioClass =
    thumb.ratioVersion === "vertical_3_4" || thumb.ratioVersion === "detail_long"
      ? "aspect-[3/4]"
      : "aspect-square";
  const statusClass =
    thumb.status === "ready"
      ? "bg-emerald-100 text-emerald-700"
      : thumb.status === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-500";

  // Scene gradient colors
  const SCENE_COLORS: Record<string, [string, string]> = {
    warm_light: ["#FFF8F0", "#F0DCC0"],
    beige_paper: ["#FAF7F2", "#EBE0CC"],
    studio_white: ["#F8F8F8", "#E5E5E5"],
    luxury_gold: ["#1A1A1A", "#2D1F0E"],
    festive_red: ["#8B0000", "#DC143C"],
  };

  const COMP_COLORS: Record<string, string> = {
    scene_base: "#E2E8F0",
    product_slot: "#93C5FD",
    text_overlay: "#7DD3FC",
    logo_overlay: "#5EEAD4",
    decor_overlay: "#FDA4AF",
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !template) return;
    let cancelled = false;

    (async () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Background
      const bg = template.background;
      if (bg?.color) {
        ctx.fillStyle = bg.color;
        ctx.fillRect(0, 0, w, h);
      } else if (bg?.sceneStyle && SCENE_COLORS[bg.sceneStyle]) {
        const [top, bot] = SCENE_COLORS[bg.sceneStyle];
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, top);
        grad.addColorStop(1, bot);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(0, h * 0.82, w, 1);
      } else {
        ctx.fillStyle = "#F8FAFC";
        ctx.fillRect(0, 0, w, h);
      }

      const comps = template.components || [];
      const visibleComps = comps.filter((c) => c.visible !== false);

      if (visibleComps.length > 0) {
        // Preload all images first
        const imageCache = new Map<string, HTMLImageElement>();
        const urls = visibleComps.filter((c) => c.imageUrl).map((c) => c.imageUrl!);
        await Promise.all(urls.map((url) =>
          new Promise<void>((resolve) => {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => { imageCache.set(url, img); resolve(); };
            img.onerror = () => resolve();
            img.src = url;
          })
        ));

        if (cancelled) return;

        // Draw scene_base first
        const scene = visibleComps.find((c) => c.type === "scene_base");
        if (scene) {
          const img = scene.imageUrl ? imageCache.get(scene.imageUrl) : null;
          if (img) {
            ctx.drawImage(img, 0, 0, w, h);
          } else {
            ctx.fillStyle = COMP_COLORS.scene_base;
            ctx.fillRect(0, 0, w, h);
          }
        }

        // Draw other components on top
        visibleComps.filter((c) => c.type !== "scene_base").forEach((comp) => {
          const cx = ((comp.x ?? 50) / 100) * w;
          const cy = ((comp.y ?? 50) / 100) * h;
          const cw = ((comp.width ?? 30) / 100) * w;
          const ch = ((comp.height ?? 30) / 100) * h;

          const img = comp.imageUrl ? imageCache.get(comp.imageUrl) : null;
          if (img) {
            ctx.drawImage(img, cx - cw / 2, cy - ch / 2, cw, ch);
          } else {
            ctx.fillStyle = COMP_COLORS[comp.type] || "#E5E7EB";
            ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);
          }
        });
      } else {
        // Draw legacy slots
        (template.slots || []).forEach((slot) => {
          const sx = ((slot.x ?? 50) / 100) * w;
          const sy = ((slot.y ?? 50) / 100) * h;
          const sw = ((slot.maxWidth ?? 80) / 100) * w;
          const sh = ((slot.maxHeight ?? 60) / 100) * h;
          ctx.fillStyle = "rgba(59,130,246,0.25)";
          ctx.fillRect(sx - sw / 2, sy - sh / 2, sw, sh);
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 2]);
          ctx.strokeRect(sx - sw / 2, sy - sh / 2, sw, sh);
          ctx.setLineDash([]);
        });
      }
    })();

    return () => { cancelled = true; };
  }, [template, template?.background?.color, template?.background?.sceneStyle, template?.components, template?.slots]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-2 text-left transition ${
        active
          ? "border-blue-500 bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-blue-200"
      }`}
    >
      <div className={`${ratioClass} relative mb-2 overflow-hidden rounded-lg border border-slate-200 bg-white`}>
        <canvas
          ref={canvasRef}
          width={160}
          height={thumb.ratioVersion === "vertical_3_4" || thumb.ratioVersion === "detail_long" ? 214 : 160}
          className="h-full w-full"
        />
      </div>
      <div className="truncate text-xs font-black text-slate-800">
        {thumb.title}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-bold text-slate-400">
          {thumb.subtitle}
        </span>
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${statusClass}`}>
          {thumb.status === "ready"
            ? "已配置"
            : thumb.status === "warning"
              ? "待检查"
              : "草稿"}
        </span>
      </div>
      <div className="mt-1 text-[9px] font-mono text-slate-400">
        {thumb.width}×{thumb.height}
      </div>
    </button>
  );
};
