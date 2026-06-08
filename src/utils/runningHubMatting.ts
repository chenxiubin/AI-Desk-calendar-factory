import { RunningHubWorkflowConfig } from "../types";
import { uploadImageToRunningHub, createRunningHubTask } from "../services/runninghubClient";

interface RunMattingParams {
  imageUrlOrBase64: string;
  workflowConfig: RunningHubWorkflowConfig;
}

export async function runRunningHubMatting({
  imageUrlOrBase64,
  workflowConfig
}: RunMattingParams): Promise<{ taskId: string }> {
  if (!workflowConfig || !workflowConfig.workflowId) {
    throw new Error("请先配置 RunningHub 抠图工作流 (workflowId 为空)");
  }

  const imageNodeId = workflowConfig.baseImageNodeId || workflowConfig.inputImageNodeId;
  if (!imageNodeId) {
    throw new Error("RunningHub 抠图工作流缺少输入图片节点配置。");
  }

  let fileName = "";
  if (imageUrlOrBase64) {
    let blob: Blob;
    if (imageUrlOrBase64.startsWith("data:")) {
      const parts = imageUrlOrBase64.split(",");
      const byteString = atob(parts[1]);
      const mimeString = parts[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      blob = new Blob([ab], { type: mimeString });
    } else if (imageUrlOrBase64.startsWith("http")) {
      try {
        const res = await fetch(imageUrlOrBase64);
        blob = await res.blob();
      } catch (error) {
        throw new Error("无法从浏览器直接读取远程图片，可能是 CORS 限制。请使用本地上传图片，或后续通过后端代理上传到 RunningHub。");
      }
    } else {
      throw new Error("无效的图片格式或 URL");
    }

    // Upload base image to RunningHub
    const uploadResult = await uploadImageToRunningHub(blob);
    fileName = uploadResult.fileName;
  }

  // Construct node list for matting
  const nodeInfoList: any[] = [];
  if (imageNodeId && fileName) {
    nodeInfoList.push({
      nodeId: imageNodeId,
      fieldName: workflowConfig.baseImageFieldName || "image",
      fieldValue: fileName
    });
  }

  // Use createRunningHubTask helper to trigger comfyui workflow
  const result = await createRunningHubTask({
    workflowId: workflowConfig.workflowId,
    nodeInfoList,
    apiMode: workflowConfig.apiMode || "run_workflow_v2"
  });

  return {
    taskId: result.taskId
  };
}

function normalizeResultUrl(item: unknown): string {
  if (!item) return "";
  if (typeof item === "string") return item;

  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    return String(
      obj.url ||
      obj.fileUrl ||
      obj.imageUrl ||
      obj.outputUrl ||
      obj.resultUrl ||
      ""
    ).trim();
  }

  return "";
}

function normalizeResultUrls(data: any): string[] {
  if (!data) return [];
  const rawResults =
    data.results ||
    data.data?.results ||
    data.outputs ||
    data.data?.outputs ||
    data.result ||
    data.data?.result ||
    [];

  if (Array.isArray(rawResults)) {
    return rawResults.map(normalizeResultUrl).filter(Boolean);
  }

  const singleUrl = normalizeResultUrl(rawResults) || normalizeResultUrl(data.outputUrl);
  return singleUrl ? [singleUrl] : [];
}

export async function pollRunningHubTask(taskId: string): Promise<{
  status: "queued" | "running" | "completed" | "failed";
  results?: string[];
  errorMessage?: string;
}> {
  const res = await fetch("/api/runninghub/query-result", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ taskId })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`轮询任务状态失败: ${errText}`);
  }

  const data = await res.json();
  const rawStatus = String(data.status || "").toLowerCase();
  let status: "queued" | "running" | "completed" | "failed" = "queued";

  if (["completed", "success", "succeeded", "finish", "finished"].includes(rawStatus)) {
    status = "completed";
  } else if (["failed", "error", "fail"].includes(rawStatus)) {
    status = "failed";
  } else if (["running", "processing", "pending", "queued"].includes(rawStatus)) {
    status = "running";
  } else {
    // Fallback: if we have valid results URLs, assume completed
    const results = normalizeResultUrls(data);
    if (results.length > 0) {
      status = "completed";
    }
  }

  return {
    status,
    results: normalizeResultUrls(data),
    errorMessage: data.errorMessage || data.message
  };
}
