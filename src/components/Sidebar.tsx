import React from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Scissors,
  Layout,
  Edit,
  Layers,
  ShieldCheck,
  Download,
  BarChart3,
  Settings,
  Calendar,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingReviewCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingReviewCount,
  isOpen,
  onToggle,
  onClose,
}) => {
  const menuItems = [
    { id: "workspace", label: "工作台首页", icon: LayoutDashboard },
    { id: "assets", label: "产品资产库", icon: FolderOpen },
    { id: "refine", label: "抠图资产生成", icon: Scissors, badge: "AI" },
    { id: "templates", label: "模板套系库", icon: Layout },
    { id: "editor", label: "模板编辑器", icon: Edit },
    { id: "project_suite", label: "项目工作台", icon: Sparkles, badge: "全新" },
    {
      id: "review",
      label: "图片审核",
      icon: ShieldCheck,
      badge: pendingReviewCount > 0 ? pendingReviewCount.toString() : undefined,
    },
    { id: "export", label: "导出中心", icon: Download },
    { id: "statistics", label: "数据统计", icon: BarChart3 },
    { id: "settings", label: "系统设置", icon: Settings },
  ];

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={`fixed left-4 top-4 z-50 h-11 w-11 rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/10 flex items-center justify-center transition-all hover:bg-slate-50 active:scale-95 ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-label="打开导航"
        title="打开导航"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isOpen && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]"
          aria-label="关闭导航背景"
        />
      )}

      <aside
        className={`fixed left-4 top-4 bottom-4 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col border border-slate-800 rounded-2xl shadow-2xl shadow-slate-950/30 overflow-hidden transition-all duration-200 ${
          isOpen
            ? "translate-x-0 opacity-100 pointer-events-auto"
            : "-translate-x-[calc(100%+2rem)] opacity-0 pointer-events-none"
        }`}
      >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/10 shrink-0">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-white tracking-widest leading-none">
            台历拼工厂
          </h1>
          <p className="text-[10px] text-slate-400 mt-1 leading-none uppercase tracking-wider">
            企业电商图片生产后台
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 flex items-center justify-center hover:bg-slate-700 hover:text-white transition-colors"
          aria-label="关闭导航"
          title="关闭导航"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User Information Minimal Quick View */}
      <div className="p-3 border-b border-slate-800 mx-2 my-3 rounded-lg bg-slate-950/40 flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300 border border-slate-700">
          运营
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-200 truncate">
            运营管理员 (云端)
          </div>
          <p className="text-[9px] text-slate-500 truncate mt-0.5">
            Chenxiubin86@...
          </p>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse" />
      </div>

      {/* Nav list */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                onClose();
              }}
              className={`w-full flex items-center px-3.5 py-2.5 text-xs font-medium rounded-lg transition-all group relative ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/25"
                  : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <IconComponent
                className={`w-4 h-4 mr-3 shrink-0 ${
                  isActive
                    ? "text-white"
                    : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={`ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                    item.badge === "AI"
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "bg-amber-500 text-slate-950 font-bold"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Info Footnote */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 text-center text-[10px] text-slate-600">
        <p className="font-mono">MVP Production v1.0.0</p>
        <p className="mt-1">由 Antigravity 智能引擎托管</p>
      </div>
    </aside>
    </>
  );
};
