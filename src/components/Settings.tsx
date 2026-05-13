import React, { useRef, useState } from 'react';
import { Volume2, Bell, RefreshCw, Music, Zap, Moon, RotateCcw, Upload, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { AppSettings } from '../types';
import { ALARM_SOUNDS } from '../constants';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export default function SettingsView({ settings, onUpdateSettings }: SettingsViewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const stopAndPlay = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio(url);
    audio.volume = settings.volume / 100 || 0.5;
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
    
    if (key === 'alarmSoundId') {
      const sound = ALARM_SOUNDS.find(s => s.id === value);
      if (sound) stopAndPlay(sound.url);
    }
  };

  const handleCustomSoundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('sound', file);

    try {
      const res = await fetch('/api/sounds/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        handleChange('alarmSoundId', data.path);
        stopAndPlay(data.path);
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  const resetDefaults = () => {
    if (confirm('确定要恢复默认设置吗？')) {
      onUpdateSettings({
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        autoStartBreaks: true,
        autoStartFocus: true,
        soundEnabled: true,
        notificationsEnabled: true,
        tickSoundEnabled: false,
        alarmSoundId: 'classic',
        volume: 50
      });
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto w-full pb-24 space-y-12">
      <div className="space-y-2">
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">系统设置 <span className="text-primary">· Settings</span></h3>
        <p className="text-sm text-gray-400 font-medium tracking-tight">配置您的个人专注偏好与桌面环境</p>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {/* Timer Section */}
        <section className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary border-b border-gray-100 pb-3">计时器时长参数 / TIMER CONFIG</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Focus */}
            <div className="bento-card p-8 space-y-6">
              <div className="flex justify-between items-center">
                <span className="font-black text-sm uppercase tracking-wider text-gray-400">专注时段</span>
                <span className="text-2xl font-black text-primary">{settings.focusDuration} <span className="text-xs font-normal">m</span></span>
              </div>
              <input 
                type="range" min="1" max="90" step="1"
                value={settings.focusDuration}
                onChange={(e) => handleChange('focusDuration', parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[9px] text-gray-400 font-black uppercase tracking-widest">
                <span>1 MIN</span>
                <span>90 MIN</span>
              </div>
            </div>
            {/* Short Break */}
            <div className="bento-card p-8 space-y-6">
              <div className="flex justify-between items-center">
                <span className="font-black text-sm uppercase tracking-wider text-gray-400">短时休息</span>
                <span className="text-2xl font-black text-primary">{settings.shortBreakDuration} <span className="text-xs font-normal">m</span></span>
              </div>
              <input 
                type="range" min="1" max="30" step="1"
                value={settings.shortBreakDuration}
                onChange={(e) => handleChange('shortBreakDuration', parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[9px] text-gray-400 font-black uppercase tracking-widest">
                <span>1 MIN</span>
                <span>30 MIN</span>
              </div>
            </div>
            {/* Long Break */}
            <div className="bento-card p-8 space-y-6">
              <div className="flex justify-between items-center">
                <span className="font-black text-sm uppercase tracking-wider text-gray-400">长时休息</span>
                <span className="text-2xl font-black text-primary">{settings.longBreakDuration} <span className="text-xs font-normal">m</span></span>
              </div>
              <input 
                type="range" min="5" max="60" step="1"
                value={settings.longBreakDuration}
                onChange={(e) => handleChange('longBreakDuration', parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[9px] text-gray-400 font-black uppercase tracking-widest">
                <span>5 MIN</span>
                <span>60 MIN</span>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary border-b border-gray-100 pb-3">交互偏好设置 / INTERACTION</h3>
          <div className="bento-card overflow-hidden divide-y divide-gray-100">
            {/* Volume Control */}
             <div className="p-8 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-gray-400" />
                  <span className="font-black text-sm uppercase tracking-wider text-gray-400">音量大小 / Volume</span>
                </div>
                <span className="text-xl font-black text-primary">{settings.volume || 50}%</span>
              </div>
              <input 
                type="range" min="0" max="100" step="1"
                value={settings.volume || 50}
                onChange={(e) => handleChange('volume', parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Sound Choice */}
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-6 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                  <Music className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-lg">警报音效 · Alarm Tone</h4>
                  <p className="text-sm text-gray-400 font-medium">选择内置音频或上传您自己的 MP3/WAV</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {ALARM_SOUNDS.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => handleChange('alarmSoundId', sound.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                      settings.alarmSoundId === sound.id 
                        ? "border-primary bg-primary/5 text-primary shadow-sm" 
                        : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"
                    )}
                  >
                    <sound.icon className="w-5 h-5" />
                    <span className="font-bold text-xs">{sound.name}</span>
                  </button>
                ))}
                
                {/* Upload Custom Sound */}
                <label className={cn(
                  "p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative overflow-hidden",
                  settings.alarmSoundId?.startsWith('/uploads') ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-400 hover:border-primary hover:text-primary"
                )}>
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  <span className="font-bold text-xs">上传音频</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="audio/*"
                    onChange={handleCustomSoundUpload}
                    disabled={isUploading}
                  />
                  {settings.alarmSoundId?.startsWith('/uploads') && (
                    <div className="absolute inset-0 border-2 border-primary pointer-events-none" />
                  )}
                </label>
              </div>
            </div>

            {/* Toggle Sections */}
            <div className="p-8 flex items-center justify-between hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                  <Volume2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-lg">提示音 · Audio</h4>
                  <p className="text-sm text-gray-400 font-medium">全局开启或关闭提示音效</p>
                </div>
              </div>
              <button 
                onClick={() => handleChange('soundEnabled', !settings.soundEnabled)}
                className={cn(
                  "w-14 h-7 rounded-full relative transition-all duration-300",
                  settings.soundEnabled ? "bg-primary" : "bg-gray-200"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-sm",
                  settings.soundEnabled ? "left-8" : "left-1"
                )} />
              </button>
            </div>

            <div className="p-8 flex items-center justify-between hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-lg">自动循环 · Auto-Loop</h4>
                  <p className="text-sm text-gray-400 font-medium">专注时段结束后自动进入休息计时</p>
                </div>
              </div>
              <button 
                onClick={() => handleChange('autoStartBreaks', !settings.autoStartBreaks)}
                className={cn(
                  "w-14 h-7 rounded-full relative transition-all duration-300",
                  settings.autoStartBreaks ? "bg-primary" : "bg-gray-200"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-sm",
                  settings.autoStartBreaks ? "left-8" : "left-1"
                )} />
              </button>
            </div>

            <div className="p-8 flex items-center justify-between hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-lg">自动开始专注 · Auto-Focus</h4>
                  <p className="text-sm text-gray-400 font-medium">休息结束后自动开始新的专注时段</p>
                </div>
              </div>
              <button 
                onClick={() => handleChange('autoStartFocus', !settings.autoStartFocus)}
                className={cn(
                  "w-14 h-7 rounded-full relative transition-all duration-300",
                  settings.autoStartFocus ? "bg-primary" : "bg-gray-200"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-sm",
                  settings.autoStartFocus ? "left-8" : "left-1"
                )} />
              </button>
            </div>
          </div>
        </section>
        
        {/* About & Copyright Section */}
        <section className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary border-b border-gray-100 pb-3">关于与版本 / ABOUT & VERSION</h3>
          <div className="bento-card p-10 flex flex-col items-center text-center space-y-6 bg-gradient-to-b from-white to-gray-50/50">
            <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center p-4 shadow-inner overflow-hidden border border-primary/10">
               <img src="/logo.png" alt="Logo" className="w-14 h-14 object-contain" />
            </div>
            <div className="space-y-2">
              <h4 className="text-2xl font-black text-gray-900">番茄专注 · Pomodoro</h4>
              <p className="text-sm font-bold text-primary bg-primary/5 px-3 py-1 rounded-full inline-block">Version 1.1.0 Stable</p>
            </div>
            
            <div className="max-w-md space-y-4">
              <p className="text-sm text-gray-500 leading-relaxed font-medium">
                专注提升效率，让每一个番茄钟都为您创造价值。这是一款专为桌面办公设计的专注力工具，祝您工作顺利。
              </p>
              
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">版权持有 / COPYRIGHT</p>
                <div className="space-y-1">
                  <p className="font-black text-gray-900 group">
                    青岛赢智库网络科技有限公司
                  </p>
                  <a 
                    href="https://g-2.cn" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary font-bold hover:underline transition-all"
                  >
                    https://g-2.cn
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Actions Area */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
          <button 
            onClick={resetDefaults}
            className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            恢复全局默认
          </button>
        </div>
      </div>
    </div>
  );
}
