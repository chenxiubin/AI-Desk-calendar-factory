import express from "express";
import path from "path";
import multer from "multer";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Setup JSON limits for high-res base64 Canvas image transfers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configure Multer for in-memory uploads
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const RUNNINGHUB_API_KEY = process.env.RUNNINGHUB_API_KEY || "";
const isApiKeyMissingOrPlaceholder = !RUNNINGHUB_API_KEY || RUNNINGHUB_API_KEY.includes("YOUR_RUNNINGHUB_API") || RUNNINGHUB_API_KEY.trim() === "";

// Helper to construct request options with header apikey
function getHeaders() {
  const headers: Record<string, string> = {
    "apikey": RUNNINGHUB_API_KEY,
    "api-key": RUNNINGHUB_API_KEY
  };
  return headers;
}

// ------------------ API ROUTES ------------------

// 1. POST /api/runninghub/upload
app.post("/api/runninghub/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded in form field 'file'" });
      return;
    }

    if (isApiKeyMissingOrPlaceholder) {
      console.warn("RunningHub API Key is missing. Simulating media upload.");
      // Return a simulated filename
      res.json({ fileName: `simulated_file_${Date.now()}.png` });
      return;
    }

    // Prepare multipart payload for RunningHub
    const formData = new FormData();
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("file", fileBlob, req.file.originalname);

    const apiBase = process.env.RUNNINGHUB_API_BASE || "https://www.runninghub.cn";
    const uploadUrl = `${apiBase}/openapi/v2/media/upload/binary?apikey=${encodeURIComponent(RUNNINGHUB_API_KEY)}`;

    const hubRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "apikey": RUNNINGHUB_API_KEY,
        "api-key": RUNNINGHUB_API_KEY
      },
      body: formData
    });

    if (!hubRes.ok) {
      const errText = await hubRes.text();
      res.status(hubRes.status).json({ error: `RunningHub upload failure: ${errText}` });
      return;
    }

    const data = await hubRes.json();
    // RunningHub typically returns: { code: 0, msg: "success", data: { fileName: "..." } } or flat
    const fileName = data.data?.fileName || data.fileName || (data.data && typeof data.data === "string" ? data.data : "");
    if (!fileName) {
      res.status(500).json({ error: "Failed to extract fileName from RunningHub response", details: data });
      return;
    }

    res.json({ fileName });
  } catch (err: any) {
    console.error("Error in /api/runninghub/upload:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// 2. POST /api/runninghub/create-task
app.post("/api/runninghub/create-task", async (req, res) => {
  try {
    const { workflowId, nodeInfoList } = req.body;

    if (isApiKeyMissingOrPlaceholder) {
      console.warn("RunningHub API Key is missing. Simulating task creation.");
      res.json({
        taskId: `task_mock_${Date.now()}`,
        taskStatus: "queued"
      });
      return;
    }

    const apiBase = process.env.RUNNINGHUB_API_BASE || "https://www.runninghub.cn";
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
      res.status(hubRes.status).json({ error: `RunningHub task create failure: ${errText}` });
      return;
    }

    const data = await hubRes.json();
    // Expected structure: { code: 0, msg: "success", data: { taskId: "...", taskStatus: "..." } }
    const taskId = data.data?.taskId || data.taskId;
    const taskStatus = data.data?.taskStatus || data.taskStatus || "queued";

    if (!taskId) {
      res.status(500).json({ error: "Failed to extract taskId from RunningHub response", details: data });
      return;
    }

    res.json({ taskId, taskStatus });
  } catch (err: any) {
    console.error("Error in /api/runninghub/create-task:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// 3. POST /api/runninghub/query-result
app.post("/api/runninghub/query-result", async (req, res) => {
  try {
    const { taskId } = req.body;

    if (!taskId) {
      res.status(400).json({ error: "Missing taskId" });
      return;
    }

    if (taskId.startsWith("task_mock_")) {
      // Simulate polling progress
      const elapsed = Date.now() - parseInt(taskId.split("_")[2] || "0");
      if (elapsed < 3000) {
        res.json({ status: "running", progress: 40 });
      } else {
        // Return a beautiful simulated AI scene fusion image (using a high quality Unsplash office/desk setup image as base)
        res.json({
          status: "completed",
          progress: 100,
          outputUrl: "https://images.unsplash.com/photo-1547082299-de196ea013d6?q=80&w=800&auto=format&fit=crop"
        });
      }
      return;
    }

    const apiBase = process.env.RUNNINGHUB_API_BASE || "https://www.runninghub.cn";
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
    // Structure: { code: 0, msg: "...", data: { taskStatus: "completed", outputs: [ ... ] or outputUrl: "..." } }
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
  } catch (err: any) {
    console.error("Error in /api/runninghub/query-result:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// 4. POST /api/runninghub/scene-fusion
app.post("/api/runninghub/scene-fusion", async (req, res) => {
  try {
    const { baseImageDataUrl, workflowConfig, prompt, negativePrompt, denoise, seed } = req.body;

    if (!baseImageDataUrl) {
      res.status(400).json({ error: "Missing baseImageDataUrl" });
      return;
    }

    if (!workflowConfig || !workflowConfig.workflowId) {
      res.status(400).json({ error: "Missing or invalid workflowConfig" });
      return;
    }

    let fileName = "";

    if (isApiKeyMissingOrPlaceholder) {
      console.warn("RunningHub API Key is missing. Creating pre-mocked task.");
      fileName = `simulated_file_canvas_${Date.now()}.png`;
      res.json({ taskId: `task_mock_${Date.now()}` });
      return;
    }

    // Step 1: Decode Base64 Canvas Image
    const matches = baseImageDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: "Invalid baseImageDataUrl format. Must be a valid DataURL." });
      return;
    }

    const buffer = Buffer.from(matches[2], "base64");
    const mimeType = matches[1];
    
    // Step 2: Upload to RunningHub
    const hubFormData = new FormData();
    const fileBlob = new Blob([buffer], { type: mimeType });
    hubFormData.append("file", fileBlob, `canvas_${Date.now()}.png`);

    const apiBase = process.env.RUNNINGHUB_API_BASE || "https://www.runninghub.cn";
    const uploadUrl = `${apiBase}/openapi/v2/media/upload/binary?apikey=${encodeURIComponent(RUNNINGHUB_API_KEY)}`;

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "apikey": RUNNINGHUB_API_KEY,
        "api-key": RUNNINGHUB_API_KEY
      },
      body: hubFormData
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      res.status(uploadRes.status).json({ error: `Canvas upload to RunningHub failed: ${errText}` });
      return;
    }

    const uploadData = await uploadRes.json();
    fileName = uploadData.data?.fileName || uploadData.fileName || (uploadData.data && typeof uploadData.data === "string" ? uploadData.data : "");
    if (!fileName) {
      res.status(500).json({ error: "Could not retrieve uploaded fileName from RunningHub", details: uploadData });
      return;
    }

    // Step 3: Construct Dynamic nodeInfoList
    const nodeInfoList = [
      {
        nodeId: workflowConfig.baseImageNodeId,
        fieldName: "image",
        fieldValue: fileName
      },
      {
        nodeId: workflowConfig.promptNodeId,
        fieldName: "text",
        fieldValue: prompt
      }
    ];

    if (workflowConfig.negativePromptNodeId) {
      nodeInfoList.push({
        nodeId: workflowConfig.negativePromptNodeId,
        fieldName: "text",
        fieldValue: negativePrompt
      });
    }

    if (workflowConfig.seedNodeId) {
      nodeInfoList.push({
        nodeId: workflowConfig.seedNodeId,
        fieldName: "seed",
        fieldValue: seed
      });
    }

    if (workflowConfig.denoiseNodeId) {
      nodeInfoList.push({
        nodeId: workflowConfig.denoiseNodeId,
        fieldName: "denoise",
        fieldValue: denoise
      });
    }

    // Step 4: Create Task on RunningHub
    const createUrl = `${apiBase}/task/openapi/create`;
    const taskPayload = {
      apikey: RUNNINGHUB_API_KEY,
      workflowId: workflowConfig.workflowId,
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

    res.json({ taskId });
  } catch (err: any) {
    console.error("Error in /api/runninghub/scene-fusion:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});


// ------------------ FRONTEND STATIC SERVING / VITE DEV MIDDLEWARE ------------------

async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start server:", err);
});
