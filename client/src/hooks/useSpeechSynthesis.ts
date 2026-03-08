/**
 * Web Speech API - Text to Speech Hook
 * Supports Arabic and English voices
 *
 * @description Provides text-to-speech functionality using the Web Speech API
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseSpeechSynthesisOptions {
  locale: 'en' | 'ar';
  rate?: number; // 0.5 - 2.0 (default 1.0)
  pitch?: number; // 0 - 2.0 (default 1.0)
  volume?: number; // 0 - 1.0 (default 1.0)
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  speak: (text: string) => Promise<void>;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
}

// Language codes and preferred voice patterns
const VOICE_PREFERENCES = {
  en: {
    lang: 'en-US',
    patterns: ['Google US English', 'Microsoft Zira', 'Microsoft David', 'Samantha', 'Alex'],
  },
  ar: {
    lang: 'ar',
    patterns: ['Google العربية', 'Microsoft Hoda', 'Maged', 'Tarik'],
  },
} as const;

export function useSpeechSynthesis(options: UseSpeechSynthesisOptions): UseSpeechSynthesisReturn {
  const {
    locale,
    rate = 1.0,
    pitch = 1.0,
    volume = 1.0,
    onStart,
    onEnd,
    onError,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Check browser support
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available voices
  const loadVoices = useCallback(() => {
    if (!isSupported) return;

    const availableVoices = window.speechSynthesis.getVoices();
    setVoices(availableVoices);

    // Select best voice for current locale
    const preference = VOICE_PREFERENCES[locale];
    let bestVoice: SpeechSynthesisVoice | null = null;

    // Try to find a preferred voice by name pattern
    for (const pattern of preference.patterns) {
      const found = availableVoices.find(v =>
        v.name.toLowerCase().includes(pattern.toLowerCase())
      );
      if (found) {
        bestVoice = found;
        break;
      }
    }

    // If no preferred voice, find any voice matching the language
    if (!bestVoice) {
      bestVoice = availableVoices.find(v => v.lang.startsWith(preference.lang)) || null;
    }

    // Fallback to first available voice
    if (!bestVoice && availableVoices.length > 0) {
      bestVoice = availableVoices[0];
    }

    setSelectedVoice(bestVoice);
    selectedVoiceRef.current = bestVoice;
    console.log('[SpeechSynthesis] Loaded voices:', availableVoices.length, 'Selected:', bestVoice?.name);
  }, [isSupported, locale]);

  // Initialize voices
  useEffect(() => {
    if (!isSupported) return;

    loadVoices();

    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported, loadVoices]);

  // Reload voice when locale changes
  useEffect(() => {
    loadVoices();
  }, [locale, loadVoices]);

  // Speak text
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('[SpeechSynthesis] speak() called with:', text);

      if (!isSupported) {
        const error = 'Speech synthesis is not supported in this browser';
        console.error('[SpeechSynthesis]', error);
        onError?.(error);
        reject(new Error(error));
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Get fresh voices if not loaded yet (Chrome async loading)
      let voiceToUse = selectedVoiceRef.current;
      if (!voiceToUse) {
        const availableVoices = window.speechSynthesis.getVoices();
        console.log('[SpeechSynthesis] Getting voices on demand:', availableVoices.length);
        if (availableVoices.length > 0) {
          // Find a voice for the current locale
          const preference = VOICE_PREFERENCES[locale];
          voiceToUse = availableVoices.find(v => v.lang.startsWith(preference.lang)) || availableVoices[0];
          selectedVoiceRef.current = voiceToUse;
        }
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      resolveRef.current = resolve;

      // Set voice properties
      if (voiceToUse) {
        utterance.voice = voiceToUse;
        console.log('[SpeechSynthesis] Using voice:', voiceToUse.name, voiceToUse.lang);
      } else {
        console.warn('[SpeechSynthesis] No voice selected, using browser default');
      }
      utterance.lang = VOICE_PREFERENCES[locale].lang;
      utterance.rate = Math.max(0.5, Math.min(2.0, rate));
      utterance.pitch = Math.max(0, Math.min(2.0, pitch));
      utterance.volume = Math.max(0, Math.min(1.0, volume));

      utterance.onstart = () => {
        console.log('[SpeechSynthesis] Started speaking');
        setIsSpeaking(true);
        setIsPaused(false);
        onStart?.();
      };

      // Note: onend is set after speak() to include interval cleanup

      utterance.onerror = (event) => {
        console.error('[SpeechSynthesis] Error event:', event.error);
        // Ignore 'interrupted' and 'canceled' errors (normal cancellation)
        if (event.error === 'interrupted' || event.error === 'canceled') {
          console.log('[SpeechSynthesis] Speech was cancelled/interrupted (normal)');
          setIsSpeaking(false);
          setIsPaused(false);
          resolve();
          return;
        }

        const errorMessage = `Speech synthesis error: ${event.error}`;
        setIsSpeaking(false);
        setIsPaused(false);
        onError?.(errorMessage);
        reject(new Error(errorMessage));
      };

      utterance.onpause = () => {
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPaused(false);
      };

      // Chrome bug workaround: Speech synthesis stops after ~15 seconds
      // We need to resume it periodically
      const resumeInfinity = () => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      };

      // Start speaking
      console.log('[SpeechSynthesis] Calling speechSynthesis.speak()');
      window.speechSynthesis.speak(utterance);
      console.log('[SpeechSynthesis] speechSynthesis.speaking:', window.speechSynthesis.speaking);

      // Resume every 10 seconds (Chrome bug workaround)
      const intervalId = setInterval(resumeInfinity, 10000);

      // Clean up interval when done
      utterance.onend = () => {
        console.log('[SpeechSynthesis] Finished speaking');
        clearInterval(intervalId);
        setIsSpeaking(false);
        setIsPaused(false);
        onEnd?.();
        resolveRef.current?.();
        resolveRef.current = null;
      };
    });
  }, [isSupported, locale, rate, pitch, volume, onStart, onEnd, onError]);

  // Cancel speech
  const cancel = useCallback(() => {
    if (!isSupported) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    resolveRef.current?.();
    resolveRef.current = null;
  }, [isSupported]);

  // Pause speech
  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking) return;

    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported, isSpeaking]);

  // Resume speech
  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return;

    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    isSupported,
    isSpeaking,
    isPaused,
    speak,
    cancel,
    pause,
    resume,
    voices,
    selectedVoice,
  };
}

export default useSpeechSynthesis;
