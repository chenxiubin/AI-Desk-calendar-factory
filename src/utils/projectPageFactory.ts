import {
  GeneratedPage,
  TemplatePage,
  TemplateSuite,
  ProductAssetPack,
  Template,
  TemplatePageType,
  ProductAsset,
  ProductAssetRole
} from "../types";
import { ExportFolderKey, PageRole, BusinessRatioType } from "../domain/calendarTaxonomy";

interface CreateGeneratedPagesFromSuiteParams {
  projectId: string;
  suite: TemplateSuite;
  productPack: ProductAssetPack;
  templates: Template[];
}

// Helper to match product assets based on preferred roles.
function matchAssetsForRoleOrFolder(
  outputFolder: string,
  pageType: string,
  assets: ProductAsset[]
): string[] {
  if (!assets || assets.length === 0) return [];

  let preferredRoles: ProductAssetRole[] = [];
  if (outputFolder === "main_square" || outputFolder === "main_vertical" || pageType === "main") {
    preferredRoles = [
      "main_product",
      "transparent_png",
      "primary_main_square",
      "primary_main_vertical",
      "front",
      "sku_product"
    ];
  } else if (outputFolder === "sku" || pageType === "sku") {
    preferredRoles = ["sku_product", "transparent_png", "front"];
  } else if (outputFolder === "detail" || pageType === "detail") {
    preferredRoles = ["detail_part", "package", "combo", "white_bg", "transparent_png"];
  } else {
    preferredRoles = ["front", "sku_product", "main_product"];
  }

  for (const role of preferredRoles) {
    const found = assets.find((a) => a.assetRole === role);
    if (found) return [found.id];
  }

  // Fallback by assetType
  for (const role of preferredRoles) {
    const found = assets.find((a) => a.assetType === role);
    if (found) return [found.id];
  }

  const anyAsset = assets[0];
  return anyAsset ? [anyAsset.id] : [];
}

// Selection of templateId for padded pages.
function findTemplateId(
  outputFolder: string,
  ratioType: "square" | "vertical",
  suitePages: TemplatePage[],
  templates: Template[]
): string {
  // 1. 优先使用 suite.pages 中同 outputFolder 的 templateId
  const matchingSuitePage = suitePages.find((p) => p.outputFolder === outputFolder && p.templateId);
  if (matchingSuitePage && matchingSuitePage.templateId) {
    return matchingSuitePage.templateId;
  }

  // 2. 其次从 templates 中找比例匹配的模板
  const expectedRatio = ratioType === "square" ? "1:1" : "3:4";
  const matchedTemplate = templates.find((t) => t.aspectRatio === expectedRatio);
  if (matchedTemplate) {
    return matchedTemplate.id;
  }

  // 3. 如果找不到，使用任意可用模板兜底
  if (templates.length > 0) {
    return templates[0].id;
  }

  // 4. 如果完全没有模板，返回空字符串
  return "";
}

const isMainSquarePage = (page: any, suitePages: TemplatePage[]) => {
  const matchingTp = suitePages.find((tp) => tp.id === page.templatePageId);
  const outputFolder = page.outputFolder || matchingTp?.outputFolder || "";
  const pageRole = page.pageRole || matchingTp?.pageRole || "";
  const businessRatioType = page.businessRatioType || matchingTp?.businessRatioType || "";
  const isMainGroup = outputFolder === "main_square" || outputFolder === "main_vertical";
  return (
    outputFolder === "main_square" ||
    pageRole === "primary_main_square" ||
    pageRole === "main_marketing_square" ||
    (businessRatioType === "square" && isMainGroup)
  );
};

const isMainVerticalPage = (page: any, suitePages: TemplatePage[]) => {
  const matchingTp = suitePages.find((tp) => tp.id === page.templatePageId);
  const outputFolder = page.outputFolder || matchingTp?.outputFolder || "";
  const pageRole = page.pageRole || matchingTp?.pageRole || "";
  const businessRatioType = page.businessRatioType || matchingTp?.businessRatioType || "";
  const isMainGroup = outputFolder === "main_square" || outputFolder === "main_vertical";
  return (
    outputFolder === "main_vertical" ||
    pageRole === "primary_main_vertical" ||
    pageRole === "main_marketing_vertical" ||
    (businessRatioType === "vertical" && isMainGroup)
  );
};

