import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Circle, Clock, X } from 'lucide-react';
import { 
  format, 
  subDays, 
  addDays, 
  isToday, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Task, PomodoroSession } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const HistoryView: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [allActivityDates, setAllActivityDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAllActivity = async () => {
      if (user) {
        try {
          const sessionsRes = await fetch('/api/sessions');
          if (sessionsRes.ok) {
            const allSessions: PomodoroSession[] = await sessionsRes.json();
            const dates = new Set(allSessions.map(s => format(new Date(s.startTime), 'yyyy-MM-dd')));
            setAllActivityDates(dates);
          }
        } catch (err) {
          console.error('Failed to fetch all activity dates');
        }
      } else {
        const savedSessions = localStorage.getItem('pomodoro-guest-sessions');
        if (savedSessions) {
          const allSessions: PomodoroSession[] = JSON.parse(savedSessions);
          const dates = new Set(allSessions.map(s => format(new Date(s.startTime), 'yyyy-MM-dd')));
          setAllActivityDates(dates);
        }
      }
    };
    fetchAllActivity();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      if (user) {
        try {
          const [tasksRes, sessionsRes] = await Promise.all([
            fetch(`/api/tasks?date=${dateStr}`),
            fetch(`/api/sessions`)
          ]);
          
          if (tasksRes.ok) setTasks(await tasksRes.json());
          if (sessionsRes.ok) {
            const allSessions = await sessionsRes.json();
            const dailySessions = allSessions.filter((s: PomodoroSession) => 
               format(new Date(s.startTime), 'yyyy-MM-dd') === dateStr
            );
            setSessions(dailySessions);
          }
        } catch (err) {
          console.error('Failed to fetch history');
        }
      } else {
        const savedTasks = localStorage.getItem('pomodoro-guest-tasks');
        const savedSessions = localStorage.getItem('pomodoro-guest-sessions');
        
        if (savedTasks) {
          const allTasks = JSON.parse(savedTasks);
          setTasks(allTasks.filter((t: Task) => 
            format(new Date(t.createdAt), 'yyyy-MM-dd') === dateStr
          ));
        }
        
        if (savedSessions) {
          const allSessions = JSON.parse(savedSessions);
          setSessions(allSessions.filter((s: PomodoroSession) => 
            format(new Date(s.startTime), 'yyyy-MM-dd') === dateStr
          ));
        }
      }
      setIsLoading(false);
    };

    fetchData();
  }, [selectedDate, user]);

  const changeDate = (amount: number) => {
    setSelectedDate(prev => amount > 0 ? addDays(prev, 1) : subDays(prev, 1));
  };

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <div className="p-4" ref={calendarRef}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-gray-900">
            {format(currentMonth, 'yyyy年 MM月', { locale: zhCN })}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[10px] font-black text-gray-400 uppercase">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const hasActivity = allActivityDates.has(format(day, 'yyyy-MM-dd'));
            
            return (
              <button
                key={i}
                onClick={() => {
                  setSelectedDate(day);
                  setIsCalendarOpen(false);
                }}
                className={cn(
                  "relative h-8 flex flex-col items-center justify-center rounded-lg text-xs transition-all",
                  !isCurrentMonth && "text-gray-200",
                  isSelected ? "bg-primary text-white font-bold" : "hover:bg-gray-50 text-gray-700",
                  isToday(day) && !isSelected && "text-primary font-bold ring-1 ring-primary/20"
                )}
              >
                {format(day, 'd')}
                {hasActivity && (
                  <div className={cn(
                    "absolute bottom-1 w-1 h-1 rounded-full",
                    isSelected ? "bg-white/60" : "bg-primary/40"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Date Selector */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
              isCalendarOpen ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <CalendarIcon className="w-6 h-6" />
          </button>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isToday(selectedDate) ? '今天' : format(selectedDate, 'MM月dd日', { locale: zhCN })}
            </h3>
            <p className="text-xs text-gray-400 font-black uppercase tracking-widest">
              {format(selectedDate, 'EEEE', { locale: zhCN })}
            </p>
          </div>
        </div>

        {isCalendarOpen && (
          <div className="absolute top-24 left-6 z-50 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {renderCalendar()}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => changeDate(-1)}
            className="p-3 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setSelectedDate(new Date())}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              isToday(selectedDate) 
                ? "bg-gray-100 text-gray-400 cursor-default" 
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
            disabled={isToday(selectedDate)}
          >
            回到今天
          </button>
          <button 
            onClick={() => changeDate(1)}
            className="p-3 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Daily Stats */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-2">当日专注 / FOCUS LOG</h4>
          
          {isLoading ? (
            <div className="bento-card p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">数据载入中...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="bento-card p-12 flex flex-col items-center justify-center text-center space-y-4 opacity-60">
              <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center">
                <Clock className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 font-medium">当日没有专注记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <div key={session.id} className="bento-card p-5 group hover:border-primary/20 transition-all bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        session.type === 'focus' ? "bg-blue-50 text-blue-500" : "bg-green-50 text-green-500"
                      )}>
                        {session.type === 'focus' ? <Clock className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">
                          {session.taskTitle || (session.type === 'focus' ? '深度工作' : '休息时间')}
                        </h5>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-gray-900">
                        {session.durationMinutes} <span className="text-[10px] font-medium text-gray-400">Min</span>
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                        {session.type === 'focus' ? 'COMPLETE' : 'REST'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task List for that day */}
        <div className="space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-2">任务清单 / TASK LIST</h4>
          
          {isLoading ? (
            <div className="bento-card p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="bento-card p-12 flex flex-col items-center justify-center text-center space-y-4 opacity-60">
              <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 font-medium">当日没有任务记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className={cn(
                  "bento-card p-5 border-l-4 transition-all",
                  task.completedAt ? "border-l-green-500 bg-green-50/20" : "border-l-primary/30 bg-white"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {task.completedAt ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                      <div>
                        <h5 className={cn(
                          "text-sm font-bold",
                          task.completedAt ? "text-gray-500 line-through" : "text-gray-900"
                        )}>
                          {task.title}
                        </h5>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {task.pomodoros}/{task.expectedPomodoros} 番茄
                          </span>
                          {task.completedAt && (
                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">
                              已完成
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
