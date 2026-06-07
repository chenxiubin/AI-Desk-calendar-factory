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
  GeneratedPage
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
 * 校验套系完整度
 */
export function getSuiteDeliveryCompleteness(
  suite: TemplateSuite,
  pages: GeneratedPage[]
) {
  const expected = suite.expectedSliceCounts || {};
  const mainSquareRequired = expected.mainSquareMinCount || 0;
  const mainVerticalRequired = expected.mainVerticalMinCount || 0;
  const mainMarketingTotalRequired = expected.mainMarketingTotalMinCount || 0;
  const whiteBgRequired = !!expected.whiteBgRequired;
  const transparentPngRequired = !!expected.transparentPngRequired;

  // 统计方形主图数量
  let mainSquareCurrent = 0;
  let mainVerticalCurrent = 0;
  let hasWhiteBg = false;
  let hasTransparentPng = false;

  pages.forEach((page) => {
    const matchingTp = suite.pages.find((tp) => tp.id === page.templatePageId);
    const outputFolder = matchingTp?.outputFolder;
    const pageRole = matchingTp?.pageRole;
    const businessRatioType = matchingTp?.businessRatioType;

    const isMainSquare = (outputFolder as string) === (ExportFolderKey.main_square as string);
    const isMainVertical = (outputFolder as string) === (ExportFolderKey.main_vertical as string);

    // 方形主图统计
    if (
      isMainSquare ||
      pageRole === PageRole.primary_main_square ||
      pageRole === PageRole.main_marketing_square ||
      (businessRatioType === BusinessRatioType.square && (isMainSquare || isMainVertical))
    ) {
      mainSquareCurrent++;
    }

    // 竖版主图统计
    if (
      isMainVertical ||
      pageRole === PageRole.primary_main_vertical ||
      pageRole === PageRole.main_marketing_vertical ||
      (businessRatioType === BusinessRatioType.vertical && (isMainSquare || isMainVertical))
    ) {
      mainVerticalCurrent++;
    }

    // 白底精修统计
    if (outputFolder === ExportFolderKey.white_bg || pageRole === PageRole.white_bg) {
      hasWhiteBg = true;
    }

    // 透明底统计
    if (outputFolder === ExportFolderKey.transparent_png || pageRole === PageRole.transparent_png) {
      hasTransparentPng = true;
    }
  });

  const mainMarketingTotalCurrent = mainSquareCurrent + mainVerticalCurrent;

  const mainSquareMissing = Math.max(0, mainSquareRequired - mainSquareCurrent);
  const mainVerticalMissing = Math.max(0, mainVerticalRequired - mainVerticalCurrent);
  const mainMarketingTotalMissing = Math.max(0, mainMarketingTotalRequired - mainMarketingTotalCurrent);

  const missingWhiteBg = whiteBgRequired && !hasWhiteBg;
  const missingTransparentPng = transparentPngRequired && !hasTransparentPng;

  const isComplete =
    mainSquareMissing === 0 &&
    mainVerticalMissing === 0 &&
    mainMarketingTotalMissing === 0 &&
    !missingWhiteBg &&
    !missingTransparentPng;

  const warnings: string[] = [];
  if (mainSquareMissing > 0) {
    warnings.push(`缺少 1:1 主图卖点图 ${mainSquareMissing} 张`);
  }
  if (mainVerticalMissing > 0) {
    warnings.push(`缺少 3:4 主图卖点图 ${mainVerticalMissing} 张`);
  }
  if (mainMarketingTotalMissing > 0) {
    warnings.push(`主图卖点图合计不足，还差 ${mainMarketingTotalMissing} 张`);
  }
  if (missingWhiteBg) {
    warnings.push(`缺少白底精修交付图`);
  }
  if (missingTransparentPng) {
    warnings.push(`缺少透明PNG交付图`);
  }

  return {
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
    hasWhiteBg,
    whiteBgMissing: missingWhiteBg,

    transparentPngRequired,
    hasTransparentPng,
    transparentPngMissing: missingTransparentPng,

    isComplete,
    warnings
  };
}
