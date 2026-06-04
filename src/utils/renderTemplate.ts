import { Product, ProductAsset, Template, TemplateSlot, TextField } from "../types";

export let DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true" || false;

export function setDemoMode(val: boolean) {
  DEMO_MODE = val;
}

export interface RenderOffsets {
  hOffset?: number; // slider percent offset -50 to 50
  vOffset?: number; // slider percent offset -50 to 50
  scale?: number;   // scale factor multiplier 0.5 to 1.5
}

/**
 * Main entrance to async render product & template to an HTML5 canvas,
 * returning a high-quality dataURL representing the finished layout.
 */
export async function renderTemplateToCanvas(
  product: Product,
  template: Template,
  offsets?: {
    hOffset?: number;
    vOffset?: number;
    scale?: number;
  }
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = template.outputWidth || 800;
  canvas.height = template.outputHeight || 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not construct 2D canvas context");
  }

  // Set anti-aliasing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1. Draw scenery/background layers
  drawBackground(ctx, template, canvas.width, canvas.height);

  // 2. Sort slots by layer index to enforce correct overlay order
  const sortedSlots = [...template.slots].sort((a, b) => (a.layer || 0) - (b.layer || 0));

  // 3. Draw each slot
  for (const slot of sortedSlots) {
    await drawSlot(ctx, product, slot, canvas.width, canvas.height, offsets);
  }

  // 4. Draw vector text overlays
  drawTextFields(ctx, product, template, canvas.width, canvas.height);

  // 5. Output beautiful JPG/PNG based on export settings
  const format = template.exportSettings?.format === "PNG" ? "image/png" : "image/jpeg";
  const quality = (template.exportSettings?.quality || 90) / 100;
  
  return canvas.toDataURL(format, quality);
}

/**
 * Renders backdrop gradients, studio tabletop floors and shadow partitions
 */
function drawBackground(ctx: CanvasRenderingContext2D, template: Template, w: number, h: number) {
  const bg = template.background;

  if (bg.type === "color") {
    ctx.fillStyle = bg.color || "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
  } else if (bg.type === "gradient") {
    // Custom gradient linear fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (bg.gradient) {
      // Parse gradient colors if available (fallback to red)
      ctx.fillStyle = bg.gradient; // can be inline color definition if complex CSS setup
      ctx.fillRect(0, 0, w, h);
    } else {
      grad.addColorStop(0, "#F8FAFC");
      grad.addColorStop(1, "#E2E8F0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    // Scene-based table photo studios
    const style = bg.sceneStyle || "warm_light";

    if (style === "warm_light") {
      // Warm studio: rich beige/amber warm spotlight
      const grad = ctx.createRadialGradient(w / 2, h * 0.4, w * 0.1, w / 2, h * 0.4, w * 0.9);
      grad.addColorStop(0, "#FEFDF8");
      grad.addColorStop(0.5, "#FAF3E3");
      grad.addColorStop(1, "#E8DCBE");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Horizontal tabletop edge line (realistic 3D setup)
      ctx.strokeStyle = "rgba(180, 160, 140, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.72);
      ctx.lineTo(w, h * 0.72);
      ctx.stroke();

      // Lower tabletop floor overlay
      const floorGrad = ctx.createLinearGradient(0, h * 0.72, 0, h);
      floorGrad.addColorStop(0, "rgba(235, 222, 202, 0.5)");
      floorGrad.addColorStop(1, "rgba(205, 192, 172, 0.6)");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, h * 0.72, w, h - h * 0.72);

    } else if (style === "beige_paper") {
      // Light linen textured paper
      const grad = ctx.createRadialGradient(w / 2, h * 0.35, 30, w / 2, h * 0.35, w * 0.75);
      grad.addColorStop(0, "#FAF6F0");
      grad.addColorStop(1, "#EADCB9");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Wooden divider line
      ctx.strokeStyle = "rgba(139, 90, 43, 0.25)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.68);
      ctx.lineTo(w, h * 0.68);
      ctx.stroke();

      // Table shadow
      const floorGrad = ctx.createLinearGradient(0, h * 0.68, 0, h);
      floorGrad.addColorStop(0, "#DFCFAB");
      floorGrad.addColorStop(1, "#CCBA93");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, h * 0.68, w, h - h * 0.68);

    } else if (style === "studio_white") {
      // Professional slate catalog
      const grad = ctx.createRadialGradient(w / 2, h * 0.4, w * 0.1, w / 2, h * 0.4, w * 0.85);
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(0.6, "#F1F5F9");
      grad.addColorStop(1, "#E2E8F0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Shadow division
      ctx.strokeStyle = "rgba(200, 210, 220, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.70);
      ctx.lineTo(w, h * 0.70);
      ctx.stroke();

      const floorGrad = ctx.createLinearGradient(0, h * 0.70, 0, h);
      floorGrad.addColorStop(0, "rgba(226, 232, 240, 0.4)");
      floorGrad.addColorStop(1, "rgba(203, 213, 225, 0.5)");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, h * 0.70, w, h - h * 0.70);

    } else if (style === "luxury_gold") {
      // Dark gold / elegant boutique setup
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#1F2937");
      grad.addColorStop(1, "#111827");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Golden ledge
      ctx.strokeStyle = "#D97706";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.75);
      ctx.lineTo(w, h * 0.75);
      ctx.stroke();

      const floorGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
      floorGrad.addColorStop(0, "#1B2230");
      floorGrad.addColorStop(1, "#0B0F19");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, h * 0.75, w, h - h * 0.75);

    } else if (style === "festive_red") {
      // Chinese Imperial New Year Gold Stamp style
      const grad = ctx.createRadialGradient(w / 2, h * 0.35, 10, w / 2, h * 0.35, w * 0.8);
      grad.addColorStop(0, "#EF4444");
      grad.addColorStop(0.7, "#DC2626");
      grad.addColorStop(1, "#7F1D1D");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Golden brass divider shelf
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.70);
      ctx.lineTo(w, h * 0.70);
      ctx.stroke();

      const floorGrad = ctx.createLinearGradient(0, h * 0.70, 0, h);
      floorGrad.addColorStop(0, "rgba(153, 27, 27, 0.4)");
      floorGrad.addColorStop(1, "rgba(99, 12, 12, 0.6)");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, h * 0.70, w, h - h * 0.70);
    }
  }
}

