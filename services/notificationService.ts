import { getMessaging, getToken } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebaseConfig';

let audioContext: AudioContext | null = null;

const createTone = (startOffset: number, duration: number, frequency: number) => {
  const context = audioContext!;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  gainNode.gain.setValueAtTime(0.001, context.currentTime + startOffset);
  gainNode.gain.exponentialRampToValueAtTime(0.2, context.currentTime + startOffset + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + startOffset + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(context.currentTime + startOffset);
  oscillator.stop(context.currentTime + startOffset + duration);
};

export const NotificationService = {
  requestPushToken: async (): Promise<string | null> => {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        return null;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return null;
      }

      const messaging = getMessaging();
      const swPath = import.meta.env.BASE_URL + 'firebase-messaging-sw.js';
      const registration = await navigator.serviceWorker.register(swPath);
      const token = await getToken(messaging, { serviceWorkerRegistration: registration });

      return token || null;
    } catch (error) {
      console.warn('Push notifications not supported or permitted', error);
      return null;
    }
  },

  // Returns the queued task's name so the push can be cancelled if the rest ends early.
  scheduleRestNotification: async (deviceToken: string, restTimeSeconds: number): Promise<string | null> => {
    if (!deviceToken || restTimeSeconds <= 0) {
      return null;
    }

    const scheduleGymRestTimer = httpsCallable<
      { deviceToken: string; restTimeSeconds: number },
      { success: boolean; taskName: string | null }
    >(functions, 'scheduleGymRestTimer');

    const result = await scheduleGymRestTimer({ deviceToken, restTimeSeconds });
    return result.data?.taskName || null;
  },

  cancelRestNotification: async (taskName: string): Promise<void> => {
    if (!taskName) {
      return;
    }

    const cancelGymRestTimer = httpsCallable<{ taskName: string }, { success: boolean }>(
      functions,
      'cancelGymRestTimer'
    );
    await cancelGymRestTimer({ taskName });
  },

  playForegroundTimerComplete: async (): Promise<void> => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        return;
      }

      if (!audioContext) {
        audioContext = new AudioCtx();
      }

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      createTone(0, 0.18, 880);
      createTone(0.2, 0.18, 1174);
      createTone(0.4, 0.28, 1318);
    } catch (error) {
      console.warn('Unable to play timer sound', error);
    }
  },

  vibrateTimerComplete: (): void => {
    if ('vibrate' in navigator) {
      navigator.vibrate([180, 80, 180, 80, 260]);
    }
  }
};
