export enum ProductArchetype {
  desk_calendar = "desk_calendar",
  wall_calendar = "wall_calendar",
  fu_plaque_calendar = "fu_plaque_calendar",
  tear_off_calendar = "tear_off_calendar",
  gift_box_calendar = "gift_box_calendar",
  unknown = "unknown"
}

export enum BusinessRatioType {
  square = "square",
  vertical = "vertical",
  long_vertical = "long_vertical",
  wide = "wide",
  custom = "custom"
}

export enum PageRole {
  primary_main_square = "primary_main_square",
  primary_main_vertical = "primary_main_vertical",
  main_marketing_square = "main_marketing_square",
  main_marketing_vertical = "main_marketing_vertical",
  sku_variant = "sku_variant",
  sku_with_label = "sku_with_label",
  sku_grid = "sku_grid",
  detail_sequence = "detail_sequence",
  detail_core_selling = "detail_core_selling",
  detail_size_material = "detail_size_material",
  detail_inner_page = "detail_inner_page",
  detail_craft_closeup = "detail_craft_closeup",
  detail_package = "detail_package",
  sample_book_mockup = "sample_book_mockup",
  customization_detail = "customization_detail",
  customization_ad_area = "customization_ad_area",
  ad_custom_effect = "ad_custom_effect",
  white_bg = "white_bg",
  transparent_png = "transparent_png"
}

export enum ExportFolderKey {
  main_square = "main_square",
  main_vertical = "main_vertical",
  sku = "sku",
  detail = "detail",
  sample_book = "sample_book",
  customization_detail = "customization_detail",
  ad_custom_effect = "ad_custom_effect",
  white_bg = "white_bg",
  transparent_png = "transparent_png"
}

export const EXPORT_FOLDER_NAMES: Record<ExportFolderKey, string> = {
  [ExportFolderKey.main_square]: "主图800",
  [ExportFolderKey.main_vertical]: "主图750",
  [ExportFolderKey.sku]: "SKU",
  [ExportFolderKey.detail]: "详情图",
  [ExportFolderKey.sample_book]: "书样",
  [ExportFolderKey.customization_detail]: "定制详情",
  [ExportFolderKey.ad_custom_effect]: "定制效果",
  [ExportFolderKey.white_bg]: "白底精修",
  [ExportFolderKey.transparent_png]: "透明PNG"
};

export interface ArchetypeDeliveryRule {
  mainSquareMinCount: number;
  mainVerticalMinCount: number;
  mainMarketingTotalMinCount: number;
  whiteBgRequired: boolean;
  transparentPngRequired: boolean;
}

export const ARCHETYPE_DELIVERY_RULES: Record<ProductArchetype, ArchetypeDeliveryRule> = {
  [ProductArchetype.desk_calendar]: {
    mainSquareMinCount: 10,
    mainVerticalMinCount: 10,
    mainMarketingTotalMinCount: 20,
    whiteBgRequired: true,
    transparentPngRequired: true
  },
  [ProductArchetype.wall_calendar]: {
    mainSquareMinCount: 12,
    mainVerticalMinCount: 12,
    mainMarketingTotalMinCount: 24,
    whiteBgRequired: true,
    transparentPngRequired: true
  },
  [ProductArchetype.fu_plaque_calendar]: {
    mainSquareMinCount: 0,
    mainVerticalMinCount: 0,
    mainMarketingTotalMinCount: 0,
    whiteBgRequired: false,
    transparentPngRequired: false
  },
  [ProductArchetype.tear_off_calendar]: {
    mainSquareMinCount: 0,
    mainVerticalMinCount: 0,
    mainMarketingTotalMinCount: 0,
    whiteBgRequired: false,
    transparentPngRequired: false
  },
  [ProductArchetype.gift_box_calendar]: {
    mainSquareMinCount: 0,
    mainVerticalMinCount: 0,
    mainMarketingTotalMinCount: 0,
    whiteBgRequired: false,
    transparentPngRequired: false
  },
  [ProductArchetype.unknown]: {
    mainSquareMinCount: 0,
    mainVerticalMinCount: 0,
    mainMarketingTotalMinCount: 0,
    whiteBgRequired: false,
    transparentPngRequired: false
  }
};
