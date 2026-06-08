import { Product, Template, TemplateSlot, TextField, RunningHubWorkflowConfig, TemplateSuite, ProductAssetPack, ProductAsset, ProductAssetRole, ProductArchetype, BusinessRatioType, PageRole, ExportFolderKey } from "./types";

// Seed 8 realistic, beautifully distinct products representing our 300+ portfolio
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod_060",
    productCode: "060",
    productName: "策马奔腾",
    productType: "calendar",
    seriesName: "国潮年货",
    year: "2026",
    size: "240mm * 170mm * 80mm",
    innerPageSize: "240mm * 150mm",
    adAreaSize: "240mm * 35mm",
    materialCover: "250g 珠光特种艺术纸",
    materialInner: "200g 哑光进口超感纸",
    thickness: "14张 (28页)",
    pageCount: 14,
    packageType: "红色加厚独立提手礼盒",
    weight: "0.45kg",
    boxQuantity: 40,
    status: "completed",
    themeColor: "#DC2626", // rich red
    illustrationType: "calligraphy",
    assets: [
      { id: "ast_060_cover", productId: "prod_060", assetType: "front_cover", fileUrl: "front", width: 800, height: 600, status: "ready" },
      { id: "ast_060_inner", productId: "prod_060", assetType: "inner_page", fileUrl: "inner", width: 800, height: 600, status: "ready" },
      { id: "ast_060_side", productId: "prod_060", assetType: "side", fileUrl: "side", width: 800, height: 600, status: "ready" },
      { id: "ast_060_detail_ring", productId: "prod_060", assetType: "detail_ring", fileUrl: "ring", width: 800, height: 600, status: "ready" },
      { id: "ast_060_detail_cover", productId: "prod_060", assetType: "detail_cover", fileUrl: "det_cov", width: 800, height: 600, status: "ready" },
      { id: "ast_060_detail_page", productId: "prod_060", assetType: "detail_page", fileUrl: "det_pg", width: 800, height: 600, status: "ready" },
      { id: "ast_060_detail_base", productId: "prod_060", assetType: "detail_base", fileUrl: "det_base", width: 800, height: 600, status: "ready" },
      { id: "ast_060_ad", productId: "prod_060", assetType: "ad_area", fileUrl: "ad", width: 800, height: 300, status: "ready" },
      { id: "ast_060_png", productId: "prod_060", assetType: "transparent_png", fileUrl: "png", width: 1000, height: 1000, status: "ready" },
      { id: "ast_060_mask", productId: "prod_060", assetType: "mask", fileUrl: "mask", width: 1000, height: 1000, status: "ready" }
    ]
  },
  {
    id: "prod_061",
    productCode: "061",
    productName: "马到成功",
    productType: "calendar",
    seriesName: "商务定制",
    year: "2026",
    size: "220mm * 160mm * 75mm",
    innerPageSize: "220mm * 140mm",
    adAreaSize: "220mm * 30mm",
    materialCover: "300g 黑卡特种烫金纸",
    materialInner: "230g 高显纯白双胶纸",
    thickness: "13张 (26页)",
    pageCount: 13,
    packageType: "臻蓝极简UV磨砂袋",
    weight: "0.38kg",
    boxQuantity: 50,
    status: "completed",
    themeColor: "#1E3A8A", // dark blue
    illustrationType: "landscape",
    assets: [
      { id: "ast_061_cover", productId: "prod_061", assetType: "front_cover", fileUrl: "front", width: 800, height: 600, status: "ready" },
      { id: "ast_061_inner", productId: "prod_061", assetType: "inner_page", fileUrl: "inner", width: 800, height: 600, status: "ready" },
      { id: "ast_061_side", productId: "prod_061", assetType: "side", fileUrl: "side", width: 800, height: 600, status: "ready" },
      { id: "ast_061_detail_ring", productId: "prod_061", assetType: "detail_ring", fileUrl: "ring", width: 800, height: 600, status: "ready" },
      { id: "ast_061_ad", productId: "prod_061", assetType: "ad_area", fileUrl: "ad", width: 800, height: 300, status: "ready" },
      { id: "ast_061_png", productId: "prod_061", assetType: "transparent_png", fileUrl: "png", width: 1000, height: 1000, status: "ready" }
    ]
  },
  {
    id: "prod_062",
    productCode: "062",
    productName: "五福临门",
    productType: "calendar",
    seriesName: "喜庆精雕",
    year: "2026",
    size: "260mm * 180mm * 85mm",
    innerPageSize: "260mm * 160mm",
    adAreaSize: "260mm * 40mm",
    materialCover: "重磅绒面多层激光镂空纸",
    materialInner: "250g 加厚米白纯棉纸",
    thickness: "14张 (28页)",
    pageCount: 14,
    packageType: "镂空雕刻实木礼盒",
    weight: "0.58kg",
    boxQuantity: 30,
    status: "completed",
    themeColor: "#E11D48", // crimson
    illustrationType: "dragon",
    assets: [
      { id: "ast_062_cover", productId: "prod_062", assetType: "front_cover", fileUrl: "front", width: 800, height: 600, status: "ready" },
      { id: "ast_062_inner", productId: "prod_062", assetType: "inner_page", fileUrl: "inner", width: 800, height: 600, status: "ready" },
      { id: "ast_062_png", productId: "prod_062", assetType: "transparent_png", fileUrl: "png", width: 1000, height: 1000, status: "ready" }
    ]
  },
  {
    id: "prod_063",
    productCode: "063",
    productName: "竹影清风",
    productType: "calendar",
    seriesName: "新中式",
    year: "2026",
    size: "200mm * 200mm * 70mm",
    innerPageSize: "200mm * 180mm",
    adAreaSize: "200mm * 30mm",
    materialCover: "亚麻手工布纹纸",
    materialInner: "200g 新感丝柔米色纸",
    thickness: "13张 (26页)",
    pageCount: 13,
    packageType: "古风棉麻抽绳袋",
    weight: "0.35kg",
    boxQuantity: 50,
    status: "white_bg_done",
    themeColor: "#0F766E", // teal
    illustrationType: "landscape",
    assets: [
      { id: "ast_063_cover", productId: "prod_063", assetType: "front_cover", fileUrl: "front", width: 800, height: 600, status: "ready" },
      { id: "ast_063_png", productId: "prod_063", assetType: "transparent_png", fileUrl: "png", width: 1000, height: 1000, status: "ready" }
    ]
  },
  {
    id: "prod_064",
    productCode: "064",
    productName: "童心漫游",
    productType: "calendar",
    seriesName: "儿童插画",
    year: "2026",
    size: "210mm * 150mm * 70mm",
    innerPageSize: "210mm * 130mm",
    adAreaSize: "210mm * 25mm",
    materialCover: "250g 芬兰白卡纸",
    materialInner: "180g 高吸墨原生卡纸",
    thickness: "15张 (30页)",
    pageCount: 15,
    packageType: "糖果色半透明塑料礼盒",
    weight: "0.30kg",
    boxQuantity: 60,
    status: "png_done",
    themeColor: "#D97706", // amber / warm orange
    illustrationType: "cartoon",
    assets: [
      { id: "ast_064_cover", productId: "prod_064", assetType: "front_cover", fileUrl: "front", width: 800, height: 600, status: "ready" },
      { id: "ast_064_png", productId: "prod_064", assetType: "transparent_png", fileUrl: "png", width: 1000, height: 1000, status: "ready" }
    ]
  },
  {
    id: "prod_065",
    productCode: "065",
    productName: "松龄鹤寿",
    productType: "wall_calendar",
    seriesName: "国潮年货",
    year: "2026",
    size: "380mm * 680mm * 10mm",
    innerPageSize: "380mm * 600mm",
    adAreaSize: "380mm * 80mm",
    materialCover: "金红特种浮雕纸",
    materialInner: "150g 新浪潮高档双胶纸",
    thickness: "7张 (12月双面)",
    pageCount: 7,
    packageType: "国潮大卷筒礼盒",
    weight: "0.75kg",
    boxQuantity: 20,
    status: "raw", // Raw image, needs refine
    themeColor: "#991B1B", // dark red
    illustrationType: "dragon",
    assets: [
      { id: "ast_065_cover", productId: "prod_065", assetType: "front_cover", fileUrl: "front", width: 800, height: 1200, status: "ready" }
    ]
  },
  {
    id: "prod_066",
    productCode: "066",
    productName: "瑞雪兆丰年",
    productType: "calendar",
    seriesName: "喜庆精雕",
    year: "2026",
    size: "240mm * 170mm * 80mm",
    innerPageSize: "240mm * 150mm",
    adAreaSize: "240mm * 30mm",
    materialCover: "重质特种红卡",
    materialInner: "200g 哑光进口超感纸",
    thickness: "14张 (28页)",
    pageCount: 14,
    packageType: "大红烫白金福袋",
    weight: "0.45kg",
    boxQuantity: 40,
    status: "missing_assets",
    themeColor: "#B91C1C",
    illustrationType: "cartoon",
    assets: []
  },
  {
    id: "prod_067",
    productCode: "067",
    productName: "金玉满堂",
    productType: "gift_box",
    seriesName: "国潮年货",
    year: "2026",
    size: "300mm * 300mm * 120mm",
    innerPageSize: "多件组合",
    adAreaSize: "300mm * 60mm",
    materialCover: "重磅布艺实木外壳",
    materialInner: "多种高档特种纸张",
    thickness: "精品套装",
    pageCount: 20,
    packageType: "皇家大红重型实木皮盒",
    weight: "1.85kg",
    boxQuantity: 8,
    status: "completed",
    themeColor: "#854D0E", // rich gold / dark yellow
    illustrationType: "dragon",
    assets: [
      { id: "ast_067_cover", productId: "prod_067", assetType: "front_cover", fileUrl: "front", width: 1200, height: 1200, status: "ready" },
      { id: "ast_067_png", productId: "prod_067", assetType: "transparent_png", fileUrl: "png", width: 1200, height: 1200, status: "ready" }
    ]
  }
];

