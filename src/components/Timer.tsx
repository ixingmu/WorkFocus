import { useState, useCallback } from 'react';
import { Play, Pause, SkipForward, CheckCircle2, Sliders, X, Timer as TimerIcon, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatTime } from '../lib/utils';
import { Task, PomodoroSession } from '../types';
import { useTimer } from '../contexts/TimerContext';
import { useAuth } from '../contexts/AuthContext';

interface TimerViewProps {
  tasks: Task[];
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
  onSessionComplete: (session: Omit<PomodoroSession, 'id'>) => void;
  addTask: (title: string, expected?: number) => Promise<string> | string;
  onUpdateProgress: (id: string, progress: number) => void;
}

export default function TimerView({ 
  tasks, 
  activeTaskId, 
  setActiveTaskId, 
  onSessionComplete,
  addTask,
  onUpdateProgress
}: TimerViewProps) {
  const { 
    timeLeft, progress: timerProgress, isActive, mode, settings,
    startTimer, pauseTimer, resetTimer, skipSession
  } = useTimer();
  const { user } = useAuth();
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionProgress, setSessionProgress] = useState(10);
  
  const activeTask = tasks.find(t => t.id === activeTaskId);

  const handleFeedbackSubmit = () => {
    if (activeTaskId) {
      onUpdateProgress(activeTaskId, (activeTask?.progress || 0) + sessionProgress);
    }
    
    onSessionComplete({
      taskId: activeTaskId || 'unnamed',
      taskTitle: activeTask?.title || '未命名任务',
      type: mode,
      startTime: new Date(Date.now() - settings.focusDuration * 60000).toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes: settings.focusDuration,
      progressIncrement: sessionProgress
    });

    setShowFeedback(false);
  };

  const handleStart = async () => {
    if (!activeTaskId && mode === 'focus') {
      // For logged-in users, try to find an existing incomplete task first
      if (user) {
        const firstIncompleteTask = tasks.find(t => !t.completedAt);
        if (firstIncompleteTask) {
          setActiveTaskId(firstIncompleteTask.id);
          startTimer();
          return;
        }
      }

      // If no task found or guest, create/use default
      const title = newTaskTitle.trim() || '专注工作';
      const id = await addTask(title);
      if (typeof id === 'string') setActiveTaskId(id);
      setNewTaskTitle('');
    }
    
    if (isActive) pauseTimer();
    else startTimer();
  };

  const totalTime = mode === 'focus' 
    ? settings.focusDuration * 60 
    : (mode === 'short-break' ? settings.shortBreakDuration * 60 : settings.longBreakDuration * 60);
  
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <div className="h-full flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* Main Timer Card */}
        <div 
          className={cn(
            "col-span-12 lg:col-span-8 rounded-[2rem] shadow-xl transition-all duration-1000 relative overflow-hidden p-[4px]",
            isActive ? "bg-primary/10" : "bg-gray-100"
          )}
          style={{
            background: `conic-gradient(${mode === 'focus' ? 'var(--color-primary)' : 'var(--color-secondary)'} ${progress}%, rgba(0,0,0,0.08) ${progress}%)`
          }}
        >
          <div className="w-full h-full bg-white rounded-[1.8rem] p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <span className={cn(
                "px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm",
                mode === 'focus' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
              )}>
                {mode === 'focus' ? 'Focusing' : 'Resting'}
              </span>
            </div>
            
            <div className="mt-2 text-center md:text-left">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">当前任务</div>
              <h2 className="text-4xl font-extrabold text-gray-900 leading-tight">
                {activeTask?.title || (mode === 'focus' ? '新专注任务' : '休息时间')}
              </h2>
            </div>

            <div className="flex flex-col items-center justify-center my-12 group">
              <span className={cn(
                "text-[160px] font-mono font-black leading-none tracking-tighter drop-shadow-sm transition-all duration-500",
                isActive ? "text-gray-900 italic transform scale-105" : "text-gray-300"
              )}>
                {formatTime(timeLeft)}
              </span>
              
              <div className="flex gap-4 mt-12 w-full max-sm:w-full">
                <button 
                  onClick={handleStart}
                  className={cn(
                    "flex-[2] h-16 rounded-2xl font-black text-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3",
                    isActive 
                      ? "bg-gray-100 text-gray-900 hover:bg-gray-200" 
                      : "bg-gray-900 text-white hover:shadow-gray-900/20"
                  )}
                >
                  {isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                  {isActive ? '暂停' : '启动'}
                </button>
                
                <button 
                  onClick={resetTimer}
                  className="h-16 px-6 rounded-2xl border-2 border-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center"
                  title="重置"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>

                <button 
                  onClick={skipSession}
                  className="h-16 px-6 rounded-2xl border-2 border-gray-100 text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center"
                  title="跳过"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
              <span>深度工作协议 1.0</span>
              <div className="flex items-center gap-4">
                <span>剩余进度: {Math.round(100 - progress)}%</span>
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="flex-1 bg-primary rounded-[2rem] p-8 text-white shadow-xl shadow-primary/20 flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-black mb-6">开启新任务</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="输入任务标题..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  className="w-full bg-white/20 border border-white/30 rounded-2xl px-6 py-4 text-white placeholder-white/60 outline-none focus:ring-4 ring-white/20 transition-all text-lg font-medium"
                />
                <div className="flex justify-between items-center px-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">预设时长</span>
                    <span className="text-xl font-black">{settings.focusDuration} 分钟</span>
                  </div>
                  <button 
                    onClick={handleStart}
                    className="bg-white text-primary px-6 py-3 rounded-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider"
                  >
                    开始计时
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between opacity-80">
              <span className="text-xs font-bold uppercase tracking-widest">任务切换 (NEXT)</span>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                   const currentIndex = tasks.findIndex(t => t.id === activeTaskId && !t.completedAt);
                   const availableTasks = tasks.filter(t => !t.completedAt);
                   if (availableTasks.length > 0) {
                     const nextTask = tasks.slice(currentIndex + 1).find(t => !t.completedAt) || tasks.find(t => !t.completedAt);
                     if (nextTask) {
                       setActiveTaskId(nextTask.id);
                       // Reset timer for new task
                       pauseTimer();
                       resetTimer();
                     }
                   }
                  }}
                  className="text-white hover:text-white/80 transition-colors p-2 bg-white/10 rounded-lg"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Task Quick List Sidebar */}
          <div 
            className={cn(
              "bg-white rounded-[2rem] flex flex-col h-[400px] overflow-hidden shadow-sm relative transition-all duration-1000 p-[4px]",
              tasks.length === 0 ? "border border-gray-200" : "bg-gray-100"
            )}
            style={tasks.length > 0 ? {
              background: `conic-gradient(var(--color-primary) ${(tasks.filter(t => t.completedAt).length / tasks.length) * 100}%, rgba(0,0,0,0.08) ${(tasks.filter(t => t.completedAt).length / tasks.length) * 100}%)`
            } : {}}
          >
            <div className="w-full h-full bg-white rounded-[1.8rem] p-6 flex flex-col relative z-10">
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">任务看板 · Tasks</span>
                <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">
                  {tasks.filter(t => t.completedAt).length}/{tasks.length}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {tasks.map(task => {
                  const isActiveTask = task.id === activeTaskId;
                  return (
                    <div 
                      key={task.id}
                      onClick={() => !task.completedAt && setActiveTaskId(task.id)}
                      className={cn(
                        "group relative p-3 rounded-2xl border transition-all cursor-pointer overflow-hidden",
                        isActiveTask 
                          ? "border-primary/20 bg-primary/5 shadow-sm" 
                          : "border-gray-50 bg-white hover:border-gray-200",
                        task.completedAt && "opacity-50"
                      )}
                    >
                      {/* Active Task Border Progress */}
                      {isActiveTask && !task.completedAt && (
                        <div 
                          className="absolute inset-0 p-[2px] rounded-2xl pointer-events-none"
                          style={{
                            background: `conic-gradient(var(--color-primary) ${progress}%, transparent ${progress}%)`
                          }}
                        >
                          <div className="w-full h-full bg-white/0 rounded-[14px]" />
                        </div>
                      )}

                      <div className="flex items-center gap-3 relative z-10">
                        <div className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center transition-colors",
                          task.completedAt ? "bg-gray-200 text-white" : (isActiveTask ? "bg-primary text-white" : "border-2 border-gray-100 text-transparent group-hover:border-primary/30")
                        )}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <span className={cn(
                          "text-sm font-bold truncate transition-colors",
                          task.completedAt ? "text-gray-400 line-through" : (isActiveTask ? "text-primary" : "text-gray-600 group-hover:text-gray-900")
                        )}>
                          {task.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {tasks.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                  <TimerIcon className="w-8 h-8 text-gray-200" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                    暂无任务<br/>前往任务板块添加
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Focus Feedback Modal */}
      <AnimatePresence>
        {showFeedback && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
              onClick={() => setShowFeedback(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <button onClick={() => setShowFeedback(false)} className="text-gray-400 hover:text-gray-900">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mb-6">
                  <Sliders className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">专注结束！</h3>
                <p className="text-gray-500 font-medium mb-8">刚才的任务有进展吗？</p>

                <div className="w-full space-y-6 mb-10">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">任务进度增量</span>
                    <span className="text-2xl font-black text-primary">+{sessionProgress}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="5"
                    value={sessionProgress}
                    onChange={(e) => setSessionProgress(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                    <span>继续努力</span>
                    <span>进展顺利</span>
                    <span>完美结束</span>
                  </div>
                </div>

                <button 
                  onClick={handleFeedbackSubmit}
                  className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-gray-900/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  记录并休息
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
