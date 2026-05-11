import { Timer, ListTodo, BarChart3, Settings, User, ShieldCheck, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { ViewType } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

export default function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'timer', label: '计时器', icon: Timer },
    { id: 'tasks', label: '任务', icon: ListTodo },
    { id: 'statistics', label: '统计', icon: BarChart3 },
    { id: 'settings', label: '设置', icon: Settings },
    { id: 'admin', label: '系统管理', icon: ShieldCheck },
  ] as const;

  return (
    <nav className="bg-white/80 backdrop-blur-3xl h-screen w-64 fixed left-0 top-0 border-r border-gray-200 shadow-sm flex flex-col p-4 gap-2 z-50">
      <div className="mb-10 px-2 pt-4 flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">番茄专注 <span className="text-primary">· Pomodoro</span></h1>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Windows Edition</p>
      </div>

      <div className="flex flex-col gap-1 flex-grow">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 group text-left",
                isActive 
                  ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" 
                  : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-900"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "fill-current text-white")} />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto px-2 pt-4 border-t border-gray-100 flex flex-col gap-4">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 group-hover:border-primary/30 transition-colors">
              <User className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
            </div>
            <span className="text-[10px] font-black text-gray-600 font-mono tracking-tighter truncate max-w-[100px]">
              {user ? user.phone : '未登录 (游客)'}
            </span>
          </div>
          {user && (
            <button 
              onClick={() => confirm('确定要退出登录吗？') && logout()}
              className="p-2 text-gray-300 hover:text-red-500 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="pb-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">© 2024</p>
          <a 
            href="https://g-2.cn" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] text-gray-400 font-medium hover:text-primary transition-colors block leading-tight"
          >
            青岛赢智库网络科技有限公司
          </a>
          <p className="text-[10px] text-gray-300 mt-1">Version 1.2.0 Stable</p>
        </div>
      </div>
    </nav>
  );
}