export function createGeneratedPagesFromSuite(
  params: CreateGeneratedPagesFromSuiteParams
): GeneratedPage[] {
  const { projectId, suite, productPack, templates } = params;
  const generatedPages: GeneratedPage[] = [];

  // --- 1. 把 suite.pages 中已有 TemplatePage 转为 GeneratedPage ---
  suite.pages.forEach((page, index) => {
    const assignedIds = matchAssetsForRoleOrFolder(page.outputFolder || "", page.pageType, productPack.assets);
    generatedPages.push({
      id: `gp_${Date.now()}_original_${index}`,
      projectId,
      templateSuiteId: suite.id,
      templatePageId: page.id,
      templateId: page.templateId,
      pageType: page.pageType,
      productId: productPack.productId,
      assignedAssetIds: assignedIds,
      status: assignedIds.length > 0 ? "base_ready" : "needs_adjustment",
      order: page.order,
      // Pass dynamic metadata fields directly to keep information rich
      pageName: page.pageName,
      pageRole: page.pageRole,
      businessRatioType: page.businessRatioType,
      actualAspectRatio: page.actualAspectRatio,
      isDeliverable: page.isDeliverable,
      isRunningHubRecommended: page.isRunningHubRecommended,
      isCanvasOnly: page.isCanvasOnly,
      outputFolder: page.outputFolder
    });
  });

  // --- 2. 补齐方形主图 (1:1 主图卖点图) ---
  const expectedSquare = suite.expectedSliceCounts?.mainSquareMinCount || 0;
  const existingSquareCount = generatedPages.filter((p) => isMainSquarePage(p, suite.pages)).length;

  if (existingSquareCount < expectedSquare) {
    const targetToPad = expectedSquare - existingSquareCount;
    let added = 0;
    for (let i = 1; i <= expectedSquare; i++) {
      if (added >= targetToPad) break;
      const targetName = `1:1主图卖点图_${String(i).padStart(2, "0")}`;

      // Check if a page has that exact targetName to avoid name collision
      const nameExists = generatedPages.some((p) => p.pageName === targetName);
      if (!nameExists) {
        const assignedIds = matchAssetsForRoleOrFolder("main_square", "main", productPack.assets);
        const templId = findTemplateId("main_square", "square", suite.pages, templates);

        generatedPages.push({
          id: `gp_pad_square_${Date.now()}_${i}`,
          projectId,
          templateSuiteId: suite.id,
          templatePageId: `tp_pad_square_${i}`,
          templateId: templId,
          pageType: "main",
          productId: productPack.productId,
          assignedAssetIds: assignedIds,
          status: templId ? (assignedIds.length > 0 ? "base_ready" : "needs_adjustment") : "needs_adjustment",
          order: 100 + i,
          pageName: targetName,
          pageRole: "main_marketing_square",
          businessRatioType: "square",
          actualAspectRatio: "1:1",
          outputFolder: "main_square",
          isDeliverable: true,
          isRunningHubRecommended: true,
          isCanvasOnly: false,
          reviewNote: templId ? "根据套系最低交付规则自动补齐" : "缺少匹配模板"
        });
        added++;
      }
    }
  }

  // --- 3. 补齐竖版主图 (3:4 主图卖点图) ---
  const expectedVertical = suite.expectedSliceCounts?.mainVerticalMinCount || 0;
  const existingVerticalCount = generatedPages.filter((p) => isMainVerticalPage(p, suite.pages)).length;

  if (existingVerticalCount < expectedVertical) {
    const targetToPad = expectedVertical - existingVerticalCount;
    let added = 0;
    for (let i = 1; i <= expectedVertical; i++) {
      if (added >= targetToPad) break;
      const targetName = `3:4主图卖点图_${String(i).padStart(2, "0")}`;

      const nameExists = generatedPages.some((p) => p.pageName === targetName);
      if (!nameExists) {
        const assignedIds = matchAssetsForRoleOrFolder("main_vertical", "main", productPack.assets);
        const templId = findTemplateId("main_vertical", "vertical", suite.pages, templates);

        generatedPages.push({
          id: `gp_pad_vertical_${Date.now()}_${i}`,
          projectId,
          templateSuiteId: suite.id,
          templatePageId: `tp_pad_vertical_${i}`,
          templateId: templId,
          pageType: "main",
          productId: productPack.productId,
          assignedAssetIds: assignedIds,
          status: templId ? (assignedIds.length > 0 ? "base_ready" : "needs_adjustment") : "needs_adjustment",
          order: 200 + i,
          pageName: targetName,
          pageRole: "main_marketing_vertical",
          businessRatioType: "vertical",
          actualAspectRatio: "3:4",
          outputFolder: "main_vertical",
          isDeliverable: true,
          isRunningHubRecommended: true,
          isCanvasOnly: false,
          reviewNote: templId ? "根据套系最低交付规则自动补齐" : "缺少匹配模板"
        });
        added++;
      }
    }
  }

  // --- 4. white_bg 正式交付页 ---
  const hasWhiteBg = generatedPages.some(
    (p) => p.pageRole === "white_bg" || p.outputFolder === "white_bg"
  );
  if (suite.expectedSliceCounts?.whiteBgRequired && !hasWhiteBg) {
    const matchingAsset = productPack.assets.find(
      (as) => as.assetRole === "white_bg" || as.assetType === "white_bg"
    );

    generatedPages.push({
      id: `gp_pad_white_bg_${Date.now()}`,
      projectId,
      templateSuiteId: suite.id,
      templatePageId: `tp_pad_white_bg`,
      templateId: "",
      pageType: "white_bg",
      productId: productPack.productId,
      assignedAssetIds: matchingAsset ? [matchingAsset.id] : [],
      status: matchingAsset ? "final_ready" : "needs_adjustment",
      fileUrl: matchingAsset?.fileUrl || "",
      order: 300,
      pageName: "白底精修图",
      pageRole: "white_bg",
      outputFolder: "white_bg",
      businessRatioType: "square",
      actualAspectRatio: "1:1",
      isDeliverable: true,
      isRunningHubRecommended: false,
      isCanvasOnly: true,
      reviewNote: matchingAsset ? "根据套系最低交付规则自动补齐" : "缺少白底精修交付资产"
    });
  }

  // --- 5. transparent_png 正式交付页 ---
  const hasTransparentPng = generatedPages.some(
    (p) => p.pageRole === "transparent_png" || p.outputFolder === "transparent_png"
  );
  if (suite.expectedSliceCounts?.transparentPngRequired && !hasTransparentPng) {
    const matchingAsset = productPack.assets.find(
      (as) => as.assetRole === "transparent_png" || as.assetType === "transparent_png"
    );

    generatedPages.push({
      id: `gp_pad_transparent_png_${Date.now()}`,
      projectId,
      templateSuiteId: suite.id,
      templatePageId: `tp_pad_transparent_png`,
      templateId: "",
      pageType: "transparent_png",
      productId: productPack.productId,
      assignedAssetIds: matchingAsset ? [matchingAsset.id] : [],
      status: matchingAsset ? "final_ready" : "needs_adjustment",
      fileUrl: matchingAsset?.fileUrl || "",
      order: 400,
      pageName: "透明PNG",
      pageRole: "transparent_png",
      outputFolder: "transparent_png",
      businessRatioType: "square",
      actualAspectRatio: "1:1",
      isDeliverable: true,
      isRunningHubRecommended: false,
      isCanvasOnly: true,
      reviewNote: matchingAsset ? "根据套系最低交付规则自动补齐" : "缺少透明PNG交付资产"
    });
  }

  // 按最终顺序排序
  return generatedPages.sort((a, b) => a.order - b.order);
}
