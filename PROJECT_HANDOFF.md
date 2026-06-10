# Project Handoff

## 1. 当前开发状态

### 已完成
- **产品资产库**：批量上传图片、资产缩略图预览、产品 CRUD、删除资产
- **抠图资产生成**：RunningHub 抠图队列、三模式裁剪画布、工作流配置面板（折叠/展开）、配置弹窗
- **RunningHub 对接**：上传→创建任务→轮询结果 完整闭环，mock 模式可用

### 进行中
- **模板编辑器**：Codex 已重构为业务模板配置系统，支持双渲染模式（旧版 Slot + 新版 Component）
- **模板套系库 / 项目工作台**：流程还需简化（三套编辑入口冲突、套系数据不同步等问题待解决）

## 2. 模板编辑器（Codex 重构后）

### 核心架构
- `BusinessTemplateConfig`：每个模板页绑定产品线、交付类型、比例版本、业务角色、数量配额
- 6 个浮动面板：info / import / slots / layers / test / save
- 右侧缩略图面板：15 张预定义缩略图，分 4 组，按 count 自动展开
- 8 项业务规则自动检查
- 支持旧版 `TemplateSlot[]` 和新版 `TemplateComponent[]` 双模式
- `sendToRunningHub` 标记：区分 Canvas 合成层和 RunningHub 融合层

### 关键文件
- `src/components/TemplateEditor.tsx` (2255 行) — 主编辑器
- `src/types.ts` — `BusinessTemplateConfig`、`TemplateComponent`、`FloatingPanel` 等类型
- `src/utils/renderTemplate.ts` — `getTemplateComponents()` 转换函数

## 3. 已知问题

### 模板相关
- TemplateEditor / SuiteWorkbench / LayeredCanvasWorkbench 三套编辑入口冲突
- 模板套系数据在 TemplateLibrary 和 SuiteWorkbench 中不同步（各自维护 suites 数组）
- SuiteWorkbench 遗留"位置微调旧面板"和新分层编辑器同时存在
- TemplateLibrary → SuiteWorkbench 跳转链条过长（4 步状态传递）

### 抠图相关
- WhiteBgRefine 轮询时需要传 `effectiveConfig`（API Key），之前漏传导致轮询失败（已修）
- 配置弹窗中修改的参数仅当前会话有效

## 4. 文件责任边界

### 可修改（当前阶段）
- `WhiteBgRefine.tsx`、`CropCanvas.tsx`
- `imagePreprocess.ts`、`runningHubMatting.ts`、`runninghubClient.ts`
- `src/config/runningHub.ts`
- `AssetLibrary.tsx`
- `TemplateEditor.tsx`、`TemplateLibrary.tsx`、`SuiteWorkbench.tsx`
- `LayeredCanvasWorkbench.tsx`
- `server.ts`（RunningHub 端点）
- `.env.example`

### 需明确指令再改
- `projectPageFactory.ts`、`businessRuleHelpers.ts`、`calendarTaxonomy.ts`
- `renderTemplate.ts`（Canvas 渲染引擎）
- `ReviewCenter.tsx`、`ExportCenter.tsx`
