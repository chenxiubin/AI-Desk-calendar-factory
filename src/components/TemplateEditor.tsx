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
  getExpandedSuiteThumbs,
  TEMPLATE_THUMBNAILS,
  ThumbnailBoard,
  type TemplateThumb,
  type ThumbFilter,
} from "./template-editor/TemplateThumbnailBoard";
import {
  Check,
  ArrowLeft,
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
  X,
} from "lucide-react";

interface TemplateEditorProps {
  initialTemplates: Template[];
  products: Product[];
  selectedTemplateFromLib?: Template | null;
  initialSelectedProductId?: string;
  onBackToSuiteLibrary?: () => void;
  onSaveTemplate: (template: Template | Template[]) =>
    | void
    | Promise<{ componentCount?: number } | void>;
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
type FloatingPanel = "info" | "import" | "add" | "test" | "save";

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

const stripLegacyTemplateSlots = (templates: Template[]): Template[] =>
  templates.map((template) => ({
    ...template,
    slots: [],
  }));

const stripLegacyTemplateSlot = (template: Template): Template => ({
  ...template,
  slots: [],
});

const getComponentTypeByFileName = (fileName: string): TemplateComponentType => {
  const lower = fileName.toLowerCase();
  if (
    lower.includes("bg") ||
    lower.includes("background") ||
    lower.includes("scene_base") ||
    lower.includes("base") ||
    lower.includes("底图") ||
    lower.includes("背景") ||
    lower.includes("主背景") ||
    lower.includes("场景底")
  ) {
    return "scene_base";
  }
  if (
    lower.includes("product") ||
    lower.includes("slot") ||
    lower.includes("main") ||
    lower.includes("产品") ||
    lower.includes("商品") ||
    lower.includes("主体") ||
    lower.includes("槽位") ||
    lower.includes("占位") ||
    lower.includes("主图") ||
    lower.includes("产品场景") ||
    lower.includes("产品效果")
  ) {
    return "product_slot";
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

const MIN_VISIBLE_PERCENT = 4;
const MAX_ELEMENT_SIZE_PERCENT = 240;
const SAFE_REGION_INSET_PERCENT = 6;
const SNAP_THRESHOLD_PERCENT = 2.5;

const clampPartiallyVisible = (
  value: number,
  size: number,
  canvasEnd = 100,
) =>
  Math.max(
    -size + MIN_VISIBLE_PERCENT,
    Math.min(canvasEnd - MIN_VISIBLE_PERCENT, value),
  );

const clampVisualBoxToCanvas = (box: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => ({
  ...box,
  x: clampPartiallyVisible(box.x, box.width),
  y: clampPartiallyVisible(box.y, box.height),
});

const getAlignmentBounds = (useSafetyRegion: boolean) => {
  const inset = useSafetyRegion ? SAFE_REGION_INSET_PERCENT : 0;
  return {
    left: inset,
    top: inset,
    right: 100 - inset,
    bottom: 100 - inset,
    centerX: 50,
    centerY: 50,
  };
};

const snapBoxToBounds = (
  box: { x: number; y: number; width: number; height: number },
  bounds: ReturnType<typeof getAlignmentBounds>,
) => {
  let nextX = box.x;
  let nextY = box.y;
  const canvasBounds = getAlignmentBounds(false);
  const candidates = [canvasBounds];
  if (bounds.left !== 0 || bounds.top !== 0 || bounds.right !== 100) {
    candidates.push(bounds);
  }

  for (const candidate of candidates) {
    const boxRight = nextX + box.width;
    const boxCenterX = nextX + box.width / 2;
    if (Math.abs(nextX - candidate.left) <= SNAP_THRESHOLD_PERCENT) {
      nextX = candidate.left;
      break;
    }
    if (Math.abs(boxRight - candidate.right) <= SNAP_THRESHOLD_PERCENT) {
      nextX = candidate.right - box.width;
      break;
    }
    if (Math.abs(boxCenterX - candidate.centerX) <= SNAP_THRESHOLD_PERCENT) {
      nextX = candidate.centerX - box.width / 2;
      break;
    }
  }

  for (const candidate of candidates) {
    const boxBottom = nextY + box.height;
    const boxCenterY = nextY + box.height / 2;
    if (Math.abs(nextY - candidate.top) <= SNAP_THRESHOLD_PERCENT) {
      nextY = candidate.top;
      break;
    }
    if (Math.abs(boxBottom - candidate.bottom) <= SNAP_THRESHOLD_PERCENT) {
      nextY = candidate.bottom - box.height;
      break;
    }
    if (Math.abs(boxCenterY - candidate.centerY) <= SNAP_THRESHOLD_PERCENT) {
      nextY = candidate.centerY - box.height / 2;
      break;
    }
  }

  return {
    ...box,
    x: nextX,
    y: nextY,
  };
};

const snapResizedBoxToCanvasFrame = (
  box: { x: number; y: number; width: number; height: number },
  handle?: "tl" | "tr" | "bl" | "br",
  aspect = box.width / Math.max(0.01, box.height),
) => {
  if (!handle || !Number.isFinite(aspect) || aspect <= 0) return box;

  const anchorLeft = box.x;
  const anchorTop = box.y;
  const anchorRight = box.x + box.width;
  const anchorBottom = box.y + box.height;
  const options: Array<{
    distance: number;
    box: { x: number; y: number; width: number; height: number };
  }> = [];

  const addWidthSnap = (targetEdge: "left" | "right", distance: number) => {
    const width =
      targetEdge === "left" ? anchorRight : 100 - anchorLeft;
    if (width <= 2) return;
    const height = width / aspect;
    options.push({
      distance,
      box: {
        x: targetEdge === "left" ? 0 : anchorLeft,
        y: handle === "tl" || handle === "tr" ? anchorBottom - height : anchorTop,
        width,
        height,
      },
    });
  };

  const addHeightSnap = (targetEdge: "top" | "bottom", distance: number) => {
    const height =
      targetEdge === "top" ? anchorBottom : 100 - anchorTop;
    if (height <= 2) return;
    const width = height * aspect;
    options.push({
      distance,
      box: {
        x: handle === "tl" || handle === "bl" ? anchorRight - width : anchorLeft,
        y: targetEdge === "top" ? 0 : anchorTop,
        width,
        height,
      },
    });
  };

  if (handle === "tl" || handle === "bl") {
    const distance = Math.abs(box.x);
    if (distance <= SNAP_THRESHOLD_PERCENT) addWidthSnap("left", distance);
  }
  if (handle === "tr" || handle === "br") {
    const distance = Math.abs(anchorRight - 100);
    if (distance <= SNAP_THRESHOLD_PERCENT) addWidthSnap("right", distance);
  }
  if (handle === "tl" || handle === "tr") {
    const distance = Math.abs(box.y);
    if (distance <= SNAP_THRESHOLD_PERCENT) addHeightSnap("top", distance);
  }
  if (handle === "bl" || handle === "br") {
    const distance = Math.abs(anchorBottom - 100);
    if (distance <= SNAP_THRESHOLD_PERCENT) addHeightSnap("bottom", distance);
  }

  return options.sort((a, b) => a.distance - b.distance)[0]?.box ?? box;
};

interface ImportedImageData {
  dataUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  wasTrimmed: boolean;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.readAsDataURL(file);
  });

const dataUrlToBlob = (dataUrl: string) => {
  const [header, payload] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/png";
  const binary = atob(payload || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
};

const getExtensionFromDataUrl = (dataUrl: string) => {
  const mime = dataUrl.match(/^data:(.*?);base64/)?.[1] || "image/png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
};

const safeAssetFileName = (name: string, extension: string) => {
  const safeName = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w\u4e00-\u9fa5-]+/g, "_")
    .slice(0, 80);
  return `${safeName || "template_asset"}.${extension}`;
};

const uploadTemplateImage = async (
  dataUrl: string,
  name: string,
  cache: Map<string, string>,
) => {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const cachedUrl = cache.get(dataUrl);
  if (cachedUrl) return cachedUrl;

  const extension = getExtensionFromDataUrl(dataUrl);
  const formData = new FormData();
  formData.append(
    "image",
    dataUrlToBlob(dataUrl),
    safeAssetFileName(name, extension),
  );

  const response = await fetch("/api/upload-canvas", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("本地素材保存失败");
  }
  const result = await response.json();
  const fileUrl = String(result.fileUrl || "");
  if (!fileUrl) {
    throw new Error("本地素材保存后没有返回文件地址");
  }
  cache.set(dataUrl, fileUrl);
  return fileUrl;
};

const persistTemplateComponentImages = async (
  template: Template,
  cache: Map<string, string>,
): Promise<Template> => {
  const components = await Promise.all(
    (template.components || []).map(async (component) => {
      if (!component.imageUrl?.startsWith("data:")) return component;
      return {
        ...component,
        imageUrl: await uploadTemplateImage(
          component.imageUrl,
          component.name || component.id,
          cache,
        ),
      };
    }),
  );

  return {
    ...template,
    components,
  };
};

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const trimTransparentImage = async (
  dataUrl: string,
  shouldTrim: boolean,
): Promise<ImportedImageData> => {
  const image = await loadImageElement(dataUrl);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!shouldTrim || sourceWidth <= 0 || sourceHeight <= 0) {
    return {
      dataUrl,
      sourceWidth,
      sourceHeight,
      cropX: 0,
      cropY: 0,
      cropWidth: sourceWidth,
      cropHeight: sourceHeight,
      wasTrimmed: false,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return {
      dataUrl,
      sourceWidth,
      sourceHeight,
      cropX: 0,
      cropY: 0,
      cropWidth: sourceWidth,
      cropHeight: sourceHeight,
      wasTrimmed: false,
    };
  }

  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, sourceWidth, sourceHeight).data;
  let minX = sourceWidth;
  let minY = sourceHeight;
  let maxX = -1;
  let maxY = -1;
  const alphaThreshold = 8;
  let hasTransparentPixels = false;

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      const alpha = pixels[(y * sourceWidth + x) * 4 + 3];
      if (alpha < 245) hasTransparentPixels = true;
      if (alpha > alphaThreshold && alpha < 245) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!hasTransparentPixels) {
    minX = sourceWidth;
    minY = sourceHeight;
    maxX = -1;
    maxY = -1;

    const backgroundSamples: Array<[number, number, number]> = [];
    const sampleStep = Math.max(1, Math.floor(Math.min(sourceWidth, sourceHeight) / 24));
    const scanStep = Math.max(1, Math.floor(Math.min(sourceWidth, sourceHeight) / 900));
    const addSample = (x: number, y: number) => {
      const offset = (y * sourceWidth + x) * 4;
      backgroundSamples.push([pixels[offset], pixels[offset + 1], pixels[offset + 2]]);
    };
    for (let x = 0; x < sourceWidth; x += sampleStep) {
      addSample(x, 0);
      addSample(x, sourceHeight - 1);
    }
    for (let y = 0; y < sourceHeight; y += sampleStep) {
      addSample(0, y);
      addSample(sourceWidth - 1, y);
    }

    const luminance = (r: number, g: number, b: number) =>
      r * 0.299 + g * 0.587 + b * 0.114;
    const saturation = (r: number, g: number, b: number) =>
      Math.max(r, g, b) - Math.min(r, g, b);
    const colorDistance = (
      r1: number,
      g1: number,
      b1: number,
      r2: number,
      g2: number,
      b2: number,
    ) => {
      const dr = r1 - r2;
      const dg = g1 - g2;
      const db = b1 - b2;
      return Math.sqrt(dr * dr + dg * dg + db * db);
    };
    const backgroundPool = [...backgroundSamples]
      .sort(
        (left, right) =>
          luminance(right[0], right[1], right[2]) -
          luminance(left[0], left[1], left[2]),
      )
      .slice(0, Math.max(8, Math.floor(backgroundSamples.length * 0.45)));
    const backgroundColor = backgroundPool.reduce(
      (acc, color) => {
        acc[0] += color[0];
        acc[1] += color[1];
        acc[2] += color[2];
        return acc;
      },
      [0, 0, 0],
    );
    backgroundColor[0] /= backgroundPool.length || 1;
    backgroundColor[1] /= backgroundPool.length || 1;
    backgroundColor[2] /= backgroundPool.length || 1;
    const bgLum = luminance(backgroundColor[0], backgroundColor[1], backgroundColor[2]);
    const bgSat = saturation(backgroundColor[0], backgroundColor[1], backgroundColor[2]);

    const isDifferentFromBackground = (x: number, y: number) => {
      const offset = (y * sourceWidth + x) * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const lum = luminance(r, g, b);
      const sat = saturation(r, g, b);
      const distance = colorDistance(
        r,
        g,
        b,
        backgroundColor[0],
        backgroundColor[1],
        backgroundColor[2],
      );
      return (
        distance > 52 &&
        (lum < bgLum - 18 || Math.abs(sat - bgSat) > 38)
      );
    };

    for (let y = 0; y < sourceHeight; y += scanStep) {
      for (let x = 0; x < sourceWidth; x += scanStep) {
        if (isDifferentFromBackground(x, y)) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
  } else {
    minX = sourceWidth;
    minY = sourceHeight;
    maxX = -1;
    maxY = -1;
    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        const alpha = pixels[(y * sourceWidth + x) * 4 + 3];
        if (alpha > alphaThreshold) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    return {
      dataUrl,
      sourceWidth,
      sourceHeight,
      cropX: 0,
      cropY: 0,
      cropWidth: sourceWidth,
      cropHeight: sourceHeight,
      wasTrimmed: false,
    };
  }

  const padding = hasTransparentPixels
    ? 2
    : Math.max(4, Math.floor(Math.min(sourceWidth, sourceHeight) * 0.01));
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(sourceWidth - 1, maxX + padding);
  maxY = Math.min(sourceHeight - 1, maxY + padding);
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const wasTrimmed = cropWidth < sourceWidth || cropHeight < sourceHeight;
  const cropAreaRatio = (cropWidth * cropHeight) / Math.max(1, sourceWidth * sourceHeight);

  if (!wasTrimmed || (!hasTransparentPixels && cropAreaRatio > 0.82)) {
    return {
      dataUrl,
      sourceWidth,
      sourceHeight,
      cropX: 0,
      cropY: 0,
      cropWidth: sourceWidth,
      cropHeight: sourceHeight,
      wasTrimmed: false,
    };
  }

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = cropWidth;
  trimmedCanvas.height = cropHeight;
  const trimmedCtx = trimmedCanvas.getContext("2d");
  trimmedCtx?.drawImage(
    image,
    minX,
    minY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  return {
    dataUrl: trimmedCanvas.toDataURL("image/png"),
    sourceWidth,
    sourceHeight,
    cropX: minX,
    cropY: minY,
    cropWidth,
    cropHeight,
    wasTrimmed: true,
  };
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
  initialSelectedProductId,
  onBackToSuiteLibrary,
  onSaveTemplate,
}) => {
  const [templates, setTemplates] = useState<Template[]>(() =>
    stripLegacyTemplateSlots(initialTemplates),
  );
  const baseTemplate = templates[0];
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialSelectedProductId &&
      products.some((product) => product.id === initialSelectedProductId)
      ? initialSelectedProductId
      : products[0]?.id || "",
  );
  const [businessConfig, setBusinessConfig] =
    useState<BusinessTemplateConfig>(() =>
      getInitialBusinessConfig(selectedTemplateFromLib || initialTemplates[0]),
    );
  const [activePanel, setActivePanel] = useState<FloatingPanel | null>(null);
  const [activeThumbId, setActiveThumbId] = useState(() => {
    try {
      return localStorage.getItem("template_editor_active_thumb_id") ||
        "main_01_square_slot_1";
    } catch {
      return "main_01_square_slot_1";
    }
  });
  const [thumbFilter, setThumbFilter] = useState<ThumbFilter>(() => {
    try {
      return (
        (localStorage.getItem("template_editor_thumb_filter") as ThumbFilter | null) ||
        "all"
      );
    } catch {
      return "all";
    }
  });
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
  const [componentImageRatios, setComponentImageRatios] = useState<Record<string, number>>({});
  const tightenedComponentIdsRef = useRef<Set<string>>(new Set());
  const aspectSyncedComponentIdsRef = useRef<Set<string>>(new Set());
  const [isCanvasFileDragActive, setIsCanvasFileDragActive] = useState(false);
  const [isSavingTemplateSuite, setIsSavingTemplateSuite] = useState(false);
  const [isImportingComponents, setIsImportingComponents] = useState(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState("");
  const [panelPos, setPanelPos] = useState({ x: 16, y: 16 }); // draggable panel position (px from bottom-left of canvas work area)
  const panelDragging = useRef(false);
  const panelDragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const pendingImportPromisesRef = useRef<Set<Promise<void>>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem("template_editor_active_thumb_id", activeThumbId);
      localStorage.setItem("template_editor_thumb_filter", thumbFilter);
    } catch {}
  }, [activeThumbId, thumbFilter]);

  const runImportJob = async (job: () => Promise<void>) => {
    const promise = job();
    pendingImportPromisesRef.current.add(promise);
    setIsImportingComponents(true);
    try {
      await promise;
    } finally {
      pendingImportPromisesRef.current.delete(promise);
      if (pendingImportPromisesRef.current.size === 0) {
        setIsImportingComponents(false);
      }
    }
  };

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
  const saveSnapshotRef = useRef<Record<string, Template>>({});
  const skipNextTemplateHydrationRef = useRef(false);
  const didRestoreConfiguredPageRef = useRef(false);
  const [storeVersion, setStoreVersion] = useState(0);
  useEffect(() => {
    if (skipNextTemplateHydrationRef.current) {
      skipNextTemplateHydrationRef.current = false;
      return;
    }
    const sanitizedTemplates = stripLegacyTemplateSlots(initialTemplates);
    setTemplates(sanitizedTemplates);
    const expandedThumbs = getExpandedSuiteThumbs(
      mainThemeCount,
      skuCount,
      detailCount,
    );
    const hydratedTemplates: Record<string, Template> = {};
    expandedThumbs.forEach((thumb) => {
      const savedTemplate = [...sanitizedTemplates]
        .reverse()
        .find(
          (template) =>
            template.id === thumb.id || template.id.endsWith(`_${thumb.id}`),
        );
      if (savedTemplate) {
        hydratedTemplates[thumb.id] = {
          ...stripLegacyTemplateSlot(savedTemplate),
          outputWidth: thumb.width,
          outputHeight: thumb.height,
          templateType: getTemplateTypeByDelivery(thumb.deliveryType),
          aspectRatio:
            thumb.ratioVersion === "vertical_3_4"
              ? "3:4"
              : thumb.ratioVersion === "square_1_1"
                ? "1:1"
                : savedTemplate.aspectRatio || "1:1",
        };
      }
    });
    sanitizedTemplates.forEach((template) => {
      if (!template.id.startsWith(`${baseTemplate.id}_`)) return;
      const thumbId = template.id.slice(`${baseTemplate.id}_`.length);
      if (!thumbId || hydratedTemplates[thumbId]) return;
      hydratedTemplates[thumbId] = stripLegacyTemplateSlot(template);
    });
    thumbTemplatesRef.current = {
      ...Object.fromEntries(
        Object.entries(thumbTemplatesRef.current).map(([thumbId, template]) => [
          thumbId,
          stripLegacyTemplateSlot(template as Template),
        ]),
      ),
      ...hydratedTemplates,
    };
    if (!didRestoreConfiguredPageRef.current) {
      const activeTemplateFromDisk = hydratedTemplates[activeThumbId];
      const activeHasContent = Boolean(
        activeTemplateFromDisk &&
          ((activeTemplateFromDisk.components?.length || 0) > 0 ||
            (activeTemplateFromDisk.textFields?.length || 0) > 0),
      );
      if (!activeHasContent) {
        const firstConfiguredThumb = expandedThumbs.find((thumb) => {
          const template = hydratedTemplates[thumb.id];
          return Boolean(
            template &&
              ((template.components?.length || 0) > 0 ||
                (template.textFields?.length || 0) > 0),
          );
        });
        if (firstConfiguredThumb) {
          setActiveThumbId(firstConfiguredThumb.id);
        }
      }
      didRestoreConfiguredPageRef.current = true;
    }
    saveSnapshotRef.current = {
      ...saveSnapshotRef.current,
      ...thumbTemplatesRef.current,
    };
    setStoreVersion((version) => version + 1);
  }, [detailCount, initialTemplates, mainThemeCount, skuCount]);

  const getThumbTemplate = (thumbId: string): Template => {
    if (thumbTemplatesRef.current[thumbId]) return thumbTemplatesRef.current[thumbId];
    const clone = JSON.parse(JSON.stringify(baseTemplate));
    clone.id = `${baseTemplate.id}_${thumbId}`;
    clone.slots = [];
    thumbTemplatesRef.current[thumbId] = clone;
    return clone;
  };
  const saveThumbTemplate = (thumbId: string, tmpl: Template) => {
    const cleanTemplate = stripLegacyTemplateSlot(tmpl);
    thumbTemplatesRef.current[thumbId] = cleanTemplate;
    saveSnapshotRef.current[thumbId] = cleanTemplate;
    setStoreVersion((v) => v + 1);
  };
  const normalizeTemplateForThumb = (thumb: TemplateThumb): Template => {
    const existing =
      saveSnapshotRef.current[thumb.id] ||
      thumbTemplatesRef.current[thumb.id] ||
      getThumbTemplate(thumb.id);
    return {
      ...existing,
      id: `${baseTemplate.id}_${thumb.id}`,
      templateName: `${baseTemplate.templateName} - ${thumb.title}`,
      templateType: getTemplateTypeByDelivery(thumb.deliveryType),
      outputWidth: thumb.width,
      outputHeight: thumb.height,
      slots: [],
      aspectRatio:
        thumb.ratioVersion === "vertical_3_4"
          ? "3:4"
          : thumb.ratioVersion === "square_1_1"
            ? "1:1"
            : existing.aspectRatio || "1:1",
    };
  };
  const getSuiteTemplatesForSave = () =>
    getExpandedSuiteThumbs(mainThemeCount, skuCount, detailCount).map((thumb) =>
      normalizeTemplateForThumb(thumb),
    );

  const mergeActiveTemplateIntoSaveList = (
    templatesForSave: Template[],
    activeTemplateForSave: Template,
  ) => {
    const expandedThumbs = getExpandedSuiteThumbs(
      mainThemeCount,
      skuCount,
      detailCount,
    );
    const activeThumb = expandedThumbs.find((thumb) => thumb.id === activeThumbId);
    const normalizedActiveTemplate = activeThumb
      ? {
          ...activeTemplateForSave,
          id: `${baseTemplate.id}_${activeThumb.id}`,
          templateName: `${baseTemplate.templateName} - ${activeThumb.title}`,
          templateType: getTemplateTypeByDelivery(activeThumb.deliveryType),
          outputWidth: activeThumb.width,
          outputHeight: activeThumb.height,
          slots: [],
          aspectRatio:
            activeThumb.ratioVersion === "vertical_3_4"
              ? "3:4"
              : activeThumb.ratioVersion === "square_1_1"
                ? "1:1"
                : activeTemplateForSave.aspectRatio || "1:1",
        }
      : activeTemplateForSave;

    let replaced = false;
    const mergedTemplates = templatesForSave.map((template) => {
      const isSameTemplate =
        template.id === normalizedActiveTemplate.id ||
        template.id === activeThumbId ||
        template.id.endsWith(`_${activeThumbId}`);
      if (!isSameTemplate) return template;
      replaced = true;
      return normalizedActiveTemplate;
    });

    if (!replaced) {
      mergedTemplates.push(normalizedActiveTemplate);
    }

    return mergedTemplates;
  };

  const handleSaveSuite = async () => {
    if (isSavingTemplateSuite) return;
    setIsSavingTemplateSuite(true);
    setSaveStatusMessage("正在保存...");
    try {
      if (pendingImportPromisesRef.current.size > 0) {
        setSaveStatusMessage("正在等待素材导入完成...");
        await Promise.allSettled(Array.from(pendingImportPromisesRef.current));
      }
      const activeTemplateForSave = stripLegacyTemplateSlot(activeTemplate);
      thumbTemplatesRef.current[activeThumbId] = activeTemplateForSave;
      saveSnapshotRef.current[activeThumbId] = activeTemplateForSave;
      const uploadCache = new Map<string, string>();
      const templatesForSave = mergeActiveTemplateIntoSaveList(
        getSuiteTemplatesForSave(),
        activeTemplateForSave,
      );
      const persistedTemplates = await Promise.all(
        templatesForSave.map((template) =>
          persistTemplateComponentImages(template, uploadCache),
        ),
      );
      const activeComponentCount = activeTemplateForSave.components?.length || 0;
      persistedTemplates.forEach((template) => {
        const thumb = getExpandedSuiteThumbs(
          mainThemeCount,
          skuCount,
          detailCount,
        ).find(
          (item) =>
            template.id === item.id || template.id.endsWith(`_${item.id}`),
        );
        if (thumb) {
          thumbTemplatesRef.current[thumb.id] = template;
        }
      });
      setStoreVersion((version) => version + 1);
      skipNextTemplateHydrationRef.current = true;
      const saveResult = await onSaveTemplate(persistedTemplates);
      const savedTotalComponents =
        saveResult && "componentCount" in saveResult
          ? saveResult.componentCount ?? 0
          : undefined;
      setSaveStatusMessage(
        savedTotalComponents === undefined
          ? `已保存到本地，当前页 ${activeComponentCount} 个图层`
          : `已保存到本地，当前页 ${activeComponentCount} 个图层，文件共 ${savedTotalComponents} 个图层`,
      );
      window.setTimeout(() => setSaveStatusMessage(""), 1800);
    } catch (error) {
      console.error("Save template suite failed", error);
      setSaveStatusMessage("");
      window.alert("保存整套模板失败：素材没有成功写入本地，请再试一次。");
    } finally {
      setIsSavingTemplateSuite(false);
    }
  };

  // Active template from ref store
  const activeTemplate = getThumbTemplate(activeThumbId);
  const getVisualComponentBox = (component: TemplateComponent) => {
    const isScene = component.type === "scene_base";
    const baseBox = {
      x: component.x ?? (isScene ? 0 : 50),
      y: component.y ?? (isScene ? 0 : 50),
      width: component.width ?? (isScene ? 100 : 30),
      height: component.height ?? (isScene ? 100 : 30),
    };

    const imageAspect = component.imageUrl ? componentImageRatios[component.id] : undefined;
    if (!imageAspect || imageAspect <= 0 || !activeTemplate) {
      return baseBox;
    }

    const canvasAspect =
      activeTemplate.outputWidth / Math.max(1, activeTemplate.outputHeight);
    const boxPixelAspect = (baseBox.width * canvasAspect) / Math.max(0.01, baseBox.height);

    if (Math.abs(boxPixelAspect - imageAspect) < 0.02) {
      return baseBox;
    }

    if (boxPixelAspect > imageAspect) {
      const visualWidth = Math.min(
        baseBox.width,
        (baseBox.height * imageAspect) / canvasAspect,
      );
      return {
        ...baseBox,
        x: baseBox.x + (baseBox.width - visualWidth) / 2,
        width: visualWidth,
      };
    }

    const visualHeight = Math.min(
      baseBox.height,
      (baseBox.width * canvasAspect) / imageAspect,
    );
    return {
      ...baseBox,
      y: baseBox.y + (baseBox.height - visualHeight) / 2,
      height: visualHeight,
    };
  };

  const registerComponentImageRatio = (
    componentId: string,
    image: HTMLImageElement,
  ) => {
    const ratio = image.naturalWidth / Math.max(1, image.naturalHeight);
    if (!Number.isFinite(ratio) || ratio <= 0) return;
    setComponentImageRatios((prev) => {
      if (Math.abs((prev[componentId] || 0) - ratio) < 0.001) return prev;
      return { ...prev, [componentId]: ratio };
    });
  };

  const syncComponentBoxToImageRatio = (
    component: TemplateComponent,
    image: HTMLImageElement,
  ) => {
    if (
      component.type === "scene_base" ||
      !activeTemplate ||
      aspectSyncedComponentIdsRef.current.has(component.id)
    ) {
      return;
    }
    const imageAspect = image.naturalWidth / Math.max(1, image.naturalHeight);
    if (!Number.isFinite(imageAspect) || imageAspect <= 0) return;

    const canvasAspect =
      activeTemplate.outputWidth / Math.max(1, activeTemplate.outputHeight);
    const currentWidth = component.width ?? 30;
    const currentHeight = component.height ?? 30;
    const currentAspect = (currentWidth * canvasAspect) / Math.max(0.01, currentHeight);

    if (Math.abs(currentAspect - imageAspect) < 0.04) {
      aspectSyncedComponentIdsRef.current.add(component.id);
      return;
    }

    const nextHeight = Math.max(
      2,
      Math.min(95, (currentWidth * canvasAspect) / imageAspect),
    );
    const centerY = (component.y ?? 0) + currentHeight / 2;
    const nextY = Math.max(0, Math.min(100 - nextHeight, centerY - nextHeight / 2));

    aspectSyncedComponentIdsRef.current.add(component.id);
    updateComponent(component.id, {
      height: nextHeight,
      y: nextY,
    });
  };

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
  const currentThumb = useMemo(
    () =>
      getExpandedSuiteThumbs(mainThemeCount, skuCount, detailCount).find(
        (thumb) => thumb.id === activeThumbId,
      ),
    [activeThumbId, detailCount, mainThemeCount, skuCount],
  );
  const currentSuiteName = baseTemplate?.templateName || "未命名套系";
  const currentPageName = currentThumb?.title || activeTemplate?.templateName || "当前页面";

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
    saveThumbTemplate(activeThumbId, stripLegacyTemplateSlot(updated));
  };

  const patchActiveTemplate = (
    patcher: (template: Template) => Template,
    targetThumbId = activeThumbId,
  ) => {
    const latestTemplate =
      saveSnapshotRef.current[targetThumbId] ||
      thumbTemplatesRef.current[targetThumbId] ||
      getThumbTemplate(targetThumbId);
    saveThumbTemplate(targetThumbId, patcher(stripLegacyTemplateSlot(latestTemplate)));
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
      if (panelDragging.current) {
        const host = canvasAreaRef.current?.closest("[data-canvas-work-area]");
        const hostRect = host?.getBoundingClientRect();
        const nextX = panelDragStart.current.px + (e.clientX - panelDragStart.current.x);
        const nextY = panelDragStart.current.py - (e.clientY - panelDragStart.current.y);
        const maxX = Math.max(0, (hostRect?.width || 900) - 58);
        const maxY = Math.max(0, (hostRect?.height || 600) - 58);
        setPanelPos({
          x: Math.max(8, Math.min(maxX, nextX)),
          y: Math.max(8, Math.min(maxY, nextY)),
        });
        return;
      }
      const drag = dragRef.current;
      if (!drag?.active) return;
      e.preventDefault();

      const rect = canvasAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;

      const isMove = drag.action === "move";
      const limit = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      const alignmentBounds = getAlignmentBounds(showSafetyRegion);
      const movedBox = snapBoxToBounds(
        clampVisualBoxToCanvas({
          x: drag.startTargetX + dxPct,
          y: drag.startTargetY + dyPct,
          width: drag.startTargetW,
          height: drag.startTargetH,
        }),
        alignmentBounds,
      );
      const nextX = isMove ? movedBox.x : drag.startTargetX + dxPct;
      const nextY = isMove ? movedBox.y : drag.startTargetY + dyPct;

      if (drag.targetType === "component") {
        if (isMove) {
          updateComponent(drag.targetId, {
            x: nextX,
            y: nextY,
            width: drag.startTargetW,
            height: drag.startTargetH,
          });
        } else {
          let rx = drag.startTargetX, ry = drag.startTargetY, rw = drag.startTargetW, rh = drag.startTargetH;
          if (drag.handle === "tl") { rx += dxPct; ry += dyPct; rw -= dxPct; rh -= dyPct; }
          else if (drag.handle === "tr") { ry += dyPct; rw += dxPct; rh -= dyPct; }
          else if (drag.handle === "bl") { rx += dxPct; rw -= dxPct; rh += dyPct; }
          else if (drag.handle === "br") { rw += dxPct; rh += dyPct; }
          rw = limit(rw, 2, MAX_ELEMENT_SIZE_PERCENT); rh = limit(rh, 2, MAX_ELEMENT_SIZE_PERCENT);
          // Proportional resize: lock aspect ratio
          const aspect = drag.startTargetW / Math.max(0.01, drag.startTargetH);
          const wDriven = Math.abs(rw - drag.startTargetW) >= Math.abs(rh - drag.startTargetH);
          if (wDriven) { rh = rw / aspect; } else { rw = rh * aspect; }
          rw = limit(rw, 2, MAX_ELEMENT_SIZE_PERCENT); rh = limit(rh, 2, MAX_ELEMENT_SIZE_PERCENT);
          if (drag.handle === "tl") { rx = drag.startTargetX + drag.startTargetW - rw; ry = drag.startTargetY + drag.startTargetH - rh; }
          else if (drag.handle === "tr") { ry = drag.startTargetY + drag.startTargetH - rh; }
          else if (drag.handle === "bl") { rx = drag.startTargetX + drag.startTargetW - rw; }
          const resizedBox = snapResizedBoxToCanvasFrame(
            { x: rx, y: ry, width: rw, height: rh },
            drag.handle,
            aspect,
          );
          const nextBox = snapBoxToBounds(
            clampVisualBoxToCanvas(resizedBox),
            alignmentBounds,
          );
          updateComponent(drag.targetId, {
            x: nextBox.x,
            y: nextBox.y,
            width: nextBox.width,
            height: nextBox.height,
          });
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
          const resizedSlotBox = snapResizedBoxToCanvasFrame(
            { x: rx, y: ry, width: rw, height: rh },
            drag.handle,
            sAspect,
          );
          rx = limit(resizedSlotBox.x, 0, 100 - resizedSlotBox.width);
          ry = limit(resizedSlotBox.y, 0, 100 - resizedSlotBox.height);
          rw = resizedSlotBox.width;
          rh = resizedSlotBox.height;
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
      panelDragging.current = false;
      if (dragRef.current?.active) { dragRef.current = null; setDragTick((t) => t + 1); }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [activeTemplate, showSafetyRegion, updateComponent]);

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
      name:
        name ||
        (type === "product_slot" ? "台历产品槽位" : COMPONENT_TYPE_LABEL[type]),
      type,
      slotProductType:
        type === "product_slot" ? businessConfig.productLine : undefined,
      imageUrl,
      x: isScene ? 0 : position?.x ?? (type === "product_slot" ? 36 : 20),
      y: isScene ? 0 : position?.y ?? (type === "product_slot" ? 34 : 20),
      width: isScene ? 100 : type === "product_slot" ? 42 : 46,
      height: isScene ? 100 : type === "product_slot" ? 42 : 18,
      zIndex: getDefaultZIndex(type),
      visible: true,
      sendToRunningHub: type === "scene_base" || type === "product_slot",
      positionLocked: false,
      lockAspectRatio: true,
      scaleMode: "contain",
      anchor: "center",
    };
    patchActiveTemplate((template) => ({
      ...template,
      components: [...(template.components || []), component],
    }));
    clearSelection();
    setSelectedComponentId(id);
  };

  const getImageBoxForImport = (
    image: ImportedImageData,
    type: TemplateComponentType,
    position?: { x: number; y: number },
  ) => {
    if (type === "scene_base") {
      const canvasAspect =
        activeTemplate.outputWidth / Math.max(1, activeTemplate.outputHeight);
      const imageAspect = image.cropWidth / Math.max(1, image.cropHeight);
      const width = 100;
      const height = Math.max(1, (width * canvasAspect) / Math.max(0.01, imageAspect));
      return {
        x: 0,
        y: (100 - height) / 2,
        width,
        height,
      };
    }

    if (image.wasTrimmed) {
      return {
        x: (image.cropX / Math.max(1, image.sourceWidth)) * 100,
        y: (image.cropY / Math.max(1, image.sourceHeight)) * 100,
        width: (image.cropWidth / Math.max(1, image.sourceWidth)) * 100,
        height: (image.cropHeight / Math.max(1, image.sourceHeight)) * 100,
      };
    }

    const canvasAspect = activeTemplate.outputWidth / Math.max(1, activeTemplate.outputHeight);
    const imageAspect = image.cropWidth / Math.max(1, image.cropHeight);
    const defaultWidth =
      type === "product_slot" ? 36 : type === "text_overlay" ? 28 : 24;
    const width = defaultWidth;
    const height = Math.max(3, Math.min(85, (width * canvasAspect) / imageAspect));
    const centerX = position?.x ?? 50;
    const centerY = position?.y ?? 50;
    const x = Math.max(0, Math.min(100 - width, centerX - width / 2));
    const y = Math.max(0, Math.min(100 - height, centerY - height / 2));

    return { x, y, width, height };
  };

  const tightenExistingComponentOnce = async (component: TemplateComponent) => {
    if (
      component.type === "scene_base" ||
      !component.imageUrl ||
      tightenedComponentIdsRef.current.has(component.id)
    ) {
      return;
    }
    tightenedComponentIdsRef.current.add(component.id);

    try {
      const image = await trimTransparentImage(component.imageUrl, true);
      if (!image.wasTrimmed) return;
      const box = {
        x:
          (component.x ?? 0) +
          (image.cropX / Math.max(1, image.sourceWidth)) * (component.width ?? 30),
        y:
          (component.y ?? 0) +
          (image.cropY / Math.max(1, image.sourceHeight)) * (component.height ?? 30),
        width:
          (image.cropWidth / Math.max(1, image.sourceWidth)) *
          (component.width ?? 30),
        height:
          (image.cropHeight / Math.max(1, image.sourceHeight)) *
          (component.height ?? 30),
      };
      updateComponent(component.id, {
        imageUrl: image.dataUrl,
        x: Math.max(0, Math.min(100 - box.width, box.x)),
        y: Math.max(0, Math.min(100 - box.height, box.y)),
        width: Math.max(2, Math.min(100, box.width)),
        height: Math.max(2, Math.min(100, box.height)),
      });
    } catch {
      // Ignore images that cannot be analyzed in-browser.
    }
  };

  const buildImportedComponent = async (
    file: File,
    type: TemplateComponentType,
    position?: { x: number; y: number },
  ): Promise<TemplateComponent> => {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await trimTransparentImage(
      dataUrl,
      type !== "scene_base",
    );
    const box = getImageBoxForImport(image, type, position);
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const label = getTypeLabel(type);
    const savedImageUrl = await uploadTemplateImage(
      image.dataUrl,
      file.name,
      new Map(),
    );

    return {
      id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${baseName} (${label})`,
      type,
      slotProductType:
        type === "product_slot" ? businessConfig.productLine : undefined,
      imageUrl: savedImageUrl,
      x: box.x,
      y: box.y,
      width: Math.max(2, type === "scene_base" ? box.width : Math.min(100, box.width)),
      height: Math.max(2, type === "scene_base" ? box.height : Math.min(100, box.height)),
      zIndex: getDefaultZIndexForType(type),
      visible: true,
      sendToRunningHub: getDefaultSendToRH(type),
      positionLocked: false,
      lockAspectRatio: true,
      scaleMode: "contain",
      anchor: "center",
    };
  };

  const importComponentFile = async (
    file: File,
    position?: { x: number; y: number },
  ) => {
    await runImportJob(async () => {
      const type = getComponentTypeByFileName(file.name);
      const component = await buildImportedComponent(file, type, position);
      patchActiveTemplate((template) => {
        const nextComponents =
          type === "scene_base"
            ? [
                component,
                ...(template.components || []).filter(
                  (item) => item.type !== "scene_base",
                ),
              ]
            : [...(template.components || []), component];
        return { ...template, components: nextComponents };
      });
      clearSelection();
      setSelectedComponentId(component.id);
    });
  };

  // Batch import: read all files, detect types, create components at once
  const handleBatchImport = async (files: FileList) => {
    await runImportJob(async () => {
      const fileArray = Array.from(files);
      const newComponents: TemplateComponent[] = [];

      for (const file of fileArray) {
        const type = detectLayerType(file.name);
        newComponents.push(await buildImportedComponent(file, type));
      }

      if (newComponents.length === 0) return;

      // Merge with existing components, scene_base goes first
      patchActiveTemplate((template) => {
        const existing = (template.components || []).filter(
          (c) => !newComponents.some((nc) => nc.type === "scene_base" && c.type === "scene_base"),
        );
        const merged = [
          ...newComponents.filter((c) => c.type === "scene_base"),
          ...existing.filter((c) => c.type !== "scene_base"),
          ...newComponents.filter((c) => c.type !== "scene_base"),
        ];
        return { ...template, components: merged };
      });
    });
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
      slots: [],
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
      setIsCanvasFileDragActive(true);
    }
  };

  const handleCanvasDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsCanvasFileDragActive(false);
    }
  };

  const handleCanvasDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsCanvasFileDragActive(false);
    const files: File[] = [];
    for (let index = 0; index < event.dataTransfer.files.length; index += 1) {
      const item = event.dataTransfer.files.item(index);
      if (item && item.type.startsWith("image/")) {
        files.push(item);
      }
    }
    if (files.length === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const dropPosition = {
      x: Math.min(95, Math.max(5, x)),
      y: Math.min(95, Math.max(5, y)),
    };
    await runImportJob(async () => {
      const importedComponents = await Promise.all(
        files.map((file, index) =>
          buildImportedComponent(file, getComponentTypeByFileName(file.name), {
            x: dropPosition.x + index * 2,
            y: dropPosition.y + index * 2,
          }),
        ),
      );
      const hasSceneBase = importedComponents.some(
        (component) => component.type === "scene_base",
      );
      patchActiveTemplate((template) => {
        const nextComponents = [
          ...importedComponents.filter((component) => component.type === "scene_base"),
          ...(template.components || []).filter(
            (component) => !(hasSceneBase && component.type === "scene_base"),
          ),
          ...importedComponents.filter((component) => component.type !== "scene_base"),
        ];
        return { ...template, components: nextComponents };
      });
      clearSelection();
      const lastComponent = importedComponents[importedComponents.length - 1];
      setSelectedComponentId(lastComponent?.id || null);
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
    const isLocked = component.positionLocked === true;
    const visualBox = getVisualComponentBox(component);
    const compX = visualBox.x;
    const compY = visualBox.y;
    const compW = visualBox.width;
    const compH = visualBox.height;
    const style: React.CSSProperties = isScene
      ? {
          left: `${compX}%`,
          top: `${compY}%`,
          width: `${compW}%`,
          height: `${compH}%`,
          zIndex: component.zIndex,
        }
      : {
          left: `${compX}%`,
          top: `${compY}%`,
          width: `${compW}%`,
          height: `${compH}%`,
          zIndex: component.zIndex,
        };

    if (isScene) {
      return (
        <div
          key={component.id}
          className={`absolute text-left ${isLocked ? "cursor-default" : "cursor-move"}`}
          style={{ ...style, pointerEvents: isSelected ? "auto" : "none" }}
          onMouseDown={(e) => {
            if (isLocked) {
              e.stopPropagation();
              selectComp(component.id);
              return;
            }
            startDrag(e, "move", "component", component.id, { x: compX, y: compY, w: compW, h: compH });
          }}
        >
          {component.imageUrl ? (
            <img
              src={component.imageUrl}
              alt={component.name}
              className="h-full w-full object-cover pointer-events-none"
              onLoad={(event) => {
                registerComponentImageRatio(component.id, event.currentTarget);
              }}
            />
          ) : null}
          {isSelected && (
            <span className="absolute -top-5 left-0 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {component.name}
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        key={component.id}
        className={`absolute text-left ${isLocked ? "" : "cursor-move"}`}
        style={style}
        onMouseDown={(e) => {
          if (isLocked) {
            e.stopPropagation();
            selectComp(component.id);
            return;
          }
          startDrag(e, "move", "component", component.id, { x: compX, y: compY, w: compW, h: compH });
        }}
      >
        {component.imageUrl ? (
          <img
            src={component.imageUrl}
            alt={component.name}
            className="h-full w-full object-contain pointer-events-none"
            onLoad={(event) => {
              registerComponentImageRatio(component.id, event.currentTarget);
              void tightenExistingComponentOnce(component);
              syncComponentBoxToImageRatio(component, event.currentTarget);
            }}
          />
        ) : component.type === "product_slot" ? (
          renderProductPreview()
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/70 text-[10px] font-bold text-slate-700">
            {COMPONENT_TYPE_LABEL[component.type]}
          </div>
        )}
        {isSelected && (
          <span className="absolute -top-5 left-0 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
            {component.name}
          </span>
        )}
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
      const box = getVisualComponentBox(c);
      tx = box.x; ty = box.y; tw = box.width; th = box.height;
      tLocked = c.positionLocked === true; tVisible = true;
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
    const NInp = ({
      v,
      onCh,
      min,
      max,
      step = 0.5,
    }: {
      v: number;
      onCh: (n: number) => void;
      min?: number;
      max?: number;
      step?: number;
    }) => (
      <input
        type="number"
        value={Math.round(v * 10) / 10}
        step={step}
        min={min ?? 0}
        max={max ?? 100}
        onChange={(e) => {
          const nextValue = e.currentTarget.valueAsNumber;
          if (Number.isFinite(nextValue)) {
            onCh(nextValue);
          }
        }}
        className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] font-mono" />
    );
    const selBox = sel ? getVisualComponentBox(sel) : null;
    const canvasAspect =
      activeTemplate.outputWidth / Math.max(1, activeTemplate.outputHeight);
    const imageAspect = sel?.imageUrl ? componentImageRatios[sel.id] : undefined;
    const updateSelectedBox = (patch: Partial<{ x: number; y: number; width: number; height: number }>) => {
      if (!sel || !selBox) return;
      if (sel.positionLocked) return;
      aspectSyncedComponentIdsRef.current.add(sel.id);
      const nextBox = snapBoxToBounds(
        clampVisualBoxToCanvas({
          x: patch.x ?? selBox.x,
          y: patch.y ?? selBox.y,
          width: patch.width ?? selBox.width,
          height: patch.height ?? selBox.height,
        }),
        getAlignmentBounds(showSafetyRegion),
      );
      updateComponent(sel.id, {
        x: nextBox.x,
        y: nextBox.y,
        width: nextBox.width,
        height: nextBox.height,
      });
    };
    const updateSelectedPixelWidth = (pixelWidth: number) => {
      if (!sel || !selBox || pixelWidth <= 0) return;
      const nextWidth = Math.max(
        2,
        Math.min(
          MAX_ELEMENT_SIZE_PERCENT,
          (pixelWidth / activeTemplate.outputWidth) * 100,
        ),
      );
      const nextHeight =
        imageAspect && imageAspect > 0
          ? Math.max(
              2,
              Math.min(
                MAX_ELEMENT_SIZE_PERCENT,
                (nextWidth * canvasAspect) / imageAspect,
              ),
            )
          : selBox.height;
      const centerX = selBox.x + selBox.width / 2;
      const centerY = selBox.y + selBox.height / 2;
      updateSelectedBox({
        x: centerX - nextWidth / 2,
        y: centerY - nextHeight / 2,
        width: nextWidth,
        height: nextHeight,
      });
    };
    const updateSelectedPixelHeight = (pixelHeight: number) => {
      if (!sel || !selBox || pixelHeight <= 0) return;
      const nextHeight = Math.max(
        2,
        Math.min(
          MAX_ELEMENT_SIZE_PERCENT,
          (pixelHeight / activeTemplate.outputHeight) * 100,
        ),
      );
      const nextWidth =
        imageAspect && imageAspect > 0
          ? Math.max(
              2,
              Math.min(
                MAX_ELEMENT_SIZE_PERCENT,
                (nextHeight * imageAspect) / canvasAspect,
              ),
            )
          : selBox.width;
      const centerX = selBox.x + selBox.width / 2;
      const centerY = selBox.y + selBox.height / 2;
      updateSelectedBox({
        x: centerX - nextWidth / 2,
        y: centerY - nextHeight / 2,
        width: nextWidth,
        height: nextHeight,
      });
    };
    const alignSelectedElement = (
      axis: "x" | "y",
      position: "start" | "center" | "end",
    ) => {
      const bounds = getAlignmentBounds(showSafetyRegion);
      if (sel && selBox) {
        if (axis === "x") {
          const nextX =
            position === "start"
              ? bounds.left
              : position === "center"
                ? bounds.centerX - selBox.width / 2
                : bounds.right - selBox.width;
          updateSelectedBox({ x: nextX });
        } else {
          const nextY =
            position === "start"
              ? bounds.top
              : position === "center"
                ? bounds.centerY - selBox.height / 2
                : bounds.bottom - selBox.height;
          updateSelectedBox({ y: nextY });
        }
        return;
      }
      if (sTf) {
        const halfWidth = 12;
        const halfHeight = 4;
        if (axis === "x") {
          updateTextFieldValue(
            sTf.id,
            "x",
            position === "start"
              ? bounds.left + halfWidth
              : position === "center"
                ? bounds.centerX
                : bounds.right - halfWidth,
          );
        } else {
          updateTextFieldValue(
            sTf.id,
            "y",
            position === "start"
              ? bounds.top + halfHeight
              : position === "center"
                ? bounds.centerY
                : bounds.bottom - halfHeight,
          );
        }
      }
    };
    const alignButtonClass =
      "rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700";
    const renderAlignTools = () => (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-slate-700">对齐工具</span>
          <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
            {showSafetyRegion ? "按安全框" : "按画布框"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button type="button" className={alignButtonClass} onClick={() => alignSelectedElement("x", "start")}>左对齐</button>
          <button type="button" className={alignButtonClass} onClick={() => alignSelectedElement("x", "center")}>水平居中</button>
          <button type="button" className={alignButtonClass} onClick={() => alignSelectedElement("x", "end")}>右对齐</button>
          <button type="button" className={alignButtonClass} onClick={() => alignSelectedElement("y", "start")}>顶部</button>
          <button type="button" className={alignButtonClass} onClick={() => alignSelectedElement("y", "center")}>垂直居中</button>
          <button type="button" className={alignButtonClass} onClick={() => alignSelectedElement("y", "end")}>底部</button>
        </div>
      </div>
    );
    return (
      <div className="space-y-3 text-[11px]">
        {sel && (
          <>
            <Field l="名称"><input value={sel.name||""} onChange={(e) => updateComponent(sel.id,{name:e.target.value})} className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] font-bold" /></Field>
            <Field l="类型"><span className="text-[10px] text-slate-500">{COMPONENT_TYPE_LABEL[sel.type]}</span></Field>
            {sel.type === "product_slot" && (
              <Field l="产品槽位类型">
                <select
                  value={sel.slotProductType || businessConfig.productLine}
                  onChange={(event) => {
                    const value = event.target.value as ProductLine;
                    updateComponent(sel.id, {
                      slotProductType: value,
                      name:
                        value === "wall_calendar"
                          ? "挂历产品槽位"
                          : "台历产品槽位",
                    });
                  }}
                  className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] font-bold"
                >
                  <option value="desk_calendar">台历</option>
                  <option value="wall_calendar">挂历</option>
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field l="X (%)"><NInp v={selBox?.x ?? sel.x ?? 50} onCh={(n) => updateSelectedBox({x:n})} /></Field>
              <Field l="Y (%)"><NInp v={selBox?.y ?? sel.y ?? 50} onCh={(n) => updateSelectedBox({y:n})} /></Field>
              <Field l="宽度 (%)"><NInp v={selBox?.width ?? sel.width ?? 30} onCh={(n) => updateSelectedBox({width:n})} min={2} max={MAX_ELEMENT_SIZE_PERCENT} /></Field>
              <Field l="高度 (%)"><NInp v={selBox?.height ?? sel.height ?? 30} onCh={(n) => updateSelectedBox({height:n})} min={2} max={MAX_ELEMENT_SIZE_PERCENT} /></Field>
            </div>
            <div className="rounded-lg bg-blue-50 p-2">
              <div className="mb-1 text-[10px] font-black text-blue-700">实际输出尺寸</div>
              <div className="grid grid-cols-2 gap-2">
                <Field l="实际宽度 px">
                  <NInp
                    v={((selBox?.width ?? sel.width ?? 30) / 100) * activeTemplate.outputWidth}
                    onCh={updateSelectedPixelWidth}
                    min={1}
                    max={activeTemplate.outputWidth * 3}
                    step={1}
                  />
                </Field>
                <Field l="实际高度 px">
                  <NInp
                    v={((selBox?.height ?? sel.height ?? 30) / 100) * activeTemplate.outputHeight}
                    onCh={updateSelectedPixelHeight}
                    min={1}
                    max={activeTemplate.outputHeight * 3}
                    step={1}
                  />
                </Field>
              </div>
              <div className="text-[9px] font-bold text-blue-500">
                用这里的高度统一文案尺寸；修改像素高度时会按素材比例同步宽度。
              </div>
            </div>
            <Field l="zIndex"><NInp v={sel.zIndex??0} onCh={(n) => updateComponent(sel.id,{zIndex:n})} min={0} max={999} /></Field>
            <Field l="图层类型"><select value={sel.type} onChange={(e) => updateComponent(sel.id, {type: e.target.value as TemplateComponentType})}
              className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] font-bold">
              {Object.entries(COMPONENT_TYPE_LABEL).map(([v,label]) => (<option key={v} value={v}>{label}</option>))}
            </select></Field>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-[10px] cursor-pointer"><input type="checkbox" checked={sel.visible!==false} onChange={(e) => updateComponent(sel.id,{visible:e.target.checked})} /> 可见</label>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer"><input type="checkbox" checked={sel.sendToRunningHub??false} onChange={(e) => updateComponent(sel.id,{sendToRunningHub:e.target.checked})} /> 发送RH</label>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer"><input type="checkbox" checked={sel.positionLocked===true} onChange={(e) => updateComponent(sel.id,{positionLocked:e.target.checked})} /> 锁定位置</label>
            </div>
            {renderAlignTools()}
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
            {renderAlignTools()}
          </>
        )}
      </div>
    );
  };

  const renderLayerList = () => {
    const layerItems = getComponentLayerItems();
    return (
      <div className="space-y-2">
        {layerItems.length > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between text-[9px] font-bold text-slate-400">
              <span>图层顺序 · 上方显示在前</span>
              <span>{layerItems.length}</span>
            </div>
            <div className="space-y-1">
              {layerItems.map((c) => (
                <div
                  key={c.id}
                  draggable={c.type !== "scene_base" && c.positionLocked !== true}
                  onDragStart={(e) => {
                    if (c.type === "scene_base" || c.positionLocked) return;
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingLayerId(c.id);
                  }}
                  onDragEnd={() => setDraggingLayerId(null)}
                  onDragOver={(e) => {
                    if (draggingLayerId && c.type !== "scene_base") {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingLayerId && draggingLayerId !== c.id) {
                      reorderComponentLayer(draggingLayerId, c.id);
                    }
                    setDraggingLayerId(null);
                  }}
                  className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px] ${
                    c.type === "scene_base" || c.positionLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
                  } ${draggingLayerId === c.id ? "bg-blue-100/60 opacity-70" : ""} ${
                    selectedComponentId === c.id
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    setSelectedComponentId(c.id);
                    setSelectedSlotId(null);
                    setSelectedTextFieldId(null);
                  }}
                >
                  <span className="w-3 shrink-0 text-center text-slate-300">
                    {c.type === "scene_base" ? "底" : c.positionLocked ? "锁" : "⠿"}
                  </span>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      COMPONENT_TYPE_COLOR[c.type]
                    }`}
                  />
                  <span className="truncate font-medium flex-1">{c.name || c.type}</span>
                  <span className="rounded bg-slate-100 px-1 py-0.5 text-[8px] font-bold text-slate-400">
                    {COMPONENT_TYPE_LABEL[c.type]}
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); updateComponent(c.id, { visible: c.visible === false ? true : false }); }}
                    className="text-[9px] px-0.5 hover:bg-slate-200 rounded">{c.visible === false ? "⊘" : "◉"}</button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateComponent(c.id, {
                        positionLocked: c.positionLocked === true ? false : true,
                      });
                    }}
                    className={`rounded px-0.5 text-[9px] hover:bg-slate-200 ${
                      c.positionLocked ? "text-blue-600" : "text-slate-400"
                    }`}
                    title={c.positionLocked ? "解除位置锁定" : "锁定位置"}
                  >
                    {c.positionLocked ? "锁" : "开"}
                  </button>
                  {c.type !== "scene_base" && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteComponent(c.id); }}
                      className="text-[9px] px-0.5 hover:bg-red-100 hover:text-red-500 rounded text-slate-400" title="删除图层">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
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
        className="absolute cursor-move bg-transparent text-left"
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
        {isSelected && (
          <span className="absolute -top-5 left-0 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
            {slot.slotName}
          </span>
        )}
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
        className="absolute max-w-[80%] cursor-move rounded px-1.5 py-1 text-left"
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-100 text-left text-slate-800">
      <header className="shrink-0 border-b border-slate-200 bg-white px-3">
        <div className="flex h-14 items-center justify-between gap-2 overflow-x-auto">
          <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            {onBackToSuiteLibrary && (
              <button
                type="button"
                onClick={onBackToSuiteLibrary}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                返回模板套系库
              </button>
            )}
            <span className="shrink-0 text-slate-300">/</span>
            <span className="min-w-0 max-w-[42vw] truncate text-[12px] font-semibold text-slate-900 md:max-w-[28rem]">
              {currentSuiteName}
            </span>
            <span className="shrink-0 text-slate-300">/</span>
            <span className="min-w-0 max-w-[28vw] truncate text-[12px] text-slate-600 md:max-w-[18rem]">
              {currentPageName}
            </span>
            <span className="hidden shrink-0 rounded-full border border-slate-200 px-2 py-1 text-[10px] text-slate-400 opacity-50 xl:inline-flex">
              {businessPathLabel}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowGrid((value) => !value)}
              className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-bold whitespace-nowrap ${
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
              className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-bold whitespace-nowrap ${
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
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 whitespace-nowrap"
            >
              <option value={80}>80%</option>
              <option value={100}>100%</option>
              <option value={120}>120%</option>
            </select>
            <button
              type="button"
              onClick={() => setActivePanel("test")}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-900 px-2.5 text-[11px] font-bold text-white whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5" />
              试套检查
            </button>
            <button
              type="button"
              disabled={isSavingTemplateSuite || isImportingComponents}
              onClick={() => void handleSaveSuite()}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-[11px] font-bold text-white shadow-sm whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {isImportingComponents
                ? "导入中..."
                : isSavingTemplateSuite
                  ? "保存中..."
                  : "保存整套模板"}
            </button>
            {saveStatusMessage && (
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                {saveStatusMessage}
              </span>
            )}
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
          onTextFieldUpdate={(id, field, value) => updateTextFieldValue(id, field, value)}
          onProductChange={setSelectedProductId}
          onMainThemeCountChange={setMainThemeCount}
          onSkuCountChange={setSkuCount}
          onDetailCountChange={setDetailCount}
          onSave={async () => {
            await handleSaveSuite();
            setActivePanel(null);
          }}
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
        <div
          data-canvas-work-area
          className="relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
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
              <button type="button" onClick={() => setActivePanel("add")} className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">添加产品/元素</button>
              <button type="button" onClick={() => setActivePanel("test")} className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">试套检查</button>
              <button
                type="button"
                disabled={isSavingTemplateSuite || isImportingComponents}
                onClick={() => void handleSaveSuite()}
                className="rounded bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isImportingComponents
                  ? "导入中..."
                  : isSavingTemplateSuite
                    ? "保存中..."
                    : "保存整套"}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <div className="flex min-h-full items-center justify-center">
              <div className="relative inline-block">
                <div
                  ref={canvasAreaRef}
                  className="relative overflow-visible border border-slate-300 shadow-2xl"
                  onDragEnter={handleCanvasDragOver}
                  onDragOver={handleCanvasDragOver}
                  onDragLeave={handleCanvasDragLeave}
                  onDrop={handleCanvasDrop}
                  style={{ width: canvasSize.width, height: canvasSize.height }}
                >
                  <div
                    onMouseDown={(e) => {
                      if (e.target === e.currentTarget) {
                        clearSelection();
                      }
                    }}
                    className={`absolute inset-0 overflow-hidden ${activeTemplate.background.type === "scene" ? getCanvasBackgroundClass(activeTemplate.background.sceneStyle) : "bg-white"}`}
                  >
                    {showGrid && (<div className="pointer-events-none absolute inset-0 opacity-40" style={{backgroundImage:"linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)",backgroundSize:"20px 20px"}} />)}
                    {sortedComponents.map(renderComponentOnCanvas)}
                    {activeTemplate.textFields.map(renderTextField)}
                    {showSafetyRegion && (<div className="pointer-events-none absolute inset-[6%] border-2 border-dashed border-rose-400/70" />)}
                    {isCanvasFileDragActive && (
                      <div className="pointer-events-none absolute inset-0 z-[9000] flex items-center justify-center bg-blue-500/15 backdrop-blur-[1px]">
                        <div className="rounded-2xl border border-blue-300 bg-white/95 px-5 py-4 text-center shadow-xl">
                          <div className="text-sm font-black text-blue-700">松手导入素材</div>
                          <div className="mt-1 text-[11px] font-bold text-slate-500">
                            支持 PNG / JPG / WebP，可一次拖入多张
                          </div>
                        </div>
                      </div>
                    )}
                    {isImportingComponents && (
                      <div className="pointer-events-none absolute inset-0 z-[9000] flex items-center justify-center bg-white/35 backdrop-blur-[1px]">
                        <div className="rounded-2xl border border-blue-200 bg-white/95 px-5 py-4 text-center shadow-xl">
                          <div className="text-sm font-black text-blue-700">素材正在导入</div>
                          <div className="mt-1 text-[11px] font-bold text-slate-500">
                            完成后再保存，避免空模板
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pointer-events-none absolute inset-0 overflow-visible">
                    {renderTransformBox()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute z-50" style={{ bottom: panelPos.y, left: panelPos.x }}>
            <button
              type="button"
              onClick={() => setIsLayerPanelOpen(v => !v)}
              onMouseDown={(e) => {
                panelDragging.current = true;
                panelDragStart.current = { x: e.clientX, y: e.clientY, px: panelPos.x, py: panelPos.y };
                e.preventDefault();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-lg transition-colors hover:bg-slate-50 hover:text-slate-800 cursor-grab active:cursor-grabbing"
              title={isLayerPanelOpen ? "收起图层列表，可拖拽移动" : "展开图层列表，可拖拽移动"}
            >
              <Layers className="h-4 w-4" />
            </button>
            {isLayerPanelOpen && (
              <div className="absolute bottom-12 left-0">
                {renderFloatingLayerList()}
              </div>
            )}
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
            refreshKey={storeVersion}
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
    { id: "add", label: "添加产品/元素", icon: Plus },
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
  onTextFieldUpdate: (
    fieldId: string,
    field: keyof TextField,
    value: unknown,
  ) => void;
  onProductChange: (productId: string) => void;
  onMainThemeCountChange: (count: number) => void;
  onSkuCountChange: (count: number) => void;
  onDetailCountChange: (count: number) => void;
  onSave: () => void | Promise<void>;
}> = ({
  activePanel,
  onClose,
  activeTemplate,
  activeProduct,
  products,
  businessConfig,
  selectedComponent,
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
  onTextFieldUpdate,
  onProductChange,
  onMainThemeCountChange,
  onSkuCountChange,
  onDetailCountChange,
  onSave,
}) => {
  const panelPositionClass = "bottom-8 left-[330px] max-h-[calc(100vh-10rem)]";

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
          {activePanel === "add" && "添加产品/元素"}
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
        {activePanel === "add" && (
          <AddElementPanel
            productLine={businessConfig.productLine}
            onAddComponent={onAddComponent}
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

const AddElementPanel: React.FC<{
  productLine: ProductLine;
  onAddComponent: (
    type: TemplateComponentType,
    imageUrl?: string,
    name?: string,
  ) => void;
}> = ({ productLine, onAddComponent }) => {
  const productSlotName =
    productLine === "wall_calendar" ? "挂历产品槽位" : "台历产品槽位";
  return (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onAddComponent("product_slot", undefined, productSlotName)}
        className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-3 text-xs font-bold text-blue-700"
      >
        {productSlotName}
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
  onSave: () => void | Promise<void>;
}> = ({ inspectionItems, onSave }) => (
  <div className="space-y-4">
    <InspectionList items={inspectionItems} />
    <button
      type="button"
      onClick={onSave}
      className="w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white"
    >
      保存整套模板
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

