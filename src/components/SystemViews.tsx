import React, { useState } from "react";
import {
  BarChart3,
  Settings,
  ShieldCheck,
  Database,
  Key,
  HelpCircle,
  Save,
  CheckCircle,
} from "lucide-react";

// TABS 9 & 10: Unified under system views for robust modularity
export const DataStatistics: React.FC = () => {
  return (
    <div className="space-y-6 text-left">
      {/* Intro */}
      <div className="bg-white p-6 rounded border border-neutral-100 shadow-xs flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">
            台历图纸批量套版排产分析
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            实时查看电商主图产量、白底抠像通过率及各分销平台套版分发数据情况。
          </p>
        </div>
        <BarChart3 className="w-8 h-8 text-neutral-400" />
      </div>

      {/* Stats charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-4 bg-white border rounded shadow-xs text-xs space-y-3">
          <span className="text-neutral-400 font-bold block">
            1. 畅销款式分类排布占比
          </span>
          <div className="space-y-2 pt-1 font-semibold text-neutral-700">
            {[
              {
                name: "国潮年货系列",
                count: 124,
                pct: 38,
                color: "bg-red-600",
              },
              {
                name: "喜庆精雕系列",
                count: 96,
                pct: 29,
                color: "bg-rose-500",
              },
              {
                name: "商务温润高级定制",
                count: 64,
                pct: 20,
                color: "bg-blue-600",
              },
              {
                name: "儿童简笔插画",
                count: 42,
                pct: 13,
                color: "bg-amber-500",
              },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span>{item.name}</span>
                  <span className="font-mono text-neutral-510">
                    {item.count}款 ({item.pct}%)
                  </span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-white border rounded shadow-xs text-xs space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-neutral-400 font-bold block">
              2. 质量检验合格阻断率
            </span>
            <div className="flex items-center space-x-4 my-3 text-left">
              <div className="w-16 h-16 rounded-full border-8 border-emerald-500 border-t-amber-400 flex items-center justify-center font-black text-xs text-neutral-800">
                98.1%
              </div>
              <div className="space-y-1 text-[11px]">
                <p className="text-neutral-800 font-bold">批次质检平均合格率</p>
                <p className="text-neutral-400 font-medium">
                  穿模阻断发生率: 1.4%
                </p>
                <p className="text-neutral-400 font-medium">
                  文案越界溢出发生率: 0.5%
                </p>
              </div>
            </div>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-800 rounded border text-[10.5px] border-emerald-100">
            <strong>建议：</strong>
            针对单本台历层叠主图，调节副台历槽比例因子至80%以下能让线圈零重叠。
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-white border rounded shadow-xs text-xs space-y-3">
          <span className="text-neutral-400 font-bold block">
            3. 周产量趋势指标
          </span>
          {/* Custom micro SVG representation chart */}
          <div className="h-32 flex items-end space-x-3.5 pt-2 select-none justify-around">
            {[
              { day: "周一", count: 180, active: false },
              { day: "周二", count: 240, active: false },
              { day: "周三", count: 320, active: false },
              { day: "周四", count: 480, active: true },
              { day: "周五", count: 410, active: false },
              { day: "周六", count: 150, active: false },
              { day: "周日", count: 90, active: false },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center flex-1 h-full justify-end"
              >
                <span className="text-[9px] font-mono font-bold text-neutral-550 mb-1">
                  {item.count}
                </span>
                <div
                  className={`w-full rounded-t transition-all ${item.active ? "bg-red-650" : "bg-neutral-350"}`}
                  style={{
                    height: `${(item.count / 500) * 100}%`,
                    minHeight: "10px",
                  }}
                />
                <span className="text-[10px] text-neutral-400 mt-1.5 font-medium shrink-0">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SystemSettings: React.FC = () => {
  const [localDir, setLocalDir] = useState(
    "D:/ECommerceData/CalendarRenderOutputs",
  );
  const [useAIAutoRefine, setUseAIAutoRefine] = useState(true);
  const [hasGeminiKey, setHasGeminiKey] = useState(true);

  return (
    <div className="bg-white rounded border text-left p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="border-b pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">AI拼架系统设置</h2>
          <p className="text-xs text-neutral-500 mt-1">
            设置本地服务器文件夹挂载挂线、默认导出的压缩参数及人工智能模型连接配置。
          </p>
        </div>
        <Settings className="w-7 h-7 text-neutral-400" />
      </div>

      <div className="space-y-4 text-xs text-neutral-700">
        {/* Folders */}
        <div className="space-y-1">
          <label className="block text-neutral-550 font-bold mb-1 uppercase text-[10px]">
            本地输出文件备份备份根路径
          </label>
          <input
            type="text"
            value={localDir}
            onChange={(e) => setLocalDir(e.target.value)}
            className="w-full bg-neutral-50 border rounded p-2 font-mono text-neutral-800"
          />
          <p className="text-[10px] text-neutral-400 mt-1">
            批量导出压缩包除了直接下载，也将同时存储成标准快照在该磁盘路径下。
          </p>
        </div>

        {/* AI Key indicators */}
        <div className="p-4 bg-neutral-50 border rounded space-y-3">
          <span className="font-bold text-neutral-800 flex items-center">
            <Key className="w-4 h-4 mr-1.5 text-blue-600" />
            Gemini AI 引擎证书配置 (Server-Side)
          </span>
          <div className="flex items-center space-x-2 text-[11px]">
            <span className="bg-emerald-100 text-emerald-800 border-emerald-250 border font-bold px-2 py-0.5 rounded">
              ● 已挂接系统环境密钥
            </span>
            <span className="text-neutral-450 font-mono">
              process.env.GEMINI_API_KEY = "Fitted automatically"
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 leading-normal">
            系统自带云端智能抠像及AI画质锐超分插件。密钥无需用户在页面前端输入，系统在后台已自动绑定并保护，杜绝泄露风险。
          </p>
        </div>

        {/* Toggles settings */}
        <div className="space-y-3.5 border-t pt-4">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
            运行参数开关
          </span>

          <label className="flex items-center space-x-2 cursor-pointer font-bold text-neutral-800">
            <input
              type="checkbox"
              checked={useAIAutoRefine}
              onChange={(e) => setUseAIAutoRefine(e.target.checked)}
              className="rounded text-red-650 focus:ring-red-500 border-neutral-300"
            />
            <span>在白底抠图像环节执行自动微小畸变几何拉直</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer font-bold text-neutral-800">
            <input
              type="checkbox"
              defaultChecked
              className="rounded text-red-650 focus:ring-red-500 border-neutral-300"
            />
            <span>自动在导出的ZIP名称中嵌入时间水印 (e.g. _20260604)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer font-bold text-neutral-800">
            <input
              type="checkbox"
              defaultChecked
              className="rounded text-red-650 focus:ring-red-500 border-neutral-300"
            />
            <span>
              开启安全区强制自动标记阻断 (凡超出5%画框则不容批量直接放行)
            </span>
          </label>
        </div>

        {/* Saves */}
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={() => {
              alert("【系统参数存盘成功】。");
            }}
            className="bg-red-650 hover:bg-red-700 text-white font-bold py-2 px-5 rounded text-xs flex items-center space-x-1"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span>保存设置并生效</span>
          </button>
        </div>
      </div>
    </div>
  );
};
