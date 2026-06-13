import React from "react";
import { Template } from "../../types";

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

export type ThumbFilter =
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

export interface TemplateThumb {
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

const THUMB_FILTER_OPTIONS: Array<{ value: ThumbFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "main_3_4", label: "3:4竖版主图" },
  { value: "main_1_1", label: "1:1方形主图" },
  { value: "sku", label: "SKU" },
  { value: "detail", label: "详情图" },
  { value: "white_transparent", label: "白透产品图" },
  { value: "scene_800", label: "800产品场景图" },
  { value: "scene_1200", label: "1200产品场景图" },
  { value: "sample_book", label: "书样模板图" },
  { value: "ad_effect", label: "广告效果图" },
];

export const TEMPLATE_THUMBNAILS: TemplateThumb[] = [
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

export const expandTemplateThumbs = (
  items: TemplateThumb[],
  targetCount: number,
  fallbackTitle: string,
  unit: string,
): TemplateThumb[] => {
  if (items.length === 0) return [];
  return Array.from({ length: Math.max(targetCount, items.length) }, (_, index) => {
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

export const getExpandedSuiteThumbs = (
  mainThemeCount: number,
  skuCount: number,
  detailCount: number,
) => {
  const squareMainItems = TEMPLATE_THUMBNAILS.filter(
    (thumb) => thumb.group === "main" && thumb.filter === "main_1_1",
  );
  const verticalMainItems = TEMPLATE_THUMBNAILS.filter(
    (thumb) => thumb.group === "main" && thumb.filter === "main_3_4",
  );
  const fixedSceneItems = TEMPLATE_THUMBNAILS.filter(
    (thumb) =>
      thumb.group === "main" &&
      (thumb.filter === "scene_800" || thumb.filter === "scene_1200"),
  );
  const skuItems = TEMPLATE_THUMBNAILS.filter((thumb) => thumb.group === "sku");
  const detailItems = TEMPLATE_THUMBNAILS.filter((thumb) => thumb.group === "detail");
  const specialItems = TEMPLATE_THUMBNAILS.filter((thumb) => thumb.group === "special");

  return [
    ...expandTemplateThumbs(squareMainItems, mainThemeCount, "方形主图", "张"),
    ...expandTemplateThumbs(verticalMainItems, mainThemeCount, "竖版主图", "张"),
    ...fixedSceneItems,
    ...expandTemplateThumbs(skuItems, skuCount, "SKU页面", "张"),
    ...expandTemplateThumbs(detailItems, detailCount, "详情页面", "屏"),
    ...specialItems,
  ];
};

interface ThumbnailBoardProps {
  thumbnails: TemplateThumb[];
  activeThumbId: string;
  thumbFilter: ThumbFilter;
  mainThemeCount: number;
  skuCount: number;
  detailCount: number;
  getThumbTemplate?: (thumbId: string) => Template;
  refreshKey?: number;
  onFilterChange: (filter: ThumbFilter) => void;
  onThumbSelect: (thumb: TemplateThumb) => void;
  onAddMain: () => void;
  onAddSku: () => void;
  onAddDetail: () => void;
}

export const ThumbnailBoard: React.FC<ThumbnailBoardProps> = ({
  thumbnails,
  activeThumbId,
  thumbFilter,
  mainThemeCount,
  skuCount,
  detailCount,
  getThumbTemplate,
  refreshKey = 0,
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

  const expandedThumbs = getExpandedSuiteThumbs(
    mainThemeCount,
    skuCount,
    detailCount,
  );
  const visibleThumbs =
    thumbFilter === "all"
      ? expandedThumbs
      : expandedThumbs.filter((thumb) => thumb.filter === thumbFilter);

  const getGroupItems = (groupKey: TemplateThumb["group"]) =>
    visibleThumbs.filter((thumb) => thumb.group === groupKey);

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="text-sm font-black text-slate-900">整套模板缩略图</div>
        <div className="mt-1 text-[11px] text-slate-500">
          点击缩略图切换当前编辑页面。
        </div>
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
                    <button
                      type="button"
                      onClick={group.onAdd}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700"
                    >
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
                    refreshKey={refreshKey}
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
  refreshKey?: number;
  onClick: () => void;
}> = ({ thumb, active, template, refreshKey = 0, onClick }) => {
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

  const sceneColors: Record<string, [string, string]> = {
    warm_light: ["#FFF8F0", "#F0DCC0"],
    beige_paper: ["#FAF7F2", "#EBE0CC"],
    studio_white: ["#F8F8F8", "#E5E5E5"],
    luxury_gold: ["#1A1A1A", "#2D1F0E"],
    festive_red: ["#8B0000", "#DC143C"],
  };

  const componentColors: Record<string, string> = {
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

    const render = async () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const bg = template.background;
      if (bg?.color) {
        ctx.fillStyle = bg.color;
        ctx.fillRect(0, 0, width, height);
      } else if (bg?.sceneStyle && sceneColors[bg.sceneStyle]) {
        const [top, bottom] = sceneColors[bg.sceneStyle];
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, top);
        gradient.addColorStop(1, bottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(0, height * 0.82, width, 1);
      } else {
        ctx.fillStyle = "#F8FAFC";
        ctx.fillRect(0, 0, width, height);
      }

      const visibleComponents = (template.components || []).filter(
        (component) => component.visible !== false,
      );

      if (visibleComponents.length > 0) {
        const imageCache = new Map<string, HTMLImageElement>();
        const urls = visibleComponents
          .filter((component) => component.imageUrl)
          .map((component) => component.imageUrl!);

        await Promise.all(
          urls.map(
            (url) =>
              new Promise<void>((resolve) => {
                const img = new window.Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                  imageCache.set(url, img);
                  resolve();
                };
                img.onerror = () => resolve();
                img.src = url;
              }),
          ),
        );

        if (cancelled) return;

        const scene = visibleComponents.find((component) => component.type === "scene_base");
        if (scene) {
          const img = scene.imageUrl ? imageCache.get(scene.imageUrl) : null;
          const x = ((scene.x ?? 0) / 100) * width;
          const y = ((scene.y ?? 0) / 100) * height;
          const sceneWidth = ((scene.width ?? 100) / 100) * width;
          const sceneHeight = ((scene.height ?? 100) / 100) * height;
          if (img) {
            ctx.drawImage(img, x, y, sceneWidth, sceneHeight);
          } else {
            ctx.fillStyle = componentColors.scene_base;
            ctx.fillRect(x, y, sceneWidth, sceneHeight);
          }
        }

        visibleComponents
          .filter((component) => component.type !== "scene_base")
          .forEach((component) => {
            const x = ((component.x ?? 50) / 100) * width;
            const y = ((component.y ?? 50) / 100) * height;
            const componentWidth = ((component.width ?? 30) / 100) * width;
            const componentHeight = ((component.height ?? 30) / 100) * height;

            const img = component.imageUrl ? imageCache.get(component.imageUrl) : null;
            if (img) {
              ctx.drawImage(
                img,
                x,
                y,
                componentWidth,
                componentHeight,
              );
            } else {
              ctx.fillStyle = componentColors[component.type] || "#E5E7EB";
              ctx.fillRect(
                x,
                y,
                componentWidth,
                componentHeight,
              );
              ctx.strokeStyle = "rgba(0,0,0,0.15)";
              ctx.lineWidth = 0.5;
              ctx.strokeRect(
                x,
                y,
                componentWidth,
                componentHeight,
              );
            }
          });
      } else {
        (template.slots || []).forEach((slot) => {
          const x = ((slot.x ?? 50) / 100) * width;
          const y = ((slot.y ?? 50) / 100) * height;
          const slotWidth = ((slot.maxWidth ?? 80) / 100) * width;
          const slotHeight = ((slot.maxHeight ?? 60) / 100) * height;
          ctx.fillStyle = "rgba(59,130,246,0.25)";
          ctx.fillRect(x - slotWidth / 2, y - slotHeight / 2, slotWidth, slotHeight);
          ctx.strokeStyle = "#3B82F6";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 2]);
          ctx.strokeRect(x - slotWidth / 2, y - slotHeight / 2, slotWidth, slotHeight);
          ctx.setLineDash([]);
        });
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [template, refreshKey]);

  const visibleComponents = (template?.components || []).filter(
    (component) => component.visible !== false,
  );
  const editableLayerCount = visibleComponents.filter(
    (component) => component.type !== "scene_base",
  ).length;
  const hasRealContent =
    editableLayerCount > 0 ||
    visibleComponents.some((component) => component.type === "scene_base" && component.imageUrl) ||
    Boolean(template?.slots?.length || template?.textFields?.length);

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
      <div
        className={`${ratioClass} relative mb-2 overflow-hidden rounded-lg border border-slate-200 bg-white`}
      >
        <canvas
          ref={canvasRef}
          width={160}
          height={
            thumb.ratioVersion === "vertical_3_4" || thumb.ratioVersion === "detail_long"
              ? 214
              : 160
          }
          className="h-full w-full"
        />
        <span
          className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
            hasRealContent
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          {hasRealContent ? `已编辑 ${editableLayerCount}` : "空白"}
        </span>
      </div>
      <div className="truncate text-xs font-black text-slate-800">{thumb.title}</div>
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
