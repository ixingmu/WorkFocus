export interface Task {
  id: string;
  title: string;
  completedAt: string | null;
  createdAt: string;
  pomodoros: number;
  expectedPomodoros: number;
  progress: number; // 0-100
  order: number;
}

export interface PomodoroSession {
  id: string;
  taskId: string;
  taskTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: 'focus' | 'short-break' | 'long-break';
  progressIncrement?: number;
}

export interface AppSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  tickSoundEnabled: boolean;
  alarmSoundId: string;
  volume: number;
}

export type ViewType = 'timer' | 'tasks' | 'statistics' | 'settings' | 'admin' | 'member' | 'history';
