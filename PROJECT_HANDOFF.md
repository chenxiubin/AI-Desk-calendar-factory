# AI 台历挂历电商图片生产系统：Claude Code 项目交接与图片审核模块任务书

更新时间：2026-06-13

## 1. 本次交接目标

本轮只开发“图片审核”闭环，并保证现有模板素材、模板编辑器和项目工作台不被破坏。

目标流程：

```text
模板套系库
  -> 项目工作台选择产品和完整套系
  -> 使用现有模板编辑器完成整套图片
  -> 提交审核并生成不可变审核快照
  -> 图片审核逐页通过或退回
  -> 退回页面返回项目工作台修改
  -> 重新提交该页
  -> 整套审核通过
  -> 导出中心读取已通过版本
```

图片审核模块只负责检查、记录问题和改变审核状态，不承担模板编辑、RunningHub 重跑或图片位置微调。

---

## 2. 项目位置与启动方式

项目目录：

```text
E:\Codex project\台历图片生产系统\ai台历挂历电商图片批量生产系统
```

启动：

```powershell
cd "E:\Codex project\台历图片生产系统\ai台历挂历电商图片批量生产系统"
npm run dev
```

默认地址：

```text
http://localhost:3000/
```

每个阶段必须执行：

```powershell
npm run lint
npm run build
```

---

## 3. 当前真实状态

### 3.1 已完成模块

- 产品资产库：产品和多角度资产管理。
- RunningHub 抠图资产生成：裁剪、队列、透明 PNG、白底图等流程。
- 模板套系库外层：完整套系预览、新建、复制、删除整套模板。
- 模板编辑器：模板套系内部第二层编辑工具，不再作为主导航独立入口。
- 项目工作台：选择产品和完整套系后，复制项目工作副本，并复用模板编辑器进行半自动编辑。
- 主导航已按“基础准备、模板生产、交付管理、系统”分组。

### 3.2 当前图片审核问题

- `src/components/ReviewCenter.tsx` 是旧版演示模块。
- `src/App.tsx` 中的审核图片来自硬编码的 `GeneratedImage[]` 假数据。
- 旧审核页面混入了 RunningHub、缩放和位置微调，职责不正确。
- 新的 `ProjectTemplateWorkbench` 没有把项目提交给审核中心。
- 审核状态刷新后不能可靠保存。
- `ExportCenter` 仍读取旧的 `GeneratedImage`，没有读取项目审核结果。

### 3.3 数据安全现状

模板主数据：

```text
template-store/templates.json
```

模板图片文件：

```text
assets/
```

已有恢复备份：

```text
template-store/recovery-20260613-153856/templates.json
```

截至交接时已核实：

- 模板文件中的 19 个图片引用均存在，缺失文件为 0。
- 已编辑的 8 个 3:4 主图页面仍在本地。
- 当前工作区有未提交改动，不允许使用 `git reset --hard`、`git checkout --` 或覆盖整个目录。

---

## 4. 开工前强制安全步骤

Claude Code 开始改代码前必须执行以下步骤。

### 4.1 阅读文件

```text
PROJECT_HANDOFF.md
src/App.tsx
src/types.ts
src/components/ProjectTemplateWorkbench.tsx
src/components/TemplateEditor.tsx
src/components/ReviewCenter.tsx
src/components/ExportCenter.tsx
src/utils/renderTemplate.ts
server.ts
```

只读了解以下旧模块，不要恢复为入口：

```text
src/components/SuiteWorkbench.tsx
src/components/LayeredCanvasWorkbench.tsx
```

### 4.2 创建备份

在任何修改前复制：

```text
template-store/templates.json
```

到：

```text
template-store/recovery-<时间>/templates.json
```

审核模块开发期间禁止删除、移动或重写 `assets/` 中的文件。

### 4.3 建立基线

先记录：

- `/api/templates` 返回的模板总数。
- 模板组件总数。
- 带 `imageUrl` 的组件数量。
- `assets/` 实际文件数量。
- `npm run lint` 和 `npm run build` 结果。

开发完成后必须再次对比，数量不能无故减少。

---

## 5. 不可越界区域

本轮不要修改以下业务：

- RunningHub API、工作流配置和队列。
- `CropCanvas` 和图片预处理。
- 模板组件拖拽、缩放、对齐、吸附和图层排序。
- 模板套系创建、复制、删除规则。
- `/api/templates` 的主模板保存语义。
- `assets/` 中的已有素材。
- PSD 解析。
- 导出 ZIP 的完整实现，除非进入本文第五阶段。

