/**
 * useResponsive Hook
 * Detects device type and screen size for responsive design
 */

import { useState, useEffect, useCallback } from 'react';

export interface ResponsiveState {
  isMobile: boolean;      // < 768px
  isTablet: boolean;      // 768px - 1023px
  isDesktop: boolean;     // >= 1024px
  isTouchDevice: boolean; // Has touch capability
  width: number;
  height: number;
}

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        width: 1920,
        height: 1080,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    return {
      isMobile: width < BREAKPOINTS.mobile,
      isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
      isDesktop: width >= BREAKPOINTS.tablet,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      width,
      height,
    };
  });

  const updateState = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    setState({
      isMobile: width < BREAKPOINTS.mobile,
      isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
      isDesktop: width >= BREAKPOINTS.tablet,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      width,
      height,
    });
  }, []);

  useEffect(() => {
    // Update on mount
    updateState();

    // Debounced resize handler
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateState, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [updateState]);

  return state;
}

/**
 * Simple hook for checking specific breakpoints
 */
export function useIsMobile(): boolean {
  const { isMobile } = useResponsive();
  return isMobile;
}

export function useIsDesktop(): boolean {
  const { isDesktop } = useResponsive();
  return isDesktop;
}

export function useIsTouchDevice(): boolean {
  const { isTouchDevice } = useResponsive();
  return isTouchDevice;
}
