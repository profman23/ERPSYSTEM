/**
 * Web Speech API - Speech Recognition Hook
 * Supports Arabic (ar-EG) and English (en-US)
 *
 * @description Provides speech-to-text functionality using the Web Speech API
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number; // Number of alternative transcripts to return
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
  onspeechend: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseVoiceRecognitionOptions {
  locale: 'en' | 'ar';
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
}

export interface UseVoiceRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
}

// Language codes for Web Speech API
const LANGUAGE_CODES = {
  en: 'en-US',
  ar: 'ar-EG',
} as const;

export function useVoiceRecognition(options: UseVoiceRecognitionOptions): UseVoiceRecognitionReturn {
  const {
    locale,
    continuous = true,
    interimResults = true,
    onResult,
    onError,
    onEnd,
    onStart,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStoppingRef = useRef(false);

  // Check browser support
  const isSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Initialize recognition instance
  const getRecognition = useCallback((): SpeechRecognition | null => {
    if (!isSupported) return null;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = LANGUAGE_CODES[locale];
    recognition.maxAlternatives = 3; // Get multiple alternatives for better accuracy

    console.log('[VoiceRecognition] Created with lang:', recognition.lang, 'locale:', locale);

    return recognition;
  }, [isSupported, continuous, interimResults, locale]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      onError?.('Speech recognition is not supported in this browser');
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
    }

    const recognition = getRecognition();
    if (!recognition) return;

    isStoppingRef.current = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      onStart?.();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interim += text;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        onResult?.(finalTranscript, true);
      }

      setInterimTranscript(interim);
      if (interim) {
        onResult?.(interim, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore 'aborted' and 'no-speech' errors when stopping intentionally
      if (isStoppingRef.current && (event.error === 'aborted' || event.error === 'no-speech')) {
        return;
      }

      const errorMessage = getErrorMessage(event.error);
      setError(errorMessage);
      setIsListening(false);
      onError?.(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');

      // Only call onEnd if we didn't stop intentionally
      if (!isStoppingRef.current) {
        onEnd?.();
      }
    };

    recognition.onspeechend = () => {
      // Speech ended naturally
    };

    try {
      recognition.start();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start speech recognition';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [isSupported, getRecognition, onResult, onError, onEnd, onStart]);

  // Stop listening
  const stopListening = useCallback(() => {
    isStoppingRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
    setInterimTranscript('');
    onEnd?.();
  }, [onEnd]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors
        }
      }
    };
  }, []);

  // Update language when locale changes
  useEffect(() => {
    if (recognitionRef.current && isListening) {
      // Restart with new language
      stopListening();
      setTimeout(startListening, 100);
    }
  }, [locale]);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error,
  };
}

// Helper function to get user-friendly error messages
function getErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'No speech was detected. Please try again.';
    case 'aborted':
      return 'Speech recognition was aborted.';
    case 'audio-capture':
      return 'No microphone was found. Please check your microphone settings.';
    case 'network':
      return 'Network error occurred. Please check your internet connection.';
    case 'not-allowed':
      return 'Microphone access was denied. Please allow microphone access.';
    case 'service-not-allowed':
      return 'Speech recognition service is not allowed.';
    case 'bad-grammar':
      return 'Speech recognition grammar error.';
    case 'language-not-supported':
      return 'The selected language is not supported.';
    default:
      return `Speech recognition error: ${error}`;
  }
}

export default useVoiceRecognition;
