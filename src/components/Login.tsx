import React, { useState } from 'react';
import { Phone, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';

interface LoginProps {
  isModal?: boolean;
  onSkip?: () => void;
}

const Login: React.FC<LoginProps> = ({ isModal, onSkip }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setIsLoading(true);
    setError('');
    try {
      await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      setStep('code');
    } catch (err) {
      setError('发送验证码失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setIsLoading(true);
    setError('');
    try {
      await login(phone, code);
      if (onSkip) onSkip();
    } catch (err) {
      setError('验证码错误或登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const containerClasses = isModal 
    ? "w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 relative z-10 border border-gray-100"
    : "min-h-screen flex items-center justify-center bg-gray-50 p-6 relative overflow-hidden";

  const content = (
    <motion.div 
      initial={isModal ? {} : { opacity: 0, y: 20 }}
      animate={isModal ? {} : { opacity: 1, y: 0 }}
      className={isModal ? "" : "w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 relative z-10 border border-gray-100"}
    >
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
          <h1 className="text-3xl font-black text-white">P</h1>
        </div>
        <h2 className="text-2xl font-black text-gray-900">
          {isModal ? '登录以保存数据' : '番茄专注 · Login'}
        </h2>
        <p className="text-gray-400 text-sm mt-1 font-medium italic">
          {isModal ? '登录后您的任务和设置将同步到云端' : '追求卓越专注体验'}
        </p>
      </div>

      <form onSubmit={step === 'phone' ? handleSendCode : handleLogin} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-500 text-xs font-bold p-4 rounded-xl border border-red-100 italic">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">手机号 / Phone Number</label>
          <div className="relative group">
            <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-colors" />
            <input 
              type="tel"
              placeholder="输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={step === 'code' || isLoading}
              className="w-full h-16 pl-14 pr-6 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all font-bold text-gray-900"
            />
          </div>
        </div>

        {step === 'code' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2"
          >
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">验证码 / Verification Code</label>
            <div className="relative group">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="输入验证码 (123456)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isLoading}
                autoFocus
                className="w-full h-16 pl-14 pr-6 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none transition-all font-bold text-gray-900"
              />
            </div>
          </motion.div>
        )}

        <button 
          type="submit"
          disabled={isLoading || (step === 'phone' && !phone) || (step === 'code' && !code)}
          className="w-full h-16 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-gray-900/10 hover:shadow-primary/20 hover:bg-primary transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              {step === 'phone' ? '发送验证码' : '立即登录'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
        
        <div className="flex flex-col gap-4">
          {step === 'code' && (
            <button 
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-center text-xs font-bold text-gray-400 hover:text-primary transition-colors"
            >
              返回修改手机号
            </button>
          )}

          {onSkip && (
            <button 
              type="button"
              onClick={onSkip}
              className="w-full text-center text-xs font-bold text-gray-400 hover:text-primary transition-colors border-t border-gray-100 pt-4"
            >
              暂不登录，以游客身份继续
            </button>
          )}
        </div>
      </form>

      {!isModal && (
        <div className="mt-12 pt-8 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Developed By</p>
          <a href="https://g-2.cn" target="_blank" rel="noopener noreferrer" className="text-xs font-black text-gray-900 hover:text-primary transition-colors">青岛赢智库网络科技有限公司</a>
        </div>
      )}
    </motion.div>
  );

  if (isModal) return content;

  return (
    <div className={containerClasses}>
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[80px] pointer-events-none" />
      {content}
    </div>
  );
};

export default Login;
