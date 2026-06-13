import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configure assets upload structure
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limits
});

// Ensure assets output directory exists
const assetDir = path.join(process.cwd(), "assets");
if (!fs.existsSync(assetDir)) {
  fs.mkdirSync(assetDir, { recursive: true });
}
app.use("/assets", express.static(assetDir));

const templateStoreDir = path.join(process.cwd(), "template-store");
const templateStoreFile = path.join(templateStoreDir, "templates.json");
if (!fs.existsSync(templateStoreDir)) {
  fs.mkdirSync(templateStoreDir, { recursive: true });
}

// Retrieve system-wide keys secured silently
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const RUNNINGHUB_API_KEY = process.env.RUNNINGHUB_API_KEY || "RH_MOCK_KEY_2026_TEST";

const isRunningHubApiKeyMissingOrPlaceholder = (apiKey: string) =>
  !apiKey ||
  apiKey === "RH_MOCK_KEY_2026_TEST" ||
  apiKey.includes("YOUR_") ||
  apiKey.includes("placeholder");

const isApiKeyMissingOrPlaceholder =
  isRunningHubApiKeyMissingOrPlaceholder(RUNNINGHUB_API_KEY);

const resolveRunningHubApiSettings = (body: any = {}) => {
  const apiKey = String(
    body.apiKey || body.workflowConfig?.apiKey || RUNNINGHUB_API_KEY || "",
  ).trim();
  const rawApiBase = String(
    body.apiBaseUrl ||
      body.workflowConfig?.apiBaseUrl ||
      process.env.RUNNINGHUB_API_BASE ||
      process.env.VITE_RUNNINGHUB_API_BASE_URL ||
      "https://www.runninghub.cn",
  ).trim();

  return {
    apiKey,
    apiBase: rawApiBase.replace(/\/+$/, ""),
    isApiKeyMissingOrPlaceholder:
      isRunningHubApiKeyMissingOrPlaceholder(apiKey),
  };
};

