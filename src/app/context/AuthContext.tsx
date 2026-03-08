import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { httpRequest, ApiError } from '../lib/http';
import { secureGet, secureRemove, secureSet } from '../lib/secure-storage';
import { STORAGE_KEYS } from '../lib/config';
import type { BootstrapResponse } from '../types/mobile-api';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  bootstrap: BootstrapResponse | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: <T>(path: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function persistTokens(tokens: AuthTokens) {
  await Promise.all([
    secureSet(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
    secureSet(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
  ]);
}

async function clearTokens() {
  await Promise.all([
    secureRemove(STORAGE_KEYS.ACCESS_TOKEN),
    secureRemove(STORAGE_KEYS.REFRESH_TOKEN),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);

  const loadBootstrap = useCallback(async (token: string) => {
    const data = await httpRequest<BootstrapResponse>('/api/mobile/bootstrap', {
      method: 'GET',
      token,
    } as any);
    setBootstrap(data);
    return data;
  }, []);

  const rotateAccess = useCallback(
    async (currentRefreshToken?: string | null) => {
      const tokenToUse = currentRefreshToken || refreshToken;
      if (!tokenToUse) {
        return null;
      }

      const response = await httpRequest<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokenToUse }),
      });

      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      await persistTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });

      return response.accessToken;
    },
    [refreshToken],
  );

  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await httpRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      setBootstrap(null);
      await clearTokens();
    }
  }, [refreshToken]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await httpRequest<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    await persistTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });

    await loadBootstrap(response.accessToken);
  }, [loadBootstrap]);

  const apiFetch = useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      try {
        return await httpRequest<T>(path, {
          ...options,
          token: accessToken,
          salonId: bootstrap?.salon?.id || null,
        } as any);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const nextAccessToken = await rotateAccess();
          if (!nextAccessToken) {
            await logout();
            throw error;
          }

          return await httpRequest<T>(path, {
            ...options,
            token: nextAccessToken,
            salonId: bootstrap?.salon?.id || null,
          } as any);
        }
        throw error;
      }
    },
    [accessToken, bootstrap?.salon?.id, rotateAccess, logout],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      setIsLoading(true);

      try {
        const [storedAccessToken, storedRefreshToken] = await Promise.all([
          secureGet(STORAGE_KEYS.ACCESS_TOKEN),
          secureGet(STORAGE_KEYS.REFRESH_TOKEN),
        ]);

        if (!active) {
          return;
        }

        if (!storedRefreshToken && !storedAccessToken) {
          setIsLoading(false);
          return;
        }

        let tokenToUse = storedAccessToken;

        if (!tokenToUse && storedRefreshToken) {
          try {
            tokenToUse = await rotateAccess(storedRefreshToken);
          } catch (error) {
            console.warn('Initial refresh failed:', error);
          }
        }

        if (!tokenToUse) {
          await clearTokens();
          setIsLoading(false);
          return;
        }

        setAccessToken(tokenToUse);
        if (storedRefreshToken) {
          setRefreshToken(storedRefreshToken);
        }

        await loadBootstrap(tokenToUse);
      } catch (error) {
        console.error('Auth bootstrap initialization failed:', error);
        await clearTokens();
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadBootstrap, rotateAccess]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      isLoading,
      isAuthenticated: Boolean(accessToken && bootstrap),
      bootstrap,
      accessToken,
      login,
      logout,
      apiFetch,
    };
  }, [isLoading, accessToken, bootstrap, login, logout, apiFetch]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
