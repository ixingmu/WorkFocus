import { useState, useEffect } from 'react';
import { 
  Bell,
  User,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import MemberCenter from './components/MemberCenter';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { settings, updateSettings } = useTimer();
  const [currentView, setCurrentView] = useState<ViewType>('timer');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Check for admin route on load
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setCurrentView('admin');
    }
    
    // Listen for login modal request
    const handleOpenLogin = () => setShowLoginModal(true);
    window.addEventListener('open-login', handleOpenLogin);
    return () => window.removeEventListener('open-login', handleOpenLogin);
  }, []);

  // Sync with backend when logged in
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [tasksRes, sessionsRes, settingsRes] = await Promise.all([
            fetch('/api/tasks'),
            fetch('/api/sessions'),
            fetch('/api/settings')
          ]);
          if (tasksRes.ok) setTasks(await tasksRes.json());
          if (sessionsRes.ok) setSessions(await sessionsRes.json());
          if (settingsRes.ok) {
            const remoteSettings = await settingsRes.json();
            updateSettings(remoteSettings);
          }
        } catch (err) {
          console.error('Failed to fetch user data');
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      // Load from localStorage for guest
      const savedTasks = localStorage.getItem('pomodoro-guest-tasks');
      const savedSessions = localStorage.getItem('pomodoro-guest-sessions');
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      if (savedSessions) setSessions(JSON.parse(savedSessions));
      setIsLoading(false);
    }
  }, [user]);

  // Persist guest data
  useEffect(() => {
    if (!user) {
      localStorage.setItem('pomodoro-guest-tasks', JSON.stringify(tasks));
      localStorage.setItem('pomodoro-guest-sessions', JSON.stringify(sessions));
    }
  }, [tasks, sessions, user]);

  // Actions with Backend Sync
  const addTask = async (title: string, expectedPomodoros: number = 1) => {
    if (!user && !showLoginModal) {
      setShowLoginModal(true);
    }

    const newTaskData = {
      title,
      createdAt: new Date().toISOString(),
      completedAt: null,
      pomodoros: 0,
      expectedPomodoros,
      progress: 0,
      order: tasks.length,
    };

    if (user) {
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTaskData)
        });
        const savedTask = await res.json();
        setTasks(prev => [savedTask, ...prev]);
        return savedTask.id;
      } catch (err) {
        console.error('Failed to save task');
      }
    }
    
    // Guest fallback
    const guestTask: Task = { ...newTaskData, id: crypto.randomUUID() };
    setTasks(prev => [guestTask, ...prev]);
    return guestTask.id;
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

  return (
    <div className="flex h-screen bg-background text-on-surface overflow-hidden selection:bg-primary selection:text-on-primary">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md relative z-10"
            >
              <div className="absolute top-4 right-4 z-20">
                 <button 
                  onClick={() => setShowLoginModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <Login isModal onSkip={() => setShowLoginModal(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            <button 
              onClick={() => user ? setCurrentView('member') : setShowLoginModal(true)}
              className="p-2 rounded-xl hover:bg-white shadow-sm border border-transparent hover:border-gray-200 transition-all text-on-surface-variant hover:text-primary"
            >
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
          {currentView === 'member' && (
            <MemberCenter />
          )}
        </div>
      </main>
    </div>
  );
}