/**
 * Finds the correct asset from product based on the slot's requirements and fallbacks.
 */
export function findMatchingAsset(product: Product, slotAssetType: string): ProductAsset | undefined {
  if (!product.assets || product.assets.length === 0) return undefined;

  // 1. 如果 slot.assetType 有明确值，优先匹配对应 assetType
  let exactMatch = product.assets.find((a) => a.status === "ready" && a.assetType === slotAssetType);
  if (exactMatch) return exactMatch;

  // 2. 只有 front_cover / white_bg / 主产品槽(transparent_png) 找不到对应资产时，才 fallback 到 transparent_png
  const fallbackAllowedTypes = ["front_cover", "white_bg", "transparent_png"];
  if (fallbackAllowedTypes.includes(slotAssetType)) {
    let fallbackPng = product.assets.find((a) => a.status === "ready" && a.assetType === "transparent_png");
    if (fallbackPng) return fallbackPng;
  }

  // 3. inner_page、side、detail_ring、detail_cover、detail_page、detail_base、ad_area 不允许默认 fallback 到 transparent_png。
  return undefined;
}

/**
 * Dynamically renders product vector graphics onto a separate offscreen canvas 
 * and returns a PNG dataURL. This preserves high-fidelity drawing while ensuring 
 * the image load pipeline runs smoothly with exact dimensions.
 */
export function generateDynamicAssetDataUrl(product: Product, assetType: string): string {
  const canvas = document.createElement("canvas");
  
  // Choose standard natural dimensions
  let w = 800;
  let h = 600;
  if (assetType === "side") {
    w = 600;
    h = 800;
  } else if (assetType === "ad_area") {
    w = 800;
    h = 300;
  }
  
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw the respective premium vector artwork
  if (assetType === "front_cover" || assetType === "transparent_png" || assetType === "white_bg") {
    drawVectorCover(ctx, product, 0, 0, w, h);
  } else if (assetType === "inner_page") {
    drawVectorInnerPage(ctx, product, 0, 0, w, h);
  } else if (assetType === "side") {
    drawVectorSide(ctx, product, 0, 0, w, h);
  } else if (assetType === "ad_area") {
    drawVectorAdArea(ctx, product, 0, 0, w, h);
  } else if (assetType.startsWith("detail_")) {
    drawVectorDetail(ctx, product, assetType, 0, 0, w, h);
  } else {
    drawVectorCover(ctx, product, 0, 0, w, h);
  }

  return canvas.toDataURL("image/png");
}

