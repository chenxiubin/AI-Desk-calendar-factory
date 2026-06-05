import { RunningHubWorkflowConfig } from "../types";

export async function uploadImageToRunningHub(fileOrBlob: File | Blob): Promise<{ fileName: string }> {
  const formData = new FormData();
  formData.append("image", fileOrBlob);

  const res = await fetch("/api/runninghub/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upload to RunningHub: ${errText}`);
  }

  return res.json();
}

export async function createRunningHubTask(payload: {
  workflowId: string;
  nodeInfoList: any[];
  apiMode?: "comfyui_openapi" | "run_workflow_v2";
}): Promise<{ taskId: string; taskStatus: string }> {
  const res = await fetch("/api/runninghub/create-task", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create task on RunningHub: ${errText}`);
  }

  return res.json();
}

export async function queryRunningHubOutputs(
  taskId: string,
  apiMode?: "comfyui_openapi" | "run_workflow_v2"
): Promise<{
  status: "idle" | "uploading" | "queued" | "running" | "completed" | "failed";
  outputUrl?: string;
  errorMessage?: string;
}> {
  const res = await fetch("/api/runninghub/query-result", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ taskId, apiMode }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to query outputs from RunningHub: ${errText}`);
  }

  return res.json();
}

export async function runWorkflowV2(payload: {
  workflowId: string;
  nodeInfoList: any[];
}): Promise<{ taskId: string; status: string }> {
  const res = await fetch("/api/runninghub/run-workflow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to run workflow on RunningHub V2: ${errText}`);
  }

  return res.json();
}

export async function queryRunningHubResult(taskId: string): Promise<{
  status: "idle" | "uploading" | "queued" | "running" | "completed" | "failed";
  outputUrl?: string;
  errorMessage?: string;
}> {
  return queryRunningHubOutputs(taskId, "run_workflow_v2");
}

export async function runSceneFusion(payload: {
  baseImageDataUrl: string;
  workflowConfig: RunningHubWorkflowConfig;
  prompt: string;
  negativePrompt: string;
  denoise: number;
  seed: number;
  steps?: number;
  cfg?: number;
}): Promise<{ taskId: string; warning?: string }> {
  // Ensure we default apiMode to run_workflow_v2
  const enrichedPayload = {
    ...payload,
    workflowConfig: {
      ...payload.workflowConfig,
      apiMode: payload.workflowConfig.apiMode || "run_workflow_v2"
    }
  };

  const res = await fetch("/api/runninghub/scene-fusion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(enrichedPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`RunningHub scene fusion request failed: ${errText}`);
  }

  return res.json();
}
