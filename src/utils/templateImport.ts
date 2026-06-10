import { TemplateComponentType } from "../types";

/**
 * Map filename patterns to layer types.
 * Order matters — first match wins.
 */
const FILENAME_TYPE_RULES: Array<{ pattern: RegExp; type: TemplateComponentType }> = [
  { pattern: /scene|bg|背景|场[景京]/i, type: "scene_base" },
  { pattern: /product|产品|商品|主体|main/i, type: "product_slot" },
  { pattern: /text|title|文案|字|标题|heading/i, type: "text_overlay" },
  { pattern: /logo|标志|品牌|logotype/i, type: "logo_overlay" },
  { pattern: /decor|装饰|detail|花纹|边框|点缀/i, type: "decor_overlay" },
];

/** Filename → layer type */
export function detectLayerType(fileName: string): TemplateComponentType {
  const basename = fileName.replace(/\.[^.]+$/, ""); // remove extension
  for (const rule of FILENAME_TYPE_RULES) {
    if (rule.pattern.test(basename)) return rule.type;
  }
  return "decor_overlay"; // default fallback
}

/** Default zIndex by layer type */
export function getDefaultZIndexForType(type: TemplateComponentType): number {
  const map: Record<TemplateComponentType, number> = {
    scene_base: 0,
    product_slot: 10,
    decor_overlay: 30,
    text_overlay: 40,
    logo_overlay: 50,
  };
  return map[type] ?? 30;
}

/** Default sendToRunningHub by layer type */
export function getDefaultSendToRH(type: TemplateComponentType): boolean {
  return type === "scene_base" || type === "product_slot";
}

/**
 * Extract page index from filename like "page01", "page02", "page03", "P01", "02_layer", etc.
 * Returns 0-based index, or -1 if no match.
 */
export function detectPageIndex(fileName: string): number {
  // Match "page01", "page02", "page_01", "P01", "P02", "_01", "_02" etc.
  const m = fileName.match(/page[_\s]*(\d+)|P(\d+)|[_\s-](\d{2,})[_\s.-]/i);
  if (!m) return -1;
  const num = parseInt(m[1] || m[2] || m[3], 10);
  return isNaN(num) ? -1 : num - 1; // 0-based
}

/** Chinese label for layer type */
export function getTypeLabel(type: TemplateComponentType): string {
  const map: Record<TemplateComponentType, string> = {
    scene_base: "场景底图",
    product_slot: "产品槽位",
    text_overlay: "文案层",
    logo_overlay: "LOGO层",
    decor_overlay: "装饰层",
  };
  return map[type] || type;
}
