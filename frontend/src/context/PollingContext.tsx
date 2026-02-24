import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PollingContextValue {
  isDashboardActive: boolean;
  isTabVisible: boolean;
  activeModule: string | null;
  shouldPoll: boolean;
  enablePolling: () => void;
  disablePolling: () => void;
  setActiveModule: (module: string) => void;
}

const PollingContext = createContext<PollingContextValue | undefined>(undefined);

export function PollingProvider({ children }: { children: ReactNode }) {
  const [isDashboardActive, setIsDashboardActive] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const [activeModule, setActiveModuleState] = useState<string | null>(null);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const enablePolling = () => setIsDashboardActive(true);
  const disablePolling = () => setIsDashboardActive(false);
  const setActiveModule = (module: string) => setActiveModuleState(module);

  // Polling should only happen when:
  // 1. Dashboard is active (not on Login/ProfileSetup/ApprovalPending)
  // 2. Tab is visible
  const shouldPoll = isDashboardActive && isTabVisible;

  return (
    <PollingContext.Provider
      value={{
        isDashboardActive,
        isTabVisible,
        activeModule,
        shouldPoll,
        enablePolling,
        disablePolling,
        setActiveModule,
      }}
    >
      {children}
    </PollingContext.Provider>
  );
}

export function usePolling() {
  const context = useContext(PollingContext);
  if (!context) {
    throw new Error('usePolling must be used within PollingProvider');
  }
  return context;
}
