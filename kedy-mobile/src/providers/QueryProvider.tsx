import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            gcTime: 24 * 60 * 60 * 1000,
          },
        },
      }),
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: AsyncStorage,
      key: 'kedy.mobile.react-query-cache',
    }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}>
      {children}
    </PersistQueryClientProvider>
  );
}
