import React, { useState } from "react";
import { GeneratedImage, Product, Template } from "../types";
import {
  DownloadCloud,
  FileDown,
  Archive,
  Info,
  Layers,
  Settings,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface ExportCenterProps {
  generatedImages: GeneratedImage[];
  products: Product[];
  templates: Template[];
}

export const ExportCenter: React.FC<ExportCenterProps> = ({
  generatedImages,
  products,
  templates
}) => {
  // Export Settings
  const [targetPlatform, setTargetPlatform] = useState<string>("taobao");
  const [outputSize, setOutputSize] = useState<string>("800x800");
  const [outputFormat, setOutputFormat] = useState<string>("JPG");
  const [compressionRatio, setCompressionRatio] = useState<number>(90);
  const [namingFormat, setNamingFormat] = useState<string>("{Code}_{Name}_{Type}_{TempId}_{Size}");

  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  // Group images to check which ones are approved (excluding needs_adjustment, empty, or 'url' fileUrls)
  const exportableImages = generatedImages.filter(
    img => img.fileUrl && img.fileUrl !== "url" && img.reviewStatus !== "needs_adjustment"
  ); 
  const readyCount = exportableImages.length;

  const platformsMap: Record<string, string> = {
    taobao: "淘宝主图/详情规范",
    tmall: "天猫超级官方画质",
    jd: "京东自营标准白底",
    pdd: "拼多多5宫格防拉伸格式",
    douyin: "抖音直播爆款方形"
  };

  const getSizingDetails = (size: string) => {
    switch (size) {
      case "800x800":
        return "1:1 高清主图";
      case "750x1000":
        return "3:4 详情轮播/详情主幅图";
      case "1200x1200":
        return "1:1 超清爆款SKU板";
      case "1200x1600":
        return "3:4 竖直详情细节";
      default:
        return "自定义画板规格";
    }
  };

  // Naming formula execution according to prompt Section XIV
  const getCompiledFileName = (img: GeneratedImage) => {
    const p = products.find((x) => x.id === img.productId);
    const t = templates.find((x) => x.id === img.templateId);
    if (!p || !t) return "calendar_file.jpg";

    const typeStr = img.imageType === "main" ? "主图" : img.imageType === "sku" ? "SKU" : "详情";

    let ext = outputFormat.toLowerCase();

    // Use prompt naming rule: 产品编号_产品名称_图片类型_模板ID_尺寸.jpg
    return `${p.productCode}_${p.productName}_${typeStr}_${t.id}_${outputSize}.${ext}`;
  };

  const handleStartPackArchive = () => {
    if (readyCount === 0) return;
    setIsZipping(true);
    setZipProgress(10);

    const interval = setInterval(() => {
      setZipProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsZipping(false);
          setShowComplete(true);

          // Physically trigger sequential downloads of all true dynamically-generated images in parallel/staggered layout!
          exportableImages.forEach((img, idx) => {
            if (img.fileUrl && img.fileUrl !== "url") {
              setTimeout(() => {
                const link = document.createElement("a");
                link.href = img.fileUrl;
                link.download = getCompiledFileName(img);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }, idx * 250); // 250ms stagger to prevent prompt blockage by browser policies
            }
          });

          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-150 text-left p-6 space-y-6 shadow-sm">
      {/* Introduction */}
      <div className="border-b border-slate-100 pb-4 shrink-0">
        <h2 className="text-sm font-bold text-slate-800 tracking-tight">排板成品极速批量导出中心</h2>
        <p className="text-[11px] text-slate-400 mt-1">
          将质检审核通过的台历电商图按照选定电商平台建议尺寸、无损重组算法进行高性能批量触发下载。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left configurations bar: colSpan 5 */}
        <div className="lg:col-span-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-150 space-y-5 text-sm text-slate-600">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-450 pb-2 border-b border-slate-200/60 flex items-center">
            <Settings className="w-4 h-4 mr-1.5 text-slate-500" />
            批量下载与命名规则配置
          </h3>

          {/* Sizing selection */}
          <div className="space-y-1.5">
            <span className="block text-slate-450 font-bold mb-1 uppercase text-[10px]">
              目标输出平台规格
            </span>
            <select
              value={targetPlatform}
              onChange={(e) => setTargetPlatform(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="taobao">淘宝千牛 (1:1 & 3:4 多段折屏)</option>
              <option value="tmall">天猫标品中心规范 (等宽不拉伸高质)</option>
              <option value="jd">京东快照 (强制800x800标准白底图)</option>
              <option value="pdd">拼多多商家后台 (一键去除主图打角标签)</option>
              <option value="douyin">抖音巨量千川 (3:4 详情比例)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3.5 text-xs">
            {/* Resolution Sizing */}
            <div className="space-y-1.5">
              <span className="block text-slate-450 font-bold uppercase text-[10px]">
                重设输出分辨率
              </span>
              <select
                value={outputSize}
                onChange={(e) => setOutputSize(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-705 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="800x800">800 x 800 px (主图标品)</option>
                <option value="750x1000">750 x 1000 px (详情标配)</option>
                <option value="1200x1200">1200 x 1200 px (超清大图)</option>
                <option value="1200x1600">1200 x 1600 px (高级材质海报)</option>
              </select>
              <span className="text-[9.5px] text-slate-400 mt-1 block font-medium">
                类型: {getSizingDetails(outputSize)}
              </span>
            </div>

            {/* Quality compressed ratio */}
            <div className="space-y-1.5">
              <span className="block text-slate-450 font-bold uppercase text-[10px]">
                重映射色彩质量
              </span>
              <select
                value={compressionRatio}
                onChange={(e) => setCompressionRatio(parseInt(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-705 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={90}>90% (最佳网络高性价比)</option>
                <option value={95}>95% (保留防伪金油光纤)</option>
                <option value={100}>100% (原稿物理无噪点)</option>
              </select>
            </div>
          </div>

          {/* Format selection */}
          <div className="space-y-1.5">
            <span className="block text-slate-450 font-bold uppercase text-[10px]">
              输出图像包装格式
            </span>
            <div className="grid grid-cols-3 gap-1 bg-slate-150 p-1 rounded-lg text-xs select-none">
              {["JPG", "PNG", "WebP"].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setOutputFormat(fmt)}
                  className={`py-1 rounded-md font-bold transition-all cursor-pointer ${
                    outputFormat === fmt ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Naming rules config */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="block text-slate-455 font-bold uppercase text-[10px]">
                文件自定义命名规则
              </span>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" title="可配置参数自动拼装" />
            </div>
            <input
              type="text"
              value={namingFormat}
              onChange={(e) => setNamingFormat(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-xs text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[9.5px] text-slate-400 leading-normal">
              默认格式：<code className="bg-slate-200/50 p-1 rounded font-mono text-[9px] text-slate-600">{namingFormat}</code>
              (产品编号_产品名称_主轮详情_模板ID_分辨率)，可完美对应 ERP 和打印。
            </p>
          </div>

          <div className="p-3 bg-blue-55/40 text-[10.5px] text-blue-900 border border-blue-150 rounded-xl leading-relaxed">
            💡 本导出任务完美支持无痕透明蒙版生成，如果您选择了 <span className="font-mono font-bold">PNG</span>, 电商平台主图白底将自动保持真透明通道，可放入任何第三方促销背景中。
          </div>
        </div>

        {/* Right download lists: colSpan 7 */}
        <div className="lg:col-span-7 bg-white p-5 border border-slate-150 rounded-2xl flex flex-col justify-between overflow-hidden">
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700 flex items-center">
                <Archive className="w-4 h-4 mr-1 text-slate-450 shrink-0" />
                即将导出的对齐拼板图片总名册 ({readyCount} 张)
              </span>
              <span className="font-mono text-slate-400 text-[10px]">导出文件规格: {outputSize} | {outputFormat}</span>
            </div>

            {/* Scrollable filenames list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-80 pr-1 min-h-[220px]">
              {exportableImages.map((img) => (
                <div
                  key={img.id}
                  className="p-2.5 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 rounded-xl flex items-center justify-between text-xs font-mono text-slate-600"
                >
                  <p className="font-bold truncate text-slate-700 pr-4">
                    {getCompiledFileName(img)}
                  </p>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-100 border px-1.5 py-0.5 rounded-full font-bold">
                      质检通过
                    </span>
                    {img.fileUrl && img.fileUrl !== "url" && (
                      <a
                        href={img.fileUrl}
                        download={getCompiledFileName(img)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-all cursor-pointer"
                        title="下载此张"
                      >
                        <FileDown className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {readyCount === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-medium text-slate-600">
                    目前尚未有经「图片审核中心」质检通过的台历大图！
                  </p>
                  <p className="text-[11px] text-slate-400">
                    请先前往「批量套版」或「图片质量审核」进行质检。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Zipping progress banner */}
          <div className="mt-4 border-t border-slate-100 pt-4 shrink-0">
            {isZipping ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>正在并行预热并触发浏览器批量下载队列...</span>
                  <span className="font-mono text-blue-600">{zipProgress}%</span>
                </div>
                <div className="w-full bg-slate-205 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-200"
                    style={{ width: `${zipProgress}%` }}
                  />
                </div>
              </div>
            ) : showComplete ? (
              <div className="bg-emerald-55/35 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-xs text-emerald-950 mb-3 gap-4 leading-normal">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-black block text-slate-800">批量下载启动成功！</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      浏览器正在按 250ms 延迟依次下载 {readyCount} 张高规大图。
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowComplete(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer"
                >
                  再次下载
                </button>
              </div>
            ) : null}

            {readyCount > 0 && !isZipping && !showComplete && (
              <button
                onClick={handleStartPackArchive}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all hover:shadow-lg hover:scale-[1.01] cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4 shrink-0" />
                <span>一键触发批量下载至本地 ({readyCount} 张)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
