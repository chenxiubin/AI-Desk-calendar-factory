# AI Agent System Instructions

## 1. 项目定位
本项目是一个 AI 电商图片批量生产平台，主要用于台历、挂历、福牌 / 挂件年历等产品的整套电商图片生产。

完整生产链路：产品资产包 → 模板套系 → 自动生成页面骨架 → 分层画布人工调整 → RunningHub 抠图 / 融图流 → 图片审核 → 总预览 → 导出。

## 2. 当前开发范围

### 活跃开发模块
以下模块正在迭代中，可以修改：
- **产品资产库 (AssetLibrary)**：产品 CRUD、批量上传图片、资产缩略图预览
- **抠图资产生成 (WhiteBgRefine)**：RunningHub 抠图队列、裁剪画布交互、工作流配置面板
- **模板编辑器 (TemplateEditor)**：业务模板配置系统（BusinessTemplateConfig）、缩略图面板、PS 图层导入、组件编辑器
- **CropCanvas**：裁剪画布交互（三种手动模式）
- **imagePreprocess / runningHubMatting / runninghubClient**：图片预处理和 RunningHub API 封装
- **server.ts**：RunningHub 代理端点

### 模板相关模块状态
`TemplateEditor` 已由 Codex 重构为业务模板配置系统，核心改动：
- 引入 `BusinessTemplateConfig`：每个模板页绑定产品线、交付类型、比例版本、业务角色
- 6 个浮动面板：info（元数据配置）、import（PS 图层导入）、slots（组件快捷添加）、layers（图层列表编辑）、test（产品预览+业务检查）、save（检查+保存）
- 右侧缩略图面板：15 张预定义缩略图，分 4 组（主图/SKU/细节/特殊），按 count 自动展开
- 支持旧版 TemplateSlot 和新版 TemplateComponent 双模式
- 8 项自动化业务规则检查

`TemplateLibrary` 和 `SuiteWorkbench` 的流程还需要进一步调整（目前存在三套编辑入口冲突、套系数据不同步等问题），可修改。

### 稳定模块（修改需明确指令）
- `projectPageFactory`、`businessRuleHelpers`、`calendarTaxonomy`
- `renderTemplate` Canvas 渲染引擎
- 审核逻辑、导出逻辑

## 3. 裁剪模块目前状态
`CropCanvas` 已完全移除 AI 主体识别功能。当前仅支持三种手动交互模式：
- **调整裁剪框**：拖动裁剪框 + 八向缩放手柄，始终锁定 1:1 方形裁剪
- **移动图片**：拖动图片平移视图（也可按住空格临时切换到此模式）
- **手动框选主体**：用户手动拖拽矩形框标记主体位置，点击"应用主体框"后裁剪框自动对齐到框选区域外围

注意：**不存在**任何自动主体检测算法——所有主体定位完全由用户手动完成。

## 4. 业务硬性规则（Business Rules）
- **队列独立性**：每次在 UI 确认裁剪，必须新增一条记录进入状态为 `waiting_preview_approval` 的队列，不得覆盖前一次记录。
- **并发控制**：抠图工作流**禁止并发**。不论是单发还是一键发送，请求必须是同步排队的（使用 `for...of` 和 `await`，禁止使用 `Promise.all` 等）。
- **属性隔离**：
  - `thumbnailUrl` 仅用作 UI 队列的展示缩略图，禁止发送给 RunningHub。
  - `cropInputUrl` 唯一用作交给 RunningHub 抠图环节的输入节点参数，不可混用。
- **数据回写安全性**：RunningHub 生成成功后（`transparent_png`, `white_bg`, `mask`），写入产品 assets 数组时，**必须且仅能使用 `queueItem.productId`** 寻找目标对象。绝对禁止依赖外层全局的 `selectedProduct`，防止用户发生切换时资产覆盖错对象。
- **配置与资产真实性**：
  - 文件不可硬编码包含真实的 API Key。
  - 未配置 RunningHub 时，禁止生成或者模拟生成名为 `fileUrl: "png"` / `fileUrl: "white_bg"` 等虚假资产。
  - `transparentPngUrl` 和 `whiteBgUrl` 是两种不同的明确交付物。

## 5. RunningHub 工作流配置
配置集中在 `src/config/runningHub.ts`，通过 VITE_ 前缀环境变量注入，运行时可通过 WhiteBgRefine 右上角"工作流配置"按钮或展开配置面板覆盖（仅当前会话有效）：
- `VITE_RUNNINGHUB_ENABLED` — 总开关
- `VITE_RUNNINGHUB_API_BASE_URL` — API 基地址
- `VITE_RUNNINGHUB_API_KEY` — API 密钥
- `VITE_RUNNINGHUB_MATTING_WORKFLOW_ID` — 抠图工作流 ID（默认 `2063802342654431234`）
- `VITE_RUNNINGHUB_MATTING_INPUT_IMAGE_NODE_ID` — 输入图片节点 ID（默认 `129`）
- `VITE_RUNNINGHUB_MATTING_TRANSPARENT_PNG_NODE_ID` — 透明 PNG 输出节点 ID（默认 `159`）

右侧面板配置摘要行实时显示当前生效参数，配置详情默认折叠。

## 6. 识图能力 (vision.cjs)
当底层模型不具备原生识图能力时，使用 `vision.cjs` 调用千问 VL 模型：

```
node vision.cjs "<图片路径>" "用中文描述这张图片"
```

- 服务：阿里云百炼 DashScope
- 默认模型：`qwen-vl-max`
- 配置：`DASHSCOPE_API_KEY` 环境变量或项目 `.env` 文件