严禁让审核保存调用：

```text
POST /api/templates
```

审核快照必须保存到独立目录，不能写回主模板库。

---

## 6. 图片审核模块产品方案

### 6.1 职责边界

审核中心负责：

- 查看一个生产项目的整套交付页面。
- 按页面分组检查。
- 显示自动检查结果。
- 人工通过或退回单页。
- 填写问题标签和审核意见。
- 记录审核历史。
- 判断整套是否全部通过。

审核中心不负责：

- 拖动图层。
- 修改文案和素材。
- 调整产品位置和缩放。
- 调用 RunningHub。
- 直接覆盖模板或项目数据。

### 6.2 页面布局

使用全视口三栏工作界面，不制作营销式页面。

左栏，宽约 240-280px：

- 审核项目列表。
- 项目名称、产品名称、模板套系。
- 总页数、待审数、退回数、通过数。
- 项目整体状态。

中栏，弹性宽度：

- 当前项目全部页面缩略图。
- 按真实业务分组：3:4 主图、1:1 主图、SKU、详情图、白底/透明图、800/1200 场景图、书样/广告图。
- 支持“全部、待审核、需调整、已通过”筛选。
- 缩略图保持真实比例，不拉伸。
- 缩略图显示状态、页面名称、尺寸和问题数量。

右栏，宽约 320-380px：

- 当前页面大图预览。
- 页面名称、分组、比例、输出尺寸。
- 自动检查结果。
- 审核历史。
- `通过`、`退回调整`、`上一张`、`下一张`。

不要在审核中心增加编辑滑杆和画布控制框。

### 6.3 审核状态

单页状态：

```ts
type ReviewPageStatus =
  | "pending"
  | "approved"
  | "needs_adjustment";
```

项目状态：

```ts
type ReviewProjectStatus =
  | "pending_review"
  | "reviewing"
  | "needs_adjustment"
  | "approved";
```

规则：

- 新提交页面为 `pending`。
- 任意页面退回，项目为 `needs_adjustment`。
- 只要仍有待审核页面，项目不能通过。
- 所有必交付页面为 `approved` 后，项目自动变为 `approved`。
- 修改过的退回页面重新提交后，只重置该页，不重置其它已通过页面。

### 6.4 问题标签

第一版固定标签：

```ts
type ReviewIssueCode =
  | "product_position"
  | "image_crop"
  | "copywriting"
  | "logo"
  | "missing_asset"
  | "wrong_size"
  | "layer_error"
  | "other";
```

退回时至少选择一个标签，`other` 必须填写文字说明。

### 6.5 自动检查

第一版只做确定性检查：

- 页面没有图层或无法生成预览。
- 输出宽高不是正数。
- 页面声明比例与宽高比例不一致。
- 图片 URL 指向的本地文件不存在。
- 必交付页面为空白。
- 文案或关键非背景元素完全在画布外。
- 页面预览生成失败。

注意：

- 场景底图允许超出画布，不能因为超出就报警。
- 产品特写也允许部分超出画布，只检查“完全不可见”。
- 自动检查是提示，不代替人工判断。

---

## 7. 建议数据结构

不要继续扩展旧 `GeneratedImage` 作为新审核主模型。

在 `src/types.ts` 新增独立类型：

```ts
export interface ReviewIssue {
  code: ReviewIssueCode;
  message: string;
  source: "automatic" | "manual";
}

export interface ReviewHistoryItem {
  id: string;
  action: "submitted" | "approved" | "returned" | "resubmitted";
  note?: string;
  issueCodes?: ReviewIssueCode[];
  createdAt: string;
}

export interface ReviewPage {
  id: string;
  reviewProjectId: string;
  projectTemplateId: string;
  sourceTemplateId?: string;
  pageName: string;
  pageGroup: string;
  width: number;
  height: number;
  aspectRatio: string;
  required: boolean;
  previewUrl?: string;
  templateSnapshot: Template;
  status: ReviewPageStatus;
  issues: ReviewIssue[];
  reviewNote?: string;
  version: number;
  submittedAt: string;
  reviewedAt?: string;
  history: ReviewHistoryItem[];
}

export interface ReviewProject {
  id: string;
  projectWorkspaceId: string;
  projectName: string;
  productId: string;
  productName: string;
  suiteRootId: string;
  suiteName: string;
  status: ReviewProjectStatus;
  pages: ReviewPage[];
  createdAt: string;
  updatedAt: string;
}
```