export const PRESET_TEMPLATES: Template[] = [
  {
    id: "MAIN_001",
    templateName: "单本台历主图模板",
    templateType: "main",
    productType: "calendar",
    aspectRatio: "1:1",
    outputWidth: 800,
    outputHeight: 800,
    background: {
      type: "scene",
      sceneStyle: "warm_light"
    },
    status: "enabled",
    slots: [
      {
        id: "s_main_001",
        slotId: "CAL_SLOT_001",
        slotName: "台历封面大槽位",
        assetType: "transparent_png",
        x: 50,
        y: 84,
        maxWidth: 92,
        maxHeight: 62,
        anchor: "bottom_center",
        scaleMode: "contain",
        lockAspectRatio: true,
        allowRotation: false,
        allowCrop: false,
        layer: 3,
        shadowRule: "strong_desk_contact_shadow"
      }
    ],
    textFields: [
      {
        id: "t_main_1",
        fieldName: "顶部主标题",
        content: "2026企业定制台历",
        isDynamic: false,
        dataSource: "custom",
        x: 50,
        y: 11,
        fontFamily: "font-sans",
        fontSize: 32,
        fontWeight: "font-bold",
        align: "center",
        color: "#B91C1C"
      },
      {
        id: "t_main_2",
        fieldName: "产品名称",
        content: "[productName]",
        isDynamic: true,
        dataSource: "productName",
        x: 50,
        y: 18,
        fontFamily: "font-sans",
        fontSize: 22,
        fontWeight: "font-bold",
        align: "center",
        color: "#1F2937"
      },
      {
        id: "t_main_3",
        fieldName: "副标题",
        content: "企业礼品 / 办公摆放 / 新年定制",
        isDynamic: false,
        dataSource: "custom",
        x: 50,
        y: 24,
        fontFamily: "font-sans",
        fontSize: 14,
        fontWeight: "font-medium",
        align: "center",
        color: "#4B5563"
      },
      {
        id: "t_main_4",
        fieldName: "底部卖点",
        content: "免费设计 / 免费看样 / 50本起定",
        isDynamic: false,
        dataSource: "custom",
        x: 50,
        y: 92,
        fontFamily: "font-sans",
        fontSize: 14,
        fontWeight: "font-semibold",
        align: "center",
        color: "#B91C1C"
      }
    ],
    exportSettings: {
      format: "JPG",
      quality: 95,
      width: 800,
      height: 800
    }
  },
  {
    id: "MAIN_002",
    templateName: "单本台历高级场景主图",
    templateType: "main",
    productType: "calendar",
    aspectRatio: "1:1",
    outputWidth: 800,
    outputHeight: 800,
    background: {
      type: "scene",
      sceneStyle: "beige_paper"
    },
    status: "enabled",
    slots: [
      {
        id: "s2",
        slotId: "CAL_SLOT_001",
        slotName: "单本台历标准正面槽",
        assetType: "front_cover",
        x: 50,
        y: 60,
        maxWidth: 82,
        maxHeight: 52,
        anchor: "bottom_center",
        scaleMode: "contain",
        lockAspectRatio: true,
        allowRotation: false,
        allowCrop: false,
        layer: 3,
        shadowRule: "desk_contact_soft_shadow"
      }
    ],
    textFields: [
      {
        id: "t2_1",
        fieldName: "大年份水印",
        content: "2026",
        isDynamic: false,
        dataSource: "custom",
        x: 50,
        y: 18,
        fontFamily: "font-mono",
        fontSize: 96,
        fontWeight: "font-extrabold",
        align: "center",
        color: "rgba(185, 28, 28, 0.08)"
      },
      {
        id: "t2_2",
        fieldName: "主标题",
        content: "[productName] · 贺岁台历",
        isDynamic: true,
        dataSource: "productName",
        x: 50,
        y: 20,
        fontFamily: "font-sans",
        fontSize: 28,
        fontWeight: "font-bold",
        align: "center",
        color: "#1F2937"
      },
      {
        id: "t2_3",
        fieldName: "宣传语",
        content: "国潮韵味 匠心巧雕",
        isDynamic: false,
        dataSource: "custom",
        x: 50,
        y: 28,
        fontFamily: "font-sans",
        fontSize: 14,
        fontWeight: "font-normal",
        align: "center",
        color: "#6B7280"
      }
    ],
    exportSettings: {
      format: "JPG",
      quality: 95,
      width: 800,
      height: 800
    }
  },
  {
    id: "MAIN_003",
    templateName: "双本层叠场景主图",
    templateType: "main",
    productType: "calendar",
    aspectRatio: "1:1",
    outputWidth: 800,
    outputHeight: 800,
    background: {
      type: "scene",
      sceneStyle: "luxury_gold"
    },
    status: "enabled",
    slots: [
      {
        id: "s3_bg",
        slotId: "CAL_SLOT_005_BACK",
        slotName: "后景副产品(内页)",
        assetType: "inner_page",
        x: 60,
        y: 48,
        maxWidth: 65,
        maxHeight: 45,
        anchor: "bottom_center",
        scaleMode: "contain",
        lockAspectRatio: true,
        allowRotation: true,
        allowCrop: false,
        layer: 2,
        shadowRule: "very_light_shadow_or_none"
      },
      {
        id: "s3_fg",
        slotId: "CAL_SLOT_005_FRONT",
        slotName: "前景主产品(封面)",
        assetType: "front_cover",
        x: 44,
        y: 68,
        maxWidth: 75,
        maxHeight: 48,
        anchor: "bottom_center",
        scaleMode: "contain",
        lockAspectRatio: true,
        allowRotation: false,
        allowCrop: false,
        layer: 3,
        shadowRule: "strong_desk_contact_shadow"
      }
    ],
    textFields: [
      {
        id: "t3_1",
        fieldName: "封面内页双重震撼",
        content: "「精美封面 巧思内页」",
        isDynamic: false,
        dataSource: "custom",
        x: 50,
        y: 12,
        fontFamily: "font-sans",
        fontSize: 26,
        fontWeight: "font-bold",
        align: "center",
        color: "#854D0E"
      },
      {
        id: "t3_2",
        fieldName: "产品名显示",
        content: "2026年 [productName] 艺术台历系列",
        isDynamic: true,
        dataSource: "productName",
        x: 50,
        y: 19,
        fontFamily: "font-sans",
        fontSize: 14,
        fontWeight: "font-medium",
        align: "center",
        color: "#4B5563"
      }
    ],
    exportSettings: {
      format: "JPG",
      quality: 95,
      width: 800,
      height: 800
    }
  },
  {
    id: "SKU_001",
    templateName: "SKU单款固定模板",
    templateType: "sku",
    productType: "calendar",
    aspectRatio: "1:1",
    outputWidth: 800,
    outputHeight: 800,
    background: {
      type: "scene",
      sceneStyle: "studio_white"
    },
    status: "enabled",
    slots: [
      {
        id: "s_sku_001",
        slotId: "CAL_SLOT_003",
        slotName: "SKU单款产品槽位",
        assetType: "transparent_png",
        x: 50,
        y: 78,
        maxWidth: 86,
        maxHeight: 62,
        anchor: "bottom_center",
        scaleMode: "contain",
        lockAspectRatio: true,
        allowRotation: false,
        allowCrop: false,
        layer: 3,
        shadowRule: "desk_contact_soft_shadow"
      }
    ],
    textFields: [
      {
        id: "tsku_1",
        fieldName: "顶部产品名称",
        content: "[productName]",
        isDynamic: true,
        dataSource: "productName",
        x: 50,
        y: 12,
        fontFamily: "font-sans",
        fontSize: 28,
        fontWeight: "font-bold",
        align: "center",
        color: "#1F2937"
      },
      {
        id: "tsku_2",
        fieldName: "固定副标题",
        content: "2026.1-2026.12",
        isDynamic: false,
        dataSource: "custom",
        x: 50,
        y: 19,
        fontFamily: "font-sans",
        fontSize: 14,
        fontWeight: "font-medium",
        align: "center",
        color: "#4B5563"
      },
      {
        id: "tsku_3",
        fieldName: "底部款号",
        content: "SKU编号：[productCode]",
        isDynamic: true,
        dataSource: "productCode",
        x: 50,
        y: 90,
        fontFamily: "font-mono",
        fontSize: 14,
        fontWeight: "font-semibold",
        align: "center",
        color: "#4B5563"
      }
    ],
    exportSettings: {
      format: "PNG",
      quality: 95,
      width: 800,
      height: 800
    }
  },
  {
    id: "DETAIL_001",
    templateName: "材质结构详情解析图",
    templateType: "detail",
    productType: "calendar",
    aspectRatio: "3:4",
    outputWidth: 750,
    outputHeight: 1000,
    background: {
      type: "scene",
      sceneStyle: "beige_paper"
    },
    status: "enabled",
    slots: [
      {
        id: "s_det_main",
        slotId: "CAL_SLOT_008",
        slotName: "侧面结构/支架展示槽",
        assetType: "side",
        x: 50,
        y: 45,
        maxWidth: 85,
        maxHeight: 48,
        anchor: "bottom_center",
        scaleMode: "contain",
        lockAspectRatio: true,
        allowRotation: false,
        allowCrop: false,
        layer: 3,
        shadowRule: "strong_desk_contact_shadow"
      }
    ],
    textFields: [
      {
        id: "td_header",
        content: "核心结构与科学选材",
        fieldName: "模块页眉",
        isDynamic: false,
        dataSource: "custom",
        x: 50,
        y: 6,
        fontFamily: "font-sans",
        fontSize: 26,
        fontWeight: "font-bold",
        align: "center",
        color: "#1F2937"
      },
      {
        id: "td_desc",
        content: "加厚三角稳固底座 | 特种艺术纸面板",
        fieldName: "卖点提炼",
        isDynamic: false,
        dataSource: "custom",
        x: 50,
        y: 12,
        fontFamily: "font-sans",
        fontSize: 14,
        fontWeight: "font-medium",
        align: "center",
        color: "#991B1B"
      },
      {
        id: "td_line1",
        content: "📌 封面材质: [materialCover]",
        fieldName: "参数封面",
        isDynamic: true,
        dataSource: "materialCover",
        x: 10,
        y: 80,
        fontFamily: "font-sans",
        fontSize: 14,
        fontWeight: "font-medium",
        align: "left",
        color: "#374151"
      },
      {
        id: "td_line2",
        content: "📌 内页用纸: [materialInner]",
        fieldName: "参数内页",
        isDynamic: true,
        dataSource: "materialInner",
        x: 10,
        y: 85,
        fontFamily: "font-sans",
        fontSize: 14,
        fontWeight: "font-medium",
        align: "left",
        color: "#374151"
      },
      {
        id: "td_line3",
        content: "📌 包装规格: [packageType]",
        fieldName: "参数包装",
        isDynamic: true,
        dataSource: "packageType",
        x: 10,
        y: 90,
        fontFamily: "font-sans",
        fontSize: 14,
        fontWeight: "font-medium",
        align: "left",
        color: "#374151"
      }
    ],
    exportSettings: {
      format: "JPG",
      quality: 92,
      width: 750,
      height: 1000
    }
  },
  {
    id: "DETAIL_002",
    templateName: "工艺细节品质四宫格",
    templateType: "detail",
    productType: "calendar",
    aspectRatio: "3:4",
    outputWidth: 750,
    outputHeight: 1000,
    background: {
      type: "scene",
      sceneStyle: "festive_red"
    },
    status: "enabled",
    slots: [
      {
        id: "sub_1",
        slotId: "CAL_SLOT_007_P1",
        slotName: "细节1: 封面特写",
        assetType: "detail_cover",
        x: 26,
        y: 32,
        maxWidth: 42,
        maxHeight: 25,
        anchor: "center",
        scaleMode: "cover",
        lockAspectRatio: false,
        allowRotation: false,
        allowCrop: true,
        layer: 3,
        shadowRule: "very_light_shadow_or_none"
      },
      {
        id: "sub_2",
        slotId: "CAL_SLOT_007_P2",
        slotName: "细节2: 线圈环装",
        assetType: "detail_ring",
        x: 74,
        y: 32,
        maxWidth: 42,
        maxHeight: 25,
        anchor: "center",
        scaleMode: "cover",
        lockAspectRatio: false,
        allowRotation: false,
        allowCrop: true,
        layer: 3,
        shadowRule: "very_light_shadow_or_none"
      },
      {
        id: "sub_3",
        slotId: "CAL_SLOT_007_P3",
        slotName: "细节3: 内页材质",
        assetType: "detail_page",
        x: 26,
        y: 68,
        maxWidth: 42,
        maxHeight: 25,
        anchor: "center",
        scaleMode: "cover",
        lockAspectRatio: false,
        allowRotation: false,
        allowCrop: true,
        layer: 3,
        shadowRule: "very_light_shadow_or_none"
      },
      {
        id: "sub_4",
        slotId: "CAL_SLOT_007_P4",
        slotName: "细节4: 支架细节",
        assetType: "detail_base",
        x: 74,
        y: 68,
        maxWidth: 42,
        maxHeight: 25,
        anchor: "center",
        scaleMode: "cover",
        lockAspectRatio: false,
        allowRotation: false,
        allowCrop: true,
        layer: 3,
        shadowRule: "very_light_shadow_or_none"
      }
    ],
    textFields: [
      {
        id: "tqc_header",
        content: "「匠心工艺与高阶品质」",
        fieldName: "模块页眉",
        isDynamic: false,
        dataSource: "custom",
        x: 50,
        y: 6,
        fontFamily: "font-sans",
        fontSize: 26,
        fontWeight: "font-bold",
        align: "center",
        color: "#FFFFFF"
      },
      {
        id: "tqc_s1",
        content: "「封面精雕工艺」",
        fieldName: "图1标",
        isDynamic: false,
        dataSource: "custom",
        x: 26,
        y: 49,
        fontFamily: "font-sans",
        fontSize: 12,
        fontWeight: "font-semibold",
        align: "center",
        color: "#FFFFFF"
      },
      {
        id: "tqc_s2",
        content: "「金五金双线圈」",
        fieldName: "图2标",
        isDynamic: false,
        dataSource: "custom",
        x: 74,
        y: 49,
        fontFamily: "font-sans",
        fontSize: 12,
        fontWeight: "font-semibold",
        align: "center",
        color: "#FFFFFF"
      },
      {
        id: "tqc_s3",
        content: "「纯进口超感纸」",
        fieldName: "图3标",
        isDynamic: false,
        dataSource: "custom",
        x: 26,
        y: 82,
        fontFamily: "font-sans",
        fontSize: 12,
        fontWeight: "font-semibold",
        align: "center",
        color: "#FFFFFF"
      },
      {
        id: "tqc_s4",
        content: "「高承重折座」",
        fieldName: "图4标",
        isDynamic: false,
        dataSource: "custom",
        x: 74,
        y: 82,
        fontFamily: "font-sans",
        fontSize: 12,
        fontWeight: "font-semibold",
        align: "center",
        color: "#FFFFFF"
      }
    ],
    exportSettings: {
      format: "JPG",
      quality: 90,
      width: 750,
      height: 1000
    }
  }
];

