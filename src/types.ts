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

export interface TemplateComponent {
  id: string;
  name: string;
  type: "scene_base" | "product_slot" | "text_overlay" | "decor_overlay" | "logo_overlay";
  imageUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  visible: boolean;
  sendToRunningHub: boolean;
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
  // RunningHub AI Fusion extensions
  aiFusionUrl?: string;
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