`templateSnapshot` 是审核时的项目模板副本，不是主模板引用。这样审核期间继续编辑也不会改变已经提交的审核画面。

---

## 8. 本地保存方案

新增独立目录：

```text
review-store/reviews.json
review-store/previews/
```

建议 API：

```text
GET    /api/reviews
POST   /api/reviews/submit
PATCH  /api/reviews/:reviewProjectId/pages/:pageId
POST   /api/reviews/:reviewProjectId/pages/:pageId/resubmit
POST   /api/review-assets
```

要求：

- 写文件使用“临时文件写入成功后再替换正式文件”的方式，避免中途损坏 JSON。
- `reviews.json` 不允许保存巨大的 data URL。
- 页面预览图保存到 `review-store/previews/`，JSON 只保存 URL。
- 预览文件名包含审核项目 ID、页面 ID 和版本号。
- 不删除历史版本图片，第一版可保留全部版本。
- 服务启动时目录不存在应自动创建。

---

## 9. 分阶段执行任务

### 第一阶段：审核数据与本地保存

目标：审核数据刷新后不丢失。

允许修改：

```text
src/types.ts
server.ts
```

任务：

1. 新增本文定义的审核类型。
2. 新增 `review-store` 读写逻辑和 API。
3. 新增预览图片上传接口。
4. 校验请求参数，不能接受空项目和空页面 ID。
5. 不修改 `/api/templates`。

验收：

- 创建审核项目后刷新仍存在。
- 更新单页状态后刷新仍存在。
- 模板数量、图片引用和 `assets/` 文件数量不变。

### 第二阶段：项目工作台提交审核

目标：把当前项目工作副本提交为审核快照。

允许修改：

```text
src/components/ProjectTemplateWorkbench.tsx
src/utils/reviewSubmission.ts（可新建）
```

任务：

1. 项目工具栏增加 `提交审核`。
2. 提交前先保存当前项目工作副本。
3. 排除套系根记录，只提交实际子模板页面。
4. 对每个页面生成预览图片。
5. 预览图片上传到 `/api/review-assets`。
6. 将完整 `templateSnapshot`、页面分组和自动检查结果提交到 `/api/reviews/submit`。
7. 页面已有审核记录时，按页面 ID 和版本号更新，不重复制造同一版本。
8. 提交成功后显示页面数量和失败数量，不自动跳转。

验收：

- 提交 8 张主图时审核中心准确出现 8 张。
- 刷新后审核项目仍在。
- 预览和项目工作台画面一致。
- 提交审核不会调用 `/api/templates`。

### 第三阶段：重建图片审核界面

目标：用真实审核项目替换旧演示界面。

主要修改：

```text
src/components/ReviewCenter.tsx
src/App.tsx
```

任务：

1. 删除 `App.tsx` 中硬编码的 `GeneratedImage` 审核假数据。
2. `ReviewCenter` 从 `/api/reviews` 读取数据。
3. 按本文三栏布局实现界面。
4. 支持单页通过和退回。
5. 退回弹窗必须选择问题标签并允许填写意见。
6. 支持状态筛选、页面分组和上一张/下一张。
7. 支持“通过当前筛选页面”，执行前二次确认。
8. 没有审核项目时显示明确空态和“请先在项目工作台提交审核”。

必须移除旧审核模块中的：

- RunningHub 工作流选择。
- RunningHub 轮询。
- 产品位置、缩放和偏移滑杆。
- 旧的假质量报警。
- 依赖旧 `GeneratedImage` 的审核主流程。

验收：

- 审核页面没有编辑图片的控件。
- 通过/退回后状态立即更新并持久化。
- 所有页面通过后项目自动显示“审核通过”。
- 页面尺寸和比例显示正确。

### 第四阶段：退回修改闭环

目标：审核意见能够回到项目工作台。

允许修改：

```text
src/App.tsx
src/components/ReviewCenter.tsx
src/components/ProjectTemplateWorkbench.tsx
src/components/TemplateEditor.tsx（只允许增加定位当前子模板的可选参数）
```

任务：

1. 审核退回页增加 `返回项目修改`。
2. 跳转项目工作台并定位对应项目和子模板。
3. 项目顶部显示该页审核标签和意见。
4. 修改保存后提供 `重新提交该页`。
5. 重新提交只增加该页版本号，并保留历史。
6. 其它已通过页面状态保持不变。

验收：