/**
 * Draws slotted container items
 */
async function drawSlot(
  ctx: CanvasRenderingContext2D,
  product: Product,
  slot: TemplateSlot,
  cw: number,
  ch: number,
  offsets?: RenderOffsets
) {
  // 1. Calculate bounding box from percentages
  const boxW = cw * (slot.maxWidth / 100);
  const boxH = ch * (slot.maxHeight / 100);

  // 2. Base slot center coordinate
  let slotCenterX = cw * (slot.x / 100);
  let slotCenterY = ch * (slot.y / 100);

  // 3. Inject manual fine tune scroll bar adjustment coordinates
  const hOffset = ((offsets?.hOffset || 0) / 100) * cw;
  const vOffset = ((offsets?.vOffset || 0) / 100) * ch;
  const scaleF = offsets?.scale !== undefined ? offsets.scale : 1.0;

  const finalW = boxW * scaleF;
  const finalH = boxH * scaleF;
  const finalX = slotCenterX + hOffset;
  const finalY = slotCenterY + vOffset;

  // 4. Resolve the product asset to load
  const matchingAsset = findMatchingAsset(product, slot.assetType || "front_cover");
  let assetUrl = "";

  if (matchingAsset && matchingAsset.fileUrl) {
    const isPlaceholder = ["front", "inner", "side", "pdf", "png", "ring", "det_cov", "det_pg", "det_base", "ad", "white_bg"].includes(matchingAsset.fileUrl);
    if (isPlaceholder) {
      if (!DEMO_MODE) {
        throw new Error("产品资产缺失或加载失败");
      }
      assetUrl = generateDynamicAssetDataUrl(product, matchingAsset.assetType);
    } else {
      assetUrl = matchingAsset.fileUrl;
    }
  } else {
    throw new Error("产品资产缺失或加载失败");
  }

  // 5. Load the actual image, and calculate accurate aspect ratio preserving containment
  let img: HTMLImageElement;
  try {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("产品资产缺失或加载失败"));
      i.src = assetUrl;
    });
  } catch (err) {
    console.warn("Failed to load product image resource:", assetUrl, err);
    throw new Error("产品资产缺失或加载失败");
  }

  const scale = Math.min(finalW / img.width, finalH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;

  // Anchor alignment logic
  let drawX = 0;
  let drawY = 0;

  if (slot.anchor === "bottom_center") {
    drawX = finalX - drawW / 2;
    drawY = finalY - drawH;
  } else {
    // Default: center anchor
    drawX = finalX - drawW / 2;
    drawY = finalY - drawH / 2;
  }

  // 6. Draw Drop Shadow underneath the product
  if (slot.shadowRule && slot.shadowRule !== "very_light_shadow_or_none") {
    ctx.save();
    const shadowY = drawY + drawH + 1;
    const shadowX = drawX + drawW / 2;
    const shadowRadiusX = drawW * 0.45;
    const shadowRadiusY = drawH * 0.08;

    // Soft blur shadow ellipse
    ctx.translate(shadowX, shadowY);
    ctx.scale(1, shadowRadiusY / shadowRadiusX);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowRadiusX);
    const opacity = slot.shadowRule === "strong_desk_contact_shadow" ? 0.35 : 0.22;
    grad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
    grad.addColorStop(0.4, `rgba(0, 0, 0, ${opacity * 0.5})`);
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, shadowRadiusX, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  // 7. Draw the loaded high-quality image resource onto the canvas
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

/**
 * Programmatic front-cover calendar board vector
 */
function drawVectorCover(ctx: CanvasRenderingContext2D, p: Product, dx: number, dy: number, dw: number, dh: number) {
  const brandRed = p.themeColor || "#DC2626";

  // 1. Double grey rigid backboard stand footer
  ctx.fillStyle = "#1E293B"; // slate stand
  roundRect(ctx, dx, dy + dh * 0.90, dw, dh * 0.10, Math.max(2, dw * 0.015));
  ctx.fill();

  // 2. Main paper panel background
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, dx, dy + dh * 0.04, dw, dh * 0.88, Math.max(3, dw * 0.02));
  ctx.fill();

  // 3. Gold layout border inset
  ctx.strokeStyle = brandRed;
  ctx.lineWidth = Math.max(1, dw * 0.008);
  ctx.stroke();

  // Color Banner core
  const inset = dw * 0.04;
  ctx.fillStyle = brandRed;
  roundRect(ctx, dx + inset, dy + dh * 0.10, dw - inset * 2, dh * 0.68, Math.max(2, dw * 0.015));
  ctx.fill();

  // White inner borders on cover banner
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4. Draw metal binder ring hanger loops on top
  drawWireBinders(ctx, dx, dy + dh * 0.04 - 2, dw, dh * 0.07);

  // 5. Year badge calligraphy and illustrations
  ctx.fillStyle = "#FBBF24"; // Amber gold
  ctx.font = `bold ${Math.round(dw * 0.04)}px "Inter", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("PREMIUM ART EDITION", dx + dw / 2, dy + dh * 0.22);

  // Year numerals
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `black ${Math.round(dw * 0.18)}px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.fillText(p.year || "2026", dx + dw / 2, dy + dh * 0.40);

  // Chinese calligraphy background mockup representation
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.font = `black ${Math.round(dw * 0.22)}px "Playfair Display", serif`;
  ctx.textAlign = "center";
  ctx.fillText("龍", dx + dw / 2, dy + dh * 0.58);
  ctx.restore();

  // Title name text
  ctx.fillStyle = "#FDE68A"; // Very bright soft gold yellow
  ctx.font = `bold ${Math.round(dw * 0.075)}px sans-serif`;
  ctx.fillText(p.productName || "策马奔腾", dx + dw / 2, dy + dh * 0.58);

  // Series subtitle
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `medium ${Math.round(dw * 0.045)}px sans-serif`;
  ctx.fillText(`―― ${p.seriesName}系列 ――`, dx + dw / 2, dy + dh * 0.68);

  // 6. Base Advertisement brass strip
  ctx.fillStyle = "#FEF3C7"; // Gold paper base
  roundRect(ctx, dx + inset * 1.5, dy + dh * 0.70, dw - inset * 3, dh * 0.07, 3);
  ctx.fill();

  ctx.fillStyle = "#78350F"; // dark brown
  ctx.font = `semibold ${Math.round(dw * 0.03)}px "Inter", sans-serif`;
  ctx.fillText("🏢 客户专属广告区域 (金银烫印)", dx + dw / 2, dy + dh * 0.75);
}

