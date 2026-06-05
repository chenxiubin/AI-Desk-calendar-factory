import { RunningHubWorkflowConfig } from "../types";

export async function uploadImageToRunningHub(fileOrBlob: File | Blob): Promise<{ fileName: string }> {
  const formData = new FormData();
  formData.append("file", fileOrBlob);

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

export async function runSceneFusion(payload: {
  baseImageDataUrl: string;
  workflowConfig: RunningHubWorkflowConfig;
  prompt: string;
  negativePrompt: string;
  denoise: number;
  seed: number;
}): Promise<{ taskId: string }> {
  const res = await fetch("/api/runninghub/scene-fusion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to initiate scene fusion: ${errText}`);
  }

  return res.json();
}
