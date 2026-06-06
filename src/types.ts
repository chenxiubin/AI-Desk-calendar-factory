export type ProductAssetRole =
  | "main_product"
  | "sku_product"
  | "front"
  | "left_3_4"
  | "right_3_4"
  | "top"
  | "side"
  | "back"
  | "package"
  | "combo"
  | "detail_part"
  | "mask"
  | "white_bg";

export interface ProductAsset {
  id: string;
  productId: string;
  assetType:
    | "front_cover"
    | "inner_page"
    | "side"
    | "detail_ring"
    | "detail_cover"
    | "detail_page"
    | "detail_base"
    | "ad_area"
    | "white_bg"
    | "transparent_png"
    | "mask";
  fileUrl: string;
  width: number;
  height: number;
  status: "pending" | "ready" | "failed";
  assetRole?: ProductAssetRole;
  viewType?: "front" | "left_3_4" | "right_3_4" | "top" | "side" | "back" | "detail";
  perspectiveType?: "front" | "left_3_4" | "right_3_4" | "top_45" | "detail";
  isPrimary?: boolean;
  qualityStatus?: "ready" | "need_adjustment" | "failed";
}

export interface Product {
  id: string;
  productCode: string;
  productName: string;
  productType: "calendar" | "wall_calendar" | "gift_box";
  seriesName: "喜庆精雕" | "新中式" | "商务定制" | "儿童插画" | "国潮年货";
  year: string;
  size: string;
  innerPageSize: string;
  adAreaSize: string;
  materialCover: string;
  materialInner: string;
  thickness: string;
  pageCount: number;
  packageType: string;
  weight: string;
  boxQuantity: number;
  assets: ProductAsset[];
  status: "raw" | "white_bg_done" | "png_done" | "completed" | "missing_assets";
  // Beautiful brand colors for mock renders
  themeColor: string;
  illustrationType: "dragon" | "landscape" | "minimalist" | "cartoon" | "calligraphy";
}

export interface TemplateSlot {
  id: string;
  slotId: string;
  slotName: string;
  assetType: string;
  x: number; // percentage coordinate 0-100
  y: number; // percentage coordinate 0-100
  maxWidth: number; // percentage of canvas width 0-100
  maxHeight: number; // percentage of canvas height 0-100
  anchor: "center" | "bottom_center";
  scaleMode: "contain" | "cover";
  lockAspectRatio: boolean;
  allowRotation: boolean;
  allowCrop: boolean;
  layer: number;
  shadowRule: string;
}

export interface TextField {
  id: string;
  fieldName: string;
  content: string;
  isDynamic: boolean;
  dataSource: string; // e.g. "productName", "productCode", "year", or custom text
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontFamily: string;
  fontSize: number; // absolute sizes, rendered scale-proportionally
  fontWeight: string;
  color: string;
  align: "left" | "center" | "right";
}

export interface TemplateBackground {
  type: "color" | "scene" | "gradient";
  color?: string;
  gradient?: string;
  sceneStyle?: "warm_light" | "beige_paper" | "studio_white" | "luxury_gold" | "festive_red";
}

export interface ExportSettings {
  format: "JPG" | "PNG" | "WebP";
  quality: number;
  width: number;
  height: number;
}

export type TemplateComponentType =
  | "scene_base"
  | "product_slot"
  | "text_overlay"
  | "decor_overlay"
  | "logo_overlay";

export interface TemplateComponent {
  id: string;
  name: string;
  type: TemplateComponentType;
  imageUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  visible: boolean;
  sendToRunningHub: boolean;
  lockAspectRatio?: boolean;
  scaleMode?: "contain" | "cover";
  allowRotation?: boolean;
  defaultRotation?: number;
  anchor?: "center" | "bottom_center";
}

export interface Template {
  id: string;
  templateName: string;
  templateType: "main" | "sku" | "detail" | "white_bg" | "ad_custom" | "parameter";
  productType: "calendar" | "wall_calendar" | "gift_box";
  aspectRatio: "1:1" | "3:4" | "16:9" | "custom";
  outputWidth: number;
  outputHeight: number;
  background: TemplateBackground;
  slots: TemplateSlot[];
  textFields: TextField[];
  components?: TemplateComponent[];
  exportSettings: ExportSettings;
  status: "draft" | "enabled" | "disabled";
}

export interface GenerationTask {
  id: string;
  taskName: string;
  productIds: string[];
  templateIds: string[];
  totalCount: number;
  completedCount: number;
  failedCount: number;
  pendingReviewCount: number;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
  progress: number; // 0 to 100
}

