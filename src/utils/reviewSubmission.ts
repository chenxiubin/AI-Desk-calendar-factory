import { Template } from "../types";

export interface ReviewSubmitPageInput {
  template: Template;
  pageGroup: string;
  required: boolean;
}

export interface ReviewSubmitResult {
  success: boolean;
  project: any;
  totalPages: number;
  errors: string[];
}

/** Submit project workspace templates as a review snapshot */
export async function submitProjectForReview(
  projectWorkspaceId: string,
  projectName: string,
  productId: string,
  productName: string,
  suiteRootId: string,
  suiteName: string,
  pages: ReviewSubmitPageInput[],
): Promise<ReviewSubmitResult> {
  const errors: string[] = [];
  const payload: any = {
    projectWorkspaceId,
    projectName,
    productId,
    productName,
    suiteRootId,
    suiteName,
    pages: [],
  };

  for (let i = 0; i < pages.length; i++) {
    const { template, pageGroup, required } = pages[i];
    try {
      // Generate a small preview image from the template
      let previewUrl = "";
      try {
        const { renderFullPreviewImage } = await import("./renderTemplate");
        // Use a dummy product for preview generation
        const dummyProduct = {
          id: productId,
          productCode: "",
          productName,
          assets: [],
        } as any;
        const dataUrl = await renderFullPreviewImage(dummyProduct, template);
        // Upload the preview to review-assets
        const base64 = dataUrl.split(",")[1];
        const byteString = atob(base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
        const blob = new Blob([ab], { type: "image/jpeg" });

        const formData = new FormData();
        formData.append("file", blob, `preview_${i}.jpg`);
        const uploadRes = await fetch("/api/review-assets", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          previewUrl = uploadData.fileUrl;
        }
      } catch (e) {
        console.warn("Preview generation failed for page", i, e);
      }

      // Auto-check: basic validation
      const autoIssues: any[] = [];
      if (!template.outputWidth || !template.outputHeight || template.outputWidth <= 0 || template.outputHeight <= 0) {
        autoIssues.push({ code: "wrong_size", message: "输出尺寸无效", source: "automatic" });
      }
      const hasLayers = (template.components && template.components.length > 0) || (template.slots && template.slots.length > 0);
      if (!hasLayers) {
        autoIssues.push({ code: "missing_asset", message: "页面无图层或槽位", source: "automatic" });
      }

      const p = template.outputWidth && template.outputHeight
        ? Math.round((template.outputWidth / template.outputHeight) * 100) / 100
        : 1;

      payload.pages.push({
        projectTemplateId: template.id,
        pageName: template.templateName || `Page ${i + 1}`,
        pageGroup,
        width: template.outputWidth || 0,
        height: template.outputHeight || 0,
        aspectRatio: template.aspectRatio || `${template.outputWidth}:${template.outputHeight}`,
        required,
        previewUrl,
        templateSnapshot: template,
        issues: autoIssues,
      });
    } catch (err: any) {
      errors.push(`Page ${i + 1}: ${err.message}`);
    }
  }

  if (payload.pages.length === 0) {
    return { success: false, project: null, totalPages: 0, errors: ["No valid pages to submit"] };
  }

  const res = await fetch("/api/reviews/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    errors.push(errData.error || `Submit failed: ${res.status}`);
    return { success: false, project: null, totalPages: payload.pages.length, errors };
  }

  const project = await res.json();
  return { success: true, project, totalPages: payload.pages.length, errors };
}
