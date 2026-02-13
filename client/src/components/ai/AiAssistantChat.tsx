/**
 * AI Assistant Chat - Main Component
 * Combines FloatingButton + ChatPopup with state management
 * Supports voice commands with wake word detection
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AiFloatingButton from './AiFloatingButton';
import AiChatPopup from './AiChatPopup';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { apiClient } from '@/lib/api';
import type { AgiMessage, AgiApproval, AiButtonState, AgiChatResponse, AgiAction, AgiFormFillState } from '../../../../types/agi';

interface AiAssistantChatProps {
  locale?: 'en' | 'ar';
  currentPage?: string;
  currentModule?: string;
  isEnabled?: boolean;
}

const AiAssistantChat: React.FC<AiAssistantChatProps> = ({
  locale = 'en',
  currentPage,
  currentModule,
  isEnabled = true,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiState, setAiState] = useState<AiButtonState>('idle');
  const [pendingApprovals, setPendingApprovals] = useState<AgiApproval[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [formFillState, setFormFillState] = useState<AgiFormFillState | null>(null);
  const [voiceLocale, setVoiceLocale] = useState<'en' | 'ar'>(locale);
  const wasVoiceInputRef = useRef(false);

  // Determine if we're in system admin context
  const isSystemContext = currentModule === 'SYSTEM';
  const apiBasePath = isSystemContext ? '/system/ai' : '/tenant/ai';

  // Speech synthesis for voice-in → voice-out
  const tts = useSpeechSynthesis({
    locale,
    onEnd: useCallback(() => {
      setAiState('idle');
    }, []),
  });

  // Voice assistant hook — uses voiceLocale (independent toggle for AR/EN voice recognition)
  const voiceAssistant = useVoiceAssistant({
    locale: voiceLocale,
    onCommand: (command) => {
      // Send voice command as chat message (mark as voice input for TTS response)
      handleSendMessage(command, true);
    },
    onWakeWordDetected: () => {
      setAiState('listening');
    },
    onPhaseChange: (phase) => {
      if (phase === 'idle') {
        setAiState('idle');
      } else if (phase === 'listening_for_wake' || phase === 'listening_for_command') {
        setAiState('listening');
      } else if (phase === 'responding') {
        setAiState('thinking');
      }
    },
    onError: (err) => {
      setError(err);
      setTimeout(() => setError(undefined), 5000);
    },
  });

  // Fetch pending approvals count on mount
  useEffect(() => {
    if (isEnabled) {
      fetchPendingApprovals();
    }
  }, [isEnabled, apiBasePath]);

  const fetchPendingApprovals = async () => {
    try {
      const response = await apiClient.get(`${apiBasePath}/approvals?limit=5`);
      if (response.data?.success) {
        setPendingApprovals(response.data.data || []);
      }
    } catch {
      // Silently fail - approvals are optional
    }
  };

  // Execute AI action (navigation, etc.)
  const executeAction = useCallback((action: AgiAction) => {
    if (action.type === 'NAVIGATE' && action.target) {
      // Close the chat popup before navigating
      setIsOpen(false);
      // Small delay to allow popup to close smoothly
      setTimeout(() => {
        navigate(action.target as string);
      }, 200);
    }
    // TODO: Handle other action types (CREATE, UPDATE, DELETE, READ)
  }, [navigate]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Cancel any ongoing voice operation
    voiceAssistant.cancel();
  }, [voiceAssistant]);

  const handleSendMessage = useCallback(
    async (content: string, isVoice = false) => {
      if (!content.trim()) return;

      wasVoiceInputRef.current = isVoice;

      // Add user message
      const userMessage: AgiMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setAiState('thinking');
      setError(undefined);

      try {
        const response = await apiClient.post(`${apiBasePath}/chat`, {
          message: content,
          context: {
            currentPage,
            currentModule,
            locale,
          },
          formFillState: formFillState || undefined,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        });

        const data: AgiChatResponse = response.data;

        if (data.success && data.message) {
          setMessages((prev) => [...prev, data.message]);

          // Update form fill state if returned
          if (data.formFillState) {
            setFormFillState({
              ...data.formFillState,
              sessionId: formFillState?.sessionId || crypto.randomUUID(),
            });
          } else if (data.action && (data.action.type === 'CREATE' || data.action.type === 'UPDATE' || data.action.type === 'DELETE')) {
            // Only clear form fill state on mutation actions, NOT on READ/NAVIGATE
            setFormFillState(null);
          }

          // Handle approval requirement
          if (data.requiresApproval && data.approvalId) {
            fetchPendingApprovals();
          }

          // Execute action if present (navigation, etc.)
          if (data.action) {
            setAiState('success');
            executeAction(data.action);

            // Invalidate relevant queries after successful CRUD action
            if (data.action.type !== 'NAVIGATE' && data.action.target) {
              queryClient.invalidateQueries({ queryKey: [data.action.target] });
              queryClient.invalidateQueries({ queryKey: ['allUsers'] });
              queryClient.invalidateQueries({ queryKey: ['users'] });
            }

            setTimeout(() => setAiState('idle'), 2000);
          } else {
            setAiState('idle');
          }

          // Voice-in → voice-out: if user spoke, Zaki responds with TTS
          if (wasVoiceInputRef.current && data.message?.content && tts.isSupported) {
            tts.speak(data.message.content);
          }
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        setAiState('error');

        // Add error message to chat
        const errorMsg: AgiMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            locale === 'ar'
              ? `عذراً، حدث خطأ: ${errorMessage}`
              : `Sorry, an error occurred: ${errorMessage}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);

        setTimeout(() => setAiState('idle'), 3000);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, currentModule, locale, apiBasePath, executeAction, formFillState, queryClient, tts]
  );

  const handleApprove = useCallback(async (approvalId: string) => {
    try {
      const response = await apiClient.post(`${apiBasePath}/approvals/${approvalId}/approve`);

      if (response.data?.success) {
        // Remove from pending list
        setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));

        // Add success message
        const successMsg: AgiMessage = {
          id: `approval-${Date.now()}`,
          role: 'system',
          content: response.data.message || 'Approval granted',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMsg]);

        setAiState('success');
        setTimeout(() => setAiState('idle'), 2000);
      }
    } catch {
      setError('Failed to approve');
    }
  }, [apiBasePath]);

  const handleReject = useCallback(async (approvalId: string, reason?: string) => {
    try {
      const response = await apiClient.post(`${apiBasePath}/approvals/${approvalId}/reject`, { reason });

      if (response.data?.success) {
        setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));

        const rejectMsg: AgiMessage = {
          id: `rejection-${Date.now()}`,
          role: 'system',
          content: response.data.message || 'Approval rejected',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, rejectMsg]);
      }
    } catch {
      setError('Failed to reject');
    }
  }, [apiBasePath]);

  // Voice control handlers
  const handleVoiceStart = useCallback(() => {
    if (!voiceAssistant.isSupported) {
      setError(
        locale === 'ar'
          ? 'الأوامر الصوتية غير مدعومة في هذا المتصفح'
          : 'Voice commands are not supported in this browser'
      );
      setTimeout(() => setError(undefined), 5000);
      return;
    }
    voiceAssistant.startListening();
  }, [voiceAssistant, locale]);

  const handleVoiceStop = useCallback(() => {
    voiceAssistant.stopListening();
  }, [voiceAssistant]);

  const handleClearError = useCallback(() => {
    setError(undefined);
  }, []);

  if (!isEnabled) return null;

  return (
    <>
      <AiFloatingButton
        onClick={handleToggle}
        state={aiState}
        pendingApprovals={pendingApprovals.length}
      />
      <AiChatPopup
        isOpen={isOpen}
        onClose={handleClose}
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        locale={locale}
        pendingApprovals={pendingApprovals}
        onApprove={handleApprove}
        onReject={handleReject}
        aiState={aiState}
        isVoiceEnabled={voiceAssistant.isSupported}
        onVoiceStart={handleVoiceStart}
        onVoiceStop={handleVoiceStop}
        isListening={voiceAssistant.isListening}
        isSpeaking={voiceAssistant.isSpeaking}
        voicePhase={voiceAssistant.phase}
        voiceTranscript={voiceAssistant.commandTranscript || voiceAssistant.transcript}
        voiceInterimTranscript={voiceAssistant.interimTranscript}
        voiceLocale={voiceLocale}
        onToggleVoiceLocale={() => setVoiceLocale(prev => prev === 'ar' ? 'en' : 'ar')}
        error={error}
        onClearError={handleClearError}
      />
    </>
  );
};

export default AiAssistantChat;
