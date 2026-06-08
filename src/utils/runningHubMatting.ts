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
      const res = await fetch(imageUrlOrBase64);
      blob = await res.blob();
    } else {
      throw new Error("无效的图片格式或 URL");
    }

    // Upload base image to RunningHub
    const uploadResult = await uploadImageToRunningHub(blob);
    fileName = uploadResult.fileName;
  }

  // Construct node list for matting
  const nodeInfoList: any[] = [];
  if (workflowConfig.baseImageNodeId && fileName) {
    nodeInfoList.push({
      nodeId: workflowConfig.baseImageNodeId,
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
  const status: "queued" | "running" | "completed" | "failed" =
    data.status === "completed"
      ? "completed"
      : data.status === "failed"
      ? "failed"
      : data.status === "running"
      ? "running"
      : "queued";

  return {
    status,
    results: data.results || (data.outputUrl ? [data.outputUrl] : undefined),
    errorMessage: data.errorMessage
  };
}
