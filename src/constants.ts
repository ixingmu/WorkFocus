import { Bell, Zap, Volume2, Moon, Music, Wind, Coffee, Headphones, Sun } from 'lucide-react';

export const ALARM_SOUNDS = [
  { id: 'security', name: '安防警报', icon: Bell, url: '/sounds/mixkit-security-facility-breach-alarm-994.wav' },
  { id: 'facility', name: '设施警报', icon: Bell, url: '/sounds/mixkit-facility-alarm-sound-999.wav' },
  { id: 'alert', name: '紧急提醒', icon: Zap, url: '/sounds/mixkit-alert-alarm-1005.wav' },
  { id: 'rooster', name: '清晨鸡鸣', icon: Volume2, url: '/sounds/mixkit-rooster-crowing-in-the-morning-2462.wav' },
  { id: 'casino', name: '金币大奖', icon: Music, url: '/sounds/mixkit-casino-win-alarm-and-coins-1990.wav' },
  { id: 'marimba-wait', name: '马林巴等待', icon: Headphones, url: '/sounds/mixkit-marimba-waiting-ringtone-1360.wav' },
  { id: 'marimba', name: '马林巴铃声', icon: Headphones, url: '/sounds/mixkit-marimba-ringtone-1359.wav' },
  { id: 'clown', name: '小丑喇叭', icon: Sun, url: '/sounds/mixkit-clown-horn-at-circus-715.wav' },
  { id: 'children', name: '童声倒计', icon: Coffee, url: '/sounds/mixkit-children-happy-countdown-923.wav' },
];
