/**
 * AI Chat Popup - Bilingual Chat Interface (EN/AR)
 * RTL-aware chat interface with streaming support
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Send, Mic, MicOff, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { AgiMessage, AgiApproval, AiButtonState } from '../../../../types/agi';

export type VoicePhase = 'idle' | 'listening' | 'listening_for_wake' | 'responding' | 'listening_for_command';

interface AiChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  messages: AgiMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  locale: 'en' | 'ar';
  pendingApprovals?: AgiApproval[];
  onApprove?: (approvalId: string) => void;
  onReject?: (approvalId: string, reason?: string) => void;
  aiState?: AiButtonState;
  isVoiceEnabled?: boolean;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  isListening?: boolean;
  isSpeaking?: boolean;
  voicePhase?: VoicePhase;
  voiceTranscript?: string;
  voiceInterimTranscript?: string; // Live transcript while speaking
  voiceLocale?: 'en' | 'ar';
  onToggleVoiceLocale?: () => void;
  error?: string;
  onClearError?: () => void;
}

const AiChatPopup: React.FC<AiChatPopupProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isLoading,
  locale,
  pendingApprovals = [],
  onApprove,
  onReject,
  aiState = 'idle',
  isVoiceEnabled = false,
  onVoiceStart,
  onVoiceStop,
  isListening = false,
  isSpeaking = false,
  voicePhase = 'idle',
  voiceTranscript = '',
  voiceInterimTranscript = '',
  voiceLocale = 'ar',
  onToggleVoiceLocale,
  error,
  onClearError,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRtl = locale === 'ar';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const translations = {
    en: {
      title: 'Zaki | ذكي',
      placeholder: 'Type or say "Hey Zaki"...',
      send: 'Send',
      thinking: 'Zaki is thinking...',
      listening: 'Listening... Speak now!',
      waitingForWakeWord: 'Say "Hey Zaki" or "يا ذكي"...',
      aiResponding: 'Zaki is responding...',
      listeningForCommand: 'Listening for your command...',
      speakNow: 'Speak your command...',
      voiceTooltip: 'Click to speak',
      noMessages: "Hi, I'm Zaki! How can I help you?",
      pendingApprovals: 'Pending Approvals',
      approve: 'Approve',
      reject: 'Reject',
      close: 'Close',
      limitedMode: 'Limited mode (pattern matching only)',
    },
    ar: {
      title: 'ذكي | Zaki',
      placeholder: 'اكتب أو قل "يا ذكي"...',
      send: 'إرسال',
      thinking: 'ذكي يفكر...',
      listening: 'جاري الاستماع... تكلم الآن!',
      waitingForWakeWord: 'قل "يا ذكي" أو "Hey Zaki"...',
      aiResponding: 'ذكي يرد...',
      listeningForCommand: 'جاري الاستماع لأمرك...',
      speakNow: 'تكلم بأمرك...',
      voiceTooltip: 'اضغط للتحدث',
      noMessages: 'مرحباً أنا ذكي! كيف أقدر أساعدك؟',
      pendingApprovals: 'الموافقات المعلقة',
      approve: 'موافقة',
      reject: 'رفض',
      close: 'إغلاق',
      limitedMode: 'الوضع المحدود (مطابقة الأنماط فقط)',
    },
  };

  const t = translations[locale];

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed bottom-24 z-50',
        'w-[380px] h-[500px]',
        'flex flex-col',
        'ai-chat-popup rounded-xl overflow-hidden',
        'transform transition-all duration-300 ease-out',
        isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        isRtl ? 'left-6' : 'right-6'
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          {/* Sunburst icon mini */}
          <svg viewBox="0 0 100 100" className="w-6 h-6">
            {[...Array(8)].map((_, i) => {
              const angle = (i * 45 * Math.PI) / 180;
              const innerRadius = 20;
              const outerRadius = 40;
              const x1 = 50 + innerRadius * Math.cos(angle);
              const y1 = 50 + innerRadius * Math.sin(angle);
              const x2 = 50 + outerRadius * Math.cos(angle);
              const y2 = 50 + outerRadius * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--ai-coral)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              );
            })}
            <circle cx="50" cy="50" r="14" fill="var(--ai-coral)" />
          </svg>
          <span className="font-semibold text-[var(--color-text)]">{t.title}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
          aria-label={t.close}
        >
          <X className="w-5 h-5 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-[var(--color-danger-light)] text-[var(--color-text-danger)] text-sm flex items-center justify-between">
          <span>{error}</span>
          {onClearError && (
            <button onClick={onClearError} className="p-1 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="px-4 py-2 bg-[var(--color-warning-light)] border-b border-[var(--color-warning-border)]">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-warning)] mb-2">
            <AlertTriangle className="w-4 h-4" />
            {t.pendingApprovals} ({pendingApprovals.length})
          </div>
          <div className="space-y-2 max-h-24 overflow-y-auto">
            {pendingApprovals.slice(0, 2).map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={onApprove}
                onReject={onReject}
                t={t}
                locale={locale}
              />
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)]">
            <svg viewBox="0 0 100 100" className="w-16 h-16 mb-3 opacity-30">
              {[...Array(8)].map((_, i) => {
                const angle = (i * 45 * Math.PI) / 180;
                const innerRadius = 20;
                const outerRadius = 40;
                const x1 = 50 + innerRadius * Math.cos(angle);
                const y1 = 50 + innerRadius * Math.sin(angle);
                const x2 = 50 + outerRadius * Math.cos(angle);
                const y2 = 50 + outerRadius * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                );
              })}
              <circle cx="50" cy="50" r="14" fill="currentColor" />
            </svg>
            <p className="text-center text-sm">{t.noMessages}</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} isRtl={isRtl} />
          ))
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="ai-chat-message-assistant px-4 py-2 rounded-xl max-w-[80%]">
              <div className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full bg-[var(--ai-coral)] animate-typing-dot"
                  style={{ animationDelay: '0s' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-[var(--ai-coral)] animate-typing-dot"
                  style={{ animationDelay: '0.2s' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-[var(--ai-coral)] animate-typing-dot"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          {/* Voice locale toggle + Mic button */}
          {isVoiceEnabled && onVoiceStart && onVoiceStop && (
            <div className="flex items-center gap-1">
              {/* Voice language toggle (AR/EN) */}
              {onToggleVoiceLocale && (
                <button
                  type="button"
                  onClick={onToggleVoiceLocale}
                  className={cn(
                    'text-xs font-bold px-1.5 py-0.5 rounded transition-all duration-200',
                    'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]',
                    'hover:bg-[var(--ai-coral)] hover:text-white'
                  )}
                  title={voiceLocale === 'ar' ? 'Voice: Arabic — Click to switch' : 'Voice: English — Click to switch'}
                >
                  {voiceLocale === 'ar' ? 'ع' : 'EN'}
                </button>
              )}
              {/* Mic button */}
              <button
                type="button"
                onClick={() => {
                  if (isListening || isSpeaking) {
                    onVoiceStop();
                  } else {
                    onVoiceStart();
                  }
                }}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  'select-none',
                  isListening || isSpeaking
                    ? 'bg-[var(--ai-coral)] text-white scale-110'
                    : 'hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]',
                  isSpeaking && 'animate-pulse'
                )}
                aria-label={t.voiceTooltip}
                title={t.voiceTooltip}
              >
                {isListening || isSpeaking ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            </div>
          )}

          {/* Text input with animated border wrapper */}
          <div className="ai-input-wrapper flex-1">
            <input
              ref={inputRef}
              type="text"
              value={
                isListening
                  ? voiceInterimTranscript || voiceTranscript || '' // Show interim first, then final
                  : inputValue
              }
              onChange={(e) => !isListening && setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                voicePhase === 'listening'
                  ? t.speakNow
                  : voicePhase === 'listening_for_wake'
                    ? t.waitingForWakeWord
                    : voicePhase === 'responding'
                      ? t.aiResponding
                      : voicePhase === 'listening_for_command'
                        ? t.listeningForCommand
                        : t.placeholder
              }
              disabled={isLoading || isListening || isSpeaking}
              className={cn(
                'w-full px-4 py-2 rounded-full',
                'bg-[var(--color-surface-hover)]',
                'text-[var(--color-text)]',
                'placeholder:text-[var(--color-text-muted)]',
                'border-2 border-transparent',
                'ai-input-field',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200',
                'focus:outline-none',
                // Italic gray style for interim transcript
                isListening && voiceInterimTranscript && 'italic text-[var(--color-text-muted)]'
              )}
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              'p-2 rounded-full transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              inputValue.trim() && !isLoading
                ? 'bg-[var(--ai-coral)] text-white hover:bg-[var(--ai-coral-dark)]'
                : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
            )}
            aria-label={t.send}
          >
            <Send className={cn('w-5 h-5', isRtl && 'rotate-180')} />
          </button>
        </div>

        {/* Status indicator */}
        {aiState === 'thinking' && (
          <p className="mt-2 text-xs text-[var(--color-text-muted)] text-center">{t.thinking}</p>
        )}
        {voicePhase !== 'idle' && (
          <p className="mt-2 text-xs text-[var(--ai-coral)] text-center animate-pulse">
            {voicePhase === 'listening' && t.listening}
            {voicePhase === 'listening_for_wake' && t.waitingForWakeWord}
            {voicePhase === 'responding' && t.aiResponding}
            {voicePhase === 'listening_for_command' && t.listeningForCommand}
          </p>
        )}
      </form>
    </div>
  );
};

