/**
 * Voice Assistant Hook
 * Combines speech recognition and synthesis for interactive voice commands
 *
 * Flow:
 * 1. User presses mic button (starts listening)
 * 2. User says wake word (e.g., "جاهز يا ذكي" / "Hey Zaki")
 * 3. AI responds with voice (e.g., "نعم جاهز" / "Yes, I'm ready")
 * 4. User continues with their command
 * 5. User releases button → command is sent to AI
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceRecognition } from './useVoiceRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';

export type VoiceAssistantPhase =
  | 'idle'
  | 'listening'  // Direct listening mode (no wake word needed)
  | 'listening_for_wake'
  | 'responding'
  | 'listening_for_command';

export interface UseVoiceAssistantOptions {
  locale: 'en' | 'ar';
  wakeWords?: string[];
  readyResponses?: { en: string[]; ar: string[] };
  onCommand?: (command: string) => void;
  onWakeWordDetected?: () => void;
  onPhaseChange?: (phase: VoiceAssistantPhase) => void;
  onError?: (error: string) => void;
  /** If true, skip wake word and listen directly for commands */
  directMode?: boolean;
}

export interface UseVoiceAssistantReturn {
  phase: VoiceAssistantPhase;
  transcript: string;
  commandTranscript: string;
  interimTranscript: string; // Live transcript while speaking
  isSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  cancel: () => void;
  error: string | null;
}

// Default wake words (bilingual) - more variations
const DEFAULT_WAKE_WORDS = [
  // Arabic
  'جاهز يا ذكي',
  'يا ذكي',
  'مرحبا ذكي',
  'ذكي',
  'جاهز',
  'هاي ذكي',
  'اهلا ذكي',
  // English
  'hey zaki',
  'hi zaki',
  'ready zaki',
  'zaki',
  'ready',
  'hello zaki',
  'hey zack',
  'hi zack',
  'hey saki',
  'hey zeki',
];

// Default ready responses
const DEFAULT_READY_RESPONSES = {
  en: [
    "Yes, I'm ready",
    "I'm listening",
    'At your service',
    'Go ahead',
  ],
  ar: [
    'نعم جاهز، تفضل',
    'أنا جاهز',
    'تحت أمرك',
    'تفضل',
  ],
};

