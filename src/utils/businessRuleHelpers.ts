import {
  ExportFolderKey,
  EXPORT_FOLDER_NAMES,
  ProductArchetype,
  PageRole,
  BusinessRatioType
} from "../domain/calendarTaxonomy";
import {
  TemplateSuite,
  TemplatePage,
  GeneratedPage,
  ProductAssetPack
} from "../types";

/**
 * 获取导出文件夹的中文名称
 */
export function getExportFolderName(folderKey: string | ExportFolderKey): string {
  if (folderKey === "unclassified" || folderKey === "未分类") {
    return "未分类";
  }
  if (folderKey in EXPORT_FOLDER_NAMES) {
    return EXPORT_FOLDER_NAMES[folderKey as ExportFolderKey];
  }
  return "未分类";
}

/**
 * 根据页面角色、导出目录或分类等信息，推断该页面的交付类型 (输出对应的 ExportFolderKey)
 */
export function getPageExportFolder(
  page: GeneratedPage | TemplatePage,
  suite?: TemplateSuite | null
): ExportFolderKey | "unclassified" {
  let outputFolder: ExportFolderKey | undefined = undefined;
  let pageRole: PageRole | undefined = undefined;
  let pageType: string | undefined = undefined;

  if ("templatePageId" in page) {
    // GeneratedPage
    pageType = page.pageType;
    if (suite) {
      const tp = suite.pages.find((item) => item.id === page.templatePageId);
      if (tp) {
        outputFolder = tp.outputFolder;
        pageRole = tp.pageRole;
      }
    }
  } else {
    // TemplatePage
    outputFolder = page.outputFolder;
    pageRole = page.pageRole;
    pageType = page.pageType;
  }

  if (outputFolder) return outputFolder;

  // 根据 PageRole 后备映射
  if (pageRole) {
    if (pageRole === PageRole.primary_main_square || pageRole === PageRole.main_marketing_square) {
      return ExportFolderKey.main_square;
    }
    if (pageRole === PageRole.primary_main_vertical || pageRole === PageRole.main_marketing_vertical) {
      return ExportFolderKey.main_vertical;
    }
    if (
      pageRole === PageRole.sku_variant ||
      pageRole === PageRole.sku_with_label ||
      pageRole === PageRole.sku_grid
    ) {
      return ExportFolderKey.sku;
    }
    if (pageRole === PageRole.white_bg) {
      return ExportFolderKey.white_bg;
    }
    if (pageRole === PageRole.transparent_png) {
      return ExportFolderKey.transparent_png;
    }
    if (pageRole === PageRole.sample_book_mockup) {
      return ExportFolderKey.sample_book;
    }
    if (pageRole === PageRole.customization_detail) {
      return ExportFolderKey.customization_detail;
    }
    if (pageRole === PageRole.ad_custom_effect) {
      return ExportFolderKey.ad_custom_effect;
    }
  }

  // 根据 pageType 后备映射
  if (pageType) {
    if (pageType === "main") return ExportFolderKey.main_square;
    if (pageType === "sku") return ExportFolderKey.sku;
    if (
      pageType === "detail" ||
      pageType === "scene" ||
      pageType === "detail_closeup" ||
      pageType === "package"
    ) {
      return ExportFolderKey.detail;
    }
    if (pageType === "white_bg") return ExportFolderKey.white_bg;
    if (pageType === "transparent_png") return ExportFolderKey.transparent_png;
  }

  return "unclassified" as any;
}

/**
 * 将页面按导出文件夹顺序进行分组
 */
export function groupPagesByExportFolder<T extends GeneratedPage | TemplatePage>(
  pages: T[],
  suite?: TemplateSuite | null
) {
  const folderOrder: (ExportFolderKey | "unclassified")[] = [
    ExportFolderKey.main_square,
    ExportFolderKey.main_vertical,
    ExportFolderKey.sku,
    ExportFolderKey.detail,
    ExportFolderKey.sample_book,
    ExportFolderKey.customization_detail,
    ExportFolderKey.ad_custom_effect,
    ExportFolderKey.white_bg,
    ExportFolderKey.transparent_png,
    "unclassified" as any
  ];

  const groups: Record<string, T[]> = {};
  folderOrder.forEach((key) => {
    groups[key] = [];
  });

  pages.forEach((page) => {
    const folder = getPageExportFolder(page, suite);
    if (groups[folder]) {
      groups[folder].push(page);
    } else {
      if (!groups["unclassified"]) {
        groups["unclassified"] = [];
      }
      groups["unclassified"].push(page);
    }
  });

  return folderOrder
    .map((key) => ({
      folderKey: key,
      folderName: getExportFolderName(key),
      pagesList: groups[key] || []
    }))
    .filter((g) => g.pagesList.length > 0);
}

