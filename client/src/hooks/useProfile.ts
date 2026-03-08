/**
 * useProfile — React Query hook for user self-profile updates
 *
 * Calls PATCH /tenant/users/me (no admin panelGuard required)
 * Updates localStorage.user on success so AuthContext picks up the new name
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

interface ProfileResponse {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const response = await apiClient.patch('/tenant/users/me', input);
      return response.data.data as ProfileResponse;
    },
    onSuccess: (data) => {
      // Update localStorage so AuthContext picks up the new name without page reload
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.name = data.name;
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch {
          // ignore parse errors
        }
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