export const SLOT_DEFINITIONS = [
  { id: "CAL_SLOT_001", name: "单本台历标准正面槽", widthRange: "82% - 88%", heightRange: "48% - 58%", desc: "适用于款式展示、SKU配图，含标准防偏阴影约束层。" },
  { id: "CAL_SLOT_002", name: "单本台历大主图槽", widthRange: "88% - 94%", heightRange: "55% - 68%", desc: "适用于800x800标准大图，顶部有留白供文案展示。" },
  { id: "CAL_SLOT_003", name: "SKU单款固定槽", widthRange: "82% - 86%", heightRange: "52% - 58%", desc: "支持底边定位，背景固定微缩轻质纸感质感。" },
  { id: "CAL_SLOT_004", name: "白底标准产品槽", widthRange: "82% - 88%", heightRange: "72% - 80%", desc: "主打规范图，强制纯白背景，去除一切装饰物。" },
  { id: "CAL_SLOT_005", name: "双本前后层叠槽", widthRange: "82% - 92%", heightRange: "多层叠", desc: "主副双品阶阶梯排布，前景产品必须完整展示。" },
  { id: "CAL_SLOT_006", name: "三本内页阶梯槽", widthRange: "阶梯分布", heightRange: "阶梯分布", desc: "由深至浅、左右拉开的多月份展示槽位。" },
  { id: "CAL_SLOT_007", name: "工艺细节四宫格", widthRange: "2*2拼图", heightRange: "2*2拼图", desc: "分块对齐裁剪，显示线圈、烫印、纸张细节。" },
  { id: "CAL_SLOT_008", name: "侧面结构槽", widthRange: "88% - 96%", heightRange: "55% - 68%", desc: "专为45度侧面立体三角架倾斜拍摄而设。" },
  { id: "CAL_SLOT_009", name: "广告位定制槽", widthRange: "88% - 94%", heightRange: "45% - 55%", desc: "底座局部放大，高亮镂空定制烫金区域。" },
  { id: "CAL_SLOT_010", name: "尺寸参数展示槽", widthRange: "48% - 58%", heightRange: "35% - 45%", desc: "左对角线缩，配合右侧、底下多行系统参数字。" },
  { id: "CAL_SLOT_011", name: "款式一览宫格槽", widthRange: "多宫格", heightRange: "多格缩放", desc: "展示2x3（6款）或3x4（12款）的系列总览。" },
  { id: "CAL_SLOT_012", name: "内页功能互动槽", widthRange: "88% - 96%", heightRange: "52% - 62%", desc: "带握笔手势剪影，凸显格间大间距文字备忘功能。" }
];

