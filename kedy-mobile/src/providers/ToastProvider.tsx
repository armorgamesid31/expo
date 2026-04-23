import { createContext, useContext, useMemo, type ReactNode } from 'react';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';

interface ToastContextValue {
  showToast: (message: string, kind?: 'success' | 'info' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toastConfig: ToastConfig = {
  success: (props) => <BaseToast {...props} style={{ borderLeftColor: '#10B981' }} />,
  error: (props) => <ErrorToast {...props} />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ToastContextValue>(
    () => ({
      showToast: (message, kind = 'info') => {
        Toast.show({ type: kind, text1: message, position: 'top' });
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast config={toastConfig} />
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within ToastProvider');
  return ctx;
}
