import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import confetti from 'canvas-confetti';

import { Task, PomodoroSession, AppSettings } from '../types';
import { ALARM_SOUNDS } from '../constants';
import { useAuth } from './AuthContext';

interface TimerContextType {
  timeLeft: number;
  progress: number;
  isActive: boolean;
  mode: 'focus' | 'short-break' | 'long-break';
  currentTaskId: string | null;
  settings: AppSettings;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipSession: () => void;
  stopAlarm: () => void;
  setMode: (mode: 'focus' | 'short-break' | 'long-break') => void;
  setCurrentTaskId: (id: string | null) => void;
  updateSettings: (newSettings: Partial<AppSettings>, syncWithServer?: boolean) => void;
  isAlarmRinging: boolean;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaults: AppSettings = {
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      autoStartBreaks: false,
      autoStartFocus: false,
      soundEnabled: true,
      notificationsEnabled: true,
      tickSoundEnabled: false,
      alarmSoundId: 'classic',
      volume: 50
    };
    try {
      const saved = localStorage.getItem('pomodoro-settings');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (e) {
      return defaults;
    }
  });

  const [mode, setMode] = useState<'focus' | 'short-break' | 'long-break'>('focus');
  const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Howl | null>(null);
  const alarmTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Persistence across refreshes
  useEffect(() => {
    const saved = localStorage.getItem('timer-state');
    if (saved) {
      try {
        const { timeLeft: sTime, isActive: sActive, mode: sMode, currentTaskId: sTask, lastTimestamp } = JSON.parse(saved);
        const elapsed = sActive ? Math.floor((Date.now() - lastTimestamp) / 1000) : 0;
        const newTime = Math.max(0, sTime - elapsed);
        
        setTimeLeft(newTime);
        setMode(sMode);
        setCurrentTaskId(sTask);
        if (sActive && newTime > 0) setIsActive(true);
      } catch (e) {
        console.error('Failed to restore timer state', e);
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('timer-state', JSON.stringify({
      timeLeft, isActive, mode, currentTaskId, lastTimestamp: Date.now()
    }));
  }, [timeLeft, isActive, mode, currentTaskId, isInitialized]);

  useEffect(() => {
    localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
    if (!isActive && isInitialized) {
      // Only set initial time if we just changed setting or mode and aren't restoring
      // But actually, we usually want to reset if the timer is stopped and something changes
      // To prevent overwriting restored state, we check isInitialized
      const totalSeconds = mode === 'focus' ? settings.focusDuration * 60 
                          : mode === 'short-break' ? settings.shortBreakDuration * 60 
                          : settings.longBreakDuration * 60;
      
      // If timeLeft is 0 or greater than total (settings changed), reset
      if (timeLeft === 0 || timeLeft > totalSeconds) {
        setTimeLeft(totalSeconds);
      }
    }
  }, [settings, mode, isActive, isInitialized]);

  // Play a procedural beep as a fallback for missing sound files
  const playProceduralBeep = useCallback((type: 'success' | 'alert' = 'success') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type === 'success' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(type === 'success' ? 880 : 440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(type === 'success' ? 440 : 220, ctx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(settings.volume / 100, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Procedural beep failed', e);
    }
  }, [settings.volume]);

  const playSound = useCallback((soundName: string, loop: boolean = false) => {
    if (!settings.soundEnabled) return;
    
    // Stop previous sound
    if (soundRef.current) soundRef.current.stop();
    if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);

    const soundUrl = soundName.startsWith('/uploads') ? soundName : (ALARM_SOUNDS.find(s => s.id === soundName)?.url || '/sounds/bell.mp3');
    
    // Always trigger procedural beep as primary/fallback
    playProceduralBeep('success');

    soundRef.current = new Howl({
      src: [soundUrl],
      volume: settings.volume / 100,
      loop: loop,
      onloaderror: () => console.warn('Sound file not found, using procedural fallback'),
      onplayerror: (id, err) => {
        console.error('Audio play error:', err);
        if (isActive) window.alert('专注时间到！');
      }
    });

    soundRef.current.play();

    if (loop) {
      setIsAlarmRinging(true);
      // Auto-stop after 1 minute
      alarmTimeoutRef.current = setTimeout(() => {
        stopAlarm();
      }, 60000);
    }
  }, [settings.soundEnabled, settings.volume, isActive, playProceduralBeep]);

  const stopAlarm = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.stop();
    }
    if (alarmTimeoutRef.current) {
      clearTimeout(alarmTimeoutRef.current);
    }
    setIsAlarmRinging(false);
  }, []);

  // Request notification permission early
  useEffect(() => {
    if (settings.notificationsEnabled && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [settings.notificationsEnabled]);

  const sendNotification = useCallback((title: string, body: string) => {
    if (!settings.notificationsEnabled) return;

    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo.png' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/logo.png' });
        }
      });
    }
  }, [settings.notificationsEnabled]);

  const skipSession = useCallback(() => {
    setIsActive(false);
    if (mode === 'focus') {
      setMode('short-break');
      setTimeLeft(settings.shortBreakDuration * 60);
    } else {
      setMode('focus');
      setTimeLeft(settings.focusDuration * 60);
    }
  }, [mode, settings]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isInitialized) {
      setIsActive(false);
      playSound(settings.alarmSoundId, true);
      
      const message = mode === 'focus' ? '完成专注！休息一下吧。' : '休息结束，开始专注。';
      sendNotification('番茄专注', message);

      if (mode === 'focus') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setMode('short-break');
        setTimeLeft(settings.shortBreakDuration * 60);
        if (settings.autoStartBreaks) setIsActive(true);
      } else {
        setMode('focus');
        setTimeLeft(settings.focusDuration * 60);
        if (settings.autoStartFocus) setIsActive(true);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode, settings, playSound, sendNotification, isInitialized]);

  const startTimer = () => {
    // Resume audio context on user interaction to satisfy browser policies
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Request notification permission when user starts to ensure we can show them later
    if (settings.notificationsEnabled && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsActive(true);
  };
  const pauseTimer = () => setIsActive(false);
  const resetTimer = () => {
    setIsActive(false);
    if (mode === 'focus') setTimeLeft(settings.focusDuration * 60);
    else if (mode === 'short-break') setTimeLeft(settings.shortBreakDuration * 60);
    else setTimeLeft(settings.longBreakDuration * 60);
  };

  const updateSettings = async (newSettings: Partial<AppSettings>, syncWithServer = true) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('pomodoro-settings', JSON.stringify(updated));

    if (user && syncWithServer) {
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
      } catch (err) {
        console.error('Failed to sync settings with server', err);
      }
    }
  };

  const totalTime = mode === 'focus' ? (settings.focusDuration || 25) * 60 
    : mode === 'short-break' ? (settings.shortBreakDuration || 5) * 60 
    : (settings.longBreakDuration || 15) * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <TimerContext.Provider value={{
      timeLeft, progress, isActive, mode, currentTaskId, settings, isAlarmRinging,
      startTimer, pauseTimer, resetTimer, skipSession, stopAlarm, setMode, setCurrentTaskId, updateSettings
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) throw new Error('useTimer must be used within a TimerProvider');
  return context;
};
