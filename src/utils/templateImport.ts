import { TemplateComponentType } from "../types";

const FILENAME_TYPE_RULES: Array<{
  pattern: RegExp;
  type: TemplateComponentType;
}> = [
  {
    pattern: /scene[_\s-]*base|background|bg|base|底图|背景|主背景|画布底|场景底/i,
    type: "scene_base",
  },
  {
    pattern: /product|slot|main|subject|产品|商品|主体|槽位|占位|产品位|主图|产品场景|产品效果/i,
    type: "product_slot",
  },
  {
    pattern: /text|title|copy|heading|slogan|文案|文字|标题|副标题|卖点/i,
    type: "text_overlay",
  },
  {
    pattern: /logo|brand|mark|标志|品牌|企业标|商标/i,
    type: "logo_overlay",
  },
  {
    pattern: /decor|ornament|label|badge|detail|装饰|点缀|标签|贴纸|花纹|边框|工艺/i,
    type: "decor_overlay",
  },
];

export function detectLayerType(fileName: string): TemplateComponentType {
  const basename = fileName.replace(/\.[^.]+$/, "");
  for (const rule of FILENAME_TYPE_RULES) {
    if (rule.pattern.test(basename)) return rule.type;
  }
  return "decor_overlay";
}

export function getDefaultZIndexForType(type: TemplateComponentType): number {
  const zIndexByType: Record<TemplateComponentType, number> = {
    scene_base: 0,
    product_slot: 10,
    decor_overlay: 30,
    text_overlay: 40,
    logo_overlay: 50,
  };
  return zIndexByType[type];
}

export function getDefaultSendToRH(type: TemplateComponentType): boolean {
  return type === "scene_base" || type === "product_slot";
}

export function detectPageIndex(fileName: string): number {
  const match = fileName.match(
    /(?:page|p|页|第)[_\s-]*(\d+)|[_\s-](\d{2,})[_\s.-]/i,
  );
  if (!match) return -1;
  const pageNumber = Number.parseInt(match[1] || match[2], 10);
  return Number.isNaN(pageNumber) ? -1 : pageNumber - 1;
}

export function getTypeLabel(type: TemplateComponentType): string {
  const labelByType: Record<TemplateComponentType, string> = {
    scene_base: "场景底图",
    product_slot: "产品槽位",
    text_overlay: "文案层",
    logo_overlay: "LOGO 层",
    decor_overlay: "装饰层",
  };
  return labelByType[type];
}