export const PRESET_RUNNINGHUB_WORKFLOWS: RunningHubWorkflowConfig[] = [
  {
    id: "rh_matting_cutout",
    name: "RunningHub 产品抠图 / 透明PNG生成",
    description: "用于从产品实拍图生成透明 PNG、白底图和可选 Mask",
    workflowId: "",
    apiMode: "run_workflow_v2",
    modelType: "qwen_image_edit",
    baseImageNodeId: "",
    baseImageFieldName: "image",
    inputImageNodeId: "",
    promptNodeId: "",
    negativePromptNodeId: "",
    outputNodeId: "",
    defaultPrompt: "",
    defaultNegativePrompt: "",
    defaultDenoise: 1,
    enabled: false,
    transparentOutputIndex: 0,
    whiteBgOutputIndex: 1,
    maskOutputIndex: 2
  },
  {
    id: "rh_flux2_klein_light_fusion",
    name: "Flux2-Klein 产品光影融合",
    workflowId: "2062738205958565890",
    apiMode: "run_workflow_v2",
    modelType: "flux_kontext",

    baseImageNodeId: "77",
    baseImageFieldName: "image",

    promptNodeId: "68",
    promptFieldName: "text",

    negativePromptNodeId: "",
    negativePromptFieldName: "",

    seedNodeId: "49",
    seedFieldName: "seed",

    denoiseNodeId: "49",
    denoiseFieldName: "denoise",

    stepsNodeId: "49",
    stepsFieldName: "steps",

    cfgNodeId: "49",
    cfgFieldName: "cfg",

    outputNodeId: "48",

    defaultPrompt: "产品与背景自然融合，并进行统一重新打光。光影统一，保持产品主体、图案、文字、颜色和结构不变，只增强环境光、接触阴影、边缘融合 and 整体质感，make image high quality,",
    defaultNegativePrompt: "",
    defaultDenoise: 1,
    defaultSteps: 4,
    defaultCfg: 1,
    enabled: true
  },
  {
    id: "wf_flux_kontext",
    name: "Flux-Kontext 融合增强 (Legacy V1 模式)",
    workflowId: "wf_preset_flux_2026",
    apiMode: "comfyui_openapi",
    modelType: "flux_kontext",
    baseImageNodeId: "10",
    promptNodeId: "20",
    negativePromptNodeId: "21",
    seedNodeId: "30",
    denoiseNodeId: "40",
    outputNodeId: "9",
    defaultPrompt: "将输入图中的台历产品自然融合到低透视新中式空桌面场景中，只增强环境光、接触阴影、桌面氛围和边缘融合。必须保持台历产品主体、红色封面、金色烫印工艺、马图案、产品上的所有中文文字、年份数字、挂环、底座结构完全不变。产品清晰突出，电商主图风格，高级但不过度重绘。",
    defaultNegativePrompt: "不要修改产品图案，不要修改产品文字，不要改变年份数字，不要重绘马图案，不要改变产品比例，不要替换产品，不要新增台历，不要让产品变形，不要裁切产品，不要生成乱码文字，不要模糊产品主体，不要改变红色封面和金色工艺。",
    defaultDenoise: 0.22,
    enabled: true
  }
];

