export type RunningHubMattingConfig = {
  enabled: boolean;
  apiBaseUrl: string;
  apiKey?: string;
  workflowId: string;
  inputImageNodeId?: string;
  baseImageNodeId?: string;
  transparentPngNodeId?: string;
  whiteBgNodeId?: string;
  maskNodeId?: string;
  pollIntervalMs: number;
  maxPollCount: number;
};

export const runningHubMattingConfig: RunningHubMattingConfig = {
  enabled: import.meta.env.VITE_RUNNINGHUB_ENABLED === "true",

  apiBaseUrl: import.meta.env.VITE_RUNNINGHUB_API_BASE_URL || "",

  apiKey: import.meta.env.VITE_RUNNINGHUB_API_KEY || "",

  workflowId: import.meta.env.VITE_RUNNINGHUB_MATTING_WORKFLOW_ID || "2063802342654431234",

  inputImageNodeId: import.meta.env.VITE_RUNNINGHUB_MATTING_INPUT_IMAGE_NODE_ID || "129",

  baseImageNodeId: import.meta.env.VITE_RUNNINGHUB_MATTING_BASE_IMAGE_NODE_ID || "",

  transparentPngNodeId: import.meta.env.VITE_RUNNINGHUB_MATTING_TRANSPARENT_PNG_NODE_ID || "159",

  whiteBgNodeId: import.meta.env.VITE_RUNNINGHUB_MATTING_WHITE_BG_NODE_ID || "",

  maskNodeId: import.meta.env.VITE_RUNNINGHUB_MATTING_MASK_NODE_ID || "",

  pollIntervalMs: Number(import.meta.env.VITE_RUNNINGHUB_POLL_INTERVAL_MS || 3000),

  maxPollCount: Number(import.meta.env.VITE_RUNNINGHUB_MAX_POLL_COUNT || 60),
};
