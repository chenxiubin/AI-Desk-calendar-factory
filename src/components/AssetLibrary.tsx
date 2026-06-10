import React, { useState, useEffect } from "react";
import { Product, ProductAsset } from "../types";
import { VisualCalendar } from "./VisualCalendar";
import { motion } from "motion/react";
import {
  FileCode,
  FolderPlus,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Image,
  Eye,
  Info,
  Layers,
  ArrowRight,
  X,
  Trash2,
  Upload,
} from "lucide-react";

interface AssetLibraryProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onNavigateToRefine: (product: Product) => void;
  onUpdateProductStatus: (
    productId: string,
    newStatus: Product["status"],
    newAssets: ProductAsset[],
  ) => void;
}

export const AssetLibrary: React.FC<AssetLibraryProps> = ({
  products,
  onAddProduct,
  onNavigateToRefine,
  onUpdateProductStatus,
}) => {
  // Navigation states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeries, setFilterSeries] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id || "",
  );
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<string>("");
  const [newAssetIds, setNewAssetIds] = useState<Set<string>>(new Set());

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Fade out highlight after 2.5s
  useEffect(() => {
    if (newAssetIds.size === 0) return;
    const t = setTimeout(() => setNewAssetIds(new Set()), 2500);
    return () => clearTimeout(t);
  }, [newAssetIds]);

  // New product inputs form state
  const [newCode, setNewCode] = useState("068");
  const [newName, setNewName] = useState("吉星高照");
  const [newType, setNewType] = useState<
    "calendar" | "wall_calendar" | "gift_box"
  >("calendar");
  const [newSeries, setNewSeries] = useState<
    "喜庆精雕" | "新中式" | "商务定制" | "儿童插画" | "国潮年货"
  >("国潮年货");
  const [newThemeColor, setNewThemeColor] = useState("#DC2626");

  // Lookup selected product
  const selectedProduct =
    products.find((p) => p.id === selectedProductId) || products[0];

  // Map Filter Options
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.productName.includes(searchQuery) ||
      p.productCode.includes(searchQuery) ||
      p.seriesName.includes(searchQuery);

    const matchesType = filterType === "all" || p.productType === filterType;
    const matchesSeries =
      filterSeries === "all" || p.seriesName === filterSeries;
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;

    return matchesSearch && matchesType && matchesSeries && matchesStatus;
  });

  const handleDeleteAsset = (assetId: string) => {
    if (!selectedProduct) return;
    const updated = selectedProduct.assets.filter((a) => a.id !== assetId);
    onUpdateProductStatus(selectedProduct.id, selectedProduct.status, updated);
    setToast("已删除资产");
  };

  // Calculate product assets completeness percent
  const getCompleteness = (product: Product) => {
    if (!product.assets || product.assets.length === 0) return 0;
    const count = product.assets.filter((a) => a.status === "ready").length;
    return Math.round((count / 11) * 100); // 11 typical assets
  };

  // Check what outputs are possible
  const getPossibleOutputs = (product: Product) => {
    const outputs = [];
    const keys = product.assets.map((a) => a.assetType);

    if (keys.includes("transparent_png")) {
      outputs.push({
        name: "电商主图",
        eligible: true,
        desc: "可用正视角/透视角图",
      });
      outputs.push({
        name: "单款SKU配图",
        eligible: true,
        desc: "标准1:1底面场景图",
      });
      outputs.push({
        name: "白底规范图",
        eligible: true,
        desc: "100%纯白背景图",
      });
    } else {
      outputs.push({
        name: "电商主图",
        eligible: false,
        desc: "缺 封面正面.png ",
      });
      outputs.push({
        name: "单款SKU配图",
        eligible: false,
        desc: "缺 封面正面.png",
      });
      outputs.push({ name: "白底规范图", eligible: false, desc: "缺 白底图" });
    }

    if (keys.includes("inner_page")) {
      outputs.push({
        name: "内页纸张展示图",
        eligible: true,
        desc: "12个月历详情轮播",
      });
      outputs.push({
        name: "使用场景烘焙图",
        eligible: true,
        desc: "桌面/书架氛围摆件",
      });
    } else {
      outputs.push({
        name: "内页纸张展示图",
        eligible: false,
        desc: "缺 纸张内页原件",
      });
      outputs.push({
        name: "使用场景烘焙图",
        eligible: false,
        desc: "缺 纸张内页原件",
      });
    }

    if (
      keys.includes("detail_ring") ||
      keys.includes("detail_cover") ||
      keys.includes("detail_base")
    ) {
      outputs.push({
        name: "工艺纸张细节放大图",
        eligible: true,
        desc: "四宫格对比",
      });
    } else {
      outputs.push({
        name: "工艺纸张细节放大图",
        eligible: false,
        desc: "缺 局部微距特写",
      });
    }

    if (keys.includes("ad_area")) {
      outputs.push({
        name: "企业礼品广告定制图",
        eligible: true,
        desc: "含LOGO烫画演示",
      });
    } else {
      outputs.push({
        name: "企业礼品广告定制图",
        eligible: false,
        desc: "缺 局部广告位模布",
      });
    }

    return outputs;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const mockAssets: ProductAsset[] = [];
    // Start with a raw asset structure
    mockAssets.push({
      id: `ast_${newCode}_raw_cover`,
      productId: `prod_${newCode}`,
      assetType: "front_cover",
      fileUrl: "front",
      width: 800,
      height: 600,
      status: "ready",
    });

    const newProd: Product = {
      id: `prod_${newCode}`,
      productCode: newCode,
      productName: newName,
      productType: newType,
      seriesName: newSeries,
      year: "2026",
      size: "240mm * 170mm * 80mm",
      innerPageSize: "240mm * 150mm",
      adAreaSize: "240mm * 35mm",
      materialCover: "优质300g国风红卡",
      materialInner: "200g 超感双胶纸",
      thickness: "14张",
      pageCount: 14,
      packageType: "彩印礼纸提手包",
      weight: "0.42kg",
      boxQuantity: 40,
      status: "raw", // newly created needs transparent PNG refinement
      themeColor: newThemeColor,
      illustrationType: "dragon",
      assets: mockAssets,
    };

    onAddProduct(newProd);
    setSelectedProductId(newProd.id);
    setIsAdding(false);
    // incremental defaults
    setNewCode((prev) => (parseInt(prev) + 1).toString().padStart(3, "0"));
    setNewName("开运宏图");
  };

  const productTypesMap: Record<string, string> = {
    calendar: "台历",
    wall_calendar: "挂历",
    gift_box: "礼盒/套装",
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    raw: {
      label: "原实拍图/未精修",
      color: "bg-neutral-100 text-neutral-800 border-neutral-300",
    },
    white_bg_done: {
      label: "已做白底",
      color: "bg-sky-50 text-sky-700 border-sky-200",
    },
    png_done: {
      label: "已透PNG(无影)",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    completed: {
      label: "完整可套版",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    missing_assets: {
      label: "缺少基础细节",
      color: "bg-red-50 text-red-600 border-red-200",
    },
  };

  return (
    <div className="flex h-full min-h-[600px] bg-slate-50/20 overflow-hidden rounded-xl border border-slate-200/80">
      {/* 1. Left Selector Filters Block */}
      <div className="w-56 bg-white border-r p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-5">
          <div className="flex justify-between items-center pb-2 border-b">
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              资产过滤筛选
            </h4>
            <FolderOpen className="w-4 h-4 text-neutral-500" />
          </div>

          {/* Type picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">
              产品类型
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">全部类型</option>
              <option value="calendar">挂摆台历</option>
              <option value="wall_calendar">巨幅挂历</option>
              <option value="gift_box">奢华礼盒</option>
            </select>
          </div>

          {/* Series Picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">
              产品系列
            </label>
            <select
              value={filterSeries}
              onChange={(e) => setFilterSeries(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">全部系列</option>
              <option value="喜庆精雕">喜庆精雕</option>
              <option value="新中式">新中式</option>
              <option value="商务定制">商务定制</option>
              <option value="儿童插画">儿童插画</option>
              <option value="国潮年货">国潮年货</option>
            </select>
          </div>

          {/* Real Status Picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">
              资产质检状态
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="raw">原实拍未处理</option>
              <option value="white_bg_done">已制作白底JPG</option>
              <option value="png_done">已去背透明PNG</option>
              <option value="completed">可用全拼多功能</option>
              <option value="missing_assets">资产有缺失</option>
            </select>
          </div>

          {/* Quick instructions indicator details */}
          <div className="p-3 bg-blue-50/50 text-[10px] text-blue-950 rounded-xl border border-blue-100">
            <p className="font-bold flex items-center mb-1 text-blue-800">
              <Eye className="w-3.5 h-3.5 text-blue-600 mr-1" />
              资产包规范说明
            </p>
            台历生产设计需要提供标准的等比例「封面正面透明图」，线圈部分不得模糊残缺。
          </div>
        </div>

        {/* Add Product trigger button */}
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/10 active:scale-95 transition-all text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>登记新产品资产</span>
        </button>
      </div>

      {/* 2. Middle Cards list */}
      <div className="flex-1 bg-neutral-100/30 p-4 flex flex-col overflow-hidden">
        {/* Search header bar */}
        <div className="relative mb-3.5 shrink-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索产品编号、中式字号、系列标题..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* List scrollbox */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredProducts.map((p) => {
            const pct = getCompleteness(p);
            const isSel = p.id === selectedProductId;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                className={`bg-white rounded-xl border cursor-pointer select-none overflow-hidden flex flex-col justify-between transition-all duration-350 p-3 h-52 relative ${
                  isSel
                    ? "ring-2 ring-blue-600 shadow-md shadow-blue-500/10 border-transparent scale-98"
                    : "hover:border-slate-350 border-slate-150"
                }`}
              >
                {/* Image placeholder container */}
                <div className="relative h-28 w-full bg-neutral-100 rounded overflow-hidden p-1 flex items-center justify-center">
                  <VisualCalendar
                    product={p}
                    type="front_cover"
                    className="transform scale-90"
                  />
                  <span className="absolute top-1 left-1 font-mono text-[9px] bg-neutral-900/85 text-white px-1.5 py-0.2 rounded">
                    代码: {p.productCode}
                  </span>
                  <span className="absolute bottom-1 right-1 font-mono text-[9px] bg-white text-neutral-800 border shadow-xs px-1.5 py-0.2 rounded font-bold">
                    完整度: {pct}%
                  </span>
                </div>

                {/* Details text block */}
                <div className="mt-2 text-left">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xs font-bold text-neutral-800 truncate">
                      {p.productName}
                    </h3>
                    <span className="text-[10px] text-neutral-400">
                      {p.seriesName}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-1 text-[10px]">
                    <span className="text-neutral-500 truncate max-w-[130px]">
                      {productTypesMap[p.productType]} •{" "}
                      {p.size.split(" * ")[0]}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${statusMap[p.status]?.color}`}
                    >
                      {statusMap[p.status]?.label}
                    </span>
                  </div>
                </div>

                {/* Loading indicator overlay if empty */}
                {p.status === "raw" && (
                  <div className="absolute inset-0 bg-slate-500/5 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                    <span className="bg-blue-600 text-white text-[9px] font-bold py-1 px-2.5 rounded shadow">
                      原图急需白底精修
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-neutral-400 bg-white border border-dashed rounded">
              <AlertTriangle className="w-8 h-8 text-neutral-300 mb-2" />
              <p className="text-xs font-medium">
                无匹配台历产品，请放宽过滤限制或登记添加。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Right Assets Package Details view */}
      {selectedProduct && (
        <div className="w-80 bg-white border-l p-4 flex flex-col justify-between overflow-y-auto shrink-0">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h4 className="text-xs font-bold text-neutral-800 tracking-tight">
                产品细部资产树包
              </h4>
              <span className="text-[10px] bg-neutral-100 px-2 py-0.5 rounded font-mono font-bold text-neutral-600">
                {selectedProduct.productCode}
              </span>
            </div>

            {/* Micro Specs */}
            <div className="p-3 bg-neutral-50 rounded text-[11px] text-neutral-700 space-y-1.5 text-left">
              <div>
                <span className="text-neutral-400">大部名字:</span>{" "}
                <span className="font-bold text-neutral-900">
                  {selectedProduct.productName}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">款式大类:</span>{" "}
                <span className="font-semibold text-neutral-800">
                  {productTypesMap[selectedProduct.productType]}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">纸外规格:</span>{" "}
                <span className="font-mono text-neutral-800">
                  {selectedProduct.size}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">广告面板:</span>{" "}
                <span className="font-mono text-neutral-800">
                  {selectedProduct.adAreaSize}
                </span>
              </div>
              <div>
                <span className="text-neutral-400">封面材质:</span>{" "}
                <span className="text-neutral-700 line-clamp-1">
                  {selectedProduct.materialCover}
                </span>
              </div>
            </div>

            {/* Asset nodes lists */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  关联实体文件
                </h5>
                {/* Batch upload button */}
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-sm">
                  <Upload className="w-3.5 h-3.5" />
                  批量上传
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      const prod = selectedProduct;
                      if (!prod) return;

                      const fileList = Array.from(files);
                      const results: ProductAsset[] = [];

                      try {
                        for (let i = 0; i < fileList.length; i++) {
                          const file = fileList[i];
                          if (!file) continue;
                          const formData = new FormData();
                          formData.append("file", file as File);

                          const res = await fetch("/api/upload-asset", {
                            method: "POST",
                            body: formData,
                          });
                          if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

                          const data = await res.json();
                          const fileUrl = data.fileUrl as string;

                          // Get image dimensions
                          const dims = await new Promise<{ w: number; h: number }>((resolve) => {
                            const img = new window.Image();
                            img.onload = () => resolve({ w: img.width, h: img.height });
                            img.src = fileUrl;
                          });

                          results.push({
                            id: `ast_${prod.productCode}_photo_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
                            productId: prod.id,
                            assetType: "photo",
                            fileUrl,
                            width: dims.w,
                            height: dims.h,
                            status: "ready",
                            fileName: (file as File).name,
                          } as any);
                        }

                        onUpdateProductStatus(prod.id, prod.status, [
                          ...(prod.assets || []),
                          ...results,
                        ]);
                        setNewAssetIds(new Set(results.map((a) => a.id)));
                        setToast(`已导入 ${results.length} 张图片到 ${prod.productName}`);
                      } catch (err) {
                        console.error("Batch upload failed", err);
                        setToast("导入失败，请重试");
                      }

                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="space-y-1.5 text-xs max-h-64 overflow-y-auto pr-1">
                {/* Show all real assets as thumbnail cards */}
                {(selectedProduct.assets || []).length === 0 ? (
                  <div className="text-center py-6 text-[10px] text-slate-400">
                    <Image className="w-6 h-6 mx-auto mb-1 opacity-30" />
                    暂无资产文件，请上传图片
                  </div>
                ) : (
                  (selectedProduct.assets || []).map((asset) => {
                    const isNew = newAssetIds.has(asset.id);
                    const fileName =
                      (asset as any).fileName ||
                      asset.fileUrl?.split("/").pop()?.slice(0, 20) ||
                      asset.assetType;
                    const hasImage = asset.fileUrl && (asset.fileUrl.startsWith("data:") || asset.fileUrl.startsWith("/assets/"));

                    return (
                      <motion.div
                        key={asset.id}
                        initial={isNew ? { backgroundColor: "#dbeafe" } : undefined}
                        animate={{ backgroundColor: "transparent" }}
                        transition={{ duration: 2 }}
                        className="bg-slate-50/40 rounded-lg border border-slate-100 hover:bg-slate-50/80 transition-colors overflow-hidden"
                      >
                        {/* Thumbnail row */}
                        <div className="flex items-center gap-2 p-1.5">
                          {hasImage ? (
                            <img
                              src={asset.fileUrl}
                              alt={fileName}
                              className="w-12 h-12 object-cover rounded border bg-white shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded border bg-slate-200 flex items-center justify-center shrink-0">
                              <Image className="w-5 h-5 text-slate-400" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1 text-left">
                            <p className="font-medium truncate text-[10px] text-slate-700 leading-tight">
                              {fileName}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {asset.assetType}
                              {asset.width && asset.height
                                ? ` · ${asset.width}×${asset.height}`
                                : ""}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-0.5 shrink-0"
                            title="删除此资产"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}

                {/* Missing asset checklist (compact) */}
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <h6 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    待补充资产
                  </h6>
                  {[
                    { role: "transparent_png", label: "透明PNG" },
                    { role: "front_cover", label: "正面封面" },
                    { role: "inner_page", label: "内页展示" },
                    { role: "side", label: "侧面图" },
                    { role: "detail_ring", label: "线圈细节" },
                    { role: "detail_cover", label: "封面细节" },
                    { role: "detail_page", label: "纸张细节" },
                    { role: "detail_base", label: "底座细节" },
                    { role: "ad_area", label: "广告区域" },
                  ]
                    .filter(
                      (item) =>
                        !(selectedProduct.assets || []).some(
                          (a) => a.assetType === item.role,
                        ),
                    )
                    .slice(0, 4)
                    .map((item) => (
                      <div
                        key={item.role}
                        className="flex items-center justify-between py-0.5 px-1 text-[9px] text-slate-400"
                      >
                        <span>{item.label}</span>
                        <span className="bg-slate-100 px-1 py-0.2 rounded text-[8px]">待传</span>
                      </div>
                    ))}
                  {(selectedProduct.assets || []).length > 0 &&
                    [
                      "transparent_png", "front_cover", "inner_page", "side",
                      "detail_ring", "detail_cover", "detail_page", "detail_base", "ad_area",
                    ].filter(
                      (role) =>
                        !(selectedProduct.assets || []).some((a) => a.assetType === role),
                    ).length > 4 && (
                      <p className="text-[8px] text-slate-400 text-center mt-1">
                        + 更多待补充...
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* Possible generated options breakdown */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                套版可行性分析
              </h5>
              <div className="space-y-1 bg-stone-50 p-2.5 rounded border text-[11px]">
                {getPossibleOutputs(selectedProduct).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-1.5 py-1 justify-between"
                  >
                    <div>
                      <span
                        className={`font-bold ${item.eligible ? "text-neutral-800" : "text-neutral-400 line-through"}`}
                      >
                        {item.name}
                      </span>
                      <p className="text-[9px] text-neutral-400">{item.desc}</p>
                    </div>
                    {item.eligible ? (
                      <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">
                        支持
                      </span>
                    ) : (
                      <span className="text-[8px] bg-red-100 text-red-800 px-1 rounded font-bold">
                        不可用
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick action button to refine details */}
          {selectedProduct.status === "raw" && (
            <button
              onClick={() => onNavigateToRefine(selectedProduct)}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center space-x-1 shadow-sm transition-all animate-pulse"
            >
              <span>前往「白底精修」处理该原图</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 4. Add Product Modal Overlay */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50">
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md space-y-4 shadow-2xl relative text-left"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <FolderPlus className="w-5 h-5 mr-1.5 text-blue-605" />
                登记新印刷台历款式
              </h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-neutral-500 font-bold mb-1">
                  产品编号 / 编码
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-neutral-50 border rounded p-2 focus:ring-1 focus:ring-red-500 text-xs text-neutral-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-neutral-500 font-bold mb-1">
                  名录款式名称
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-neutral-50 border rounded p-2 focus:ring-1 focus:ring-red-500 text-xs text-neutral-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-neutral-500 font-bold mb-1">
                  产品类型
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-neutral-50 border rounded p-2 text-xs"
                >
                  <option value="calendar">挂摆台历</option>
                  <option value="wall_calendar">巨幅挂历</option>
                  <option value="gift_box">奢华礼盒</option>
                </select>
              </div>
              <div>
                <label className="block text-neutral-500 font-bold mb-1">
                  系列分类
                </label>
                <select
                  value={newSeries}
                  onChange={(e) => setNewSeries(e.target.value as any)}
                  className="w-full bg-neutral-50 border rounded p-2 text-xs"
                >
                  <option value="国潮年货">国潮年货</option>
                  <option value="国画山水">新中式</option>
                  <option value="喜庆精雕">喜庆精雕</option>
                  <option value="儿童插画">儿童插画</option>
                  <option value="商务定制">商务定制</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-neutral-500 font-bold mb-1">
                视觉主题色彩 (封面配色)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={newThemeColor}
                  onChange={(e) => setNewThemeColor(e.target.value)}
                  className="w-10 h-8 rounded border p-0.5 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={newThemeColor}
                  onChange={(e) => setNewThemeColor(e.target.value)}
                  className="bg-neutral-50 border rounded p-1.5 font-mono text-xs text-neutral-800"
                />
              </div>
            </div>

            <div className="p-3 bg-neutral-50 border rounded text-[10px] text-neutral-500">
              提示:
              创建的新产品状态默认为「未处理实拍图（待白底精修）」，您随后可以在白底抠图面板中对其上传并一键跑出透明蒙版及自然阴影层。
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm shadow-blue-500/10 transition-all"
              >
                确认创建登记
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Toast notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </motion.div>
      )}
    </div>
  );
};
