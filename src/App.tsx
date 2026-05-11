import { useState, useEffect } from 'react';
import { 
  Bell,
  User,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useTimer } from './contexts/TimerContext';
import { Task, PomodoroSession, ViewType } from './types';
import Sidebar from './components/Sidebar';
import TimerView from './components/Timer';
import TaskList from './components/TaskList';
import Statistics from './components/Statistics';
import SettingsView from './components/Settings';
import Login from './components/Login';
import AdminView from './components/Admin';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { settings, updateSettings } = useTimer();
  const [currentView, setCurrentView] = useState<ViewType>('timer');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync with backend when logged in
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [tasksRes, sessionsRes] = await Promise.all([
            fetch('/api/tasks'),
            fetch('/api/sessions')
          ]);
          if (tasksRes.ok) setTasks(await tasksRes.json());
          if (sessionsRes.ok) setSessions(await sessionsRes.json());
        } catch (err) {
          console.error('Failed to fetch user data');
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  // Actions with Backend Sync
  const addTask = async (title: string, expectedPomodoros: number = 1) => {
    const newTask: Omit<Task, 'id'> = {
      title,
      createdAt: new Date().toISOString(),
      completedAt: null,
      pomodoros: 0,
      expectedPomodoros,
      progress: 0,
      order: tasks.length,
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      const savedTask = await res.json();
      setTasks(prev => [savedTask, ...prev]);
      return savedTask.id;
    } catch (err) {
      console.error('Failed to save task');
      return '';
    }
  };

  const updateTaskProgress = async (id: string, progress: number) => {
    const newProgress = Math.min(100, progress);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, progress: newProgress } : t));
    
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: newProgress })
      });
    } catch (err) {
      console.error('Failed to update progress');
    }
  };

  const toggleTaskCompletion = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const completedAt = task.completedAt ? null : new Date().toISOString();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completedAt } : t));

    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedAt })
      });
    } catch (err) {
      console.error('Failed to toggle completion');
    }
  };

  const recordSession = async (session: Omit<PomodoroSession, 'id'>) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      const savedSession = await res.json();
      setSessions(prev => [savedSession, ...prev]);
      
      // Update task pomodoro count if it was a focus session
      if (session.type === 'focus' && session.taskId) {
        setTasks(prev => prev.map(t => 
          t.id === session.taskId ? { ...t, pomodoros: t.pomodoros + 1 } : t
        ));
      }
    } catch (err) {
      console.error('Failed to record session');
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-gray-400 font-bold uppercase tracking-widest text-xs">
        Loading System Context...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-background text-on-surface overflow-hidden selection:bg-primary selection:text-on-primary">
      {/* Sidebar */}
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col relative h-screen overflow-hidden p-6">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none z-0" />
        
        <header className="h-14 mb-6 flex justify-between items-end relative z-10 shrink-0">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              {currentView === 'timer' && '番茄专注 · Pomodoro'}
              {currentView === 'tasks' && '我的任务 · Tasks'}
              {currentView === 'statistics' && '每周进展 · Stats'}
              {currentView === 'settings' && '系统设置 · Settings'}
              {currentView === 'admin' && '后台管理 · Admin'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">Windows 桌面增强版 / 高效任务管理系统</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-4 hidden md:block">
              <div className="text-[10px] font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-600">CLIENT: CONNECTED / DB: READY</div>
            </div>
            <button className="p-2 rounded-xl hover:bg-white shadow-sm border border-transparent hover:border-gray-200 transition-all text-on-surface-variant hover:text-primary">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-xl hover:bg-white shadow-sm border border-transparent hover:border-gray-200 transition-all text-on-surface-variant hover:text-primary">
              <User className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-[2rem]">
               <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-xl border border-gray-100">
                  <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <span className="text-xs font-black text-gray-900 uppercase tracking-widest">同步中...</span>
               </div>
            </div>
          )}
          
          {currentView === 'timer' && (
            <TimerView 
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
              onUpdateOrder={setTasks}
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
            <SettingsView settings={settings} onUpdateSettings={updateSettings} />
          )}
          {currentView === 'admin' && (
            <AdminView />
          )}
        </div>
      </main>
    </div>
  );
}