/**
 * Programmatic white inner grid calendar page
 */
function drawVectorInnerPage(ctx: CanvasRenderingContext2D, p: Product, dx: number, dy: number, dw: number, dh: number) {
  const brandRed = p.themeColor || "#DC2626";

  // Base stand footer
  ctx.fillStyle = "#334155";
  roundRect(ctx, dx, dy + dh * 0.90, dw, dh * 0.10, Math.max(2, dw * 0.012));
  ctx.fill();

  // Base paper panel backdrop
  ctx.fillStyle = "#FCFAF7";
  roundRect(ctx, dx, dy + dh * 0.04, dw, dh * 0.88, Math.max(3, dw * 0.018));
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw wire binder loops
  drawWireBinders(ctx, dx, dy + dh * 0.04 - 2, dw, dh * 0.07);

  // Calendar Heading month
  ctx.fillStyle = "#1E293B";
  ctx.font = `bold ${Math.round(dw * 0.055)}px serif`;
  ctx.textAlign = "left";
  ctx.fillText("一 月   JANUARY", dx + dw * 0.06, dy + dh * 0.18);

  // Product small banner right
  ctx.fillStyle = brandRed;
  roundRect(ctx, dx + dw * 0.68, dy + dh * 0.13, dw * 0.26, dh * 0.05, 3);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${Math.round(dw * 0.03)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(p.productName, dx + dw * 0.81, dy + dh * 0.165);

  // Draws lines divider
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dx + dw * 0.06, dy + dh * 0.22);
  ctx.lineTo(dx + dw * 0.94, dy + dh * 0.22);
  ctx.stroke();

  // Calendars mini-table draw grid math
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const cellW = (dw * 0.88) / 7;
  const cellH = (dh * 0.52) / 6;
  const gridStartX = dx + dw * 0.06;
  const gridStartY = dy + dh * 0.28;

  // Render headers
  ctx.font = `bold ${Math.round(dw * 0.035)}px sans-serif`;
  weekdays.forEach((day, idx) => {
    ctx.fillStyle = idx === 0 || idx === 6 ? "#EF4444" : "#64748B";
    ctx.textAlign = "center";
    ctx.fillText(day, gridStartX + idx * cellW + cellW / 2, gridStartY);
  });

  // Render numbers starts index (Jan 2026 Thursday starts at index 4)
  ctx.font = `bold ${Math.round(dw * 0.032)}px "JetBrains Mono", monospace`;
  let dayCount = 1;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 7; c++) {
      const idx = r * 7 + c;
      if (idx >= 4 && dayCount <= 31) {
        const x = gridStartX + c * cellW + cellW / 2;
        const y = gridStartY + dh * 0.08 + r * cellH;

        // Weekend coloring
        const isWeekend = c === 0 || c === 6;
        ctx.fillStyle = isWeekend ? "#EF4444" : "#334155";

        // Highlight Jan 1st
        if (dayCount === 1) {
          ctx.beginPath();
          ctx.arc(x, y - dh * 0.012, dw * 0.022, 0, 2 * Math.PI);
          ctx.fillStyle = "#EF4444";
          ctx.fill();
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText("1", x, y);
        } else {
          ctx.fillText(dayCount.toString(), x, y);
        }

        dayCount++;
      }
    }
  }

  // Footer design indices metadata style
  ctx.fillStyle = "#94A3B8";
  ctx.font = `normal ${Math.round(dw * 0.028)}px "JetBrains Mono", monospace`;
  ctx.textAlign = "left";
  ctx.fillText(`CODE: ${p.productCode}`, dx + dw * 0.06, dy + dh * 0.85);

  ctx.textAlign = "right";
  ctx.fillText(`SIZE: ${p.innerPageSize.split(" * ")[0]}`, dx + dw * 0.94, dy + dh * 0.85);
}

