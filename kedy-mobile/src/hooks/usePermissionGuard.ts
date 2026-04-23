import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';

export function usePermissionGuard(keys: string | string[], fallback = '/(tabs)/schedule') {
  const { hasPermission } = useAuth();
  const keyArray = Array.isArray(keys) ? keys : [keys];
  const allowed = keyArray.some((k) => hasPermission(k));

  useEffect(() => {
    if (!allowed) router.replace(fallback as never);
  }, [allowed, fallback]);

  return allowed;
}