// Presets for the new Suite-level E-commerce generation flow
export const PRESET_TEMPLATE_SUITES: TemplateSuite[] = [
  {
    id: "suite_nc_001",
    suiteName: "桌面台历标准套系",
    styleName: "新中式 / 商务 / 暖色场景",
    category: "new_chinese",
    productType: "calendar",
    productArchetype: ProductArchetype.desk_calendar,
    coverImage: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop",
    expectedSliceCounts: {
      mainSquareMinCount: 10,
      mainVerticalMinCount: 10,
      mainMarketingTotalMinCount: 20,
      skuMinCount: 5,
      detailMinCount: 8,
      whiteBgRequired: true,
      transparentPngRequired: true
    },
    exportProfile: {
      folders: [
        ExportFolderKey.main_square,
        ExportFolderKey.main_vertical,
        ExportFolderKey.sku,
        ExportFolderKey.detail,
        ExportFolderKey.sample_book,
        ExportFolderKey.customization_detail,
        ExportFolderKey.ad_custom_effect,
        ExportFolderKey.white_bg,
        ExportFolderKey.transparent_png
      ],
      namingRule: "{productCode}_{pageRole}_{index}"
    },
    pages: [
      {
        id: "tp_nc_001_main",
        pageName: "方形主视觉首图 (方形主图)",
        pageType: "main",
        templateId: "MAIN_001",
        order: 1,
        requiredAssetRoles: ["main_product", "front"],
        enabled: true,
        pageRole: PageRole.primary_main_square,
        businessRatioType: BusinessRatioType.square,
        actualAspectRatio: "1:1",
        isDeliverable: true,
        isRunningHubRecommended: true,
        outputFolder: ExportFolderKey.main_square,
        outputFileNamePattern: "{productCode}_main_square_800.jpg"
      },
      {
        id: "tp_nc_001_main_v",
        pageName: "竖版主视觉首图 (长图主图)",
        pageType: "main",
        templateId: "MAIN_001",
        order: 2,
        requiredAssetRoles: ["main_product", "front"],
        enabled: true,
        pageRole: PageRole.primary_main_vertical,
        businessRatioType: BusinessRatioType.vertical,
        actualAspectRatio: "3:4",
        isDeliverable: true,
        isRunningHubRecommended: true,
        outputFolder: ExportFolderKey.main_vertical,
        outputFileNamePattern: "{productCode}_main_vertical_750.jpg"
      },
      {
        id: "tp_nc_001_sku",
        pageName: "款式分类SKU主图 (sku)",
        pageType: "sku",
        templateId: "SKU_001",
        order: 3,
        requiredAssetRoles: ["sku_product", "left_3_4"],
        enabled: true,
        pageRole: PageRole.sku_variant,
        businessRatioType: BusinessRatioType.square,
        actualAspectRatio: "1:1",
        isDeliverable: true,
        outputFolder: ExportFolderKey.sku,
        outputFileNamePattern: "{productCode}_sku_var.jpg"
      },
      {
        id: "tp_nc_001_det_01",
        pageName: "详情页：精美内页展示",
        pageType: "detail",
        templateId: "DETAIL_001",
        order: 4,
        requiredAssetRoles: ["front"],
        enabled: true,
        pageRole: PageRole.detail_inner_page,
        businessRatioType: BusinessRatioType.long_vertical,
        actualAspectRatio: "3:4",
        isDeliverable: true,
        outputFolder: ExportFolderKey.detail,
        outputFileNamePattern: "{productCode}_detail_page.jpg"
      },
      {
        id: "tp_nc_001_white",
        pageName: "商运白底精修图 (white_bg)",
        pageType: "white_bg",
        templateId: "DETAIL_002",
        order: 5,
        requiredAssetRoles: ["white_bg"],
        enabled: true,
        pageRole: PageRole.white_bg,
        businessRatioType: BusinessRatioType.square,
        actualAspectRatio: "1:1",
        isDeliverable: true,
        isCanvasOnly: true,
        outputFolder: ExportFolderKey.white_bg,
        outputFileNamePattern: "{productCode}_whitebg.jpg"
      },
      {
        id: "tp_nc_001_trans",
        pageName: "商运透明底成品图 (transparent_png)",
        pageType: "white_bg",
        templateId: "DETAIL_002",
        order: 6,
        requiredAssetRoles: ["main_product"],
        enabled: true,
        pageRole: PageRole.transparent_png,
        businessRatioType: BusinessRatioType.square,
        actualAspectRatio: "1:1",
        isDeliverable: true,
        isCanvasOnly: true,
        outputFolder: ExportFolderKey.transparent_png,
        outputFileNamePattern: "{productCode}_transparent.png"
      }
    ],
    globalStyle: {
      colorPalette: ["#DC2626", "#F59E0B", "#111827", "#FEF3C7"],
      fontStyle: "Space Grotesk & Inter Mono",
      sceneStyle: "暖色调新中式高档家居场景",
      lightDirection: "右上45度柔和侧光",
      description: "专为桌面台历打造的高端国风商务套系，保障方形主图最少10张、竖版主图最少10张，完备输出白底精修与透明PNG正式交付成品。"
    },
    status: "enabled"
  },
  {
    id: "suite_wall_002",
    suiteName: "挂历/月历标准套系",
    styleName: "中式典雅 / 宣纸彩印 / 卷轴金饰",
    category: "new_chinese",
    productType: "wall_calendar",
    productArchetype: ProductArchetype.wall_calendar,
    coverImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop",
    expectedSliceCounts: {
      mainSquareMinCount: 12,
      mainVerticalMinCount: 12,
      mainMarketingTotalMinCount: 24,
      skuMinCount: 6,
      detailMinCount: 10,
      whiteBgRequired: true,
      transparentPngRequired: true
    },
    exportProfile: {
      folders: [
        ExportFolderKey.main_square,
        ExportFolderKey.main_vertical,
        ExportFolderKey.sku,
        ExportFolderKey.detail,
        ExportFolderKey.sample_book,
        ExportFolderKey.customization_detail,
        ExportFolderKey.ad_custom_effect,
        ExportFolderKey.white_bg,
        ExportFolderKey.transparent_png
      ],
      namingRule: "{productCode}_{pageRole}_{index}"
    },
    pages: [
      {
        id: "tp_wall_main_sq",
        pageName: "挂历方形主视觉图 (方形主图)",
        pageType: "main",
        templateId: "MAIN_001",
        order: 1,
        requiredAssetRoles: ["main_product", "front"],
        enabled: true,
        pageRole: PageRole.primary_main_square,
        businessRatioType: BusinessRatioType.square,
        actualAspectRatio: "1:1",
        isDeliverable: true,
        isRunningHubRecommended: true,
        outputFolder: ExportFolderKey.main_square,
        outputFileNamePattern: "{productCode}_wall_square_800.jpg"
      },
      {
        id: "tp_wall_main_vt",
        pageName: "挂历竖版主视觉图 (长图主图)",
        pageType: "main",
        templateId: "MAIN_001",
        order: 2,
        requiredAssetRoles: ["main_product", "front"],
        enabled: true,
        pageRole: PageRole.primary_main_vertical,
        businessRatioType: BusinessRatioType.vertical,
        actualAspectRatio: "3:4",
        isDeliverable: true,
        isRunningHubRecommended: true,
        outputFolder: ExportFolderKey.main_vertical,
        outputFileNamePattern: "{productCode}_wall_vertical_750.jpg"
      },
      {
        id: "tp_wall_sku",
        pageName: "挂历SKU多款展示",
        pageType: "sku",
        templateId: "SKU_001",
        order: 3,
        requiredAssetRoles: ["sku_product", "left_3_4"],
        enabled: true,
        pageRole: PageRole.sku_variant,
        businessRatioType: BusinessRatioType.square,
        actualAspectRatio: "1:1",
        isDeliverable: true,
        outputFolder: ExportFolderKey.sku,
        outputFileNamePattern: "{productCode}_wall_sku.jpg"
      },
      {
        id: "tp_wall_white",
        pageName: "挂历白底图 (white_bg)",
        pageType: "white_bg",
        templateId: "DETAIL_002",
        order: 4,
        requiredAssetRoles: ["white_bg"],
        enabled: true,
        pageRole: PageRole.white_bg,
        businessRatioType: BusinessRatioType.square,
        actualAspectRatio: "1:1",
        isDeliverable: true,
        isCanvasOnly: true,
        outputFolder: ExportFolderKey.white_bg,
        outputFileNamePattern: "{productCode}_wall_whitebg.jpg"
      }
    ],
    globalStyle: {
      colorPalette: ["#1e293b", "#3b82f6", "#111827"],
      fontStyle: "Modern Elegance Serif",
      sceneStyle: "中式典雅红木卷轴挂墙场景",
      lightDirection: "垂直高透漫射光",
      description: "挂历标准生产套系。包含最少方形12张、竖版12张主图卖点图，配备高解析度白底精修与透明PNG成品，完全面向最终交付。"
    },
    status: "enabled"
  },
  {
    id: "suite_fu_003",
    suiteName: "工艺福牌/挂件年历套系",
    styleName: "镂空精雕 / 丝绸红结 / 尊贵木座",
    category: "custom",
    productType: "calendar",
    productArchetype: ProductArchetype.fu_plaque_calendar,
    coverImage: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=600&auto=format&fit=crop",
    expectedSliceCounts: {},
    pages: [
      {
        id: "tp_fu_main",
        pageName: "工艺福牌尊贵首图",
        pageType: "main",
        templateId: "MAIN_002",
        order: 1,
        requiredAssetRoles: ["main_product", "front"],
        enabled: true,
        pageRole: PageRole.primary_main_square,
        businessRatioType: BusinessRatioType.square,
        actualAspectRatio: "1:1",
        isDeliverable: true,
        outputFolder: ExportFolderKey.main_square,
        outputFileNamePattern: "{productCode}_fu_main.jpg"
      }
    ],
    globalStyle: {
      colorPalette: ["#DC2626", "#F59E0B"],
      fontStyle: "NianHuo Brush & Chinese Serif",
      sceneStyle: "尊贵雕镂艺术底座展台场景",
      lightDirection: "多维偏斜聚光射灯",
      description: "专为工艺福牌年雕及各类挂折艺术年卡设计的挂件套系产品，工艺细节精致。"
    },
    status: "enabled"
  }
];