export interface GeneratedImage {
  id: string;
  productId: string;
  templateId: string;
  imageType: "main" | "sku" | "detail" | "white_bg" | "ad_custom" | "parameter";
  fileUrl: string; // fallback raw image/synthetic element
  width: number;
  height: number;
  reviewStatus: "pending" | "approved" | "rejected" | "needs_adjustment";
  qualityIssues: string[];
  createdAt: string;
  // Synthetic style overrides or offset values for manual adjustment
  horizontalOffset?: number;
  verticalOffset?: number;
  scaleFactor?: number;
  // RunningHub AI Fusion extensions - Updated for Multi-Layer Compound Rendering
  aiFusionBaseUrl?: string;
  aiFusionUrl?: string;
  finalCompositeUrl?: string;
  aiFusionTaskId?: string;
  aiFusionStatus?: "none" | "queued" | "running" | "completed" | "failed";
  aiFusionError?: string;
  aiFusionWorkflowId?: string;
}

export interface RunningHubWorkflowConfig {
  id: string;
  name: string;
  workflowId: string;
  apiMode?: "comfyui_openapi" | "run_workflow_v2";
  modelType: "flux_kontext" | "qwen_fusion_lora" | "qwen_image_edit";
  baseImageNodeId: string;
  baseImageFieldName?: string;
  maskNodeId?: string;
  promptNodeId: string;
  promptFieldName?: string;
  negativePromptNodeId?: string;
  negativePromptFieldName?: string;
  seedNodeId?: string;
  seedFieldName?: string;
  denoiseNodeId?: string;
  denoiseFieldName?: string;
  stepsNodeId?: string;
  stepsFieldName?: string;
  cfgNodeId?: string;
  cfgFieldName?: string;
  outputNodeId?: string;
  defaultPrompt: string;
  defaultNegativePrompt: string;
  defaultDenoise: number;
  defaultSteps?: number;
  defaultCfg?: number;
  enabled: boolean;
}

export interface RunningHubTaskState {
  taskId: string;
  status: "idle" | "uploading" | "queued" | "running" | "completed" | "failed";
  progress?: number;
  errorMessage?: string;
  outputUrl?: string;
}

export type TemplatePageType =
  | "main"
  | "sku"
  | "detail"
  | "package"
  | "size_material"
  | "scene"
  | "detail_closeup"
  | "parameter";

export interface TemplatePage {
  id: string;
  pageName: string;
  pageType: TemplatePageType;
  templateId: string;
  order: number;
  requiredAssetRoles: string[];
  enabled: boolean;
}

export interface TemplateSuite {
  id: string;
  suiteName: string;
  styleName: string;
  category: "new_chinese" | "business" | "festive_red" | "minimal" | "gift" | "children" | "custom";
  productType: "calendar" | "wall_calendar" | "gift_box";
  coverImage?: string;
  pages: TemplatePage[];
  globalStyle: {
    colorPalette: string[];
    fontStyle: string;
    sceneStyle: string;
    lightDirection: string;
    description?: string;
  };
  status: "draft" | "enabled" | "disabled";
}

export interface ProductAssetPack {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  assets: ProductAsset[];
  analysis?: {
    hasPackage: boolean;
    hasCombo: boolean;
    hasDetail: boolean;
    dominantColor?: string;
    recommendedStyle?: string;
    missingAssetRoles?: ProductAssetRole[];
  };
  status: "incomplete" | "ready" | "needs_adjustment";
}

export type PageLayerType =
  | "scene_base"
  | "product"
  | "text_overlay"
  | "decor_overlay"
  | "logo_overlay"
  | "custom_asset";

export interface PageLayerInstance {
  id: string;
  pageId: string;
  sourceComponentId?: string;
  layerType: PageLayerType;
  assetId?: string;
  imageUrl?: string;
  name: string;
  x: number; // percentage coordinate 0-100
  y: number; // percentage coordinate 0-100
  width: number; // percentage width 0-100
  height: number; // percentage height 0-100
  rotation: number; // degrees 0-360
  zIndex: number;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  anchor: "center" | "bottom_center";
  scaleMode?: "contain" | "cover";
  lockAspectRatio: boolean;
  sendToRunningHub: boolean;
}

export interface GeneratedPage {
  id: string;
  projectId: string;
  templateSuiteId: string;
  templatePageId: string;
  templateId: string;
  pageType: TemplatePageType;
  productId: string;
  assignedAssetIds: string[];
  layers?: PageLayerInstance[];
  fileUrl?: string;
  aiFusionBaseUrl?: string;
  aiFusionUrl?: string;
  finalCompositeUrl?: string;
  status:
    | "draft"
    | "base_ready"
    | "fusion_ready"
    | "final_ready"
    | "approved"
    | "rejected"
    | "needs_adjustment";
  reviewNote?: string;
  order: number;
}

export interface GenerationProject {
  id: string;
  projectName: string;
  productAssetPackId: string;
  templateSuiteId: string;
  pages: GeneratedPage[];
  status:
    | "asset_preparing"
    | "template_matched"
    | "layout_ready"
    | "fusion_running"
    | "reviewing"
    | "partially_rejected"
    | "approved"
    | "exported";
  createdAt: string;
  updatedAt: string;
}