- 从审核页一次点击能打开正确的项目页面。
- 能看到退回原因。
- 重新提交后该页变为待审核。
- 审核历史能看到提交、退回和重新提交记录。

### 第五阶段：导出中心衔接

目标：只导出整套审核通过的版本。

主要修改：

```text
src/components/ExportCenter.tsx
src/App.tsx
```

任务：

1. `ExportCenter` 改为读取 `ReviewProject`。
2. 只显示状态为 `approved` 的项目。
3. 导出使用审核通过页面对应的 `previewUrl` 或最终输出 URL。
4. 保留现有交付目录规则，但不再使用旧 `GeneratedImage` 假数据。
5. 未全部通过的项目禁止导出并说明原因。

这一阶段不要顺便重写 ZIP 或目录规则。

---

## 10. 前端交互要求

- 审核中心应是紧凑的生产工具界面。
- 页面铺满可用视口，不使用大面积四周留白。
- 卡片圆角不超过 8px，避免卡片套卡片。
- 状态颜色固定：待审为黄色、通过为绿色、退回为红色。
- 按钮使用 Lucide 图标。
- 缩略图尺寸稳定，图片加载与状态改变不能导致布局跳动。
- 方图、3:4、详情长图必须保持真实比例，不拉伸。
- 文字不能遮挡图片或溢出按钮。
- 不显示开发术语、JSON、模板 ID 等内部信息。

---

## 11. 测试清单

每个阶段完成后检查：

### 数据安全

- `template-store/templates.json` 仍能读取。
- 模板总数没有无故减少。
- 带图片组件数量没有减少。
- 19 个现有图片引用仍能找到文件。
- 没有删除 `assets/` 文件。

### 审核流程

- 项目能提交审核。
- 刷新后审核项目仍存在。
- 页面数量与项目子模板数量一致。
- 单页通过有效。
- 单页退回必须有标签。
- 重新提交只重置当前页。
- 整套通过条件正确。
- 未通过整套不能导出。

### 工程检查

```powershell
npm run lint
npm run build
```

启动页面后至少测试：

```text
模板套系库 -> 编辑模板
项目工作台 -> 打开已有项目
项目工作台 -> 提交审核
图片审核 -> 通过一页
图片审核 -> 退回一页
刷新浏览器 -> 状态仍存在
返回项目修改 -> 定位正确页面
```

---

## 12. 完成后的汇报格式

Claude Code 每个阶段完成后按以下格式汇报：

```text
已完成阶段：

修改文件：
1. ...
2. ...

完成内容：
- ...
- ...

数据安全检查：
- 模板总数：修改前 / 修改后
- 图片引用：修改前 / 修改后
- 缺失图片文件：0 / 非0

验证结果：
- npm run lint：通过 / 未通过
- npm run build：通过 / 未通过
- 前端实际流程：通过 / 未通过

仍未完成：
- ...
```

如果数据数量减少、图片文件缺失或审核保存调用了 `/api/templates`，立即停止，不要继续下一阶段。

---

## 13. 可直接发给 Claude Code 的执行指令

```text
请阅读项目根目录 PROJECT_HANDOFF.md，并严格按其中的“图片审核模块任务书”执行。

项目目录：
E:\Codex project\台历图片生产系统\ai台历挂历电商图片批量生产系统

执行要求：
1. 先完成第 4 节的备份和基线检查，不要立刻改代码。
2. 按第一阶段到第五阶段顺序执行，每完成一个阶段先运行 npm run lint 和 npm run build，再进行实际页面验证。
3. 每阶段验证通过后再进入下一阶段；发生数据减少或图片缺失立即停止并汇报。
4. 审核数据必须写入 review-store，绝对不能通过 POST /api/templates 保存。
5. 不要删除、移动或覆盖 assets 中的现有图片。
6. 不要修改 RunningHub、CropCanvas、模板画布交互、模板套系创建/复制/删除和主模板保存逻辑。
7. 不要恢复旧 SuiteWorkbench 或 LayeredCanvasWorkbench 为主入口。
8. ReviewCenter 使用真实项目审核快照，删除旧 GeneratedImage 假数据和旧 RunningHub/位置微调审核功能。
9. 第一版以稳定闭环为优先，不增加权限、多用户、AI 评分或复杂版本对比。
10. 当前工作区已有未提交改动，禁止 git reset --hard、git checkout -- 或回退不属于本任务的修改。

请先只执行第一阶段。完成后按 PROJECT_HANDOFF.md 第 12 节格式汇报，等待我确认后再开始第二阶段。
```
