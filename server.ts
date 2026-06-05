import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
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

// Retrieve system-wide keys secured silently
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const RUNNINGHUB_API_KEY = process.env.RUNNINGHUB_API_KEY || "RH_MOCK_KEY_2026_TEST";

const isApiKeyMissingOrPlaceholder = 
  !RUNNINGHUB_API_KEY || 
  RUNNINGHUB_API_KEY === "RH_MOCK_KEY_2026_TEST" || 
  RUNNINGHUB_API_KEY.includes("YOUR_") ||
  RUNNINGHUB_API_KEY.includes("placeholder");

// 1. POST /api/upload-canvas
app.post("/api/upload-canvas", upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file uploaded" });
    return;
  }
  res.json({ fileUrl: `/assets/${req.file.filename}` });
});

// RunningHub Integration Endpoints:

// 1. POST /api/runninghub/upload
app.post("/api/runninghub/upload", upload.single("image"), async (req, res) => {
  try {
    if (isApiKeyMissingOrPlaceholder) {
      console.warn("RunningHub API Key is missing. Simulating file upload.");
      res.json({ fileName: `simulated_file_${Date.now()}.png` });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const apiBase = process.env.RUNNINGHUB_API_BASE || "https://www.runninghub.cn";
    // Send request to RunningHub media binary upload
    const uploadUrl = `${apiBase}/openapi/v2/media/upload/binary`;

    const hubFormData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    hubFormData.append("file", blob, req.file.originalname);

    const hubRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RUNNINGHUB_API_KEY}`
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

    if (!workflowId) {
      res.status(400).json({ error: "Missing workflowId" });
      return;
    }

    if (isApiKeyMissingOrPlaceholder) {
      console.warn("RunningHub API Key is missing. Simulating V2 task creation.");
      res.json({
        taskId: `task_mock_v2_${Date.now()}`,
        status: "queued"
      });
      return;
    }

    const apiBase = process.env.RUNNINGHUB_API_BASE || "https://www.runninghub.cn";
    const createUrl = `${apiBase}/openapi/v2/run/workflow/${workflowId}`;
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
        "Authorization": `Bearer ${RUNNINGHUB_API_KEY}`
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

    if (isApiKeyMissingOrPlaceholder) {
      console.warn("RunningHub API Key is missing. Simulating task creation.");
      res.json({
        taskId: apiMode === "comfyui_openapi" ? `task_mock_${Date.now()}` : `task_mock_v2_${Date.now()}`,
        taskStatus: "queued"
      });
      return;
    }

    const apiBase = process.env.RUNNINGHUB_API_BASE || "https://www.runninghub.cn";

    if (apiMode === "comfyui_openapi") {
      const createUrl = `${apiBase}/task/openapi/create`;
      const payload = {
        apikey: RUNNINGHUB_API_KEY,
        workflowId,
        nodeInfoList
      };

      const hubRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": RUNNINGHUB_API_KEY,
          "api-key": RUNNINGHUB_API_KEY
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
      const createUrl = `${apiBase}/openapi/v2/run/workflow/${workflowId}`;
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
          "Authorization": `Bearer ${RUNNINGHUB_API_KEY}`
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
          outputUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800"
        });
      }
      return;
    }

    const apiBase = process.env.RUNNINGHUB_API_BASE || "https://www.runninghub.cn";

    if (apiMode === "comfyui_openapi") {
      const queryUrl = `${apiBase}/task/openapi/outputs`;

      const hubRes = await fetch(queryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": RUNNINGHUB_API_KEY,
          "api-key": RUNNINGHUB_API_KEY
        },
        body: JSON.stringify({
          apikey: RUNNINGHUB_API_KEY,
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
      const queryUrl = `${apiBase}/openapi/v2/query`;

      const hubRes = await fetch(queryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RUNNINGHUB_API_KEY}`
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
          outputUrl
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
    const { baseImageDataUrl, workflowConfig, prompt, negativePrompt, denoise, seed } = req.body;

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
    let warning = "";

    if (!hasBaseImageNode) {
      warning = "当前未配置 RunningHub 输入图片节点，任务将使用工作流默认参数，无法验证真实 Canvas 图融合。";
      console.warn(`[RunningHub Warning] ${warning}`);
    }

    if (isApiKeyMissingOrPlaceholder) {
      console.warn("RunningHub API Key is missing. Creating pre-mocked task.");
      const taskId = apiMode === "comfyui_openapi" ? `task_mock_${Date.now()}` : `task_mock_v2_${Date.now()}`;
      res.json({ taskId, warning: warning || undefined });
      return;
    }

    let fileName = "";
    if (hasBaseImageNode) {
      // Step 2: Upload baseImage to RunningHub
      const base64Data = baseImageDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const apiBase = process.env.RUNNINGHUB_API_BASE || "https://www.runninghub.cn";
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
    }

    // Step 3: Construct Dynamic nodeInfoList
    let nodeInfoList = [];
    if (workflowConfig.nodeInfoList && Array.isArray(workflowConfig.nodeInfoList)) {
      nodeInfoList = workflowConfig.nodeInfoList;
    } else {
      if (hasBaseImageNode && workflowConfig.baseImageNodeId) {
        nodeInfoList.push({
          nodeId: workflowConfig.baseImageNodeId,
          fieldName: "image",
          fieldValue: fileName
        });
      }

      if (workflowConfig.promptNodeId && prompt) {
        nodeInfoList.push({
          nodeId: workflowConfig.promptNodeId,
          fieldName: "text",
          fieldValue: prompt
        });
      }

      if (workflowConfig.negativePromptNodeId && negativePrompt) {
        nodeInfoList.push({
          nodeId: workflowConfig.negativePromptNodeId,
          fieldName: "text",
          fieldValue: negativePrompt
        });
      }

      if (workflowConfig.seedNodeId && seed !== undefined) {
        nodeInfoList.push({
          nodeId: workflowConfig.seedNodeId,
          fieldName: "seed",
          fieldValue: seed
        });
      }

      if (workflowConfig.denoiseNodeId && denoise !== undefined) {
        nodeInfoList.push({
          nodeId: workflowConfig.denoiseNodeId,
          fieldName: "denoise",
          fieldValue: denoise
        });
      }
    }

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

// Port and server initialization setup
const isProduction = process.env.NODE_ENV === "production";
const distPath = path.join(process.cwd(), "dist");

async function start() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
