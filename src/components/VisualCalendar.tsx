import React from "react";
import { Product } from "../types";

interface VisualCalendarProps {
  product: Product;
  type:
    | "front_cover"
    | "inner_page"
    | "side"
    | "detail_ring"
    | "detail_cover"
    | "detail_page"
    | "detail_base"
    | "ad_area"
    | "white_bg"
    | "transparent_png";
  className?: string;
  isNakedPNG?: boolean; // If true, rendering with transparent background and no ambient shadow
}

export const VisualCalendar: React.FC<VisualCalendarProps> = ({
  product,
  type,
  className = "",
  isNakedPNG = false,
}) => {
  const brandRed = product.themeColor || "#DC2626";

  const realPngAsset = product.assets?.find(
    (a) =>
      a.assetType === "transparent_png" &&
      a.status === "ready" &&
      a.fileUrl &&
      a.fileUrl.startsWith("data:"),
  );

  if (
    realPngAsset &&
    (type === "transparent_png" ||
      type === "white_bg" ||
      type === "front_cover")
  ) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <img
          src={realPngAsset.fileUrl}
          alt={product.productName}
          className="max-w-full max-h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Different rendering styles based on the catalog choice (dragon pattern, landscape watercolor, calligraphy)
  const renderIllustration = () => {
    switch (product.illustrationType) {
      case "dragon":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-15 pointer-events-none p-4">
            {/* Dragon Emblem Icon Grid */}
            <div className="w-24 h-24 border-4 border-dashed rounded-full flex items-center justify-center text-4xl font-serif">
              龍
            </div>
            <div className="text-xs tracking-widest mt-2">
              D R A G O N 2 0 2 6
            </div>
          </div>
        );
      case "landscape":
        return (
          <div className="absolute bottom-0 inset-x-0 h-1/2 opacity-30 pointer-events-none overflow-hidden select-none">
            {/* Water mountains overlay */}
            <svg
              viewBox="0 0 100 50"
              preserveAspectRatio="none"
              className="w-full h-full fill-current text-teal-800"
            >
              <path d="M0,50 Q20,10 40,35 T80,20 T100,50 Z" />
              <path d="M0,50 Q15,30 30,40 T70,30 T100,50 Z" opacity="0.5" />
            </svg>
          </div>
        );
      case "cartoon":
        return (
          <div className="absolute bottom-3 right-3 w-16 h-16 opacity-40 rounded-full bg-amber-200 border-2 border-amber-400 flex items-center justify-center text-xs text-amber-800 font-bold p-1">
            🎈 Happy Days
          </div>
        );
      case "calligraphy":
      default:
        return (
          <div className="absolute inset-x-0 bottom-4 text-center opacity-10 font-serif font-black text-6xl tracking-widest select-none pointer-events-none">
            萬象更新
          </div>
        );
    }
  };

  // 1. Cover View
  const renderCover = () => {
    return (
      <div className="w-full h-full flex flex-col bg-white border border-neutral-100 rounded shadow-inner overflow-hidden relative">
        {/* Wire Binding Header */}
        <div className="h-6 w-full bg-neutral-200 border-b border-neutral-300 flex justify-around items-center px-4 relative z-10 shrink-0">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-3.5 bg-neutral-400 rounded-b border border-neutral-500 shadow-sm"
            />
          ))}
        </div>

        {/* Dynamic Theme Banner */}
        <div
          className="flex-1 p-4 flex flex-col justify-between items-center relative text-white"
          style={{ backgroundColor: brandRed }}
        >
          {renderIllustration()}

          {/* Border Deco */}
          <div className="absolute inset-3 border border-white/20 rounded pointer-events-none" />

          {/* Golden Badge and Year */}
          <div className="flex flex-col items-center mt-2 z-10">
            <span className="text-xs bg-amber-400 text-amber-950 font-bold px-2 py-0.5 rounded-full tracking-widest uppercase shadow-sm">
              PREMIUM CALENDAR
            </span>
            <h1 className="text-4xl font-mono font-black mt-1.5 tracking-tighter text-amber-100 drop-shadow">
              {product.year}
            </h1>
          </div>

          {/* Product Calligraphy Title */}
          <div className="flex flex-col items-center my-auto z-10">
            <h2 className="text-3xl font-serif font-extrabold tracking-widest bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 bg-clip-text text-transparent drop-shadow-md">
              {product.productName}
            </h2>
            <p className="text-xs tracking-wider text-amber-200/95 mt-1 font-sans">
              ― {product.seriesName}系列 / 限量套版 ―
            </p>
          </div>

          {/* AD local panel (adAreaSize representation) */}
          <div className="w-full h-7 bg-amber-100 text-neutral-800 text-[10px] flex items-center justify-center font-semibold rounded border border-amber-300 shadow overflow-hidden relative z-10 shrink-0 select-none">
            <span className="text-amber-900 tracking-wide">
              🏢 企业定制广告区域（可烫制金银双色LOGO）
            </span>
          </div>
        </div>

        {/* Triangle Base Footer Stand */}
        <div className="h-6 w-full bg-neutral-800 flex justify-center items-center shrink-0">
          <div className="w-5/6 h-1 border-t border-neutral-600 opacity-60" />
        </div>
      </div>
    );
  };

  // 2. Inner Page View
  const renderInnerPage = () => {
    return (
      <div className="w-full h-full flex flex-col bg-stone-50 border border-neutral-100 rounded shadow-inner overflow-hidden relative">
        {/* Wire Binding Header */}
        <div className="h-6 w-full bg-neutral-200 border-b border-neutral-300 flex justify-around items-center px-4 relative z-10 shrink-0">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-3.5 bg-neutral-400 rounded-b border border-neutral-500 shadow-sm"
            />
          ))}
        </div>

        {/* Calendar Grid Body */}
        <div className="flex-1 p-3 flex flex-col justify-between relative bg-white">
          {renderIllustration()}

          {/* Month Indicator */}
          <div className="flex justify-between items-baseline border-b pb-1.5 z-10">
            <div>
              <span className="text-2xl font-serif font-black text-neutral-800">
                一 月
              </span>
              <span className="text-sm font-mono font-medium text-neutral-400 ml-1">
                JANUARY
              </span>
            </div>
            <div className="text-right">
              <span
                className="text-sm font-semibold tracking-wider px-2 py-0.5 rounded text-white text-[11px]"
                style={{ backgroundColor: brandRed }}
              >
                {product.productName}
              </span>
            </div>
          </div>

          {/* Grid content */}
          <div className="grid grid-cols-7 gap-1 mt-2 text-center text-[10px] z-10 flex-1">
            {/* Days names */}
            {["日", "一", "二", "三", "四", "五", "六"].map((day, idx) => (
              <span
                key={day}
                className={`font-semibold pb-1 border-b text-neutral-400 ${idx === 0 || idx === 6 ? "text-red-500" : ""}`}
              >
                {day}
              </span>
            ))}
            {/* Dummy Calendars days for 2026 Jan (Starts on Thursday) */}
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={`empty-${i}`} className="text-neutral-200" />
            ))}
            {Array.from({ length: 31 }).map((_, i) => {
              const dayNum = i + 1;
              const isWeekend =
                (dayNum + 4) % 7 === 0 || (dayNum + 4) % 7 === 1;
              const isSpecial = dayNum === 1 || dayNum === 23; // Chinese New Year
              return (
                <div
                  key={dayNum}
                  className="flex flex-col items-center justify-center p-0.5 rounded relative hover:bg-neutral-50"
                >
                  <span
                    className={`font-mono font-bold ${isWeekend ? "text-red-500" : "text-neutral-700"} ${isSpecial ? "text-white bg-red-600 rounded-full w-4 h-4 flex items-center justify-center text-[9px]" : ""}`}
                  >
                    {dayNum}
                  </span>
                  {isSpecial && (
                    <span className="text-[7px] text-red-600 scale-75 mt-0.5">
                      元旦
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Custom Ad block */}
          <div className="h-6 w-full border-t border-dashed mt-2 pt-1 flex items-center justify-between text-[9px] text-neutral-400 z-10 shrink-0">
            <span>设计编号: {product.productCode}</span>
            <span className="mr-1 text-center font-serif text-neutral-500 uppercase tracking-widest">
              {product.seriesName}
            </span>
          </div>
        </div>

        {/* Base Stand */}
        <div className="h-6 w-full bg-neutral-850 flex justify-center items-center shrink-0">
          <div className="w-11/12 h-0.5 bg-neutral-700 opacity-40" />
        </div>
      </div>
    );
  };

  // 3. Side Structure View (45 deg perspective angle)
  const renderSideStructure = () => {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-50 border border-neutral-200 rounded shadow-md p-4 relative overflow-hidden">
        {/* Isometric side triangle mockup */}
        <div className="w-36 h-48 relative flex items-center justify-center">
          {/* Wire Ring Accent */}
          <div className="absolute top-1 left-8 right-8 h-4 border-2 border-neutral-400 bg-neutral-200 rounded-full z-20 flex justify-around px-2">
            <span className="w-1.5 h-full bg-neutral-500 rounded-full" />
            <span className="w-1.5 h-full bg-neutral-500 rounded-full" />
            <span className="w-1.5 h-full bg-neutral-500 rounded-full" />
          </div>

          {/* Back page (slanted) */}
          <div className="absolute top-4 w-28 h-36 bg-stone-100 border border-neutral-300 rounded transform -skew-x-12 rotate-3 shadow-sm z-10" />

          {/* Left profile stand triangle */}
          <div className="absolute bottom-6 w-24 h-36 border-l-4 border-b-4 border-t-2 border-neutral-300 transform skew-y-12 rotate-6 z-0 flex items-center justify-center bg-neutral-100 shadow-inner">
            <span className="text-[10px] font-mono text-neutral-500 rotate-90 scale-75">
              1000g灰板
            </span>
          </div>

          {/* Front page slanted */}
          <div
            className="absolute top-6 w-28 h-36 border border-neutral-200 rounded transform -skew-x-6 -rotate-3 shadow-md z-30 flex flex-col p-2 text-white"
            style={{ backgroundColor: brandRed }}
          >
            <div className="border border-white/20 flex-1 flex flex-col items-center justify-around rounded p-1">
              <span className="text-[9px] tracking-widest">2026 YEAR</span>
              <span className="text-sm font-bold truncate max-w-full">
                {product.productName}
              </span>
              <span className="text-[8px] bg-amber-400 text-amber-950 px-1 py-0.2 rounded font-sans">
                {product.seriesName}
              </span>
            </div>
          </div>

          {/* Floor base line annotation */}
          <div className="absolute bottom-0 w-44 h-1.5 bg-neutral-600 rounded-full opacity-70 blur-xs" />
        </div>

        {/* Visual labels overlay */}
        <div className="absolute right-2 top-10 flex flex-col items-start gap-1 p-1 bg-white/90 rounded text-[9px] shadow-sm border border-neutral-100 max-w-[130px]">
          <span className="font-bold text-amber-805 text-[10px]">
            侧面三角黄金学
          </span>
          <p className="text-neutral-500">60%大迎角配重</p>
          <p className="text-neutral-600">三角重心结构，大风吹不倒</p>
        </div>
      </div>
    );
  };

  // 4. Zoomed Details (cover, page, ring, base)
  const renderDetailZoom = () => {
    let title = "";
    let colorStyle = "";
    let contentEl = null;

    switch (type) {
      case "detail_ring":
        title = "金属双线圈工艺";
        colorStyle = "from-amber-200 to-amber-500";
        contentEl = (
          <div className="flex flex-col items-center justify-center flex-1 py-3">
            <div className="flex space-x-1 mb-2 bg-neutral-100 p-2 rounded border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-1.5 h-10 bg-amber-400 rounded-sm shadow-md border-b-2 border-amber-600 animate-pulse" />
                  <div className="w-3 h-1 bg-neutral-300 mt-1 rounded-sm" />
                </div>
              ))}
            </div>
            <p className="text-neutral-500 text-[10px] text-center px-4">
              双股五金加粗哑金线圈，不易变形，翻页顺畅 360° 无卡顿。
            </p>
          </div>
        );
        break;

      case "detail_cover":
        title = "特种压浮雕工艺";
        colorStyle = "from-red-600 to-rose-800";
        contentEl = (
          <div
            className="flex flex-col items-center justify-center flex-1 py-3 text-white"
            style={{ backgroundColor: brandRed }}
          >
            <div className="relative border border-white/30 rounded p-3 text-center w-5/6">
              <div className="absolute top-1 left-1 text-[8px] opacity-75">
                GOLD EMBOSSED
              </div>
              <span className="text-2xl font-serif tracking-widest bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent font-extrabold p-2 border-2 border-amber-300/40 rounded inline-block">
                囍 / 福
              </span>
              <p className="text-[9px] mt-2 text-amber-100/90 font-sans">
                红卡立体烫金、局部UV激光镂空
              </p>
            </div>
          </div>
        );
        break;

      case "detail_page":
        title = "纸张质感与厚度";
        colorStyle = "from-stone-100 to-amber-50";
        contentEl = (
          <div className="flex flex-col items-center justify-center flex-1 p-3 bg-stone-100 border-t">
            <div className="flex items-end space-x-0.5 bg-white p-2 rounded shadow-sm relative overflow-hidden">
              <div className="w-2 h-14 bg-stone-200 rotate-6 transform translate-x-2 shadow-xs" />
              <div className="w-2 h-14 bg-stone-200 rotate-6 transform translate-x-1 shadow-xs" />
              <div className="w-2 h-14 bg-white border border-stone-300 rotate-6 transform shadow-sm" />
              <div className="absolute right-1 top-2 bg-emerald-100 text-emerald-800 text-[8px] font-mono px-1 rounded">
                250g重型纸
              </div>
            </div>
            <p className="text-neutral-600 text-[10px] text-center mt-2 px-2">
              日本进口重型新感超感纸，吸墨圆润，字迹不渗透、不易显黄。
            </p>
          </div>
        );
        break;

      case "detail_base":
      default:
        title = "加厚安全防护防滑底座";
        colorStyle = "from-neutral-700 to-neutral-900";
        contentEl = (
          <div className="flex flex-col items-center justify-center flex-1 p-3 bg-neutral-900 text-neutral-300">
            <div className="w-full flex justify-between items-center bg-neutral-800 border border-neutral-700 p-2 rounded">
              <span className="text-[10px] font-mono text-neutral-400">
                底托厚度: 3.5mm
              </span>
              <span className="text-[9px] bg-red-650 text-white px-1.5 py-0.2 rounded">
                精压双灰板
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-2 text-center line-clamp-2">
              饰哑光漆布，防水耐脏不滑移，承载10斤重力持久稳固。
            </p>
          </div>
        );
        break;
    }

    return (
      <div
        className={`w-full h-full flex flex-col bg-white border border-neutral-200 rounded shadow-sm overflow-hidden`}
      >
        {/* Segment Title */}
        <div
          className={`py-1.5 px-3 bg-gradient-to-r ${colorStyle} font-sans font-bold text-xs text-white flex justify-between items-center shrink-0`}
        >
          <span>{title}</span>
          <span className="text-[9px] font-mono opacity-80">ZOOM 400%</span>
        </div>
        {/* Dynamic Detail Content */}
        {contentEl}
      </div>
    );
  };

  // 5. Ad custom zone representation
  const renderAdArea = () => {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center bg-stone-900 p-2 border-2 border-dashed border-amber-500/80 rounded relative text-center">
        <div className="absolute inset-1 border border-amber-500/30 rounded pointer-events-none" />
        <span className="text-[9px] text-amber-500 font-mono tracking-widest mb-1">
          CALENDAR BASE ADVERTISING BLOCK
        </span>
        <h3 className="text-amber-100 text-lg font-serif font-black tracking-widest truncate max-w-full px-2">
          ★ 完美广告位: {product.adAreaSize} ★
        </h3>
        <p className="text-neutral-400 text-[10px] mt-1 max-w-[90%]">
          企业 LOGO / 祝语定制区域。推荐烫金金、烫哑银等 5 大烫印色彩。
        </p>
        <div className="flex gap-2 mt-2">
          {["烫金", "烫银", "烫蓝", "烫黑"].map((color) => (
            <span
              key={color}
              className="text-[8px] bg-amber-400/20 text-amber-300 border border-amber-300/30 px-1 rounded"
            >
              {color}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (type) {
      case "front_cover":
      case "transparent_png":
      case "white_bg":
        return renderCover();
      case "inner_page":
        return renderInnerPage();
      case "side":
        return renderSideStructure();
      case "detail_ring":
      case "detail_cover":
      case "detail_page":
      case "detail_base":
        return renderDetailZoom();
      case "ad_area":
        return renderAdArea();
      default:
        return renderCover();
    }
  };

  // Outer Wrapper with Ambient Frame / Shadows
  return (
    <div
      className={`w-full h-full relative group transition-all duration-300 ${!isNakedPNG ? "drop-shadow-sm hover:drop-shadow-md" : ""} ${className}`}
    >
      {renderContent()}
    </div>
  );
};