/**
 * Programmatic side angled perspective wire calendar stand mesh
 */
function drawVectorSide(ctx: CanvasRenderingContext2D, p: Product, dx: number, dy: number, dw: number, dh: number) {
  const brandRed = p.themeColor || "#DC2626";

  // Light horizontal shadow
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.fillRect(dx, dy + dh * 0.90, dw, dh * 0.05);

  // Isometric stand projection geometry
  const midX = dx + dw * 0.45;
  const topY = dy + dh * 0.12;

  // Left slanted paper boards representation
  ctx.fillStyle = "#E2E8F0";
  ctx.beginPath();
  ctx.moveTo(midX - dw * 0.30, topY);
  ctx.lineTo(midX + dw * 0.35, topY - dh * 0.04);
  ctx.lineTo(midX + dw * 0.32, dy + dh * 0.80);
  ctx.lineTo(midX - dw * 0.33, dy + dh * 0.84);
  ctx.closePath();
  ctx.fill();

  // Desk stance wood foot vector
  ctx.fillStyle = "#1E293B";
  ctx.beginPath();
  ctx.moveTo(midX - dw * 0.36, dy + dh * 0.84);
  ctx.lineTo(midX + dw * 0.32, dy + dh * 0.80);
  ctx.lineTo(midX + dw * 0.28, dy + dh * 0.92);
  ctx.lineTo(midX - dw * 0.40, dy + dh * 0.96);
  ctx.closePath();
  ctx.fill();

  // Tilted main page cover overlapping
  ctx.fillStyle = brandRed;
  ctx.beginPath();
  ctx.moveTo(midX - dw * 0.22, topY + dh * 0.05);
  ctx.lineTo(midX + dw * 0.42, topY + dh * 0.01);
  ctx.lineTo(midX + dw * 0.38, dy + dh * 0.78);
  ctx.lineTo(midX - dw * 0.26, dy + dh * 0.82);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.20)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Wire loop on perspective
  ctx.strokeStyle = "#A1A1AA";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(midX + dw * 0.10, topY + dh * 0.02, dw * 0.05, Math.PI, 2 * Math.PI);
  ctx.stroke();

  // Standard label font overlays
  ctx.fillStyle = "#FDE68A";
  ctx.font = `bold ${Math.round(dw * 0.05)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("立体防偏稳", midX + dw * 0.1, dy + dh * 0.35);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `medium ${Math.round(dw * 0.04)}px sans-serif`;
  ctx.fillText("60°重心设计", midX + dw * 0.1, dy + dh * 0.45);
}

/**
 * Simple bottom banner customization block
 */
function drawVectorAdArea(ctx: CanvasRenderingContext2D, p: Product, dx: number, dy: number, dw: number, dh: number) {
  ctx.fillStyle = "#111827";
  roundRect(ctx, dx, dy, dw, dh, 6);
  ctx.fill();

  ctx.strokeStyle = "#FEF3C7";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#D97706";
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = "center";
  ctx.fillText("CALENDAR BASE ADVERTISING BLOCK", dx + dw / 2, dy + dh * 0.25);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = 'bold 18px serif';
  ctx.fillText(`★ 企业专属广告区: ${p.adAreaSize} ★`, dx + dw / 2, dy + dh * 0.58);

  ctx.fillStyle = "#9CA3AF";
  ctx.font = '11px sans-serif';
  ctx.fillText("推荐采用精修烫印工艺（金箔/银箔/红金/激光全息）", dx + dw / 2, dy + dh * 0.82);
}

/**
 * Draws extreme close up quality detail segments
 */
function drawVectorDetail(ctx: CanvasRenderingContext2D, p: Product, assetType: string, dx: number, dy: number, dw: number, dh: number) {
  const brandRed = p.themeColor || "#DC2626";

  // Detail frame header block
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(dx, dy, dw, dh);

  if (assetType === "detail_ring") {
    // Zoomed in gold coil iron wire loop segments
    ctx.fillStyle = "#F1F5F9";
    ctx.fillRect(dx, dy, dw, dh);

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dx, dy + dh * 0.45);
    ctx.lineTo(dx + dw, dy + dh * 0.45);
    ctx.stroke();

    // 5 bold gold rings overlay
    ctx.fillStyle = "#F59E0B";
    const ringW = dw * 0.055;
    const ringH = dh * 0.64;
    const spacing = dw * 0.15;

    for (let i = 0; i < 5; i++) {
      const rx = dx + dw * 0.13 + i * spacing;
      const ry = dy + dh * 0.16;
      ctx.save();
      ctx.strokeStyle = "#D97706";
      ctx.lineWidth = 3.5;
      ctx.fillStyle = "#FEF3C7";
      roundRect(ctx, rx, ry, ringW, ringH, ringW / 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = "#4B5563";
    ctx.font = `bold ${Math.round(dw * 0.038)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("双线哑金加粗五金线圈", dx + dw / 2, dy + dh * 0.90);

  } else if (assetType === "detail_cover") {
    // Zoomed Cover embossed relief glyph with heavy shadows
    ctx.fillStyle = brandRed;
    ctx.fillRect(dx, dy, dw, dh);

    // Decorative golden box
    ctx.strokeStyle = "rgba(253, 230, 138, 0.4)";
    ctx.lineWidth = 4;
    ctx.strokeRect(dx + dw * 0.1, dy + dh * 0.1, dw * 0.8, dh * 0.8);

    // Embossed center design glyph
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;

    ctx.fillStyle = "#FEF3C7"; // Gold paint
    ctx.font = `bold ${Math.round(dw * 0.32)}px serif`;
    ctx.textAlign = "center";
    ctx.fillText("福", dx + dw / 2, dy + dh * 0.58);
    ctx.restore();

    ctx.fillStyle = "#FDE68A";
    ctx.font = `semibold ${Math.round(dw * 0.040)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("局部立体浮金/激光磨砂工艺", dx + dw / 2, dy + dh * 0.82);

  } else if (assetType === "detail_page") {
    // Zoomed overlapping heavy 250g premium paper profiles
    ctx.fillStyle = "#FCFAF7";
    ctx.fillRect(dx, dy, dw, dh);

    // Draw three slanted sheet edges with gradients
    ctx.save();
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = "rgba(226, 232, 240, 0.8)";
      ctx.lineWidth = 1;
      ctx.fillStyle = i === 2 ? "#FFFFFF" : "#F4EFE6";
      ctx.shadowColor = "rgba(0,0,0,0.05)";
      ctx.shadowBlur = i * 4 + 2;

      ctx.beginPath();
      ctx.moveTo(dx + dw * (0.12 + i * 0.05), dy + dh * 0.10);
      ctx.lineTo(dx + dw * (0.8 + i * 0.05), dy + dh * 0.15);
      ctx.lineTo(dx + dw * (0.7 + i * 0.05), dy + dh * 0.85);
      ctx.lineTo(dx + dw * (0.05 + i * 0.05), dy + dh * 0.80);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "#1E293B";
    ctx.font = `bold ${Math.round(dw * 0.045)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("250g超感哑光特种艺术纸", dx + dw / 2, dy + dh * 0.92);

  } else if (assetType === "detail_base") {
    // Zoomed in protective thick lacquer backboard stand base corner
    ctx.fillStyle = "#1E293B"; // deep navy charcoal
    ctx.fillRect(dx, dy, dw, dh);

    // Draw multi-layered grey core board cut
    ctx.fillStyle = "#475569";
    ctx.fillRect(dx + dw * 0.20, dy + dh * 0.15, dw * 0.60, dh * 0.60);

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(dx + dw * 0.20, dy + dh * 0.15, dw * 0.60, dh * 0.60);

    ctx.fillStyle = "#64748B";
    ctx.fillRect(dx + dw * 0.22, dy + dh * 0.17, dw * 0.56, dh * 0.56);

    ctx.fillStyle = "#38BDF8"; // info blue highlight
    ctx.font = `bold ${Math.round(dw * 0.045)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("3.5mm加厚安全防滑双灰板", dx + dw / 2, dy + dh * 0.88);
  } else {
    ctx.fillStyle = "#CCCCCC";
    ctx.fillRect(dx, dy, dw, dh);
  }
}

/**
 * Draws persistent top ring coils to make calendars look beautifully authentic!
 */
function drawWireBinders(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Grey background binder bar
  ctx.fillStyle = "#E2E8F0";
  ctx.fillRect(x + w * 0.05, y, w * 0.90, h * 0.35);

  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + w * 0.05, y, w * 0.90, h * 0.35);

  // Draw 14 tiny wire binder rings
  const ringCount = 14;
  const step = (w * 0.86) / (ringCount - 1);
  const startX = x + w * 0.07;
  const rWidth = w * 0.016;

  ctx.fillStyle = "#64748B"; // deep grey loop metal
  for (let i = 0; i < ringCount; i++) {
    const rx = startX + i * step - rWidth / 2;
    // Tiny rounded metallic coil loop
    roundRect(ctx, rx, y + h * 0.10, rWidth, h * 0.70, rWidth / 2);
    ctx.fill();
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

/**
 * Implements clean dynamic vector text alignment, mapping tag replacement correctly
 */
function drawTextFields(ctx: CanvasRenderingContext2D, p: Product, t: Template, cw: number, ch: number) {
  const fields = t.textFields || [];

  for (const field of fields) {
    let text = field.content || "";

    // Replace dynamic placeholders as requested
    if (field.isDynamic) {
      text = text.replace("[productName]", p.productName || "");
      if (text.includes("[productCode]")) {
        text = text.replace("[productCode]", p.productCode || "");
      }
      if (text.includes("[size]")) {
        text = text.replace("[size]", p.size || "");
      }
      if (text.includes("[seriesName]")) {
        text = text.replace("[seriesName]", p.seriesName || "");
      }
      if (text.includes("[materialCover]")) {
        text = text.replace("[materialCover]", p.materialCover || "");
      }
      if (text.includes("[materialInner]")) {
        text = text.replace("[materialInner]", p.materialInner || "");
      }
      if (text.includes("[thickness]")) {
        text = text.replace("[thickness]", p.thickness || "");
      }
    }

    // Positions from percentages
    const tx = cw * (field.x / 100);
    const ty = ch * (field.y / 100);

    ctx.save();
    
    // Choose appropriate web font weights
    let fontStyle = "";
    if (field.fontWeight && field.fontWeight.includes("bold")) fontStyle = "bold ";
    if (field.fontWeight && field.fontWeight.includes("extrabold")) fontStyle = "900 ";

    let finalFontStr = `${fontStyle}${field.fontSize}px sans-serif`;
    if (field.fontFamily === "font-mono" || field.fontFamily?.includes("mono")) {
      finalFontStr = `${fontStyle}${field.fontSize}px "JetBrains Mono", monospace`;
    } else if (field.fontFamily === "font-serif" || field.fontFamily?.includes("serif")) {
      finalFontStr = `${fontStyle}${field.fontSize}px "Playfair Display", serif`;
    }

    ctx.font = finalFontStr;
    ctx.fillStyle = field.color || "#000000";
    ctx.textAlign = field.align || "center";
    ctx.textBaseline = "middle";

    // Draw text with a very subtle overlay stroke for high contrast
    if (field.color === "#FFFFFF" || field.color === "rgba(255,255,255,1)" || field.color === "#fff") {
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
    }

    ctx.fillText(text, tx, ty);
    ctx.restore();
  }
}

/**
 * Standard rounding tool
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
