import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, startOfToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { TrendingUp, Calendar, Zap, History, Timer, Coffee, ChevronLeft, ChevronRight } from 'lucide-react';
import { PomodoroSession } from '../types';
import { cn } from '../lib/utils';

interface StatisticsProps {
  sessions: PomodoroSession[];
}

export default function Statistics({ sessions }: StatisticsProps) {
  const [selectedDate, setSelectedDate] = useState(startOfToday());

  const weeklyData = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const daySessions = sessions.filter(s => isSameDay(parseISO(s.startTime), day) && s.type === 'focus');
      const totalMinutes = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      return {
        name: format(day, 'eee', { locale: zhCN }),
        hours: parseFloat((totalMinutes / 60).toFixed(1)),
        count: daySessions.length,
        fullDate: format(day, 'yyyy-MM-dd')
      };
    });
  }, [sessions, selectedDate]);

  const totalFocusTime = sessions
    .filter(s => s.type === 'focus')
    .reduce((acc, s) => acc + s.durationMinutes, 0);
  
  const totalHours = Math.floor(totalFocusTime / 60);
  const totalMinutes = totalFocusTime % 60;

  const sessionCount = sessions.filter(s => s.type === 'focus').length;

  const filteredSessions = sessions.filter(s => isSameDay(parseISO(s.startTime), selectedDate));

  return (
    <div className="p-4 max-w-7xl mx-auto w-full pb-24 space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">专注回顾 <span className="text-primary">· Review</span></h3>
          <p className="text-sm text-gray-400 font-medium">深度工作时间线分析</p>
        </div>
        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-gray-200 shadow-sm">
          <button 
            onClick={() => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() - 7)))}
            className="text-gray-400 hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-bold text-xs text-gray-600">
              {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MM月dd日')} - {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MM月dd日')}
            </span>
          </div>
          <button 
            onClick={() => setSelectedDate(prev => new Date(prev.setDate(prev.getDate() + 7)))}
            className="text-gray-400 hover:text-primary transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1: Total Time */}
        <div className="bg-primary rounded-[2rem] p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500" />
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-4">累计专注时长</p>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black">{totalHours}</span>
            <span className="text-sm font-bold mr-3 opacity-60">h</span>
            <span className="text-5xl font-black">{totalMinutes}</span>
            <span className="text-sm font-bold opacity-60">m</span>
          </div>
          <div className="mt-6 flex items-center gap-1 text-white text-[10px] font-black uppercase tracking-widest bg-white/10 w-fit px-2 py-1 rounded-lg">
            <TrendingUp className="w-3 h-3" />
            <span>+12% vs last week</span>
          </div>
        </div>

        {/* Stat 2: Sessions */}
        <div className="bento-card p-8 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">完成任务场次</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-gray-900">{sessionCount}</span>
              <span className="text-sm font-bold text-gray-400">sessions</span>
            </div>
          </div>
          <div className="mt-8 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-4/5 rounded-full" />
          </div>
        </div>

        {/* Stat 3: Streak */}
        <div className="bento-card p-8 flex flex-col justify-between bg-surface-container/50">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">今日专注效率</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-secondary">
                {sessions.filter(s => isSameDay(parseISO(s.startTime), selectedDate)).length}
              </span>
              <span className="text-sm font-bold text-gray-400">sessions</span>
            </div>
          </div>
          <div className="mt-6 flex gap-1.5">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="w-3.5 h-3.5 rounded-lg bg-secondary/20 border border-secondary/30" />
            ))}
          </div>
        </div>

        {/* Stat 4: Insight */}
        <div className="bg-gray-900 rounded-[2rem] p-8 text-white shadow-xl flex flex-col justify-between">
           <div className="flex items-center gap-2 text-primary">
             <Zap className="w-4 h-4 fill-current" />
             <span className="text-[10px] font-black uppercase tracking-widest">Efficiency Insight</span>
           </div>
           <p className="text-sm leading-relaxed text-gray-400 font-medium mt-4">
             您的巅峰表现在 <strong className="text-white">10:00 - 12:00</strong>。建议在此期间处理核心高难度任务。
           </p>
           <button className="mt-6 text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
             查看详细洞察
           </button>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bento-card p-8 lg:p-12">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-10">
          {format(selectedDate, 'yyyy年 第w周')} 专注时长趋势 (HOUR / DAY)
        </p>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0, 0, 0, 0.05)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 700 }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(37, 99, 235, 0.04)' }}
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  padding: '12px'
                }}
              />
              <Bar dataKey="hours" radius={[8, 8, 8, 8]} barSize={48}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.hours > 2 ? '#2563eb' : '#e5e7eb'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Session History - Grouped by Date */}
      <div className="bento-card p-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <h4 className="text-xl font-black flex items-center gap-3">
              <History className="w-6 h-6 text-primary" />
              专注历史流水
            </h4>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-1.5">
               <input 
                type="date" 
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(parseISO(e.target.value))}
                className="bg-transparent text-xs font-bold text-gray-600 outline-none cursor-pointer"
               />
            </div>
          </div>
          <span className="text-[10px] uppercase font-black text-gray-400 tracking-widest">
            {format(selectedDate, 'yyyy-MM-dd')}
          </span>
        </div>
        
        <div className="space-y-4">
          {filteredSessions.length > 0 ? [...filteredSessions].reverse().map((session) => (
            <div 
              key={session.id}
              className="group flex items-center justify-between p-6 rounded-3xl bg-gray-50/50 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200"
            >
              <div className="flex items-center gap-6">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                  session.type === 'focus' ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"
                )}>
                  {session.type === 'focus' ? <Timer className="w-6 h-6" /> : <Coffee className="w-6 h-6" />}
                </div>
                <div>
                  <h5 className="font-bold text-gray-900">{session.taskTitle || (session.type === 'focus' ? '深度专注' : '身心休息')}</h5>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {format(parseISO(session.startTime), 'HH:mm')} - {format(parseISO(session.endTime), 'HH:mm')}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center gap-6">
                {session.progressIncrement && (
                   <div className="flex flex-col items-end">
                     <span className="text-[9px] font-black text-primary uppercase tracking-widest">Progress</span>
                     <span className="text-sm font-bold text-primary">+{session.progressIncrement}%</span>
                   </div>
                )}
                <div>
                  <p className="text-lg font-black text-gray-900 font-mono">{session.durationMinutes} <span className="text-xs font-normal text-gray-400">min</span></p>
                  <div className="bg-white border border-gray-100 px-3 py-1 rounded-lg text-[9px] font-black text-green-600 uppercase mt-2 shadow-sm text-center">
                    Completed
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-[2rem]">
               <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
               <p className="text-gray-400 font-bold">这一天没有专注记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
