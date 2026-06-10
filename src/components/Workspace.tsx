import React from "react";
import {
  Upload,
  Scissors,
  Layout,
  Layers,
  ShieldCheck,
  Download,
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { GenerationTask } from "../types";

interface WorkspaceProps {
  tasks: GenerationTask[];
  onNavigate: (tab: string) => void;
  reviewCount: number;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  tasks,
  onNavigate,
  reviewCount,
}) => {
  // Stat Card Items
  const stats = [
    {
      label: "产品总数",
      value: "326 款",
      rate: "+12本昨日",
      desc: "实拍原图待入库",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "已完成白底精修",
      value: "280 款",
      rate: "85.8% 覆盖率",
      desc: "符合等比不变形标准",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "可用固定配置模板",
      value: "42 个",
      rate: "8大版式细分",
      desc: "主图/SKU/工艺详情",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "待人工审核图片",
      value: `${reviewCount} 张`,
      rate: "需100%质检",
      desc: "重点检查线圈遮挡",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "累计已批量导出",
      value: "3,200 张",
      rate: "5大电商格式",
      desc: "包含淘宝、拼多多",
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  // Steps indicators
  const steps = [
    {
      step: "1",
      name: "上传产品",
      desc: "实拍台历多角度入库",
      tabId: "assets",
      icon: Upload,
    },
    {
      step: "2",
      name: "白底精修",
      desc: "抠透明PNG并加阴影",
      tabId: "refine",
      icon: Scissors,
    },
    {
      step: "3",
      name: "配制模板",
      desc: "锁定槽宽高比与字段",
      tabId: "templates",
      icon: Layout,
    },
    {
      step: "4",
      name: "批量套版",
      desc: "一键匹配生成多格式",
      tabId: "batch",
      icon: Layers,
    },
    {
      step: "5",
      name: "质检审核",
      desc: "快速剔除变形图并导出",
      tabId: "review",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans tracking-tight">
            AI台历/挂历电商图片批量生产控制中心
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            专注台历挂历电商图片（主图、SKU配图、四宫格详情等）的高质、精准、批量生产工厂。
          </p>
        </div>
        <div className="flex space-x-2 text-xs">
          <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-semibold border border-emerald-200">
            ● 生产服务器: 联机正常
          </span>
          <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-semibold border border-blue-200">
            线程数: 16 并发
          </span>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stats.map((item, idx) => (
          <div
            key={idx}
            className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
          >
            <span className="text-[11px] font-sans font-semibold text-slate-500 tracking-wider">
              {item.label}
            </span>
            <div className="my-2.5">
              <span
                className={`text-2xl font-black font-mono tracking-tight ${item.color.replace("text-rose-", "text-indigo-").replace("text-amber-", "text-amber-500")}`}
              >
                {item.value}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400">
              <span className="font-semibold text-slate-600">{item.rate}</span>
              <span>{item.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Operation Flow Pathway */}
      <section className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4 font-sans tracking-tight">
          台历图片批量生产标准工作流 (点击快速跳转)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                onClick={() => onNavigate(item.tabId)}
                className="group cursor-pointer border border-slate-200 hover:border-blue-500 hover:bg-slate-50/50 p-4 rounded-xl relative transition-all duration-200 flex flex-col items-center text-center"
              >
                {/* Visual Connector Line */}
                {index < 4 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 w-4 h-[1px] bg-slate-200 z-10 group-hover:bg-blue-300" />
                )}
                <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center font-bold text-sm mb-2 shadow-xs transition-colors duration-200 border border-slate-100">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-slate-805 group-hover:text-blue-605">
                  步骤 {item.step}: {item.name}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tasks Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Queue List */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800 font-sans tracking-tight">
              批量排产渲染队列
            </h3>
            <span className="text-[11px] bg-blue-500/10 text-blue-600 font-bold px-2 py-0.5 rounded">
              3个活动中
            </span>
          </div>

          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {task.status === "running" ? (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                    ) : task.status === "completed" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-800">
                      {task.taskName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px]">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold uppercase ${
                        task.status === "running"
                          ? "bg-blue-100 text-blue-800"
                          : task.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {task.status === "running"
                        ? "烘焙渲染中"
                        : task.status === "completed"
                          ? "已就绪"
                          : "待执行"}
                    </span>
                    <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                      {task.completedCount} / {task.totalCount}张成功
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
                    <span>生成进度</span>
                    <span>{Math.round(task.progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        task.status === "completed"
                          ? "bg-emerald-500"
                          : "bg-blue-600"
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>

                {/* Estimation Meta info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[10px] text-slate-400 border-t border-slate-100 pt-2.5">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      耗时:{" "}
                      {task.status === "completed" ? "00:08:24" : "00:02:15"}
                    </span>
                  </div>
                  <div>
                    估算剩余:{" "}
                    {task.status === "running" ? "00:06:10" : "00:00:00"}
                  </div>
                  <div>
                    失败率:{" "}
                    <span
                      className={
                        task.failedCount > 0 ? "text-rose-500 font-bold" : ""
                      }
                    >
                      {task.failedCount}张
                    </span>
                  </div>
                  <div>
                    待审核:{" "}
                    <span className="font-bold text-amber-600">
                      {task.pendingReviewCount}张
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Constraints Checklist & Rules */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3.5 font-sans tracking-tight">
              台历挂历电商合成约束红线
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-2.5 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">
                    等比例防变形锁定
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    台历线圈高比、底座角度及文字属于静态实物。AI生成背景与装饰时，绝对禁止拉伸、裁剪核心正面产品部件。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 text-xs">
                <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">
                    阴影层独立拆分规则
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    产品实物PNG抠图须为去背纯透明图，硬塞阴影不便后期多维度背景贴合。阴影由对应模板槽的{" "}
                    <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px] text-slate-600">
                      shadowRule
                    </code>{" "}
                    动态提供。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 text-xs">
                <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">
                    系统文案由前端矢量排字
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    年份、标题、产品标签不使用扩散生图乱揉生成。由前端图层或精细Canvas叠加标准思源/黑体动态渲染。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-600 mt-4">
            <span className="font-bold text-slate-800">💡 智能质检建议</span>
            <p className="mt-1 leading-relaxed">
              批量渲染完毕后，系统将自动使用轻量级视觉比对，凡产品超出安全限制或遮挡比超出35%将被标记为危急状态，优先送审。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