// Message Bubble Component
interface MessageBubbleProps {
  message: AgiMessage;
  isRtl: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isRtl }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1 rounded-full bg-[var(--color-surface-hover)] text-xs text-[var(--color-text-muted)]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex', isUser ? (isRtl ? 'justify-start' : 'justify-end') : isRtl ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'px-4 py-2 max-w-[80%]',
          isUser ? 'ai-chat-message-user' : 'ai-chat-message-assistant'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.metadata?.actionExecuted && (
          <div className="mt-1 pt-1 border-t border-white/20 text-xs opacity-70">
            {message.metadata.actionExecuted}
          </div>
        )}
      </div>
    </div>
  );
};

// Approval Card Component
interface ApprovalCardProps {
  approval: AgiApproval;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason?: string) => void;
  t: Record<string, string>;
  locale: 'en' | 'ar';
}

const ApprovalCard: React.FC<ApprovalCardProps> = ({ approval, onApprove, onReject, t, locale }) => {
  const riskColors = {
    LOW: 'text-[var(--color-text-success)]',
    MEDIUM: 'text-[var(--color-text-warning)]',
    HIGH: 'text-[var(--color-text-danger)]',
    CRITICAL: 'text-[var(--color-danger)]',
  };

  return (
    <div className="p-2 bg-white/50 rounded-lg text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-[var(--color-text)]">
          {locale === 'ar' && approval.action.descriptionAr
            ? approval.action.descriptionAr
            : approval.action.description}
        </span>
        <span className={cn('px-1.5 py-0.5 rounded text-[10px]', riskColors[approval.action.riskLevel])}>
          {approval.action.riskLevel}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => onApprove?.(approval.id)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-success)] text-white hover:bg-[var(--color-success-hover)] transition-colors"
        >
          <CheckCircle className="w-3 h-3" />
          {t.approve}
        </button>
        <button
          onClick={() => onReject?.(approval.id)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger-hover)] transition-colors"
        >
          <XCircle className="w-3 h-3" />
          {t.reject}
        </button>
        <span className="flex items-center gap-1 text-[var(--color-text-muted)] ml-auto">
          <Clock className="w-3 h-3" />
          {new Date(approval.expiresAt).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
};

export default AiChatPopup;