/**
 * 校验套系完整度 (包含页面规划和成品交付双层结构)
 */
export function getSuiteDeliveryCompleteness(
  suite: TemplateSuite,
  pages: GeneratedPage[],
  productAssetPack?: ProductAssetPack | null
) {
  const expected = suite.expectedSliceCounts || {};
  const mainSquareRequired = expected.mainSquareMinCount || 0;
  const mainVerticalRequired = expected.mainVerticalMinCount || 0;
  const mainMarketingTotalRequired = expected.mainMarketingTotalMinCount || 0;
  const whiteBgRequired = !!expected.whiteBgRequired;
  const transparentPngRequired = !!expected.transparentPngRequired;

  // --- 1. 页面规划层面的统计 ---
  let mainSquareCurrent = 0;
  let mainVerticalCurrent = 0;
  let hasWhiteBgPlan = false;
  let hasTransparentPngPlan = false;

  // 检查产品资产包中的交付物规划
  if (productAssetPack?.assets) {
    productAssetPack.assets.forEach((asset) => {
      const assetRole = (asset as any).assetRole;
      const assetType = asset.assetType;
      if (assetRole === "white_bg" || assetType === "white_bg") {
        hasWhiteBgPlan = true;
      }
      if (assetRole === "transparent_png" || assetType === "transparent_png") {
        hasTransparentPngPlan = true;
      }
    });
  }

  pages.forEach((page) => {
    const matchingTp = suite.pages.find((tp) => tp.id === page.templatePageId);
    const pageAny = page as any;
    
    // 优先读取页面本身的字段，其次才后备读取预设模板页面
    const outputFolder = pageAny.outputFolder || matchingTp?.outputFolder;
    const pageRole = pageAny.pageRole || matchingTp?.pageRole;
    const businessRatioType = pageAny.businessRatioType || matchingTp?.businessRatioType;

    const isMainSquare = outputFolder === "main_square";
    const isMainVertical = outputFolder === "main_vertical";
    const isMainGroup = isMainSquare || isMainVertical;

    // 方形主图规划统计
    if (
      outputFolder === "main_square" ||
      pageRole === "primary_main_square" ||
      pageRole === "main_marketing_square" ||
      (businessRatioType === "square" && isMainGroup)
    ) {
      mainSquareCurrent++;
    }

    // 竖版主图规划统计
    if (
      outputFolder === "main_vertical" ||
      pageRole === "primary_main_vertical" ||
      pageRole === "main_marketing_vertical" ||
      (businessRatioType === "vertical" && isMainGroup)
    ) {
      mainVerticalCurrent++;
    }

    // 白底精修规划统计
    if (outputFolder === "white_bg" || pageRole === "white_bg") {
      hasWhiteBgPlan = true;
    }

    // 透明底规划统计
    if (outputFolder === "transparent_png" || pageRole === "transparent_png") {
      hasTransparentPngPlan = true;
    }
  });

  const mainMarketingTotalCurrent = mainSquareCurrent + mainVerticalCurrent;
  const mainSquareMissing = Math.max(0, mainSquareRequired - mainSquareCurrent);
  const mainVerticalMissing = Math.max(0, mainVerticalRequired - mainVerticalCurrent);
  const mainMarketingTotalMissing = Math.max(0, mainMarketingTotalRequired - mainMarketingTotalCurrent);

  const isPlanningComplete =
    mainSquareMissing === 0 &&
    mainVerticalMissing === 0 &&
    mainMarketingTotalMissing === 0 &&
    (!whiteBgRequired || hasWhiteBgPlan) &&
    (!transparentPngRequired || hasTransparentPngPlan);

  const planningWarnings: string[] = [];
  if (mainSquareMissing > 0) {
    planningWarnings.push(`页面规划缺少 1:1 主图卖点图 ${mainSquareMissing} 张`);
  }
  if (mainVerticalMissing > 0) {
    planningWarnings.push(`页面规划缺少 3:4 主图卖点图 ${mainVerticalMissing} 张`);
  }
  if (mainMarketingTotalMissing > 0) {
    planningWarnings.push(`页面规划主图卖点图合计不足，还差 ${mainMarketingTotalMissing} 张`);
  }
  if (whiteBgRequired && !hasWhiteBgPlan) {
    planningWarnings.push(`页面规划缺少白底精修交付项`);
  }
  if (transparentPngRequired && !hasTransparentPngPlan) {
    planningWarnings.push(`页面规划缺少透明PNG交付项`);
  }


  // --- 2. 成品输出层面的统计 ---
  let mainSquareOutputCurrent = 0;
  let mainVerticalOutputCurrent = 0;
  let hasWhiteBgOutput = false;
  let hasTransparentPngOutput = false;

  // 1. 检查页面自身成品
  pages.forEach((page) => {
    const hasOutput = Boolean(page.finalCompositeUrl || page.aiFusionUrl || page.fileUrl);
    if (!hasOutput) return;

    const matchingTp = suite.pages.find((tp) => tp.id === page.templatePageId);
    const pageAny = page as any;
    const outputFolder = pageAny.outputFolder || matchingTp?.outputFolder;
    const pageRole = pageAny.pageRole || matchingTp?.pageRole;
    const businessRatioType = pageAny.businessRatioType || matchingTp?.businessRatioType;

    const isMainSquare = outputFolder === "main_square";
    const isMainVertical = outputFolder === "main_vertical";
    const isMainGroup = isMainSquare || isMainVertical;

    // 方形主图成品统计
    if (
      outputFolder === "main_square" ||
      pageRole === "primary_main_square" ||
      pageRole === "main_marketing_square" ||
      (businessRatioType === "square" && isMainGroup)
    ) {
      mainSquareOutputCurrent++;
    }

    // 竖版主图成品统计
    if (
      outputFolder === "main_vertical" ||
      pageRole === "primary_main_vertical" ||
      pageRole === "main_marketing_vertical" ||
      (businessRatioType === "vertical" && isMainGroup)
    ) {
      mainVerticalOutputCurrent++;
    }

    // 白底精修成品统计
    if (outputFolder === "white_bg" || pageRole === "white_bg") {
      hasWhiteBgOutput = true;
    }

    // 透明底成品统计
    if (outputFolder === "transparent_png" || pageRole === "transparent_png") {
      hasTransparentPngOutput = true;
    }
  });

  // 2. 检查产品资产包中的成品
  if (productAssetPack?.assets) {
    productAssetPack.assets.forEach((asset) => {
      const assetRole = (asset as any).assetRole;
      const assetType = asset.assetType;
      const hasUrl = Boolean(asset.fileUrl);
      if (hasUrl) {
        if (assetRole === "white_bg" || assetType === "white_bg") {
          hasWhiteBgOutput = true;
        }
        if (assetRole === "transparent_png" || assetType === "transparent_png") {
          hasTransparentPngOutput = true;
        }
      }
    });
  }

  const mainMarketingOutputCurrent = mainSquareOutputCurrent + mainVerticalOutputCurrent;
  const mainSquareOutputMissing = Math.max(0, mainSquareRequired - mainSquareOutputCurrent);
  const mainVerticalOutputMissing = Math.max(0, mainVerticalRequired - mainVerticalOutputCurrent);
  const mainMarketingOutputMissing = Math.max(0, mainMarketingTotalRequired - mainMarketingOutputCurrent);

  const isOutputComplete =
    mainSquareOutputMissing === 0 &&
    mainVerticalOutputMissing === 0 &&
    mainMarketingOutputMissing === 0 &&
    (!whiteBgRequired || hasWhiteBgOutput) &&
    (!transparentPngRequired || hasTransparentPngOutput);

  const outputWarnings: string[] = [];
  if (mainSquareOutputMissing > 0) {
    outputWarnings.push(`成品缺少 1:1 主图卖点图 ${mainSquareOutputMissing} 张`);
  }
  if (mainVerticalOutputMissing > 0) {
    outputWarnings.push(`成品缺少 3:4 主图卖点图 ${mainVerticalOutputMissing} 张`);
  }
  if (mainMarketingOutputMissing > 0) {
    outputWarnings.push(`成品主图卖点图合计不足，还差 ${mainMarketingOutputMissing} 张`);
  }
  if (whiteBgRequired && !hasWhiteBgOutput) {
    outputWarnings.push(`成品缺少白底精修图`);
  }
  if (transparentPngRequired && !hasTransparentPngOutput) {
    outputWarnings.push(`成品缺少透明PNG图`);
  }

  return {
    planning: {
      mainSquareRequired,
      mainSquareCurrent,
      mainSquareMissing,

      mainVerticalRequired,
      mainVerticalCurrent,
      mainVerticalMissing,

      mainMarketingTotalRequired,
      mainMarketingTotalCurrent,
      mainMarketingTotalMissing,

      whiteBgRequired,
      hasWhiteBgPlan,

      transparentPngRequired,
      hasTransparentPngPlan,

      isPlanningComplete,
      warnings: planningWarnings
    },
    output: {
      mainSquareRequired,
      mainSquareOutputCurrent,
      mainSquareOutputMissing,

      mainVerticalRequired,
      mainVerticalOutputCurrent,
      mainVerticalOutputMissing,

      mainMarketingTotalRequired,
      mainMarketingOutputCurrent,
      mainMarketingOutputMissing,

      whiteBgRequired,
      hasWhiteBgOutput,

      transparentPngRequired,
      hasTransparentPngOutput,

      isOutputComplete,
      warnings: outputWarnings
    }
  };
}
