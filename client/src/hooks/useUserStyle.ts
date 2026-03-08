/**
 * useUserStyle — React Query hook for persisting user style preferences
 *
 * - useUserStylePreferences() → read current style from context
 * - useUpdateUserStyle() → optimistic mutation that updates context + localStorage + API
 *
 * Pattern follows useProfile.ts
 */

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useUserStyleContext } from '@/contexts/UserStyleContext';
import type { UserStylePreferences } from '@/config/userStylePresets';

/** Read-only access to current preferences */
export function useUserStylePreferences() {
  const { userStyle } = useUserStyleContext();
  return userStyle;
}

/** Mutation: apply locally (instant) then persist to server */
export function useUpdateUserStyle() {
  const { userStyle, setUserStyle } = useUserStyleContext();

  return useMutation({
    mutationFn: async (partial: Partial<UserStylePreferences>) => {
      const merged = { ...userStyle, ...partial };
      const response = await apiClient.patch('/tenant/users/me', {
        preferences: { style: merged },
      });
      return response.data.data;
    },
    onMutate: (partial) => {
      // Optimistic: apply immediately via context (updates CSS + localStorage)
      const previous = { ...userStyle };
      setUserStyle(partial);
      return { previous };
    },
    onError: (_err, _partial, context) => {
      // Revert on failure
      if (context?.previous) {
        setUserStyle(context.previous);
      }
    },
  });
}
