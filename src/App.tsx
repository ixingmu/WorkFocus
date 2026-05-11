import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Timer, 
  ListTodo, 
  BarChart3, 
  Settings as SettingsIcon,
  Bell,
  User,
  Focus,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Howl } from 'howler';
import confetti from 'canvas-confetti';

import { AppSettings, Task, PomodoroSession, ViewType } from './types';
import Sidebar from './components/Sidebar';
import TimerView from './components/Timer';
import TaskList from './components/TaskList';
import Statistics from './components/Statistics';
import SettingsView from './components/Settings';

const DEFAULT_SETTINGS: AppSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: true,
  soundEnabled: true,
  notificationsEnabled: true,
  tickSoundEnabled: false,
  alarmSoundId: 'classic',
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('timer');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('work-focus-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('work-focus-tasks');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [sessions, setSessions] = useState<PomodoroSession[]>(() => {
    const saved = localStorage.getItem('work-focus-sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('work-focus-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('work-focus-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('work-focus-sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Actions
  const addTask = (title: string, expectedPomodoros: number = 1) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date().toISOString(),
      completedAt: null,
      pomodoros: 0,
      expectedPomodoros,
      progress: 0,
      order: tasks.length,
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask.id;
  };

  const updateTaskProgress = (id: string, progress: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, progress: Math.min(100, progress) } : t));
  };

  const updateTasksOrder = (newTasks: Task[]) => {
    setTasks(newTasks);
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { 
      ...t, 
      completedAt: t.completedAt ? null : new Date().toISOString() 
    } : t));
  };

  const addPomodoroToTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, pomodoros: t.pomodoros + 1 } : t));
  };

  const recordSession = (session: Omit<PomodoroSession, 'id'>) => {
    const newSession: PomodoroSession = {
      ...session,
      id: crypto.randomUUID(),
    };
    setSessions(prev => [newSession, ...prev]);
    if (session.type === 'focus' && session.taskId) {
      addPomodoroToTask(session.taskId);
    }
  };

  return (
    <div className="flex h-screen bg-background text-on-surface overflow-hidden selection:bg-primary selection:text-on-primary">
      {/* Sidebar */}
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col relative h-screen overflow-hidden p-6">
        {/* Ambient background glow - subtle blue for Bento */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none z-0" />
        
        {/* Top App Bar */}
        <header className="h-14 mb-6 flex justify-between items-end relative z-10 shrink-0">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              {currentView === 'timer' && '番茄专注 · Pomodoro'}
              {currentView === 'tasks' && '我的任务 · Tasks'}
              {currentView === 'statistics' && '每周进展 · Stats'}
              {currentView === 'settings' && '系统设置 · Settings'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">Windows 桌面增强版 / 高效任务管理系统</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-4 hidden md:block">
              <div className="text-[10px] font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-600">MEM: 12.4MB / CPU: 0.2%</div>
            </div>
            <button className="p-2 rounded-xl hover:bg-white shadow-sm border border-transparent hover:border-gray-200 transition-all text-on-surface-variant hover:text-primary">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-xl hover:bg-white shadow-sm border border-transparent hover:border-gray-200 transition-all text-on-surface-variant hover:text-primary">
              <User className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          {currentView === 'timer' && (
            <TimerView 
              settings={settings} 
              onSessionComplete={recordSession}
              tasks={tasks}
              activeTaskId={activeTaskId}
              setActiveTaskId={setActiveTaskId}
              addTask={addTask}
              onUpdateProgress={updateTaskProgress}
            />
          )}
          {currentView === 'tasks' && (
            <TaskList 
              tasks={tasks} 
              onAddTask={addTask} 
              onToggleTask={toggleTaskCompletion}
              sessions={sessions}
              onUpdateOrder={updateTasksOrder}
              onStartTask={(id) => {
                setActiveTaskId(id);
                setCurrentView('timer');
              }}
            />
          )}
          {currentView === 'statistics' && (
            <Statistics sessions={sessions} />
          )}
          {currentView === 'settings' && (
            <SettingsView settings={settings} onUpdateSettings={setSettings} />
          )}
        </div>
      </main>
    </div>
  );
}