export const PRESET_PRODUCT_ASSET_PACKS: ProductAssetPack[] = [
  {
    id: "pack_060",
    productId: "prod_060",
    productName: "策马奔腾",
    productCode: "060",
    assets: [
      {
        id: "pk_ast_060_cover",
        productId: "prod_060",
        assetType: "front_cover",
        fileUrl: "front",
        width: 800,
        height: 600,
        status: "ready",
        assetRole: "front",
        viewType: "front",
        perspectiveType: "front",
        isPrimary: true,
        qualityStatus: "ready"
      },
      {
        id: "pk_ast_060_inner",
        productId: "prod_060",
        assetType: "inner_page",
        fileUrl: "inner",
        width: 800,
        height: 600,
        status: "ready",
        assetRole: "sku_product",
        viewType: "front",
        perspectiveType: "front",
        isPrimary: false,
        qualityStatus: "ready"
      },
      {
        id: "pk_ast_060_ring",
        productId: "prod_060",
        assetType: "detail_ring",
        fileUrl: "ring",
        width: 800,
        height: 600,
        status: "ready",
        assetRole: "detail_part",
        viewType: "detail",
        perspectiveType: "detail",
        isPrimary: false,
        qualityStatus: "ready"
      },
      {
        id: "pk_ast_060_png",
        productId: "prod_060",
        assetType: "transparent_png",
        fileUrl: "png",
        width: 1000,
        height: 1000,
        status: "ready",
        assetRole: "main_product",
        viewType: "front",
        perspectiveType: "front",
        isPrimary: true,
        qualityStatus: "ready"
      },
      {
        id: "pk_ast_060_mask",
        productId: "prod_060",
        assetType: "mask",
        fileUrl: "mask",
        width: 1000,
        height: 1000,
        status: "ready",
        assetRole: "mask",
        qualityStatus: "ready"
      },
      {
        id: "pk_ast_060_white",
        productId: "prod_060",
        assetType: "white_bg",
        fileUrl: "white_bg",
        width: 800,
        height: 600,
        status: "ready",
        assetRole: "white_bg",
        viewType: "front",
        perspectiveType: "front",
        isPrimary: false,
        qualityStatus: "ready"
      },
      {
        id: "pk_ast_060_pkg",
        productId: "prod_060",
        assetType: "side",
        fileUrl: "side",
        width: 800,
        height: 600,
        status: "ready",
        assetRole: "package",
        viewType: "side",
        perspectiveType: "left_3_4",
        isPrimary: false,
        qualityStatus: "ready"
      }
    ],
    analysis: {
      hasPackage: true,
      hasCombo: true,
      hasDetail: true,
      dominantColor: "#DC2626",
      recommendedStyle: "new_chinese",
      missingAssetRoles: []
    },
    status: "ready"
  },
  {
    id: "pack_061",
    productId: "prod_061",
    productName: "马到成功",
    productCode: "061",
    assets: [
      {
        id: "pk_ast_061_cover",
        productId: "prod_061",
        assetType: "front_cover",
        fileUrl: "front",
        width: 800,
        height: 600,
        status: "ready",
        assetRole: "front",
        viewType: "front",
        perspectiveType: "front",
        isPrimary: true,
        qualityStatus: "ready"
      },
      {
        id: "pk_ast_061_png",
        productId: "prod_061",
        assetType: "transparent_png",
        fileUrl: "png",
        width: 1000,
        height: 1000,
        status: "ready",
        assetRole: "main_product",
        viewType: "front",
        perspectiveType: "front",
        isPrimary: true,
        qualityStatus: "ready"
      },
      {
        id: "pk_ast_061_white",
        productId: "prod_061",
        assetType: "white_bg",
        fileUrl: "white_bg",
        width: 1000,
        height: 1000,
        status: "ready",
        assetRole: "white_bg",
        viewType: "front",
        perspectiveType: "front",
        isPrimary: false,
        qualityStatus: "ready"
      }
    ],
    analysis: {
      hasPackage: false,
      hasCombo: false,
      hasDetail: false,
      dominantColor: "#1E3A8A",
      recommendedStyle: "business",
      missingAssetRoles: ["package", "detail_part"]
    },
    status: "needs_adjustment"
  },
  {
    id: "pack_062",
    productId: "prod_062",
    productName: "五福临门",
    productCode: "062",
    assets: [
      {
        id: "pk_ast_062_cover",
        productId: "prod_062",
        assetType: "front_cover",
        fileUrl: "front",
        width: 800,
        height: 600,
        status: "ready",
        assetRole: "front",
        viewType: "front",
        perspectiveType: "front",
        isPrimary: true,
        qualityStatus: "ready"
      },
      {
        id: "pk_ast_062_png",
        productId: "prod_062",
        assetType: "transparent_png",
        fileUrl: "png",
        width: 1000,
        height: 1000,
        status: "ready",
        assetRole: "main_product",
        viewType: "front",
        perspectiveType: "front",
        isPrimary: true,
        qualityStatus: "ready"
      }
    ],
    analysis: {
      hasPackage: false,
      hasCombo: false,
      hasDetail: false,
      dominantColor: "#E11D48",
      recommendedStyle: "new_chinese",
      missingAssetRoles: ["package", "white_bg", "detail_part"]
    },
    status: "incomplete"
  }
];
