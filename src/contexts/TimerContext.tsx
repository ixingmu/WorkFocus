import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import confetti from 'canvas-confetti';

import { Task, PomodoroSession, AppSettings } from '../types';

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
  setMode: (mode: 'focus' | 'short-break' | 'long-break') => void;
  setCurrentTaskId: (id: string | null) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('pomodoro-settings');
    return saved ? JSON.parse(saved) : {
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
  });

  const [mode, setMode] = useState<'focus' | 'short-break' | 'long-break'>('focus');
  const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Howl | null>(null);

  // Persistence across refreshes
  useEffect(() => {
    const saved = localStorage.getItem('timer-state');
    if (saved) {
      const { timeLeft: sTime, isActive: sActive, mode: sMode, currentTaskId: sTask, lastTimestamp } = JSON.parse(saved);
      const elapsed = sActive ? Math.floor((Date.now() - lastTimestamp) / 1000) : 0;
      const newTime = Math.max(0, sTime - elapsed);
      
      setTimeLeft(newTime);
      setMode(sMode);
      setCurrentTaskId(sTask);
      if (sActive && newTime > 0) setIsActive(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('timer-state', JSON.stringify({
      timeLeft, isActive, mode, currentTaskId, lastTimestamp: Date.now()
    }));
  }, [timeLeft, isActive, mode, currentTaskId]);

  useEffect(() => {
    localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
    if (!isActive) {
      if (mode === 'focus') setTimeLeft(settings.focusDuration * 60);
      else if (mode === 'short-break') setTimeLeft(settings.shortBreakDuration * 60);
      else setTimeLeft(settings.longBreakDuration * 60);
    }
  }, [settings, mode, isActive]);

  const playSound = useCallback((soundName: string) => {
    if (!settings.soundEnabled) return;
    
    // Stop previous sound
    if (soundRef.current) soundRef.current.stop();

    const soundUrl = soundName.startsWith('/uploads') ? soundName : `https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3`; // Fallback to bell
    
    soundRef.current = new Howl({
      src: [soundUrl],
      volume: settings.volume / 100
    });
    soundRef.current.play();
  }, [settings.soundEnabled, settings.volume]);

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
    } else if (timeLeft === 0) {
      setIsActive(false);
      playSound(settings.alarmSoundId);
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
  }, [isActive, timeLeft, mode, settings, playSound]);

  const startTimer = () => setIsActive(true);
  const pauseTimer = () => setIsActive(false);
  const resetTimer = () => {
    setIsActive(false);
    if (mode === 'focus') setTimeLeft(settings.focusDuration * 60);
    else if (mode === 'short-break') setTimeLeft(settings.shortBreakDuration * 60);
    else setTimeLeft(settings.longBreakDuration * 60);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const totalTime = mode === 'focus' ? (settings.focusDuration || 25) * 60 
    : mode === 'short-break' ? (settings.shortBreakDuration || 5) * 60 
    : (settings.longBreakDuration || 15) * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <TimerContext.Provider value={{
      timeLeft, progress, isActive, mode, currentTaskId, settings,
      startTimer, pauseTimer, resetTimer, skipSession, setMode, setCurrentTaskId, updateSettings
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