export function useVoiceAssistant(options: UseVoiceAssistantOptions): UseVoiceAssistantReturn {
  const {
    locale,
    wakeWords = DEFAULT_WAKE_WORDS,
    readyResponses = DEFAULT_READY_RESPONSES,
    onCommand,
    onWakeWordDetected,
    onPhaseChange,
    onError,
    directMode = true, // Default to direct mode (no wake word needed)
  } = options;

  const [phase, setPhase] = useState<VoiceAssistantPhase>('idle');
  const [commandTranscript, setCommandTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use refs to avoid stale closures
  const phaseRef = useRef<VoiceAssistantPhase>('idle');
  const wakeWordDetectedRef = useRef(false);
  const fullTranscriptRef = useRef('');
  const commandTranscriptRef = useRef('');
  const isProcessingWakeWordRef = useRef(false);

  // Update phase and notify
  const updatePhase = useCallback((newPhase: VoiceAssistantPhase) => {
    phaseRef.current = newPhase;
    setPhase(newPhase);
    onPhaseChange?.(newPhase);
    console.log('[VoiceAssistant] Phase changed to:', newPhase);
  }, [onPhaseChange]);

  // Speech synthesis hook
  const synthesis = useSpeechSynthesis({
    locale,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    onStart: () => {
      console.log('[VoiceAssistant] Speech synthesis started');
    },
    onEnd: () => {
      console.log('[VoiceAssistant] Speech synthesis ended, phase:', phaseRef.current);
    },
    onError: (err) => {
      console.error('[VoiceAssistant] Speech synthesis error:', err);
      setError(err);
      onError?.(err);
    },
  });

  // Check for wake word in transcript
  const checkForWakeWord = useCallback((text: string): boolean => {
    const normalizedText = text.toLowerCase().trim();
    console.log('[VoiceAssistant] Checking for wake word in:', normalizedText);

    for (const wakeWord of wakeWords) {
      const normalizedWakeWord = wakeWord.toLowerCase().trim();
      if (normalizedText.includes(normalizedWakeWord)) {
        console.log('[VoiceAssistant] Wake word detected:', wakeWord);
        return true;
      }
    }

    return false;
  }, [wakeWords]);

  // Get random ready response
  const getReadyResponse = useCallback((): string => {
    const responses = readyResponses[locale];
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  }, [locale, readyResponses]);

  // Speech recognition hook
  const recognition = useVoiceRecognition({
    locale,
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      console.log('[VoiceAssistant] Recognition result:', { text, isFinal, phase: phaseRef.current, directMode });

      // DIRECT MODE: Just accumulate everything as command
      if (directMode && phaseRef.current === 'listening') {
        if (isFinal) {
          commandTranscriptRef.current += ' ' + text;
          setCommandTranscript(commandTranscriptRef.current.trim());
          console.log('[VoiceAssistant] Command accumulated:', commandTranscriptRef.current.trim());
        }
        return;
      }

      // WAKE WORD MODE (original behavior)
      // Accumulate full transcript
      if (isFinal) {
        fullTranscriptRef.current += ' ' + text;
      }

      const currentText = fullTranscriptRef.current + ' ' + text;

      // Check for wake word if not yet detected and not already processing
      if (!wakeWordDetectedRef.current &&
          !isProcessingWakeWordRef.current &&
          phaseRef.current === 'listening_for_wake') {
        if (checkForWakeWord(currentText)) {
          // Mark as processing to prevent multiple triggers
          isProcessingWakeWordRef.current = true;
          wakeWordDetectedRef.current = true;

          // Handle wake word async
          (async () => {
            console.log('[VoiceAssistant] Wake word detected! Starting response...');
            onWakeWordDetected?.();
            updatePhase('responding');

            // Stop recognition while speaking
            recognition.stopListening();

            // Small delay to ensure recognition is fully stopped
            await new Promise(resolve => setTimeout(resolve, 150));

            // Speak ready response
            const response = getReadyResponse();
            console.log('[VoiceAssistant] Speaking response:', response);

            try {
              await synthesis.speak(response);
              console.log('[VoiceAssistant] Speech completed successfully');
            } catch (err) {
              console.error('[VoiceAssistant] Failed to speak:', err);
            }

            // Resume recognition for command after speaking
            console.log('[VoiceAssistant] Resuming recognition for command');
            updatePhase('listening_for_command');
            recognition.startListening();
            isProcessingWakeWordRef.current = false;
          })();
        }
      }

      // Accumulate command transcript after wake word
      if (wakeWordDetectedRef.current && phaseRef.current === 'listening_for_command') {
        if (isFinal) {
          commandTranscriptRef.current += ' ' + text;
          setCommandTranscript(commandTranscriptRef.current.trim());
        }
      }
    },
    onError: (err) => {
      console.error('[VoiceAssistant] Recognition error:', err);
      setError(err);
      onError?.(err);
    },
    onEnd: () => {
      console.log('[VoiceAssistant] Recognition ended, phase:', phaseRef.current);
    },
    onStart: () => {
      console.log('[VoiceAssistant] Recognition started');
    },
  });

  // Reset state
  const reset = useCallback(() => {
    console.log('[VoiceAssistant] Resetting state');
    wakeWordDetectedRef.current = false;
    isProcessingWakeWordRef.current = false;
    fullTranscriptRef.current = '';
    commandTranscriptRef.current = '';
    setCommandTranscript('');
    setError(null);
    updatePhase('idle');
  }, [updatePhase]);

  // Start listening (press mic button)
  const startListening = useCallback(() => {
    console.log('[VoiceAssistant] Starting listening... directMode:', directMode);
    reset();

    if (directMode) {
      // Direct mode: skip wake word, go straight to listening for command
      updatePhase('listening');
    } else {
      // Wake word mode: wait for wake word first
      updatePhase('listening_for_wake');
    }

    recognition.startListening();
  }, [reset, updatePhase, recognition, directMode]);

  // Stop listening (release mic button)
  const stopListening = useCallback(() => {
    console.log('[VoiceAssistant] Stopping listening, command:', commandTranscriptRef.current);
    recognition.stopListening();
    synthesis.cancel();

    // If we have a command, send it
    const command = commandTranscriptRef.current.trim();
    if (command) {
      console.log('[VoiceAssistant] Sending command to AI:', command);
      onCommand?.(command);
    } else {
      console.log('[VoiceAssistant] No command captured');
    }

    reset();
  }, [recognition, synthesis, onCommand, reset]);

  // Cancel (force stop everything)
  const cancel = useCallback(() => {
    console.log('[VoiceAssistant] Canceling');
    recognition.stopListening();
    synthesis.cancel();
    reset();
  }, [recognition, synthesis, reset]);

  // Check if voice is supported
  const isSupported = recognition.isSupported && synthesis.isSupported;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognition.stopListening();
      synthesis.cancel();
    };
  }, []);

  return {
    phase,
    transcript: recognition.transcript,
    commandTranscript,
    interimTranscript: recognition.interimTranscript, // Live transcript while speaking
    isSupported,
    isListening: recognition.isListening,
    isSpeaking: synthesis.isSpeaking,
    startListening,
    stopListening,
    cancel,
    error,
  };
}

export default useVoiceAssistant;
