import { Volume2, Bell, RefreshCw, Music, Zap, Moon, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

const ALARM_SOUNDS = [
  { id: 'classic', name: '经典闹回', icon: Bell },
  { id: 'digital', name: '数字电子', icon: Zap },
  { id: 'soft', name: '柔和提醒', icon: Volume2 },
  { id: 'zen', name: '禅意钟声', icon: Moon },
];

export default function SettingsView({ settings, onUpdateSettings }: SettingsViewProps) {
  const handleChange = (key: keyof AppSettings, value: any) => {
    onUpdateSettings({ ...settings, [key]: value });
    
    // Play sound preview if sound ID changed
    if (key === 'alarmSoundId') {
      const sounds: any = {
        classic: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        digital: 'https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3',
        soft: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
        zen: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
      };
      const audio = new Audio(sounds[value]);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  };

  const resetDefaults = () => {
    if (confirm('确定要恢复默认设置吗？')) {
      onUpdateSettings({
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        autoStartBreaks: true,
        soundEnabled: true,
        notificationsEnabled: true,
        tickSoundEnabled: false,
        alarmSoundId: 'classic',
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
            {/* Toggle: Sounds */}
            <div className="p-8 flex items-center justify-between hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                  <Volume2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-lg">提示音 · Audio</h4>
                  <p className="text-sm text-gray-400 font-medium">在每个阶段结束时播放警报声</p>
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

            {/* Sound Choice */}
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-6 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                  <Music className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-lg">警报音效 · Alarm Tone</h4>
                  <p className="text-sm text-gray-400 font-medium">选择您喜欢的任务结束提示音</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              </div>
            </div>

            {/* Toggle: Automatic Breaks */}
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
          </div>
        </section>
        
        {/* About & Copyright Section */}
        <section className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary border-b border-gray-100 pb-3">关于与版本 / ABOUT & VERSION</h3>
          <div className="bento-card p-10 flex flex-col items-center text-center space-y-6 bg-gradient-to-b from-white to-gray-50/50">
            <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center p-5 shadow-inner">
               <h1 className="text-4xl font-black text-primary">P</h1>
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
