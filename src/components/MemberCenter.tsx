import React from 'react';
import { User, LogOut, Shield, Award, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Task, PomodoroSession } from '../types';

interface MemberCenterProps {
  tasks: Task[];
  sessions: PomodoroSession[];
}

const MemberCenter: React.FC<MemberCenterProps> = ({ tasks, sessions }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const totalFocusMinutes = sessions
    .filter(s => s.type === 'focus')
    .reduce((acc, s) => acc + s.durationMinutes, 0);
  
  const totalHours = Math.floor(totalFocusMinutes / 60);
  const completedTasks = tasks.filter(t => t.completedAt).length;

  return (
    <div className="p-4 max-w-5xl mx-auto w-full pb-24 space-y-12">
      <div className="space-y-2">
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">个人中心 <span className="text-primary">· Member</span></h3>
        <p className="text-sm text-gray-400 font-medium tracking-tight">管理您的账号信息与成就勋章</p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Profile Card */}
        <div className="col-span-12 md:col-span-5 bento-card p-10 flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 rounded-[2.5rem] bg-primary/10 border-4 border-white shadow-xl flex items-center justify-center relative">
            <User className="w-12 h-12 text-primary" />
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-primary/20">
              <Shield className="w-5 h-5 text-primary" />
            </div>
          </div>
          
          <div className="space-y-1">
            <h4 className="text-2xl font-black text-gray-900">{user.phone}</h4>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">高级会员 · Gold Member</p>
          </div>

          <div className="w-full pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">加入时间</p>
              <p className="font-bold text-gray-900">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">最近登录</p>
              <p className="font-bold text-gray-900">{user.last_login ? new Date(user.last_login).toLocaleDateString() : '今日'}</p>
            </div>
          </div>

          <button 
            onClick={() => confirm('确定要退出登录吗？') && logout()}
            className="w-full mt-6 py-4 rounded-2xl bg-gray-50 text-gray-400 font-black text-xs uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-2 group"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            退出账号登录
          </button>
        </div>

        {/* Achievement / Stats Grid */}
        <div className="col-span-12 md:col-span-7 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bento-card p-8 flex items-center gap-6 group hover:border-primary/30 transition-all">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                   <Clock className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">专注总时长</p>
                  <h4 className="text-2xl font-black text-gray-900">{totalHours} <span className="text-xs font-normal">Hrs</span></h4>
                </div>
              </div>

              <div className="bento-card p-8 flex items-center gap-6 group hover:border-primary/30 transition-all">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all">
                   <Award className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">已完成任务</p>
                  <h4 className="text-2xl font-black text-gray-900">{completedTasks} <span className="text-xs font-normal">Count</span></h4>
                </div>
              </div>
           </div>

           <div className="bento-card p-8 bg-gray-900 text-white overflow-hidden relative">
              <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
                <div>
                  <h4 className="text-xl font-black mb-2">开通多端同步 Pro</h4>
                  <p className="text-gray-400 text-sm font-medium">在各种桌面与移动设备上同步您的任务与偏好设置。</p>
                </div>
                <button className="w-full py-4 rounded-xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                  立即升级至专业版 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
           </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCenter;
