import React, { useState, useEffect } from 'react';
import { Users, Settings, Phone, Calendar, ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const AdminView: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setIsAuthorized(true);
        fetchUsers();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Login failed:', res.status, errorData);
        if (res.status === 404) {
          setError('服务器路由未找到 (404)');
        } else {
          setError('密码错误');
        }
      }
    } catch (err) {
      setError('无法连接到服务器');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error('Expected array of users, got:', data);
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
      setUsers([]);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100"
        >
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-gray-900">后台管理系统</h2>
            <p className="text-gray-400 text-xs mt-1 font-bold uppercase tracking-widest">Administrator Portal</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">管理员密码 / Password</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-colors" />
                <input 
                  type="password"
                  placeholder="请输入后台密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-16 pl-14 pr-6 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all font-bold text-gray-900"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center italic">{error}</p>}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-16 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-gray-900/10 hover:bg-primary transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : '进入后台'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-8 p-4 max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">后台管理中心 <span className="text-primary">· Admin</span></h3>
          <p className="text-sm text-gray-400 font-medium tracking-tight">管理注册会员、短信接口及其它系统核心配置</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Statistics Cards */}
        <div className="col-span-12 md:col-span-4 bento-card p-8 flex items-center gap-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">总会员数</p>
            <h4 className="text-4xl font-black text-gray-900">{users.length}</h4>
          </div>
        </div>

        <div className="col-span-12 md:col-span-8 bento-card p-8 flex items-center gap-6">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 block">短信服务商设置 / ALIYUN SMS CONFIG</p>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-gray-900">状态: <span className="text-green-500">已连接服务商</span></span>
              <button className="text-primary font-bold hover:underline">修改 API 密钥</button>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="col-span-12 bento-card overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex items-center justify-between">
             <h4 className="font-black text-lg">会员列表 · Member List</h4>
             <button onClick={fetchUsers} className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-primary transition-colors">
               <RefreshCw className="w-5 h-5" />
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="px-8 py-4">ID</th>
                  <th className="px-8 py-4">手机号 / Phone</th>
                  <th className="px-8 py-4">注册时间 / Joined</th>
                  <th className="px-8 py-4">最近登录 / Last Login</th>
                  <th className="px-8 py-4 text-right">操作 / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5 text-sm font-mono text-gray-400">#{user.id}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-primary" />
                        <span className="font-bold text-gray-900">{user.phone}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500 font-medium">
                       <div className="flex items-center gap-2">
                         <Calendar className="w-3.5 h-3.5" />
                         {new Date(user.created_at).toLocaleDateString()}
                       </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500 font-medium">
                      {user.last_login ? new Date(user.last_login).toLocaleString() : '暂无数据'}
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button className="text-red-500 font-black text-xs uppercase tracking-widest hover:underline">禁用用户</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
);

export default AdminView;
