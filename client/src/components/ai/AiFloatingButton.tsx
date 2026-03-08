/**
 * AI Floating Button - Neural Network Brain Design
 * Coral/Orange color scheme matching project theme
 *
 * States: idle, hover, thinking, listening, success, error
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export type AiButtonState = 'idle' | 'hover' | 'thinking' | 'listening' | 'success' | 'error';

interface AiFloatingButtonProps {
  onClick: () => void;
  state?: AiButtonState;
  className?: string;
  disabled?: boolean;
  pendingApprovals?: number;
}

// Neural network node positions (hexagonal arrangement)
const nodes = [
  { x: 50, y: 15 },  // Top
  { x: 80, y: 32 },  // Top-right
  { x: 80, y: 68 },  // Bottom-right
  { x: 50, y: 85 },  // Bottom
  { x: 20, y: 68 },  // Bottom-left
  { x: 20, y: 32 },  // Top-left
];

// Connections between nodes (synapses)
const connections = [
  // Outer ring
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
  // Cross connections to center
  [0, 3], [1, 4], [2, 5],
];

const AiFloatingButton: React.FC<AiFloatingButtonProps> = ({
  onClick,
  state = 'idle',
  className,
  disabled = false,
  pendingApprovals = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [, setPulseKey] = useState(0);

  // Reset pulse animation on state change
  useEffect(() => {
    if (state === 'success' || state === 'error') {
      setPulseKey(prev => prev + 1);
    }
  }, [state]);

  const effectiveState = isHovered && state === 'idle' ? 'hover' : state;

  // Get node color based on state
  const getNodeColor = () => {
    switch (effectiveState) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      default:
        return 'white';
    }
  };

  // Get connection animation class
  const getConnectionClass = (_index: number) => {
    switch (effectiveState) {
      case 'idle':
        return 'animate-neural-pulse';
      case 'hover':
        return 'animate-traveling-pulse';
      case 'thinking':
        return 'animate-fast-traveling-pulse';
      case 'listening':
        return 'animate-neural-pulse';
      default:
        return '';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-14 h-14 rounded-full',
        'flex items-center justify-center',
        'shadow-lg shadow-ai-coral/30',
        'transition-all duration-300 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-ai-coral focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        effectiveState === 'hover' && 'scale-110',
        effectiveState === 'thinking' && 'scale-105',
        effectiveState === 'error' && 'animate-shake',
        className
      )}
      style={{
        background: 'linear-gradient(135deg, var(--ai-coral) 0%, var(--ai-coral-dark) 100%)',
      }}
      aria-label="Zaki | ذكي — AI Assistant"
      title="Zaki | ذكي"
    >
      {/* Outer glow effect */}
      <div
        className={cn(
          'absolute inset-0 rounded-full',
          'transition-opacity duration-300',
          effectiveState === 'idle' && 'animate-pulse-glow opacity-50',
          effectiveState === 'hover' && 'opacity-70',
          effectiveState === 'thinking' && 'opacity-80',
          effectiveState === 'listening' && 'animate-pulse opacity-90',
          effectiveState === 'success' && 'opacity-0',
          effectiveState === 'error' && 'opacity-0'
        )}
        style={{
          boxShadow: '0 0 20px var(--ai-glow), 0 0 40px var(--ai-glow-soft)',
        }}
      />

      {/* Neural Network SVG */}
      <svg
        viewBox="0 0 100 100"
        className={cn(
          'w-10 h-10',
          'transition-transform duration-300',
          effectiveState === 'thinking' && 'animate-spin-slow'
        )}
      >
        {/* Connections (Synapses) */}
        {connections.map(([from, to], i) => {
          const fromNode = nodes[from];
          const toNode = nodes[to];
          return (
            <line
              key={`conn-${i}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke={effectiveState === 'success' ? '#10b981' : effectiveState === 'error' ? '#ef4444' : 'white'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="30"
              className={cn(
                'transition-all duration-200',
                getConnectionClass(i)
              )}
              style={{
                animationDelay: `${i * 0.1}s`,
                opacity: effectiveState === 'success' || effectiveState === 'error' ? 0.8 : undefined,
              }}
            />
          );
        })}

        {/* Center Brain/Core */}
        <g className={cn(
          effectiveState === 'idle' && 'animate-brain-pulse',
          effectiveState === 'thinking' && 'animate-pulse-scale'
        )}>
          {/* Brain outer shape */}
          <ellipse
            cx="50"
            cy="50"
            rx="18"
            ry="16"
            fill={effectiveState === 'success' ? '#10b981' : effectiveState === 'error' ? '#ef4444' : 'white'}
            opacity="0.9"
          />
          {/* Brain detail - sulci */}
          <path
            d="M 38 50 Q 50 42 62 50"
            stroke={effectiveState === 'success' ? '#059669' : effectiveState === 'error' ? '#dc2626' : 'var(--ai-coral)'}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 42 56 Q 50 52 58 56"
            stroke={effectiveState === 'success' ? '#059669' : effectiveState === 'error' ? '#dc2626' : 'var(--ai-coral)'}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* Nodes (Neurons) */}
        {nodes.map((node, i) => (
          <circle
            key={`node-${i}`}
            cx={node.x}
            cy={node.y}
            r="5"
            fill={getNodeColor()}
            className={cn(
              'transition-all duration-200',
              effectiveState === 'idle' && 'animate-node-glow',
              effectiveState === 'hover' && 'animate-node-glow',
              effectiveState === 'thinking' && 'animate-pulse'
            )}
            style={{
              animationDelay: `${i * 0.15}s`,
              filter: effectiveState === 'hover' ? 'drop-shadow(0 0 6px white)' : undefined,
            }}
          />
        ))}

        {/* Listening waves */}
        {effectiveState === 'listening' && (
          <g>
            {[...Array(3)].map((_, i) => (
              <circle
                key={`wave-${i}`}
                cx="50"
                cy="50"
                r={20 + i * 10}
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                opacity={0.6 - i * 0.15}
                className="animate-wave-expand"
                style={{
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </g>
        )}

        {/* Success checkmark overlay */}
        {effectiveState === 'success' && (
          <path
            d="M35 52 L45 62 L65 42"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="animate-draw-check"
          />
        )}

        {/* Error X overlay */}
        {effectiveState === 'error' && (
          <g>
            <line
              x1="38"
              y1="38"
              x2="62"
              y2="62"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1="62"
              y1="38"
              x2="38"
              y2="62"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>

      {/* Pending approvals badge */}
      {pendingApprovals > 0 && (
        <span
          className={cn(
            'absolute -top-1 -right-1',
            'min-w-5 h-5 px-1.5',
            'flex items-center justify-center',
            'bg-red-500 text-white text-xs font-bold',
            'rounded-full',
            'animate-bounce-subtle'
          )}
        >
          {pendingApprovals > 99 ? '99+' : pendingApprovals}
        </span>
      )}
    </button>
  );
};

export default AiFloatingButton;