// --- Review Store Setup ---
const reviewStoreDir = path.join(process.cwd(), "review-store");
const reviewStoreFile = path.join(reviewStoreDir, "reviews.json");
const reviewPreviewsDir = path.join(reviewStoreDir, "previews");
if (!fs.existsSync(reviewStoreDir)) {
  fs.mkdirSync(reviewStoreDir, { recursive: true });
}
if (!fs.existsSync(reviewPreviewsDir)) {
  fs.mkdirSync(reviewPreviewsDir, { recursive: true });
}
function readReviews(): any[] {
  try {
    if (fs.existsSync(reviewStoreFile)) {
      return JSON.parse(fs.readFileSync(reviewStoreFile, "utf-8"));
    }
  } catch { /* corrupted, fallback to empty */ }
  return [];
}
function writeReviews(data: any[]) {
  const tmp = reviewStoreFile + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, reviewStoreFile);
}
// Multer for review preview uploads
const reviewPreviewStorage = multer.diskStorage({
  destination: reviewPreviewsDir,
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${ts}_${safeName}`);
  },
});
const uploadReviewPreview = multer({ storage: reviewPreviewStorage, limits: { fileSize: 20 * 1024 * 1024 } });
app.use("/review-store/previews", express.static(reviewPreviewsDir));

// Disk storage for asset library uploads — preserves original filename
const assetStorage = multer.diskStorage({
  destination: assetDir,
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${ts}_${safeName}`);
  },
});
const uploadToDisk = multer({ storage: assetStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// 0. POST /api/upload-asset — save file to assets/ folder, return URL for asset library
app.post("/api/upload-asset", uploadToDisk.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  res.json({
    fileUrl: `/assets/${req.file.filename}`,
    fileName: req.file.originalname,
    width: 0,
    height: 0,
  });
});

// 1. POST /api/upload-canvas
app.post("/api/upload-canvas", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file uploaded" });
    return;
  }
  try {
    const ext = path.extname(req.file.originalname) || ".png";
    const filename = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`;
    const filePath = path.join(assetDir, filename);
    await fs.promises.writeFile(filePath, req.file.buffer);
    res.json({
      success: true,
      fileUrl: `/assets/${filename}`,
      filename,
    });
  } catch (err: any) {
    console.error("upload-canvas error:", err);
    res.status(500).json({ error: err.message || "Failed to save file" });
  }
});

app.get("/api/templates", async (_req, res) => {
  try {
    if (!fs.existsSync(templateStoreFile)) {
      res.json({ templates: [], hasSavedTemplates: false });
      return;
    }
    const raw = await fs.promises.readFile(templateStoreFile, "utf-8");
    const parsed = JSON.parse(raw);
    res.json({
      templates: Array.isArray(parsed.templates) ? parsed.templates : [],
      hasSavedTemplates: true,
      updatedAt: parsed.updatedAt || null,
    });
  } catch (err: any) {
    console.error("load templates error:", err);
    res.status(500).json({ error: err.message || "Failed to load templates" });
  }
});

app.post("/api/templates", async (req, res) => {
  try {
    const incomingTemplates = req.body?.templates;
    if (!Array.isArray(incomingTemplates)) {
      res.status(400).json({ error: "templates must be an array" });
      return;
    }
    let previousTemplates: any[] = [];
    if (fs.existsSync(templateStoreFile)) {
      try {
        const previous = JSON.parse(
          await fs.promises.readFile(templateStoreFile, "utf-8"),
        );
        previousTemplates = Array.isArray(previous.templates)
          ? previous.templates
          : [];
      } catch {
        previousTemplates = [];
      }
    }
    const previousById = new Map(
      previousTemplates.map((template: any) => [template.id, template]),
    );
    const templates = incomingTemplates.map((template: any) => {
      const previous = previousById.get(template.id);
      const incomingComponents = Array.isArray(template.components)
        ? template.components
        : [];
      const previousComponents = Array.isArray(previous?.components)
        ? previous.components
        : [];
      if (incomingComponents.length === 0 && previousComponents.length > 0) {
        return {
          ...template,
          components: previousComponents,
        };
      }
      return template;
    });
    const payload = {
      updatedAt: new Date().toISOString(),
      templates,
    };
    const tempFile = `${templateStoreFile}.tmp`;
    await fs.promises.writeFile(tempFile, JSON.stringify(payload, null, 2), "utf-8");
    await fs.promises.rename(tempFile, templateStoreFile);
    const componentCount = templates.reduce(
      (total: number, template: any) =>
        total + (Array.isArray(template.components) ? template.components.length : 0),
      0,
    );
    res.json({
      success: true,
      count: templates.length,
      componentCount,
      updatedAt: payload.updatedAt,
    });
  } catch (err: any) {
    console.error("save templates error:", err);
    res.status(500).json({ error: err.message || "Failed to save templates" });
  }
});

// RunningHub Integration Endpoints:

// 1. POST /api/runninghub/upload
app.post("/api/runninghub/upload", upload.single("image"), async (req, res) => {
  try {
    const runningHubSettings = resolveRunningHubApiSettings(req.body);

    if (runningHubSettings.isApiKeyMissingOrPlaceholder) {
      console.warn("RunningHub API Key is missing. Simulating file upload.");
      res.json({ fileName: `simulated_file_${Date.now()}.png` });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // Send request to RunningHub media binary upload
    const uploadUrl = `${runningHubSettings.apiBase}/openapi/v2/media/upload/binary`;

    const hubFormData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    hubFormData.append("file", blob, req.file.originalname);

    const hubRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${runningHubSettings.apiKey}`
      },
      body: hubFormData
    });

    if (!hubRes.ok) {
      const errText = await hubRes.text();
      res.status(hubRes.status).json({ error: `RunningHub upload failure: ${errText}` });
      return;
    }

    const uploadData = await hubRes.json();
    // Expected structure: { code: 0, msg: "success", data: { fileName: "...", url: "..." } }
    const fileName = uploadData.data?.fileName || uploadData.fileName || (uploadData.data && typeof uploadData.data === "string" ? uploadData.data : "");
    if (!fileName) {
      res.status(500).json({ error: "Failed to parse fileName from upload response", details: uploadData });
      return;
    }

    res.json({ fileName, raw: uploadData });
  } catch (err: any) {
    console.error("Error in /api/runninghub/upload:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// 2. POST /api/runninghub/run-workflow
app.post("/api/runninghub/run-workflow", async (req, res) => {
  try {
    const { workflowId, nodeInfoList } = req.body;
    const runningHubSettings = resolveRunningHubApiSettings(req.body);

    if (!workflowId) {
      res.status(400).json({ error: "Missing workflowId" });
      return;
    }

    if (runningHubSettings.isApiKeyMissingOrPlaceholder) {
      console.warn("RunningHub API Key is missing. Simulating V2 task creation.");
      res.json({
        taskId: `task_mock_v2_${Date.now()}`,
        status: "queued"
      });
      return;
    }

    const createUrl = `${runningHubSettings.apiBase}/openapi/v2/run/workflow/${workflowId}`;
    const payload = {
      addMetadata: true,
      nodeInfoList: nodeInfoList || [],
      instanceType: "default",
      usePersonalQueue: false
    };

    const hubRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${runningHubSettings.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!hubRes.ok) {
      const errText = await hubRes.text();
      res.status(hubRes.status).json({ error: `RunningHub task create V2 failure: ${errText}` });
      return;
    }

    const data = await hubRes.json();
    const taskId = data?.taskId || data?.data?.taskId || (data?.data && typeof data?.data === "string" ? data.data : "");
    const status = data?.status || data?.data?.status || "queued";

    if (!taskId) {
      res.status(500).json({ error: "Failed to extract taskId from RunningHub V2 response", details: data });
      return;
    }

    res.json({ taskId, status });
  } catch (err: any) {
    console.error("Error in /api/runninghub/run-workflow:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// 3. POST /api/runninghub/create-task (Redirect compatibility)
app.post("/api/runninghub/create-task", async (req, res) => {
  try {
    const { workflowId, nodeInfoList, apiMode = "run_workflow_v2" } = req.body;
    const runningHubSettings = resolveRunningHubApiSettings(req.body);

    if (runningHubSettings.isApiKeyMissingOrPlaceholder) {
      console.warn("RunningHub API Key is missing. Simulating task creation.");
      res.json({
        taskId: apiMode === "comfyui_openapi" ? `task_mock_${Date.now()}` : `task_mock_v2_${Date.now()}`,
        taskStatus: "queued"
      });
      return;
    }

    if (apiMode === "comfyui_openapi") {
      const createUrl = `${runningHubSettings.apiBase}/task/openapi/create`;
      const payload = {
        apikey: runningHubSettings.apiKey,
        workflowId,
        nodeInfoList
      };

      const hubRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": runningHubSettings.apiKey,
          "api-key": runningHubSettings.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!hubRes.ok) {
        const errText = await hubRes.text();
        res.status(hubRes.status).json({ error: `RunningHub create failure: ${errText}` });
        return;
      }

      const result = await hubRes.json();
      const taskId = result.data?.taskId || result.taskId;

      if (!taskId) {
        res.status(500).json({ error: "Failed to parse taskId from create response", details: result });
        return;
      }

      res.json({ taskId });
    } else {
      // Direct V2 execution
      const createUrl = `${runningHubSettings.apiBase}/openapi/v2/run/workflow/${workflowId}`;
      const payload = {
        addMetadata: true,
        nodeInfoList,
        instanceType: "default",
        usePersonalQueue: false
      };

      const hubRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${runningHubSettings.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!hubRes.ok) {
        const errText = await hubRes.text();
        res.status(hubRes.status).json({ error: `RunningHub V2 run-workflow failure: ${errText}` });
        return;
      }

      const result = await hubRes.json();
      const taskId = result?.taskId || result?.data?.taskId || (result?.data && typeof result?.data === "string" ? result.data : "");

      if (!taskId) {
        res.status(500).json({ error: "Failed to parse taskId from run_workflow_v2 response", details: result });
        return;
      }

      res.json({ taskId });
    }
  } catch (err: any) {
    console.error("Error in /api/runninghub/create-task:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// 4. POST /api/runninghub/query-result
app.post("/api/runninghub/query-result", async (req, res) => {
  try {
    const { taskId, apiMode = "run_workflow_v2" } = req.body;
    const runningHubSettings = resolveRunningHubApiSettings(req.body);

    if (!taskId) {
      res.status(400).json({ error: "Missing taskId" });
      return;
    }

    if (taskId.startsWith("task_mock_")) {
      const isV2 = taskId.startsWith("task_mock_v2_");
      const timePart = isV2 ? taskId.split("_")[3] : taskId.split("_")[2];
      const elapsed = Date.now() - parseInt(timePart || "0");
      if (elapsed < 3000) {
        res.json({ status: "running" });
      } else {
        res.json({
          status: "completed",
          outputUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800",
          results: [
            "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800&bg=white",
            "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800&monochrome=true"
          ]
        });
      }
      return;
    }

    if (apiMode === "comfyui_openapi") {
      const queryUrl = `${runningHubSettings.apiBase}/task/openapi/outputs`;

      const hubRes = await fetch(queryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": runningHubSettings.apiKey,
          "api-key": runningHubSettings.apiKey
        },
        body: JSON.stringify({
          apikey: runningHubSettings.apiKey,
          taskId
        })
      });

      if (!hubRes.ok) {
        const errText = await hubRes.text();
        res.status(hubRes.status).json({ error: `RunningHub query failure: ${errText}` });
        return;
      }

      const result = await hubRes.json();
      const fileStatus = result.data?.taskStatus || result.taskStatus || "running";
      
      let status: "idle" | "uploading" | "queued" | "running" | "completed" | "failed" = "running";
      if (fileStatus === "completed" || fileStatus === "success" || fileStatus === "done") {
        status = "completed";
      } else if (fileStatus === "failed" || fileStatus === "fail" || fileStatus === "error") {
        status = "failed";
      } else if (fileStatus === "queued" || fileStatus === "waiting") {
        status = "queued";
      }

      let outputUrl = "";
      if (result.data?.outputs && Array.isArray(result.data.outputs)) {
        const firstOut = result.data.outputs[0];
        if (typeof firstOut === "string") {
          outputUrl = firstOut;
        } else if (firstOut && typeof firstOut === "object") {
          outputUrl = firstOut.imageUrl || firstOut.fileUrl || firstOut.url || "";
        }
      } else if (result.data?.outputUrl) {
        outputUrl = result.data.outputUrl;
      } else if (typeof result.data === "string" && result.data.startsWith("http")) {
        outputUrl = result.data;
      }

      res.json({
        status,
        outputUrl,
        errorMessage: result.data?.error || result.msg || ""
      });
    } else {
      // API V2 query (DEFAULT V2)
      const queryUrl = `${runningHubSettings.apiBase}/openapi/v2/query`;

      const hubRes = await fetch(queryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${runningHubSettings.apiKey}`
        },
        body: JSON.stringify({
          taskId
        })
      });

      if (!hubRes.ok) {
        const errText = await hubRes.text();
        res.status(hubRes.status).json({ error: `RunningHub V2 query failure: ${errText}` });
        return;
      }

      const result = await hubRes.json();
      const statusValue = result.status;
      const outputUrl = result.results?.[0]?.url || "";

      if (statusValue === "SUCCESS" && outputUrl) {
        res.json({
          status: "completed",
          outputUrl,
          results: result.results ? result.results.map((r: any) => r.url) : [outputUrl]
        });
      } else if (statusValue === "RUNNING" || statusValue === "QUEUED") {
        res.json({
          status: "running"
        });
      } else if (statusValue === "FAILED" || result.errorCode) {
        res.json({
          status: "failed",
          errorMessage: result.errorMessage || "RunningHub任务失败"
        });
      } else {
        res.json({
          status: "running"
        });
      }
    }
  } catch (err: any) {
    console.error("Error in /api/runninghub/query-result:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// 5. POST /api/runninghub/scene-fusion (V2 Default Mode)
app.post("/api/runninghub/scene-fusion", async (req, res) => {
  try {
    const { baseImageDataUrl, workflowConfig, prompt, negativePrompt, denoise, seed, steps, cfg } = req.body;

    if (!baseImageDataUrl) {
      res.status(400).json({ error: "Missing baseImageDataUrl" });
      return;
    }

    if (!workflowConfig || !workflowConfig.workflowId) {
      res.status(400).json({ error: "Missing workflowConfig with workflowId" });
      return;
    }

    const apiMode = workflowConfig.apiMode || "run_workflow_v2";
    const workflowId = workflowConfig.workflowId;

    const hasBaseImageNode = !!workflowConfig.baseImageNodeId;

    // Step 1: Construct Dynamic nodeInfoList (except baseImage node which requires upload result)
    let nodeInfoList = [];
    if (workflowConfig.nodeInfoList && Array.isArray(workflowConfig.nodeInfoList)) {
      nodeInfoList = [...workflowConfig.nodeInfoList];
    } else {
      // 1. Positive Prompt Node
      if (workflowConfig.promptNodeId) {
        nodeInfoList.push({
          nodeId: workflowConfig.promptNodeId,
          fieldName: workflowConfig.promptFieldName || "text",
          fieldValue: prompt || workflowConfig.defaultPrompt || ""
        });
      }

      // 2. Negative Prompt Node (only if negativePromptNodeId is configured and not empty)
      if (workflowConfig.negativePromptNodeId && workflowConfig.negativePromptNodeId.trim() !== "") {
        nodeInfoList.push({
          nodeId: workflowConfig.negativePromptNodeId,
          fieldName: workflowConfig.negativePromptFieldName || "text",
          fieldValue: negativePrompt || workflowConfig.defaultNegativePrompt || ""
        });
      }

      // 3. Seed Node
      if (workflowConfig.seedNodeId) {
        let finalSeed = seed;
        if (finalSeed === undefined || finalSeed === null || finalSeed === 0) {
          finalSeed = Math.floor(Math.random() * 1000000000);
        }
        nodeInfoList.push({
          nodeId: workflowConfig.seedNodeId,
          fieldName: workflowConfig.seedFieldName || "seed",
          fieldValue: Number(finalSeed)
        });
      }

      // 4. Denoise Node
      if (workflowConfig.denoiseNodeId) {
        nodeInfoList.push({
          nodeId: workflowConfig.denoiseNodeId,
          fieldName: workflowConfig.denoiseFieldName || "denoise",
          fieldValue: typeof denoise === "number" ? denoise : (workflowConfig.defaultDenoise ?? 0.25)
        });
      }

      // 5. Steps Node
      if (workflowConfig.stepsNodeId) {
        nodeInfoList.push({
          nodeId: workflowConfig.stepsNodeId,
          fieldName: workflowConfig.stepsFieldName || "steps",
          fieldValue: typeof steps === "number" ? steps : (workflowConfig.defaultSteps ?? 4)
        });
      }

      // 6. CFG Node
      if (workflowConfig.cfgNodeId) {
        nodeInfoList.push({
          nodeId: workflowConfig.cfgNodeId,
          fieldName: workflowConfig.cfgFieldName || "cfg",
          fieldValue: typeof cfg === "number" ? cfg : (workflowConfig.defaultCfg ?? 1)
        });
      }
    }

    // Determine expected final nodeInfoList length
    const expectedFinalLength = hasBaseImageNode ? (nodeInfoList.length + 1) : nodeInfoList.length;

    let warning = "";
    if (!workflowConfig.baseImageNodeId || expectedFinalLength === 0) {
      warning = "当前未配置 RunningHub 输入图片节点，任务将使用工作流默认参数，无法验证真实 Canvas 图融合。";
      console.warn(`[RunningHub Warning] ${warning}`);
    }

    if (isApiKeyMissingOrPlaceholder) {
      console.warn("RunningHub API Key is missing. Creating pre-mocked task.");
      // Ensure we push a dummy base node into temporary mock so logging looks real
      if (hasBaseImageNode && !workflowConfig.nodeInfoList) {
        nodeInfoList.push({
          nodeId: workflowConfig.baseImageNodeId,
          fieldName: workflowConfig.baseImageFieldName || "image",
          fieldValue: "simulated_base_image_name.png"
        });
      }
      console.log("=== FINAL RunningHub nodeInfoList ===", JSON.stringify(nodeInfoList, null, 2));

      const taskId = apiMode === "comfyui_openapi" ? `task_mock_${Date.now()}` : `task_mock_v2_${Date.now()}`;
      res.json({ taskId, warning: warning || undefined });
      return;
    }

    let fileName = "";
    if (hasBaseImageNode) {
      // Step 2: Upload baseImage to RunningHub
      const base64Data = baseImageDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const apiBase = process.env.RUNNINGHUB_API_BASE || process.env.VITE_RUNNINGHUB_API_BASE_URL || "https://www.runninghub.cn";
      const uploadUrl = `${apiBase}/openapi/v2/media/upload/binary`;

      const hubFormData = new FormData();
      const blob = new Blob([buffer], { type: "image/png" });
      hubFormData.append("file", blob, `scene_canvas_${Date.now()}.png`);

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RUNNINGHUB_API_KEY}`
        },
        body: hubFormData
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        res.status(uploadRes.status).json({ error: `Image upload to RunningHub failed: ${errText}` });
        return;
      }

      const uploadData = await uploadRes.json();
      fileName = uploadData.data?.fileName || uploadData.fileName || (uploadData.data && typeof uploadData.data === "string" ? uploadData.data : "");
      if (!fileName) {
        res.status(500).json({ error: "Could not retrieve uploaded fileName from RunningHub", details: uploadData });
        return;
      }

      // Append base image node to nodeInfoList
      if (!workflowConfig.nodeInfoList) {
        nodeInfoList.push({
          nodeId: workflowConfig.baseImageNodeId,
          fieldName: workflowConfig.baseImageFieldName || "image",
          fieldValue: fileName
        });
      }
    }

    console.log("=== FINAL RunningHub nodeInfoList ===", JSON.stringify(nodeInfoList, null, 2));

    const apiBase = process.env.RUNNINGHUB_API_BASE || "https://www.runninghub.cn";

    if (apiMode === "comfyui_openapi") {
      // Create Task on RunningHub (Legacy mode)
      const createUrl = `${apiBase}/task/openapi/create`;
      const taskPayload = {
        apikey: RUNNINGHUB_API_KEY,
        workflowId,
        nodeInfoList
      };

      const taskRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": RUNNINGHUB_API_KEY,
          "api-key": RUNNINGHUB_API_KEY
        },
        body: JSON.stringify(taskPayload)
      });

      if (!taskRes.ok) {
        const errText = await taskRes.text();
        res.status(taskRes.status).json({ error: `Task creation on RunningHub failed: ${errText}` });
        return;
      }

      const taskData = await taskRes.json();
      const taskId = taskData.data?.taskId || taskData.taskId;

      if (!taskId) {
        res.status(500).json({ error: "Task created but no taskId was returned", details: taskData });
        return;
      }

      res.json({ taskId, warning: warning || undefined });
    } else {
      // API V2 run workflow (Default Mode)
      const createUrl = `${apiBase}/openapi/v2/run/workflow/${workflowId}`;
      const taskPayload = {
        addMetadata: true,
        nodeInfoList,
        instanceType: "default",
        usePersonalQueue: false
      };

      const taskRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RUNNINGHUB_API_KEY}`
        },
        body: JSON.stringify(taskPayload)
      });

      if (!taskRes.ok) {
        const errText = await taskRes.text();
        res.status(taskRes.status).json({ error: `V2 Task creation on RunningHub failed: ${errText}` });
        return;
      }

      const taskData = await taskRes.json();
      const taskId = taskData?.taskId || taskData?.data?.taskId || (taskData?.data && typeof taskData?.data === "string" ? taskData.data : "");

      if (!taskId) {
        res.status(500).json({ error: "V2 Task created but no taskId was returned", details: taskData });
        return;
      }

      res.json({ taskId, warning: warning || undefined });
    }
  } catch (err: any) {
    console.error("Error in /api/runninghub/scene-fusion:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// --- Review API Endpoints ---

// GET /api/reviews — list all review projects
app.get("/api/reviews", (_req, res) => {
  try {
    res.json(readReviews());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/submit — create or update review project
app.post("/api/reviews/submit", async (req, res) => {
  try {
    const { projectWorkspaceId, projectName, productId, productName, suiteRootId, suiteName, pages } = req.body;
    if (!projectWorkspaceId || !pages || !Array.isArray(pages) || pages.length === 0) {
      res.status(400).json({ error: "Missing required fields: projectWorkspaceId, pages" });
      return;
    }
    const reviews = readReviews();
    const existingIdx = reviews.findIndex((r: any) => r.projectWorkspaceId === projectWorkspaceId);
    const now = new Date().toISOString();
    const projectId = `review_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const reviewPages = pages.map((p: any, i: number) => ({
      id: `rp_${Date.now()}_${i}`,
      reviewProjectId: projectId,
      projectTemplateId: p.projectTemplateId || `tmpl_${i}`,
      pageName: p.pageName || `page_${i + 1}`,
      pageGroup: p.pageGroup || "main",
      width: p.width || 0,
      height: p.height || 0,
      aspectRatio: p.aspectRatio || "1:1",
      required: p.required !== false,
      previewUrl: p.previewUrl || "",
      templateSnapshot: p.templateSnapshot || {},
      status: "pending",
      issues: [],
      version: 1,
      submittedAt: now,
      history: [{ id: `rh_${Date.now()}_${i}`, action: "submitted", createdAt: now }],
    }));

    const totalPages = reviewPages.length;

    if (existingIdx >= 0) {
      // Update existing: merge new pages over old ones matching by projectTemplateId
      const existing = reviews[existingIdx] as any;
      const existingPageMap = new Map(existing.pages.map((ep: any) => [ep.projectTemplateId, ep]));
      for (const np of reviewPages) {
        const ep = existingPageMap.get(np.projectTemplateId) as any;
        if (ep) {
          Object.assign(np, { id: ep.id, reviewProjectId: ep.reviewProjectId, status: ep.status !== "needs_adjustment" ? ep.status : np.status, history: [...(ep.history || []), ...(np.history || [])], version: (ep.version || 0) + 1 });
        }
      }
      existing.projectName = projectName || existing.projectName;
      existing.updatedAt = now;
      existing.pages = reviewPages;
      existing.status = reviewPages.every((p: any) => p.status === "approved") ? "approved" : reviewPages.some((p: any) => p.status === "needs_adjustment") ? "needs_adjustment" : "reviewing";
      res.json(existing);
    } else {
      const project = {
        id: projectId,
        projectWorkspaceId,
        projectName: projectName || "未命名项目",
        productId: productId || "",
        productName: productName || "",
        suiteRootId: suiteRootId || "",
        suiteName: suiteName || "",
        status: "pending_review",
        pages: reviewPages,
        createdAt: now,
        updatedAt: now,
      };
      reviews.push(project);
      res.json(project);
    }
    writeReviews(reviews);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reviews/:reviewProjectId/pages/:pageId — update page status
app.patch("/api/reviews/:reviewProjectId/pages/:pageId", (req, res) => {
  try {
    const { reviewProjectId, pageId } = req.params;
    const { status, reviewNote, issueCodes } = req.body;
    if (!reviewProjectId || !pageId || !status) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const reviews = readReviews();
    const project = reviews.find((r: any) => r.id === reviewProjectId);
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    const page = (project as any).pages.find((p: any) => p.id === pageId);
    if (!page) { res.status(404).json({ error: "Page not found" }); return; }
    const now = new Date().toISOString();
    const action = status === "approved" ? "approved" : status === "needs_adjustment" ? "returned" : "submitted";
    page.status = status;
    page.reviewNote = reviewNote || "";
    if (issueCodes) page.issues = issueCodes.map((c: string) => ({ code: c, message: "", source: "manual" }));
    page.reviewedAt = now;
    page.history.push({ id: `rh_${Date.now()}`, action, note: reviewNote, issueCodes, createdAt: now });
    (project as any).status = (project as any).pages.every((p: any) => p.status === "approved") ? "approved" : (project as any).pages.some((p: any) => p.status === "needs_adjustment") ? "needs_adjustment" : "reviewing";
    (project as any).updatedAt = now;
    writeReviews(reviews);
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/:reviewProjectId/pages/:pageId/resubmit
app.post("/api/reviews/:reviewProjectId/pages/:pageId/resubmit", (req, res) => {
  try {
    const { reviewProjectId, pageId } = req.params;
    const reviews = readReviews();
    const project = reviews.find((r: any) => r.id === reviewProjectId);
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    const page = (project as any).pages.find((p: any) => p.id === pageId);
    if (!page) { res.status(404).json({ error: "Page not found" }); return; }
    const now = new Date().toISOString();
    page.status = "pending";
    page.issues = [];
    page.reviewNote = "";
    page.version = (page.version || 1) + 1;
    page.previewUrl = req.body.previewUrl || page.previewUrl;
    page.history.push({ id: `rh_${Date.now()}`, action: "resubmitted", createdAt: now });
    (project as any).status = "reviewing";
    (project as any).updatedAt = now;
    writeReviews(reviews);
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/review-assets — upload preview image
app.post("/api/review-assets", uploadReviewPreview.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  res.json({
    fileUrl: `/review-store/previews/${req.file.filename}`,
    fileName: req.file.filename,
  });
});

// Port and server initialization setup
const isProduction = process.env.NODE_ENV === "production";
const distPath = path.join(process.cwd(), "dist");

async function start() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ["**/assets/**", "**/template-store/**"],
        },
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

start();
